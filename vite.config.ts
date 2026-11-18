import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// Relative base keeps the build portable across GitHub Pages project sites,
// custom domains and Cloudflare Workers/Pages without a rebuild.
export default defineConfig({
  base: './',
  plugins: [react()],
  build: {
    target: 'es2020',
    cssCodeSplit: false,
    reportCompressedSize: true,
  },
  server: {
    port: 5173,
  },
})
