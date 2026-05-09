# PixVerse CLI — Image Generation Models & Correct Syntax

## The 3 Default Models (Always Generate With These)

### 1. Nano Banana 2 — `gemini-3.1-flash` (4K)
```bash
pixverse create image \
  --prompt "$PROMPT" \
  --images "${IMAGES[@]}" \
  --model gemini-3.1-flash \
  --quality 2160p \
  --aspect-ratio 16:9 \
  --json
```

### 2. Nano Banana Pro — `gemini-3.0` (2K)
```bash
pixverse create image \
  --prompt "$PROMPT" \
  --images "${IMAGES[@]}" \
  --model gemini-3.0 \
  --quality 1440p \
  --aspect-ratio 16:9 \
  --json
```

### 3. GPT-2 Medium — `gpt-image-2.0` (2K)
```bash
pixverse create image \
  --prompt "$PROMPT" \
  --images "${IMAGES[@]}" \
  --model gpt-image-2.0 \
  --quality 1440p \
  --detail-level medium \
  --aspect-ratio 16:9 \
  --json
```

## Optional Extra Models

### SeedReam 4.5 (4K)
```bash
pixverse create image \
  --prompt "$PROMPT" \
  --images "${IMAGES[@]}" \
  --model seedream-4.5 \
  --quality 2160p \
  --aspect-ratio 16:9 \
  --json
```

### SeedReam 5.0 Lite (3K)
```bash
pixverse create image \
  --prompt "$PROMPT" \
  --images "${IMAGES[@]}" \
  --model seedream-5.0-lite \
  --quality 1440p \
  --aspect-ratio 16:9 \
  --json
```

## Image Input Rules

- **Single image**: use `--image "/path/to/file.png"`
- **Multiple images**: use `--images "/path/1.png" "/path/2.png" "/path/3.png"` (plural `--images`)
- Images are referenced in prompts as `@img1`, `@img2`, `@img3` etc. in the order they are passed
- Local oversized images are auto-resized to fit 1920×1920
- Supports: file paths, HTTPS URLs, image IDs, OSS paths

## GPT Image 2.0 Specifics

- **Always pass `--detail-level medium`** for GPT Image 2.0
- Available detail levels: `low`, `medium`, `high`
- Higher detail = better quality but slower and more credits
- `medium` is the sweet spot for storyboard work

## Quality Tiers

| Quality | Resolution | Use Case |
|---------|-----------|----------|
| `720p`  | 1280×720  | Drafts, quick tests |
| `1080p` | 1920×1080 | Standard quality |
| `1440p` | 2560×1440 | Production (2K) |
| `2160p` | 3840×2160 | Hero shots (4K) |

## All Supported Image Models

```
qwen-image, gpt-image-2.0, gemini-3.1-flash, gemini-3.0, gemini-2.5-flash,
seedream-5.0-lite, seedream-4.5, seedream-4.0, kling-image-o3, kling-image-v3
```
