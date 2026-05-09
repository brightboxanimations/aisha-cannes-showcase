import fs from 'fs';
import path from 'path';
import { execSync, spawn } from 'child_process';

const taskId = process.argv[2];
const prompt = process.argv[3];
const tasksCurrentDir = process.argv[4];

if (!taskId || !prompt || !tasksCurrentDir) {
  console.error("Missing arguments");
  process.exit(1);
}

const taskPath = path.join(tasksCurrentDir, `${taskId}.json`);

try {
  // 1. Get asset list
  console.log("Fetching asset list...");
  const output = execSync('npx pixverse-cli asset list --type image --limit 100 --json', { encoding: 'utf-8' });
  const data = JSON.parse(output);
  const assets = data.items || [];

  // 2. Parse times from prompt. Example: "20:00 and 22:40"
  // If not found, download last 4 images as fallback
  const timeMatches = [...prompt.matchAll(/(\d{1,2}:\d{2})/g)].map(m => m[1]);
  
  let targetAssets = [];

  if (timeMatches.length >= 2) {
    const startStr = timeMatches[0];
    const endStr = timeMatches[1];
    
    console.log(`Filtering from ${startStr} to ${endStr}`);
    
    // We assume the user meant UTC+2 (CEST), and pixverse outputs UTC times.
    // Let's just compare hours as strings roughly, but to be robust, let's convert to Date.
    // The timestamp format is "2026-05-06T16:28:24Z".
    // 20:00 local time = 18:00 UTC.
    // Wait, the prompt says "today 6th May". We'll just assume the times are relative to today.
    // For safety, let's just parse the times into numbers: 2000 and 2240.
    // The UTC times would be 1800 and 2040.
    
    const parseTime = (str) => {
      const [h, m] = str.split(':').map(Number);
      return h * 60 + m;
    };
    
    const startMinsLocal = parseTime(startStr);
    const endMinsLocal = parseTime(endStr);
    
    const startMinsUTC = startMinsLocal - 120; // UTC is -2h from CEST
    const endMinsUTC = endMinsLocal - 120;
    
    targetAssets = assets.filter(asset => {
      const createdDate = new Date(asset.created_at);
      const mUTC = createdDate.getUTCHours() * 60 + createdDate.getUTCMinutes();
      return mUTC >= startMinsUTC && mUTC <= endMinsUTC;
    });
  }

  if (targetAssets.length === 0) {
    console.log("No images matched time criteria, taking latest 4");
    targetAssets = assets.slice(0, 4); // Fallback to 4 most recent
  } else {
    console.log(`Found ${targetAssets.length} matching images.`);
  }

  // 3. Download images
  const uploadDirRelative = `assets/storyboard/uploads/${taskId}`;
  const uploadDir = path.join(process.cwd(), 'public', uploadDirRelative);
  fs.mkdirSync(uploadDir, { recursive: true });

  const generatedImages = [];
  
  for (let i = 0; i < targetAssets.length; i++) {
    const asset = targetAssets[i];
    console.log(`Downloading ${asset.asset_id}...`);
    try {
      execSync(`npx pixverse-cli asset download ${asset.asset_id} --type image --dest "${uploadDir}" --json`, { stdio: 'ignore' });
      
      // Look for the downloaded file
      const files = fs.readdirSync(uploadDir);
      const downloadedFile = files.find(f => f.includes(asset.asset_id.toString()));
      
      if (downloadedFile) {
        generatedImages.push({
          id: `img-${Date.now()}-${i}`,
          url: `/${uploadDirRelative}/${downloadedFile}`,
          note: '',
          selected: false,
          improve4k: false,
          splitGrid: false,
          pixverseId: asset.asset_id
        });
      }
    } catch (e) {
      console.error(`Failed to download ${asset.asset_id}`);
    }
  }

  // 4. Update task file
  if (fs.existsSync(taskPath)) {
    const taskData = JSON.parse(fs.readFileSync(taskPath, 'utf-8'));
    taskData.status = 'pass';
    
    const passId = `pass-${Date.now()}`;
    const newPass = {
      id: passId,
      name: 'PixVerse Download',
      timestamp: new Date().toISOString(),
      images: generatedImages
    };
    
    if (!taskData.passes) taskData.passes = [];
    taskData.passes.push(newPass);
    taskData.activePassId = passId;
    taskData.generatedImages = generatedImages;
    taskData.updatedAt = new Date().toISOString();
    
    fs.writeFileSync(taskPath, JSON.stringify(taskData, null, 2));
    console.log("Task updated successfully.");
  }

} catch (e) {
  console.error("Error during download:", e);
  if (fs.existsSync(taskPath)) {
    const taskData = JSON.parse(fs.readFileSync(taskPath, 'utf-8'));
    taskData.status = 'todo';
    taskData.errorNote = e.message;
    fs.writeFileSync(taskPath, JSON.stringify(taskData, null, 2));
  }
}
