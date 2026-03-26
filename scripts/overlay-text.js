#!/usr/bin/env node
/**
 * overlay-text.js  —  forzic.bluebro aesthetic, portrait 1080×1920
 *
 * Layout:
 *   - Cream background #F5F0EB, 1080×1920
 *   - Impact font, left-aligned text in top ~40% of slide
 *   - Character fills bottom ~65%, centered, full body visible
 *   - Cover: huge headline, word-level red accent on key words
 *   - Content: bold 2-line title, small muted body text (max 3 lines)
 *   - CTA: stacked single-word lines
 *   - Character blends via multiply so text stays readable over it
 */

const fs = require('fs');
const path = require('path');
const sharp = require('sharp');

const args = process.argv.slice(2);
const getArg = (flag, def) => { const i = args.indexOf(flag); return i !== -1 ? args[i + 1] : def; };

const planFile  = getArg('--plan',       'tiktok-marketing/research/slide-plan.json');
const imageDir  = getArg('--image-dir',  null);
const outputDir = getArg('--output-dir', null);

// ─── Canvas constants ─────────────────────────────────────────────────────────
const W     = 1080;
const H     = 1350;   // 4:5 ratio — TikTok photo carousel format
const CREAM = { r: 245, g: 240, b: 235 };
const DARK  = '#1A1A1A';
const MUTED = '#1A1A1A';  // body text — same dark as headline, readable over character
const RED   = '#E8472A';
const PAD_L = 60;
const PAD_R = 60;
const MAX_TW = W - PAD_L - PAD_R;  // 960px

// ─── Helpers ──────────────────────────────────────────────────────────────────
function esc(s) {
  return String(s)
    .replace(/&/g, '&amp;').replace(/</g, '&lt;')
    .replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

function impactWidth(text, size) {
  return text.length * size * 0.60;
}

function fitFontSize(text, maxSize, maxWidth) {
  const w = impactWidth(text, maxSize);
  return w <= maxWidth ? maxSize : Math.floor(maxSize * (maxWidth / w));
}

function wrapWords(words, charsPerLine) {
  const lines = []; let cur = [], len = 0;
  for (const w of words) {
    const add = (cur.length ? 1 : 0) + w.length;
    if (len + add > charsPerLine && cur.length) { lines.push(cur); cur = [w]; len = w.length; }
    else { cur.push(w); len += add; }
  }
  if (cur.length) lines.push(cur);
  return lines;
}

// Single Impact text element (no accent splitting)
function impactEl({ text, x, y, fontSize, fill, letterSpacing = -1 }) {
  return `<text x="${x}" y="${y}" font-family="Impact, 'Arial Black', sans-serif" ` +
    `font-size="${fontSize}" font-weight="900" letter-spacing="${letterSpacing}" ` +
    `fill="${fill}" filter="url(#sh)">${esc(text)}</text>`;
}

// Impact line with per-word colour accenting (tspan approach like forzic.bluebro)
// Spaces are placed as plain text between tspans — librsvg collapses trailing whitespace
// inside tspan content, so this is the only reliable way to preserve word gaps.
function impactLineAccented({ words, accentSet, x, y, fontSize }) {
  const parts = [];
  words.forEach((w, i) => {
    const fill = accentSet.has(w.toUpperCase()) ? RED : DARK;
    parts.push(`<tspan fill="${fill}">${esc(w)}</tspan>`);
    if (i < words.length - 1) parts.push(' ');
  });
  return `<text x="${x}" y="${y}" xml:space="preserve" font-family="Impact, 'Arial Black', sans-serif" ` +
    `font-size="${fontSize}" font-weight="900" letter-spacing="-1" filter="url(#sh)">${parts.join('')}</text>`;
}

function bodyEl({ text, x, y, fontSize, fill }) {
  return `<text x="${x}" y="${y}" font-family="Arial, Helvetica, sans-serif" ` +
    `font-size="${fontSize}" font-weight="500" fill="${fill}" filter="url(#sh-sm)">${esc(text)}</text>`;
}

// Shadow filters — sh: bold hard offset for headlines; sh-sm: subtle for body text
const SHADOW_FILTER = `<defs>
    <filter id="sh" x="-10%" y="-10%" width="130%" height="130%">
      <feDropShadow dx="8" dy="8" stdDeviation="0" flood-color="#000000" flood-opacity="0.88"/>
    </filter>
    <filter id="sh-sm" x="-5%" y="-5%" width="120%" height="120%">
      <feDropShadow dx="3" dy="3" stdDeviation="0" flood-color="#000000" flood-opacity="0.55"/>
    </filter>
  </defs>`;

function svgWrap(content) {
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}">\n  ${SHADOW_FILTER}\n  ${content}\n</svg>`;
}

