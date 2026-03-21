'use strict';

const { planSlides } = require('./plan-slides');
const { generateSlideImage } = require('./generate-slide-image');
const { overlayText } = require('./overlay-text');
const { postToTikTok } = require('./post-to-tiktok');
const { logPost } = require('./log-post');

async function run(hook) {
  if (!hook) throw new Error('hook is required');

  console.log(`\n=== Dawnce TikTok Automation ===`);
  console.log(`Hook: "${hook}"\n`);

  // 1. Plan slides using Claude
  console.log('[1/4] Planning slides...');
  const plan = await planSlides(hook);
  console.log(`      ${plan.slides.length} slides planned (pillar: ${plan.pillar})\n`);

  // 2. Generate images with fal.ai (reference chaining for consistency)
  console.log('[2/4] Generating images...');
  let referenceImageUrl = null;
  const rawImageUrls = [];

  for (let i = 0; i < plan.slides.length; i++) {
    const slide = plan.slides[i];
    const rawUrl = await generateSlideImage(slide, referenceImageUrl);
    if (i === 0) referenceImageUrl = rawUrl; // slide 1 anchors all subsequent images
    rawImageUrls.push(rawUrl);
  }
  console.log('      Image generation complete.\n');

  // 3. Overlay text and upload final slides
  console.log('[3/4] Overlaying text and uploading...');
  const finalImageUrls = [];
  for (let i = 0; i < plan.slides.length; i++) {
    const finalUrl = await overlayText(rawImageUrls[i], plan.slides[i]);
    finalImageUrls.push(finalUrl);
  }
  console.log('      Text overlay complete.\n');

  // 4. Post to TikTok via Blotato
  console.log('[4/4] Posting to TikTok...');
  const accountId = process.env.TIKTOK_ACCOUNT_ID;
  const postId = await postToTikTok(finalImageUrls, plan.caption, accountId);

  // Log the post
  logPost({ hook, pillar: plan.pillar, slideCount: plan.slides.length, postId });

  console.log(`\n=== Done ===`);
  console.log(`Post ID: ${postId}`);
  console.log(`Slides: ${finalImageUrls.length}`);
  console.log(`\nNext: Open TikTok → Drafts → add trending sound → publish\n`);

  return { postId, finalImageUrls, plan };
}

module.exports = { run };

// Allow direct execution: node scripts/tiktok-cron.js --hook "..."
if (require.main === module) {
  const args = process.argv.slice(2);
  const hookIdx = args.indexOf('--hook');
  const hook = hookIdx !== -1 ? args[hookIdx + 1] : null;

  if (!hook) {
    console.error('Usage: node scripts/tiktok-cron.js --hook "your hook here"');
    process.exit(1);
  }

  run(hook).catch(err => {
    console.error('Error:', err.message);
    process.exit(1);
  });
}
