import { copyFileSync, mkdirSync, renameSync, existsSync, watch } from 'fs';
import { dirname, join } from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const rootDir = join(__dirname, '..');
const distDir = join(rootDir, 'dist');

// Ensure dist directory exists
mkdirSync(distDir, { recursive: true });

function copyManifest() {
  try {
    copyFileSync(
      join(rootDir, 'src', 'manifest.json'),
      join(distDir, 'manifest.json')
    );
    console.log('✓ Copied manifest.json to dist/');
  } catch (error) {
    // Ignore errors during initial setup
  }
}

function movePopup() {
  const popupSrc = join(distDir, 'src', 'popup.html');
  const popupDest = join(distDir, 'popup.html');
  if (existsSync(popupSrc)) {
    try {
      renameSync(popupSrc, popupDest);
      console.log('✓ Moved popup.html to dist/');
    } catch (error) {
      // File might be in use, ignore
    }
  }
}

// Initial copy
copyManifest();
movePopup();

// Watch for popup.html changes and move it
const popupSrcDir = join(distDir, 'src');
if (existsSync(popupSrcDir)) {
  watch(popupSrcDir, { recursive: false }, (eventType, filename) => {
    if (filename === 'popup.html') {
      setTimeout(() => {
        movePopup();
      }, 200);
    }
  });
}

// Watch for manifest changes
const manifestPath = join(rootDir, 'src', 'manifest.json');
if (existsSync(manifestPath)) {
  watch(manifestPath, (eventType) => {
    if (eventType === 'change') {
      setTimeout(() => {
        copyManifest();
      }, 100);
    }
  });
}

// Also watch dist/src directory for popup.html
const distSrcPath = join(distDir, 'src');
if (existsSync(distSrcPath)) {
  watch(distSrcPath, (eventType, filename) => {
    if (filename === 'popup.html') {
      setTimeout(() => {
        movePopup();
      }, 200);
    }
  });
}

console.log('Watching for manifest and popup changes...');

