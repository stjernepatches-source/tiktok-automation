#!/usr/bin/env node
/**
 * train-character-lora.js
 * Trains a Flux LoRA on fal.ai from character reference images.
 * Saves the resulting weights URL to tiktok-marketing/config.json so the
 * generation pipeline automatically picks it up.
 *
 * Usage:
 *   node scripts/train-character-lora.js
 *   node scripts/train-character-lora.js --images tiktok-marketing/character-training
 *   node scripts/train-character-lora.js --trigger BLUEBRO --steps 1000
 *
 * Recommended: 20-50 reference images (JPG/PNG), all showing the character
 * in the desired flat vector cartoon style. More variety in pose = better generalization.
 */

const fs   = require('fs');
const path = require('path');
const { execSync } = require('child_process');

const args   = process.argv.slice(2);
const getArg = (flag, def) => { const i = args.indexOf(flag); return i !== -1 ? args[i + 1] : def; };

const imagesDir   = path.resolve(getArg('--images', 'tiktok-marketing/character-training'));
const triggerWord = getArg('--trigger', 'GOKU');
const steps       = parseInt(getArg('--steps', '1000'), 10);
const loraRank    = parseInt(getArg('--rank',  '16'),   10);
const CONFIG_PATH = path.resolve('tiktok-marketing/config.json');
const ZIP_PATH    = path.resolve('tiktok-marketing/character-training.zip');

function log(msg) { console.log(`[${new Date().toISOString()}] ${msg}`); }

async function main() {
  // ── 0. Config ──────────────────────────────────────────────────────────────
  if (!fs.existsSync(CONFIG_PATH)) {
    console.error(`Config not found: ${CONFIG_PATH}`);
    process.exit(1);
  }
  const cfg = JSON.parse(fs.readFileSync(CONFIG_PATH, 'utf8'));
  if (!cfg.fal_api_key) {
    console.error('fal_api_key missing in config.json');
    process.exit(1);
  }

  const { createFalClient } = require('@fal-ai/client');
  const fal = createFalClient({ credentials: cfg.fal_api_key });

  // ── 1. Find images ─────────────────────────────────────────────────────────
  if (!fs.existsSync(imagesDir)) {
    console.error(`\nImages directory not found: ${imagesDir}`);
    console.log(`\nCreate it and add your character reference images:`);
    console.log(`  mkdir -p "${imagesDir}"`);
    console.log(`  # Then copy your JPG/PNG character images into that folder\n`);
    process.exit(1);
  }

  const images = fs.readdirSync(imagesDir)
    .filter(f => /\.(jpg|jpeg|png|webp)$/i.test(f))
    .map(f => path.join(imagesDir, f));

  if (images.length < 5) {
    console.error(`\nOnly ${images.length} images found in ${imagesDir}.`);
    console.log('Need at least 5. Recommended: 20-50 images for a well-trained character.\n');
    process.exit(1);
  }

  log(`Found ${images.length} training images in ${imagesDir}`);
  images.forEach(p => console.log(`  ${path.basename(p)}`));

  // ── 2. Create ZIP ──────────────────────────────────────────────────────────
  log('Creating ZIP of training images...');
  if (fs.existsSync(ZIP_PATH)) fs.unlinkSync(ZIP_PATH);
  const quotedPaths = images.map(p => `"${p}"`).join(' ');
  execSync(`zip -j "${ZIP_PATH}" ${quotedPaths}`, { stdio: 'inherit' });
  const zipSizeMB = (fs.statSync(ZIP_PATH).size / 1024 / 1024).toFixed(1);
  log(`  ZIP ready: ${ZIP_PATH} (${zipSizeMB} MB)`);

  // ── 3. Upload ZIP to fal.ai storage ───────────────────────────────────────
  log('Uploading to fal.ai storage...');
  const zipBuffer = fs.readFileSync(ZIP_PATH);
  const zipBlob   = new Blob([zipBuffer], { type: 'application/zip' });
  const zipUrl    = await fal.storage.upload(zipBlob);
  log(`  Uploaded: ${zipUrl}`);

  // ── 4. Submit training job ─────────────────────────────────────────────────
  log(`\nStarting LoRA training:`);
  log(`  Trigger word : ${triggerWord}`);
  log(`  Steps        : ${steps}`);
  log(`  LoRA rank    : ${loraRank}`);
  log(`  Images       : ${images.length}`);
  log(`\n  This takes 10-20 minutes. Streaming logs below...\n`);

  const result = await fal.subscribe('fal-ai/flux-lora-fast-training', {
    input: {
      images_data_url:      zipUrl,
      trigger_word:         triggerWord,
      steps,
      lora_rank:            loraRank,
      optimizer:            'adamw8bit',
      batch_size:           1,
      resolution:           '512,768,1024',
      caption_dropout_rate: 0.05,
      learning_rate:        0.0002,
    },
    logs: true,
    onQueueUpdate: update => {
      if (update.status === 'IN_PROGRESS') {
        const last = update.logs?.[update.logs.length - 1]?.message;
        if (last) process.stdout.write(`\r  ${last.slice(0, 100).padEnd(100)}`);
      }
    }
  });

  process.stdout.write('\n');

  // ── 5. Save LoRA URL to config ────────────────────────────────────────────
  const loraUrl = result.data?.diffusers_lora_file?.url || result.diffusers_lora_file?.url;
  if (!loraUrl) {
    console.error('\nTraining completed but no LoRA file found in result:');
    console.error(JSON.stringify(result, null, 2).slice(0, 400));
    process.exit(1);
  }

  log('\n✓ Training complete!');
  log(`  LoRA weights : ${loraUrl}`);

  const updatedCfg = {
    ...cfg,
    character_lora_url:      loraUrl,
    character_trigger_word:  triggerWord,
    character_lora_trained:  new Date().toISOString(),
    character_training_images: images.length,
  };
  fs.writeFileSync(CONFIG_PATH, JSON.stringify(updatedCfg, null, 2));
  log(`  Saved to config.json`);

  // ── 6. Clean up ZIP ────────────────────────────────────────────────────────
  fs.unlinkSync(ZIP_PATH);

  console.log(`
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  LoRA training complete.

  Trigger word: ${triggerWord}
  Weights URL:  ${loraUrl}

  The pipeline will now use your trained character
  in every generated slide. Run a test with:

    node scripts/tiktok-cron.js --dry-run --mock
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
`);
}

main().catch(err => {
  console.error('\nTraining failed:', err.message);
  console.error(err.stack);
  process.exit(1);
});
