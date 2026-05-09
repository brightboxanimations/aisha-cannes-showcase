import fs from 'fs';
import path from 'path';

const tasksDir = path.join(process.cwd(), 'public', 'assets', 'storyboard', 'tasks', 'current');
if (!fs.existsSync(tasksDir)) fs.mkdirSync(tasksDir, { recursive: true });

const openingTag = `premium luminous 3D animated feature-film, true 3D depth, cinematic camera angles, volumetric light, little tiny dust motes, soft depth of field, expressive animated 3D eyes of all characters, realistic textures, true depth of field, focus on the foreground characters and objects with shallow cinematic 3d depth of field, detailed clear emotional staging, high-quality 4K animated movie look.`;

const closingTag = `All panels must be consistent between each other as to the backgrounds, positioning and characters as one beat-to-beat story. Style: premium luminous 3D animated feature-film, true 3D depth, cinematic camera angles, volumetric light, little tiny dust motes, soft depth of field, expressive animated 3D eyes of all characters, realistic textures, true depth of field, focus on the foreground characters and objects with shallow cinematic 3d depth of field, detailed clear emotional staging, high-quality 4K animated movie look.`;

const locks = {
  aisha: `@image1 = Aisha, 16-year-old human princess, curious brave beautiful, exact as the reference; no modification to looks or clothes.`,
  dora: `@image2 = Dora, white panther, normal panther size, her height reaches Aisha's hip, exact as the reference.`,
  niura: `@image3 = Niura, tiny delicate snake, beautiful intricate scales, exact as reference.`,
  altair: `@image4 = Altair, majestic giant eagle, exact as reference.`,
  sharak: `@image5 = Sharak, shadow king with magic powers, fierce and insane, exact as reference.`,
  nibzu: `@image6 = Nibzu, spider sidekick, exact as reference.`,
  giantNibzu: `@image7 = Giant Nibzu, massive goofy spider with crossed amber eyes, huge but retaining its silly smile, exact as reference.`,
  sandGuardian: `@image8 = Giant Sand Guardian, kinetic sand creature, flowing like liquid light, faceless hidden beneath a hood of swirling golden grains.`,
  zahra: `@image9 = Zahra, Aisha's mother, beautiful woman in flowing white dress adorned with pearls and a silky headscarf, exact as reference.`,
  zahraSpirit: `@image10 = Giant Spirit of Zahra, towering figure of pearlescent white sand and diamond dust, glowing silver arabesque patterns on the rims of her robes, majestically towering over the dunes.`,
  hourglass: `@image11 = The Hourglass, massive magical hourglass inside the majestic chamber, exact as reference.`,
  walls: `@image12 = Quazar al Zaman Walls, colossal majestic stone walls, exact as reference.`,
  dunes: `@image13 = Desert Dunes, endless rolling sands beneath stormy skies, sandstorms in the distance.`,
  temple: `@image14 = Temple of Light, breathtaking sacred hall in the Spirit Realm, quartz mosaics shimmering, floating light motes, endless walls of arabesque-laced windows.`
};

let globalTaskIndex = 1;

function createPrompt(title, scene, lockKeys, panels) {
  const taskLocks = lockKeys.map(k => locks[k]);
  const taskJson = {
    id: `task-act10-${Date.now()}-${globalTaskIndex.toString().padStart(3, '0')}`,
    title: `${globalTaskIndex}. ${title}`,
    prompt: `${openingTag}\n\nCHARACTER AND LOCATION LOCKS:\n${taskLocks.join('\n')}\n\nSCENE: ${scene}\n\nCreate 2x2 grid with 4 panels with 3D animated scenes in each one:\n${panels.join('\n')}\n\n${closingTag}`,
    status: 'todo',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    passes: [],
    generatedImages: [],
    skillHint: 'skill-codex-2x2-grid-prompt'
  };
  fs.writeFileSync(path.join(tasksDir, `${taskJson.id}.json`), JSON.stringify(taskJson, null, 2));
  globalTaskIndex++;
}

// ---------------------------------------------------------
// BEAT 1: The Devastation & Guilt (Prompts 1-7)
// ---------------------------------------------------------
createPrompt("Aftermath in the Dunes", "Daytime scene in the desert dunes. The ruins of the palace in the distance.", ['aisha', 'altair', 'dunes'], [
  "Panel 1: Wide cinematic shot. Aisha exact as @image1 lies still in the rolling Desert Dunes exact as @image13, breathless, sand covering her clothes.",
  "Panel 2: Extreme wide shot. In the distance, the colossal palace groans and collapses inward like a dying titan, dust clouds billowing.",
  "Panel 3: Medium tracking shot. Altair exact as @image4 lands heavily beside Aisha exact as @image1, his massive wings beating dust into spirals.",
  "Panel 4: Tight two-shot. Altair exact as @image4 looks at Aisha exact as @image1 with urgency, breathless, telling her to run to the Hourglass."
]);

createPrompt("Altair Departs", "Daytime scene in the dunes.", ['aisha', 'altair', 'dora', 'dunes'], [
  "Panel 1: Low angle action shot. Altair exact as @image4 launches violently into the stormy sky, wings fully spread, leaving Aisha behind.",
  "Panel 2: Medium shot. Dora exact as @image2 drops heavily into the sand beside Aisha exact as @image1, sand spraying from her paws.",
  "Panel 3: Close-up. Dora exact as @image2 stumbles, shaking her fur vigorously, trying to hide her exhaustion and pain.",
  "Panel 4: Close-up. Aisha exact as @image1 frantically clutches her scarf, her eyes wide with panic as she searches for something."
]);

createPrompt("Reviving Niura", "Daytime scene in the dunes.", ['aisha', 'niura', 'dora', 'dunes'], [
  "Panel 1: Insert shot. The tiny snake Niura exact as @image3 slides weakly out of Aisha's scarf, looking dizzy and barely conscious.",
  "Panel 2: Extreme close-up. Aisha exact as @image1 gently lifts Niura exact as @image3 with both hands, tears in her eyes.",
  "Panel 3: Emotional close-up. Aisha exact as @image1 presses Niura's cold intricate scales exact as @image3 against her own cheek, her voice cracking with relief.",
  "Panel 4: Medium shot. Dora exact as @image2 limps closer, looking at the tiny snake exact as @image3 with genuine, sincere concern, all her jealousy gone."
]);

createPrompt("The Guilt Hits", "Daytime scene in the dunes. Aisha is overwhelmed by guilt.", ['aisha', 'dora', 'dunes'], [
  "Panel 1: Wide shot. Aisha exact as @image1 sits alone in the vast, empty horizon of endless Desert Dunes exact as @image13, looking incredibly small.",
  "Panel 2: Medium close-up. Aisha exact as @image1 sinks to her knees in the sand, her body shaking as the realization and guilt hits her like a physical blow.",
  "Panel 3: Extreme close-up. Aisha exact as @image1 sobbing, her face streaked with tears and sand, whispering about the deaths of her mother and the Prince.",
  "Panel 4: High angle shot. Aisha exact as @image1 clutching her chest, entirely broken, surrounded by the massive, unforgiving Desert Dunes exact as @image13."
]);

