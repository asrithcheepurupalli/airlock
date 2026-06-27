// ner.js — thin main-thread client for the NER worker.
//
// Best-effort by design: if the model can't load (offline, blocked), detect()
// resolves to [] and the firewall falls back to regex + custom terms. The
// on-device name catcher is an upgrade to detection quality, never a dependency.

let worker = null
let nextId = 1
const pending = new Map()
let onStatus = () => {}

function ensureWorker() {
  if (worker) return worker
  worker = new Worker(new URL('./ner.worker.js', import.meta.url), { type: 'module' })
  worker.onmessage = (e) => {
    const { type, id, spans, message, status } = e.data || {}
    if (type === 'status') return onStatus(status)
    const p = pending.get(id)
    if (!p) return
    pending.delete(id)
    if (type === 'result') p.resolve(spans)
    else p.reject(new Error(message || 'NER failed'))
  }
  worker.onerror = () => onStatus('error')
  return worker
}

export function setStatusHandler(fn) {
  onStatus = fn
}

/** Detect names/orgs/locations on-device. Resolves [] on any failure. */
export function detectEntities(text) {
  if (!text.trim()) return Promise.resolve([])
  try {
    const w = ensureWorker()
    const id = nextId++
    return new Promise((resolve, reject) => {
      pending.set(id, { resolve, reject })
      w.postMessage({ type: 'detect', id, text })
    }).catch(() => {
      onStatus('error')
      return []
    })
  } catch {
    onStatus('error')
    return Promise.resolve([])
  }
}
