import { defineConfig } from 'vite'
import react, { reactCompilerPreset } from '@vitejs/plugin-react'
import babel from '@rolldown/plugin-babel'

// Backend base URL for the dev proxy. Override with API_BASE_URL env var.
const API_BASE_URL = process.env.API_BASE_URL ?? 'http://127.0.0.1:8000'

// https://vite.dev/config/
export default defineConfig({
  plugins: [
    react(),
    babel({ presets: [reactCompilerPreset()] })
  ],
  server: {
    // Any request to /api/* is forwarded to the Django backend so the
    // frontend can use relative URLs like `fetch('/api/cases/generate/')`.
    proxy: {
      '/api': {
        target: API_BASE_URL,
        changeOrigin: true,
      },
    },
  },
})
