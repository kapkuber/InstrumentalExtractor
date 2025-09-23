import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  server: {
    proxy: {
      '/extract-instrumental': 'http://127.0.0.1:8000',
      '/extract-from-youtube': 'http://127.0.0.1:8000',
    },
  },
})

