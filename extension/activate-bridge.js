// activate-bridge.js — runs ONLY on Airlock's own /activate page.
//
// It lets a buyer activate Pro with one click instead of copy-pasting the token.
// The page and this script share the DOM but live in isolated JS worlds, so
// window.postMessage is the channel between them. We accept only same-window,
// same-origin messages, and we only ever store a token that verifies offline —
// the exact same check the popup runs. Nothing here trusts the page blindly.
;(function () {
  const License = window.AirlockLicense
  if (!License) return

  window.addEventListener('message', async (e) => {
    if (e.source !== window || e.origin !== location.origin) return
    const d = e.data
    if (!d || d.__airlock !== 'activate' || typeof d.token !== 'string') return
    const payload = await License.activate(d.token)
    window.postMessage(
      { __airlock: 'activated', ok: !!payload, email: payload ? payload.e : '' },
      location.origin
    )
  })

  // Announce that the extension is installed, so the page can offer one click
  // instead of the paste fallback.
  window.postMessage({ __airlock: 'present' }, location.origin)
})()
