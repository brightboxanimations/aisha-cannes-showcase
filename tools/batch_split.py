#!/usr/bin/env python3
"""
Batch Split Grid — Reads image list from stdin JSON, splits all, outputs results as JSON.
Usage: echo '{"images":[...]}' | python3 tools/batch_split.py <public_dir> <uploads_dir>
"""
import sys, json, os
sys.path.insert(0, os.path.dirname(__file__))
from split_grid import split_image

public_dir = sys.argv[1]
uploads_dir = sys.argv[2]
data = json.loads(sys.stdin.read())
images = data.get('images', [])

results = []
for i, img in enumerate(images):
    full_path = os.path.join(public_dir, img['url'].lstrip('/'))
    if not os.path.exists(full_path):
        print(f"SKIP: {full_path}", file=sys.stderr)
        continue
    out_dir = os.path.join(uploads_dir, f'split-batch-{img["id"]}')
    grid_type = img.get('splitType', '2x2')
    result = split_image(full_path, out_dir, grid_type)
    if result['ok']:
        for p in result['panels']:
            results.append({
                'imgId': img['id'],
                'outDir': os.path.basename(out_dir),
                'filename': p['filename'],
                'row': p['row'],
                'col': p['col'],
                'width': p['width'],
                'height': p['height'],
            })
    print(f"[{i+1}/{len(images)}] {os.path.basename(full_path)} → {len(result.get('panels',[]))} panels", file=sys.stderr)

print(json.dumps(results))
