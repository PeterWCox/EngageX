import { copyFileSync, mkdirSync, renameSync, existsSync, readdirSync, statSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
import type { Plugin } from 'vite';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

function copyRecursive(src: string, dest: string) {
  const stat = statSync(src);
  if (stat.isDirectory()) {
    mkdirSync(dest, { recursive: true });
    const entries = readdirSync(src);
    for (const entry of entries) {
      copyRecursive(join(src, entry), join(dest, entry));
    }
  } else {
    copyFileSync(src, dest);
  }
}

export function copyManifestPlugin(): Plugin {
  return {
    name: 'copy-manifest',
    writeBundle() {
      const rootDir = join(__dirname);
      const distDir = join(rootDir, 'dist');
      const srcManifest = join(rootDir, 'src', 'manifest.json');
      const distManifest = join(distDir, 'manifest.json');
      const srcIcons = join(rootDir, 'src', 'icons');
      const distIcons = join(distDir, 'icons');

      // Ensure dist directory exists
      mkdirSync(distDir, { recursive: true });

      // Copy manifest.json to dist
      try {
        copyFileSync(srcManifest, distManifest);
        console.log('✓ Copied manifest.json to dist/');
      } catch (error) {
        console.error('Failed to copy manifest.json:', error);
      }

      // Copy icons directory to dist
      if (existsSync(srcIcons)) {
        try {
          copyRecursive(srcIcons, distIcons);
          console.log('✓ Copied icons directory to dist/');
        } catch (error) {
          console.error('Failed to copy icons directory:', error);
        }
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

