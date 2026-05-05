# Skill: Split Grid

## What it does
Splits grid images (2x2, 3x2, 2x3, 3x3) into individual panels using Pillow.

## How to use

### In the UI
1. Select images in a pass
2. Choose grid type from the dropdown (2×2, 3×2, 2×3, 3×3)
3. Click "Run Agent" — the grid mark appears on selected images
4. The system splits each marked image into panels
5. Results appear in a new pass

### Via CLI / Script
```bash
python3 tools/split_grid.py <input_image> <output_dir> [grid_type]
```

Grid types: `2x2`, `3x2`, `2x3`, `3x3`

### Via API
```bash
curl -X POST http://localhost:5173/api/skills/split-grid-batch \
  -H "Content-Type: application/json" \
  -d '{"images": [{"id": "img1", "url": "/path/to/image.png", "splitType": "2x2"}]}'
```

### Output
Each panel is saved as `panel_r<row>_c<col>.png` in a `split-batch-<timestamp>/` directory under `public/assets/storyboard/uploads/`.
