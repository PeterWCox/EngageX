import { copyFileSync, mkdirSync, renameSync, existsSync } from 'fs';
import { dirname, join } from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const rootDir = join(__dirname, '..');
const distDir = join(rootDir, 'dist');

// Ensure dist directory exists
mkdirSync(distDir, { recursive: true });

// Copy manifest.json to dist
copyFileSync(
  join(rootDir, 'src', 'manifest.json'),
  join(distDir, 'manifest.json')
);

// Move popup.html from dist/src/popup.html to dist/popup.html
const popupSrc = join(distDir, 'src', 'popup.html');
const popupDest = join(distDir, 'popup.html');
if (existsSync(popupSrc)) {
  renameSync(popupSrc, popupDest);
  console.log('✓ Moved popup.html to dist/');
}

console.log('✓ Copied manifest.json to dist/');

