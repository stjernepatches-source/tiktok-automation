'use strict';

const fs = require('fs');
const path = require('path');

const LOG_PATH = path.join(__dirname, '..', 'tiktok-marketing', 'analytics-log.json');

function logPost({ hook, pillar, slideCount, postId }) {
  let log = [];
  try {
    log = JSON.parse(fs.readFileSync(LOG_PATH, 'utf8'));
  } catch {
    log = [];
  }

  log.push({
    post_id: String(postId),
    hook,
    pillar: pillar || 'unknown',
    slide_count: slideCount,
    posted_at: new Date().toISOString(),
    stats_pulled_at: null,
    views: 0,
    likes: 0,
    comments: 0,
    saves: 0,
    new_followers: 0
  });

  fs.writeFileSync(LOG_PATH, JSON.stringify(log, null, 2));
  console.log(`[log-post] Logged post ${postId} to analytics-log.json`);
}

module.exports = { logPost };
