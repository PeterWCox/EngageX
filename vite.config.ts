import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { resolve } from 'path';
import { copyManifestPlugin } from './vite-plugin-copy-manifest';

export default defineConfig({
  plugins: [react(), copyManifestPlugin()],
  test: {
    globals: true,
    environment: 'jsdom',
  },
  resolve: {
    alias: {
      '@': resolve(__dirname, './src'),
    },
  },
  build: {
    outDir: 'dist',
    emptyOutDir: true,
    rollupOptions: {
      input: {
        background: resolve(__dirname, 'src/background/index.ts'),
        'content/storage-bridge': resolve(__dirname, 'src/content/storage-bridge.ts'),
        content: resolve(__dirname, 'src/content/index.ts'),
        popup: resolve(__dirname, 'src/popup.html'),
      },
      output: {
        entryFileNames: (chunkInfo) => {
          if (chunkInfo.name === 'background') {
            return 'background/[name].js';
          }
          if (chunkInfo.name === 'content/storage-bridge') {
            return 'content/storage-bridge.js';
          }
          if (chunkInfo.name === 'content') {
            return 'content/[name].js';
          }
          return '[name].js';
        },
        assetFileNames: (assetInfo) => {
          if (assetInfo.name === 'popup.html') {
            return 'popup.html';
          }
          return 'assets/[name][extname]';
        },
      },
    },
  },
  publicDir: false,
});