// ─── SVG: COVER ───────────────────────────────────────────────────────────────
// Big Impact headline, word-level red on accentPhrase words, subtext below
function buildCoverSVG(slide) {
  const headline  = (slide.headline || '').toUpperCase();
  const accentSet = new Set((slide.accentPhrase || '').toUpperCase().split(/\s+/).filter(Boolean));

  const maxSize = 122;
  const lineH   = Math.round(maxSize * 0.94);
  const lines   = wrapWords(headline.split(' '), 11);

  let y = 110;  // 4:5: TikTok chrome is outside slide, can start near top
  const titleEls = lines.map(lineWords => {
    const lineText = lineWords.join(' ');
    const fontSize = fitFontSize(lineText, maxSize, MAX_TW);
    const el = impactLineAccented({ words: lineWords, accentSet, x: PAD_L, y, fontSize });
    y += lineH;
    return el;
  });

  const subEl = slide.subtext
    ? impactEl({
        text: slide.subtext.toUpperCase(), x: PAD_L, y: y + 18,
        fontSize: fitFontSize(slide.subtext.toUpperCase(), 50, MAX_TW),
        fill: RED, letterSpacing: 2
      })
    : '';

  return svgWrap(titleEls.join('\n  ') + '\n  ' + subEl);
}

// ─── SVG: CONTENT ─────────────────────────────────────────────────────────────
// Slide number pill badge + bold title + bullet body text
function buildContentSVG(slide) {
  const headline = (slide.headline || '').toUpperCase();
  const body     = slide.body || '';

  // Slide number badge (e.g. "02") — black pill, top-left
  const badgeNum  = String(slide.index).padStart(2, '0');
  const badgeW    = 88;
  const badgeH    = 46;
  const badgeX    = PAD_L;
  const badgeY    = 48;
  const badge = [
    `<rect x="${badgeX}" y="${badgeY}" width="${badgeW}" height="${badgeH}" fill="#1A1A1A" rx="8"/>`,
    `<text x="${badgeX + badgeW / 2}" y="${badgeY + 32}" text-anchor="middle" ` +
      `font-family="Arial, Helvetica, sans-serif" font-size="26" font-weight="700" fill="#FFFFFF">${badgeNum}</text>`
  ].join('\n  ');

  const titleMaxSize = 82;
  const titleLineH   = Math.round(titleMaxSize * 0.94);
  const titleLines   = wrapWords(headline.split(' '), 14);

  let y = 155;  // clear of badge (badge bottom ~94 + cap height ~57 = headline baseline 155)
  const titleEls = titleLines.map(lineWords => {
    const lineText = lineWords.join(' ');
    const fontSize = fitFontSize(lineText, titleMaxSize, MAX_TW);
    const el = impactEl({ text: lineText, x: PAD_L, y, fontSize, fill: DARK });
    y += titleLineH;
    return el;
  });

  // Body text: pre-split bullet lines (split on \n), cream pill background
  const bodyStart = y + 32;
  const LINE_H = 74;
  const bodyLines = body.split('\n').filter(Boolean).slice(0, 4);
  const pillH = bodyLines.length * LINE_H + 28;
  const bgPill = `<rect x="${PAD_L - 14}" y="${bodyStart - 18}" width="${MAX_TW + 28}" height="${pillH}" fill="#F5F0EB" fill-opacity="0.90" rx="10"/>`;
  let bodyY = bodyStart;
  const bodyEls = bodyLines.map(line => {
    const el = bodyEl({ text: line, x: PAD_L, y: bodyY, fontSize: 48, fill: DARK });
    bodyY += LINE_H;
    return el;
  });

  return svgWrap(badge + '\n  ' + titleEls.join('\n  ') + '\n  ' + bgPill + '\n  ' + bodyEls.join('\n  '));
}

