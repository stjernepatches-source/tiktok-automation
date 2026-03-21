#!/bin/bash
# Installs the Dawnce TikTok automation cron job (3x daily: 9AM, 1PM, 6PM)

CRON_LINE="0 9,13,18 * * * cd ~/.openclaw/workspace && node skills/larry/scripts/tiktok-cron.js >> ~/.openclaw/workspace/logs/tiktok-cron.log 2>&1"

# Ensure log directory exists
mkdir -p ~/.openclaw/workspace/logs

# Check if already installed
if crontab -l 2>/dev/null | grep -q "tiktok-cron.js"; then
  echo "Cron job already installed."
  crontab -l | grep tiktok-cron
  exit 0
fi

# Add to crontab
(crontab -l 2>/dev/null; echo "$CRON_LINE") | crontab -
echo "Cron job installed: 3x daily at 9AM, 1PM, 6PM"
crontab -l | grep tiktok-cron
