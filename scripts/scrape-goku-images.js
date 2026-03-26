#!/usr/bin/env node
/**
 * scrape-goku-images.js
 * Scrapes high-quality Goku reference images from Bing Image Search for LoRA training.
 * Downloads varied poses/expressions to tiktok-marketing/character-training/.
 *
 * Usage:
 *   node scripts/scrape-goku-images.js
 *   node scripts/scrape-goku-images.js --count 80 --output tiktok-marketing/character-training
 *
 * Then train the LoRA:
 *   node scripts/train-character-lora.js
 */

const fs    = require('fs');
const path  = require('path');
const https = require('https');
const http  = require('http');
const url   = require('url');

const args    = process.argv.slice(2);
const getArg  = (flag, def) => { const i = args.indexOf(flag); return i !== -1 ? args[i + 1] : def; };
const MAX     = parseInt(getArg('--count', '80'), 10);
const OUT_DIR = path.resolve(getArg('--output', 'tiktok-marketing/character-training'));

// ─── Search queries ───────────────────────────────────────────────────────────
// Variety matters for a good LoRA: different poses, expressions, power states,
// angles. These queries target full-body, face, and iconic moments.
const QUERIES = [
  'Goku Dragon Ball Z full body front view anime',
  'Son Goku orange gi standing pose official art',
  'Goku Super Saiyan full body anime',
  'Goku Dragon Ball Z fighting stance pose',
  'Goku Dragon Ball Z character design sheet',
  'Goku powering up ki energy Dragon Ball',
  'Goku calm neutral standing Dragon Ball Z',
  'Goku tired sleeping exhausted Dragon Ball',
  'Goku smiling happy Dragon Ball Z anime',
  'Goku running training Dragon Ball Z',
];

const PER_QUERY = Math.ceil(MAX / QUERIES.length) + 5; // slight overshoot, dedup later

function log(msg) { console.log(`[${new Date().toISOString().slice(11, 19)}] ${msg}`); }

// ─── Bing image URL extraction ────────────────────────────────────────────────
async function getBingImageUrls(query, maxResults) {
  const puppeteer = require('puppeteer');
  const browser = await puppeteer.launch({
    headless: 'new',
    args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-dev-shm-usage']
  });

  const urls = [];
  try {
    const page = await browser.newPage();
    await page.setUserAgent(
      'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
    );

    const searchUrl = `https://www.bing.com/images/search?q=${encodeURIComponent(query)}&form=HDRSC2&first=1&tsc=ImageHoverTitle`;
    await page.goto(searchUrl, { waitUntil: 'networkidle2', timeout: 30000 });
    await new Promise(r => setTimeout(r, 2000));

    // Scroll to load more results
    for (let i = 0; i < 4; i++) {
      await page.evaluate(() => window.scrollBy(0, 1500));
      await new Promise(r => setTimeout(r, 1200));
    }

    // Extract original image URLs from Bing's .iusc elements (m attribute JSON)
    const extracted = await page.evaluate(() => {
      const results = [];

      // Primary: .iusc elements with m={murl:...} attribute
      document.querySelectorAll('.iusc').forEach(el => {
        try {
          const m = JSON.parse(el.getAttribute('m') || '{}');
          if (m.murl && m.murl.startsWith('http')) results.push(m.murl);
        } catch (_) {}
      });

      // Fallback: .imgpt anchor hrefs (mediaurl param)
      if (results.length < 5) {
        document.querySelectorAll('a.iusc, a[m]').forEach(el => {
          try {
            const m = JSON.parse(el.getAttribute('m') || '{}');
            if (m.murl && m.murl.startsWith('http')) results.push(m.murl);
          } catch (_) {}
        });
      }

      return results;
    });

    urls.push(...extracted.slice(0, maxResults));
    await page.close();
  } finally {
    await browser.close();
  }

  return urls;
}