createPrompt("Dora's Protection", "Daytime scene in the dunes. Dora comforts Aisha.", ['aisha', 'dora', 'dunes'], [
  "Panel 1: Medium shot. Dora exact as @image2 steps firmly in front of Aisha exact as @image1, using her body to block the view of the ruined palace.",
  "Panel 2: Low angle shot. Dora exact as @image2 stands tall and protective over the weeping Aisha exact as @image1, her expression serious and encouraging.",
  "Panel 3: Close-up. Aisha exact as @image1 lifts her face toward Dora, tear-streaked, guilty, and incredibly fragile.",
  "Panel 4: OTS shot over Dora exact as @image2. She looks down at Aisha exact as @image1, speaking firmly, telling her she didn't destroy the balance on purpose."
]);

createPrompt("The Talisman", "Daytime scene in the dunes.", ['aisha', 'dora', 'dunes'], [
  "Panel 1: Insert shot. Aisha's hands exact as @image1 touch her mother's Talisman resting on her chest, which begins to glow faintly warm against her palm.",
  "Panel 2: Close-up. Dora's paw exact as @image2 gently points toward the glowing Talisman on Aisha's chest exact as @image1.",
  "Panel 3: Tight two-shot. Dora exact as @image2 looks intensely into Aisha's eyes exact as @image1, telling her she is the only one who can restore the Hourglass.",
  "Panel 4: Close-up. Aisha exact as @image1 takes a shaky, deep breath, her tearful expression slowly shifting into quiet resolve."
]);

createPrompt("Resolve", "Daytime scene in the dunes.", ['aisha', 'dora', 'dunes'], [
  "Panel 1: Medium wide shot. Aisha exact as @image1 pushes herself fully off the ground, standing up with determination in the Desert Dunes exact as @image13.",
  "Panel 2: Tight shot. Aisha exact as @image1 looking into the distance with fierce resolve, stating they must reach the Hourglass before the Shadow King.",
  "Panel 3: Close-up. Dora exact as @image2 gives a sharp, determined nod.",
  "Panel 4: Wide epic shot. Aisha exact as @image1 and Dora exact as @image2 turn and begin sprinting together across the endless Desert Dunes exact as @image13."
]);

// ---------------------------------------------------------
// BEAT 2: The Dying Hourglass (Prompts 8-12)
// ---------------------------------------------------------
createPrompt("The World is Breaking", "Daytime scene in the dunes.", ['aisha', 'dora', 'dunes'], [
  "Panel 1: Extreme wide cinematic shot. Aisha exact as @image1 and Dora exact as @image2 sprinting through the massive, rolling Desert Dunes exact as @image13.",
  "Panel 2: Epic landscape shot. Massive, terrifying sandstorms devour distant towns on the horizon of the Desert Dunes exact as @image13.",
  "Panel 3: Dynamic tracking shot. The dunes around Aisha exact as @image1 rise and fall like a living sea as she and Dora exact as @image2 run for their lives.",
  "Panel 4: Medium shot. Aisha exact as @image1 and Dora exact as @image2 skidding to a halt, freezing as they look into the distance."
]);

createPrompt("The Broken Walls", "Daytime scene near the walls.", ['aisha', 'dora', 'walls', 'hourglass'], [
  "Panel 1: Wide epic reveal. The colossal Quazar al Zaman Walls exact as @image12 towering in the distance, partially broken.",
  "Panel 2: Medium wide shot. The Majestic Chamber of the Hourglass stands violently torn open, looking like a colossal hole ripped into the stone walls exact as @image12.",
  "Panel 3: Over-the-shoulder shot. Aisha exact as @image1 and Dora exact as @image2 staring in absolute awe and horror at the massive, broken chamber.",
  "Panel 4: Close-up. Aisha's eyes exact as @image1 widening in fear as she sees the state of the Hourglass."
]);

createPrompt("The Dying Lantern", "Daytime scene inside the broken chamber.", ['aisha', 'hourglass', 'walls'], [
  "Panel 1: Cinematic wide shot inside the broken chamber. The massive Hourglass exact as @image11 glows very faintly, flickering weakly like a dying lantern.",
  "Panel 2: Extreme close-up on the top bulb of the Hourglass exact as @image11, showing it is nearly completely empty, only a few grains of sand remaining.",
  "Panel 3: Medium shot. Aisha exact as @image1 steps slowly forward into the chamber, her face bathed in the weak, flickering light of the Hourglass exact as @image11.",
  "Panel 4: Close-up. Aisha exact as @image1 whispering softly, deeply shaken, realizing the balance is almost entirely gone."
]);

createPrompt("Falling Sand", "Daytime scene inside the chamber.", ['dora', 'hourglass', 'aisha'], [
  "Panel 1: Medium shot. Dora exact as @image2 stands near the base of the Hourglass exact as @image11, watching the sand drip with an intense, worried expression.",
  "Panel 2: Macro insert shot. Individual glowing grains of sand falling entirely too fast through the narrow neck of the Hourglass exact as @image11.",
  "Panel 3: Close-up. Aisha exact as @image1 clutching her empty pockets, realizing she has no more sand left to restore the balance.",
  "Panel 4: Tight two-shot. Aisha exact as @image1 and Dora exact as @image2 standing helplessly beneath the towering, dying Hourglass exact as @image11."
]);

createPrompt("The Distant Booms", "Daytime scene inside the chamber.", ['aisha', 'dora', 'hourglass', 'dunes'], [
  "Panel 1: Wide shot. A sudden, violent BOOM echoes from the distance, vibrating the ground beneath Aisha exact as @image1 and Dora exact as @image2.",
  "Panel 2: Close reaction shot. Dora's ears exact as @image2 snap backward, her eyes widening at the sound.",
  "Panel 3: Medium shot. Another massive BOOM. Aisha exact as @image1 whips her head around to look out of the torn opening of the chamber toward the dunes.",
  "Panel 4: Wide POV shot from the chamber looking out at the Desert Dunes exact as @image13, where a massive dust cloud is rapidly approaching."
]);

// ---------------------------------------------------------
// BEAT 3: The Shadow King Arrives (Prompts 13-19)
// ---------------------------------------------------------
createPrompt("Arrival of the Spider", "Daytime scene just outside the walls.", ['sharak', 'giantNibzu', 'dunes'], [
  "Panel 1: Epic low angle shot. Sharak exact as @image5 bursts through the dust cloud, riding atop the back of the massive Giant Nibzu exact as @image7.",
  "Panel 2: Tracking wide shot. The Giant Nibzu exact as @image7 lumbering heavily across the Desert Dunes exact as @image13 like an excited, clumsy warhorse.",
  "Panel 3: Medium shot. Sharak exact as @image5 holding the reins, his posture arrogant and triumphant as he rides the giant beast.",
  "Panel 4: Close-up on the Giant Nibzu's face exact as @image7. Despite being enormous, it still has goofy, crossed amber eyes and a very silly smile."
]);

