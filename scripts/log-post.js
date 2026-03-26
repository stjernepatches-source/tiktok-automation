#!/usr/bin/env node
/**
 * log-post.js
 * Appends a new post entry to analytics-log.json.
 *
 * Usage:
 *   node scripts/log-post.js --hook "Looks +23%" --pillar "appearance_hacks" --post-id <id> --slide-count 5
 */

const fs = require('fs');
const path = require('path');

const args = process.argv.slice(2);
const getArg = (flag, def) => {
  const i = args.indexOf(flag);
  return i !== -1 ? args[i + 1] : def;
};

const hook = getArg('--hook', '');
const pillar = getArg('--pillar', 'unknown');
const postId = getArg('--post-id', '');
const slideCount = parseInt(getArg('--slide-count', '5'), 10);
const LOG_PATH = path.resolve('tiktok-marketing/analytics-log.json');

function main() {
  const log = fs.existsSync(LOG_PATH)
    ? JSON.parse(fs.readFileSync(LOG_PATH, 'utf8'))
    : [];

  const entry = {
    post_id: postId,
    hook,
    pillar,
    slide_count: slideCount,
    posted_at: new Date().toISOString(),
    stats_pulled_at: null,
    views: 0,
    likes: 0,
    comments: 0,
    saves: 0,
    new_followers: 0
  };

  log.push(entry);
  fs.writeFileSync(LOG_PATH, JSON.stringify(log, null, 2));

  console.log(`Logged post: "${hook}" (${postId})`);
  console.log(`Total posts in log: ${log.length}`);
}

main();

module.exports = { logPost: (data) => {
  const log = fs.existsSync(LOG_PATH)
    ? JSON.parse(fs.readFileSync(LOG_PATH, 'utf8'))
    : [];
  log.push({ ...data, posted_at: new Date().toISOString(), stats_pulled_at: null, views: 0, likes: 0, comments: 0, saves: 0, new_followers: 0 });
  fs.writeFileSync(LOG_PATH, JSON.stringify(log, null, 2));
}};
