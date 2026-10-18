import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { viteSingleFile } from 'vite-plugin-singlefile';

export default defineConfig(({mode}) => ({
  plugins: [react(), ...(mode === 'standalone' ? [viteSingleFile()] : [])],
  base: './',
  build: {
    outDir: mode === 'standalone' ? '../../testversion-build' : 'dist',
    emptyOutDir: true,
    assetsInlineLimit: mode === 'standalone' ? 10_000_000 : 4096,
  },
  clearScreen: false,
}));
