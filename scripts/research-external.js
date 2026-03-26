#!/usr/bin/env node
/**
 * research-external.js
 * Peekaboo: browser automation to scrape TikTok for viral posts (≥11k likes)
 *
 * Usage:
 *   node scripts/research-external.js --searches "alarm,glow up,morning routine" --min-likes 11000
 *   node scripts/research-external.js --mock   (use sample data, no browser needed)
 */

const fs = require('fs');
const path = require('path');

const args = process.argv.slice(2);
const getArg = (flag, def) => {
  const i = args.indexOf(flag);
  return i !== -1 ? args[i + 1] : def;
};
const hasFlag = flag => args.includes(flag);

const searchTermsRaw = getArg('--searches', 'alarm,glow up,morning routine');
const searchTerms = searchTermsRaw.split(',').map(s => s.trim());
const minLikes = parseInt(getArg('--min-likes', '11000'), 10);
const outputFile = getArg('--output', 'tiktok-marketing/research/external-hooks.json');
const useMock = hasFlag('--mock');

// ─── Mock data (fallback / test mode) ────────────────────────────────────────
const MOCK_RESULTS = [
  { hook: "how to summer glow up",                        format: "story",      likes: 67300, comments: 1240, slide_count: 5, search_term: "glow up",         scraped_at: new Date().toISOString() },
  { hook: "what i did to fix my skin in 30 days",         format: "story",      likes: 58400, comments: 1100, slide_count: 5, search_term: "skin",             scraped_at: new Date().toISOString() },
  { hook: "why you look tired (and how to fix it)",       format: "story",      likes: 89400, comments: 2100, slide_count: 5, search_term: "tired",            scraped_at: new Date().toISOString() },
  { hook: "the snooze button is destroying your face",    format: "story",      likes: 74200, comments: 1780, slide_count: 5, search_term: "alarm",            scraped_at: new Date().toISOString() },
  { hook: "what actually makes guys look better",         format: "list",       likes: 52100, comments: 980,  slide_count: 5, search_term: "looksmaxxing",     scraped_at: new Date().toISOString() },
  { hook: "how i fixed my jaw in 3 weeks",                format: "before_after",likes: 61800, comments: 1420, slide_count: 5, search_term: "jaw define",      scraped_at: new Date().toISOString() },
  { hook: "cortisol is making you ugly (here's how)",     format: "tip",        likes: 83500, comments: 2300, slide_count: 5, search_term: "cortisol",         scraped_at: new Date().toISOString() },
  { hook: "stop snoozing and watch what happens",         format: "story",      likes: 47900, comments: 890,  slide_count: 5, search_term: "snooze",           scraped_at: new Date().toISOString() },
  { hook: "the morning routine that changed my face",     format: "story",      likes: 44100, comments: 890,  slide_count: 5, search_term: "morning routine",  scraped_at: new Date().toISOString() },
  { hook: "5 things that cleared my skin in a week",      format: "list",       likes: 39600, comments: 760,  slide_count: 5, search_term: "skin tips",        scraped_at: new Date().toISOString() },
  { hook: "why your face looks puffy every morning",      format: "tip",        likes: 55200, comments: 1050, slide_count: 5, search_term: "puffiness",        scraped_at: new Date().toISOString() },
  { hook: "how to wake up looking good every day",        format: "story",      likes: 48700, comments: 920,  slide_count: 5, search_term: "morning routine",  scraped_at: new Date().toISOString() },
];

function scorePost({ likes, comments, slide_count }) {
  const likeScore = (likes / minLikes) * 0.4;
  const engagementScore = (comments / likes) * 0.3;
  const slideBonus = (slide_count >= 5 ? 1 : 0.7) * 0.3;
  return likeScore + engagementScore + slideBonus;
}

