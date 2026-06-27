import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// The web app talks to the local relay on :8787. The relay only ever receives
// already-redacted text, never the raw prompt. Detection and rehydration both
// happen in the browser (src/redact.js).
export default defineConfig({
  plugins: [react()],
  server: {
    port: 5173,
    proxy: {
      '/api': 'http://localhost:8787',
    },
  },
})
