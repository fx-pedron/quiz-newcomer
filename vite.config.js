import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import quizWsPlugin from './vite-plugin-quiz-ws.js'

export default defineConfig({
  plugins: [react(), quizWsPlugin()],
  server: { host: true },
  optimizeDeps: {
    entries: ['src/main.jsx'],
  },
})