createPrompt("Manic Triumph", "Daytime scene outside the walls.", ['sharak', 'giantNibzu', 'aisha'], [
  "Panel 1: Extreme close-up. Sharak's face exact as @image5 burning with deranged triumph, dark purple magic veins crackling visibly across his pale skin.",
  "Panel 2: Over-the-shoulder from Sharak exact as @image5, looking down from the spider at tiny Aisha exact as @image1 standing near the broken walls.",
  "Panel 3: Medium shot. Sharak exact as @image5 throws his head back and laughs maniacally, yelling that there is no escape for the Princess.",
  "Panel 4: Action shot. Sharak exact as @image5 violently jerks the reins of the Giant Nibzu exact as @image7 to halt the beast."
]);

createPrompt("The Leap", "Daytime scene outside the walls.", ['sharak', 'giantNibzu', 'dora', 'aisha'], [
  "Panel 1: Dynamic low angle shot. Sharak exact as @image5 leaps effortlessly down from the towering back of the Giant Nibzu exact as @image7.",
  "Panel 2: Impact shot. Sharak's boots exact as @image5 hit the sand heavily, kicking up a cloud of dust.",
  "Panel 3: Medium shot. Dora exact as @image2 immediately steps in front of Aisha exact as @image1, baring her fangs.",
  "Panel 4: Extreme close-up. Dora exact as @image2 roaring with all the intense, vicious fury of a true guardian, protecting Aisha."
]);

createPrompt("Ignored Guardian", "Daytime scene outside the walls.", ['sharak', 'dora', 'aisha'], [
  "Panel 1: Medium shot. Sharak exact as @image5 walks forward, barely glancing down at the furiously roaring white panther Dora exact as @image2.",
  "Panel 2: Action close-up. Sharak's hand exact as @image5 shoots out with incredible speed, grabbing Dora exact as @image2 roughly by the scruff of her neck.",
  "Panel 3: Medium wide shot. Sharak exact as @image5 lifts Dora exact as @image2 completely off the ground with one hand effortlessly, Dora struggling wildly in the air.",
  "Panel 4: Reaction shot. Aisha exact as @image1 screaming and stepping forward to help, horrified as Sharak laughs."
]);

createPrompt("The Kitten", "Daytime scene outside the walls.", ['sharak', 'dora'], [
  "Panel 1: Tight two-shot. Sharak exact as @image5 holds the struggling Dora exact as @image2 in the air, laughing cruelly and calling her a kitten.",
  "Panel 2: Action close-up. Sharak exact as @image5 violently shakes the suspended panther Dora exact as @image2, asserting his terrifying strength.",
  "Panel 3: Extreme close-up. Dora exact as @image2 gasping for air, her eyes wide with shock and pain from the shaking.",
  "Panel 4: Macro POV shot from Dora exact as @image2. Her vision snaps into focus on a specific object hanging from Sharak's neck: the Fake Talisman."
]);

createPrompt("The Flash of Insight", "Daytime scene outside the walls.", ['sharak', 'dora'], [
  "Panel 1: Extreme close-up on Dora's eyes exact as @image2. The pain in her expression suddenly shifts to sharp, calculating intelligence.",
  "Panel 2: Insert shot. The Fake Talisman hanging loosely around Sharak's neck exact as @image5, swinging slightly as he laughs.",
  "Panel 3: Medium shot. Dora exact as @image2 stops struggling randomly, her muscles tensing as she prepares a deliberate counter-attack.",
  "Panel 4: Tight shot. Sharak exact as @image5, entirely arrogant and completely unaware of Dora's realization."
]);

createPrompt("The Twist", "Daytime scene outside the walls.", ['sharak', 'dora'], [
  "Panel 1: Slow-motion action shot. Dora exact as @image2 suddenly twists her entire body in mid-air with a burst of fierce feline courage.",
  "Panel 2: Dynamic angle. Sharak's eyes exact as @image5 widening slightly as the \"kitten\" suddenly moves with lethal speed.",
  "Panel 3: Extreme close-up. Dora's jaws exact as @image2 opening wide, baring her sharp fangs, aiming directly for the leather cord of the Fake Talisman.",
  "Panel 4: Close-up action shot. CHOMP. Dora's teeth exact as @image2 violently snap shut around the talisman."
]);

// ---------------------------------------------------------
// BEAT 4: The Comical Chase (Prompts 20-27)
// ---------------------------------------------------------
createPrompt("The Bite and Kick", "Daytime scene outside the walls.", ['sharak', 'dora'], [
  "Panel 1: Extreme close-up. Dora's jaws exact as @image2 snapping the cord of the Fake Talisman with a violent jerk.",
  "Panel 2: Dynamic action shot. Dora exact as @image2 kicks her powerful hind legs directly off Sharak's chest exact as @image5 to break free.",
  "Panel 3: Reaction shot. Sharak exact as @image5 stumbles backward from the kick, his grip failing from the sheer shock of the attack.",
  "Panel 4: Low angle action shot. Dora exact as @image2 drops gracefully through the air, the Fake Talisman clenched firmly between her teeth."
]);

createPrompt("The Escape", "Daytime scene outside the walls.", ['sharak', 'dora', 'dunes'], [
  "Panel 1: Low angle action shot. Dora exact as @image2 hits the sand running at top speed, kicking up a massive spray of sand.",
  "Panel 2: Close-up tracking shot. Dora exact as @image2 sprinting beautifully, the Fake Talisman clenched firmly between her teeth.",
  "Panel 3: Medium shot. Sharak exact as @image5 grabbing his chest, his eyes bulging in absolute horror as he realizes his charm is missing.",
  "Panel 4: Extreme close-up. Sharak exact as @image5 screaming 'My charm!' in sheer panic, his manic confidence entirely broken."
]);

createPrompt("The Command", "Daytime scene outside the walls.", ['sharak', 'giantNibzu', 'dunes'], [
  "Panel 1: Action shot. Sharak exact as @image5 furiously slaps the hairy flank of the Giant Nibzu exact as @image7.",
  "Panel 2: Close-up. Sharak exact as @image5 screaming at the giant spider exact as @image7, calling it an idiot and ordering it to chase the panther.",
  "Panel 3: Reaction shot. The Giant Nibzu exact as @image7 tilts its head, blinking its crossed amber eyes in silly confusion before realizing the command.",
  "Panel 4: Wide action shot. The Giant Nibzu exact as @image7 suddenly lunges forward into the Desert Dunes exact as @image13, massive legs kicking up a huge sandstorm."
]);

createPrompt("The Comical Chase Begins", "Daytime scene in the dunes.", ['dora', 'giantNibzu', 'dunes'], [
  "Panel 1: Epic chaotic tracking shot. Tiny Dora exact as @image2 sprinting for her life across the Desert Dunes exact as @image13, holding the talisman in her mouth.",
  "Panel 2: Extreme wide shot. The Giant Nibzu exact as @image7 crashing clumsily through the dunes behind her, destroying everything in its path with a goofy smile.",
  "Panel 3: Low angle action shot. One of Nibzu's massive, hairy spider legs exact as @image7 slams into the sand just inches behind the running Dora exact as @image2.",
  "Panel 4: Medium wide tracking shot. Dora exact as @image2 desperately zigzagging through the dunes as the giant spider exact as @image7 stomps behind her."
]);

