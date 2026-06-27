// activate-bridge.js — runs ONLY on Airlock's own /activate page.
//
// It lets the page (which is online) drive activation and seat release without the
// extension ever making a network request itself. The page and this script share
// the DOM but live in isolated JS worlds, so window.postMessage is the channel. We
// accept only same-window, same-origin messages, and we only ever store a token
// that verifies offline — the same check the popup runs.
//
// Protocol (page -> bridge -> page):
//   present   bridge announces itself + this device id, on load
//   get-state page asks; bridge replies with deviceId + the stored token (if any)
//   activate  page sends a token; bridge verifies+stores it, replies activated
//   clear     page asks bridge to drop the local token (after a seat release)
;(function () {
  const License = window.AirlockLicense
  if (!License) return

  async function announce() {
    const deviceId = await License.deviceId()
    window.postMessage({ __airlock: 'present', deviceId }, location.origin)
  }

  window.addEventListener('message', async (e) => {
    if (e.source !== window || e.origin !== location.origin) return
    const d = e.data
    if (!d || typeof d !== 'object' || typeof d.__airlock !== 'string') return

    if (d.__airlock === 'get-state') {
      const [deviceId, token] = await Promise.all([License.deviceId(), License.getToken()])
      window.postMessage({ __airlock: 'state', deviceId, token: token || '' }, location.origin)
    } else if (d.__airlock === 'activate' && typeof d.token === 'string') {
      const payload = await License.activate(d.token)
      window.postMessage(
        { __airlock: 'activated', ok: !!payload, email: payload ? payload.e : '' },
        location.origin
      )
    } else if (d.__airlock === 'clear') {
      await License.deactivate()
      window.postMessage({ __airlock: 'cleared' }, location.origin)
    }
  })

  announce()
})()
