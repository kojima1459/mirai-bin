import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

// Candidate paths for sw.js
const candidates = [
  path.resolve(__dirname, '../dist/sw.js'),
  path.resolve(__dirname, '../dist/public/sw.js')
];

const swPath = candidates.find(p => fs.existsSync(p));

try {
  if (!swPath) {
    console.error(`Error: Service Worker file not found. Checked: ${candidates.join(', ')}`);
    process.exit(1);
  }

  console.log(`Processing Service Worker at: ${swPath}`);

  let content = fs.readFileSync(swPath, 'utf8');
  const buildId = process.env.VITE_BUILD_ID;

  if (!buildId) {
    console.error('Error: VITE_BUILD_ID environment variable is not set');
    process.exit(1);
  }

  // Replace the placeholder with the actual build ID
  const newContent = content.replace(/__BUILD_ID__/g, buildId);

  // Verify successful replacement
  if (content === newContent) {
     const isAlreadyReplaced = content.includes(`const BUILD_ID = '${buildId}'`); 
     if (isAlreadyReplaced) {
         console.log('BUILD_ID already injected.');
     } else {
         console.warn('Warning: __BUILD_ID__ placeholder not found in sw.js.');
     }
  } else {
     fs.writeFileSync(swPath, newContent, 'utf8');
     console.log(`Successfully injected BUILD_ID: ${buildId} into sw.js`);
  }

} catch (error) {
  console.error('Error processing sw.js:', error);
  process.exit(1);
}
