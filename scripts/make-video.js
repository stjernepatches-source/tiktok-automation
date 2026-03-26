#!/usr/bin/env node
/**
 * make-video.js
 * Converts 5 slide JPEGs (4:5 1080×1350) into a 9:16 MP4 (1080×1920)
 * suitable for Instagram Reels and YouTube Shorts.
 *
 * Each slide:
 *   - Padded to 9:16 with cream background (#F5F0EB)
 *   - Shown for SLIDE_DURATION seconds
 *   - Subtle Ken Burns zoom (1.0 → 1.06) for motion feel
 *
 * Output: video.mp4 alongside the slides
 *
 * Usage:
 *   node scripts/make-video.js --dir tiktok-marketing/posts/<name>/final
 *   node scripts/make-video.js --dir tiktok-marketing/posts/<name>/final --duration 4
 */

const { execSync } = require('child_process');
const fs   = require('fs');
const path = require('path');

const FFMPEG = '/opt/homebrew/bin/ffmpeg';
const W = 1080;
const H = 1920;
const FPS = 30;
const CREAM = '0xF5F0EB';  // FFmpeg hex format

const args = process.argv.slice(2);
const getArg = (flag, def) => { const i = args.indexOf(flag); return i !== -1 ? args[i + 1] : def; };

const slideDir       = getArg('--dir', null);
const SLIDE_DURATION = parseFloat(getArg('--duration', '3.5'));

if (!slideDir) {
  console.error('Usage: node make-video.js --dir <slides-dir> [--duration 3.5]');
  process.exit(1);
}

const dirPath = path.resolve(slideDir);
const files = fs.readdirSync(dirPath)
  .filter(f => f.match(/^slide-\d+\.jpg$/))
  .sort((a, b) => parseInt(a.match(/\d+/)[0]) - parseInt(b.match(/\d+/)[0]))
  .map(f => path.join(dirPath, f));

if (files.length === 0) {
  console.error(`No slide-N.jpg files found in: ${dirPath}`);
  process.exit(1);
}

const outputPath = path.join(dirPath, '..', 'video.mp4');
const frames = Math.round(SLIDE_DURATION * FPS);

console.log(`\nBuilding video from ${files.length} slides`);
console.log(`  Format:   ${W}×${H}  (9:16)`);
console.log(`  Duration: ${SLIDE_DURATION}s/slide  →  ${(files.length * SLIDE_DURATION).toFixed(1)}s total`);
console.log(`  Output:   ${outputPath}\n`);

// ─── Build FFmpeg filter_complex ──────────────────────────────────────────────
//
// Per slide:
//   1. fps=30 (set rate on the still image)
//   2. scale to fit within W×H (keep aspect ratio)
//   3. pad to exactly W×H with cream background, centered
//   4. trim to exactly SLIDE_DURATION seconds
//   5. setsar=1
//
// Then concat all slides.

// Scale to 108% so we have room to pan (drift) without black borders
const SCALE_F  = 1.08;
const WS       = Math.round(W * SCALE_F);   // 1166
const HS       = Math.round(H * SCALE_F);   // 2074
const DX       = Math.floor((WS - W) / 2);  // max x drift (43px)
const DY       = Math.floor((HS - H) / 2);  // max y drift (77px)
const dur      = SLIDE_DURATION;

const inputs = files.map(f => `-loop 1 -framerate ${FPS} -t ${dur} -i "${f}"`).join(' ');

const perSlide = files.map((_, i) => {
  // Alternate pan direction per slide for visual flow
  const xExpr = i % 2 === 0
    ? `${DX}*t/${dur}`           // pan right
    : `${DX}*(1-t/${dur})`;      // pan left
  const yExpr = i % 2 === 0
    ? `${DY}*t/${dur}`           // pan down
    : `${DY}*(1-t/${dur})`;      // pan up

  return (
    `[${i}:v]` +
    `scale=${W}:${H}:force_original_aspect_ratio=decrease,` +
    `pad=${W}:${H}:(ow-iw)/2:(oh-ih)/2:color=${CREAM},` +
    `scale=${WS}:${HS},` +
    `crop=${W}:${H}:x='${xExpr}':y='${yExpr}',` +
    `setsar=1,` +
    `trim=duration=${dur},` +
    `setpts=PTS-STARTPTS` +
    `[v${i}]`
  );
});

const concatInputs = files.map((_, i) => `[v${i}]`).join('');
const filterComplex = [
  ...perSlide,
  `${concatInputs}concat=n=${files.length}:v=1:a=0[outv]`
].join(';\n  ');

const cmd = [
  FFMPEG,
  '-y',
  inputs,
  `-filter_complex "`,
  `  ${filterComplex}`,
  `"`,
  `-map "[outv]"`,
  `-c:v libx264`,
  `-preset fast`,
  `-crf 18`,
  `-pix_fmt yuv420p`,
  `-movflags +faststart`,
  `"${outputPath}"`
].join(' ');

try {
  execSync(cmd, { stdio: 'pipe' });
  const sizeMB = (fs.statSync(outputPath).size / 1024 / 1024).toFixed(1);
  console.log(`✓ Video created: ${outputPath}  (${sizeMB} MB)`);
  console.log(`\nReady for:`);
  console.log(`  Instagram Reels  — add music in app, post manually`);
  console.log(`  YouTube Shorts   — upload via YouTube Studio`);
} catch (err) {
  console.error('FFmpeg failed:');
  console.error(err.stderr?.toString() || err.message);
  process.exit(1);
}

module.exports = { makeVideo: (dir, duration) => {
  // Callable from tiktok-cron.js
  const resolved = path.resolve(dir);
  const d = duration || SLIDE_DURATION;
  const f = Math.round(d * FPS);
  const slideFiles = fs.readdirSync(resolved)
    .filter(f => f.match(/^slide-\d+\.jpg$/))
    .sort((a, b) => parseInt(a.match(/\d+/)[0]) - parseInt(b.match(/\d+/)[0]))
    .map(f => path.join(resolved, f));

  const out = path.join(resolved, '..', 'video.mp4');
  const inp = slideFiles.map(f => `-loop 1 -framerate ${FPS} -t ${d} -i "${f}"`).join(' ');
  const ps  = slideFiles.map((_, i) =>
    `[${i}:v]scale=${W}:${H}:force_original_aspect_ratio=decrease,pad=${W}:${H}:(ow-iw)/2:(oh-ih)/2:color=${CREAM},setsar=1,trim=duration=${d},setpts=PTS-STARTPTS[v${i}]`
  );
  const fc = [...ps, `${slideFiles.map((_, i) => `[v${i}]`).join('')}concat=n=${slideFiles.length}:v=1:a=0[outv]`].join(';\n  ');
  const c  = `${FFMPEG} -y ${inp} -filter_complex "  ${fc}" -map "[outv]" -c:v libx264 -preset fast -crf 18 -pix_fmt yuv420p -movflags +faststart "${out}"`;
  execSync(c, { stdio: 'pipe' });
  return out;
}};
