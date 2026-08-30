import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import woltarAdmin from './plugins/woltar-admin.js'

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react(), woltarAdmin()],
  server: {
    port: 5173,
  },
})
