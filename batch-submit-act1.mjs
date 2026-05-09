#!/usr/bin/env node
/**
 * ACT 1 Batch Generator — reads all .txt prompt files,
 * maps reference images per beat, and submits each to 4 PixVerse models.
 * 
 * Usage: node batch-submit-act1.mjs [--dry-run] [promptDir]
 * 
 * Models (per beat = 4 generations):
 *   1. gemini-3.1-flash @ 2160p (Nano Banana 4K #A)
 *   2. gemini-3.1-flash @ 2160p (Nano Banana 4K #B)
 *   3. gemini-3.0 @ 1440p (Nano Banana Pro 2K)
 *   4. gpt-image-2.0 @ 1440p medium (GPT-2 2K Medium)
 * 
 * Total: 80 beats × 4 = 320 generations
 */

import fs from 'fs';
import path from 'path';
import { spawnSync } from 'child_process';

const REF = '/Users/vaquita/Downloads/aisha/Scenes (Locations) visual references/ACT 1/01 Aisha Room and Balcony/references';

// ═══════════════════════════════════════════════════════════════
// IMAGE MAPPING: beat prefix → array of reference image filenames
// Max 7 images per submission (PixVerse limit)
// ═══════════════════════════════════════════════════════════════

const IMG = {
  // ── PART 1: City Gate & Altair ──
  'beat-01': ['beduin merchant full size.png', 'funny camel.png', 'clerk and his stand ref.png', 'guards.jpeg', 'caravans aprpaching the gate form the dunes towards the gates.png', 'Line of merchants towards stand with clerk and permits.png', 'close up on the unstamped permit.png'],
  'beat-02': ['beduin merchant full size.png', 'funny camel.png', 'clerk and his stand ref.png', 'Line of merchants towards stand with clerk and permits.png', 'clerk and stamped permit.png', 'close up on the unstamped permit.png'],
  'beat-03': ['beduin merchant full size.png', 'funny camel.png', 'clerk and his stand ref.png', 'Line of merchants towards stand with clerk and permits.png', 'clerk fornt view escadalize dwathcing the jars with the conserved lagars and grene beetles .png', 'stunned clerk at the strnag ejars with conserved beetles.png'],
  'beat-04': ['beduin merchant full size.png', 'funny camel.png', 'clerk and his stand ref.png', 'guards.jpeg', 'Line of merchants towards stand with clerk and permits.png', 'ALtair far away aproaching the gate from far awya.png'],
  'beat-05': ['altair-royal-hawk open wings.png', 'close up of altrair approaching the gate fromt view in distress  dunes background.png', 'guards.jpeg', 'merchants in a line before the gate.png', 'Aisha and Sands of Destiny - 2026-05-07T170101.192.png'],
  'beat-06': ['beduin merchant full size.png', 'funny camel.png', 'guards.jpeg', 'altair-royal-hawk open wings.png', 'merchants in a line before the gate.png', 'the gate ntrance.png'],
  'beat-07': ['close up on the merchant with permit and cmael insid ethe city on street .png', 'funny camel.png', 'altair-royal-hawk open wings.png', 'camel and merchant insdie the gate on street.png'],
  'beat-08': ['altair-royal-hawk open wings.png', 'fly over the city form the Gate Altair.png', 'fly over the city towards palace.png', 'PixVerse_Image_Effect_prompt_use @image 1 and  (16).png'],
  'beat-09': ['altair-royal-hawk open wings.png', 'fly over the palace patio towards balcony.png', 'the internal palace patio gates.png', 'Balcony day 4 projections.png', 'Aisha on th ebalcony .png'],
  
  // ── PART 2: Balcony, Aisha & Dora, Messenger Hall ──
  'beat-10': ['Aisha.png', 'panther on cushion.png', 'Aisha on th ebalcony .png', 'Balcony day 4 projections.png', 'view from inside balcony.png'],
  'beat-11': ['Aisha.png', 'panther.png', 'altair-royal-hawk open wings.png', 'Aisha on th ebalcony .png', 'Balcony day 4 projections.png'],
  'beat-12': ['Aisha.png', 'Aisha runs downcorridor .png', 'bedrrom back view withthe entrance door.png', 'Balcony day 4 projections.png'],
  'beat-13': ['Aisha.png', 'altair-royal-hawk open wings.png', 'hawk with scroll in the guest news deliveries room.png', 'Aisha grabs the scroll forn the hawk.png'],
  
  // ── PART 3: Scroll, Map, Father Confrontation ──
  'beat-14': ['Aisha.png', 'panther.png', 'scroll.png', 'bedroom day towards balcony front view.png', 'map of kingdoms in distress.png'],
  'beat-15': ['Aisha.png', 'panther.png', 'Sultan close up Father of Aisha.png', 'Sulrtan Father of AIsha.png', 'Aisha father sultan.png', 'bedroom day towards balcony front view.png'],
  'beat-16': ['Aisha.png', 'panther.png', 'view from inside balcony.png', 'bedroom day towards balcony front view.png', 'buns seller .png'],
  
  // ── PART 4: Dora Bun Diversion & Escape ──
  'beat-17': ['panther.png', 'panther on cushion.png', 'buns seller .png', 'the buns seller woman.png', 'funny internal patio guards ne is angry  other is sillyand funny on the right.png', 'internal patio gate .png'],
  'beat-18': ['Aisha.png', 'aisha eaks out hte door to find the servnat.png', 'palace exit internal door.png', 'aiha picking a simple headscarf, servqnt distressed.png', 'aisha in another simple headscarf.png'],
  'beat-19': ['Aisha.png', 'aisha in another simple headscarf.png', 'Asiah and the servnt aisah in another simple headscarf.png', 'internal patio gate .png', 'funny internal patio guards ne is angry  other is sillyand funny on the right.png'],
  'beat-20': ['panther.png', 'the buns seller woman nags about buns to the guards.png', 'funny internal patio guards ne is angry  other is sillyand funny on the right.png', 'buns seller insode the pation gurads ont he background.png', 'PixVerse_Image_Effect_prompt_isolate both char (1).png'],
  
  // ── BRIDGING BEATS ──
  'beat-21': ['beduin merchant full size.png', 'funny camel.png', 'clerk and his stand ref.png', 'Line of merchants towards stand with clerk and permits.png', 'clerk tating the round bread comical.png'],
  'beat-22': ['beduin merchant full size.png', 'funny camel.png', 'Line of merchants towards stand with clerk and permits.png', 'freepik__a-3d-digital-art-character-sheet-on-a-pure-white-b__22405.png'],
  'beat-23': ['beduin merchant full size.png', 'funny camel.png', 'clerk and his stand ref.png', 'Line of merchants towards stand with clerk and permits.png', 'stunned clerk at the strnag ejars with conserved beetles.png'],
  'beat-24': ['beduin merchant full size.png', 'clerk and his stand ref.png', 'Line of merchants towards stand with clerk and permits.png'],
  'beat-25': ['freepik__a-3d-digital-art-character-sheet-on-a-pure-white-b__22405.png', 'guards.jpeg', 'Line of merchants towards stand with clerk and permits.png', 'the gate ntrance.png'],
  'beat-26': ['Aisha.png', 'panther.png', 'bedrrom back view withthe entrance door.png', 'Balcony day 4 projections.png'],
  'beat-27': ['Sulrtan Father of AIsha.png', 'Sultan close up Father of Aisha.png', 'bedroom day towards balcony front view.png', 'bedrrom back view withthe entrance door.png'],
  'beat-28': ['Aisha.png', 'Sultan close up Father of Aisha.png', 'Sulrtan Father of AIsha.png', 'Aisha father sultan.png', 'bedroom day towards balcony front view.png'],
  'beat-29': ['Sulrtan Father of AIsha.png', 'Sultan close up Father of Aisha.png', 'Aisha.png', 'panther.png', 'bedroom day towards balcony front view.png'],
  'beat-30': ['Sulrtan Father of AIsha.png', 'Sultan close up Father of Aisha.png', 'panther.png', 'bedroom day towards balcony front view.png', 'Aisha father sultan.png'],
  'beat-31': ['Aisha.png', 'panther.png', 'bedroom day towards balcony front view.png'],
  'beat-32': ['panther.png', 'buns seller .png', 'PixVerse_Image_Effect_prompt_isolate both char (1).png', 'internal patio gate .png', 'funny internal patio guards ne is angry  other is sillyand funny on the right.png'],
  'beat-33': ['buns seller .png', 'the buns seller woman.png', 'internal patio gate .png', 'funny internal patio guards ne is angry  other is sillyand funny on the right.png'],
  'beat-34': ['funny internal patio guards ne is angry  other is sillyand funny on the right.png', 'Aisha and Sands of Destiny - 2026-05-07T203359.005.png', 'internal patio gate .png'],
  'beat-35': ['Aisha.png', 'panther.png', 'view from inside balcony.png', 'bedroom day towards balcony front view.png'],
  'beat-36': ['Aisha.png', 'panther.png', 'view from inside balcony.png', 'buns seller .png'],
  'beat-37': ['Aisha.png', 'aisha eaks out hte door to find the servnat.png', 'bedrrom back view withthe entrance door.png', 'palace exit internal door.png'],
  'beat-38': ['Aisha.png', 'aiha picking a simple headscarf, servqnt distressed.png', 'palace exit internal door.png'],
  'beat-39': ['aisha in another simple headscarf.png', 'Asiah and the servnt aisah in another simple headscarf.png', 'internal patio gate .png'],
  'beat-40': ['aisha in another simple headscarf.png', 'panther.png', 'internal patio gate .png', 'funny internal patio guards ne is angry  other is sillyand funny on the right.png'],
  'beat-41': ['aisha in another simple headscarf.png'],
  'beat-42': ['freepik__samw-character-img2-put-him-on-the-camel-camel-and__4202.png', 'caravans aprpaching the gate form the dunes towards the gates.png'],
  'beat-43': ['Aisha.png', 'panther on cushion.png', 'bedroom day towards balcony front view.png', 'Balcony day 4 projections.png'],
  'beat-44': ['altair-royal-hawk open wings.png', 'close up of altrair approaching the gate fromt view in distress  dunes background.png', 'Aisha and Sands of Destiny - 2026-05-07T170101.192.png'],
  'beat-45': ['panther.png', 'panther on cushion.png', 'Aisha.png', 'Balcony day 4 projections.png', 'bedroom day towards balcony front view.png'],
  'beat-46': ['funny internal patio guards ne is angry  other is sillyand funny on the right.png', 'the buns seller woman nags about buns to the guards.png', 'internal patio gate .png', 'buns seller insode the pation gurads ont he background.png'],
  'beat-47': ['Sulrtan Father of AIsha.png', 'Sultan close up Father of Aisha.png', 'bedrrom back view withthe entrance door.png'],
  'beat-48': ['Aisha.png', 'panther.png', 'bedroom day towards balcony front view.png', 'scroll.png'],
  'beat-49': ['Aisha.png', 'bedroom day towards balcony front view.png', 'map of kingdoms in distress.png', 'scroll.png'],
  'beat-50': ['Sulrtan Father of AIsha.png', 'Sultan close up Father of Aisha.png', 'Aisha.png', 'bedroom day towards balcony front view.png'],
  'beat-51': ['panther.png', 'bedrrom back view withthe entrance door.png'],
  'beat-52': ['freepik__a-3d-digital-art-character-sheet-on-a-pure-white-b__22405.png', 'the gate ntrance.png'],
  'beat-53': ['Aisha.png', 'panther.png', 'bedroom day towards balcony front view.png'],
  'beat-54': ['Aisha.png', 'panther.png', 'Aisha and panther.png', 'bedroom day towards balcony front view.png', 'map of kingdoms in distress.png'],
  'beat-55': ['Aisha.png', 'view from inside balcony.png'],
  'beat-56': ['guards.jpeg', 'the gate ntrance.png', 'the gate empty prop  reference .jpeg'],
  'beat-57': ['funny camel.png', 'freepik__samw-character-img2-put-him-on-the-camel-camel-and__4202.png', 'Line of merchants towards stand with clerk and permits.png'],
  'beat-58': ['aisha in another simple headscarf.png'],
  'beat-59': ['balcony exterior front view.png', 'balcony left side.png', 'balcony right side.png', 'low angle view towards the balcony .png', 'Aisha.png'],
  'beat-60': ['panther.png', 'the buns seller woman nags about buns to the guards.png', 'funny internal patio guards ne is angry  other is sillyand funny on the right.png', 'internal patio gate .png', 'buns seller insode the pation gurads ont he background.png'],
};

