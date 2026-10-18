import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'

export default defineConfig({
  plugins: [vue()],
  base: '/prototipo_glosas/',
  server: {
    port: 5173,
  },
})