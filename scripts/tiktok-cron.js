#!/usr/bin/env node
/**
 * tiktok-cron.js
 * Master orchestrator for the Dawnce TikTok automation pipeline.
 * Runs: research → hook → plan → images → overlay → post → log
 *
 * Usage:
 *   node scripts/tiktok-cron.js              # full run
 *   node scripts/tiktok-cron.js --dry-run    # everything except actual posting
 *   node scripts/tiktok-cron.js --mock       # use mock TikTok data (no browser)
 *
 * Cron (3x daily):
 *   0 9,13,18 * * * cd /Users/askii/tiktok-automation && node scripts/tiktok-cron.js >> logs/tiktok-cron.log 2>&1
 */

const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');
const https = require('https');
const http = require('http');

const args = process.argv.slice(2);
const dryRun = args.includes('--dry-run');
const useMock = args.includes('--mock');

// ─── Helpers ─────────────────────────────────────────────────────────────────

function log(msg) {
  const ts = new Date().toISOString();
  console.log(`[${ts}] ${msg}`);
}

const NODE = process.execPath; // e.g. /usr/local/bin/node — safe in cron

function run(cmd, label) {
  log(`▶ ${label}`);
  const resolved = cmd.replace(/^node /, `"${NODE}" `);
  try {
    execSync(resolved, { stdio: 'inherit', cwd: path.resolve('.') });
  } catch (err) {
    throw new Error(`Step failed: ${label}\n${err.message}`);
  }
}

function loadJSON(filePath) {
  const p = path.resolve(filePath);
  if (!fs.existsSync(p)) throw new Error(`File not found: ${p}`);
  return JSON.parse(fs.readFileSync(p, 'utf8'));
}

function downloadImage(url, destPath) {
  return new Promise((resolve, reject) => {
    const proto = url.startsWith('https') ? https : http;
    const file = fs.createWriteStream(destPath);
    proto.get(url, res => {
      res.pipe(file);
      file.on('finish', () => { file.close(); resolve(destPath); });
    }).on('error', err => {
      fs.unlink(destPath, () => {});
      reject(err);
    });
  });
}

function slugify(str) {
  return str
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, '')
    .trim()
    .replace(/\s+/g, '-')
    .slice(0, 40);
}

// ─── Pipeline ─────────────────────────────────────────────────────────────────

