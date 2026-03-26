#!/usr/bin/env node
/**
 * generate-slide-image.js
 *
 * Flow:
 *   generateSlideImage(slide) — generates one image per slide.
 *   - If config.character_lora_url is set: uses fal-ai/flux-lora with trained LoRA weights
 *     for guaranteed character consistency. Trigger word prepended to prompt.
 *   - Otherwise: falls back to fal-ai/flux/schnell with tight ROOT_PROMPT negations.
 *
 * Train a LoRA first with: node scripts/train-character-lora.js
 */

const fs = require('fs');
const path = require('path');
const https = require('https');
const http = require('http');

const CONFIG_PATH = path.resolve('tiktok-marketing/config.json');

function loadConfig() {
  const cfg = JSON.parse(fs.readFileSync(CONFIG_PATH, 'utf8'));
  if (!cfg.fal_api_key) throw new Error('fal_api_key missing in tiktok-marketing/config.json');
  return cfg;
}

// ─── Root prompt: STYLE ONLY ─────────────────────────────────────────────────
// Physical state lives entirely in each slide's image_prompt field.
// When LoRA is trained, trigger word (GOKU) is prepended and model switches to flux-lora.
// Fallback prompt describes Goku's signature appearance for pre-LoRA runs.
const ROOT_PROMPT =
  'anime illustration of Goku from Dragon Ball Z, ' +
  'orange martial arts gi, blue undershirt, blue wristbands, ' +
  'spiky black hair, same face and hairstyle in every slide, ' +
  'bold black outline, flat clean anime colors, ' +
  'NO photorealism, NO 3D rendering, NO gradients, NO blur, ' +
  'clean white background, full body visible, ' +
  'front-facing view, facing the camera, adult male character';

// ─── Per-slide image generation ───────────────────────────────────────────────
// Uses fal-ai/flux-lora when a trained character LoRA is present in config
// (character_lora_url + character_trigger_word), falling back to fal-ai/flux/schnell.
// flux/dev is permanently banned — it drifts to blurry 3D photorealism.
async function generateSlideImage(slide) {
  const { createFalClient } = require('@fal-ai/client');
  const config = loadConfig();
  const fal = createFalClient({ credentials: config.fal_api_key });

  const physicalDesc = slide.image_prompt || slide.characterAction || '';
  const poseDesc     = slide.pose || '';
  const basePrompt   = `${ROOT_PROMPT}, ${physicalDesc}${poseDesc ? ', ' + poseDesc : ''}`;

  console.log(`  Generating image for slide ${slide.index}: ${slide.type}`);

  let result;
  if (config.character_lora_url) {
    const triggerWord = config.character_trigger_word || 'GOKU';
    const prompt = `${triggerWord}, ${basePrompt}`;
    console.log(`  Model: flux-lora (LoRA active, trigger: ${triggerWord})`);
    console.log(`  Prompt: ${prompt.slice(0, 120)}...`);
    result = await fal.subscribe('fal-ai/flux-lora', {
      input: {
        prompt,
        loras: [{ path: config.character_lora_url, scale: 0.85 }],
        image_size: 'square_hd',
        num_images: 1,
        num_inference_steps: 28,
        guidance_scale: 3.5,
      }
    });
  } else {
    console.log(`  Model: flux/schnell (no LoRA trained yet)`);
    console.log(`  Prompt: ${basePrompt.slice(0, 120)}...`);
    result = await fal.subscribe('fal-ai/flux/schnell', {
      input: { prompt: basePrompt, image_size: 'square_hd', num_images: 1 }
    });
  }

  const url = result.data?.images?.[0]?.url || result.images?.[0]?.url;
  if (!url) throw new Error(`fal.ai returned no image URL. Response: ${JSON.stringify(result).slice(0, 200)}`);
  return url;
}

// ─── Download helper ──────────────────────────────────────────────────────────
async function downloadImage(url, destPath) {
  return new Promise((resolve, reject) => {
    const proto = url.startsWith('https') ? https : http;
    const file = fs.createWriteStream(destPath);
    proto.get(url, res => {
      res.pipe(file);
      file.on('finish', () => { file.close(); resolve(destPath); });
    }).on('error', err => {
      fs.unlink(destPath, () => {});
      reject(err);
    });
  });
}

module.exports = { generateSlideImage, downloadImage, ROOT_PROMPT };

if (require.main === module) {
  if (process.argv.includes('--test')) {
    (async () => {
      const testSlide = {
        index: 1, type: 'cover',
        image_prompt: 'overweight body, visible belly, bloated puffy face, tired drooping eyes',
        pose: 'standing arms at sides, looking tired'
      };
      const url = await generateSlideImage(testSlide);
      const outDir = path.resolve('tiktok-marketing/posts/test-run');
      fs.mkdirSync(outDir, { recursive: true });
      await downloadImage(url, path.join(outDir, 'test-slide.jpg'));
      console.log('Test complete.');
    })().catch(e => { console.error(e.message); process.exit(1); });
  }
}
