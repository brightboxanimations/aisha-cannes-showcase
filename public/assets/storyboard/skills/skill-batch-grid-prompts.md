# Skill: Batch 2×2 Grid Prompt Writing & Generation for Aisha

## Overview

This skill defines the complete workflow for writing cinematic 2×2 grid image prompts for the animated movie "Aisha" and generating them in batch via PixVerse CLI. It covers prompt structure, character/location locking, camera direction, and CLI execution.

**This is NOT a simple agent task.** The prompt writing requires advanced creative intelligence — understanding the full scene context, character emotions, cinematic language, and spatial positioning. Prompts must be written by a capable AI or human director, NOT by a simple automation agent.

---

## Workflow Architecture

```
1. HUMAN provides: scene from script + beats to illustrate
         ↓
2. ADVANCED AI (Claude/Antigravity) writes: detailed 2×2 grid prompts
   — Reads full scene context
   — Understands character arcs, emotions, beats
   — Applies cinematic direction (shots, angles, staging)
   — Outputs .txt files (one per prompt)
         ↓
3. BATCH SCRIPT feeds prompts to PixVerse CLI
   — 3 models per prompt (simultaneously)
   — Nano Banana 2 (4K), Nano Banana Pro (2K), GPT-2 Medium (2K)
   — Results saved to uploads directory
         ↓
4. TASK SYSTEM loads results into passes for review
   — Images appear in the Director's Cut UI
   — User selects favorites, splits grids, enhances
```

---

## Part 1: How to Write the Prompts

### Mindset

Role: **AAA award-winning Disney/Pixar director and producer.** Every prompt is a masterpiece. Never rush. Think cinematically about:
- Character emotions, interactions, micro-expressions
- Camera angles that serve the story (not random)
- Spatial positioning (who is where, relative to what)
- Lighting that matches mood and time of day
- Continuity between panels (same background, consistent positions)

### Before Writing Any Prompt

1. **Read the ENTIRE scene** from the script first
2. Understand the emotional arc of the scene
3. Identify all characters present and their emotional states
4. Note the location, time of day, weather, lighting
5. Break the scene into beats (each beat = one 2×2 grid prompt)
6. Only THEN write each prompt, considering the full context

---

## Part 2: Prompt Structure (EXACT FORMAT)

### Opening Tag (ALWAYS start with this)

```
premium luminous 3D animated feature-film, true 3D depth, cinematic camera angles, volumetric [LIGHT_TYPE] light, little tiny dust motes, soft depth of field, expressive animated 3D eyes of all characters, realistic textures, true depth of field, focus on the foreground characters and objects with shallow cinematic 3d depth of field, detailed clear emotional staging, high-quality 4K animated movie look.
```

Where `[LIGHT_TYPE]` depends on scene: (thsoe are only examlles of descriptions fele free to describe differently depending on the scene and beatS)
- Morning → `volumetric morning light, in soft sunrays`
- Afternoon → `volumetric golden afternoon light`
- Sunset → `volumetric sunset and amber light`
- Night indoor → `warm candlelight and arabesque lamp glow`
- Night outdoor → `moonlit silver light and starlight`
- Stormy → `dramatic storm light with sunrays piercing through clouds`

### Character Locks (attach reference images)

```
CHARACTER LOCKS:
@image1 = Aisha, 16-year-old human princess S(depending on scene)
@image2 = Dora, white panther with golden collar — normal panther size, her height reaches an adult human's hip (exac thsi description for white panther) 
@image3 = Niura, tiny white snake — small, cute, harmless, witty, curls around Aisha's wrist or  hides under Aisha; scarf only with her head and a bit of neck visibl or sits curled on he rshoulder. it can also sit on the floor or o ride ont eh white panther back or neck/shoulder depending on the scene .
@image4 = [Other character for this scene — short description and behavior]
```

**Rules:**
- Only attach characters WHO APPEAR in this specific prompt
- Dora description must ALWAYS say "white panther" and mention her size relative to humans
- Niura description must ALWAYS say "tiny white snake" and mention she is small and cute
- Other characters: brief but sufficient description for the model to understand

### Location Locks (attach reference images)

```
LOCATION REFERENCE:
@image5 = [Location name] — 4-projection grid showing all angles of the location
@image6 = [Location name] — [specific view: front/left/right/back] — the main view where action happens
```

**Rules:**
- Attach the 4-projection grid of the location PLUS 1-2 main views
- Specify which view (front, left side, right side, back) for each image
- Choose views dynamically based on where the action happens in this beat

### Props Locks (if applicable)

```
PROPS REFERENCE:
@image8 = [Prop name] — [description, e.g., "ancient codex book with golden arabesque cover"]
@image9 = [Prop name] — [description, e.g., "Aisha's pendant, normal woman-size pendant with blue gem"]
```