createPrompt("Sharak Joins the Chase", "Daytime scene in the dunes.", ['sharak', 'dunes'], [
  "Panel 1: Medium shot. Sharak exact as @image5 sprinting desperately on foot behind the giant spider, screaming in the distance.",
  "Panel 2: Low angle tracking shot. Sharak exact as @image5 stumbling through the deep sand of the Desert Dunes exact as @image13, losing his balance in his panic.",
  "Panel 3: Close-up. Sharak's furious face exact as @image5, coated in sweat and dust, his eyes locked desperately onto the fleeing panther.",
  "Panel 4: Extreme wide shot. The comical, chaotic train: tiny Dora leading, the colossal goofy spider chasing, and Sharak running far behind in the dunes."
]);

createPrompt("Aisha Runs to the Hourglass", "Daytime scene at the broken walls.", ['aisha', 'walls', 'hourglass'], [
  "Panel 1: Wide shot. While the chase happens in the distance, Aisha exact as @image1 turns and sprints toward the massive break in the Quazar al Zaman Walls exact as @image12.",
  "Panel 2: Tracking shot. Aisha exact as @image1 running desperately into the Majestic Chamber, the dying Hourglass exact as @image11 towering above her.",
  "Panel 3: Low angle shot. Aisha exact as @image1 falling hard to her knees directly beneath the massive glass bulb of the Hourglass exact as @image11.",
  "Panel 4: Extreme close-up. Aisha's small, trembling hand exact as @image1 reaching out and pressing flat against the cold, colossal glass of the Hourglass exact as @image11."
]);

createPrompt("The Whispered Plea", "Daytime scene inside the chamber.", ['aisha', 'hourglass'], [
  "Panel 1: Emotional close-up. Aisha exact as @image1 resting her forehead against the glass of the Hourglass exact as @image11, her eyes closed, whispering a plea.",
  "Panel 2: Extreme close-up on Aisha's lips exact as @image1. Whispering the words 'Mother... Forgive me. Please... guide me.'",
  "Panel 3: Insert shot. The true Talisman on Aisha's chest exact as @image1 resting perfectly still, glowing faintly in the dim chamber.",
  "Panel 4: Medium shot. Aisha exact as @image1 kneeling completely still, a moment of profound, sacred silence inside the majestic chamber."
]);

createPrompt("The Talisman Awakens", "Daytime scene inside the chamber.", ['aisha', 'hourglass', 'niura'], [
  "Panel 1: Insert shot. The true Talisman on Aisha's chest exact as @image1 begins to glow intensely, shifting from warm to hot, emitting a brilliant luminous light.",
  "Panel 2: Close-up. The tiny snake Niura exact as @image3 lifting her head weakly, looking up at Aisha with awe, bathed in the talisman's light.",
  "Panel 3: Tight two-shot. Niura exact as @image3 whispering to Aisha exact as @image1, asking if she is remembering, or if the ancient magic is remembering her.",
  "Panel 4: Extreme close-up. Aisha's eyes exact as @image1 suddenly unfocus, glowing faintly as if something ancient and powerful is rising from deep within her soul."
]);

// ---------------------------------------------------------
// BEAT 5: The Anthem & The Shield (Prompts 28-32)
// ---------------------------------------------------------
createPrompt("The First Note", "Daytime scene inside the chamber.", ['aisha', 'hourglass'], [
  "Panel 1: Medium shot. Aisha exact as @image1 stands up straight beneath the Hourglass exact as @image11, her posture entirely transformed into one of majestic power.",
  "Panel 2: Close-up. Aisha exact as @image1 opens her mouth, exhaling a breath of pure golden light as she prepares to sing.",
  "Panel 3: Epic low angle shot. Aisha exact as @image1 belting out the first note of a powerful, ancient anthem, her voice echoing visually as ripples of light in the air.",
  "Panel 4: Wide cinematic shot. The moment Aisha exact as @image1 sings, the sand on the chamber floor bursts upward around her in a perfect ring."
]);

createPrompt("The Golden Shield", "Daytime scene inside the chamber.", ['aisha', 'hourglass'], [
  "Panel 1: Dynamic action shot. A massive, swirling cylindrical wall of golden kinetic sand rises rapidly around Aisha exact as @image1 like a magical tornado.",
  "Panel 2: High angle shot. The golden sand wall forms a perfect, impenetrable protective shield around Aisha exact as @image1 beneath the Hourglass exact as @image11.",
  "Panel 3: Close-up on the roaring golden sand wall, thick, heavy, and glowing with ancient magic, isolating Aisha from the outside world.",
  "Panel 4: Wide epic shot. The majestic chamber of the Hourglass exact as @image11 illuminated brilliantly by the towering golden tornado of sand."
]);

createPrompt("Dora Returns", "Daytime scene just outside the sand wall.", ['dora'], [
  "Panel 1: Action tracking shot. Dora exact as @image2 running back toward the chamber, skidding to a violent halt in the sand just outside the rapidly closing golden sand wall.",
  "Panel 2: Medium shot. Dora exact as @image2 violently throws her head, tossing the fake talisman as far away into the dunes as she possibly can.",
  "Panel 3: Slow-motion epic shot. Dora exact as @image2 sprints back and executes a massive, desperate dive directly toward the shrinking opening of the golden sand wall.",
  "Panel 4: Insert shot. Dora's tail exact as @image2 slipping through the gap just a microsecond before the golden wall of sand completely seals shut."
]);

createPrompt("The Calm Inside", "Daytime scene inside the sand shield.", ['aisha', 'dora'], [
  "Panel 1: Wide shot inside the sand cylinder. Absolute peace and silence. The roaring storms outside are completely muffled. Aisha exact as @image1 stands in the center singing.",
  "Panel 2: Medium shot. Dora exact as @image2 panting heavily on the ground, looking up in awe at the peaceful, glowing interior of the sand shield.",
  "Panel 3: Close-up. Aisha exact as @image1 lifting her glowing eyes, looking upward as her song reaches a crescendo.",
  "Panel 4: Cinematic detail shot. The floating, glowing grains of sand swirling gently around Aisha exact as @image1 in the peaceful interior."
]);

createPrompt("The Dissolve", "Daytime scene inside the sand shield.", ['aisha'], [
  "Panel 1: Abstract cinematic shot. The physical world around Aisha exact as @image1 begins to beautifully dissolve into streaks of white and golden light.",
  "Panel 2: Medium shot. Aisha exact as @image1 singing with her eyes closed as the chamber floor dissolves beneath her feet into pure light.",
  "Panel 3: Extreme close-up. Aisha's face exact as @image1 illuminated entirely by the blinding, ethereal light of the transition.",
  "Panel 4: Abstract transition shot. Aisha exact as @image1 floating gracefully through a tunnel of pure, blinding white and golden light."
]);

// ---------------------------------------------------------
// BEAT 6: The Spirit Realm Reunion (Prompts 33-41)
// ---------------------------------------------------------
createPrompt("Entering the Spirit Realm", "Ethereal scene in the Spirit Realm.", ['aisha', 'temple'], [
  "Panel 1: Wide epic reveal. A breathtaking, ethereal sacred hall slowly materializes around Aisha exact as @image1: The Temple of Light exact as @image14.",
  "Panel 2: Downward angle shot. Aisha's feet exact as @image1 touch down gently onto stunning quartz mosaics that shift and shimmer beneath her like living patterns.",
  "Panel 3: Cinematic detail shot. Beautiful motes of light float slowly through the air of the Temple of Light exact as @image14, like drifting souls.",
  "Panel 4: Wide master shot of the Temple of Light exact as @image14. Endless walls of towering, arabesque-laced windows casting soft, intricate light patterns across the glimmering floor."
]);

