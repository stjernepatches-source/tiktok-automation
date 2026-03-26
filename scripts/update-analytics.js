#!/usr/bin/env node
/**
 * update-analytics.js
 * Pulls TikTok stats for posts published N days ago via Blotato API.
 *
 * Usage:
 *   node scripts/update-analytics.js --days-ago 2
 */

const fs = require('fs');
const path = require('path');
const axios = require('axios');

const args = process.argv.slice(2);
const getArg = (flag, def) => {
  const i = args.indexOf(flag);
  return i !== -1 ? args[i + 1] : def;
};
const hasFlag = flag => args.includes(flag);

const daysAgo = parseInt(getArg('--days-ago', '2'), 10);
const dryRun = hasFlag('--dry-run');
const CONFIG_PATH = path.resolve('tiktok-marketing/config.json');
const LOG_PATH = path.resolve('tiktok-marketing/analytics-log.json');

function loadConfig() {
  return JSON.parse(fs.readFileSync(CONFIG_PATH, 'utf8'));
}

async function fetchStats(postId, config) {
  const res = await axios.get(`https://backend.blotato.com/v2/posts/${postId}`, {
    headers: { 'blotato-api-key': config.blotato_api_key },
    timeout: 15000
  });
  return res.data?.analytics || res.data;
}

async function main() {
  const config = loadConfig();
  const log = JSON.parse(fs.readFileSync(LOG_PATH, 'utf8'));

  const cutoff = new Date();
  cutoff.setDate(cutoff.getDate() - daysAgo);

  const toUpdate = log.filter(p => {
    if (p.stats_pulled_at) return false; // already pulled
    const posted = new Date(p.posted_at);
    return posted <= cutoff;
  });

  if (toUpdate.length === 0) {
    console.log('No posts need analytics updates.');
    return;
  }

  console.log(`Updating stats for ${toUpdate.length} post(s)...`);

  for (const post of toUpdate) {
    if (dryRun || !config.blotato_api_key) {
      console.log(`[DRY RUN] Would fetch stats for post: ${post.post_id}`);
      continue;
    }

    try {
      const stats = await fetchStats(post.post_id, config);
      post.views = stats.views ?? post.views;
      post.likes = stats.likes ?? post.likes;
      post.comments = stats.comments ?? post.comments;
      post.saves = stats.saves ?? post.saves;
      post.new_followers = stats.new_followers ?? post.new_followers;
      post.stats_pulled_at = new Date().toISOString();

      console.log(`  Updated: "${post.hook}" — ${post.views.toLocaleString()} views, ${post.likes.toLocaleString()} likes`);
    } catch (err) {
      console.warn(`  Failed to update ${post.post_id}: ${err.message}`);
    }
  }

  fs.writeFileSync(LOG_PATH, JSON.stringify(log, null, 2));
  console.log('Analytics log updated.');
}

main().catch(err => {
  console.error('update-analytics.js failed:', err.message);
  process.exit(1);
});
