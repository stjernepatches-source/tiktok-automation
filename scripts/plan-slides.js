#!/usr/bin/env node
/**
 * plan-slides.js
 * Given a selected hook, generates a 5-slide transformation arc plan.
 * Character visually transforms from 5/10 (slide 1) → 10/10 (slide 5).
 *
 * Usage:
 *   node scripts/plan-slides.js --hook-file tiktok-marketing/research/selected-hook.json
 *                               --output tiktok-marketing/research/slide-plan.json
 */

const fs = require('fs');
const path = require('path');

const args = process.argv.slice(2);
const getArg = (flag, def) => {
  const i = args.indexOf(flag);
  return i !== -1 ? args[i + 1] : def;
};

const hookFile = getArg('--hook-file', 'tiktok-marketing/research/selected-hook.json');
const outputFile = getArg('--output', 'tiktok-marketing/research/slide-plan.json');

// ─── Transformation arc ────────────────────────────────────────────────────────
// Goku power-level arc: drained/low → Super Saiyan.
// Maps perfectly onto the sleep → morning routine → peak performance narrative.
// characterAction: human-readable (logging only)
// image_prompt: physical/energy state sent to fal.ai — ROOT_PROMPT handles the character identity.

const STAGES = [
  {
    characterAction: 'Goku at rock bottom — completely drained, low power level, can barely keep eyes open.',
    image_prompt:    'exhausted and completely drained, heavy drooping eyelids half-closed, slouched posture, disheveled gi, low energy, defeated expression, dark circles under eyes'
  },
  {
    characterAction: 'Goku barely waking up — groggy, eyes starting to open, slightly straighter.',
    image_prompt:    'groggy and half-awake, eyes starting to open slightly, posture marginally straighter, still tired but stirring, dazed expression'
  },
  {
    characterAction: 'Goku alert and focused — normal rested energy, standing upright, clear eyes.',
    image_prompt:    'alert and awake, standing upright with good posture, focused determined expression, clear bright eyes, rested and ready'
  },
  {
    characterAction: 'Goku powering up — ki energy building, confident fighting stance, beginning to glow.',
    image_prompt:    'powering up with ki energy building, confident fighting stance, intense determined expression, starting to glow with energy, highly energized'
  },
  {
    characterAction: 'Goku Super Saiyan — golden spiky hair, full golden aura, peak power level, iconic pose.',
    image_prompt:    'Super Saiyan transformation, golden spiky hair, glowing golden aura surrounding body, peak power level, triumphant expression, iconic power stance, full power unleashed'
  }
];

// ─── Content templates by pillar ──────────────────────────────────────────────

