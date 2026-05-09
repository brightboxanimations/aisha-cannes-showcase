# Codex 2x2 grid images generation cinematic prompt for Pixverse

---
name: codex-skill-2x2-grid-prompt-rules-via-pixverse-cli
description: Use when writing, batching, or submit-running Aisha cinematic 2x2 grid prompts through PixVerse CLI with strict reference image order, 5000-character prompt limits, model mapping, 16:9 output, and submit-only retry rules.
---

# CODEX Skill 2x2 Grid Prompt Rules Via PixVerse CLI

## Operating Rule

Move fast. Do not spend hours rechecking PixVerse behavior once the known command works. Do not download, poll, monitor, or run extra diagnostics unless the user explicitly asks. The default workflow is: write prompts, attach references in order, submit jobs, save submit logs.

## Hard Limits

- Every PixVerse prompt is stateless. Each prompt must fully repeat all needed character, location, prop, camera, staging, emotion, and style information.
- Maximum prompt length is 5000 characters. Keep prompts rich but compact enough to stay under the limit.
- Each prompt is a 2x2 grid with exactly 4 panels.
- Maximum 9 attached images per prompt.
- Attach only references that appear in that prompt or are needed to lock the visible environment or props.
- Never refer to context from another prompt. Do not write "same as before", "continues", or "the previous shot".

## Style Tags

Every prompt starts with:

```text
premium luminous 3D animated feature-film, true 3D depth, cinematic camera angles, volumetric light, little tiny dust motes, soft depth of field, expressive animated 3D eyes of all characters, realistic textures, true depth of field, focus on the foreground characters and objects with shallow cinematic 3d depth of field, detailed clear emotional staging, high-quality 4K animated movie look.
```

Every prompt ends with:

```text
All panels must be consistent between each other as to the backgrounds, positioning and characters as one beat-to-beat story. Style: premium luminous 3D animated feature-film, true 3D depth, cinematic camera angles, volumetric light, little tiny dust motes, soft depth of field, expressive animated 3D eyes of all characters, realistic textures, true depth of field, focus on the foreground characters and objects with shallow cinematic 3d depth of field, detailed clear emotional staging, high-quality 4K animated movie look.
```

## Reference Image Rules

The order of `@image` locks must exactly match the CLI `--images` order. If `@image1 = Aisha`, the first file after `--images` must be Aisha. Repeat those locks inside each prompt and reference them again in each panel where the character, location, or prop appears.

For characters, lock identity and clothes. Do not reinvent visual design.

- Aisha: 16-year-old human princess, curious, cute, brave, beautiful, exact as reference.
- Dora: always call her Dora, white panther, normal panther size, her height reaches Aisha's hip, exact as reference.
- Niura: tiny white snake, small, cute, harmless, witty; she may curl around Aisha's wrist, hide near Aisha, sit on Dora, or sit on the floor depending on staging.
- Plasma character: never call him Djinn. Human-like plasma character, can hover or walk, exact as reference.
- Sharak: antagonist king with magic powers, fierce and unpredictable, wounded underneath.
- Nibzu: silly spider sidekick with devoted, ridiculous expression.
- Zahra: Aisha's mother. When used in Act 9 room discovery, use the reference only to create an old painted sketch, weathered fresco, or hand-drawn study, never a modern photo.

For locations, use references as world locks. If a location reference exists, do not overdescribe architecture, colors, furniture, or texture. Say the architecture, lighting, scale, and background remain 100% unchanged. If no reference exists, describe the missing place from the script.

Preferred location lock pattern:

```text
LOCATION REFERENCE:
@image4 = Secret room main view - 100% unchanged architecture, lighting, scale, background, table, walls, shelves, windows, and all fixed objects; use only as the world setting reference.
@image5 = Secret room 4-projection grid showing all angles - 100% unchanged, used for continuity and camera orientation.
```

## Prompt Structure

Use this exact sequence:

