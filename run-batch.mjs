import fs from 'fs';
import path from 'path';
import { spawn, spawnSync, execFileSync } from 'child_process';

const taskId = process.argv[2];
const activePassId = process.argv[3];
const tasksCurrentDir = process.argv[4];

// Read input payload
const payloadPath = path.join(process.cwd(), 'public', 'assets', 'storyboard', 'scratch', `batch-${taskId}.json`);
const payload = JSON.parse(fs.readFileSync(payloadPath, 'utf8'));
const { splits, improves, notes } = payload;

const taskPath = path.join(tasksCurrentDir, `${taskId}.json`);

// FIXED: Only append to the ACTIVE PASS images, never touch generatedImages 
// (the UI sets generatedImages from whichever pass is active)
function appendToPass(newImages) {
  if (newImages.length === 0) return;
  let taskData = JSON.parse(fs.readFileSync(taskPath, 'utf-8'));
  
  if (taskData.passes) {
    const activePass = taskData.passes.find(p => p.id === activePassId);
    if (activePass) {
      if (!activePass.images) activePass.images = [];
      activePass.images.push(...newImages);
    }
  }
  
  // Only set generatedImages if activePassId matches (for UI polling to pick up)
  if (taskData.activePassId === activePassId) {
    const activePass = taskData.passes?.find(p => p.id === activePassId);
    taskData.generatedImages = activePass?.images || [];
  }
  
  taskData.updatedAt = new Date().toISOString();
  fs.writeFileSync(taskPath, JSON.stringify(taskData, null, 2));
}

async function runSplits() {
  if (!splits || splits.length === 0) return;
  try {
    const publicDir = path.join(process.cwd(), 'public');
    const storyboardUploads = path.join(publicDir, 'assets', 'storyboard', 'uploads');
    const batchScript = path.join(process.cwd(), 'tools', 'batch_split.py');

    const output = execFileSync('python3', [batchScript, publicDir, storyboardUploads], {
      input: JSON.stringify({ images: splits }),
      timeout: 600000,
      maxBuffer: 50 * 1024 * 1024,
    }).toString();

    const panels = JSON.parse(output);
    const formattedPanels = panels.map(p => ({
      id: `split-${p.imgId}-r${p.row}c${p.col}-${Date.now()}`,
      url: `/assets/storyboard/uploads/${p.outDir}/${p.filename}`,
      path: `/assets/storyboard/uploads/${p.outDir}/${p.filename}`,
      row: p.row, col: p.col, width: p.width, height: p.height,
      selected: false, improve4k: false, splitGrid: false,
    }));
    
    appendToPass(formattedPanels);
  } catch (e) {
    console.error('Split error:', e);
  }
}

async function runImproves() {
  if (!improves || improves.length === 0) return;
  for (const imp of improves) {
    const { imageId, imagePath, prompt, models } = imp;
    
    let allSuccess = true;
    const newImages = [];

    for (const model of models) {
      const modelQuality = { 'seedream-4.5': '2160p', 'gpt-image-2.0': '1440p', 'gemini-3.1-flash': '2160p', 'gemini-3.0': '1440p', 'kling-image-v3': '2160p' };
      const quality = modelQuality[model] || '2160p';
      
      const args = [
        'pixverse-cli', 'create', 'image',
        '--prompt', prompt,
        '--model', model,
        '--quality', quality,
        '--aspect-ratio', '16:9',
        '--images', path.join(process.cwd(), 'public', imagePath)
      ];
      if (model === 'gpt-image-2.0') args.push('--detail-level', 'medium');

      let retries = 5;
      let success = false;
      
      while (retries > 0 && !success) {
        console.log(`Improving image with ${model}...`);
        const res = spawnSync('npx', args, { encoding: 'utf-8', cwd: process.cwd() });
        
        if (res.status === 0) {
          success = true;
          const files = fs.readdirSync(process.cwd()).filter(f => f.endsWith('.png'));
          const latestPng = files.map(f => ({ name: f, time: fs.statSync(f).mtime.getTime() })).sort((a,b) => b.time - a.time)[0];
          
          if (latestPng) {
            const uniqueName = `improved-${model}-${Date.now()}.png`;
            const destPath = path.join(process.cwd(), 'public', 'assets', 'storyboard', 'uploads', uniqueName);
            fs.renameSync(latestPng.name, destPath);
            newImages.push({
              id: `img-${Date.now()}-${Math.random().toString(36).substr(2,9)}`,
              path: `/assets/storyboard/uploads/${uniqueName}`,
              url: `/assets/storyboard/uploads/${uniqueName}`,
              prompt: `[Improved with ${model}] ${prompt}`,
              selected: false, improve4k: false, splitGrid: false,
            });
          }
        } else {
          if (res.stderr && res.stderr.includes('concurrent generations') || res.status === 4) {
            console.log('Hit concurrency limit, waiting 15s...');
            spawnSync('sleep', ['15']);
            retries--;
          } else {
            success = false;
            break;
          }
        }
      }
      
      if (!success) allSuccess = false;
    }
    
    if (newImages.length > 0) {
      appendToPass(newImages);
    }
    
    // Clear flags on original image — ONLY in the source pass, not all passes
    let taskData = JSON.parse(fs.readFileSync(taskPath, 'utf-8'));
    if (taskData.passes) {
      for (const p of taskData.passes) {
         const pImg = p.images?.find(i => i.id === imageId);
         if (pImg) pImg.improve4k = false;
      }
    }
    fs.writeFileSync(taskPath, JSON.stringify(taskData, null, 2));
  }
}