async function scrapeWithPuppeteer() {
  const puppeteer = require('puppeteer');
  const results = [];

  console.log('Launching browser...');
  const browser = await puppeteer.launch({
    headless: 'new',
    args: ['--no-sandbox', '--disable-setuid-sandbox']
  });

  try {
    for (const term of searchTerms) {
      console.log(`  Searching TikTok for: "${term}"`);
      const page = await browser.newPage();
      await page.setUserAgent(
        'Mozilla/5.0 (iPhone; CPU iPhone OS 16_6 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/16.6 Mobile/15E148 Safari/604.1'
      );

      try {
        await page.goto(`https://www.tiktok.com/search?q=${encodeURIComponent(term)}&type=video`, {
          waitUntil: 'networkidle2',
          timeout: 30000
        });

        await new Promise(r => setTimeout(r, 3000));

        // Scroll to load more results
        for (let i = 0; i < 3; i++) {
          await page.evaluate(() => window.scrollBy(0, 1000));
          await new Promise(r => setTimeout(r, 1500));
        }

        // Extract post data from the page
        const posts = await page.evaluate(() => {
          const items = [];
          // TikTok search result items
          const videoItems = document.querySelectorAll('[data-e2e="search_video-item"], .tiktok-x6y88p-DivItemContainerV2');
          videoItems.forEach(item => {
            const likeEl = item.querySelector('[data-e2e="like-count"], .like-count');
            const descEl = item.querySelector('[data-e2e="search-card-desc"], .video-meta-title');
            const likeText = likeEl ? likeEl.textContent.trim() : '0';

            // Parse like count (e.g. "48.2K" → 48200, "1.2M" → 1200000)
            let likes = 0;
            if (likeText.includes('M')) likes = parseFloat(likeText) * 1000000;
            else if (likeText.includes('K')) likes = parseFloat(likeText) * 1000;
            else likes = parseInt(likeText) || 0;

            if (likes > 0 && descEl) {
              items.push({
                hook: descEl.textContent.trim().slice(0, 100),
                likes,
                slide_count: 5 // approximate; TikTok doesn't expose slide count in search
              });
            }
          });
          return items;
        });

        for (const post of posts) {
          if (post.likes >= minLikes) {
            results.push({
              hook: post.hook,
              format: guessFormat(post.hook),
              likes: post.likes,
              comments: Math.round(post.likes * 0.02), // estimate
              slide_count: post.slide_count,
              search_term: term,
              scraped_at: new Date().toISOString()
            });
          }
        }

        console.log(`    Found ${posts.filter(p => p.likes >= minLikes).length} qualifying posts`);
      } catch (err) {
        console.warn(`    Failed to scrape "${term}": ${err.message}`);
      } finally {
        await page.close();
      }
    }
  } finally {
    await browser.close();
  }

  return results;
}

function guessFormat(hook) {
  const h = hook.toLowerCase();
  if (/\d/.test(h) && (h.includes('thing') || h.includes('hack') || h.includes('tip') || h.includes('way'))) return 'list';
  if (h.includes('why') || h.includes('how') || h.includes('science')) return 'tip';
  if (h.includes('before') || h.includes('after') || h.includes('transform')) return 'before_after';
  return 'story';
}

async function main() {
  let results;

  if (useMock) {
    console.log('Using mock TikTok data (--mock flag set)');
    results = MOCK_RESULTS;
  } else {
    console.log(`Scraping TikTok for: ${searchTerms.join(', ')}`);
    console.log(`Min likes threshold: ${minLikes.toLocaleString()}`);

    try {
      results = await scrapeWithPuppeteer();

      // Fall back to mock if scraping returns nothing useful
      if (results.length === 0) {
        console.warn('Scraping returned no results — falling back to mock data');
        results = MOCK_RESULTS;
      }
    } catch (err) {
      console.warn(`Puppeteer scraping failed (${err.message}) — falling back to mock data`);
      results = MOCK_RESULTS;
    }
  }

  // Score and sort
  const scored = results.map(r => ({
    ...r,
    external_score: parseFloat(scorePost(r).toFixed(4))
  })).sort((a, b) => b.external_score - a.external_score);

  const outPath = path.resolve(outputFile);
  fs.mkdirSync(path.dirname(outPath), { recursive: true });
  fs.writeFileSync(outPath, JSON.stringify(scored, null, 2));

  console.log(`\nExternal research complete: ${scored.length} hooks`);
  console.log(`Top hook: "${scored[0]?.hook}" (score: ${scored[0]?.external_score})`);
  console.log(`Saved to: ${outPath}`);
}

main().catch(err => {
  console.error('research-external.js failed:', err);
  process.exit(1);
});
