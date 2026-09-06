import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'

// https://vite.dev/config/
export default defineConfig({
  // Relative so one build works at a domain root or on a project subpath
  // (GitHub Pages) without a rebuild.
  base: './',
  plugins: [react()],
  // Honour PORT so a second dev server can come up alongside an existing one.
  server: { port: Number(process.env.PORT) || 5173 },
})
