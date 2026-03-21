---
name: tiktok-app-marketing
description: Automate TikTok slideshow marketing for Dawnce (@dawnce.appp) — a dance alarm app for Gen Z. Use when setting up or running the cron job, creating TikTok posts, researching viral hooks, analyzing post performance, or when the user mentions TikTok growth, slideshow content, carousel posts, social media marketing, or content automation for Dawnce. Handles the full pipeline: research → hook selection → slide generation → AI image rendering via fal.ai → posting. Also use when the user says "make a TikTok", "post to TikTok", "run content", "check analytics", or "research hooks."
---

# Dawnce TikTok Marketing

**App:** Dawnce — alarm app that makes you dance to dismiss it. Account: `@dawnce.appp`

**ICP:** 14–24 year old Gen Z boys who want to improve their looks and physical appearance. Every post delivers real, actionable tips — Dawnce is mentioned softly, never hard-sold. The app is a natural tool that helps them reach the goal already on their mind.

**Goal:** 3 posts/day via automated cron job. Same character every post. Hooks are data-driven — 50% from viral TikTok research, 50% from our own performance data.

**Benchmark:** @forzic.bluebro — exact same character every slide, bold white-bg/single-accent-color, high-save listicle content. Study their composition closely.

---

## Architecture Overview

```
CRON (3x/day — 9AM, 1PM, 6PM)
    │
    ├── 1. RESEARCH ENGINE
    │       ├── 50% → Peekaboo: browse TikTok live, find viral posts (≥11k likes)
    │       └── 50% → Internal analytics: our own top performers
    │
    ├── 2. HOOK SELECTION
    │       └── Score + pick best hook for this post
    │
    ├── 3. CONTENT PLANNING
    │       └── Write slide plan (4–6 slides) based on hook + ICP + content strategy
    │
    ├── 4. IMAGE GENERATION
    │       └── fal.ai (GPT-image-1.5) → one AI image per slide, brand-consistent
    │
    ├── 5. SLIDE ASSEMBLY
    │       └── Overlay text on generated images → JPEG (1080×1080)
    │
    ├── 6. POST
    │       └── post-to-tiktok.js → Blotato → TikTok drafts
    │
    └── 7. LOG
            └── analytics-log.json → feeds back into research engine
```

---

## Brand Spec (LOCKED — Never Deviate)

### Color Palette — ONLY These Colors

Modeled directly after @forzic.bluebro:

| Use | Color | Notes |
|-----|-------|-------|
| Background | White | #FFFFFF — all slides |
| Character | Blue | Bold cobalt/royal blue — same shade as benchmark |
| Heading text (cover slide only) | Red | Bold, all caps, massive. **Red is ONLY used on the cover headline.** |
| All other text | Black | Bold, clean, sans-serif |

**Zero exceptions.** No gold. No gray backgrounds. No dark mode. The constraint IS the brand identity.

### Character — THE NON-NEGOTIABLE RULE

**Every single slideshow uses the same character.** Not "similar." Visually identical across every post ever made. This is the brand moat — the character IS the brand, exactly like Blue Bro.

**Expression freedom:** The character can display any pose, expression, or action that makes sense for the slide. No locked list. Whatever serves the visual story of that slide best.

**Placement:** Every slide must have the character. Cover + CTA mandatory. All content slides must include the character in a pose that visually illustrates the tip on that slide.

### Character Consistency — Root Prompt System

Every fal.ai image generation call prepends this **root prompt** before any slide-specific instructions. This is the global brand anchor. Never modify it.

```
ROOT_PROMPT (prepend to every fal.ai call):
"Cartoon muscular male character, bright cobalt blue skin and body, round head, 
simple black dot eyes, small curved smile, dark athletic shorts, bold black outline, 
flat vector illustration style, clean white background, no gradients, no shading, 
no shadows, thick outlines, Blue Bro / forzic.bluebro aesthetic. 
Character must look visually identical to prior slides in this series."
```

Then append the slide-specific action, e.g.:
- `"Character is flexing both arms overhead, looking proud and energized."`
- `"Character is lying down tanning, subtle glitter shimmer on blue skin, relaxed smile."`
- `"Two versions of the character side by side: LEFT has puffy face, tired droopy eyes, dull look. RIGHT has sharp defined jawline, hollow cheeks, bright alert eyes. Label LEFT 'Before', label RIGHT 'After'."`

**Consistency protocol:** Generate slide 1 first. Save the output image URL. For slides 2–N, pass slide 1's URL as `image_url` (reference image) in the fal.ai call alongside the root prompt. This gives the model a visual anchor and is the strongest consistency lever available.

### Typography

