import fs from 'fs';
import path from 'path';
import { spawnSync } from 'child_process';

const taskId = process.argv[2];
const imageId = process.argv[3];
const imagePath = process.argv[4];
const prompt = process.argv[5] || '';
const tasksCurrentDir = process.argv[6];

const modelsToRun = [
  { model: 'gemini-3.1-flash', quality: '2160p' },
  { model: 'gpt-image-2.0', quality: '1440p', detailLevel: 'medium' }
];

let allSuccess = true;
const newImages = [];

for (const modelCfg of modelsToRun) {
  const args = [
    'pixverse-cli', 'create', 'image',
    '--prompt', prompt,
    '--model', modelCfg.model,
    '--quality', modelCfg.quality,
    '--aspect-ratio', '16:9',
    '--images', path.join(process.cwd(), 'public', imagePath)
    // REMOVED --no-wait so it downloads immediately
  ];
  if (modelCfg.detailLevel) args.push('--detail-level', modelCfg.detailLevel);

  let retries = 5;
  let success = false;
  
  while (retries > 0 && !success) {
    console.log(`Improving image with ${modelCfg.model}...`);
    const res = spawnSync('npx', args, { encoding: 'utf-8', cwd: process.cwd() });
    
    if (res.status === 0) {
      success = true;
      // Look for the downloaded PNG in process.cwd()
      const files = fs.readdirSync(process.cwd()).filter(f => f.endsWith('.png'));
      const latestPng = files.map(f => ({ name: f, time: fs.statSync(f).mtime.getTime() })).sort((a,b) => b.time - a.time)[0];
      
      if (latestPng) {
        const uniqueName = `improved-${modelCfg.model}-${Date.now()}.png`;
        const destPath = path.join(process.cwd(), 'public', 'assets', 'storyboard', 'uploads', uniqueName);
        fs.renameSync(latestPng.name, destPath);
        newImages.push({
          id: `img-${Date.now()}-${Math.random().toString(36).substr(2,9)}`,
          path: `/assets/storyboard/uploads/${uniqueName}`,
          prompt: `[Improved with ${modelCfg.model}] ${prompt}`
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
  
  if (!success) {
    allSuccess = false;
  }
}

// Update task.json with the new images
const taskPath = path.join(tasksCurrentDir, `${taskId}.json`);
if (fs.existsSync(taskPath) && newImages.length > 0) {
  let taskData = JSON.parse(fs.readFileSync(taskPath, 'utf-8'));
  if (!taskData.generatedImages) taskData.generatedImages = [];
  
  // Clear the improve4k flag on the original image so it stops spinning in the UI
  // Note: we need to find it in the PREVIOUS pass where it was checked, or root
  const origImg = taskData.generatedImages.find(i => i.id === imageId);
  if (origImg) origImg.improve4k = false;
  
  if (taskData.passes) {
    for (const p of taskData.passes) {
       const pImg = p.images?.find(i => i.id === imageId);
       if (pImg) pImg.improve4k = false;
    }
  }

  taskData.generatedImages.push(...newImages);
  
  // If there's an active pass (from the batch system), push to it
  if (taskData.activePassId && taskData.passes) {
    const activePass = taskData.passes.find(p => p.id === taskData.activePassId);
    if (activePass) {
      if (!activePass.images) activePass.images = [];
      activePass.images.push(...newImages);
    }
  }
  
  taskData.updatedAt = new Date().toISOString();
  fs.writeFileSync(taskPath, JSON.stringify(taskData, null, 2));
}
