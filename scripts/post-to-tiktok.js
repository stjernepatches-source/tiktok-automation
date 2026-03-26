#!/usr/bin/env node
/**
 * post-to-tiktok.js
 * Uploads final JPEG slides to fal.ai storage, then:
 *   - Posts to TikTok as SELF_ONLY draft (add music in TikTok app, then publish)
 *   - Saves Instagram post details locally (mediaUrls + caption) for manual push
 *
 * To push the saved Instagram draft to Blotato:
 *   node scripts/post-instagram.js
 *
 * Blotato API: https://backend.blotato.com/v2
 * Auth header: blotato-api-key: KEY
 *
 * Usage:
 *   node scripts/post-to-tiktok.js \
 *     --dir tiktok-marketing/posts/<post-name>/final/ \
 *     --caption "Your caption here" \
 *     [--dry-run]
 */

const fs = require('fs');
const path = require('path');
const axios = require('axios');

const args = process.argv.slice(2);
const getArg = (flag, def) => { const i = args.indexOf(flag); return i !== -1 ? args[i + 1] : def; };
const hasFlag = flag => args.includes(flag);

const slideDir = getArg('--dir', null);
const caption  = getArg('--caption', '');
const dryRun   = hasFlag('--dry-run');

const CONFIG_PATH = path.resolve('tiktok-marketing/config.json');

function loadConfig() {
  const cfg = JSON.parse(fs.readFileSync(CONFIG_PATH, 'utf8'));
  if (!dryRun && !cfg.blotato_api_key) throw new Error('blotato_api_key missing in config.json');
  if (!dryRun && !cfg.fal_api_key)     throw new Error('fal_api_key missing in config.json');
  return cfg;
}

async function uploadToFalStorage(filePath, falClient) {
  const buf  = fs.readFileSync(filePath);
  const blob = new Blob([buf], { type: 'image/jpeg' });
  return await falClient.storage.upload(blob);
}

async function blotatoPost(payload, config) {
  const res = await axios.post('https://backend.blotato.com/v2/posts', { post: payload }, {
    headers: { 'Content-Type': 'application/json', 'blotato-api-key': config.blotato_api_key },
    timeout: 30000
  });
  return res.data?.postSubmissionId || res.data?.id || JSON.stringify(res.data);
}

async function postTikTok(mediaUrls, caption, config) {
  // SELF_ONLY = only account owner can see it — effectively a draft.
  // Go to TikTok → your profile → find the post → add music → publish.
  return blotatoPost({
    accountId: parseInt(config.tiktok_account_id, 10),
    content: { text: caption, mediaUrls, platform: 'tiktok' },
    target: {
      targetType:      'tiktok',
      privacyLevel:    'SELF_ONLY',
      disabledComments: false,
      disabledDuet:     false,
      disabledStitch:   false,
      isBrandedContent: false,
      isYourBrand:      false,
      isAiGenerated:    true
    }
  }, config);
}

function igCaption(caption) {
  // Instagram allows max 5 hashtags
  const tags = (caption.match(/#\w+/g) || []).slice(0, 5);
  return caption.replace(/#\w+/g, '').trimEnd() + (tags.length ? '\n\n' + tags.join(' ') : '');
}

function saveInstagramDraft(mediaUrls, caption, config) {
  // Blotato has no Instagram draft mode — posts immediately.
  // Save locally instead; run `node scripts/post-instagram.js` to push when ready.
  const draft = {
    accountId: parseInt(config.instagram_account_id, 10),
    mediaUrls,
    caption: igCaption(caption),
    savedAt: new Date().toISOString()
  };
  const draftPath = path.resolve('tiktok-marketing/instagram-draft.json');
  fs.writeFileSync(draftPath, JSON.stringify(draft, null, 2));
  console.log(`  Instagram draft saved → tiktok-marketing/instagram-draft.json`);
  console.log(`  Run: node scripts/post-instagram.js   (to publish when ready)`);
}

async function postSlides(slideDirPath, caption) {
  const config = loadConfig();

  const files = fs.readdirSync(slideDirPath)
    .filter(f => f.match(/^slide-\d+\.jpg$/))
    .sort((a, b) => parseInt(a.match(/\d+/)[0]) - parseInt(b.match(/\d+/)[0]))
    .map(f => path.join(slideDirPath, f));

  if (files.length === 0) throw new Error(`No slide-N.jpg files found in: ${slideDirPath}`);

  console.log(`\nPosting ${files.length} slides to TikTok + Instagram via Blotato`);
  console.log(`Caption:\n${caption}\n`);

  if (dryRun) {
    console.log('[DRY RUN] Would upload:');
    files.forEach(f => console.log(`  ${f}`));
    return 'dry-run-post-id';
  }

  // Upload slides to fal.ai storage (one set of URLs, reused for both platforms)
  const { createFalClient } = require('@fal-ai/client');
  const fal = createFalClient({ credentials: config.fal_api_key });

  const mediaUrls = [];
  for (const filePath of files) {
    process.stdout.write(`  Uploading ${path.basename(filePath)}... `);
    const url = await uploadToFalStorage(filePath, fal);
    mediaUrls.push(url);
    console.log('done');
  }

  // Post to TikTok (as SELF_ONLY draft)
  console.log('\nPosting to TikTok (draft — add music then publish)...');
  const tiktokId = await postTikTok(mediaUrls, caption, config);
  console.log(`  ✓ TikTok submission ID: ${tiktokId}`);

  // Save Instagram draft locally (Blotato has no IG draft mode)
  console.log('Saving Instagram draft...');
  saveInstagramDraft(mediaUrls, caption, config);

  // Save TikTok ID for analytics tracking
  fs.writeFileSync(path.resolve('tiktok-marketing/.last-post-id'), String(tiktokId));

  console.log('\nNext steps:');
  console.log('  TikTok    → Profile → find post → add sound → change to Public → post');
  console.log('  Instagram → node scripts/post-instagram.js   (when ready to publish)');

  return tiktokId;
}

module.exports = { postSlides };

if (require.main === module) {
  if (!slideDir) {
    console.error('Usage: node post-to-tiktok.js --dir <slides-dir> --caption "..." [--dry-run]');
    process.exit(1);
  }
  postSlides(path.resolve(slideDir), caption)
    .then(id => console.log(`\nDone. TikTok ID: ${id}`))
    .catch(err => {
      const detail = err.response?.data ? JSON.stringify(err.response.data) : err.message;
      console.error('post-to-tiktok.js failed:', detail);
      process.exit(1);
    });
}
