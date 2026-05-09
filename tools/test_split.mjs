import { execFileSync } from 'child_process';
import path from 'path';

const publicDir = path.join(process.cwd(), 'public');
const storyboardUploads = path.join(publicDir, 'assets', 'storyboard', 'uploads');
const batchScript = path.join(process.cwd(), 'tools', 'batch_split.py');

try {
  const output = execFileSync('python3', [batchScript, publicDir, storyboardUploads], {
    input: JSON.stringify({ images: [ { url: '/assets/storyboard/uploads/test.png', splitType: '2x2' } ] }),
    timeout: 600000,
    maxBuffer: 50 * 1024 * 1024,
  }).toString();
  console.log('Output:', output);
} catch (e) {
  console.error('Error stdout:', e.stdout?.toString());
  console.error('Error stderr:', e.stderr?.toString());
}
