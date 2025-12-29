import { copyFileSync, mkdirSync, renameSync, existsSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
import type { Plugin } from 'vite';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

export function copyManifestPlugin(): Plugin {
  return {
    name: 'copy-manifest',
    writeBundle() {
      const rootDir = join(__dirname);
      const distDir = join(rootDir, 'dist');
      const srcManifest = join(rootDir, 'src', 'manifest.json');
      const distManifest = join(distDir, 'manifest.json');

      // Ensure dist directory exists
      mkdirSync(distDir, { recursive: true });

      // Copy manifest.json to dist
      try {
        copyFileSync(srcManifest, distManifest);
        console.log('✓ Copied manifest.json to dist/');
      } catch (error) {
        console.error('Failed to copy manifest.json:', error);
      }

      // Move popup.html from dist/src/popup.html to dist/popup.html
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
    },
  };
}

