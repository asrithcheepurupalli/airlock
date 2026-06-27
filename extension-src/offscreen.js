// offscreen.js — runs the on-device NER model inside an MV3 offscreen document.
//
// MV3 service workers can't host a long-lived ML pipeline (no DOM, killed
// often), and content scripts shouldn't each load tens of MB of weights. The
// standard answer is an offscreen document: one place that loads the model once
// and answers detection requests. Everything it needs (weights + wasm) is
// bundled in the extension, so the manifest declares no network permission and
// nothing is fetched at runtime.
//
// Built by vite (npm run build:ext) like the web app's worker, so the ONNX wasm
// is emitted as a SEPARATE file (not embedded) and loaded relative to this
// module. Weights are packaged under extension/models, so nothing hits the
// network at runtime.

import { pipeline, env } from '@huggingface/transformers'
import { aggregate } from '../src/ner-aggregate.js'

// Everything comes from the packaged extension, never the network.
env.allowRemoteModels = false
env.allowLocalModels = true
env.localModelPath = chrome.runtime.getURL('models/')
// ORT's wasm loader (.mjs) + binary (.wasm) MUST be local: without this,
// transformers fetches them from the jsDelivr CDN, which the network-free CSP
// blocks ("no available backend found"). These files are copied into ort/ by
// scripts/build-extension.mjs.
env.backends.onnx.wasm.wasmPaths = chrome.runtime.getURL('ort/')
// chrome-extension:// responses can't go in the browser Cache API; skip it.
env.useBrowserCache = false

const MODEL = 'Xenova/bert-base-NER'
let extractor = null
let loading = null

async function getExtractor() {
  if (extractor) return extractor
  if (!loading) {
    // q8 to match the single quantized weight file we bundle.
    loading = pipeline('token-classification', MODEL, { dtype: 'q8' }).then((p) => {
      extractor = p
      return p
    })
  }
  return loading
}

// Start loading the model as soon as this page exists, so the first real
// request isn't waiting on a cold 100 MB load.
getExtractor()
  .then(() => console.log('[airlock] NER model ready'))
  .catch((e) => console.error('[airlock] NER model failed to load:', e))

chrome.runtime.onMessage.addListener((msg, _sender, sendResponse) => {
  if (msg?.type !== 'airlock-ner-run') return
  ;(async () => {
    try {
      const ex = await getExtractor()
      const tokens = await ex(msg.text)
      sendResponse({ ok: true, spans: aggregate(tokens, msg.text) })
    } catch (err) {
      console.error('[airlock] NER inference error:', err) // rare; keep for support
      sendResponse({ ok: false, error: String(err?.message || err) })
    }
  })()
  return true // keep the channel open for the async reply
})
