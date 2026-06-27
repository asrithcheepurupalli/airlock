// content.js injects Airlock into the AI chat page.
//
// What it does, all locally:
//   1) watches your draft and shows a live count of sensitive spans
//   2) one click redacts the draft IN PLACE (and remembers the real values)
//   3) when the assistant replies, restores your real values in the displayed
//      text so the answer reads naturally the model only ever saw placeholders
//
// It makes NO network requests of its own. The only traffic is your browser
// talking to ChatGPT/Claude as it already does now with the sensitive bits
// swapped for placeholders before they leave the box.

;(function () {
  const { redact, rehydrate } = window.AirlockEngine
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
    `<button class="airlock-btn" type="button">Redact</button>`
  document.documentElement.appendChild(pill)
  const countEl = pill.querySelector('.airlock-count')
  const btn = pill.querySelector('.airlock-btn')

  let nerTimer = null
  let holdUntil = 0 // pause status updates briefly after a Redact so the hint stays visible
  function refresh() {
    if (Date.now() < holdUntil) return
    const box = findBox()
    if (!box) {
      pill.classList.remove('airlock-armed')
      countEl.textContent = nerReady ? 'ready' : 'starting…'
      return
    }
    const text = boxText(box)
    // debounce the on-device scan; rule/term redaction is instant below
    clearTimeout(nerTimer)
    nerTimer = setTimeout(() => requestNer(text), 350)
    const { spans } = redact(text, termList, nerSpans)
    pill.classList.toggle('airlock-warming', !nerReady)
    pill.title = nerReady
      ? 'On-device name detection is active'
      : 'Loading on-device name detection. Names are not checked yet.'
    if (!nerReady) {
      // model still warming: never claim "clean" for names we haven't checked
      pill.classList.toggle('airlock-armed', spans.length > 0)
      countEl.textContent = spans.length ? `${spans.length} found, loading names…` : 'loading names…'
    } else if (spans.length) {
      pill.classList.add('airlock-armed')
      countEl.textContent = `${spans.length} to redact`
    } else {
      pill.classList.remove('airlock-armed')
      countEl.textContent = 'clean'
    }
  }

  btn.addEventListener('click', () => {
    const box = findBox()
    if (!box) return
    const { redacted, map, spans } = redact(boxText(box), termList, nerSpans)
    if (!spans.length) return
    activeMap = Object.assign(activeMap, map) // remember so we can restore the reply
    const how = applyRedaction(box, redacted)
    holdUntil = Date.now() + 4000
    pill.classList.remove('airlock-armed')
    countEl.textContent = how === 'inplace' ? 'Redacted ✓' : 'Copied ✓ press ⌘V'
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
