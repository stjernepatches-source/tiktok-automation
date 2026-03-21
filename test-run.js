'use strict';

const path = require('path');
const fs = require('fs');
const { fal } = require('@fal-ai/client');
const { run } = require('./scripts/tiktok-cron');

// Load config
const configPath = path.join(__dirname, 'tiktok-marketing', 'config.json');
if (!fs.existsSync(configPath)) {
  console.error('Missing tiktok-marketing/config.json — copy the template and fill in your API keys.');
  process.exit(1);
}

const config = JSON.parse(fs.readFileSync(configPath, 'utf8'));

const PLACEHOLDERS = ['YOUR_FAL_API_KEY', 'YOUR_BLOTATO_API_KEY', 'YOUR_CLAUDE_API_KEY'];
for (const key of ['falApiKey', 'blotatoApiKey', 'claudeApiKey']) {
  if (PLACEHOLDERS.includes(config[key])) {
    console.error(`config.json: "${key}" still has placeholder value. Fill in your real API key.`);
    process.exit(1);
  }
}

// Set env vars from config
process.env.FAL_KEY = config.falApiKey;
process.env.BLOTATO_API_KEY = config.blotatoApiKey;
process.env.CLAUDE_API_KEY = config.claudeApiKey;
process.env.TIKTOK_ACCOUNT_ID = config.tiktokAccountId;

// Configure fal.ai client
fal.config({ credentials: config.falApiKey });

// Parse hook from CLI args, or use default
const args = process.argv.slice(2);
const hookIdx = args.indexOf('--hook');
const hook = hookIdx !== -1
  ? args[hookIdx + 1]
  : '5 things making you look worse (fix these)';

console.log(`Starting test run with hook: "${hook}"\n`);

run(hook).catch(err => {
  console.error('\nTest run failed:', err.message);
  if (err.stack) console.error(err.stack);
  process.exit(1);
});
