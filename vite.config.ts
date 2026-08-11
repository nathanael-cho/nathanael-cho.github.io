import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  // The site is served from the root of nathanael-cho.github.io, so assets are
  // absolute from `/`. A project page would need its repository name here.
  base: '/',
  build: {
    // `gh-pages -d build` is what deploys, so keep Vite writing there rather
    // than to its default `dist`.
    outDir: 'build',
    sourcemap: true,
  },
  server: {
    port: 3000,
    open: true,
  },
  test: {
    globals: true,
    environment: 'jsdom',
    setupFiles: './src/setupTests.ts',
    // The circulation tests integrate tens of thousands of steps, so they need
    // considerably longer than the default.
    testTimeout: 60000,
    css: false,
  },
});
