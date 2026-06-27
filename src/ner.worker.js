// ner.worker.js — the on-device name detector.
//
// This is moat #1 made real: a real NER model that catches names, organizations,
// and locations in free text — the things no regex or hand-typed term list can
// know are sensitive. It runs in a Web Worker so typing stays smooth, and it
// runs ENTIRELY in the browser: the model weights download once (cached), then
// every inference is local. No prompt text ever leaves the device.
//
// In the shipping extension the weights are bundled, so even the one-time
// download disappears and the manifest can declare zero network permissions.

import { pipeline, env } from '@huggingface/transformers'
import { aggregate } from './ner-aggregate.js'

// Pull weights from the HF CDN on first run, then cache. (Bundled in prod.)
env.allowLocalModels = false

const MODEL = 'Xenova/bert-base-NER-uncased'
let extractor = null
let loading = null

async function getExtractor() {
  if (extractor) return extractor
  if (!loading) {
    loading = pipeline('token-classification', MODEL).then((p) => {
      extractor = p
      return p
    })
  }
  return loading
}

self.onmessage = async (e) => {
  const { type, id, text } = e.data || {}
  if (type !== 'detect') return
  try {
    if (!extractor) self.postMessage({ type: 'status', status: 'loading' })
    const ex = await getExtractor()
    self.postMessage({ type: 'status', status: 'ready' })
    const tokens = await ex(text)
    self.postMessage({ type: 'result', id, spans: aggregate(tokens, text) })
  } catch (err) {
    self.postMessage({ type: 'error', id, message: String(err?.message || err) })
  }
}
