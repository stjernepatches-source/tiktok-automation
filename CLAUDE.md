# Dawnce TikTok Automation

Automated TikTok slideshow marketing pipeline for **Dawnce** (`@dawnce.appp`) — a dance alarm app targeting Gen Z.

## Project Purpose

3 posts/day via cron (9AM, 1PM, 6PM). Each post is a 4–6 slide carousel with a consistent cartoon character, targeting 14–24 year old guys interested in looksmaxxing/glow-up content. Dawnce is mentioned softly in one slide only.

## Architecture

```
CRON → research-external.js + research-internal.js → pick-best-hook.js
     → tiktok-cron.js (orchestrator)
     → generate-slide-image.js (fal.ai)
     → overlay-text.js (canvas)
     → post-to-tiktok.js (Blotato API)
     → log-post.js + update-analytics.js
```

## Key Files

| File | Purpose |
|------|---------|
| `scripts/tiktok-cron.js` | Master orchestrator |
| `scripts/research-external.js` | Puppeteer TikTok scraping (≥11k likes) |
| `scripts/research-internal.js` | Internal analytics reader |
| `scripts/pick-best-hook.js` | 50/50 blend hook selector |
| `scripts/generate-slide-image.js` | fal.ai image generation |
| `scripts/overlay-text.js` | Canvas text compositing |
| `scripts/post-to-tiktok.js` | Blotato → TikTok drafts |
| `scripts/log-post.js` | Append to analytics-log.json |
| `scripts/update-analytics.js` | Pull TikTok stats 48h post-publish |
| `scripts/check-analytics.js` | Performance summary |
| `tiktok-marketing/config.json` | API keys and account IDs |
| `tiktok-marketing/analytics-log.json` | Post performance history |

## Config

Copy `tiktok-marketing/config.json` and fill in:
- `fal_api_key` — from fal.ai dashboard
- `blotato_api_key` — from Blotato dashboard
- `tiktok_account_id` — `34233` (Dawnce account)

## Brand Rules (Never Deviate)

- **Character:** Goku from Dragon Ball Z — trained Flux LoRA, trigger word GOKU. Orange gi, spiky hair, anime style. Power arc: exhausted/drained (slide 1) → Super Saiyan (slide 5)
- **Colors:** Cream bg #F5F0EB, black text, red ONLY on cover headline accent words
- **Slides:** 5 total: 1 cover + 3 content + 1 CTA (always last)
- **CTA:** Always "Download Dawnce on the App Store" — never follow/like CTAs
- **Dawnce mention:** Slide 4 only (content slide), tied to a real tip, never salesy

## LoRA Training

- Training images: `tiktok-marketing/character-training/` (scraped by `scrape-goku-images.js`)
- Train: `node scripts/scrape-goku-images.js && node scripts/train-character-lora.js`
- Trigger word: `GOKU`
- After training, `character_lora_url` saved to `tiktok-marketing/config.json` and auto-used

## Manual Run

```bash
node scripts/tiktok-cron.js
# Or dry-run (no posting):
node scripts/tiktok-cron.js --dry-run
```

## Research Keywords

`alarm`, `snooze`, `morning routine`, `glow up`, `looks hacks`, `skin tips`, `get up early`, `cortisol`, `jaw define`, `looksmaxxing`

## Skill Spec

See `SKILL (1).md` for the full brand spec, ICP, content strategy, and architecture overview.
