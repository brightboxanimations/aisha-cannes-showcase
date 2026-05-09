import fs from 'fs';
import path from 'path';

const tasksDir = path.join(process.cwd(), 'public', 'assets', 'storyboard', 'tasks', 'current');
if (!fs.existsSync(tasksDir)) fs.mkdirSync(tasksDir, { recursive: true });

const openingTag = `premium luminous 3D animated feature-film, true 3D depth, cinematic camera angles, volumetric light, little tiny dust motes, soft depth of field, expressive animated 3D eyes of all characters, realistic textures, true depth of field, focus on the foreground characters and objects with shallow cinematic 3d depth of field, detailed clear emotional staging, high-quality 4K animated movie look.`;

const closingTag = `All panels must be consistent between each other as to the backgrounds, positioning and characters as one beat-to-beat story. Style: premium luminous 3D animated feature-film, true 3D depth, cinematic camera angles, volumetric light, little tiny dust motes, soft depth of field, expressive animated 3D eyes of all characters, realistic textures, true depth of field, focus on the foreground characters and objects with shallow cinematic 3d depth of field, detailed clear emotional staging, high-quality 4K animated movie look.`;

const locks = {
  aisha: `@image1 = Aisha, 16-year-old human princess, curious brave beautiful, exact as the reference; no modification to looks or clothes.`,
  dora: `@image2 = Dora, white panther, normal panther size, her height reaches Aisha's hip, exact as the reference.`,
  plasma: `@image3 = Plasma character, glowing human-like plasma entity made of golden-orange energy, exact as reference.`,
  sharak: `@image4 = Sharak, shadow king with magic powers, fierce and insane, exact as reference.`,
  sharakLegs: `@image5 = Sharak with 8 massive obsidian-lava spider legs erupting from his back, exact as reference.`,
  nibzu: `@image6 = Nibzu, spider sidekick, exact as reference.`,
  room: `@image7 = Sharak room, 100% unchanged architecture, lighting, scale, table, walls, windows.`,
  corridor: `@image8 = Sharak corridor, dark obsidian and marble walls, tall arabesque standing lamps, 100% unchanged architecture.`,
  humanPrince: `@image9 = Human Prince, pale and exhausted, wearing same clothes as Plasma character but without any glowing light, exact as human face reference.`,
  exterior: `@image10 = Sharak Palace exterior, huge dark architecture against a stormy day sky with piercing light, 100% unchanged.`
};