- **Cover headline:** MASSIVE, all caps, bold, red. Fills top of slide.
- **Subtext on cover:** Black, bold, smaller — one short line below headline.
- **Content slide headlines:** Bold, black, large. Max 5–6 words.
- **Body/supporting text:** Bold sans-serif, black, readable at phone size (≥50px at 1080px).
- **NO cursive. NO thin fonts. NO decorative fonts. Ever.**

### Slide Format

- JPEG only, 1080×1080px. TikTok rejects PNG.
- **Minimum 4 slides. Maximum 6 slides.**
- Structure: 1 cover + 2–4 content + 1 CTA = 4–6 total
- CTA is always the last slide. Always soft. Never pushy.

---

## ICP & Content Strategy

**Who we're talking to:** 14–24 year old guys. They want to look better — better skin, sharper face, more attractive overall. They consume self-improvement and looksmaxxing content on TikTok. They're not necessarily into productivity or morning routines yet, but they ARE into looking good.

**How Dawnce fits in:** The app never leads. It shows up as a natural, helpful tool inside a tip that's genuinely useful. Example: a tip about reducing cortisol for better skin → "tools like Dawnce help you actually get up early so you're not spiking cortisol every morning."

**Content angle:** Looks-based self-improvement. Every post is a list of real hacks, tips, or facts that help them look better. Dawnce gets one soft mention — usually slide 4 or 5 — tied to a tip where early rising or sleep quality is relevant.

### Content Pillars

| Pillar | Example Hook | Dawnce Tie-in |
|--------|-------------|---------------|
| **Face/appearance hacks** | "Looks +23% with 4 easy hacks" | Cortisol/sleep tip → Dawnce |
| **Glow-up routines** | "5 things making you look worse" | Morning routine tip → Dawnce |
| **Sleep & skin science** | "Why bad sleep destroys your skin" | Direct — Dawnce solves this |
| **Body/fitness appearance** | "Why you look skinny fat" | Indirect mention or skip |

### Example Post — Full Breakdown

**Hook:** "Looks = +23%" / "4 easy hacks"

| Slide | Headline | Body Text | Character Action | Dawnce? |
|-------|----------|-----------|-----------------|---------|
| 1 (Cover) | LOOKS = +23% | 4 easy hacks | Before/after side-by-side — puffy vs sharp face | No |
| 2 | Face Yoga | Works jaw muscles, defines your angles over time | Dragging finger alongside jawline showing the angle | No |
| 3 | Tan Enhancers | SPF daily + tanning oil on top. Glowing skin reads as healthier instantly | Lying down tanning, shimmer on skin | No |
| 4 | Don't Snooze | Cortisol spikes from snoozing = inflammation, puffiness, bad skin. Try tools like Dawnce to actually get up. | Energized and awake, alarm dismissed on phone in hand | **Yes — soft** |
| 5 (CTA) | Download Dawnce | Available on the App Store 📲 | Small casual dance move, relaxed | Yes |

**CTA copy rules — always App Store download, never follow/like:**
- The CTA is always and only: download Dawnce on the App Store
- Good: `"Download Dawnce on the App Store 📲"`, `"Get Dawnce — App Store 🕺"`
- Bad: `"Follow @dawnce.appp"`, `"Like for more"`, `"Link in bio"`, any follow/engagement CTA

---

## Research Engine (50/50)

### Signal A: External (50%) — Peekaboo Live TikTok Research

**Tool:** Peekaboo — browser automation that navigates TikTok's UI directly.

**What it does per run:**
1. Opens TikTok search
2. Runs **3 separate searches** using keywords rotated from this list each run:
   - `"alarm"`, `"snooze"`, `"morning routine"`, `"glow up"`, `"looks hacks"`, `"skin tips"`, `"get up early"`, `"cortisol"`, `"jaw define"`, `"looksmaxxing"`
3. Scrolls results and identifies posts with **≥11,000 likes** — hard filter, no exceptions
4. Extracts from each qualifying post:
   - Cover slide headline / first on-screen text (the hook)
   - Like count, comment count
   - Content format (list, tip, before/after, story)
   - Slide count

**Scoring:**
```
external_score = (likes / 11000) * 0.4 + (comments / likes) * 0.3 + (slide_count_bonus) * 0.3
```
Higher like multiple = stronger signal. Comments / likes = emotional resonance.

**Script:** `scripts/research-external.js`
```bash
node skills/larry/scripts/research-external.js \
  --searches "alarm,glow up,morning routine" \
  --min-likes 11000 \
  --output tiktok-marketing/research/external-hooks.json
```

