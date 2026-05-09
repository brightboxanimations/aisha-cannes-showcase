#!/usr/bin/env python3
"""
Director's Cut — Autonomous Task Watcher (Theo Agent)

This script runs in the background and automatically processes tasks
from the Director's Cut app. It polls the tasks/current/ folder every
10 seconds and executes any pending skills.

Supported Skills (auto-detected from image flags):
  - splitGrid: Splits grid images into individual panels using Pillow
  - improve4k: Sends images to PixVerse for quality improvement

Usage:
  python3 tools/task_watcher.py

The watcher will:
  1. Poll tasks/current/ every 10 seconds
  2. Find tasks with status ending in '_working'
  3. Check which images have splitGrid or improve4k flags
  4. Execute the appropriate skill
  5. Write results back to the task file AND storyboard-data.json
  6. The UI automatically picks up changes via polling
"""
import os, sys, json, time, subprocess
from pathlib import Path

# Paths
PROJECT_ROOT = Path(__file__).parent.parent
PUBLIC_DIR = PROJECT_ROOT / 'public'
STORYBOARD_DIR = PUBLIC_DIR / 'assets' / 'storyboard'
TASKS_CURRENT = STORYBOARD_DIR / 'tasks' / 'current'
UPLOADS_DIR = STORYBOARD_DIR / 'uploads'
STORYBOARD_FILE = STORYBOARD_DIR / 'storyboard-data.json'
SPLIT_GRID_TOOL = Path(__file__).parent / 'split_grid.py'

POLL_INTERVAL = 10  # seconds

# Import split_grid
sys.path.insert(0, str(Path(__file__).parent))
from split_grid import split_image, GRID_CONFIGS

ENHANCE_PROMPT_BASE = (
    "Use exact @img1 image 1 but improve quality of character(s), objects and resolution. "
    "Do not change camera angle, composition, architecture or objects. "
    "The characters should remain in same poses and all objects in the same places. "
    "Camera should remain same angle exact the same as @img1 only improve quality. "
    "Style: 3d animated movie, cinematic AAA level 3d animation"
)

ENHANCE_PROMPT_WITH_REFS = ENHANCE_PROMPT_BASE + (
    ". Reference images of character(s) and/or location/objects is only for reference "
    "of quality and consistency. The image 1 should be preserved the same, only with improved quality."
)


def load_storyboard():
    with open(STORYBOARD_FILE) as f:
        return json.load(f)


def save_storyboard(data):
    with open(STORYBOARD_FILE, 'w') as f:
        json.dump(data, f, indent=2)


def load_task(task_id):
    path = TASKS_CURRENT / f'{task_id}.json'
    if not path.exists():
        return None
    with open(path) as f:
        return json.load(f)


def save_task(task):
    path = TASKS_CURRENT / f'{task["id"]}.json'
    with open(path, 'w') as f:
        json.dump(task, f, indent=2)


def process_split_grid(task):
    """Auto-split all images marked with splitGrid."""
    images = task.get('generatedImages', [])
    split_images = [i for i in images if i.get('splitGrid')]
    
    if not split_images:
        return None
    
    grid_type = task.get('splitType', '2x2')
    all_panels = []
    
    for idx, img in enumerate(split_images):
        img_url = img['url']
        full_path = str(PUBLIC_DIR / img_url.lstrip('/'))
        
        if not os.path.exists(full_path):
            print(f'  ⚠ Skip {idx+1}: {full_path} not found')
            continue
        
        out_dir = str(UPLOADS_DIR / f'split-{img["id"]}')
        
        print(f'  [{idx+1}/{len(split_images)}] Splitting {os.path.basename(full_path)} ({grid_type})')
        result = split_image(full_path, out_dir, grid_type)
        
        if result['ok']:
            for panel in result['panels']:
                rel_url = f'/assets/storyboard/uploads/split-{img["id"]}/{panel["filename"]}'
                all_panels.append({
                    'id': f'split-{img["id"]}-r{panel["row"]}c{panel["col"]}',
                    'url': rel_url,
                    'note': f'Panel {panel["row"]},{panel["col"]} ({panel["width"]}x{panel["height"]})',
                    'selected': False,
                    'improve4k': False,
                    'splitGrid': False,
                })
    
    return all_panels