// ─── Image download ───────────────────────────────────────────────────────────
function downloadImage(imageUrl, destPath, maxRedirects = 5) {
  return new Promise((resolve, reject) => {
    if (maxRedirects <= 0) return reject(new Error('Too many redirects'));

    const parsed = url.parse(imageUrl);
    const proto  = parsed.protocol === 'https:' ? https : http;

    const req = proto.get({
      hostname: parsed.hostname,
      path:     parsed.path,
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
        'Referer':    'https://www.bing.com/',
        'Accept':     'image/webp,image/apng,image/*,*/*;q=0.8',
      },
      timeout: 15000,
    }, res => {
      if (res.statusCode >= 300 && res.statusCode < 400 && res.headers.location) {
        return resolve(downloadImage(res.headers.location, destPath, maxRedirects - 1));
      }
      if (res.statusCode !== 200) {
        res.resume();
        return reject(new Error(`HTTP ${res.statusCode}`));
      }

      const contentType = res.headers['content-type'] || '';
      if (contentType.includes('text/html') || contentType.includes('application/json')) {
        res.resume();
        return reject(new Error(`Wrong content-type: ${contentType}`));
      }

      const chunks = [];
      res.on('data', c => chunks.push(c));
      res.on('end', () => {
        const buf = Buffer.concat(chunks);
        if (buf.length < 15000) return reject(new Error(`Too small (${buf.length}B) — likely placeholder`));
        fs.writeFileSync(destPath, buf);
        resolve(buf.length);
      });
      res.on('error', reject);
    });

    req.on('error', reject);
    req.on('timeout', () => { req.destroy(); reject(new Error('Request timeout')); });
  });
}

function ext(imageUrl) {
  const u = imageUrl.split('?')[0].toLowerCase();
  if (u.endsWith('.png'))  return '.png';
  if (u.endsWith('.webp')) return '.webp';
  if (u.endsWith('.gif'))  return null; // skip GIFs — poor LoRA training data
  return '.jpg';
}

// ─── Main ─────────────────────────────────────────────────────────────────────
async function main() {
  fs.mkdirSync(OUT_DIR, { recursive: true });

  const existingCount = fs.readdirSync(OUT_DIR)
    .filter(f => /\.(jpg|jpeg|png|webp)$/i.test(f)).length;

  if (existingCount > 0) {
    log(`${existingCount} images already in ${OUT_DIR}`);
    log(`Continuing — will add more until we reach ${MAX} total.`);
  }

  const seenUrls = new Set();
  let saved = existingCount;
  let attempted = 0;
  let queryIndex = 0;

  for (const query of QUERIES) {
    if (saved >= MAX) break;

    log(`Searching Bing for: "${query}"`);
    let imageUrls;
    try {
      imageUrls = await getBingImageUrls(query, PER_QUERY);
      log(`  Found ${imageUrls.length} candidate URLs`);
    } catch (err) {
      log(`  Search failed: ${err.message}`);
      queryIndex++;
      continue;
    }

    let queryCount = 0;
    for (const imageUrl of imageUrls) {
      if (saved >= MAX) break;
      if (seenUrls.has(imageUrl)) continue;
      seenUrls.add(imageUrl);

      const fileExt = ext(imageUrl);
      if (!fileExt) continue; // skip GIFs

      const filename = `goku-q${queryIndex}-${String(attempted).padStart(3, '0')}${fileExt}`;
      const destPath = path.join(OUT_DIR, filename);

      // Don't re-download if a file of the same name exists
      if (fs.existsSync(destPath)) { attempted++; continue; }

      attempted++;
      try {
        const bytes = await downloadImage(imageUrl, destPath);
        saved++;
        queryCount++;
        process.stdout.write(`\r  ✓ ${saved}/${MAX} saved  (${Math.round(bytes / 1024)}KB)  `);
      } catch (err) {
        // Silent — bad URLs are normal
      }
    }

    process.stdout.write('\n');
    log(`  Saved ${queryCount} images from this query (total: ${saved})`);
    queryIndex++;

    // Brief pause between queries to be polite
    if (saved < MAX && queryIndex < QUERIES.length) {
      await new Promise(r => setTimeout(r, 1500));
    }
  }

  const final = fs.readdirSync(OUT_DIR).filter(f => /\.(jpg|jpeg|png|webp)$/i.test(f));

  console.log(`
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  Goku image scrape complete.

  Images saved : ${final.length}
  Directory    : ${OUT_DIR}

  ${final.length < 20
    ? '⚠️  Only ' + final.length + ' images — LoRA needs at least 20. Try running again.'
    : final.length >= 40
      ? '✓  Great dataset size for LoRA training.'
      : '✓  Acceptable. 40+ is ideal but this will work.'}

  Next step — train the LoRA:
    node scripts/train-character-lora.js
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
`);

  if (final.length < 20) process.exit(1);
}

main().catch(err => {
  console.error('scrape-goku-images.js failed:', err.message);
  process.exit(1);
});
