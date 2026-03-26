#!/usr/bin/env node
/**
 * pick-best-hook.js
 * Blends external (50%) + internal (50%) scores to pick the best hook.
 * Prints the selected hook as JSON and writes to --output.
 *
 * Usage:
 *   node scripts/pick-best-hook.js --output tiktok-marketing/research/selected-hook.json
 */

const fs = require('fs');
const path = require('path');

const args = process.argv.slice(2);
const getArg = (flag, def) => {
  const i = args.indexOf(flag);
  return i !== -1 ? args[i + 1] : def;
};

const outputFile   = getArg('--output', 'tiktok-marketing/research/selected-hook.json');
const externalFile = 'tiktok-marketing/research/external-hooks.json';
const internalFile = 'tiktok-marketing/research/internal-insights.json';
const logFile      = 'tiktok-marketing/analytics-log.json';
const RECENT_WINDOW = 30; // never repeat a hook used in the last 30 posts

function loadJSON(filePath) {
  const p = path.resolve(filePath);
  if (!fs.existsSync(p)) return null;
  return JSON.parse(fs.readFileSync(p, 'utf8'));
}

function internalScore(hook, internal) {
  if (!internal || !internal.has_signal || !internal.top_posts) return 0;

  // Check if any of our top posts match this hook's pillar or keywords
  const hookWords = hook.toLowerCase().split(/\s+/);
  let best = 0;
  for (const post of internal.top_posts) {
    const overlap = hookWords.filter(w => post.hook?.toLowerCase().includes(w)).length;
    if (overlap > 0) {
      best = Math.max(best, post.internal_score * (overlap / hookWords.length));
    }
  }
  return best;
}

function recentlyUsedHooks() {
  const log = loadJSON(logFile);
  if (!log || log.length === 0) return new Set();
  const recent = log.slice(-RECENT_WINDOW).map(p => p.hook?.toLowerCase().trim());
  return new Set(recent);
}

function normalize(hook) {
  return hook.toLowerCase().trim();
}

function main() {
  const external = loadJSON(externalFile);
  const internal = loadJSON(internalFile);

  if (!external || external.length === 0) {
    console.error('No external hooks found. Run research-external.js first.');
    process.exit(1);
  }

  const used = recentlyUsedHooks();
  const hasInternal = internal?.has_signal ?? false;

  // Filter out recently used hooks — system must generate fresh ideas
  const fresh = external.filter(h => !used.has(normalize(h.hook)));
  const pool  = fresh.length > 0 ? fresh : external; // fallback: allow repeats if pool is exhausted
  if (fresh.length === 0) console.warn('  Warning: all hooks recently used — repeats allowed this run');
  if (fresh.length < external.length) {
    console.log(`  Filtered ${external.length - fresh.length} recently-used hooks (${pool.length} remaining)`);
  }

  const scored = pool.map(h => {
    const extScore = h.external_score ?? 0;
    const intScore = internalScore(h.hook, internal);

    // 50/50 blend if internal data exists, else 100% external
    const blended_score = hasInternal
      ? (extScore * 0.5) + (intScore * 0.5)
      : extScore;

    return { ...h, internal_score: intScore, blended_score: parseFloat(blended_score.toFixed(6)) };
  });

  scored.sort((a, b) => b.blended_score - a.blended_score);

  const best = scored[0];

  console.log(`\nHook selected: "${best.hook}"`);
  console.log(`  Blended score: ${best.blended_score} (ext: ${best.external_score}, int: ${best.internal_score})`);
  console.log(`  Format: ${best.format}, Likes: ${best.likes?.toLocaleString()}`);
  console.log(`  Recently used hooks excluded: ${used.size}`);

  const outPath = path.resolve(outputFile);
  fs.mkdirSync(path.dirname(outPath), { recursive: true });
  fs.writeFileSync(outPath, JSON.stringify(best, null, 2));
  console.log(`Saved to: ${outPath}`);
}

main();