**Rules:**
- Only attach props that are RELEVANT to this specific scene/beat
- Sometimes there are no specific props — don't force it
- Maximum 9 images total (characters + locations + props)

### Scene Description Block

```
SCENE: [Time of day] scene — [weather/atmosphere].
[Full beat description: What happens, who does what, emotional state of each character, spatial context]
```

**Example:**
```
SCENE: Night scene — warm candlelight, shadows dancing on arabesque walls.
Aisha and Dora are hiding in Sharak King's palace, in his private magic room. They are examining ancient artifacts on an octagonal table in awe and disbelief, trying to figure out what it all means. Aisha looks brave but nervous. The white panther Dora is comically horrified but ready to protect. The tiny snake Niura curls around Aisha's wrist, trying to look smart and helpful.
```

### Panel Descriptions (THE MOST CRITICAL PART)

```
Create 2x2 cinematic grid with 4 panels with 3d animated scenes in each one:
```

For EACH panel, describe ALL of these:

1. **Camera/Shot type** — Match to the story moment:
   - `Wide/Master shot` — establishing, showing full environment
   - `General shot` — full characters in environment
   - `Medium shot` — waist up, conversations
   - `Close-up` — face and shoulders, emotional moments
   - `Extreme close-up` — eyes, hands on objects, detail inserts
   - `Tight two-shot` — two characters framed together
   - `OTS (Over-the-shoulder)` — looking past one character at another
   - `Insert shot` — detail of object, hands, artifact
   - `Low angle` — looking up at character (power, awe)
   - `High angle` — looking down (vulnerability, overview)
   - `Dutch angle` — tilted frame (tension, unease)
   - `Panoramic/crane` — sweeping environmental reveal

2. **WHO** — Which character(s), with emotional state
3. **WHERE** — Exact position relative to objects and other characters
4. **DOING WHAT** — Action, gesture, expression
5. **ON WHAT** — Surface (chair, stone, floor, fountain rim, etc.)
6. **LEFT/RIGHT/FOREGROUND/BACKGROUND** — Spatial anchoring
7. **BESIDE/BEHIND** — What objects, architecture, other characters
8. **LIGHTING** — How light hits this specific panel

**Example Panel:**
```
Panel 1: Wide establishing shot. The octagonal magic room revealed — tall arabesque arches frame the space, an ornate octagonal table in the center covered with ancient scrolls and artifacts. Aisha stands on the left side of the table, leaning forward examining a glowing codex. The white panther Dora crouches on the right, ears flat, tail puffed, looking terrified at the magical symbols floating above the table. Tiny snake Niura peeks from behind a scroll on the table. Warm candlelight from ornate hanging lamps, deep shadows in the arches behind. Dust motes in the amber light.
```

**CRITICAL: Consistent Positioning Across Panels**
Since PixVerse has NO memory between prompts, EVERY panel must re-describe:
- Where each character is (left/right/foreground/background)
- Major objects as spatial anchors ("to the left of the octagonal table", "near the arched doorway on the right")
- Background elements visible from this camera angle
- Repeat the same spatial layout in every panel to maintain consistency

### Environment Block (ALWAYS include)

```
Environment: [Main features of the environment for this scene. Table in center, door in background, windows on the left, columns on the right, garden visible through arches, dimly lit with candles, sunrays through latticework, dust motes, specific architectural details]
```

### Closing Tag (ALWAYS end with this — DO NOT CHANGE)

```
All panels must be consistent between each other as to the backgrounds, positioning and characters as one beat-to-beat story. Style: premium luminous 3D animated feature-film, true 3D depth, cinematic camera angles, volumetric [LIGHT_TYPE] light, little tiny dust motes, [light details matching scene] soft depth of field, expressive animated 3D eyes of all characters, realistic textures, true depth of field, focus on the foreground characters and objects with shallow cinematic 3d depth of field, detailed clear emotional staging, high-quality 4K animated movie look.
```

---

## Part 3: PixVerse CLI Execution

### Prerequisites
- PixVerse open and logged in in browser
- CLI available via `npx pixverse`

### Default Generation Settings

| Model | Quality | Flag |
|-------|---------|------|
| Nano Banana 2 | 4K  | `--model nano-banana-2 --quality 2160p` |
| Nano Banana Pro | 2K  | `--model nano-banana-pro --quality 1440p` |
| GPT-2 Medium | 2K  | `--model gpt2-medium --quality 1440p` |

**All 3 models run per prompt by default.** Aspect ratio: `16:9`

### Image Types