def process_improve_quality(task):
    """Send images marked with improve4k to PixVerse for quality improvement."""
    images = task.get('generatedImages', [])
    improve_images = [i for i in images if i.get('improve4k')]
    
    if not improve_images:
        return None
    
    prompt = task.get('enhancePrompt', ENHANCE_PROMPT_BASE)
    models = task.get('enhanceModels', ['seedream-4.5', 'gemini-3.1-flash'])
    if isinstance(models, str):
        models = models.split(',')
    
    model_quality = {
        'seedream-4.5': '2160p',
        'gpt-image-2.0': '1440p',
        'gemini-3.1-flash': '2160p',
        'gemini-3.0': '1440p',
        'kling-image-v3': '2160p',
    }
    
    all_results = []
    
    for idx, img in enumerate(improve_images):
        img_url = img['url']
        full_path = str(PUBLIC_DIR / img_url.lstrip('/'))
        
        if not os.path.exists(full_path):
            print(f'  ⚠ Skip {idx+1}: file not found')
            continue
        
        for model in models:
            quality = model_quality.get(model, '1440p')
            print(f'  [{idx+1}/{len(improve_images)}] Enhancing with {model} ({quality})...')
            
            try:
                result = subprocess.run([
                    'npx', 'pixverse-cli', 'create', 'image',
                    '--prompt', prompt,
                    '--image', full_path,
                    '--model', model,
                    '--quality', quality,
                    '--aspect-ratio', '16:9',
                    '--json',
                ], capture_output=True, text=True, timeout=300)
                
                if result.returncode == 0:
                    data = json.loads(result.stdout)
                    if data.get('image_url'):
                        # Download the result
                        out_dir = str(UPLOADS_DIR / f'enhanced-{img["id"]}')
                        os.makedirs(out_dir, exist_ok=True)
                        out_name = f'{model.replace(".", "-")}_{quality}.png'
                        out_path = os.path.join(out_dir, out_name)
                        
                        subprocess.run(['curl', '-sL', data['image_url'], '-o', out_path])
                        
                        rel_url = f'/assets/storyboard/uploads/enhanced-{img["id"]}/{out_name}'
                        all_results.append({
                            'id': f'enhanced-{img["id"]}-{model}',
                            'url': rel_url,
                            'note': f'{model} {quality} enhanced',
                            'selected': False,
                            'improve4k': False,
                            'splitGrid': False,
                        })
                        print(f'    ✅ Downloaded: {out_name}')
                    else:
                        print(f'    ⚠ No image_url in response')
                else:
                    print(f'    ⚠ PixVerse error: {result.stderr[:200]}')
            except Exception as e:
                print(f'    ⚠ Error: {e}')
    
    return all_results

def process_general_task(task):
    """Run general prompt generation."""
    prompt_text = task.get('prompt', '').strip()
    if not prompt_text:
        return None
        
    import re
    # Extract images from sceneHint
    scene_hint = task.get('sceneHint', '')
    image_paths = []
    if scene_hint:
        parts = scene_hint.split('|')
        for p in parts:
            match = re.search(r'(/assets/[^\s\]]+)', p)
            if match:
                full_path = str(PUBLIC_DIR / match.group(1).lstrip('/'))
                if os.path.exists(full_path):
                    image_paths.append(full_path)
    
    # Model limits to 9 images as per constraints
    image_paths = image_paths[:9]
    
    # Intelligently extract prompts (looks for opening and closing tags of the prompt)
    prompts = []
    matches = re.finditer(r'(premium luminous 3D animated feature-film.*?high-quality 4K animated movie look\.)', prompt_text, re.DOTALL | re.IGNORECASE)
    for m in matches:
        prompts.append(m.group(1).strip())
        
    # Fallback to basic splitting if no exact matches found
    if not prompts:
        prompts = [p.strip() for p in prompt_text.split('---') if len(p.strip()) > 10]
    if not prompts:
        prompts = [prompt_text]
        
    all_results = []
    
    models_to_run = [
        ('gemini-3.1-flash', '2160p'),
        ('gemini-3.0', '1440p'),
        ('gpt-image-2.0', '1440p')
    ]
    
    for idx, p in enumerate(prompts):
        print(f'  🚀 Launching generation {idx+1}/{len(prompts)} for: {task["id"]}')
        
        # Clean up prompt slightly if it has markdown formatting
        p = re.sub(r'^```[\w]*\s*', '', p) # remove starting code block
        p = re.sub(r'\s*```$', '', p)      # remove ending code block
        
        for model_name, quality in models_to_run:
            cmd = ['npx', 'pixverse-cli', 'create', 'image', '--prompt', p, '--model', model_name, '--quality', quality, '--aspect-ratio', '16:9', '--json']
            if image_paths:
                cmd.extend(['--images'] + image_paths)
                
            try:
                print(f'  ⏳ Running PixVerse CLI with {model_name} ({quality})...')
                result = subprocess.run(cmd, capture_output=True, text=True, timeout=300)
                
                if result.returncode == 0:
                    try:
                        json_start = result.stdout.find('{')
                        if json_start >= 0:
                            data = json.loads(result.stdout[json_start:])
                            if data.get('image_url'):
                                out_dir = str(UPLOADS_DIR / f'gen-{task["id"]}')
                                os.makedirs(out_dir, exist_ok=True)
                                out_name = f'gen_{idx}_{model_name}_{int(time.time())}.png'
                                out_path = os.path.join(out_dir, out_name)
                                
                                subprocess.run(['curl', '-sL', data['image_url'], '-o', out_path])
                                
                                rel_url = f'/assets/storyboard/uploads/gen-{task["id"]}/{out_name}'
                                all_results.append({
                                    'id': f'gen-{task["id"]}-{idx}-{model_name}',
                                    'url': rel_url,
                                    'note': f'Generated image {idx+1} ({model_name})',
                                    'selected': False,
                                    'improve4k': False,
                                    'splitGrid': False,
                                })
                                print(f'    ✅ Downloaded: {out_name}')
                    except Exception as e:
                        print(f'    ⚠ JSON parse error: {e}')
                else:
                    print(f'    ⚠ PixVerse error: {result.stderr[:200]}')
            except Exception as e:
                print(f'    ⚠ Error: {e}')
            
    return all_results


