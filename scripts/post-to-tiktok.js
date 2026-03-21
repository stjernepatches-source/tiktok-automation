'use strict';

const axios = require('axios');

const BLOTATO_BASE = 'https://backend.blotato.com/v2';

async function postToTikTok(imageUrls, caption, accountId) {
  const apiKey = process.env.BLOTATO_API_KEY;
  if (!apiKey) throw new Error('BLOTATO_API_KEY not set');

  console.log(`[post-to-tiktok] Posting ${imageUrls.length} slides to TikTok account ${accountId}`);

  const body = {
    post: {
      platformPostData: {
        platform: 'tiktok',
        accountId: String(accountId)
      },
      mediaUrls: imageUrls,
      caption
    }
  };

  let response;
  try {
    response = await axios.post(`${BLOTATO_BASE}/posts`, body, {
      headers: {
        'blotato-api-key': apiKey,
        'Content-Type': 'application/json'
      }
    });
  } catch (err) {
    const detail = err.response ? JSON.stringify(err.response.data) : err.message;
    throw new Error(`Blotato API error: ${detail}`);
  }

  const postId = response.data?.id || response.data?.post_id || response.data?.postId || 'unknown';
  console.log(`[post-to-tiktok] Posted successfully. Post ID: ${postId}`);
  console.log('[post-to-tiktok] Full response:', JSON.stringify(response.data, null, 2));

  return postId;
}

module.exports = { postToTikTok };
