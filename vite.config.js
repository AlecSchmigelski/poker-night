import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'

// https://vite.dev/config/
export default defineConfig({
  // Relative so one build works at a domain root or on a project subpath
  // (GitHub Pages) without a rebuild.
  base: './',
  plugins: [react()],
  // Honour PORT so a second dev server can come up alongside an existing one.
  // host:true binds the LAN address as well as localhost, so a phone or iPad
  // on the same wifi can load the dev server and test the real device rules.
  server: { host: true, port: Number(process.env.PORT) || 5173 },
})
