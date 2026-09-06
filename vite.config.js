import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  // Honour PORT so a second dev server can come up alongside an existing one.
  server: { port: Number(process.env.PORT) || 5173 },
})