// ─── SVG: CTA ─────────────────────────────────────────────────────────────────
function buildCTASVG(slide) {
  const headline = (slide.headline || 'DOWNLOAD DAWNCE').toUpperCase();
  const body     = slide.body || 'Available on the App Store';
  const words    = headline.split(' ');
  const maxSize  = 134;
  const lineH    = Math.round(maxSize * 0.94);

  let y = 110;  // 4:5: TikTok chrome is outside slide
  const wordEls = words.map(w => {
    const fontSize = fitFontSize(w, maxSize, MAX_TW);
    const el = impactEl({ text: w, x: PAD_L, y, fontSize, fill: DARK });
    y += lineH;
    return el;
  });

  const bEl = bodyEl({ text: body, x: PAD_L, y: y + 20, fontSize: 50, fill: RED });
  return svgWrap(wordEls.join('\n  ') + '\n  ' + bEl);
}

// ─── Compositor ───────────────────────────────────────────────────────────────
async function overlaySlide(slide, rawImagePath, outputPath) {
  // 1. Cream canvas
  const bgBuf = await sharp({
    create: { width: W, height: H, channels: 3, background: CREAM }
  }).png().toBuffer();

  // 2. Character sizing & positioning
  //    square_hd input (1024×1024) resized to charW×charH, then centered on canvas.
  //    Slight right-of-center placement to leave text zone clear on the left.
  //    Full body visible top-to-bottom — no bottom bleed.
  const charH    = 740;   // 4:5 canvas — character fills bottom 55%, clear of text pill
  const charW    = 740;
  const charLeft = Math.round((W - charW) / 2) + 60;  // center + 60px right shift
  const charTop  = H - charH - 15;                    // 15px above bottom edge

  const charBuf = await sharp(rawImagePath)
    .flatten({ background: { r: 255, g: 255, b: 255 } })
    .resize(charW, charH, { fit: 'contain', background: { r: 255, g: 255, b: 255 } })
    .png()
    .toBuffer();

  // 3. Crop to visible canvas area (sharp requires composite inputs ≤ base dims)
  const visLeft   = Math.max(0, charLeft);
  const visTop    = Math.max(0, charTop);
  const visRight  = Math.min(W, charLeft + charW);
  const visBottom = Math.min(H, charTop  + charH);
  const croppedCharBuf = await sharp(charBuf)
    .extract({
      left:   visLeft - charLeft,
      top:    visTop  - charTop,
      width:  visRight  - visLeft,
      height: visBottom - visTop,
    })
    .toBuffer();

  // 4. Text SVG
  let svgStr;
  if      (slide.type === 'cover') svgStr = buildCoverSVG(slide);
  else if (slide.type === 'cta')   svgStr = buildCTASVG(slide);
  else                             svgStr = buildContentSVG(slide);

  // 5. Composite: bg → char (multiply) → text (on top)
  await sharp(bgBuf)
    .composite([
      { input: croppedCharBuf,      left: visLeft, top: visTop, blend: 'multiply' },
      { input: Buffer.from(svgStr), left: 0,       top: 0 },
    ])
    .jpeg({ quality: 93 })
    .toFile(outputPath);

  console.log(`  ✓ slide-${slide.index}.jpg  [${slide.type}]`);
}

async function overlayAll(plan, rawDir, outDir) {
  fs.mkdirSync(outDir, { recursive: true });
  const paths = [];
  for (const slide of plan.slides) {
    const rawPath = path.join(rawDir, `slide-${slide.index}-raw.jpg`);
    if (!fs.existsSync(rawPath)) throw new Error(`Missing: ${rawPath}`);
    const outPath = path.join(outDir, `slide-${slide.index}.jpg`);
    await overlaySlide(slide, rawPath, outPath);
    paths.push(outPath);
  }
  return paths;
}

module.exports = { overlayAll, overlaySlide };

if (require.main === module) {
  if (!imageDir || !outputDir) {
    console.error('Usage: node overlay-text.js --plan <file> --image-dir <dir> --output-dir <dir>');
    process.exit(1);
  }
  const plan = JSON.parse(fs.readFileSync(path.resolve(planFile), 'utf8'));
  overlayAll(plan, path.resolve(imageDir), path.resolve(outputDir))
    .then(p => console.log(`\nDone — ${p.length} slides ready.`))
    .catch(e => { console.error('Failed:', e.message); process.exit(1); });
}
