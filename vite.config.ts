import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// The app is served from https://<user>.github.io/math-facts/ on GitHub Pages.
export default defineConfig({
  base: '/math-facts/',
  plugins: [react()],
});