**Output:**
```json
[
  {
    "hook": "4 things making you look worse",
    "format": "list",
    "likes": 48200,
    "comments": 930,
    "slide_count": 5,
    "external_score": 0.072,
    "search_term": "glow up",
    "scraped_at": "2026-03-20T09:00:00Z"
  }
]
```

**Important:** Hook and format are inspiration only. Rewrite for our ICP and brand. Never copy word-for-word.

### Signal B: Internal (50%) — Our Own Performance Data

**Source:** `tiktok-marketing/analytics-log.json`

**What to analyze:**
- Which hooks had highest like + comment rate for our audience
- Which content pillars perform best
- Which slide count (4 vs 5 vs 6) gets more engagement
- Which CTA phrasing drives new follows

**Scoring:**
```
internal_score = (likes / views) * 0.5 + (comments / views) * 0.3 + (new_followers / views) * 0.2
```

**Script:** `scripts/research-internal.js`
```bash
node skills/larry/scripts/research-internal.js --output tiktok-marketing/research/internal-insights.json
```

**Fallback:** Posts 1–4 have no internal data — run 100% external signal. Internal weight activates from post 5 onward.

### Hook Selection — Blending Both Signals

```javascript
// scripts/pick-best-hook.js
const external = loadJSON('research/external-hooks.json');
const internal = loadJSON('research/internal-insights.json');

const scored = external.map(h => ({
  ...h,
  blended_score: (h.external_score * 0.5) + (internalScore(h, internal) * 0.5)
}));

return scored.sort((a, b) => b.blended_score - a.blended_score)[0];
```

**Full research pipeline:**
```bash
node skills/larry/scripts/research-external.js --searches "alarm,glow up,looksmaxxing" --min-likes 11000
node skills/larry/scripts/research-internal.js
node skills/larry/scripts/pick-best-hook.js --output tiktok-marketing/research/selected-hook.json
```

---

## Image Generation — fal.ai (GPT-image-1.5)

One AI-generated image per slide. Text is overlaid after. Model: `fal-ai/gpt-image-1-5`.

### API Call

```javascript
const fal = require('@fal-ai/serverless-client');

async function generateSlideImage(slide, referenceImageUrl = null) {
  const ROOT = `Cartoon muscular male character, bright cobalt blue skin and body, round head, 
simple black dot eyes, small curved smile, dark athletic shorts, bold black outline, 
flat vector illustration style, clean white background, no gradients, no shading, 
no shadows, thick outlines, Blue Bro / forzic.bluebro aesthetic. 
Character must look visually identical to prior slides in this series.`;

  const prompt = `${ROOT} ${slide.characterAction}`;

  const result = await fal.run('fal-ai/gpt-image-1-5', {
    input: {
      prompt,
      image_size: 'square_hd',
      num_images: 1,
      ...(referenceImageUrl && { image_url: referenceImageUrl })
    }
  });

  return result.images[0].url;
}
```

### Character Action Examples by Slide Type

| Slide Type | `characterAction` |
|------------|-------------------|
| Before/after (cover) | `"Two versions side by side. LEFT: puffy face, tired droopy eyes, dull skin, labeled 'Before'. RIGHT: sharp jawline, hollow cheeks, bright alert eyes, labeled 'After'."` |
| Jawline tip | `"Character dragging one finger along his jawline, slight proud smirk, showing off sharp jaw angle."` |
| Tanning tip | `"Character lying back relaxing, eyes closed, content smile. Subtle glittering shimmer on blue skin suggesting a healthy tan."` |
| Sleep/Dawnce tip | `"Character looking bright and energized, arms slightly raised, alarm shown as dismissed on phone in hand."` |
| CTA | `"Character doing a small casual dance move, relaxed and happy energy."` |

### Consistency Protocol

1. Generate slide 1 → save image URL as `referenceImageUrl`
2. Pass `referenceImageUrl` into every subsequent fal.ai call
3. This locks character identity across the full carousel

### Text Overlay (Post-Generation)

Script: `scripts/overlay-text.js`
- Cover: Red headline top, black subtext below
- Content: Black headline top, black body text below
- CTA: Black text, centered
- Font: Bold sans-serif, ≥60px at 1080px. Nothing smaller.

---

## Cron Job Setup

```bash
# 3x daily — 9:00 AM, 1:00 PM, 6:00 PM
0 9,13,18 * * * cd ~/.openclaw/workspace && node skills/larry/scripts/tiktok-cron.js >> logs/tiktok-cron.log 2>&1
```

### Orchestrator: `scripts/tiktok-cron.js`