function buildSlidePlan(hook) {
  const h = hook.hook || hook;
  const format = hook.format || 'story';

  const hLower = h.toLowerCase();
  let pillar = 'glow_up';
  if (hLower.includes('sleep') || hLower.includes('alarm') || hLower.includes('snooze') || hLower.includes('morning') || hLower.includes('tired') || hLower.includes('wake')) {
    pillar = 'sleep_cortisol';
  } else if (hLower.includes('skin') || hLower.includes('puff') || hLower.includes('face') || hLower.includes('jaw') || hLower.includes('define')) {
    pillar = 'skin_face';
  } else if (hLower.includes('glow') || hLower.includes('routine') || hLower.includes('summer')) {
    pillar = 'glow_up';
  }

  const slidePlans = {
    sleep_cortisol: {
      slides: [
        { index: 1, type: 'cover',   headline: h, accentPhrase: 'TIRED', subtext: 'this changed everything', ...STAGES[0], pose: 'standing hunched, both hands pressed to face, eyes drooping, exhausted posture',                                               dawnce: false },
        { index: 2, type: 'content', headline: 'Bad sleep = cortisol spikes',   body: '• Under 7hrs = cortisol spike\n• Cortisol = puffiness + dull skin\n• Your face shows it every morning',                                         ...STAGES[1], pose: 'holding head with both hands, wincing, bags under eyes visible',                                                  dawnce: false },
        { index: 3, type: 'content', headline: 'Snoozing makes it worse',        body: '• Each snooze cuts a sleep cycle short\n• Cortisol spikes again every time\n• You wake up worse than before',                                  ...STAGES[2], pose: 'reaching one arm forward pressing a snooze button on a large phone, squinting one eye open sleepily',             dawnce: false },
        { index: 4, type: 'content', headline: 'What actually fixed it',         body: '• Dance to dismiss = you actually get up\n• Cortisol drops, face sharpens\n• Dawnce makes it automatic',                                       ...STAGES[3], pose: 'holding a smartphone with a colourful dance app on screen, doing a small hip-shake dance move, big smile',       dawnce: true  },
        { index: 5, type: 'cta',     headline: 'Download Dawnce',                body: 'Available on the App Store',                                                                                                                    ...STAGES[4], pose: 'power pose, both fists raised triumphantly above head, huge confident grin',                                    dawnce: true  }
      ],
      caption: `${h} 👀 Bad sleep was destroying my face. Fixing my morning routine changed everything.\nDownload Dawnce on the App Store 📲\n\n#glowup #looksmaxxing #morningroutine #skincare #cortisol #dawnce #fyp`
    },

    skin_face: {
      slides: [
        { index: 1, type: 'cover',   headline: h, accentPhrase: 'PUFFY', subtext: 'my actual results',  ...STAGES[0], pose: 'touching cheeks with both hands, frowning at puffy bloated face, looking in an imaginary mirror',                                      dawnce: false },
        { index: 2, type: 'content', headline: 'The root cause',               body: '• Bad sleep = high cortisol\n• Cortisol = face inflammation\n• Puffiness, acne, dull skin — same cause',                                        ...STAGES[1], pose: 'pointing at own face with one finger, indicating puffiness and acne',                                             dawnce: false },
        { index: 3, type: 'content', headline: 'Sodium + dehydration',         body: '• Sodium holds water in your face\n• Drink 3L a day, cut processed food\n• Face deflates within 3 days',                                        ...STAGES[2], pose: 'holding a large water bottle in one hand, other hand giving a thumbs up',                                        dawnce: false },
        { index: 4, type: 'content', headline: 'Sleep quality is the unlock',  body: '• Deep sleep repairs skin overnight\n• Snoozing kills sleep quality\n• Dawnce: dance to dismiss, zero snooze',                                  ...STAGES[3], pose: 'holding a smartphone, mid-dance move to dismiss alarm, bright alert eyes',                                     dawnce: true  },
        { index: 5, type: 'cta',     headline: 'Download Dawnce',              body: 'Available on the App Store',                                                                                                                      ...STAGES[4], pose: 'power pose, both fists raised triumphantly above head, huge confident grin',                                  dawnce: true  }
      ],
      caption: `${h} 👀 Real changes, real results. Consistency is everything.\nDownload Dawnce on the App Store 📲\n\n#glowup #looksmaxxing #skincare #jawline #dawnce #fyp`
    },

    glow_up: {
      slides: [
        { index: 1, type: 'cover',   headline: h, accentPhrase: 'GLOW', subtext: 'step by step',         ...STAGES[0], pose: 'standing arms at sides looking tired and sluggish, heavy droopy eyes, slouched',                                                       dawnce: false },
        { index: 2, type: 'content', headline: 'Hydrate from the start',        body: '• 500ml water before coffee\n• Flushes overnight cortisol\n• Skin tone improves within days',                                                   ...STAGES[1], pose: 'holding a large clear glass of water in one hand, raising it as if about to drink, slight smile',              dawnce: false },
        { index: 3, type: 'content', headline: 'Cold water on your face',       body: '• Tightens pores instantly\n• Drains overnight puffiness\n• Hot water destroys skin texture',                                                  ...STAGES[2], pose: 'hands cupped in front holding imaginary water, leaning slightly forward, eyes wide and alert',                dawnce: false },
        { index: 4, type: 'content', headline: 'Get up on time, every time',    body: '• Consistent wake time = stable cortisol\n• Dawnce: dance to dismiss alarm\n• Zero snooze, face stays sharp',                                  ...STAGES[3], pose: 'holding a smartphone showing an alarm screen, doing an energised arm pump celebration',                       dawnce: true  },
        { index: 5, type: 'cta',     headline: 'Download Dawnce',               body: 'Available on the App Store',                                                                                                                     ...STAGES[4], pose: 'power pose, both fists raised triumphantly above head, huge confident grin',                                 dawnce: true  }
      ],
      caption: `${h} 👀 These habits compounded fast. Start with just one.\nDownload Dawnce on the App Store 📲\n\n#glowup #looksmaxxing #morningroutine #skincare #GenZ #dawnce #fyp`
    }
  };

  const plan = slidePlans[pillar] || slidePlans['glow_up'];

  return {
    hook: h,
    pillar,
    format,
    slide_count: plan.slides.length,
    slides: plan.slides,
    caption: plan.caption,
    created_at: new Date().toISOString()
  };
}

function main() {
  const hookPath = path.resolve(hookFile);
  if (!fs.existsSync(hookPath)) {
    console.error(`Hook file not found: ${hookPath}`);
    process.exit(1);
  }

  const hook = JSON.parse(fs.readFileSync(hookPath, 'utf8'));
  const plan = buildSlidePlan(hook);

  const outPath = path.resolve(outputFile);
  fs.mkdirSync(path.dirname(outPath), { recursive: true });
  fs.writeFileSync(outPath, JSON.stringify(plan, null, 2));

  console.log(`Slide plan created: ${plan.slide_count} slides`);
  console.log(`  Hook: "${plan.hook}"`);
  console.log(`  Pillar: ${plan.pillar}`);
  plan.slides.forEach(s => console.log(`  Slide ${s.index}: [${s.type}] ${s.headline || ''}`));
  console.log(`Saved to: ${outPath}`);
}

main();

module.exports = { buildSlidePlan };