// FIXED: Note text IS the prompt — send it directly to PixVerse, no AI rewrite
async function runNotes() {
  if (!notes || notes.length === 0) return;
  
  for (const n of notes) {
    const { imageId, imagePath, note, doodle, attachedImages } = n;
    
    // The note text IS the prompt — send exact text, no AI interpretation
    const finalPrompt = note;
    
    // Build image references: original image always first, then any attached images
    const imageRefs = [];
    const mainImgPath = path.join(process.cwd(), 'public', imagePath);
    if (fs.existsSync(mainImgPath)) {
      imageRefs.push(mainImgPath);
    }
    
    // Add attached reference images (up to 5)
    if (attachedImages && Array.isArray(attachedImages)) {
      for (const refImg of attachedImages.slice(0, 5)) {
        const refPath = path.join(process.cwd(), 'public', refImg);
        if (fs.existsSync(refPath)) {
          imageRefs.push(refPath);
        }
      }
    }
    
    // Handle doodle overlay
    let targetImagePath = mainImgPath;
    if (doodle) {
      const base64Data = doodle.replace(/^data:image\/png;base64,/, "");
      const doodlePath = path.join(process.cwd(), 'public', 'assets', 'storyboard', 'scratch', `doodle-${Date.now()}.png`);
      fs.writeFileSync(doodlePath, base64Data, 'base64');
      imageRefs[0] = doodlePath; // Replace main image with doodle version
    }
    
    // Build PixVerse CLI args — pass all image refs
    const modelCfg = { model: 'gemini-3.1-flash', quality: '2160p' };
    const args = [
      'pixverse-cli', 'create', 'image',
      '--prompt', finalPrompt,
      '--model', modelCfg.model,
      '--quality', modelCfg.quality,
      '--aspect-ratio', '16:9',
      '--images', ...imageRefs
    ];
    
    let retries = 5;
    let success = false;
    const newImages = [];
    
    while (retries > 0 && !success) {
      console.log(`Generating from note: "${finalPrompt.substring(0, 80)}..." with ${imageRefs.length} ref image(s)`);
      const res = spawnSync('npx', args, { encoding: 'utf-8', cwd: process.cwd() });
      
      if (res.status === 0) {
        success = true;
        const files = fs.readdirSync(process.cwd()).filter(f => f.endsWith('.png'));
        const latestPng = files.map(f => ({ name: f, time: fs.statSync(f).mtime.getTime() })).sort((a,b) => b.time - a.time)[0];
        if (latestPng) {
          const uniqueName = `note-gen-${Date.now()}.png`;
          const destPath = path.join(process.cwd(), 'public', 'assets', 'storyboard', 'uploads', uniqueName);
          fs.renameSync(latestPng.name, destPath);
          newImages.push({
            id: `img-${Date.now()}-${Math.random().toString(36).substr(2,9)}`,
            path: `/assets/storyboard/uploads/${uniqueName}`,
            url: `/assets/storyboard/uploads/${uniqueName}`,
            prompt: finalPrompt,
            note: note,
            selected: false, improve4k: false, splitGrid: false,
          });
        }
      } else {
        if (res.stderr && res.stderr.includes('concurrent generations') || res.status === 4) {
          spawnSync('sleep', ['15']);
          retries--;
        } else {
          success = false; break;
        }
      }
    }
    
    if (newImages.length > 0) {
      appendToPass(newImages);
    }
    
    // Clear note flag on original image
    let taskData = JSON.parse(fs.readFileSync(taskPath, 'utf-8'));
    if (taskData.passes) {
      for (const p of taskData.passes) {
         const pImg = p.images?.find(i => i.id === imageId);
         if (pImg) pImg.noteActive = false;
      }
    }
    fs.writeFileSync(taskPath, JSON.stringify(taskData, null, 2));
  }
}

async function main() {
  await Promise.all([runSplits(), runImproves(), runNotes()]);
  
  // Final: set status to 'pass' and update generatedImages to match the active pass only
  let taskData = JSON.parse(fs.readFileSync(taskPath, 'utf-8'));
  taskData.status = 'pass';
  
  // Set generatedImages to ONLY the active pass's images
  const activePass = taskData.passes?.find(p => p.id === activePassId);
  if (activePass?.images) {
    taskData.generatedImages = activePass.images;
  }
  
  taskData.updatedAt = new Date().toISOString();
  fs.writeFileSync(taskPath, JSON.stringify(taskData, null, 2));
  
  // Clean up scratch file
  try { fs.unlinkSync(payloadPath); } catch {}
}

main().catch(console.error);
