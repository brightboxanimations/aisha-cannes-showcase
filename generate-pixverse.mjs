import fs from 'fs';
import path from 'path';
import { spawnSync } from 'child_process';

const taskId = process.argv[2];
let prompt = process.argv[3] || '';
const tasksCurrentDir = process.argv[4];
const sceneHint = process.argv[5] || '';
const skillHint = process.argv[6] || '';

if (!taskId || !tasksCurrentDir) {
  console.error('Missing taskId or tasksCurrentDir');
  process.exit(1);
}

const taskPath = path.join(tasksCurrentDir, `${taskId}.json`);

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
  // Match all paths like /assets/storyboard/uploads/ANYTHING
  const matches = sceneHint.match(/\/assets\/storyboard\/uploads\/[^\s|]+/g);
  if (matches) {
    matches.forEach(m => {
      const fullPath = path.join(process.cwd(), 'public', m.replace(/[?#].*$/, ''));
      if (fs.existsSync(fullPath)) attachedPaths.push(fullPath);
    });
  }
  // Also try matching original filenames like "characters/xyz.png" or full paths
  const origMatches = sceneHint.match(/\/assets\/storyboard\/[^\s|]+/g);
  if (origMatches) {
    origMatches.forEach(m => {
      const fullPath = path.join(process.cwd(), 'public', m.replace(/[?#].*$/, ''));
      if (fs.existsSync(fullPath) && !attachedPaths.includes(fullPath)) attachedPaths.push(fullPath);
    });
  }
  // Fallback: bare filenames in brackets like [filename.png] — resolve to uploads dir
  const bracketMatches = sceneHint.match(/\[([^\]]+\.(png|jpg|jpeg|webp))\]/gi);
  if (bracketMatches) {
    bracketMatches.forEach(bm => {
      const filename = bm.replace(/^\[|\]$/g, '');
      const fullPath = path.join(process.cwd(), 'public', 'assets', 'storyboard', 'uploads', filename);
      if (fs.existsSync(fullPath) && !attachedPaths.includes(fullPath)) attachedPaths.push(fullPath);
    });
  }
  // Fallback: "upload: filename /assets/..." patterns from disk uploads
  const uploadMatches = sceneHint.match(/upload:\s*[^\s]+\s+(\/assets\/[^\s|]+)/gi);
  if (uploadMatches) {
    uploadMatches.forEach(um => {
      const urlMatch = um.match(/(\/assets\/[^\s|]+)/);
      if (urlMatch) {
        const fullPath = path.join(process.cwd(), 'public', urlMatch[1].replace(/[?#].*$/, ''));
        if (fs.existsSync(fullPath) && !attachedPaths.includes(fullPath)) attachedPaths.push(fullPath);
      }
    });
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
    // Fuzzy-match: try all words from reference name against path
    const refWords = refName.toLowerCase().split(/[\s,_-]+/).filter(w => w.length > 2);
    let bestMatch = null;
    let bestScore = 0;
    for (const p of attachedPaths) {
      const pLower = p.toLowerCase();
      let score = 0;
      for (const word of refWords) {
        if (pLower.includes(word)) score++;
      }
      if (score > bestScore) { bestScore = score; bestMatch = p; }
    }
    orderedImages.push(bestMatch || attachedPaths[0]);
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
      if ((res.stderr && res.stderr.includes('concurrent generations')) || res.status === 4) {
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

if (fs.existsSync(taskPath)) {
  const taskData = JSON.parse(fs.readFileSync(taskPath, 'utf-8'));
  if (allSuccess) {
    // For batch generation (--no-wait), images are NOT downloaded yet — they are being generated on PixVerse servers
    if (isBatchGeneration) {
      taskData.status = 'pass';
      taskData.errorNote = undefined;
      // Create a new pass noting the batch was submitted
      const passId = `pass-batch-${Date.now()}`;
      const modelsUsed = modelsToRun.map(m => m.model).join(', ');
      const newPass = {
        id: passId,
        name: `Batch ${new Date().toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' })}`,
        timestamp: new Date().toISOString(),
        images: []
      };
      if (!taskData.passes) taskData.passes = [];
      taskData.passes.push(newPass);
      taskData.activePassId = passId;
      taskData.generatedImages = [];
      taskData.batchNote = `Submitted to PixVerse with models: ${modelsUsed}. Images are generating — use 'Download from PixVerse' to collect them when ready.`;
    } else {
      taskData.status = 'pass';
      taskData.errorNote = undefined;
      // Inject collected images into generatedImages so the pass view shows them
      if (collectedImages.length > 0) {
        if (!taskData.generatedImages) taskData.generatedImages = [];
        taskData.generatedImages.push(...collectedImages);
        // Also create or inject into active pass
        const passId = taskData.activePassId || `pass-gen-${Date.now()}`;
        if (taskData.passes) {
          const activePass = taskData.passes.find(p => p.id === taskData.activePassId);
          if (activePass) {
            if (!activePass.images) activePass.images = [];
            activePass.images.push(...collectedImages);
          } else {
            taskData.passes.push({ id: passId, name: 'Generated', timestamp: new Date().toISOString(), images: collectedImages });
            taskData.activePassId = passId;
          }
        } else {
          taskData.passes = [{ id: passId, name: 'Generated', timestamp: new Date().toISOString(), images: collectedImages }];
          taskData.activePassId = passId;
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
