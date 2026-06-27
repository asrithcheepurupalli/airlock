// redact.js (extension build) — same firewall core as the web app, but a plain
// script (no ES modules, content scripts can't be modules) that exposes the
// engine on a global so both the content script and the popup can use it.
//
// This build is rules + your sensitive-term list only: instant, dependency-free,
// and genuinely zero-network — the strongest version of the "provably local"
// claim. (The on-device NER model is the documented next increment; it needs the
// weights bundled as web-accessible resources + an offscreen document.)

;(function () {
  const DETECTORS = [
    {
      type: 'SECRET',
      label: 'API key / token',
      re: /\b(sk[-_][a-zA-Z0-9_-]{16,}|AKIA[0-9A-Z]{16}|ghp_[A-Za-z0-9]{20,}|AIza[0-9A-Za-z\-_]{20,}|xox[baprs]-[0-9A-Za-z-]{10,})\b/g,
    },
    { type: 'EMAIL', label: 'Email', re: /\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}\b/g },
    { type: 'SSN', label: 'SSN', re: /\b\d{3}-\d{2}-\d{4}\b/g },
    { type: 'CARD', label: 'Card number', re: /\b\d(?:[ -]?\d){12,15}\b/g, validate: luhn },
    { type: 'PHONE', label: 'Phone', re: /(\+?\d{1,3}[\s.-]?)?\(?\d{3}\)?[\s.-]?\d{3}[\s.-]?\d{4}\b/g },
    { type: 'IP', label: 'IP address', re: /\b(?:(?:25[0-5]|2[0-4]\d|1?\d?\d)\.){3}(?:25[0-5]|2[0-4]\d|1?\d?\d)\b/g },
  ]

  function luhn(value) {
    const d = value.replace(/[^\d]/g, '')
    if (d.length < 13 || d.length > 19) return false
    let sum = 0
    let alt = false
    for (let i = d.length - 1; i >= 0; i--) {
      let n = parseInt(d[i], 10)
      if (alt) {
        n *= 2
        if (n > 9) n -= 9
      }
      sum += n
      alt = !alt
    }
    return sum % 10 === 0
  }

  function escapeRegExp(s) {
    return s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
  }

  function customDetector(terms) {
    const cleaned = terms.map((t) => t.trim()).filter(Boolean)
    if (!cleaned.length) return null
    cleaned.sort((a, b) => b.length - a.length)
    return { type: 'TERM', label: 'Sensitive term', re: new RegExp(`\\b(${cleaned.map(escapeRegExp).join('|')})\\b`, 'gi') }
  }

  function redact(text, customTerms, nerSpans) {
    customTerms = customTerms || []
    nerSpans = nerSpans || []
    const detectors = DETECTORS.slice()
    const custom = customDetector(customTerms)
    if (custom) detectors.unshift(custom)

    const claimed = new Array(text.length).fill(false)
    const found = []
    const claim = (start, end) => {
      for (let i = start; i < end; i++) if (claimed[i]) return false
      for (let i = start; i < end; i++) claimed[i] = true
      return true
    }

    for (const det of detectors) {
      det.re.lastIndex = 0
      let m
      while ((m = det.re.exec(text)) !== null) {
        const value = m[0]
        const start = m.index
        const end = start + value.length
        if (det.validate && !det.validate(value)) continue
        if (!claim(start, end)) continue
        found.push({ start, end, type: det.type, label: det.label, original: value })
      }
    }

    // on-device NER fills free-text gaps but never overrides a precise rule/term
    for (const s of nerSpans) {
      if (s.start == null || s.end == null || s.end <= s.start) continue
      if (!claim(s.start, s.end)) continue
      found.push({ start: s.start, end: s.end, type: s.type, label: s.label, original: text.slice(s.start, s.end) })
    }

    found.sort((a, b) => a.start - b.start)

    const counters = {}
    const byOriginal = new Map()
    const map = {}
    const spans = []
    for (const f of found) {
      const key = `${f.type}:${f.original.toLowerCase()}`
      let placeholder = byOriginal.get(key)
      if (!placeholder) {
        counters[f.type] = (counters[f.type] || 0) + 1
        placeholder = `[${f.type}_${counters[f.type]}]`
        byOriginal.set(key, placeholder)
        map[placeholder] = f.original
      }
      spans.push(Object.assign({}, f, { placeholder }))
    }

    let redacted = ''
    let cursor = 0
    for (const s of spans) {
      redacted += text.slice(cursor, s.start) + s.placeholder
      cursor = s.end
    }
    redacted += text.slice(cursor)
    return { redacted, map, spans }
  }

  function rehydrate(answer, map) {
    let out = answer
    for (const k of Object.keys(map)) out = out.split(k).join(map[k])
    return out
  }

  const CATEGORY_COLORS = {
    SECRET: '#c2410c', EMAIL: '#1d4ed8', SSN: '#be123c', CARD: '#be123c',
    PHONE: '#0369a1', IP: '#4338ca', TERM: '#15803d',
    NAME: '#9333ea', ORG: '#0d9488', LOCATION: '#a16207',
  }

  window.AirlockEngine = { redact, rehydrate, CATEGORY_COLORS }
})()