createPrompt("Walking the Hall", "Ethereal scene in the Temple of Light.", ['aisha', 'temple'], [
  "Panel 1: Medium tracking shot. Aisha exact as @image1 walking slowly through the vast, quiet, and peaceful hall, looking around in absolute awe.",
  "Panel 2: Extreme wide shot down the length of the hall. A faint ethereal melody hums in the air, the light itself seeming to sing.",
  "Panel 3: Tracking shot from behind Aisha exact as @image1, showing the infinite scale and beauty of the glowing quartz floor.",
  "Panel 4: Focus pull. In the far distance at the end of the hall, a lone figure in flowing white stands waiting."
]);

createPrompt("The Mother Revealed", "Ethereal scene in the Temple of Light.", ['aisha', 'zahra', 'temple'], [
  "Panel 1: Medium shot from behind Aisha. At the far end stands Zahra exact as @image9, wearing a flowing white dress adorned with pearls.",
  "Panel 2: Detail shot. Zahra's silky headscarf exact as @image9 catching and bending the ethereal light of the Temple exact as @image14 like flowing water.",
  "Panel 3: Extreme close-up. Aisha exact as @image1 freezing completely in her tracks, her breath catching in her throat, her eyes widening in disbelief.",
  "Panel 4: Close-up on Aisha exact as @image1. Heavy tears instantly spill over her lower eyelids, streaming down her face as she recognizes the figure."
]);

createPrompt("The Hesitation", "Ethereal scene in the Temple of Light.", ['aisha', 'zahra', 'temple'], [
  "Panel 1: Wide shot. Aisha exact as @image1 taking a few slow, trembling steps toward Zahra exact as @image9, the distance between them feeling immense.",
  "Panel 2: Medium shot. Aisha exact as @image1 stopping, her body shaking, unable to move any closer out of overwhelming emotion.",
  "Panel 3: Close-up. Aisha exact as @image1 whispering the word 'Mom...?', her voice incredibly small and fragile.",
  "Panel 4: Medium shot. The figure of Zahra exact as @image9 slowly turns around, her face revealed, her eyes incredibly soft, warm, and radiant."
]);

createPrompt("The Embrace", "Ethereal scene in the Temple of Light.", ['aisha', 'zahra', 'temple'], [
  "Panel 1: Cinematic slow-motion shot. Aisha exact as @image1 breaks into a full, desperate sprint across the glowing floor of the Temple exact as @image14 toward Zahra exact as @image9.",
  "Panel 2: Epic emotional impact shot. Aisha exact as @image1 crashing into Zahra's open arms exact as @image9, collapsing into a desperate, longing hug.",
  "Panel 3: Close-up. Aisha exact as @image1 burying her face deeply into Zahra's chest exact as @image9, sobbing uncontrollably, clutching her mother's white dress.",
  "Panel 4: Tight two-shot. Zahra exact as @image9 wrapping her arms tightly around her daughter, her expression filled with infinite, gentle love."
]);

createPrompt("The Apology", "Ethereal scene in the Temple of Light.", ['aisha', 'zahra', 'temple'], [
  "Panel 1: Close-up. Zahra's hand exact as @image9 gently and rhythmically stroking Aisha's hair exact as @image1 with infinite gentleness.",
  "Panel 2: Over-the-shoulder from Zahra. Aisha exact as @image1 sobbing, confessing she didn't know and apologizing for ruining everything.",
  "Panel 3: Extreme close-up. Zahra exact as @image9 whispering 'My Aisha... my brave girl...', tears of joy in her own eyes.",
  "Panel 4: Medium shot. Aisha exact as @image1 pulling back slightly, still trembling, looking up at her mother with a face full of guilt and fear."
]);

createPrompt("The Reassurance", "Ethereal scene in the Temple of Light.", ['aisha', 'zahra', 'temple'], [
  "Panel 1: Tight two-shot. Zahra exact as @image9 cups Aisha's tear-streaked face exact as @image1 in both of her hands, lifting her gaze gently.",
  "Panel 2: Close-up. Zahra exact as @image9 looking deeply into Aisha's eyes exact as @image1, speaking with profound maternal warmth.",
  "Panel 3: Medium shot. Zahra exact as @image9 telling Aisha that her memories are coming back, and the ancestors are connected through them.",
  "Panel 4: Extreme close-up. Zahra exact as @image9 smiles with radiant, divine warmth, declaring that it's time for the ancestors to wake up."
]);

createPrompt("The Connection", "Ethereal scene in the Temple of Light.", ['aisha', 'zahra', 'temple'], [
  "Panel 1: Cinematic detail shot. Zahra exact as @image9 leaning forward slowly toward Aisha's face exact as @image1.",
  "Panel 2: Close-up profile. Zahra exact as @image9 placing her forehead gently against Aisha's forehead exact as @image1.",
  "Panel 3: Tight two-shot. Both Aisha exact as @image1 and Zahra exact as @image9 with their eyes closed in a moment of pure, profound spiritual connection.",
  "Panel 4: Abstract effect shot. The beautiful quartz mosaics of the Temple exact as @image14 begin to hum deeply and vibrate, glowing with pure golden light."
]);

createPrompt("Dissolving the Temple", "Ethereal scene in the Temple of Light.", ['aisha', 'zahra', 'temple'], [
  "Panel 1: Wide shot. Aisha exact as @image1 and Zahra exact as @image9 standing forehead-to-forehead in the center of the vast, glowing Temple of Light exact as @image14.",
  "Panel 2: Medium shot. Aisha exact as @image1 keeps her eyes closed, absorbing her mother's strength as the white dress of Zahra exact as @image9 turns into swirling sand.",
  "Panel 3: Abstract effect shot. The pillars and windows of the Temple of Light exact as @image14 shattering beautifully into millions of floating light motes.",
  "Panel 4: Extreme wide abstract shot. The entire Temple of Light exact as @image14 violently but beautifully dissolves into a massive vortex of golden sand and light, returning Aisha to the real world."
]);

// ---------------------------------------------------------
// BEAT 7: The Epic Dance of the Sand Guardians (Prompts 42-53)
// ---------------------------------------------------------
createPrompt("The Song Resumes", "Daytime scene outside the Kingdom Walls.", ['aisha', 'dunes'], [
  "Panel 1: Wide shot. Back in reality, Aisha exact as @image1 stands perfectly still within the swirling golden protective sands, her eyes closed, singing the ancient anthem with immense power.",
  "Panel 2: Extreme wide epic shot. In the vast Desert Dunes exact as @image13 surrounding the Kingdom Walls, the ground begins to violently tremble and glow with golden light.",
  "Panel 3: Cinematic low angle shot. The sand from the dunes suddenly erupts upward in massive, elegant geysers, like dancers emerging from water.",
  "Panel 4: Medium tracking shot. The erupting sand begins to solidify in mid-air, taking on towering, humanoid forms made entirely of kinetic, flowing sand."
]);

