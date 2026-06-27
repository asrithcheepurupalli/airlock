// background.js - service worker. Its only job is to keep one offscreen document
// alive (which hosts the model) and relay detection requests to it.

let creating = null

async function ensureOffscreen() {
  if (await chrome.offscreen.hasDocument()) return
  if (!creating) {
    creating = chrome.offscreen
      .createDocument({
        url: 'offscreen/offscreen.html',
        reasons: ['WORKERS'],
        justification: 'Runs the on-device NER model that redacts names from prompts.',
      })
      .finally(() => {
        creating = null
      })
  }
  await creating
}

// Warm the offscreen model up front instead of on the first keystroke.
chrome.runtime.onInstalled.addListener(() => ensureOffscreen().catch(() => {}))
chrome.runtime.onStartup.addListener(() => ensureOffscreen().catch(() => {}))

chrome.runtime.onMessage.addListener((msg, _sender, sendResponse) => {
  if (msg?.type !== 'airlock-ner') return
  ;(async () => {
    try {
      await ensureOffscreen()
      const resp = await chrome.runtime.sendMessage({ type: 'airlock-ner-run', text: msg.text })
      sendResponse(resp || { ok: false, error: 'no response' })
    } catch (err) {
      sendResponse({ ok: false, error: String(err?.message || err) })
    }
  })()
  return true // async response
})
