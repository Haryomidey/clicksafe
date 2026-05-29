import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import { copyFile, cp, mkdir, rm } from 'node:fs/promises';
import path from 'node:path';
import { build, type InlineConfig } from 'vite';

const root = process.cwd();
const distDir = path.resolve(root, 'dist');
const publicIconsDir = path.resolve(root, 'public/icons');

const baseConfig: InlineConfig = {
  root,
  configFile: false,
  publicDir: false,
  resolve: {
    alias: {
      '@': root,
    },
  },
};

const pageConfig: InlineConfig = {
  ...baseConfig,
  plugins: [react(), tailwindcss()],
  build: {
    outDir: distDir,
    emptyOutDir: true,
    rollupOptions: {
      input: {
        popup: path.resolve(root, 'popup.html'),
        dashboard: path.resolve(root, 'dashboard.html'),
      },
      output: {
        entryFileNames: 'assets/[name].js',
        chunkFileNames: 'assets/[name]-[hash].js',
        assetFileNames: 'assets/[name]-[hash][extname]',
      },
    },
  },
};

const backgroundConfig: InlineConfig = {
  ...baseConfig,
  build: {
    outDir: distDir,
    emptyOutDir: false,
    lib: {
      entry: path.resolve(root, 'src/background/serviceWorker.ts'),
      formats: ['es'],
      fileName: () => 'background.js',
    },
    rollupOptions: {
      output: {
        inlineDynamicImports: true,
      },
    },
  },
};

const contentScriptConfig: InlineConfig = {
  ...baseConfig,
  build: {
    outDir: distDir,
    emptyOutDir: false,
    lib: {
      entry: path.resolve(root, 'src/content/contentScript.ts'),
      formats: ['iife'],
      name: 'ClickSafeContentScript',
      fileName: () => 'contentScript.js',
    },
    rollupOptions: {
      output: {
        inlineDynamicImports: true,
      },
    },
  },
};

await rm(distDir, { recursive: true, force: true });
await build(pageConfig);
await build(backgroundConfig);
await build(contentScriptConfig);

await copyFile(path.resolve(root, 'manifest.json'), path.resolve(distDir, 'manifest.json'));
await mkdir(path.resolve(distDir, 'icons'), { recursive: true });
await cp(publicIconsDir, path.resolve(distDir, 'icons'), { recursive: true });