'use strict';

const { createCanvas, loadImage } = require('@napi-rs/canvas');
const { fal } = require('@fal-ai/client');
const axios = require('axios');

const WIDTH = 1080;
const HEIGHT = 1080;

// Wrap text into lines that fit within maxWidth
function wrapText(ctx, text, maxWidth) {
  const words = text.split(' ');
  const lines = [];
  let current = '';

  for (const word of words) {
    const test = current ? `${current} ${word}` : word;
    if (ctx.measureText(test).width > maxWidth && current) {
      lines.push(current);
      current = word;
    } else {
      current = test;
    }
  }
  if (current) lines.push(current);
  return lines;
}

// Draw text with a semi-transparent white shadow band behind it for readability
function drawTextWithBand(ctx, lines, startY, lineHeight, fillColor, bandAlpha = 0.55) {
  const padding = 18;
  const totalHeight = lines.length * lineHeight + padding * 2;

  ctx.save();
  ctx.globalAlpha = bandAlpha;
  ctx.fillStyle = '#FFFFFF';
  ctx.fillRect(0, startY - lineHeight + padding / 2, WIDTH, totalHeight);
  ctx.restore();

  ctx.fillStyle = fillColor;
  lines.forEach((line, i) => {
    ctx.fillText(line, WIDTH / 2, startY + i * lineHeight);
  });
}

async function overlayText(imageUrl, slide) {
  // Download the raw image
  const response = await axios.get(imageUrl, { responseType: 'arraybuffer' });
  const imageBuffer = Buffer.from(response.data);
  const img = await loadImage(imageBuffer);

  const canvas = createCanvas(WIDTH, HEIGHT);
  const ctx = canvas.getContext('2d');

  // Draw base image
  ctx.drawImage(img, 0, 0, WIDTH, HEIGHT);

  ctx.textAlign = 'center';
  ctx.textBaseline = 'alphabetic';

  if (slide.isCover) {
    // Red massive headline at top
    const headline = slide.headline.toUpperCase();
    ctx.font = '900 88px Arial';
    const hLines = wrapText(ctx, headline, 960);
    const hLineH = 100;
    drawTextWithBand(ctx, hLines, 100, hLineH, '#E8000B', 0.65);

    // Black subtext below headline
    if (slide.bodyText) {
      ctx.font = '700 52px Arial';
      const bLines = wrapText(ctx, slide.bodyText, 900);
      const bStartY = 120 + hLines.length * hLineH + 30;
      drawTextWithBand(ctx, bLines, bStartY, 65, '#000000', 0.5);
    }

  } else if (slide.isCTA) {
    // Centered bottom text
    ctx.font = '700 60px Arial';
    const lines = wrapText(ctx, slide.headline, 900);
    drawTextWithBand(ctx, lines, HEIGHT - 140, 72, '#000000', 0.6);

    if (slide.bodyText) {
      ctx.font = '600 48px Arial';
      const bLines = wrapText(ctx, slide.bodyText, 900);
      drawTextWithBand(ctx, bLines, HEIGHT - 60, 56, '#000000', 0.5);
    }

  } else {
    // Content slide: headline top, body bottom
    const headline = slide.headline.toUpperCase();
    ctx.font = '900 72px Arial';
    const hLines = wrapText(ctx, headline, 960);
    drawTextWithBand(ctx, hLines, 90, 85, '#000000', 0.6);

    if (slide.bodyText) {
      ctx.font = '700 52px Arial';
      const bLines = wrapText(ctx, slide.bodyText, 920);
      const bStartY = HEIGHT - 60 - (bLines.length - 1) * 64;
      drawTextWithBand(ctx, bLines, bStartY, 64, '#000000', 0.55);
    }
  }

  // Encode to JPEG buffer
  const jpegBuffer = canvas.toBuffer('image/jpeg');

  // Upload to fal.ai storage to get a public URL
  console.log(`[overlay-text] Uploading final slide: "${slide.headline}"`);
  const file = new File([jpegBuffer], 'slide.jpg', { type: 'image/jpeg' });
  const publicUrl = await fal.storage.upload(file);

  console.log(`[overlay-text] Uploaded: ${publicUrl}`);
  return publicUrl;
}

module.exports = { overlayText };