const MODELS = [
  { model: 'gemini-3.1-flash', quality: '2160p', label: 'nano-banana-4k-A' },
  { model: 'gemini-3.1-flash', quality: '2160p', label: 'nano-banana-4k-B' },
  { model: 'gemini-3.0', quality: '1440p', label: 'nano-banana-pro-2k' },
  { model: 'gpt-image-2.0', quality: '1440p', detailLevel: 'medium', label: 'gpt2-2k-medium' },
];

const dryRun = process.argv.includes('--dry-run');
const promptDir = process.argv.find(a => !a.startsWith('-') && a !== process.argv[0] && a !== process.argv[1]) 
  || path.join(process.cwd(), 'public/assets/storyboard/scratch/act1-prompts');
const logFile = path.join(promptDir, 'submit.log');
const failedLog = path.join(promptDir, 'submit.failed.log');

// Read all prompt files
const promptFiles = fs.readdirSync(promptDir)
  .filter(f => f.endsWith('.txt') && f.startsWith('beat-'))
  .sort();

console.log(`\n═══════════════════════════════════════════════`);
console.log(`  ACT 1 BATCH SUBMIT — ${promptFiles.length} prompts × ${MODELS.length} models`);
console.log(`  Total generations: ${promptFiles.length * MODELS.length}`);
console.log(`  Mode: ${dryRun ? 'DRY RUN' : 'LIVE'}`);
console.log(`═══════════════════════════════════════════════\n`);

