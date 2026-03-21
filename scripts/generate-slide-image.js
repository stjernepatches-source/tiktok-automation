'use strict';

const { fal } = require('@fal-ai/client');
const { ROOT_IMAGE_PROMPT } = require('./plan-slides');

async function generateSlideImage(slide, referenceImageUrl = null) {
  const prompt = `${ROOT_IMAGE_PROMPT} ${slide.imagePrompt}`;

  const input = {
    prompt,
    image_size: 'square_hd',
    num_images: 1,
    output_format: 'jpeg'
  };

  if (referenceImageUrl) {
    input.image_url = referenceImageUrl;
  }

  console.log(`[generate-image] Generating image for slide: "${slide.headline}"`);

  const result = await fal.subscribe('fal-ai/gpt-image-1', {
    input,
    logs: false
  });

  const url = result.data.images[0].url;
  console.log(`[generate-image] Done: ${url}`);
  return url;
}

module.exports = { generateSlideImage };
