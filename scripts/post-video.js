#!/usr/bin/env node
/**
 * post-video.js
 * Uploads video.mp4 to fal.ai storage, then posts to:
 *   - Instagram as a Reel (live immediately — add music in IG app after)
 *   - YouTube as a private Short (draft — change to Public in YouTube Studio when ready)
 *
 * Usage:
 *   node scripts/post-video.js \
 *     --video tiktok-marketing/posts/<name>/video.mp4 \
 *     --title "The snooze button is destroying your face" \
 *     [--dry-run]
 */

const fs    = require('fs');
const path  = require('path');
const axios = require('axios');

const args     = process.argv.slice(2);
const getArg   = (flag, def) => { const i = args.indexOf(flag); return i !== -1 ? args[i + 1] : def; };
const hasFlag  = flag => args.includes(flag);

const videoPath = getArg('--video', null);
const title     = getArg('--title', '');
const dryRun    = hasFlag('--dry-run');

const CONFIG_PATH = path.resolve('tiktok-marketing/config.json');

function loadConfig() {
  return JSON.parse(fs.readFileSync(CONFIG_PATH, 'utf8'));
}

async function uploadToFalStorage(filePath, falClient) {
  const buf  = fs.readFileSync(filePath);
  const blob = new Blob([buf], { type: 'video/mp4' });
  return await falClient.storage.upload(blob);
}

async function blotatoPost(payload, config) {
  const res = await axios.post('https://backend.blotato.com/v2/posts', { post: payload }, {
    headers: { 'Content-Type': 'application/json', 'blotato-api-key': config.blotato_api_key },
    timeout: 60000
  });
  return res.data?.postSubmissionId || JSON.stringify(res.data);
}

function igCaption(title) {
  return `${title}\n\n#glowup #looksmaxxing #morningroutine #skincare #dawnce`;
}

async function postReel(videoUrl, title, config) {
  return blotatoPost({
    accountId: parseInt(config.instagram_account_id, 10),
    content: { text: igCaption(title), mediaUrls: [videoUrl], platform: 'instagram' },
    target:  { targetType: 'instagram' }
  }, config);
}

async function postYouTubeShort(videoUrl, title, config) {
  // privacyStatus: 'private' = draft in YouTube Studio
  // Add #Shorts to title so YouTube algorithm recognises it as a Short
  return blotatoPost({
    accountId: parseInt(config.youtube_account_id, 10),
    content:   { text: '', mediaUrls: [videoUrl], platform: 'youtube' },
    target:    {
      targetType:              'youtube',
      title:                   `${title} #Shorts`,
      privacyStatus:           'private',
      shouldNotifySubscribers: false
    }
  }, config);
}

async function postVideo(videoFilePath, title) {
  const config = loadConfig();

  if (!fs.existsSync(videoFilePath)) {
    throw new Error(`Video not found: ${videoFilePath}`);
  }

  const sizeMB = (fs.statSync(videoFilePath).size / 1024 / 1024).toFixed(1);
  console.log(`\nPosting video to Instagram Reel + YouTube Short`);
  console.log(`  File:  ${path.basename(videoFilePath)}  (${sizeMB} MB)`);
  console.log(`  Title: ${title}\n`);

  if (dryRun) {
    console.log('[DRY RUN] Would upload and post video');
    return;
  }

  // Upload to fal.ai storage
  const { createFalClient } = require('@fal-ai/client');
  const fal = createFalClient({ credentials: config.fal_api_key });
  process.stdout.write('  Uploading video to fal.ai storage... ');
  const videoUrl = await uploadToFalStorage(videoFilePath, fal);
  console.log('done');
  console.log(`  URL: ${videoUrl}`);

  // Post to Instagram Reel
  console.log('\nPosting Instagram Reel...');
  const igId = await postReel(videoUrl, title, config);
  console.log(`  ✓ Instagram Reel ID: ${igId}`);
  console.log('  → Open Instagram app → find the Reel → Edit → add music');

  // Post to YouTube Short (private/draft)
  console.log('\nPosting YouTube Short (private draft)...');
  const ytId = await postYouTubeShort(videoUrl, title, config);
  console.log(`  ✓ YouTube Short ID: ${ytId}`);
  console.log('  → YouTube Studio → Content → find video → change to Public when ready');

  console.log('\nDone.');
}

module.exports = { postVideo };

if (require.main === module) {
  if (!videoPath || !title) {
    console.error('Usage: node post-video.js --video <path> --title "..." [--dry-run]');
    process.exit(1);
  }
  postVideo(path.resolve(videoPath), title)
    .catch(err => {
      const detail = err.response?.data ? JSON.stringify(err.response.data) : err.message;
      console.error('post-video.js failed:', detail);
      process.exit(1);
    });
}
