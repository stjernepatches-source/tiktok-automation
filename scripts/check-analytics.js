#!/usr/bin/env node
/**
 * check-analytics.js
 * Prints a performance summary from analytics-log.json.
 *
 * Usage:
 *   node scripts/check-analytics.js
 */

const fs = require('fs');
const path = require('path');

const LOG_PATH = path.resolve('tiktok-marketing/analytics-log.json');

function fmt(n) {
  return n?.toLocaleString() ?? '—';
}

function main() {
  if (!fs.existsSync(LOG_PATH)) {
    console.log('No analytics log found yet.');
    return;
  }

  const log = JSON.parse(fs.readFileSync(LOG_PATH, 'utf8'));
  const withStats = log.filter(p => p.views > 0);

  console.log(`\n═══════════════════════════════════════`);
  console.log(`  DAWNCE TIKTOK ANALYTICS`);
  console.log(`  ${log.length} posts total, ${withStats.length} with stats`);
  console.log(`═══════════════════════════════════════\n`);

  if (withStats.length === 0) {
    console.log('No performance data yet. Run update-analytics.js after posting.');
    return;
  }

  // Sort by internal score
  const scored = withStats.map(p => ({
    ...p,
    score: ((p.likes / p.views) * 0.5) + ((p.comments / p.views) * 0.3) + ((p.new_followers / p.views) * 0.2)
  })).sort((a, b) => b.score - a.score);

  console.log('TOP POSTS:');
  scored.slice(0, 5).forEach((p, i) => {
    console.log(`  ${i + 1}. "${p.hook}"`);
    console.log(`     ${fmt(p.views)} views | ${fmt(p.likes)} likes | ${fmt(p.comments)} comments | ${fmt(p.saves)} saves | ${fmt(p.new_followers)} new followers`);
    console.log(`     Score: ${p.score.toFixed(4)} | Pillar: ${p.pillar} | ${p.slide_count} slides`);
    console.log('');
  });

  // Aggregate
  const totalViews = withStats.reduce((s, p) => s + p.views, 0);
  const totalLikes = withStats.reduce((s, p) => s + p.likes, 0);
  const totalFollowers = withStats.reduce((s, p) => s + p.new_followers, 0);

  console.log('TOTALS:');
  console.log(`  Views: ${fmt(totalViews)}`);
  console.log(`  Likes: ${fmt(totalLikes)}`);
  console.log(`  New followers: ${fmt(totalFollowers)}`);
  console.log(`  Avg like rate: ${((totalLikes / totalViews) * 100).toFixed(2)}%\n`);

  // Pillar breakdown
  const pillars = {};
  for (const p of withStats) {
    if (!pillars[p.pillar]) pillars[p.pillar] = { views: 0, likes: 0, count: 0 };
    pillars[p.pillar].views += p.views;
    pillars[p.pillar].likes += p.likes;
    pillars[p.pillar].count += 1;
  }
  console.log('BY PILLAR:');
  Object.entries(pillars).sort((a, b) => (b[1].likes / b[1].views) - (a[1].likes / a[1].views)).forEach(([pillar, d]) => {
    console.log(`  ${pillar}: ${d.count} posts, ${fmt(d.views)} views, ${((d.likes / d.views) * 100).toFixed(2)}% like rate`);
  });
  console.log('');
}

main();
