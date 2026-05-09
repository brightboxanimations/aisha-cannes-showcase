import fs from 'fs';
import path from 'path';
import { spawnSync } from 'child_process';

const tasksDir = path.join(process.cwd(), 'public', 'assets', 'storyboard', 'tasks', 'current');
const logFile = path.join(process.cwd(), 'act9_submit.log');
const errorFile = path.join(process.cwd(), 'act9_submit.failed.log');

const imageMap = {
  '@image1': '/Users/vaquita/Downloads/aisha/Scenes (Locations) visual references/ACT 9 SHARAK PALACE/Aisha refernce close up and full body.png',
  '@image2': '/Users/vaquita/Downloads/aisha/Scenes (Locations) visual references/ACT 9 SHARAK PALACE/panther.png',
  '@image3': '/Users/vaquita/Downloads/aisha/Scenes (Locations) visual references/ACT 9 SHARAK PALACE/Plasma character.png',
  '@image4': '/Users/vaquita/Downloads/aisha/Scenes (Locations) visual references/ACT 9 SHARAK PALACE/Shadow king Sharak.png',
  '@image5': '/Users/vaquita/Downloads/aisha/Scenes (Locations) visual references/ACT 9 SHARAK PALACE/Sharak with spider legs.png',
  '@image6': '/Users/vaquita/Downloads/aisha/Scenes (Locations) visual references/ACT 9 SHARAK PALACE/nizbu spider full sizepng.png',
  '@image7': '/Users/vaquita/Downloads/aisha/Scenes (Locations) visual references/ACT 9 SHARAK PALACE/sharak room 4 projections .png',
  '@image8': '/Users/vaquita/Downloads/aisha/Scenes (Locations) visual references/ACT 9 SHARAK PALACE/front view sharak corridor.png',
  '@image9': '/Users/vaquita/Downloads/aisha/Scenes (Locations) visual references/ACT 9 SHARAK PALACE/human face of the plasma character.png',
  '@image10': '/Users/vaquita/Downloads/aisha/Scenes (Locations) visual references/ACT 9 SHARAK PALACE/arrivign to the sharak palace exterior .png'
};

const models = [
  { name: 'gemini-3.1-flash', quality: '2160p' },
  { name: 'gemini-3.0', quality: '1440p' },
  { name: 'gpt-image-2.0', quality: '1440p', detailLevel: 'medium' }
];

const files = fs.readdirSync(tasksDir).filter(f => f.startsWith('task-battle-'));
files.sort((a,b) => {
  const n1 = parseInt(a.split('-').pop().split('.')[0]);
  const n2 = parseInt(b.split('-').pop().split('.')[0]);
  return n1 - n2;
});

console.log(`Found ${files.length} battle tasks. Submitting to PixVerse...`);

for (const file of files) {
  const taskPath = path.join(tasksDir, file);
  const task = JSON.parse(fs.readFileSync(taskPath, 'utf8'));
  const prompt = task.prompt;
  
  // Find which @images are used in this prompt and keep them in order of their number
  const usedImages = [];
  for (let i = 1; i <= 10; i++) {
    const key = `@image${i}`;
    if (prompt.includes(key)) {
      usedImages.push(imageMap[key]);
    }
  }
  
  console.log(`\nSubmitting ${task.title} (${usedImages.length} references)...`);
  
  for (const modelCfg of models) {
    const args = [
      'pixverse-cli', 'create', 'image',
      '--prompt', prompt,
      '--model', modelCfg.name,
      '--quality', modelCfg.quality,
      '--aspect-ratio', '16:9',
      '--no-wait',
      '--json'
    ];
    if (modelCfg.detailLevel) args.push('--detail-level', modelCfg.detailLevel);
    if (usedImages.length > 0) {
      args.push('--images');
      args.push(...usedImages);
    }
    
    let retries = 5;
    let success = false;
    
    while (retries > 0 && !success) {
      process.stdout.write(`  [${modelCfg.name}] `);
      const res = spawnSync('npx', args, { encoding: 'utf-8', cwd: process.cwd() });
      
      if (res.status === 0) {
        success = true;
        try {
          const outData = JSON.parse(res.stdout);
          const logLine = `[${new Date().toISOString()}] SUCCESS | ${task.title} | ${modelCfg.name} | Job ID: ${outData.id}\n`;
          fs.appendFileSync(logFile, logLine);
          console.log(`Submitted! ID: ${outData.id}`);
        } catch(e) {
          console.log(`Submitted (could not parse JSON)`);
        }
      } else {
        const errText = res.stderr || res.stdout || '';
        if (errText.includes('concurrent') || res.status === 4) {
          console.log(`Concurrency limit. Retrying in 10s... (${retries} left)`);
          spawnSync('sleep', ['10']);
          retries--;
        } else {
          success = false;
          const errLine = `[${new Date().toISOString()}] ERROR | ${task.title} | ${modelCfg.name} | ${errText}\n`;
          fs.appendFileSync(errorFile, errLine);
          console.log(`Failed! ${errText.substring(0,50)}...`);
          break;
        }
      }
    }
  }
}

console.log('\nAll submissions completed! Check act9_submit.log');
