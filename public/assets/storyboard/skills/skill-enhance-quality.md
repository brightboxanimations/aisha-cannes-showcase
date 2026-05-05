# Skill: Enhance Quality

## What it does
Improves image quality using PixVerse AI models. Preserves camera angle, composition, architecture, character poses, and all objects.

## Prerequisites
- PixVerse open and logged in in browser
- `npx pixverse` CLI available

## Available Models

| Model | Quality | Label |
|-------|---------|-------|
| `seedream-4.5` | 2160p (4K) | Default ✓ |
| `gpt-image-2.0` | 1440p (2K) | Optional |
| `gemini-3.1-flash` | 2160p (4K) | Default ✓ |
| `gemini-3.0` | 1440p (2K) | Optional |
| `kling-image-v3` | 2160p (4K) | Optional |

## Prompt Template

```
Use exact @img1 image 1 but improve quality of character(s), objects and resolution.
Do not change camera angle, composition, architecture or objects.
The characters should remain in same poses and all objects in the same places.
Camera should remain same angle exact the same as @img1 only improve quality.
Style: 3d animated movie, cinematic AAA level 3d animation
```

**With references:** Append:
```
Reference images of character(s) and/or location/objects is only for reference
of quality and consistency. The image 1 should be preserved the same, only with improved quality.
```

## How to use

### In the UI
1. Select images in a pass
2. Click the enhance (sparkle) button
3. Choose models and optionally edit the prompt
4. Click "Run Agent"
5. Results appear in a new pass

### Via API
```bash
curl -X POST http://localhost:5173/api/skills/enhance \
  -H "Content-Type: application/json" \
  -d '{"imagePath": "/path/to/image.png", "prompt": "...", "model": "seedream-4.5", "quality": "2160p", "aspectRatio": "16:9"}'
```
