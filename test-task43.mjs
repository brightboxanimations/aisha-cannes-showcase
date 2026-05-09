import fs from 'fs';
import { spawnSync } from 'child_process';

const taskData = JSON.parse(fs.readFileSync('public/assets/storyboard/tasks/current/task-74uf00c-moujamv3.json'));
let prompt = taskData.prompt;

const jsonMatch = prompt.match(/```json\s*(\{[\s\S]*?\})\s*```/);
if (jsonMatch) {
  const parsed = JSON.parse(jsonMatch[1]);
  if (parsed.prompt) prompt = parsed.prompt;
}
console.log("Extracted prompt length:", prompt.length);

const sceneHint = taskData.sceneHint;
const attachedPaths = [];
if (sceneHint) {
  const matches = sceneHint.match(/\/assets\/storyboard\/uploads\/[a-zA-Z0-9_.-]+/g);
  if (matches) {
    matches.forEach(m => attachedPaths.push(process.cwd() + '/public' + m));
  }
}
console.log("Attached paths:", attachedPaths.length);

const args = ['pixverse-cli', 'create', 'image', '--prompt', prompt, '--model', 'gemini-3.1-flash', '--quality', '2160p', '--aspect-ratio', '16:9'];
if (attachedPaths.length > 0) {
  args.push('--images', ...attachedPaths);
}

console.log("Running command:", 'npx', args.slice(0, 5).join(' ') + ' ...');
const res = spawnSync('npx', args, { encoding: 'utf-8' });
console.log("Status:", res.status);
console.log("Stdout:", res.stdout);
console.log("Stderr:", res.stderr);
