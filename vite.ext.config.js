import { defineConfig } from 'vite'
import { fileURLToPath } from 'node:url'

// Builds the offscreen NER page the SAME way the web app builds its worker:
// a normal (non-lib) build with offscreen.html as the entry, so transformers.js
// resolves to its module build and the ONNX wasm is emitted as a separate asset
// (not the 56 MB embedded-wasm bundle that lib mode pulled in).
//
// base './' is required so the built offscreen.html references its assets
// relative to chrome-extension://<id>/offscreen/ instead of the server root.
export default defineConfig({
  root: 'extension-src',
  base: './',
  build: {
    outDir: '../extension/offscreen',
    emptyOutDir: true,
    target: 'es2022',
    rollupOptions: {
      input: fileURLToPath(new URL('./extension-src/offscreen.html', import.meta.url)),
    },
  },
})
