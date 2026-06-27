// popup.js the guaranteed-visible surface. Works regardless of any site's DOM.
// Live, color-coded detection: as you type, sensitive categories light up as
// chips and the locked output renders each placeholder as a real pill. Names and
// orgs the free build can't lock are surfaced as "exposed" with a Get Pro nudge.
;(function () {
  const { redact, sniffProspects, CATEGORY_COLORS } = window.AirlockEngine
  const PRICING_URL = 'https://airlock.made-by-ac.com/#pricing'
  const inEl = document.getElementById('in')
  const termsEl = document.getElementById('terms')
  const outEl = document.getElementById('out')
  const detectedEl = document.getElementById('detected')
  const statusEl = document.getElementById('status')
  const copyBtn = document.getElementById('copy')
  const proNote = document.getElementById('pronote')
  const proNoteText = document.getElementById('pronote-text')
  const proUpg = document.getElementById('proupg')
  let lastRedacted = ''

  const TYPE_LABEL = {
    EMAIL: 'email', PHONE: 'phone', CARD: 'card', SSN: 'SSN', SECRET: 'secret',
    IP: 'IP', TERM: 'term', NAME: 'name', ORG: 'org', LOCATION: 'place',
  }
  const colorOf = (t) => CATEGORY_COLORS[t] || '#7c7770'
  const labelOf = (t, n) => (TYPE_LABEL[t] || t.toLowerCase()) + (n > 1 ? 's' : '')
  const esc = (s) => s.replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]))

  function exposedLabel(pros) {
    const names = pros.filter((p) => p.type === 'NAME').length
    const orgs = pros.filter((p) => p.type === 'ORG').length
    const parts = []
    if (names) parts.push(names + (names > 1 ? ' names' : ' name'))
    if (orgs) parts.push(orgs + (orgs > 1 ? ' orgs' : ' org'))
    return parts.join(', ')
  }

  // restore saved terms; share them with the content script
  chrome.storage?.sync?.get(['terms'], (r) => {
    if (r.terms) termsEl.value = r.terms
    run()
  })

  function renderChips(spans, pros) {
    const by = {}
    for (const s of spans) by[s.type] = (by[s.type] || 0) + 1
    const order = ['EMAIL', 'PHONE', 'CARD', 'SSN', 'SECRET', 'IP', 'TERM']
    const types = Object.keys(by).sort((a, b) => order.indexOf(a) - order.indexOf(b))
    let html = types
      .map((t) => `<span class="dchip" style="--c:${colorOf(t)}"><i></i>${by[t]} ${labelOf(t, by[t])}</span>`)
      .join('')
    if (pros.length) {
      html += `<span class="dchip pro" id="prochip"><i></i>${exposedLabel(pros)} · Pro</span>`
    }
    detectedEl.innerHTML = html
    const chip = document.getElementById('prochip')
    if (chip) chip.addEventListener('click', openPricing)
  }

  // The "what leaves" view, rendered from the original text: rule/term hits become
  // locked pills; suspected names/orgs stay in the clear, flagged as exposed.
  function renderOut(text, spans, pros, hasText) {
    if (!hasText) { outEl.innerHTML = ''; return }
    const marks = [
      ...spans.map((s) => ({ start: s.start, end: s.end, kind: 'lock', type: s.type, ph: s.placeholder })),
      ...pros.map((s) => ({ start: s.start, end: s.end, kind: 'exp' })),
    ].sort((a, b) => a.start - b.start)
    let html = ''
    let cursor = 0
    for (const mk of marks) {
      if (mk.start < cursor) continue
      if (mk.start > cursor) html += esc(text.slice(cursor, mk.start))
      if (mk.kind === 'lock') {
        html += `<span class="ph" style="--c:${colorOf(mk.type)}">${mk.ph}</span>`
      } else {
        html += `<span class="exp" title="Pro locks this automatically">${esc(text.slice(mk.start, mk.end))}</span>`
      }
      cursor = mk.end
    }
    if (cursor < text.length) html += esc(text.slice(cursor))
    outEl.innerHTML = html
  }

  function setStatus(spans, pros, hasText) {
    if (!hasText) { statusEl.textContent = 'ready'; statusEl.className = 'status'; return }
    if (spans.length) { statusEl.textContent = `${spans.length} to lock`; statusEl.className = 'status hit' }
    else if (pros.length) { statusEl.textContent = `${exposedLabel(pros)} exposed`; statusEl.className = 'status warn' }
    else { statusEl.textContent = 'all clear'; statusEl.className = 'status clear' }
  }

  function run() {
    const terms = termsEl.value.split(',').map((t) => t.trim()).filter(Boolean)
    const { redacted, spans } = redact(inEl.value, terms)
    const pros = sniffProspects(inEl.value, spans)
    const hasText = !!inEl.value.trim()
    lastRedacted = hasText ? redacted : ''
    renderChips(spans, pros)
    renderOut(inEl.value, spans, pros, hasText)
    setStatus(spans, pros, hasText)
    copyBtn.disabled = !spans.length
    if (hasText && pros.length) {
      proNoteText.textContent = exposedLabel(pros)
      proNote.hidden = false
    } else {
      proNote.hidden = true
    }
  }

  function openPricing() {
    if (chrome.tabs?.create) chrome.tabs.create({ url: PRICING_URL })
    else window.open(PRICING_URL, '_blank')
  }

  inEl.addEventListener('input', run)
  termsEl.addEventListener('input', () => {
    chrome.storage?.sync?.set({ terms: termsEl.value })
    run()
  })
  proUpg.addEventListener('click', openPricing)
  copyBtn.addEventListener('click', async () => {
    if (!lastRedacted) return
    await navigator.clipboard.writeText(lastRedacted)
    copyBtn.textContent = 'Copied ✓'
    copyBtn.classList.add('done')
    setTimeout(() => {
      copyBtn.textContent = 'Copy locked'
      copyBtn.classList.remove('done')
    }, 1200)
  })

  run() // start clean and empty
})()