createPrompt("Birth of the Guardians", "Daytime scene outside the Kingdom Walls.", ['sandGuardian', 'dunes'], [
  "Panel 1: Wide epic reveal. Six colossal Giant Sand Guardians exact as @image8 stand fully formed across the Desert Dunes exact as @image13.",
  "Panel 2: Close-up detail shot. The body of a Giant Sand Guardian exact as @image8, made of kinetic sand, with golden arabesque patterns flowing across its chest like liquid light.",
  "Panel 3: Extreme close-up. The head of a Giant Sand Guardian exact as @image8, faceless, hidden beneath a majestic hood of swirling, glowing golden grains.",
  "Panel 4: Wide master shot. The six Giant Sand Guardians exact as @image8 turning their massive heads simultaneously toward the center where Aisha is singing."
]);

createPrompt("The Circle Forms", "Daytime scene outside the Kingdom Walls.", ['aisha', 'sandGuardian'], [
  "Panel 1: Epic high-angle aerial shot. The six Giant Sand Guardians exact as @image8 walk gracefully toward the center, forming a massive perfect circle around the tiny, glowing figure of Aisha exact as @image1.",
  "Panel 2: Low angle shot from behind Aisha. The colossal, towering legs of the Giant Sand Guardians exact as @image8 dwarfing Aisha exact as @image1 as they encircle her.",
  "Panel 3: Medium close-up. Aisha exact as @image1 singing passionately, her voice guiding the massive beings, her Talisman glowing brightly on her chest.",
  "Panel 4: Wide cinematic shot. The Giant Sand Guardians exact as @image8 begin to move in unison, executing the first step of an incredibly beautiful, slow-motion ancient dance."
]);

createPrompt("The Dance of Wind and Sand", "Daytime scene outside the Kingdom Walls.", ['sandGuardian', 'dunes'], [
  "Panel 1: Dynamic action shot. The Giant Sand Guardians exact as @image8 gracefully sweep their massive arms through the air, moving like dancers made of wind.",
  "Panel 2: Close detail shot. As a Giant Sand Guardian exact as @image8 waves its hand, a cascade of shimmering golden sand streams down from its fingertips like a waterfall of light.",
  "Panel 3: Wide tracking shot. The six Giant Sand Guardians exact as @image8 gliding smoothly across the Desert Dunes exact as @image13 in a synchronized, circular choreography.",
  "Panel 4: Extreme wide shot. The sheer scale and beauty of the dance making the violent storms in the background seem insignificant and small."
]);

createPrompt("The Golden Mandalas", "Daytime scene outside the Kingdom Walls.", ['aisha', 'sandGuardian', 'dunes'], [
  "Panel 1: Low angle shot. A Giant Sand Guardian exact as @image8 drags its glowing kinetic hand across the ground of the Desert Dunes exact as @image13.",
  "Panel 2: Cinematic top-down aerial shot. The Guardians' movements draw massive, glowing golden arabesque mandalas into the sand, forming a beautiful protective circle around Aisha exact as @image1.",
  "Panel 3: Detail shot. The intricate glowing patterns of the sand mandalas shifting, pulsing, and glowing in perfect synchronization with the rhythm of Aisha's song.",
  "Panel 4: Medium shot. Aisha exact as @image1 standing dead center of the glowing mandala, her arms raised slightly, her voice commanding the ancient magic."
]);

createPrompt("Light Piercing the Storm", "Daytime scene outside the Kingdom Walls.", ['aisha', 'sandGuardian'], [
  "Panel 1: Epic sky shot. The thick, violent storm clouds overhead suddenly begin to part in a perfect circle above the dance.",
  "Panel 2: Cinematic wide shot. Brilliant, radiant columns of sunlight pierce down through the broken clouds, illuminating the Giant Sand Guardians exact as @image8 like heavenly spotlights.",
  "Panel 3: Medium shot. A sunbeam hits a Giant Sand Guardian exact as @image8, making the liquid light arabesque patterns on its body sparkle like diamonds.",
  "Panel 4: Close-up. Aisha's face exact as @image1 bathed in the warm, golden sunlight breaking through the storm, her expression one of pure, transcendent peace as she sings."
]);

createPrompt("Floating Sand", "Daytime scene outside the Kingdom Walls.", ['sandGuardian', 'dunes'], [
  "Panel 1: Low angle tracking shot. The Giant Sand Guardians exact as @image8 leap effortlessly into the air, floating gracefully despite their massive size.",
  "Panel 2: Wide epic shot. The six Guardians exact as @image8 suspended in the air above the Desert Dunes exact as @image13, spinning in a beautiful, slow-motion airborne ballet.",
  "Panel 3: Detail shot. Glowing ribbons of golden sand trailing behind the flying Guardians exact as @image8, painting massive glowing arabesque shapes in the sky.",
  "Panel 4: Extreme wide cinematic shot. The entire sky filled with glowing golden patterns of light, swirling around the columns of sunlight, a breathtaking visual spectacle."
]);

createPrompt("The Crescendo", "Daytime scene outside the Kingdom Walls.", ['aisha', 'sandGuardian'], [
  "Panel 1: Extreme close-up. Aisha exact as @image1 hitting a high, powerful note of the epic anthem, her eyes glowing fiercely.",
  "Panel 2: Epic tracking shot. The Giant Sand Guardians exact as @image8 spinning faster in the air, creating a golden hurricane of light around the circle.",
  "Panel 3: Low angle shot. Aisha exact as @image1 bathed in the golden hurricane, her hair flowing violently in the magical wind.",
  "Panel 4: Wide cinematic shot. The entire desert landscape glowing with the intense, radiant light of the golden sand mandalas."
]);

createPrompt("The Mandalas Glow", "Daytime scene outside the Kingdom Walls.", ['aisha', 'sandGuardian'], [
  "Panel 1: Top-down aerial shot. The glowing golden arabesque mandalas on the ground reach maximum brightness, burning like the sun.",
  "Panel 2: Detail shot. The kinetic sand of the Guardians exact as @image8 flowing continuously like a liquid river of light in mid-air.",
  "Panel 3: Medium shot. Aisha exact as @image1 holding the note, her Talisman flaring with blinding, pure white light.",
  "Panel 4: Dynamic action shot. The Giant Sand Guardians exact as @image8 suddenly dive back toward the ground in perfect unison."
]);

createPrompt("The Landing", "Daytime scene outside the Kingdom Walls.", ['aisha', 'sandGuardian'], [
  "Panel 1: Low angle impact shot. The Giant Sand Guardians exact as @image8 land perfectly in unison, slamming their glowing hands into the sand.",
  "Panel 2: Wide impact shot. A massive shockwave of pure golden magic ripples out across the desert from the point of their landing.",
  "Panel 3: Cinematic master shot. The six Giant Sand Guardians exact as @image8 kneeling in a perfect, glowing circle around Aisha exact as @image1, the storms entirely dead.",
  "Panel 4: Close-up. Aisha exact as @image1 slowly lowering her arms, her song gently fading out, breathing heavily as the world is bathed in beautiful golden sunlight."
]);

