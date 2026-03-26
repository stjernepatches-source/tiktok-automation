#!/usr/bin/env node
/**
 * post-instagram.js
 * Publishes the saved Instagram draft (tiktok-marketing/instagram-draft.json)
 * to Instagram via Blotato. Run this manually when you're ready to go live.
 *
 * Usage:
 *   node scripts/post-instagram.js
 */

const fs   = require('fs');
const path = require('path');
const axios = require('axios');

const DRAFT_PATH  = path.resolve('tiktok-marketing/instagram-draft.json');
const CONFIG_PATH = path.resolve('tiktok-marketing/config.json');

if (!fs.existsSync(DRAFT_PATH)) {
  console.error('No Instagram draft found. Run the pipeline first.');
  process.exit(1);
}

const draft  = JSON.parse(fs.readFileSync(DRAFT_PATH, 'utf8'));
const config = JSON.parse(fs.readFileSync(CONFIG_PATH, 'utf8'));

console.log(`\nPosting Instagram draft to @dawnce.app`);
console.log(`  Slides: ${draft.mediaUrls.length}`);
console.log(`  Saved:  ${draft.savedAt}`);

axios.post('https://backend.blotato.com/v2/posts', {
  post: {
    accountId: draft.accountId,
    content: { text: draft.caption, mediaUrls: draft.mediaUrls, platform: 'instagram' },
    target:  { targetType: 'instagram' }
  }
}, {
  headers: { 'Content-Type': 'application/json', 'blotato-api-key': config.blotato_api_key },
  timeout: 30000
})
.then(res => {
  const id = res.data?.postSubmissionId || res.data?.id || JSON.stringify(res.data);
  console.log(`  ✓ Posted! Submission ID: ${id}`);
  // Remove draft so it doesn't get double-posted
  fs.unlinkSync(DRAFT_PATH);
  console.log('  Draft file removed.');
})
.catch(err => {
  const detail = err.response?.data ? JSON.stringify(err.response.data) : err.message;
  console.error('post-instagram.js failed:', detail);
  process.exit(1);
});