async function run_pipeline() {
  log('═══ Dawnce TikTok Pipeline Starting ═══');
  if (dryRun) log('DRY RUN MODE — no posts will be published');
  if (useMock) log('MOCK MODE — using sample TikTok data');

  // 0. Pull analytics for posts published 2+ days ago (feeds the internal research loop)
  try {
    run('node scripts/update-analytics.js', 'Updating analytics for older posts');
  } catch (_) {
    log('Analytics update skipped (no older posts or API unavailable)');
  }

  // 1. Research
  const searchTerms = pickSearchTerms();
  const mockFlag = useMock ? ' --mock' : '';
  run(
    `node scripts/research-external.js --searches "${searchTerms}"${mockFlag}`,
    'External research (TikTok scraping)'
  );
  run(
    'node scripts/research-internal.js',
    'Internal analytics research'
  );

  // 2. Hook selection
  run('node scripts/pick-best-hook.js', 'Hook selection');
  const hook = loadJSON('tiktok-marketing/research/selected-hook.json');
  log(`Selected hook: "${hook.hook}"`);

  // 3. Slide planning
  run('node scripts/plan-slides.js', 'Slide planning');
  const plan = loadJSON('tiktok-marketing/research/slide-plan.json');
  log(`Slide plan: ${plan.slide_count} slides (${plan.pillar})`);

  // 4. Image generation
  const postName = `${slugify(hook.hook)}-${Date.now()}`;
  const rawDir = path.resolve(`tiktok-marketing/posts/${postName}/raw`);
  const finalDir = path.resolve(`tiktok-marketing/posts/${postName}/final`);
  fs.mkdirSync(rawDir, { recursive: true });

  log('Generating slide images via fal.ai...');
  const imageUrls = await generateImages(plan, rawDir);

  // 5. Text overlay
  run(
    `node scripts/overlay-text.js --plan tiktok-marketing/research/slide-plan.json --image-dir tiktok-marketing/posts/${postName}/raw --output-dir tiktok-marketing/posts/${postName}/final`,
    'Text overlay (compositing)'
  );

  // 5b. Video (9:16 MP4 for Reels / YouTube Shorts)
  run(
    `node scripts/make-video.js --dir "tiktok-marketing/posts/${postName}/final"`,
    'Video render (9:16 MP4)'
  );

  // 6. Post
  let postId = 'dry-run';
  const caption = plan.caption || buildCaption(hook.hook);

  if (dryRun) {
    log('[DRY RUN] Skipping Blotato post. Slides saved to:');
    log(`  ${finalDir}`);
  } else {
    run(
      `node scripts/post-to-tiktok.js --dir "tiktok-marketing/posts/${postName}/final" --caption "${escapeCaption(caption)}"`,
      'Post to TikTok via Blotato'
    );
    run(
      `node scripts/post-video.js --video "tiktok-marketing/posts/${postName}/video.mp4" --title "${escapeCaption(hook.hook)}"`,
      'Post Reel + YouTube Short'
    );
    // Read the real submission ID written by post-to-tiktok.js
    const idFile = path.resolve('tiktok-marketing/.last-post-id');
    postId = fs.existsSync(idFile) ? fs.readFileSync(idFile, 'utf8').trim() : `blotato-${Date.now()}`;
  }

  // 7. Log
  const { logPost } = require('./log-post.js');
  logPost({
    post_id: postId,
    hook: hook.hook,
    pillar: plan.pillar,
    slide_count: plan.slide_count
  });

  log('═══ Pipeline complete ═══');
  log(`Post directory: tiktok-marketing/posts/${postName}/`);
  if (!dryRun) {
    log('Action required: Open TikTok → Drafts → add trending sound → publish');
  }
}

// ─── Image generation with reference chaining ────────────────────────────────

async function generateImages(plan, rawDir) {
  const { generateSlideImage, downloadImage: dlImg } = require('./generate-slide-image.js');
  const urls = [];

  for (const slide of plan.slides) {
    const url = await generateSlideImage(slide);
    urls.push(url);
    const imgPath = path.join(rawDir, `slide-${slide.index}-raw.jpg`);
    await dlImg(url, imgPath);
    log(`  Saved: slide-${slide.index}-raw.jpg`);
  }

  return urls;
}

// ─── Utilities ────────────────────────────────────────────────────────────────

// Rotate search term sets each run
const SEARCH_SETS = [
  'alarm,glow up,morning routine',
  'looksmaxxing,skin tips,cortisol',
  'jaw define,looks hacks,get up early',
  'snooze,glow up,looksmaxxing',
  'morning routine,skin care men,alarm'
];

function pickSearchTerms() {
  const hour = new Date().getHours();
  // 9AM → set 0, 1PM → set 1, 6PM → set 2
  if (hour < 12) return SEARCH_SETS[0];
  if (hour < 15) return SEARCH_SETS[1];
  return SEARCH_SETS[2];
}

function buildCaption(hook) {
  return `${hook} 👀 Real tips that actually work.\\nDownload Dawnce on the App Store 📲\\n\\n#glowup #looksmaxxing #morningroutine #skincare #GenZ #dawnce #fyp`;
}

function escapeCaption(caption) {
  return caption.replace(/"/g, '\\"').replace(/\n/g, '\\n');
}

// ─── Entry point ──────────────────────────────────────────────────────────────

run_pipeline().catch(err => {
  log(`PIPELINE FAILED: ${err.message}`);
  console.error(err);
  process.exit(1);
});
