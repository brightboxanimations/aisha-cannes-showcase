#!/usr/bin/env node
/**
 * Generates remaining prompt files for ACT 1.
 * Creates prompts 33-51 to reach 80 total.
 */
import fs from 'fs';
import path from 'path';

const DIR = '/Users/vaquita/Downloads/aisha/aisha-cannes-showcase/public/assets/storyboard/scratch/act1-prompts';

const OPEN = `premium luminous 3D animated feature-film, true 3D depth, cinematic camera angles, volumetric LIGHT_TYPE light, little tiny dust motes, soft depth of field, expressive animated 3D eyes of all characters, realistic textures, true depth of field, focus on the foreground characters and objects with shallow cinematic 3d depth of field, detailed clear emotional staging, high-quality 4K animated movie look.`;

const CLOSE = `All panels must be consistent between each other as to the backgrounds, positioning and characters as one beat-to-beat story. Style: premium luminous 3D animated feature-film, true 3D depth, cinematic camera angles, volumetric LIGHT_TYPE light, little tiny dust motes, soft depth of field, expressive animated 3D eyes of all characters, realistic textures, true depth of field, focus on the foreground characters and objects with shallow cinematic 3d depth of field, detailed clear emotional staging, high-quality 4K animated movie look.`;

const prompts = [
  {
    file: 'beat-33a-bun-seller-approach.txt',
    light: 'warm midday',
    chars: `@image1 = Buns seller — scandalized woman with tray of pistachio honey buns, dramatic expressions, exact as reference.\n@image2 = Buns seller character — full body isolated reference, exact as reference.`,
    loc: `@image3 = Internal patio gate — arabesque arch and market, exact unchanged.\n@image4 = Internal patio guards — silly right, grumpy left, exact as reference.`,
    props: '',
    scene: `Late morning — bun seller character intro.\nThe bun seller walks through the courtyard with her prized tray of pistachio honey buns. She's a proud, dramatic woman — these buns are her art, her livelihood, her identity. She walks like a queen carrying crown jewels. She has opinions about everyone. She side-eyes the guards. She adjusts her tray with ceremony.`,
    panels: `Panel 1: Medium shot of the bun seller exact as @image1 walking through the courtyard exact as @image3, tray balanced perfectly on her head. Her posture is regal — chin up, chest out, walking with deliberate grace. The golden honey buns catch the sunlight, glowing like treasure. Her expression: pride bordering on arrogance.\nPanel 2: Close-up of the bun tray. Golden pistachio honey buns piled in a perfect pyramid — each one glazed to perfection, green pistachios sprinkled artfully, honey dripping in slow golden threads. Steam rises in the midday warmth. The foreground bun is a work of art. Behind the tray: the courtyard blurs with warm light.\nPanel 3: Medium comedy shot. The bun seller exact as @image1 walks past the two guards exact as @image4 at the gate. She side-eyes the silly guard on the right with contempt — he's eyeing her buns hungrily. She pulls the tray slightly away from his side. The grumpy guard on the left doesn't react. She mutters something disapproving about guards and their appetites.\nPanel 4: Wide shot. The bun seller exact as @image1 continues through the courtyard exact as @image3, tray high, steps confident. Behind her and she doesn't see: a white shadow (Dora) darts between pillars, tracking her. The courtyard is peaceful — servants walking, a gardener tending plants, sunlight on the tiles. The calm before the storm.`,
    env: `Palace courtyard exact as @image3, guards exact as @image4, market stalls, midday.`
  },
  {
    file: 'beat-34a-guards-comedy-duo.txt',
    light: 'warm midday',
    chars: `@image1 = Internal patio guards — two guards: silly amused one on right, grumpy annoyed one on left, both in ornate palace armor, exact as reference.\n@image2 = Patio guards alternate — same two guards from different angle, exact as reference.`,
    loc: `@image3 = Internal patio gate — arabesque arch, exact unchanged.`,
    props: '',
    scene: `Late morning — palace guards comedy duo character beat.\nA dedicated beat establishing the two internal patio guards as a comedy duo. The silly one on the right is easily distracted, always grinning, loves animals and food. The grumpy one on the left takes everything too seriously, hates fun, treats guard duty like a sacred calling. They've been standing at this gate together for years and drive each other crazy.`,
    panels: `Panel 1: Medium two-shot of the guards exact as @image1 standing at the gate exact as @image3. The silly guard on the right leans against the arch, helmet tilted back, grinning at a passing butterfly. The grumpy guard on the left stands ramrod straight, jaw clenched, staring forward with military precision. Between them: the contrast defines their characters.\nPanel 2: Close-up comedy beat. The silly guard nudges the grumpy guard with his elbow and points at something funny off-screen. The grumpy guard's eye twitches. His nostrils flare. He refuses to look. The silly guard nudges again. The grumpy guard's hand grips his spear until his knuckles whiten.\nPanel 3: Medium shot. The silly guard has produced a small piece of bread and is breaking it into crumbs, scattering them for pigeons near the gate. Three pigeons gather at his feet. The grumpy guard stares at the pigeons with undisguised hatred. One pigeon hops toward his boot. He doesn't move but his expression promises violence.\nPanel 4: Wide shot of the gate exact as @image3. Both guards are back in position — but the silly one is secretly feeding a pigeon behind his back while the grumpy one pretends not to see. The gate arch frames them perfectly — a portrait of mismatched partnership. The courtyard stretches behind them. Neither knows the chaos that's coming.`,
    env: `Palace gate exact as @image3, courtyard, midday sun.`
  },
  {
    file: 'beat-35a-aisha-paces-balcony.txt',
    light: 'warm midday',
    chars: `@image1 = Aisha — 16-year-old princess, furious, pacing, transitioning to sly planning, exact as reference.\n@image2 = Dora — white panther, watching Aisha with concern, exact as reference.`,
    loc: `@image3 = View from inside balcony — city panorama, gate, plaza below, exact unchanged.\n@image4 = Bedroom front view — exact unchanged.`,
    props: '',
    scene: `Late morning — Aisha pacing on the balcony.\nAisha steps onto the balcony after the confrontation. She looks down at the world below — the world she's forbidden from entering. She spots things: guards' patrol patterns, gate timing, the service exit, merchant traffic. She's not dreaming now — she's planning. Her mind works like a strategist.`,
    panels: `Panel 1: Medium shot. Aisha exact as @image1 steps through the balcony curtains onto the balcony. The morning light hits her face. But her expression isn't dreamy anymore — it's sharp, focused, calculating. She grips the railing with both hands and leans forward, scanning the courtyard below exact as @image3 with tactical precision.\nPanel 2: POV shot — Aisha's view looking down exact as @image3. The courtyard below with annotations of her analysis: guard patrol routes (two guards walking left), gate timing (the gate opens for a delivery cart), service exit position (a small door on the far left), the bun seller's path (crossing from right). Aisha is mapping her escape in real time.\nPanel 3: Close-up of Aisha exact as @image1. Her eyes track left to right, following something below. Her expression is intense — lips pressed together, brow slightly furrowed, chin forward. This is not a child looking at the world with wonder. This is a princess calculating escape vectors. Wind plays with her hair but she doesn't notice.\nPanel 4: Medium shot from outside looking in. Aisha exact as @image1 at the railing, body leaning forward, one hand pointing down at something specific. Behind her through the balcony curtains: Dora exact as @image2 watches from the bedroom with worried golden eyes. Dora knows that expression. Dora knows what's coming. Dora is not happy about it.`,
    env: `Balcony exact as @image3, bedroom exact as @image4, midday light.`
  },
  {
    file: 'beat-36a-aisha-spots-scarf-seller.txt',
    light: 'warm midday',
    chars: `@image1 = Aisha — princess on balcony, spotting an opportunity, exact as reference.\n@image2 = Dora — panther, ears pricking at bun smell, exact as reference.`,
    loc: `@image3 = View from balcony — panorama below showing market stalls and service path, exact unchanged.\n@image4 = Buns seller — in the courtyard with her tray, exact as reference.`,
    props: '',
    scene: `Late morning — Aisha spots both the scarf seller and the bun seller.\nFrom the balcony, Aisha sees two things at once: a scarf seller carrying unsold scarves near the service exit, and the bun seller walking through the courtyard. Her plan crystallizes — send Dora after the buns as a distraction, then use the scarf seller as her cover to slip through the gate. Pure genius or pure recklessness.`,
    panels: `Panel 1: Wide aerial shot from the balcony looking down exact as @image3. The courtyard below is a chessboard — Aisha sees all the pieces. Lower left: the scarf seller walking toward the service exit. Lower right: the bun seller exact as @image4 crossing the courtyard. Center: two guards at the gate. Upper right: the service gate, currently unwatched. Aisha's gaze connects all the pieces.\nPanel 2: Close-up of Aisha's face exact as @image1. The moment of revelation — her eyebrows rise, her mouth forms a small "O", then slowly curves into a sly, delighted grin. She's had the idea. Her eyes flick from the scarf seller to the bun seller to the guards and back. Each glance is a calculation. The plan assembles itself behind those large dark eyes.\nPanel 3: Medium shot. Aisha turns from the railing and looks at Dora exact as @image2 who is lying inside the bedroom near the balcony entrance. "You smell that, Dora?" Her expression is pure mischief. In the background through the railing: the bun seller walks below, her tray's aroma rising. Dora's ears have already betrayed her — they're swiveled toward the courtyard.\nPanel 4: Close-up two-shot. Aisha crouches beside Dora, one hand on the panther's shoulder, face inches from Dora's. "One bun for you, one bun for me." Her expression: irresistible charm. Dora's expression: the losing battle between duty and desire. Her golden eyes are enormous. Her whiskers tremble. The bun smell is physically pulling her toward the edge.`,
    env: `Balcony and courtyard below exact as @image3, bun seller exact as @image4, midday.`
  },
  {
    file: 'beat-37a-aisha-sneaks-out-bedroom.txt',
    light: 'warm midday',
    chars: `@image1 = Aisha — sneaking out, barefoot, carrying shoes, exact as reference.\n@image2 = Aisha peeks — at the palace exit door, exact as reference.`,
    loc: `@image3 = Bedroom back view — entrance door, exact unchanged.\n@image4 = Palace exit internal door — service corridor, exact unchanged.`,
    props: '',
    scene: `Late morning — Aisha sneaks from bedroom to service exit.\nWhile Dora heads to the courtyard for buns, Aisha takes a different route — through the back corridors to the service exit. She carries her shoes to be silent on the marble. She peeks around corners. She avoids servants. She reaches the service exit and peers through the door.`,
    panels: `Panel 1: Medium shot at the bedroom door exact as @image3. Aisha pulls it open carefully, peeking both ways down the corridor. She holds her shoes in one hand — barefoot on the cool marble for silence. Her expression is alert, excited, slightly nervous. The bedroom behind her is bright. The corridor ahead is dim.\nPanel 2: Wide shot of a palace corridor. Aisha tiptoes down the grand hallway, pressing against the wall. A servant walks across the far end — Aisha freezes, holding her breath. The servant passes without noticing. Aisha exhales. The marble floor is cold under her bare feet. Arabesque arches repeat into the distance.\nPanel 3: Medium shot exact as @image2. Aisha reaches the service exit exact as @image4 and presses her ear against the door. She listens for guards. Her face is pressed sideways against the carved wood, one eye peeking through the gap. Through the crack: a sliver of bright courtyard is visible. She can hear the distant sounds of the market.\nPanel 4: Close-up of Aisha at the door exact as @image2. She pushes it open slowly — daylight streams in, illuminating her face. Her eyes adjust. Through the door: the courtyard, the service path, and far away — the scarf seller walking with her unsold scarves. Aisha's expression: "Target acquired." She slides her shoes back on. Time to move.`,
    env: `Bedroom exact as @image3, corridor, service exit exact as @image4, midday.`
  },
  {
    file: 'beat-38a-scarf-seller-intro.txt',
    light: 'warm midday',
    chars: `@image1 = Aisha — approaching the scarf seller with warm charm, exact as reference.\n@image2 = Aisha picking headscarf — trying on scarf with seller distressed, exact as reference.`,
    loc: `@image3 = Palace exit internal door — service exit, exact unchanged.`,
    props: '',
    scene: `Late morning — scarf seller character intro.\nThe scarf seller is a humble, tired woman who has had a terrible sales day. She carries unsold simple scarves — nothing fancy, nothing royal. She's defeated, shoulders slumped, ready to go home. Then Aisha appears. The seller freezes — royalty talking to her? Buying HER scarves? She can't compute.`,
    panels: `Panel 1: Medium shot. The scarf seller walks near the service exit — shoulders slumped, unsold scarves draped over both arms like colorful burdens. Her expression: defeat. Her feet drag. Behind her: the bustling courtyard where other sellers are doing better. She's invisible to everyone.\nPanel 2: Medium shot. Aisha exact as @image1 appears beside her — materializing with casual elegance. "These are lovely. May I try one?" Her voice is warm, genuine, not condescending. The seller freezes mid-step. Her jaw drops. Her eyes go wide. She wasn't prepared for this encounter in any dimension of reality.\nPanel 3: Close-up of the scarf seller's face. She stammers: "P-Princess... these are very simple scarves... not fitting for royalty..." Her expression cycles through: terror, disbelief, confusion, and a tiny flickering hope that maybe — just maybe — she might sell something today. Her hands clutch the scarves tighter.\nPanel 4: Medium shot exact as @image2. Aisha takes a sand-colored scarf and drapes it over her head with exaggerated theatrical grace. She turns with a pose: "Not fitting? Look at me. I'm magnificent." The seller stares. The scarf IS simple. But somehow on Aisha it looks... magnificent. The seller blinks twice, unable to argue with a princess who is also right.`,
    env: `Service area near exit exact as @image3, courtyard background, midday.`
  },
  {
    file: 'beat-39a-aisha-buys-all-scarves.txt',
    light: 'warm midday',
    chars: `@image1 = Aisha in headscarf — disguised with beige scarf, carrying basket, exact as reference.\n@image2 = Aisha walking with servant — helping carry scarves, exact as reference.`,
    loc: `@image3 = Internal patio gate — arabesque arch, exact unchanged.`,
    props: '',
    scene: `Late morning — Aisha buys all scarves and offers to help carry.\nAisha leans in conspiratorially: "I'll take them all. And I'll even help you carry them out." The seller's jaw drops. Aisha picks up the basket like she's done this her whole life. The two walk together toward the service gate — princess disguised as a helpful market girl, seller in a daze of good fortune.`,
    panels: `Panel 1: Close-up of Aisha exact as @image1 leaning toward the seller, voice dropped to a whisper: "I'll take them. All of them." Her eyes flick sideways toward the gate exact as @image3 — calculating the timing. The seller's eyes go enormous with disbelief. Behind them: distant bun chaos is about to start.\nPanel 2: Medium shot. Aisha exact as @image1 picks up the seller's heavy basket of scarves with surprising ease — she lifts it onto one arm like she's been a market porter her whole life. The seller reaches to help but Aisha waves her off with a warm smile: "Royal favor." The seller squeaks instead of speaking.\nPanel 3: Wide shot exact as @image2. Aisha and the scarf seller walk together toward the gate exact as @image3. Aisha matches the seller's pace, chatting warmly, asking about fabrics and dyes. She looks completely natural — a young woman helping a merchant. Her headscarf covers her hair. From behind, you'd never guess she was a princess.\nPanel 4: Medium shot from the gate looking toward them. Aisha exact as @image1 and the seller approach the gate exact as @image3. The guards are visible at the gate — but they're turning toward the courtyard. In the far background: the first signs of bun chaos — a shriek, a white blur, buns flying. The timing is perfect. Aisha's plan is working.`,
    env: `Courtyard near gate exact as @image3, market area, midday.`
  },
];

for (const p of prompts) {
  const open = OPEN.replace(/LIGHT_TYPE/g, p.light);
  const close = CLOSE.replace(/LIGHT_TYPE/g, p.light);
  
  let text = open + '\n\n';
  text += 'CHARACTER LOCKS:\n' + p.chars + '\n\n';
  text += 'LOCATION REFERENCE:\n' + p.loc + '\n\n';
  if (p.props) text += 'PROPS REFERENCE:\n' + p.props + '\n\n';
  text += 'SCENE: ' + p.scene + '\n\n';
  text += 'Create 2x2 grid with 4 panels with 3D animated scenes in each one:\n';
  text += p.panels + '\n\n';
  text += 'Environment: ' + p.env + '\n\n';
  text += close + '\n';
  
  fs.writeFileSync(path.join(DIR, p.file), text);
  console.log(`✅ ${p.file}`);
}

console.log(`\nGenerated ${prompts.length} prompt files.`);
