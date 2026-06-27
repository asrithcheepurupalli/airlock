// popup.js the guaranteed-visible surface. Works regardless of any site's DOM.
;(function () {
  const { redact } = window.AirlockEngine
  const inEl = document.getElementById('in')
  const termsEl = document.getElementById('terms')
  const outEl = document.getElementById('out')
  const countEl = document.getElementById('count')
  const copyBtn = document.getElementById('copy')
  let lastRedacted = ''

  // restore saved terms; share them with the content script
  chrome.storage?.sync?.get(['terms'], (r) => {
    if (r.terms) termsEl.value = r.terms
    run()
  })

  function run() {
    const terms = termsEl.value.split(',').map((t) => t.trim()).filter(Boolean)
    const { redacted, spans } = redact(inEl.value, terms)
    lastRedacted = redacted
    outEl.textContent = inEl.value.trim() ? redacted : ''
    countEl.textContent = `${spans.length} found`
    countEl.classList.toggle('hit', spans.length > 0)
    copyBtn.disabled = !spans.length
  }

  inEl.addEventListener('input', run)
  termsEl.addEventListener('input', () => {
    chrome.storage?.sync?.set({ terms: termsEl.value })
    run()
  })
  copyBtn.addEventListener('click', async () => {
    if (!lastRedacted) return
    await navigator.clipboard.writeText(lastRedacted)
    copyBtn.textContent = 'Copied'
    copyBtn.classList.add('done')
    setTimeout(() => {
      copyBtn.textContent = 'Copy redacted'
      copyBtn.classList.remove('done')
    }, 1200)
  })

  run() // start clean and empty
})()