```text
[Opening style tag]

CHARACTER LOCKS:
@image1 = ...

LOCATION REFERENCE:
@imageN = ...

PROPS REFERENCE:
@imageN = ...

SCENE: [time of day] scene.
[Brief scene intention: what is happening, emotional direction, who is afraid, who protects whom, what truth is emerging.]

Create 2x2 grid with 4 panels with 3D animated scenes in each one:
Panel 1: ...
Panel 2: ...
Panel 3: ...
Panel 4: ...

Environment: [Only visible anchors and reference lock reminders. Do not invent over reference.]

[Closing style tag]
```

## Panel Rules

Each panel must include:

- Camera type: wide, master, general, medium, close-up, extreme close-up, insert, low angle, high angle, Dutch angle, OTS, tight two-shot, or crane.
- Exact character positions: left, right, foreground, background, beside, behind, opposite side of table, near door, near wall.
- Action and gesture.
- Emotional subtext, preferably using cinematic comparison: "as if she understands the truth but cannot say it yet".
- Object and environment anchors: table center, doorway behind, shelves left, wall fresco right, pendant in hand.
- Reference reminders: "Aisha exact as @image1", "Dora exact as @image2", "secret room exact as @image4".

Do not redescribe characters or locations in full inside panels if references exist. Use panels for staging, camera, position, action, emotion, and continuity.

## Act 9 Sharak Palace Reference Set

Known files:

```text
/Users/vaquita/Downloads/aisha/Scenes (Locations) visual references/ACT 9 SHARAK PALACE/Aisha refernce close up and full body.png
/Users/vaquita/Downloads/aisha/Scenes (Locations) visual references/ACT 9 SHARAK PALACE/panther.png
/Users/vaquita/Downloads/aisha/Scenes (Locations) visual references/ACT 9 SHARAK PALACE/Aisha and panthe correct proportionsr.png
/Users/vaquita/Downloads/aisha/Scenes (Locations) visual references/ACT 9 SHARAK PALACE/Plasma character.png
/Users/vaquita/Downloads/aisha/Scenes (Locations) visual references/ACT 9 SHARAK PALACE/Plasma character close up.png
/Users/vaquita/Downloads/aisha/Scenes (Locations) visual references/ACT 9 SHARAK PALACE/arrivign to the sharak palace exterior .png
/Users/vaquita/Downloads/aisha/Scenes (Locations) visual references/ACT 9 SHARAK PALACE/low angle gate entrance sharak palace exterior.png
/Users/vaquita/Downloads/aisha/Scenes (Locations) visual references/ACT 9 SHARAK PALACE/sharak palace exterior low angle gate entrnace.png
/Users/vaquita/Downloads/aisha/Scenes (Locations) visual references/ACT 9 SHARAK PALACE/secret room in the sharak palace.png
/Users/vaquita/Downloads/aisha/Scenes (Locations) visual references/ACT 9 SHARAK PALACE/Zahra AIsha mother close up .png
```

For the Act 9 corridor, if no final corridor reference exists, describe it from text: red corridor of wonder, mysterious books, scrolls, frescoes of ancient astronomy connected to soul and anatomy, tall arabesque standing lamps, obsidian and dark marble walls, shelves, strange mystic artifacts. Once corridor references exist, stop overdescribing and treat them as locks.

## PixVerse CLI Models

Use 16:9 for all outputs.

```text
Nano Banana 2 4K:
npx pixverse create image --model gemini-3.1-flash --quality 2160p --aspect-ratio 16:9 --no-wait --json

Nano Banana Pro 2K:
npx pixverse create image --model gemini-3.0 --quality 1440p --aspect-ratio 16:9 --no-wait --json

GPT-2 2K Medium:
npx pixverse create image --model gpt-image-2.0 --quality 1440p --detail-level medium --aspect-ratio 16:9 --no-wait --json
```

Use `--quality`, not `--resolution`. Inject images with:

```text
--images "/path/to/image1.png" "/path/to/image2.png" ...
```

The image paths must match `@image1`, `@image2`, etc.

## Submit-Only Batch Rule

Default behavior:

- Submit the same prompt to all three models.
- Use `--no-wait --json`.
- Save each returned `image_id` to a `.submit.log`.
- Do not download outputs.
- Do not poll job completion.
- Do not skip missing jobs.

Concurrency behavior:

- Run submit jobs in parallel, normally up to 9.
- If PixVerse says concurrent generation limit is reached, wait 10 seconds for that job's first retry.
- If it still hits the limit, retry every 5 seconds after that.
- Never mark a job failed for concurrency limit. Keep retrying until it submits.
- Only write `.submit.failed.log` for a real non-concurrency error.

## Example Command

```bash
npx pixverse create image \
  --prompt "$(cat prompt.txt)" \
  --images "/Users/vaquita/Downloads/aisha/Scenes (Locations) visual references/ACT 9 SHARAK PALACE/Aisha refernce close up and full body.png" "/Users/vaquita/Downloads/aisha/Scenes (Locations) visual references/ACT 9 SHARAK PALACE/panther.png" "/Users/vaquita/Downloads/aisha/Scenes (Locations) visual references/ACT 9 SHARAK PALACE/secret room in the sharak palace.png" \
  --model gemini-3.1-flash \
  --quality 2160p \
  --aspect-ratio 16:9 \
  --no-wait \
  --json
```

## Mini Example Prompt

```text
premium luminous 3D animated feature-film, true 3D depth, cinematic camera angles, volumetric light, little tiny dust motes, soft depth of field, expressive animated 3D eyes of all characters, realistic textures, true depth of field, focus on the foreground characters and objects with shallow cinematic 3d depth of field, detailed clear emotional staging, high-quality 4K animated movie look.

CHARACTER LOCKS:
@image1 = Aisha, 16-year-old human princess, curious brave beautiful, exact as the reference; no modification to looks or clothes.
@image2 = Dora, white panther, normal panther size, her height reaches Aisha's hip, exact as the reference.

LOCATION REFERENCE:
@image3 = Sharak secret room main view - 100% unchanged architecture, lighting, scale, octagonal table, shelves, walls, windows, and fixed background.

SCENE: Night scene.
Aisha and Dora have just entered Sharak's secret room. Aisha is drawn toward the octagonal table because the truth feels close; Dora is comically frightened but refuses to leave Aisha unprotected.

Create 2x2 grid with 4 panels with 3D animated scenes in each one:
Panel 1: Wide master shot. Aisha exact as @image1 stands on the right side of the octagonal table in @image3, Dora exact as @image2 low on the left near Aisha's knee, both facing the ancient books spread across the table, as if the room itself has been waiting for Aisha.
Panel 2: Medium OTS from behind Dora's shoulder toward Aisha. Aisha leans over the table, hands hovering above old pages; Dora stays slightly behind her left side, tense and protective, watching the doorway in the background.
Panel 3: Insert shot of Aisha's hands opening a weathered book on the exact table from @image3; only her sleeves and fingers are visible, Dora's white silhouette blurred at left, the pages showing old anatomy and star diagrams.
Panel 4: Tight two-shot. Aisha on the right looks up with trembling recognition; Dora on the left looks at her with pity, as if she understands the danger before Aisha can say it.

Environment: Sharak secret room exact as @image3, all architecture, table, shelves, windows, background objects, lighting, scale, and character designs remain unchanged from references.

All panels must be consistent between each other as to the backgrounds, positioning and characters as one beat-to-beat story. Style: premium luminous 3D animated feature-film, true 3D depth, cinematic camera angles, volumetric light, little tiny dust motes, soft depth of field, expressive animated 3D eyes of all characters, realistic textures, true depth of field, focus on the foreground characters and objects with shallow cinematic 3d depth of field, detailed clear emotional staging, high-quality 4K animated movie look.
```
