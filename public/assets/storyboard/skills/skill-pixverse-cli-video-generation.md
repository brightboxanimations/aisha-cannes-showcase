# PixVerse CLI Video Generation

Use this skill whenever Canvas Mode, Film Storyboard, or an agent generates video through PixVerse CLI, especially when more than one reference image/video is attached.

## Golden Rule

Do not send multiple references through normal image-to-video.

- One source image or text only: use `pixverse-cli create video`.
- Multiple images, a group reference, or any video reference: use `pixverse-cli create reference`.
- Two or more keyframe images meant as first/last/sequence frames: use `pixverse-cli create transition`.
- One character image plus one motion video: use `pixverse-cli create motion-control`.

Never fake multi-reference video by repeating `--image`. `create video` accepts only one `--image`, so repeating it silently loses references or keeps only the last one.

## Canvas Routing Rules

When Canvas sends a selected video node:

1. Collect the selected node itself only if it already contains media and is being used as an input.
2. Collect direct reference lines from images, videos, and groups.
3. If a group is connected as one reference doodle, expand all media inside that group into the CLI input list, but keep the canvas as one doodle.
4. Use image files in `--images` and video files in `--videos`.
5. If there is more than one reference, or if any reference is a video, route to `create reference`.
6. If there is exactly one image reference and no video reference, route to `create video --image`.
7. If the target placeholder is empty, generate into that placeholder. If it already has media, create a new connected output node.

## Command Modes

### Text/Image To Video: `create video`

For plain text-to-video or one image-to-video input.

```bash
npx pixverse-cli create video \
  --prompt "$PROMPT" \
  --image "/path/source.png" \
  --model v6 \
  --quality 720p \
  --aspect-ratio 16:9 \
  --duration 5 \
  --json
```

Rules:

- `--image` is singular.
- Use no `--image` for text-to-video.
- Do not pass more than one reference.
- Default CLI config currently uses model `v6`, quality `720p`, duration `5`, aspect ratio `16:9`, audio enabled, multi-shot enabled.

### Multi-Reference Video: `create reference`

For character/location/prop locking from multiple images, grouped references, or mixed image plus video references.

```bash
npx pixverse-cli create reference \
  --prompt "$PROMPT" \
  --images "/path/aisha.png" "/path/dora.png" "/path/location.png" \
  --model pixverse-c1 \
  --quality 720p \
  --aspect-ratio 16:9 \
  --duration 5 \
  --json
```

With video references:

```bash
npx pixverse-cli create reference \
  --prompt "$PROMPT" \
  --images "/path/aisha.png" "/path/location.png" \
  --videos "/path/previous-shot.mp4" \
  --model seedance-2.0-standard \
  --quality 720p \
  --aspect-ratio 16:9 \
  --duration 5 \
  --json
```

Rules:

- Image references: `--images`, 1 to 7 inputs.
- Video references: `--videos`, max 3 inputs, total reference duration up to 15 seconds.
- PixVerse CLI documents video refs as seedance-2.0 only. If a video reference is present, use the Seedance 2.0 model path, even if another model was selected.
- This is the correct mode for Canvas group references. The group line should visually remain one reference line, but the CLI must receive every image/video inside the group.
- Do not silently fall back to one image. If multi-reference submission fails, retry the full command with all references.

### Keyframe Transition: `create transition`

For turning 2 or more still frames into a transition shot.

```bash
npx pixverse-cli create transition \
  --prompt "$PROMPT" \
  --images "/path/start.png" "/path/end.png" \
  --model v6 \
  --quality 720p \
  --duration 5 \
  --json
```

Rules:

- Requires at least 2 images.
- Use this for frame-to-frame motion, not for character/location reference locking.
- Does not accept `--videos`.

### Motion Control: `create motion-control`

For applying a motion reference video to a character image.

```bash
npx pixverse-cli create motion-control \
  --image "/path/character.png" \
  --video "/path/motion-reference.mp4" \
  --model v5.6 \
  --quality 720p \
  --json
```

Rules:

- Requires exactly one character image and one motion reference video.
- Default CLI config currently uses model `v5.6`.

## Canvas Model Menu

Canvas video menu may show:

| UI label | CLI model id | Use |
| --- | --- | --- |
| Seedance 2.0 Standard | `seedance-2.0-standard` | safest for video references in `create reference` |
| Happy Horse | `happyhorse-1.0` | normal video or image-reference mode if CLI accepts it |
| PixVerse 6 | `v6` | default normal video and transitions |
| PixVerse C1 | `pixverse-c1` | default multi-reference image fusion |
| Grok | `grok-imagine` | 720p only in Canvas |
| Kling 3.0 Standard | `kling-3.0-standard` | 720p or 1080p, shorter durations preferred |
| Kling O3 Standard | `kling-o3-standard` | 720p or 1080p, shorter durations preferred |

If PixVerse rejects a model for a mode, switch to that mode's default:

- `create video`: `v6`
- `create reference`: `pixverse-c1` for image-only refs, `seedance-2.0-standard` when any video ref is present
- `create transition`: `v6`
- `create motion-control`: `v5.6`

## Reference Passing Rules

- Preserve user-visible reference order in the prompt thumbnails.
- Put image references in `--images` and video references in `--videos`; do not mix them under one flag.
- A group reference must pass every usable media item inside the group.
- A variation node should copy the original node's prompt and reference set, but not add the original image itself as an extra reference unless it is explicitly connected as a reference.
- Reference lines are golden and labeled `REF 1`, `REF 2`, etc. Variation lines are pink and labeled `VAR 1`, `VAR 2`, etc.

## Retry Rule

For submit/generation failures caused by busy concurrency or transient PixVerse errors:

1. Retry the exact full command after 10 seconds.
2. If it still fails transiently, retry every 5 seconds.
3. Never drop references during retry.
4. Only report failure after a real non-transient CLI error.

## Verification Commands

Use these when PixVerse behavior seems to change:

```bash
npx pixverse-cli create video --help
npx pixverse-cli create reference --help
npx pixverse-cli create transition --help
npx pixverse-cli create motion-control --help
npx pixverse-cli config defaults show --json
npx pixverse-cli account slots --json
```