| Type | Flag | Use |
|------|------|-----|
| Text-to-image | `--prompt "..."` | Generate from prompt only |
| Image-to-image | `--prompt "..." --image <path>` | Generate with reference image(s) |
| Grid | `--prompt "..." --grid "2x2"` | Generate 2×2 grid layout |

### Single Prompt Execution

```bash
npx pixverse create image \
  --prompt "$(cat prompt_file.txt)" \
  --model nano-banana-2 \
  --quality 2160p \
  --aspect-ratio 16:9 \S
  --grid "2x2" \
  --image ref1.png --image ref2.png --image ref3.png \
  --json
```

### Batch Script Structure

```bash
#!/bin/bash
# Aisha Grid Batch Generator
PROMPTS_DIR="${1:-.}"
DELAY="${2:-20}"
OUTPUT_DIR="$(pwd)/generated-$(date +%Y%m%d-%H%M%S)"
MODELS=("nano-banana-2" "nano-banana-pro" "gpt2-medium")
QUALITIES=("2160p" "1440p" "1440p")

mkdir -p "$OUTPUT_DIR"

for prompt_file in "$PROMPTS_DIR"/*.txt; do
  [ -f "$prompt_file" ] || continue
  PROMPT_NAME=$(basename "$prompt_file" .txt)
  PROMPT=$(cat "$prompt_file")

  for i in "${!MODELS[@]}"; do
    MODEL="${MODELS[$i]}"
    QUALITY="${QUALITIES[$i]}"

    echo "🎬 [$PROMPT_NAME] Model: $MODEL ($QUALITY)"

    npx pixverse create image \
      --prompt "$PROMPT" \
      --model "$MODEL" \
      --quality "$QUALITY" \
      --aspect-ratio "16:9" \
      --grid "2x2" \
      --output "$OUTPUT_DIR/${PROMPT_NAME}_${MODEL}_${QUALITY}.png" \
      --json 2>&1 | tee -a "$OUTPUT_DIR/log.json"

    echo "✅ Done. Waiting ${DELAY}s..."
    sleep "$DELAY"
  done
done

echo "🎉 Batch complete: $OUTPUT_DIR"
```

### With Reference Images

For prompts that use character/location locks (@image1 through @image9), pass the reference images:

```bash
npx pixverse create image \
  --prompt "$PROMPT" \
  --model "$MODEL" \
  --quality "$QUALITY" \
  --aspect-ratio "16:9" \
  --grid "2x2" \
  --image characters/aisha.png \
  --image characters/dora_panther.png \
  --image characters/niura_snake.png \
  --image locations/palace_grid.png \
  --image locations/magic_room_front.png \
  --json
```

---

## Part 4: Task Integration

### How It Connects to the Director's Cut App

1. **Writing phase:** Advanced AI writes prompts → saved as `.txt` files
2. **Generation phase:** Batch script or task watcher runs them through PixVerse CLI
3. **Review phase:** Results loaded into task passes for review, grid splitting, enhancement

### When a Task Has This Skill Attached

The task description should contain:
- Which scene(s) from the script to illustrate
- Which beats to cover
- Any specific creative direction

The workflow is:
1. AI reads the task → reads the script scene → writes prompts → saves as .txt
2. Batch script runs the prompts through 3 models
3. Results are loaded into the task's Pass 1

### Automating Task Execution

When "Start Task" is clicked and this skill is attached:
1. The task watcher detects `todo_working` status
2. It reads the `skillHint` field to identify this skill
3. It looks for pre-written prompt files in the task's prompt directory
4. If prompts exist → runs batch script
5. If prompts don't exist → the task stays pending for an advanced AI to write them first

**The agent that RUNS the CLI is simple. The agent that WRITES the prompts must be intelligent.**

---


## Part 5: Quality Checklist Before Submitting Prompt

- [ ] Opens with the full premium 3D opening tag
- [ ] Character locks use @image1, @image2, etc. with descriptions
- [ ] Location locks specify view type (front/side/back)
- [ ] Scene description includes time of day, atmosphere, emotional context
- [ ] Each panel has: shot type, characters, positions, actions, emotions
- [ ] Positions are described relative to objects AND other characters
- [ ] Left/right/foreground/background specified for EVERY character
- [ ] Background described in every panel (not just Panel 1)
- [ ] Environment block lists key spatial elements
- [ ] Closes with the full consistency + style closing tag
- [ ] Prompt is detailed and complete — not abbreviated or shortened
- [ ] Each prompt can stand alone (no reliance on "previous context")
S Nano Banana 2 4K       -> model: gemini-3.1-flash, quality: 2160p, aspect-ratio: 16:9
Nano Banana Pro 2K     -> model: gemini-3.0,       quality: 1440p, aspect-ratio: 16:9
GPT-2 2K Medium        -> model: gpt-image-2.0,    quality: 1440p, detail-level: mediumS