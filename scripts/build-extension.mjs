// build-extension.mjs — make the extension self-contained.
//   download the NER model weights into extension/models/ (so no runtime network).
// The ONNX wasm is emitted by the vite build (vite.ext.config.js) alongside the
// offscreen bundle, so we no longer copy it here.
//
// Run AFTER `vite build --config vite.ext.config.js`.
// Usage: node scripts/build-extension.mjs

import { mkdir, writeFile, copyFile, stat } from 'node:fs/promises'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

const root = join(dirname(fileURLToPath(import.meta.url)), '..')
const MODEL = 'Xenova/bert-base-NER'
const BASE = `https://huggingface.co/${MODEL}/resolve/main`
const FILES = ['config.json', 'tokenizer.json', 'tokenizer_config.json', 'onnx/model_quantized.onnx']

const fmt = (n) => (n > 1e6 ? `${(n / 1e6).toFixed(1)} MB` : `${(n / 1e3).toFixed(0)} KB`)

async function download(rel) {
  const dest = join(root, 'extension', 'models', MODEL, rel)
  await mkdir(dirname(dest), { recursive: true })
  process.stdout.write(`  fetching ${rel} ... `)
  const res = await fetch(`${BASE}/${rel}`)
  if (!res.ok) throw new Error(`HTTP ${res.status} for ${rel}`)
  const buf = Buffer.from(await res.arrayBuffer())
  await writeFile(dest, buf)
  console.log(fmt(buf.length))
}

// ORT runtime (loader + wasm) must be packaged locally, or transformers fetches
// it from a CDN and the network-free CSP blocks it.
async function copyOrt() {
  const ortFiles = ['ort-wasm-simd-threaded.jsep.mjs', 'ort-wasm-simd-threaded.jsep.wasm']
  for (const f of ortFiles) {
    const src = join(root, 'node_modules', '@huggingface', 'transformers', 'dist', f)
    const dest = join(root, 'extension', 'ort', f)
    await mkdir(dirname(dest), { recursive: true })
    await copyFile(src, dest)
    const { size } = await stat(dest)
    console.log(`  copied ${f} ... ${fmt(size)}`)
  }
}

console.log('Bundling model weights:')
for (const f of FILES) await download(f)
console.log('Copying ORT runtime:')
await copyOrt()
console.log('Done. The extension now carries the model + runtime locally; no runtime network needed.')
