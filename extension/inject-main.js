// Airlock — runs in the PAGE's own JS context (manifest "world": "MAIN").
// The content script's isolated world cannot drive ChatGPT's ProseMirror or
// Gemini's Quill: edits made from there get reverted by the editor. So the
// actual text replace happens HERE, where the page's editor honors execCommand
// (the same context the console diagnostic ran in, which worked on all three).
//
// Protocol over same-window postMessage with the isolated content script:
//   <- { __airlock:'fill', id, text }   the content script tagged the target box
//                                        with [data-airlock-fill] and wants it
//                                        replaced with `text`
//   -> { __airlock:'filled', id, ok }   ok = a redaction placeholder actually
//                                        landed in the box
(() => {
  const MARK = /\[[A-Z][A-Z_]*_\d+\]/
  window.addEventListener('message', (e) => {
    if (e.source !== window) return
    const d = e.data
    if (!d || d.__airlock !== 'fill') return
    const box = document.querySelector('[data-airlock-fill]')
    let ok = false
    if (box) {
      try {
        box.focus()
        // empty the box, then insert: replacing a selection directly appends on
        // ChatGPT/Gemini, but selectAll + delete + insertText replaces cleanly.
        document.execCommand('selectAll', false, null)
        document.execCommand('delete', false, null)
        document.execCommand('insertText', false, d.text)
      } catch (_e) {
        /* report not-ok below */
      }
      const after = box.tagName === 'TEXTAREA' ? box.value : (box.innerText || box.textContent || '')
      ok = MARK.test(after)
      box.removeAttribute('data-airlock-fill')
    }
    window.postMessage({ __airlock: 'filled', id: d.id, ok }, '*')
  })
})()
