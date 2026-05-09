const fs = require('fs');
const path = require('path');

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
      "Panel 2: Close-up on Sharak's face exact as @image4, looking furious and mad, eyes wide, as he yells about his lost love, the background slightly blurred.",
      "Panel 3: Low angle insert shot. The tiny spider Nibzu exact as @image6 sits on the floor near Sharak's boots, covering its eyes with its front paws in comical, pretend shame.",
      "Panel 4: Tight two-shot. Aisha exact as @image1 backs away slightly, her face showing horror and realization, while Sharak exact as @image4 glares at her."
    ]
  },
  {
    title: '2. The Golden Plasma Cage',
    scene: "Daytime scene in Sharak's room. Sharak traps the white panther Dora in a giant cage made of glowing liquid plasma bars.",
    locks: [locks.aisha, locks.dora, locks.sharak, locks.room],
    panels: [
      "Panel 1: Wide shot in the room exact as @image7. Sharak exact as @image4 points his hand toward Dora exact as @image2. A large cage of glowing, golden liquid plasma bars forms around the panther.",
      "Panel 2: Medium shot. Dora exact as @image2 is trapped inside the giant glowing plasma cage, looking helpless and frightened, trying to bite the energy bars.",
      "Panel 3: OTS shot from behind Aisha exact as @image1, looking at Dora exact as @image2 in the cage. Sharak exact as @image4 laughs madly in the background.",
      "Panel 4: Close-up POV from inside the cage. Dora exact as @image2 looks out through the glowing golden plasma bars at Sharak exact as @image4 who is mocking them."
    ]
  },
  {
    title: '3. The Djinn Protects',
    scene: "Daytime scene in Sharak's room. The Plasma character intuitively steps in between Sharak and Aisha to protect her. Sharak becomes even more furious seeing their love.",
    locks: [locks.aisha, locks.plasma, locks.sharak, locks.room],
    panels: [
      "Panel 1: Medium master shot. The Plasma character exact as @image3 steps boldly in front of Aisha exact as @image1, extending a glowing arm to shield her from Sharak exact as @image4.",
      "Panel 2: Close-up on the Plasma character exact as @image3, his expression fiercely overprotective and determined, staring down the shadow king.",
      "Panel 3: OTS shot from behind the Plasma character exact as @image3. Sharak exact as @image4 looks at them, his face boiling with extreme frustration and hatred at the sight of their love.",
      "Panel 4: High angle wide shot. Sharak exact as @image4 begins to convulse with rage, the room exact as @image7 feeling oppressive, while the Plasma character exact as @image3 stands firm shielding Aisha exact as @image1."
    ]
  },
  {
    title: '4. Sharak\'s Transformation',
    scene: "Daytime scene near the arched doorway. Sharak roars 'Look what you made me become!' and grows 8 massive obsidian-lava spider legs. Aisha backs up to the corridor door.",
    locks: [locks.aisha, locks.plasma, locks.sharakLegs, locks.room],
    panels: [
      "Panel 1: Wide shot near the arched doorway of the room exact as @image7. Sharak exact as @image5 screams as 8 massive, terrifying obsidian-lava spider legs erupt from his back, towering over everyone.",
      "Panel 2: Low angle tracking shot. Sharak exact as @image5 looms huge with his giant spider legs, looking absolutely insane and monstrous.",
      "Panel 3: Medium shot. Aisha exact as @image1 backs up into the arched doorway leading to the corridor, looking up in absolute terror.",
      "Panel 4: Tight two-shot. The Plasma character exact as @image3 grabs Aisha's arm exact as @image1, urgently pulling her back into the arched doorway to escape the towering Sharak exact as @image5."
    ]
  },
  {
    title: '5. Nibzu Grows',
    scene: "Daytime scene inside the room. Sharak sends a surge of magic into the tiny spider Nibzu. Nibzu starts growing into a giant, towering beast.",
    locks: [locks.sharakLegs, locks.nibzu, locks.room],
    panels: [
      "Panel 1: Insert shot. Sharak exact as @image5 stomps one of his massive spider legs onto the floor, sending a wave of fiery, glowing magic across the ground.",
      "Panel 2: Medium shot. The wave of glowing magic hits the tiny spider Nibzu exact as @image6, who looks amazed and proud as he begins to absorb the energy.",
      "Panel 3: Wide shot in the room exact as @image7. Nibzu exact as @image6 rapidly mutates, growing to the height of a window, looking huge, clumsy, and blissfully unaware of his destructive size.",
      "Panel 4: Close-up on Sharak exact as @image5, laughing maniacally as his giant spider pet Nibzu exact as @image6 towers beside him."
    ]
  },
  {
    title: '6. Dora Escapes',
    scene: "Daytime scene in the room. Giant Nibzu clumsily crashes around, accidentally destroying the arched doorway and shattering the golden plasma cage. Dora comical crawls under the giant spider's legs to escape.",
    locks: [locks.dora, locks.nibzu, locks.room],
    panels: [
      "Panel 1: Wide shot. The giant, window-tall spider Nibzu exact as @image6 clumsily steps through the room exact as @image7, accidentally smashing the arched doorway and shattering the golden plasma cage.",
      "Panel 2: Low angle ground shot. The white panther Dora exact as @image2, looking comically terrified, sprints desperately underneath the massive legs of the giant spider Nibzu exact as @image6.",
      "Panel 3: Medium tracking shot. Dora exact as @image2 runs frantically out of the crushed arched doorway, kicking up dust.",
      "Panel 4: Close-up POV from under the spider. Dora exact as @image2 looks up in horror at the giant underbelly of Nibzu exact as @image6 before scrambling to safety."
    ]
  },
  {
    title: '7. Aisha and Dora in the Corridor',
    scene: "Daytime scene in the dark obsidian corridor. Aisha and Dora stand helplessly near a large window, watching the battle unfold in horror.",
    locks: [locks.aisha, locks.dora, locks.corridor],
    panels: [
      "Panel 1: Medium wide shot in the corridor exact as @image8. Aisha exact as @image1 and Dora exact as @image2 stand pressed against the wall near a large window, looking back toward the destroyed archway in terror.",
      "Panel 2: Tight two-shot. Aisha exact as @image1 clutches her hands to her chest, tears welling in her eyes, while Dora exact as @image2 stands protectively at her side, ears pinned back.",
      "Panel 3: High angle shot showing the long, dark corridor exact as @image8, highlighting how far away the exit is, with Aisha exact as @image1 trapped near the window.",
      "Panel 4: Close-up on Aisha's face exact as @image1, lit by the dramatic daylight coming through the window, her expression filled with urgent desperation."
    ]
  },
  {
    title: '8. The Battle Begins',
    scene: "Daytime scene in the corridor. An epic battle. Sharak stomps his spider legs creating glowing cracks. The Plasma character floats horizontally, dodging magically.",
    locks: [locks.plasma, locks.sharakLegs, locks.corridor],
    panels: [
      "Panel 1: Wide epic battle shot in the corridor exact as @image8. Sharak exact as @image5 stomps his massive spider legs, creating bright glowing cracks that tear across the obsidian floor.",
      "Panel 2: Dynamic tracking shot. The Plasma character exact as @image3 floats horizontally in the air, moving at high speed to dodge a magical strike from Sharak exact as @image5.",
      "Panel 3: Over-the-shoulder from Sharak exact as @image5. He throws a furious magical strike down the corridor exact as @image8 toward the glowing Plasma character exact as @image3.",
      "Panel 4: Fast-paced action shot. The Plasma character exact as @image3 swoops low along the glowing cracks on the floor, his golden energy trailing behind him like a comet."
    ]
  },
  {
    title: '9. The Plasma Balls',
    scene: "Daytime scene in the corridor. Sharak hurls a liquid plasma ball (orange with a golden glow). The exhausted Plasma character catches it mid-air in slow motion, straining to repel it.",
    locks: [locks.plasma, locks.sharakLegs, locks.corridor],
    panels: [
      "Panel 1: Medium shot. Sharak exact as @image5 conjures a seething, liquid plasma sphere—a mix of orange with a golden glow, not solid fire—and hurls it violently down the corridor exact as @image8.",
      "Panel 2: Slow-motion action shot. The Plasma character exact as @image3 leaps forward, catching the liquid plasma ball mid-air with both bare hands, floating parallel to the ground.",
      "Panel 3: Extreme close-up on the Plasma character exact as @image3. His face is trembling, exhausted, teeth gritted as he strains against the incredible force of the plasma ball pushing him backward.",
      "Panel 4: Medium wide shot. The Plasma character exact as @image3 floats in the corridor exact as @image8, visibly depleting his energy as he holds back the glowing orange liquid sphere."
    ]
  },
  {
    title: '10. Djinn\'s Final Magic',
    scene: "Daytime scene in the corridor near the window. The Djinn screams 'Aisha, RUN!' and throws the plasma ball toward the window. The window shatters outward in slow motion.",
    locks: [locks.plasma, locks.aisha, locks.corridor],
    panels: [
      "Panel 1: Medium shot. The Plasma character exact as @image3 turns his trembling head toward Aisha exact as @image1, shouting desperately for her to run.",
      "Panel 2: Action insert. The Plasma character exact as @image3 unleashes a massive wave of light, violently redirecting the liquid plasma ball toward the large glass window of the corridor exact as @image8.",
      "Panel 3: Slow-motion cinematic wide shot. The heavy glass of the corridor window shatters outward into thousands of sparkling shards as the plasma ball explodes through it.",
      "Panel 4: Close-up on Aisha exact as @image1, her hands covering her face as the bright light of the explosion washes over her in the corridor exact as @image8."
    ]
  },
  {
    title: '11. The Golden Arabesque Light Path',
    scene: "Daytime exterior. A magical, glowing light path made of golden, blue, and indigo arabesque patterns forms like a long carpet from the shattered window out into the stormy desert dunes.",
    locks: [locks.exterior, locks.corridor],
    panels: [
      "Panel 1: Epic wide exterior shot. From the shattered window of the Sharak Palace exterior exact as @image10, a brilliant path of light shoots outward perpendicular to the wall.",
      "Panel 2: High angle shot looking down. The light path resembles a long carpet made of glowing golden, blue, and indigo arabesque patterns, stretching far into the stormy desert.",
      "Panel 3: Cinematic detail shot. The intricate, glowing indigo and gold arabesque patterns of the light bridge solidify in mid-air, contrasting against the dark, stormy sky of the exterior exact as @image10.",
      "Panel 4: Wide master shot of the Sharak Palace exterior exact as @image10, showing the glowing light bridge extending dramatically into the horizon, offering an escape route."
    ]
  },
  {
    title: '12. Djinn Collapses',
    scene: "Daytime scene in the corridor. The Plasma character's defense breaks. He is slammed into the wall, his glow flickers out, and he transforms back into the pale, human Prince on the floor.",
    locks: [locks.plasma, locks.humanPrince, locks.sharakLegs, locks.corridor],
    panels: [
      "Panel 1: Action shot. The remaining magical force slams the exhausted Plasma character exact as @image3 brutally against the dark obsidian wall of the corridor exact as @image8.",
      "Panel 2: Slow-motion shot. The Plasma character exact as @image3 slides down the wall to the floor, his golden glow flickering and completely dying out.",
      "Panel 3: Close-up. The character transforms into the Human Prince exact as @image9, lying unmoving on the floor, pale and devoid of light, wearing his human face.",
      "Panel 4: OTS shot from behind the fallen Human Prince exact as @image9, looking down the corridor exact as @image8 at Sharak exact as @image5, who is laughing madly in triumph."
    ]
  },
  {
    title: '13. The Urgent Escape',
    scene: "Daytime scene in the corridor near the shattered window. Aisha refuses to leave, crying toward the fallen human Prince. Dora the panther urges her to run.",
    locks: [locks.aisha, locks.dora, locks.humanPrince, locks.corridor],
    panels: [
      "Panel 1: Medium shot. Aisha exact as @image1 drops to her knees near the lifeless Human Prince exact as @image9 in the corridor exact as @image8, crying and refusing to leave him.",
      "Panel 2: Tight two-shot. The white panther Dora exact as @image2 nudges Aisha exact as @image1 forcefully, looking at her with urgency, communicating that they must run now.",
      "Panel 3: Low angle wide shot. Aisha exact as @image1 looks up with tears streaming down her face, while Dora exact as @image2 stands ready to leap out of the shattered window onto the light path.",
      "Panel 4: Close-up on Aisha exact as @image1, her face an agonizing mix of heartbreak and resolve, looking one last time at the Human Prince exact as @image9 before turning to the window."
    ]
  },
  {
    title: '14. Running on the Light Path',
    scene: "Daytime exterior. Aisha and Dora sprint along the glowing arabesque light path outside. The giant spider Nibzu crashes through the palace wall to chase them.",
    locks: [locks.aisha, locks.dora, locks.nibzu, locks.exterior],
    panels: [
      "Panel 1: Epic dynamic tracking shot. Aisha exact as @image1 and Dora exact as @image2 sprint desperately across the glowing golden-blue arabesque light path extending from the palace exterior exact as @image10.",
      "Panel 2: Wide action shot. The giant, window-tall spider Nibzu exact as @image6 violently smashes through the stone wall of the Sharak Palace exterior exact as @image10, climbing out to chase them.",
      "Panel 3: Front-facing tracking shot. Aisha exact as @image1 runs toward the camera, crying but determined, with Dora exact as @image2 sprinting right beside her on the glowing light path.",
      "Panel 4: High angle shot looking back. Aisha exact as @image1 and Dora exact as @image2 run along the light bridge while the massive dark shape of Nibzu exact as @image6 looms on the palace wall behind them."
    ]
  },
  {
    title: '15. The Chaos Below',
    scene: "Daytime exterior. The light bridge begins to collapse behind them. Below, the desert is in chaos with storms tearing villages apart and lightning cracking the sky.",
    locks: [locks.aisha, locks.dora, locks.exterior],
    panels: [
      "Panel 1: Extreme wide cinematic shot. The Sharak Palace exterior exact as @image10 stands against a violent stormy sky with piercing rays of daylight. The fragile light bridge stretches over a chaotic, storm-torn desert below.",
      "Panel 2: Low angle tracking shot from behind. Aisha exact as @image1 and Dora exact as @image2 sprint along the light path, as the glowing arabesque sections of the bridge crumble into dust immediately behind their feet.",
      "Panel 3: Wide aerial shot. Lightning cracks across the daytime sky above the Sharak Palace exterior exact as @image10, the desert below them swirling in chaotic storm winds.",
      "Panel 4: Epic master shot. Aisha exact as @image1 and Dora exact as @image2 running on the fading light bridge, a tiny speck of glowing golden-indigo hope against the massive, terrifying scale of the storm and the dark palace."
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
    skillHint: 'codex-skill-2x2-grid-prompt'
  };
  
  fs.writeFileSync(path.join(tasksDir, `${taskJson.id}.json`), JSON.stringify(taskJson, null, 2));
  counter++;
}

console.log('Successfully generated 15 battle sequence tasks.');
