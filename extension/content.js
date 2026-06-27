// content.js injects Airlock into the AI chat page.
//
// What it does, all locally:
//   1) watches your draft and shows a live count of sensitive spans
//   2) one click locks the draft IN PLACE (and remembers the real values)
//   3) when the assistant replies, restores your real values in the displayed
//      text so the answer reads naturally the model only ever saw placeholders
//
// FREE build: rules (emails, secrets, cards, IDs) + your own sensitive terms.
// It makes NO network requests of its own and asks for no network permission.
// PRO (Phase 2) flips the PRO flag below once a valid offline license is present;
// it then loads the on-device names model and lights up the warming states.

;(function () {
  const { redact, rehydrate, sniffProspects } = window.AirlockEngine
  const PRO = false // free build: rules + terms only, zero network. Pro unlocks names.
  const PRICING_URL = 'https://airlock.made-by-ac.com/#pricing'

  // Summarize suspected (but unlocked) names/orgs for the upsell, e.g. "2 names, 1 org".
  function exposedLabel(pros) {
    const names = pros.filter((p) => p.type === 'NAME').length
    const orgs = pros.filter((p) => p.type === 'ORG').length
    const parts = []
    if (names) parts.push(names + (names > 1 ? ' names' : ' name'))
    if (orgs) parts.push(orgs + (orgs > 1 ? ' orgs' : ' org'))
    return parts.join(', ')
  }
  let termList = []
  let activeMap = {} // placeholder -> original, for rehydrating the reply
  let nerSpans = [] // on-device name/place detections for the current draft
  let lastScanned = null // null so the first (even empty) scan warms the model
  let nerReady = false // flips true on the first successful model response

  chrome.storage?.sync?.get(['terms'], (r) => {
    termList = (r.terms || '').split(',').map((t) => t.trim()).filter(Boolean)
  })

  // Ask the offscreen model (via the service worker) to find names/places.
  // Best-effort: any failure just leaves nerSpans empty and rules/terms still run.
  function requestNer(text) {
    if (!PRO) return
    if (text === lastScanned) return
    lastScanned = text
    try {
      chrome.runtime.sendMessage({ type: 'airlock-ner', text }, (resp) => {
        if (chrome.runtime.lastError || !resp || !resp.ok) return
        nerReady = true
        nerSpans = resp.spans || []
        refresh()
      })
    } catch (_e) {
      /* messaging unavailable; rules + terms still apply */
    }
  }

  // --- find the compose box across the major chat UIs ---------------------
  const BOX_SELECTORS = [
    '#prompt-textarea', // ChatGPT (a contenteditable div with this id)
    'div[contenteditable="true"][translate="no"]', // Claude
    'div.ProseMirror[contenteditable="true"]',
    'div[contenteditable="true"]',
    'textarea[data-testid="chat-input"]',
    'textarea[placeholder]',
  ]
  function visible(el) {
    if (!el) return false
    const r = el.getBoundingClientRect()
    return r.width > 0 && r.height > 0
  }
  function findBox() {
    for (const sel of BOX_SELECTORS) {
      for (const el of document.querySelectorAll(sel)) {
        if (visible(el)) return el
      }
    }
    return null
  }
  function boxText(el) {
    if (el.tagName === 'TEXTAREA') return el.value
    // contenteditable: innerText follows the rendered <p> structure; fall back to textContent
    return (el.innerText || el.textContent || '').replace(/ /g, ' ')
  }
  // Copy text reliably under a click gesture (no clipboard permission needed).
  function copyText(text) {
    const ta = document.createElement('textarea')
    ta.value = text
    ta.style.cssText = 'position:fixed;top:-1000px;opacity:0'
    document.documentElement.appendChild(ta)
    ta.select()
    let ok = false
    try { ok = document.execCommand('copy') } catch (_e) {}
    ta.remove()
    return ok
  }

  // Put the redacted draft into the compose box.
  //  - plain textarea: write it directly (sticks, React-safe).
  //  - rich editor (ChatGPT/Claude): forcing text in gets reverted by the
  //    framework, so we copy it and pre-select the draft. One ⌘V overwrites it.
  // Returns 'inplace' or 'paste' so the pill can tell the user what to do.
  function applyRedaction(el, text) {
    if (el.tagName === 'TEXTAREA') {
      const setter = Object.getOwnPropertyDescriptor(HTMLTextAreaElement.prototype, 'value').set
      setter.call(el, text)
      el.dispatchEvent(new Event('input', { bubbles: true }))
      return 'inplace'
    }
    copyText(text)
    el.focus()
    const sel = window.getSelection()
    sel.removeAllRanges()
    const range = document.createRange()
    range.selectNodeContents(el)
    sel.addRange(range)
    return 'paste'
  }

  // --- the floating Airlock pill ------------------------------------------
  const pill = document.createElement('div')
  pill.id = 'airlock-pill'
  pill.innerHTML =
    `<span class="airlock-mark">airlock<span class="airlock-pt">.</span></span>` +
    `<span class="airlock-div"></span>` +
    `<span class="airlock-count">starting…</span>` +
    `<button class="airlock-pro" type="button" hidden></button>` +
    `<button class="airlock-btn" type="button">Lock it</button>`
  document.documentElement.appendChild(pill)
  const countEl = pill.querySelector('.airlock-count')
  const btn = pill.querySelector('.airlock-btn')
  const proBtn = pill.querySelector('.airlock-pro')
  proBtn.addEventListener('click', (e) => { e.stopPropagation(); window.open(PRICING_URL, '_blank') })

  function updatePro(pros, lockableCount) {
    if (pros.length && lockableCount > 0) {
      proBtn.hidden = false
      proBtn.textContent = `${exposedLabel(pros)} exposed · Pro`
    } else {
      proBtn.hidden = true
    }
  }

  let nerTimer = null
  let holdUntil = 0 // pause status updates briefly after a Redact so the hint stays visible
  function refresh() {
    if (Date.now() < holdUntil) return
    const box = findBox()
    if (!box) {
      pill.classList.remove('airlock-armed')
      pill.dataset.mode = 'lock'
      proBtn.hidden = true
      btn.textContent = 'Lock it'
      countEl.textContent = 'ready'
      return
    }
    const text = boxText(box)
    if (PRO) {
      // debounce the on-device names scan; rule/term redaction is instant below
      clearTimeout(nerTimer)
      nerTimer = setTimeout(() => requestNer(text), 350)
    }
    const { spans } = redact(text, termList, PRO ? nerSpans : [])
    // PRO: while the model warms, never claim "clean" for names we haven't checked
    if (PRO && !nerReady) {
      pill.classList.add('airlock-warming')
      proBtn.hidden = true
      pill.classList.toggle('airlock-armed', spans.length > 0)
      countEl.textContent = spans.length ? `${spans.length} found, loading names…` : 'loading names…'
      return
    }
    pill.classList.remove('airlock-warming')
    // FREE only: cheaply suspect names/orgs we cannot lock, and surface them.
    const pros = PRO ? [] : sniffProspects(text, spans)
    updatePro(pros, spans.length)
    if (spans.length) {
      pill.dataset.mode = 'lock'
      btn.textContent = 'Lock it'
      pill.classList.add('airlock-armed')
      countEl.textContent = `${spans.length} to lock`
    } else if (pros.length) {
      // nothing free can lock, but names/orgs are exposed: make the CTA the upsell
      pill.dataset.mode = 'pro'
      btn.textContent = 'Get Pro'
      pill.classList.remove('airlock-armed')
      proBtn.hidden = true
      countEl.textContent = `${exposedLabel(pros)} exposed`
    } else {
      pill.dataset.mode = 'lock'
      btn.textContent = 'Lock it'
      pill.classList.remove('airlock-armed')
      countEl.textContent = 'clean'
    }
  }

  btn.addEventListener('click', () => {
    if (pill.dataset.mode === 'pro') { window.open(PRICING_URL, '_blank'); return }
    const box = findBox()
    if (!box) return
    const text = boxText(box)
    const { redacted, map, spans } = redact(text, termList, PRO ? nerSpans : [])
    if (!spans.length) {
      // nothing to lock: give a reassuring beat instead of a dead click
      holdUntil = Date.now() + 1600
      countEl.textContent = 'All clean ✓'
      pill.classList.add('airlock-flash')
      setTimeout(() => pill.classList.remove('airlock-flash'), 600)
      return
    }
    activeMap = Object.assign(activeMap, map) // remember so we can restore the reply
    const how = applyRedaction(box, redacted)
    holdUntil = Date.now() + 4000
    pill.classList.remove('airlock-armed')
    // keep the upsell visible: free locked the rules, but names may still be exposed
    const pros = PRO ? [] : sniffProspects(text, spans)
    updatePro(pros, 1)
    countEl.textContent = how === 'inplace' ? 'Locked ✓' : 'Locked, press ⌘V'
    pill.classList.add('airlock-flash')
    setTimeout(() => pill.classList.remove('airlock-flash'), 600)
  })

  // --- restore real values in the assistant's reply -----------------------
  function rehydrateNode(node) {
    if (!Object.keys(activeMap).length) return
    const walker = document.createTreeWalker(node, NodeFilter.SHOW_TEXT)
    const placeholders = Object.keys(activeMap)
    let n
    while ((n = walker.nextNode())) {
      if (placeholders.some((p) => n.nodeValue.includes(p))) {
        n.nodeValue = rehydrate(n.nodeValue, activeMap)
      }
    }
  }

  const obs = new MutationObserver((muts) => {
    for (const m of muts) {
      for (const node of m.addedNodes) {
        if (node.nodeType === 1) rehydrateNode(node)
      }
      if (m.type === 'characterData' && m.target.parentNode) rehydrateNode(m.target.parentNode)
    }
  })
  obs.observe(document.body, { childList: true, subtree: true, characterData: true })

  for (const ev of ['input', 'keyup', 'paste', 'click']) {
    document.addEventListener(ev, () => setTimeout(refresh, 0), true)
  }
  setInterval(refresh, 600) // SPA-proof: re-find the box and rescan on a steady tick
  refresh()
})()