def update_task_with_new_pass(task, pass_name, images):
    """Add a new pass to the task with the given images."""
    passes = task.get('passes', [])
    next_num = len(passes) + 1
    
    new_pass = {
        'id': f'pass-{next_num}',
        'name': f'Pass {next_num} — {pass_name}',
        'images': images,
    }
    
    task['passes'] = passes + [new_pass]
    task['activePassId'] = new_pass['id']
    task['generatedImages'] = images
    task['status'] = 'pass'
    task['updatedAt'] = time.strftime('%Y-%m-%dT%H:%M:%SZ', time.gmtime())
    
    return task


def sync_task_to_storyboard(task):
    """Write task state back to storyboard-data.json so the UI picks it up."""
    sb = load_storyboard()
    for i, t in enumerate(sb.get('agentTasks', [])):
        if t.get('id') == task['id']:
            sb['agentTasks'][i] = {**t, **{
                'status': task['status'],
                'passes': task.get('passes', []),
                'activePassId': task.get('activePassId'),
                'generatedImages': task.get('generatedImages', []),
                'updatedAt': task.get('updatedAt'),
            }}
            break
    save_storyboard(sb)


def process_task(task):
    """Process a single task — execute all pending skills."""
    task_id = task['id']
    title = task.get('title', task_id)
    status = task.get('status', '')
    
    if not status.endswith('_working'):
        return
    
    print(f'\n🎬 Processing: {title} (status: {status})')
    
    # Check for split grid images
    split_images = [i for i in task.get('generatedImages', []) if i.get('splitGrid')]
    improve_images = [i for i in task.get('generatedImages', []) if i.get('improve4k')]
    
    if split_images:
        print(f'  📐 Split Grid: {len(split_images)} images')
        panels = process_split_grid(task)
        if panels:
            task = update_task_with_new_pass(task, f'Split Grid ({len(panels)} panels)', panels)
            save_task(task)
            sync_task_to_storyboard(task)
            print(f'  ✅ Pass created with {len(panels)} panels')
    
    elif improve_images:
        print(f'  ✨ Enhance Quality: {len(improve_images)} images')
        results = process_improve_quality(task)
        if results:
            task = update_task_with_new_pass(task, f'Enhanced ({len(results)} images)', results)
            save_task(task)
            sync_task_to_storyboard(task)
            print(f'  ✅ Pass created with {len(results)} enhanced images')
    
    else:
        # General task: Generate images from prompt
        print(f'  📋 General task — running generation')
        results = process_general_task(task)
        if results:
            task = update_task_with_new_pass(task, f'Generated ({len(results)} images)', results)
            save_task(task)
            sync_task_to_storyboard(task)
            print(f'  ✅ Pass created with {len(results)} generated images')
        else:
            print(f'  ⚠ Generation failed or no prompt.')


def main():
    print('═' * 50)
    print('🎬 Director\'s Cut — Task Watcher (Theo Agent)')
    print('═' * 50)
    print(f'Watching: {TASKS_CURRENT}')
    print(f'Poll interval: {POLL_INTERVAL}s')
    print(f'Skills: Split Grid, Enhance Quality')
    print(f'Grid types: {", ".join(GRID_CONFIGS.keys())}')
    print()
    
    while True:
        try:
            # List all task files
            if TASKS_CURRENT.exists():
                for f in TASKS_CURRENT.glob('*.json'):
                    try:
                        task = json.loads(f.read_text())
                        if task.get('status', '').endswith('_working'):
                            process_task(task)
                    except Exception as e:
                        print(f'⚠ Error processing {f.name}: {e}')
        except Exception as e:
            print(f'⚠ Watcher error: {e}')
        
        time.sleep(POLL_INTERVAL)


if __name__ == '__main__':
    main()