createPrompt("The Beautiful Silence", "Daytime scene outside the Kingdom Walls.", ['aisha', 'sandGuardian'], [
  "Panel 1: Medium shot. Aisha exact as @image1 standing peacefully in the glowing circle, the magical sand wall around her dissolving into calm breeze.",
  "Panel 2: Wide shot. The kneeling Giant Sand Guardians exact as @image8 remaining perfectly still like majestic statues of golden sand.",
  "Panel 3: High angle shot. The glowing mandalas on the ground slowly fading from burning bright to a soft, pulsing golden glow.",
  "Panel 4: Close-up. Aisha exact as @image1 opening her eyes, her face serene, filled with the strength of her ancestors."
]);

createPrompt("The Guardians Rise", "Daytime scene outside the Kingdom Walls.", ['aisha', 'sandGuardian'], [
  "Panel 1: Low angle shot. The six Giant Sand Guardians exact as @image8 slowly stand up from their kneeling positions in perfect synchronization.",
  "Panel 2: Epic wide shot. The towering Guardians exact as @image8 standing in a massive, protective ring around the Quazar al Zaman Walls.",
  "Panel 3: Detail shot. The faceless, hooded heads of the Guardians exact as @image8 turning away from Aisha, looking out toward the desert.",
  "Panel 4: Over-the-shoulder from Aisha exact as @image1. Looking up at the colossal, glowing backs of her majestic Sand Guardians exact as @image8."
]);

// ---------------------------------------------------------
// BEAT 8: Sharak's Terror & The Golden Spider (Prompts 54-59)
// ---------------------------------------------------------
createPrompt("The Useless Charm", "Daytime scene in the dunes.", ['sharak', 'dunes'], [
  "Panel 1: Medium shot. Far away from the dance, Sharak exact as @image5 scrambles desperately in the sand, picking up the Fake Talisman Dora threw.",
  "Panel 2: Close-up. Sharak exact as @image5 shaking the Fake Talisman violently, looking frantic, whispering to it.",
  "Panel 3: Extreme close-up. Sharak's face exact as @image5 twisting into furious, unraveling panic as he screams at the charm to obey him.",
  "Panel 4: Low angle shot. The sand around Sharak's boots exact as @image5 suddenly bursts upward, swirling in tight, aggressive spirals."
]);

createPrompt("The Panic", "Daytime scene in the dunes.", ['sharak', 'dunes'], [
  "Panel 1: Wide shot. Small, roaring tornadoes of sand form all around Sharak exact as @image5 in the Desert Dunes exact as @image13, each rising higher and wider.",
  "Panel 2: Medium shot. Sharak exact as @image5 screams in terror, throwing the useless Fake Talisman away and trying to run.",
  "Panel 3: Slow-motion detail shot. Sharak's legs exact as @image5 sinking deeply into the shifting sand, struggling forward as if the dunes are pulling him down.",
  "Panel 4: Action shot. Sharak exact as @image5 falling hard onto his back in the sand, breathless and completely defeated."
]);

createPrompt("Nibzu Surrounded", "Daytime scene in the dunes.", ['giantNibzu', 'sandGuardian', 'sharak'], [
  "Panel 1: POV shot from Sharak on the ground. Looking up in terror at the massive, glowing forms of the Giant Sand Guardians exact as @image8 approaching.",
  "Panel 2: Wide shot. The Giant Nibzu spider exact as @image7 pauses, tilting its head to watch its master flee, maintaining its goofy, amused smile.",
  "Panel 3: Epic wide shot. The six Giant Sand Guardians exact as @image8 silently and gracefully form a massive circle around the Giant Nibzu exact as @image7.",
  "Panel 4: Action shot. The Giant Nibzu exact as @image7 snaps its huge fangs at one of the Guardians, but the Guardian exact as @image8 effortlessly glides backward like wind, dodging the attack."
]);

createPrompt("The Transformation Begins", "Daytime scene in the dunes.", ['giantNibzu', 'sandGuardian'], [
  "Panel 1: Medium tracking shot. The Giant Sand Guardians exact as @image8 move with fluid grace around the spider, flicking bright sparks of golden sand from their fingertips.",
  "Panel 2: Macro detail shot. The golden sparks land on the hairy leg of the Giant Nibzu exact as @image7. Instantly, 'liquid warp gold' begins flowing across its leg like reverse lava.",
  "Panel 3: Medium shot. The liquid gold crawls rapidly upward in shimmering streams, solidifying the spider's dark leg into polished gold.",
  "Panel 4: Reaction shot. The Giant Nibzu exact as @image7 looking down at its own legs with its crossed amber eyes, looking deeply confused but still smiling goofy."
]);

createPrompt("The Golden Spider", "Daytime scene in the dunes.", ['giantNibzu'], [
  "Panel 1: Wide action shot. The liquid gold overtakes the entire massive body of the Giant Nibzu exact as @image7, freezing it perfectly in place.",
  "Panel 2: Cinematic detail shot. The texture of the spider's body transforming from dark hair into a massive, majestic Golden Statue, carved with delicate arabesque patterns.",
  "Panel 3: Extreme close-up. The sunlight hits the newly formed golden arabesque jewelry on the spider's face, catching the light beautifully.",
  "Panel 4: Epic master shot. The massive, beautiful Golden Statue of the spider exact as @image7 towering peacefully over the dunes, completely neutralized."
]);

createPrompt("Sharak Watches", "Daytime scene in the dunes.", ['sharak', 'giantNibzu'], [
  "Panel 1: Medium shot. Sharak exact as @image5 lying flat on his back in the sand, his chest heaving, staring in absolute horror at the statue.",
  "Panel 2: Point of View shot from Sharak. Looking up at the colossal, blindingly beautiful Golden Statue of the spider exact as @image7.",
  "Panel 3: Close-up. Sharak's eyes exact as @image5 trembling, his manic confidence utterly shattered by the sheer power of the ancient magic.",
  "Panel 4: Wide shot. Sharak exact as @image5 attempting to stagger to his feet, weak and defeated in the endless dunes."
]);

// ---------------------------------------------------------
// BEAT 9: The Appearance of Zahra's Spirit (Prompts 60-65)
// ---------------------------------------------------------
createPrompt("Aisha Approaches", "Daytime scene in the dunes.", ['aisha', 'sharak'], [
  "Panel 1: Medium wide shot. Sharak exact as @image5 tries to stagger to his feet, panting heavily, his fists glowing weakly with fresh dark plasma.",
  "Panel 2: Low angle tracking shot. Aisha exact as @image1 stepping calmly and fearlessly toward him, tiny but entirely unyielding.",
  "Panel 3: Close-up. Aisha's face exact as @image1, steady and brave, the Talisman glowing brightly on her chest, telling him she isn't afraid.",
  "Panel 4: Extreme close-up. Sharak exact as @image5 snarling, confused and furious, his glowing plasma fists trembling as he prepares to strike her."
]);

