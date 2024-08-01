import { defineConfig } from 'tsup';

export default defineConfig({
  entry: ['src/cli.ts'],
  format: ['cjs'],
  target: 'node14',
  outDir: 'dist',
  clean: false,
  dts: false,
  noExternal: [], // Add modules like 'fs' or 'path' here if you want to bundle them
  banner: {
    js: '#!/usr/bin/env node'
  }
});
