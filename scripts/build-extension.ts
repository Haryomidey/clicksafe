import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import { copyFile, mkdir, rm, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { deflateSync } from 'node:zlib';
import { build, type InlineConfig } from 'vite';

const root = process.cwd();
const distDir = path.resolve(root, 'dist');

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

const makeCrcTable = () => {
  const table = new Uint32Array(256);
  for (let n = 0; n < 256; n += 1) {
    let c = n;
    for (let k = 0; k < 8; k += 1) {
      c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
    }
    table[n] = c >>> 0;
  }
  return table;
};

const crcTable = makeCrcTable();

const crc32 = (input: Buffer) => {
  let crc = 0xffffffff;
  for (const byte of input) {
    crc = crcTable[(crc ^ byte) & 0xff] ^ (crc >>> 8);
  }
  return (crc ^ 0xffffffff) >>> 0;
};

const pngChunk = (type: string, data: Buffer) => {
  const typeBuffer = Buffer.from(type);
  const length = Buffer.alloc(4);
  length.writeUInt32BE(data.length);
  const crc = Buffer.alloc(4);
  crc.writeUInt32BE(crc32(Buffer.concat([typeBuffer, data])));
  return Buffer.concat([length, typeBuffer, data, crc]);
};

const pointInPolygon = (x: number, y: number, polygon: Array<[number, number]>) => {
  let inside = false;
  for (let i = 0, j = polygon.length - 1; i < polygon.length; j = i, i += 1) {
    const xi = polygon[i][0];
    const yi = polygon[i][1];
    const xj = polygon[j][0];
    const yj = polygon[j][1];
    const intersects = yi > y !== yj > y && x < ((xj - xi) * (y - yi)) / (yj - yi) + xi;
    if (intersects) inside = !inside;
  }
  return inside;
};

const distanceToSegment = (px: number, py: number, ax: number, ay: number, bx: number, by: number) => {
  const dx = bx - ax;
  const dy = by - ay;
  const lengthSquared = dx * dx + dy * dy || 1;
  const t = Math.max(0, Math.min(1, ((px - ax) * dx + (py - ay) * dy) / lengthSquared));
  const x = ax + t * dx;
  const y = ay + t * dy;
  return Math.hypot(px - x, py - y);
};

const createPngIcon = (size: number) => {
  const rows: Buffer[] = [];
  const shield: Array<[number, number]> = [
    [0.5, 0.12],
    [0.8, 0.24],
    [0.8, 0.5],
    [0.68, 0.76],
    [0.5, 0.9],
    [0.32, 0.76],
    [0.2, 0.5],
    [0.2, 0.24],
  ];

  for (let y = 0; y < size; y += 1) {
    const row = Buffer.alloc(1 + size * 4);
    row[0] = 0;
    for (let x = 0; x < size; x += 1) {
      const nx = (x + 0.5) / size;
      const ny = (y + 0.5) / size;
      const offset = 1 + x * 4;
      let color: [number, number, number] = [23, 23, 23];
      if (pointInPolygon(nx, ny, shield)) {
        color = [255, 255, 255];
      }
      const onCheck =
        distanceToSegment(nx, ny, 0.34, 0.56, 0.45, 0.68) < 0.045 ||
        distanceToSegment(nx, ny, 0.45, 0.68, 0.68, 0.42) < 0.045;
      if (onCheck) {
        color = [23, 23, 23];
      }
      row[offset] = color[0];
      row[offset + 1] = color[1];
      row[offset + 2] = color[2];
      row[offset + 3] = 255;
    }
    rows.push(row);
  }

  const header = Buffer.alloc(13);
  header.writeUInt32BE(size, 0);
  header.writeUInt32BE(size, 4);
  header[8] = 8;
  header[9] = 6;

  return Buffer.concat([
    Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
    pngChunk('IHDR', header),
    pngChunk('IDAT', deflateSync(Buffer.concat(rows))),
    pngChunk('IEND', Buffer.alloc(0)),
  ]);
};

await rm(distDir, { recursive: true, force: true });
await build(pageConfig);
await build(backgroundConfig);
await build(contentScriptConfig);

await copyFile(path.resolve(root, 'manifest.json'), path.resolve(distDir, 'manifest.json'));
await mkdir(path.resolve(distDir, 'icons'), { recursive: true });
await Promise.all([16, 48, 128].map((size) => writeFile(path.resolve(distDir, 'icons', `icon${size}.png`), createPngIcon(size))));
