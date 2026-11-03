import { defineConfig } from 'vite'
import solid from 'vite-plugin-solid'

export default defineConfig({
  plugins: [solid()],
  build: { outDir: 'dist/web' },
  server: {
    proxy: { '/api': 'http://localhost:3000' },
  },
})