createPrompt("The Power of the Talisman", "Daytime scene in the dunes.", ['aisha', 'sharak'], [
  "Panel 1: Insert shot. Aisha's Talisman exact as @image1 flares with a sudden, blinding flash of pure white magic.",
  "Panel 2: Wide cinematic shot. The ground hums violently. The blast of pure light washes over Sharak exact as @image5.",
  "Panel 3: Close-up on Sharak's hands exact as @image5. The dark plasma magic surrounding his fists instantly fades and dies out like wet embers.",
  "Panel 4: Medium shot. Sharak exact as @image5 flinching, stepping backward, realizing he is completely powerless against her light."
]);

createPrompt("The Guardians Kneel", "Daytime scene in the dunes.", ['sandGuardian', 'aisha'], [
  "Panel 1: Wide shot. A soft, powerful whirl of wind rises directly behind Aisha exact as @image1.",
  "Panel 2: Epic wide shot. The six Giant Sand Guardians exact as @image8 simultaneously drop to one knee in a gesture of ultimate, reverent respect.",
  "Panel 3: Cinematic abstract shot. The kneeling Giant Sand Guardians exact as @image8 beautifully and silently dissolve back into ordinary golden sand, blowing away in the breeze.",
  "Panel 4: Reaction shot. Sharak exact as @image5 staring over Aisha's shoulder, his breath going completely hollow, his eyes widening to their absolute limit in shock."
]);

createPrompt("The Spirit Rises", "Daytime scene in the dunes.", ['zahraSpirit', 'aisha', 'dunes'], [
  "Panel 1: Extreme wide epic reveal. Behind Aisha, the Giant Spirit of Zahra exact as @image10 blossoms out of the breeze, towering majestically over the Desert Dunes exact as @image13.",
  "Panel 2: Low angle majestic shot. The Giant Spirit of Zahra exact as @image10 rising higher than the dunes, her body made of shimmering pearlescent white sand and diamond dust.",
  "Panel 3: Cinematic detail shot. The glowing silver arabesque patterns on the rims of the Spirit's flowing sand robes exact as @image10 shining brilliantly in the sun.",
  "Panel 4: Reaction shot. Aisha exact as @image1 gasps, tears spilling from her eyes, turning around to see the colossal, beautiful spirit of her mother towering behind her."
]);

createPrompt("The Translator", "Daytime scene in the dunes.", ['zahraSpirit', 'aisha', 'sharak'], [
  "Panel 1: Epic wide master shot. The colossal Spirit exact as @image10 leans over tiny Aisha exact as @image1, one massive sand-hand hovering around her in a protective embrace.",
  "Panel 2: Detail shot. The rims of the Spirit's flowing sand robes exact as @image10 begin to glow with intense, warm golden light.",
  "Panel 3: Medium shot. Aisha exact as @image1 turns back to face Sharak. She feels the meaning flowing through her, acting as the translator for the giant Spirit.",
  "Panel 4: Close-up on Aisha exact as @image1. Her voice calm and carrying her mother's strength, she asks Sharak what he chooses now that Zahra is here."
]);

// ---------------------------------------------------------
// BEAT 10: The Surrender & Restoration (Prompts 66-70)
// ---------------------------------------------------------
createPrompt("The Collapse of Rage", "Daytime scene in the dunes.", ['sharak', 'zahraSpirit'], [
  "Panel 1: Medium shot. Sharak's posture entirely collapses. All his manic rage evaporates in an instant. He suddenly looks like a broken, old, tired man.",
  "Panel 2: Close-up on Sharak's face exact as @image5. He whispers the name 'Zahra...', his voice breaking completely, a single tear falling down his cheek.",
  "Panel 3: OTS shot from Aisha. Sharak exact as @image5 looks around at the broken Quazar al Zaman Walls and the ruined dunes, shaking his head in sorrow.",
  "Panel 4: Close-up. Sharak exact as @image5 looking up at the Spirit with trembling lips, his voice raising through the wind, crying that everything he did was for Zahra."
]);

createPrompt("The Pleading", "Daytime scene in the dunes.", ['sharak', 'zahraSpirit'], [
  "Panel 1: Extreme close-up. Sharak exact as @image5 whispering that he doesn't belong in this world without her.",
  "Panel 2: Low angle shot. Sharak exact as @image5 lifting his trembling hand high into the air, reaching desperately toward the towering Spirit exact as @image10, pleading to be taken with her.",
  "Panel 3: Epic slow-motion shot. The colossal Giant Spirit of Zahra exact as @image10 slowly extends her massive, shimmering hand of pearlescent sand down toward Sharak.",
  "Panel 4: Extreme macro cinematic shot. Sharak's human fingers exact as @image5 gently touching the swirling, diamond-dust fingers of the massive Spirit exact as @image10."
]);

createPrompt("The Dissolution", "Daytime scene in the dunes.", ['sharak', 'zahraSpirit'], [
  "Panel 1: Close-up on Sharak's face exact as @image5. He exhales deeply, his eyes closing, a look of profound, peaceful relief washing over him as the last weight leaves his chest.",
  "Panel 2: Cinematic magical shot. From the fingertips down, Sharak's body exact as @image5 begins to beautifully dissolve into glowing, pure golden sand.",
  "Panel 3: Epic wide shot. Both the towering Spirit of Zahra exact as @image10 and the small figure of Sharak exact as @image5 dissolve completely into a massive cloud of swirling golden sand together.",
  "Panel 4: Tracking sky shot. The beautiful, shimmering cloud of golden dust carried gracefully by the wind, flying high through the air toward the broken Hourglass Chamber."
]);

createPrompt("The Hourglass Restored", "Daytime scene inside the chamber.", ['hourglass', 'walls'], [
  "Panel 1: Wide cinematic shot inside the broken chamber. The massive cloud of golden sand flows smoothly into the open top bulb of the colossal Hourglass exact as @image11.",
  "Panel 2: Extreme close-up. The top bulb of the Hourglass exact as @image11 filling up rapidly with glowing, warm golden sand.",
  "Panel 3: Detail shot. The heavy, steady, perfect flow of sand restarting through the neck of the Hourglass exact as @image11, restoring the flow of time.",
  "Panel 4: Epic wide shot. The Hourglass exact as @image11 glowing incredibly bright and warm, illuminating the entire majestic chamber of the Quazar al Zaman Walls exact as @image12."
]);

createPrompt("Balance Restored", "Daytime scene in the dunes.", ['aisha', 'dora', 'niura'], [
  "Panel 1: Epic wide exterior shot. The dark storm clouds completely part, revealing a brilliant, crystal-clear blue sky. Brilliant sunbeams bathe the majestic golden spider statue in the dunes.",
  "Panel 2: Medium shot. Dora exact as @image2 and Niura exact as @image3 looking in awe at the clear sky, Dora asking if Sharak is just gone like that.",
  "Panel 3: Tight two-shot. Aisha exact as @image1 smiling quietly, saying he mended what he broke. Dora exact as @image2 presses her furry forehead affectionately to Aisha's cheek.",
  "Panel 4: Final emotional close-up. Aisha exact as @image1 looking up at the sky with a gentle smile of peace, the tiny snake Niura exact as @image3 curled safely around her neck. Fade out."
]);

console.log('Successfully generated 70 Act 10 Ancestors prompts.');
