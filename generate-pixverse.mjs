import fs from 'fs';
import path from 'path';
import { spawnSync } from 'child_process';

const taskId = process.argv[2];
let prompt = process.argv[3] || '';
const tasksCurrentDir = process.argv[4];
const sceneHint = process.argv[5] || '';
const skillHint = process.argv[6] || '';

// 1. Truncate and parse JSON if needed
try {
  const jsonMatch = prompt.match(/```json\s*(\{[\s\S]*?\})\s*```/);
  if (jsonMatch) {
    const parsed = JSON.parse(jsonMatch[1]);
    if (parsed.prompt) prompt = parsed.prompt;
  } else if (prompt.trim().startsWith('{') && prompt.trim().endsWith('}')) {
    const parsed = JSON.parse(prompt);
    if (parsed.prompt) prompt = parsed.prompt;
  }
} catch(e) {}

if (prompt.length > 4950) {
  prompt = prompt.substring(0, 4950);
}

// 2. Extract image paths
const attachedPaths = [];
if (sceneHint) {
  const matches = sceneHint.match(/\/assets\/storyboard\/uploads\/[a-zA-Z0-9_.-]+/g);
  if (matches) {
    matches.forEach(m => attachedPaths.push(path.join(process.cwd(), 'public', m)));
  }
}

const orderedImages = [];
const imageRegex = /@image\d+\s*=\s*([^—\n]+)/g;
let match;
const foundRefs = [];
while ((match = imageRegex.exec(prompt)) !== null) {
  foundRefs.push(match[1].trim().toLowerCase());
}

if (foundRefs.length > 0 && attachedPaths.length > 0) {
  for (const refName of foundRefs) {
    let bestMatch = attachedPaths[0];
    for (const p of attachedPaths) {
      if (p.toLowerCase().includes(refName.split(' ')[0])) { bestMatch = p; break; }
    }
    orderedImages.push(bestMatch);
  }
} else if (attachedPaths.length > 0) {
  orderedImages.push(...attachedPaths);
}

const isBatchGeneration = ['codex', 'generate', 'grid', 'batch'].some(word => skillHint.toLowerCase().includes(word));

const modelsToRun = isBatchGeneration ? [
  { model: 'gemini-3.1-flash', quality: '2160p' },
  { model: 'gemini-3.0', quality: '1440p' },
  { model: 'gpt-image-2.0', quality: '1440p', detailLevel: 'medium' }
] : [
  { model: 'gemini-3.1-flash', quality: '2160p' }
];

let allSuccess = true;
let finalExitCode = 0;

for (const modelCfg of modelsToRun) {
  const args = [
    'pixverse-cli', 'create', 'image',
    '--prompt', prompt,
    '--model', modelCfg.model,
    '--quality', modelCfg.quality,
    '--aspect-ratio', '16:9'
  ];
  if (modelCfg.detailLevel) args.push('--detail-level', modelCfg.detailLevel);
  if (orderedImages.length > 0) {
    args.push('--images', ...orderedImages);
  }
  
  if (isBatchGeneration) {
     args.push('--no-wait');
  }

  let retries = 15;
  let success = false;
  
  while (retries > 0 && !success) {
    console.log(`Running model ${modelCfg.model}... (retries left: ${retries})`);
    const res = spawnSync('npx', args, { encoding: 'utf-8', cwd: process.cwd() });
    
    if (res.status === 0) {
      success = true;
      console.log(`Success for ${modelCfg.model}`);
    } else {
      console.log(`Failed with status ${res.status}. Stderr: ${res.stderr}`);
      if (res.stderr && res.stderr.includes('concurrent generations') || res.status === 4) {
        console.log('Hit concurrency limit, waiting 20s...');
        spawnSync('sleep', ['20']);
        retries--;
      } else {
        // Unrecoverable error
        success = false;
        finalExitCode = res.status || 1;
        break;
      }
    }
  }
  
  if (!success) {
    allSuccess = false;
  }
}

// Collect generated images — find recent PNGs in CWD (pixverse-cli downloads them here)
const uploadsDir = path.join(process.cwd(), 'public', 'assets', 'storyboard', 'uploads');
const collectedImages = [];

if (allSuccess && !isBatchGeneration) {
  // Scan CWD for PNGs created in the last 10 minutes
  const cutoff = Date.now() - 600_000;
  const pngs = fs.readdirSync(process.cwd())
    .filter(f => f.endsWith('.png') && fs.statSync(f).mtime.getTime() > cutoff)
    .map(f => ({ name: f, time: fs.statSync(f).mtime.getTime() }))
    .sort((a, b) => b.time - a.time)
    .slice(0, 15); // Max 15 images

  for (const png of pngs) {
    const uniqueName = `gen-${taskId}-${Date.now()}-${Math.random().toString(36).slice(2, 6)}.png`;
    const destPath = path.join(uploadsDir, uniqueName);
    try {
      fs.renameSync(png.name, destPath);
      collectedImages.push({
        id: `img-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`,
        path: `/assets/storyboard/uploads/${uniqueName}`,
        url: `/assets/storyboard/uploads/${uniqueName}`,
        prompt: prompt.substring(0, 200),
        selected: false, improve4k: false, splitGrid: false,
      });
    } catch (e) {
      console.error(`Failed to move ${png.name}:`, e);
    }
  }
}

const taskPath = path.join(tasksCurrentDir, `${taskId}.json`);
if (fs.existsSync(taskPath)) {
  const taskData = JSON.parse(fs.readFileSync(taskPath, 'utf-8'));
  if (allSuccess) {
    taskData.status = isBatchGeneration ? 'done' : 'pass';
    taskData.errorNote = undefined;
    // Inject collected images into generatedImages so the pass view shows them
    if (collectedImages.length > 0) {
      if (!taskData.generatedImages) taskData.generatedImages = [];
      taskData.generatedImages.push(...collectedImages);
      // Also inject into active pass if present
      if (taskData.passes && taskData.activePassId) {
        const activePass = taskData.passes.find(p => p.id === taskData.activePassId);
        if (activePass) {
          if (!activePass.images) activePass.images = [];
          activePass.images.push(...collectedImages);
        }
      }
    }
  } else {
    taskData.status = 'todo';
    taskData.errorNote = `PixVerse exited with code ${finalExitCode || 4}`;
  }
  taskData.updatedAt = new Date().toISOString();
  fs.writeFileSync(taskPath, JSON.stringify(taskData, null, 2));
}

