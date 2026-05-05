#!/usr/bin/env python3
"""
Split Grid Tool — Mathematically precise grid splitter for Director's Cut.

Splits a single image containing a grid layout into individual panels.
Supports: 2x2 (4 panels), 3x2 (6 panels), 3x3 (9 panels)

Math:
  For an image of size W x H:
  - 2x2: panel_w = W/2, panel_h = H/2 → 4 panels, each preserving aspect ratio
  - 3x2: panel_w = W/3, panel_h = H/2 → 6 panels
  - 3x3: panel_w = W/3, panel_h = H/3 → 9 panels

  Each panel is cropped as: crop(left=col*pw, top=row*ph, right=(col+1)*pw, bottom=(row+1)*ph)
"""
import sys, os, json
from PIL import Image

GRID_CONFIGS = {
    '2x2': (2, 2),  # cols, rows → 4 panels
    '3x2': (3, 2),  # cols, rows → 6 panels  
    '3x3': (3, 3),  # cols, rows → 9 panels
    '2x1': (2, 1),  # cols, rows → 2 panels (horizontal split)
    '1x2': (1, 2),  # cols, rows → 2 panels (vertical split)
}

def split_image(image_path, output_dir, grid_type='2x2'):
    cols, rows = GRID_CONFIGS.get(grid_type, (2, 2))
    
    img = Image.open(image_path)
    w, h = img.size
    
    panel_w = w // cols
    panel_h = h // rows
    
    os.makedirs(output_dir, exist_ok=True)
    panels = []
    
    for r in range(rows):
        for c in range(cols):
            left = c * panel_w
            top = r * panel_h
            right = left + panel_w
            bottom = top + panel_h
            
            panel = img.crop((left, top, right, bottom))
            panel_name = f'panel_r{r+1}_c{c+1}.png'
            panel_path = os.path.join(output_dir, panel_name)
            panel.save(panel_path, 'PNG', optimize=True)
            
            panels.append({
                'filename': panel_name,
                'path': panel_path,
                'row': r + 1,
                'col': c + 1,
                'width': panel_w,
                'height': panel_h,
            })
    
    return {
        'ok': True,
        'source': {'width': w, 'height': h, 'path': image_path},
        'grid': grid_type,
        'cols': cols,
        'rows': rows,
        'panel_size': {'width': panel_w, 'height': panel_h},
        'panels': panels,
    }

if __name__ == '__main__':
    if len(sys.argv) < 3:
        print(f'Usage: {sys.argv[0]} <image_path> <output_dir> [grid_type]')
        print(f'Grid types: {", ".join(GRID_CONFIGS.keys())}')
        sys.exit(1)
    
    image_path = sys.argv[1]
    output_dir = sys.argv[2]
    grid_type = sys.argv[3] if len(sys.argv) > 3 else '2x2'
    
    result = split_image(image_path, output_dir, grid_type)
    print(json.dumps(result, indent=2))
