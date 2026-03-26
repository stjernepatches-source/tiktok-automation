#!/usr/bin/env node
/**
 * research-internal.js
 * Analyzes our own post performance data to surface high-performing hooks,
 * pillars, and slide counts.
 *
 * Usage:
 *   node scripts/research-internal.js --output tiktok-marketing/research/internal-insights.json
 */

const fs = require('fs');
const path = require('path');

const args = process.argv.slice(2);
const getArg = (flag, def) => {
  const i = args.indexOf(flag);
  return i !== -1 ? args[i + 1] : def;
};

const outputFile = getArg('--output', 'tiktok-marketing/research/internal-insights.json');
const analyticsFile = 'tiktok-marketing/analytics-log.json';

function internalScore({ likes, comments, saves, new_followers, views }) {
  if (!views || views === 0) return 0;
  return (
    (likes / views) * 0.5 +
    (comments / views) * 0.3 +
    (new_followers / views) * 0.2
  );
}

function main() {
  const logPath = path.resolve(analyticsFile);

  if (!fs.existsSync(logPath)) {
    console.log('No analytics log found — no internal data yet.');
    const output = { posts: [], top_pillars: [], top_slide_count: null, min_posts_for_signal: 5, has_signal: false };
    const outPath = path.resolve(outputFile);
    fs.mkdirSync(path.dirname(outPath), { recursive: true });
    fs.writeFileSync(outPath, JSON.stringify(output, null, 2));
    console.log(`Saved empty insights to: ${outPath}`);
    return;
  }

  const log = JSON.parse(fs.readFileSync(logPath, 'utf8'));

  if (log.length < 4) {
    console.log(`Only ${log.length} posts — internal signal activates at post 5. Outputting partial data.`);
  }

  // Score each post
  const scored = log.map(post => ({
    ...post,
    internal_score: parseFloat(internalScore(post).toFixed(6))
  })).sort((a, b) => b.internal_score - a.internal_score);

  // Pillar performance
  const pillarMap = {};
  for (const post of scored) {
    if (!pillarMap[post.pillar]) pillarMap[post.pillar] = { total_score: 0, count: 0 };
    pillarMap[post.pillar].total_score += post.internal_score;
    pillarMap[post.pillar].count += 1;
  }
  const top_pillars = Object.entries(pillarMap)
    .map(([pillar, { total_score, count }]) => ({ pillar, avg_score: total_score / count, count }))
    .sort((a, b) => b.avg_score - a.avg_score);

  // Best slide count
  const slideMap = {};
  for (const post of scored) {
    const sc = post.slide_count;
    if (!slideMap[sc]) slideMap[sc] = { total_score: 0, count: 0 };
    slideMap[sc].total_score += post.internal_score;
    slideMap[sc].count += 1;
  }
  const top_slide_count = Object.entries(slideMap)
    .map(([count, { total_score, n }]) => ({ slide_count: parseInt(count), avg_score: total_score / (n || 1) }))
    .sort((a, b) => b.avg_score - a.avg_score)[0]?.slide_count || 5;

  const output = {
    has_signal: log.length >= 4,
    post_count: log.length,
    top_posts: scored.slice(0, 5),
    top_pillars,
    top_slide_count
  };

  const outPath = path.resolve(outputFile);
  fs.mkdirSync(path.dirname(outPath), { recursive: true });
  fs.writeFileSync(outPath, JSON.stringify(output, null, 2));

  console.log(`Internal research complete: ${log.length} posts analyzed`);
  if (top_pillars[0]) console.log(`Top pillar: ${top_pillars[0].pillar}`);
  console.log(`Best slide count: ${top_slide_count}`);
  console.log(`Saved to: ${outPath}`);
}

main();
