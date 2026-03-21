'use strict';

const { fal } = require('@fal-ai/client');
const { ROOT_IMAGE_PROMPT } = require('./plan-slides');

async function generateSlideImage(slide, referenceImageUrl = null) {
  const prompt = `${ROOT_IMAGE_PROMPT} ${slide.imagePrompt}`;

  console.log(`[generate-image] Generating image for slide: "${slide.headline}"`);

  let result;

  if (!referenceImageUrl) {
    // Slide 1: text-to-image
    result = await fal.subscribe('fal-ai/gpt-image-1.5', {
      input: {
        prompt,
        image_size: 'square_hd',
        num_images: 1,
        output_format: 'jpeg'
      },
      logs: false
    });
  } else {
    // Slides 2-N: image-to-image edit — pass slide 1 as visual reference
    result = await fal.subscribe('fal-ai/gpt-image-1.5/edit', {
      input: {
        prompt,
        image_urls: [referenceImageUrl],
        image_size: 'square_hd',
        num_images: 1,
        output_format: 'jpeg',
        input_fidelity: 'high'
      },
      logs: false
    });
  }

  const url = result.data.images[0].url;
  console.log(`[generate-image] Done: ${url}`);
  return url;
}

module.exports = { generateSlideImage };
