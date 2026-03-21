'use strict';

const Anthropic = require('@anthropic-ai/sdk');

const ROOT_IMAGE_PROMPT = `Cartoon muscular male character, bright cobalt blue skin and body, round head, simple black dot eyes, small curved smile, dark athletic shorts, bold black outline, flat vector illustration style, clean white background, no gradients, no shading, no shadows, thick outlines, Blue Bro / forzic.bluebro aesthetic. Extremely muscular and jacked physique — massive biceps, defined abs, broad chest. Character must look visually identical to prior slides in this series.`;

const SYSTEM_PROMPT = `You are a TikTok content planner for Dawnce, an alarm app that makes you dance to dismiss it. Account: @dawnce.appp.

TARGET AUDIENCE: 14-24 year old Gen Z males who want to improve their looks and physical appearance (looksmaxxing, glow-up, skin, jawline, body).

BRAND RULES:
- Create a 4-6 slide TikTok photo carousel (1 cover + 2-4 content + 1 CTA)
- Every post delivers real, actionable tips. Dawnce is mentioned ONCE, softly, on one content slide tied to sleep or waking up.
- CTA is ALWAYS: "Download Dawnce on the App Store 📲" — never ask to follow or like
- Headlines: short, bold, max 5-6 words
- Body text: punchy, under 15 words per slide

IMAGE PROMPT STYLE — each slide needs a detailed imagePrompt like:
"Extremely muscular jacked physique, massive arms, one hand raised with single finger tracing along a sharply defined jawline, looking sideways with proud smirk, front-facing upper body, strong angular jaw clearly visible, confidence pose."

CONTENT PILLARS (use one of these exact values for the "pillar" field):
- appearance_hacks
- glow_up
- sleep_skin
- body_fitness

OUTPUT FORMAT — respond with valid JSON only, no markdown, no explanation:
{
  "pillar": "appearance_hacks",
  "caption": "Caption text here 👀\\nDownload Dawnce on the App Store 📲\\n\\n#glowup #looksmaxxing #morningroutine #skincare #GenZ #dawnce #fyp",
  "slides": [
    {
      "isCover": true,
      "isCTA": false,
      "isDawnce": false,
      "headline": "LOOKS = +23%",
      "bodyText": "4 easy hacks",
      "imagePrompt": "Two versions of the character side by side. LEFT: same character but with puffy face, tired droopy eyes, dull skin, slouched posture, labeled Before. RIGHT: sharp defined jawline, hollow cheeks, bright alert eyes, upright confident posture, labeled After. Split composition, equal halves."
    }
  ]
}`;

async function planSlides(hook) {
  const client = new Anthropic({ apiKey: process.env.CLAUDE_API_KEY });

  const message = await client.messages.create({
    model: 'claude-sonnet-4-6',
    max_tokens: 2000,
    messages: [
      {
        role: 'user',
        content: `Create a 4-6 slide TikTok carousel based on this hook: "${hook}"

Respond with valid JSON only. No markdown fences. No extra text.`
      }
    ],
    system: SYSTEM_PROMPT
  });

  const raw = message.content[0].text.trim();
  // Claude sometimes wraps JSON in markdown fences — strip them defensively
  const jsonMatch = raw.match(/\{[\s\S]*\}/);
  const plan = JSON.parse(jsonMatch ? jsonMatch[0] : raw);

  // Validate structure
  if (!plan.slides || !Array.isArray(plan.slides)) {
    throw new Error('Invalid slide plan: missing slides array');
  }
  if (plan.slides.length < 4 || plan.slides.length > 6) {
    throw new Error(`Invalid slide count: ${plan.slides.length} (must be 4-6)`);
  }

  console.log(`[plan-slides] Generated ${plan.slides.length} slides for hook: "${hook}"`);
  return plan;
}

module.exports = { planSlides, ROOT_IMAGE_PROMPT };
