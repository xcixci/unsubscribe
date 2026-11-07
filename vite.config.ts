/// <reference types="vitest" />
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// GitHub Pages serves this project from https://<user>.github.io/unsubscribe/
// Override with BASE_PATH=/ for a custom domain or local preview at the root.
const base = process.env.BASE_PATH ?? '/unsubscribe/';

export default defineConfig({
  base,
  plugins: [react()],
  build: {
    outDir: 'dist',
    sourcemap: false,
  },
  test: {
    environment: 'node',
    include: ['tests/**/*.test.ts'],
  },
});