let submitted = 0;
let failed = 0;
let skipped = 0;

for (const file of promptFiles) {
  const prompt = fs.readFileSync(path.join(promptDir, file), 'utf-8');
  
  // Find image map
  const beatPrefix = file.match(/^(beat-\d+)/)?.[1];
  const images = IMG[beatPrefix] || [];
  const imagePaths = images.map(img => path.join(REF, img));
  
  // Verify images
  const validImages = imagePaths.filter(p => {
    if (!fs.existsSync(p)) {
      console.warn(`  ⚠️ Missing: ${path.basename(p)}`);
      return false;
    }
    return true;
  });

  console.log(`\n📋 ${file} (${validImages.length}/${images.length} images)`);

  for (const cfg of MODELS) {
    if (dryRun) {
      console.log(`  [DRY] Would submit to ${cfg.label}`);
      submitted++;
      continue;
    }

    const args = [
      'pixverse-cli', 'create', 'image',
      '--prompt', prompt,
      '--model', cfg.model,
      '--quality', cfg.quality,
      '--aspect-ratio', '16:9',
      '--no-wait', '--json',
    ];
    if (cfg.detailLevel) args.push('--detail-level', cfg.detailLevel);
    if (validImages.length > 0) args.push('--images', ...validImages);

    let retries = 15;
    let success = false;

    while (retries > 0 && !success) {
      const res = spawnSync('npx', args, { encoding: 'utf-8', cwd: process.cwd(), timeout: 120000 });

      if (res.status === 0) {
        success = true;
        submitted++;
        fs.appendFileSync(logFile, `${new Date().toISOString()} | ${file} | ${cfg.label} | OK | ${(res.stdout||'').trim()}\n`);
        console.log(`  ✅ ${cfg.label}`);
      } else {
        if ((res.stderr||'').includes('concurrent') || res.status === 4) {
          console.log(`  ⏳ Busy, waiting 10s... (${retries} left)`);
          spawnSync('sleep', ['10']);
          retries--;
        } else {
          console.error(`  ❌ ${cfg.label}: ${(res.stderr||'').slice(0,100)}`);
          fs.appendFileSync(failedLog, `${new Date().toISOString()} | ${file} | ${cfg.label} | FAIL | ${res.stderr}\n`);
          failed++;
          break;
        }
      }
    }
    if (!success && retries <= 0) {
      console.error(`  💀 ${cfg.label}: Max retries exceeded`);
      failed++;
    }
  }
}

console.log(`\n═══════════════════════════════════════════════`);
console.log(`  COMPLETE: ${submitted} submitted, ${failed} failed`);
console.log(`═══════════════════════════════════════════════\n`);