const prompts = [
  {
    title: '1. Sharak\'s Mad Monologue',
    scene: "Daytime stormy scene inside Sharak's room. Sharak triumphantly explains he turned to dark magic to bring back Aisha's mother. The tiny spider Nibzu is comically pretending to be ashamed.",
    locks: [locks.aisha, locks.sharak, locks.nibzu, locks.room],
    panels: [
      "Panel 1: Medium shot. Sharak exact as @image4 stands near the center of the room exact as @image7, raising his hands triumphantly with an insane look, Aisha exact as @image1 looking at him in shock from the left.",
      "Panel 2: Extreme close-up on Sharak's face exact as @image4, looking furious and mad, eyes wide, spit flying as he yells about his lost love. The camera framing feels slightly imperfect and documentary-like.",
      "Panel 3: Low angle insert shot. The tiny spider Nibzu exact as @image6 sits on the floor near Sharak's boots, covering its eyes with its front paws in comical, pretend shame.",
      "Panel 4: Tight two-shot. Aisha exact as @image1 backs away slightly, her face showing pure horror and realization, while Sharak exact as @image4 glares at her."
    ]
  },
  {
    title: '2. The Golden Plasma Cage',
    scene: "Daytime scene in Sharak's room. Sharak traps the white panther Dora in a giant cage made of glowing liquid plasma bars. Chaotic, raw motion.",
    locks: [locks.aisha, locks.dora, locks.sharak, locks.room],
    panels: [
      "Panel 1: Wide shot in the room exact as @image7. Sharak exact as @image4 violently thrusts his hand toward Dora exact as @image2. A large cage of glowing, golden liquid plasma bars bursts from the ground around the panther.",
      "Panel 2: Shaky medium shot. Dora exact as @image2 is trapped inside the giant glowing plasma cage, looking completely helpless and terrified, trying to bite the burning energy bars.",
      "Panel 3: OTS shot from behind Aisha exact as @image1, clutching her chest looking at Dora exact as @image2 in the cage. Sharak exact as @image4 throws his head back laughing madly.",
      "Panel 4: High-tension POV close-up from INSIDE the plasma cage. Dora exact as @image2 looks out through the glowing golden plasma bars in absolute horror at Sharak exact as @image4. The framing is tilted and unstaged, capturing the panic."
    ]
  },
  {
    title: '3. The Djinn Protects',
    scene: "Daytime scene in Sharak's room. The Plasma character intuitively steps in between Sharak and Aisha to protect her. Sharak becomes even more furious seeing their love.",
    locks: [locks.aisha, locks.plasma, locks.sharak, locks.room],
    panels: [
      "Panel 1: Medium master shot. The Plasma character exact as @image3 steps boldly in front of Aisha exact as @image1, extending a glowing arm to physically shield her from Sharak exact as @image4.",
      "Panel 2: Extreme close-up on the Plasma character exact as @image3, his expression fiercely overprotective, strained, and determined, glaring down the shadow king with burning eyes.",
      "Panel 3: OTS shot from behind the Plasma character exact as @image3. Sharak exact as @image4 looks at them, his face boiling with extreme frustration, jealousy, and pure hatred at the sight of their love.",
      "Panel 4: High angle wide shot. Sharak exact as @image4 begins to convulse with violent rage, dark energy swirling in the room exact as @image7, while the Plasma character exact as @image3 stands firm."
    ]
  },
  {
    title: '4. Sharak\'s Transformation',
    scene: "Daytime scene near the arched doorway. Sharak roars 'Look what you made me become!' and grows 8 massive obsidian-lava spider legs. Aisha backs up to the corridor door in panic.",
    locks: [locks.aisha, locks.plasma, locks.sharakLegs, locks.room],
    panels: [
      "Panel 1: Wide, tilted Dutch-angle shot near the arched doorway of the room exact as @image7. Sharak exact as @image5 screams in agony as 8 massive, terrifying obsidian-lava spider legs violently erupt from his back.",
      "Panel 2: Low angle tracking shot. Sharak exact as @image5 looms huge with his giant spider legs crashing into the ceiling, looking absolutely insane and monstrous.",
      "Panel 3: Handheld medium shot. Aisha exact as @image1 stumbles backwards into the arched doorway leading to the corridor, looking up in absolute, hyper-realistic terror, breathing heavily.",
      "Panel 4: Tight two-shot. The Plasma character exact as @image3 grabs Aisha's arm exact as @image1, desperately pulling her back into the arched doorway to escape the towering Sharak exact as @image5."
    ]
  },
  {
    title: '5. Nibzu Grows & The Room Shatters',
    scene: "Daytime scene inside the room. Sharak sends magic into Nibzu. The tiny spider mutates into a giant beast, crushing furniture. Aisha and Dora react in sheer shock.",
    locks: [locks.sharakLegs, locks.nibzu, locks.aisha, locks.dora, locks.room],
    panels: [
      "Panel 1: Medium shot. Sharak exact as @image5 stomps a massive spider leg, sending a wave of fiery, glowing magic into the tiny spider Nibzu exact as @image6.",
      "Panel 2: Wide chaotic shot in the room exact as @image7. Nibzu exact as @image6 rapidly mutates, growing to the height of a window, clumsily crushing the large wooden table and shattering the stone floor.",
      "Panel 3: Reaction close-up. Aisha exact as @image1 covers her mouth in absolute shock, eyes wide with disbelief as she witnesses the impossible growth of the giant spider.",
      "Panel 4: Reaction close-up from inside the plasma cage. Dora exact as @image2 flattens her ears back, her fur standing on end, staring in pure animalistic horror at the giant Nibzu exact as @image6 towering over her."
    ]
  },
  {
    title: '6. Dora Escapes the Carnage',
    scene: "Daytime scene in the room. Giant Nibzu clumsily crashes around, completely destroying the room and shattering the golden plasma cage. Dora scrambles for her life.",
    locks: [locks.dora, locks.nibzu, locks.room],
    panels: [
      "Panel 1: Wide shot of destruction. The giant spider Nibzu exact as @image6 clumsily steps through the room exact as @image7, accidentally smashing the arched doorway into rubble and completely shattering the golden plasma cage.",
      "Panel 2: Low angle ground shot, motion blur. The white panther Dora exact as @image2, looking comically terrified, sprints desperately for her life underneath the massive, moving legs of Nibzu exact as @image6.",
      "Panel 3: Handheld tracking shot. Dora exact as @image2 runs frantically over the crushed rubble of the arched doorway, dust and debris flying everywhere.",
      "Panel 4: Extreme close-up POV from under the spider. Dora exact as @image2 looks up in visceral horror at the giant, hairy underbelly of Nibzu exact as @image6 before scrambling to safety."
    ]
  },
  {
    title: '7. Aisha and Dora in the Corridor',
    scene: "Daytime scene in the dark obsidian corridor. Aisha and Dora stand helplessly near a large window, trapped and terrified.",
    locks: [locks.aisha, locks.dora, locks.corridor],
    panels: [
      "Panel 1: Medium wide shot in the corridor exact as @image8. Aisha exact as @image1 and Dora exact as @image2 stand pressed hard against the obsidian wall near a large window, looking back toward the destroyed archway.",
      "Panel 2: Extreme close-up. Aisha exact as @image1 clutches her hands to her chest, tears streaming down her dirty face, hyperventilating in fear, while Dora exact as @image2 snarls protectively at her side.",
      "Panel 3: High angle shot showing both sides of the corridor exact as @image8, highlighting the massive destruction spreading from the archway, with Aisha exact as @image1 trapped near the window.",
      "Panel 4: Close-up on Aisha's face exact as @image1, heavily lit by the dramatic daylight coming through the window, her expression filled with urgent desperation and panic."
    ]
  },
  {
    title: '8. The Epic Corridor Battle',
    scene: "Daytime scene in the corridor. A raw, destructive battle. Sharak tears the walls apart. The Plasma character fights back with everything he has.",
    locks: [locks.plasma, locks.sharakLegs, locks.corridor],
    panels: [
      "Panel 1: Wide epic battle shot in the corridor exact as @image8. Sharak exact as @image5 stomps his massive spider legs into the walls, tearing down the tall arabesque standing lamps and shattering the obsidian.",
      "Panel 2: Dynamic shaky-cam tracking shot. The Plasma character exact as @image3 floats horizontally in the air, his face contorted in anger and strain, dodging a massive chunk of falling debris.",
      "Panel 3: Over-the-shoulder from Sharak exact as @image5. He throws a furious, destructive magical strike down the corridor exact as @image8, completely annihilating the marble pillars.",
      "Panel 4: Fast-paced, unstaged action shot. The Plasma character exact as @image3 swoops low along the glowing cracks on the destroyed floor, his golden energy fiercely pushing back against the dark magic."
    ]
  },
  {
    title: '9. The Plasma Balls of Destruction',
    scene: "Daytime scene in the corridor. Sharak hurls a liquid plasma ball. The exhausted Plasma character catches it mid-air in slow motion, his face showing extreme strain and pain.",
    locks: [locks.plasma, locks.sharakLegs, locks.corridor],
    panels: [
      "Panel 1: Medium shot, extreme destruction. Sharak exact as @image5 conjures a seething, liquid plasma sphere—orange with a golden glow—and hurls it violently down the shattered corridor exact as @image8.",
      "Panel 2: Slow-motion action shot. The Plasma character exact as @image3 leaps forward, catching the heavy liquid plasma ball mid-air with both bare hands, the impact creating a shockwave.",
      "Panel 3: Extreme close-up on the Plasma character exact as @image3. His face is trembling, utterly exhausted, screaming in pain, teeth gritted as he strains against the incredible burning force pushing him backward.",
      "Panel 4: Medium wide shot. The Plasma character exact as @image3 floats in the ruined corridor exact as @image8, his golden aura heavily depleted, desperately holding back the glowing orange liquid sphere."
    ]
  },
  {
    title: '10. Djinn\'s Final Sacrifice',
    scene: "Daytime scene in the corridor near the window. The Djinn screams 'Aisha, RUN!' and throws the plasma ball toward the window. The window shatters outward in slow motion.",
    locks: [locks.plasma, locks.aisha, locks.corridor],
    panels: [
      "Panel 1: Close-up, raw emotion. The Plasma character exact as @image3 turns his trembling, glowing head toward Aisha exact as @image1, his eyes wide, screaming desperately for her to run.",
      "Panel 2: Action insert. The Plasma character exact as @image3 unleashes a massive, blinding wave of light, violently redirecting the liquid plasma ball toward the large glass window of the corridor exact as @image8.",
      "Panel 3: Slow-motion cinematic wide shot. The heavy glass of the corridor window shatters outward into thousands of sparkling shards as the plasma ball explodes through it in a fiery blast.",
      "Panel 4: Close-up on Aisha exact as @image1, shielding her face with her arms as the intense, explosive bright light washes over her, tears flying from her eyes."
    ]
  },
  {
    title: '11. The Golden Arabesque Light Path',
    scene: "Daytime exterior. A magical, glowing light path made of golden, blue, and indigo arabesque patterns forms like a long carpet from the shattered window out into the stormy desert dunes.",
    locks: [locks.exterior, locks.corridor],
    panels: [
      "Panel 1: Epic wide exterior shot. From the shattered window of the Sharak Palace exterior exact as @image10, a brilliant path of light shoots outward perpendicular to the dark, smoking wall.",
      "Panel 2: High angle shot looking down. The light path resembles a long carpet made of glowing golden, blue, and indigo arabesque patterns, stretching far into the violent, stormy desert.",
      "Panel 3: Cinematic detail shot. The intricate, glowing indigo and gold arabesque patterns of the light bridge solidify in mid-air, contrasting beautifully against the dark, stormy sky of the exterior exact as @image10.",
      "Panel 4: Wide master shot of the Sharak Palace exterior exact as @image10, showing the glowing light bridge extending dramatically into the horizon, offering a desperate escape route."
    ]
  },
  {
    title: '12. Djinn Collapses',
    scene: "Daytime scene in the ruined corridor. The Plasma character's defense breaks. He is slammed into the wall, his glow flickers out, and he transforms back into the pale, human Prince.",
    locks: [locks.plasma, locks.humanPrince, locks.sharakLegs, locks.corridor],
    panels: [
      "Panel 1: Brutal action shot. The remaining magical force slams the exhausted Plasma character exact as @image3 violently against the destroyed obsidian wall of the corridor exact as @image8.",
      "Panel 2: Slow-motion emotional shot. The Plasma character exact as @image3 slides down the wall to the floor, his golden glow flickering, sputtering, and completely dying out.",
      "Panel 3: Heartbreaking close-up. The character transforms into the Human Prince exact as @image9, lying unmoving on the rubble, extremely pale, bruised, and devoid of light, wearing his human face.",
      "Panel 4: OTS shot from behind the fallen Human Prince exact as @image9, looking down the ruined corridor exact as @image8 at Sharak exact as @image5, who is laughing madly in cruel triumph."
    ]
  },
  {
    title: '13. The Urgent Escape',
    scene: "Daytime scene in the corridor near the shattered window. Aisha refuses to leave, crying toward the fallen human Prince. Dora the panther urges her to run.",
    locks: [locks.aisha, locks.dora, locks.humanPrince, locks.corridor],
    panels: [
      "Panel 1: Medium shot, heavy emotion. Aisha exact as @image1 drops to her knees near the lifeless Human Prince exact as @image9 in the dusty corridor exact as @image8, sobbing hysterically and refusing to leave him.",
      "Panel 2: Tight two-shot. The white panther Dora exact as @image2 nudges Aisha exact as @image1 forcefully, biting her sleeve, looking at her with frantic urgency.",
      "Panel 3: Low angle wide shot. Aisha exact as @image1 looks up with a dirty, tear-streaked face, while Dora exact as @image2 stands ready to leap out of the shattered window onto the light path.",
      "Panel 4: Extreme close-up on Aisha exact as @image1, her face an agonizing mix of pure heartbreak and desperate resolve, looking one last time at the Human Prince exact as @image9."
    ]
  },
  {
    title: '14. Running on the Light Path',
    scene: "Daytime exterior. Aisha and Dora sprint along the glowing arabesque light path outside. The giant spider Nibzu crashes through the palace wall to chase them.",
    locks: [locks.aisha, locks.dora, locks.nibzu, locks.exterior],
    panels: [
      "Panel 1: Epic dynamic tracking shot. Aisha exact as @image1 and Dora exact as @image2 sprint desperately across the glowing golden-blue arabesque light path extending from the palace exterior exact as @image10.",
      "Panel 2: Insane action shot. The giant, towering spider Nibzu exact as @image6 violently smashes entirely through the stone wall of the Sharak Palace exterior exact as @image10, raining huge boulders down as he climbs out to chase them.",
      "Panel 3: Front-facing tracking shot, shaky cam. Aisha exact as @image1 runs toward the camera, crying but determined, with Dora exact as @image2 sprinting right beside her on the glowing light path.",
      "Panel 4: High angle shot looking back. Aisha exact as @image1 and Dora exact as @image2 run for their lives along the light bridge while the massive, terrifying dark shape of Nibzu exact as @image6 looms on the crumbling palace wall behind them."
    ]
  },
  {
    title: '15. The Chaos Below',
    scene: "Daytime exterior. The light bridge begins to collapse behind them. Below, the desert is in chaos with storms tearing villages apart and lightning cracking the sky.",
    locks: [locks.aisha, locks.dora, locks.exterior],
    panels: [
      "Panel 1: Extreme wide cinematic shot. The Sharak Palace exterior exact as @image10 stands against a violent stormy sky with piercing rays of daylight. The fragile light bridge stretches over a chaotic, storm-torn desert below.",
      "Panel 2: Low angle tracking shot from behind. Aisha exact as @image1 and Dora exact as @image2 sprint along the light path, as the glowing arabesque sections of the bridge violently crumble into glowing dust immediately behind their running feet.",
      "Panel 3: Wide aerial shot. Lightning cracks brutally across the daytime sky above the Sharak Palace exterior exact as @image10, the desert below them swirling in chaotic, destructive storm winds.",
      "Panel 4: Epic final master shot. Aisha exact as @image1 and Dora exact as @image2 running on the fading light bridge, a tiny speck of glowing golden-indigo hope against the massive, terrifying scale of the storm and the dark palace."
    ]
  }
];

let counter = 1;
for (const p of prompts) {
  const fullPrompt = `${openingTag}\n\nCHARACTER AND LOCATION LOCKS:\n${p.locks.join('\n')}\n\nSCENE: ${p.scene}\n\nCreate 2x2 grid with 4 panels with 3D animated scenes in each one:\n${p.panels.join('\n')}\n\n${closingTag}`;
  
  const taskJson = {
    id: `task-battle-${Date.now()}-${counter}`,
    title: p.title,
    prompt: fullPrompt,
    status: 'todo',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    passes: [],
    generatedImages: [],
    skillHint: 'skill-codex-2x2-grid-prompt'
  };
  
  fs.writeFileSync(path.join(tasksDir, `${taskJson.id}.json`), JSON.stringify(taskJson, null, 2));
  counter++;
}

console.log('Successfully generated 15 battle sequence tasks.');