```javascript
async function run() {
  await exec('node research-external.js --searches "alarm,glow up,looksmaxxing" --min-likes 11000');
  await exec('node research-internal.js');
  const hook = await exec('node pick-best-hook.js');

  const plan = await planSlides(hook);  // 4–6 slides, CTA always last

  // Generate images with reference chaining
  let refUrl = null;
  const images = [];
  for (const slide of plan.slides) {
    const url = await generateSlideImage(slide, refUrl);
    if (!refUrl) refUrl = url;  // Slide 1 becomes the reference
    images.push(url);
  }

  const slides = await overlayText(images, plan);
  const postId = await postToTikTok(slides, plan.caption);
  await logPost(hook, postId);
  await updateAnalytics({ daysAgo: 2 });
}
```

**Manual run:**
```bash
cd ~/.openclaw/workspace && node skills/larry/scripts/tiktok-cron.js
```

---

## Posting

```bash
node skills/larry/scripts/post-to-tiktok.js \
  --dir tiktok-marketing/posts/<post-name>/ \
  --caption "Your caption here"
```

**Caption formula:**
```
[Hook matching cover] 👀 [1–2 sentences on the topic].
Download Dawnce on the App Store 📲

#glowup #looksmaxxing #morningroutine #skincare #GenZ #dawnce #fyp
```

After posting: TikTok → Drafts → add trending sound → publish.

---

## Analytics Logging

```bash
node skills/larry/scripts/log-post.js --hook "Looks +23%" --pillar "appearance_hacks" --post-id <id>
node skills/larry/scripts/update-analytics.js --days-ago 2
node skills/larry/scripts/check-analytics.js
```

**Log schema:** `tiktok-marketing/analytics-log.json`
```json
[
  {
    "post_id": "abc123",
    "hook": "Looks +23%",
    "pillar": "appearance_hacks",
    "slide_count": 5,
    "posted_at": "2026-03-20T09:00:00Z",
    "stats_pulled_at": "2026-03-22T09:00:00Z",
    "views": 18400,
    "likes": 1240,
    "comments": 67,
    "saves": 290,
    "new_followers": 43
  }
]
```

---

## Quality Checklist

| Check | Criteria |
|-------|----------|
| Character | Same blue character as every other post? |
| Colors | White bg, black text, red ONLY on cover headline? |
| Slide count | Between 4 and 6? |
| CTA | Last slide? Always "Download Dawnce on the App Store" — never follow/like CTAs? |
| Dawnce mention | One slide only, tied to a real tip, feels natural? |
| Readability | All text readable on 6" phone? Nothing clipped? |
| Sound | Added trending audio before publishing? |

---

## Troubleshooting

| Issue | Fix |
|-------|-----|
| Character looks different slide-to-slide | Pass slide 1 URL as `image_url` reference for all subsequent fal.ai calls |
| fal.ai returning wrong style | Strengthen ROOT_PROMPT — add "Blue Bro aesthetic", "flat vector, no shading, white background" |
| Peekaboo not finding ≥11k posts | Rotate search terms. Try "jawline", "looksmaxxing", "skin care men" |
| Post not in TikTok drafts | Check localtunnel, Blotato API key, account ID `33439` |
| No internal data yet | Posts 1–4: 100% external signal. Internal activates post 5. |
| CTA feels too salesy | Rewrite. The tone is "this tool genuinely helped me" — not an ad. Keep the App Store download CTA but wrap it in a natural sentence. |

---

## Reference Files

| File | Purpose |
|------|---------|
| `assets/CHARACTER-BRIEF.md` | Character visual spec + root prompt variants + reference images |
| `references/post-templates.md` | Ready-made slide plans for all content pillars |
| `scripts/tiktok-cron.js` | Master cron orchestrator |
| `scripts/research-external.js` | Peekaboo TikTok browser research (≥11k likes filter) |
| `scripts/research-internal.js` | Internal analytics analyzer |
| `scripts/pick-best-hook.js` | 50/50 blend + hook selector |
| `scripts/generate-slide-image.js` | fal.ai (GPT-image-1.5) image generation with root prompt + reference chaining |
| `scripts/overlay-text.js` | Composite text onto generated images → JPEG |
| `scripts/post-to-tiktok.js` | Upload + post via Blotato |
| `scripts/log-post.js` | Log post to analytics-log.json |
| `scripts/update-analytics.js` | Pull TikTok stats 48h post-publish |
| `scripts/check-analytics.js` | Performance summary |
| `tiktok-marketing/config.json` | Blotato API key, fal.ai API key, account IDs |
| `tiktok-marketing/research/` | Research outputs |
| `tiktok-marketing/analytics-log.json` | Full post performance history |
| `tiktok-marketing/posts/` | Output dirs per post |
| `logs/tiktok-cron.log` | Cron execution log |
