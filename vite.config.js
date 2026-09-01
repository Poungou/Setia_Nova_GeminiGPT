import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import woltarAuth from './plugins/woltar-auth.js'
import woltarAdmin from './plugins/woltar-admin.js'
import woltarAccount from './plugins/woltar-account.js'
import woltarAether from './plugins/woltar-aether.js'
import woltarPublic from './plugins/woltar-public.js'

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react(), woltarAuth(), woltarAdmin(), woltarAccount(), woltarAether(), woltarPublic()],
  server: {
    port: 5173,
  },
})
