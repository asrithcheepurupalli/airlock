// redact.js — the privacy firewall core.
//
// This is the part that has to be trustworthy: it runs entirely in the browser.
// It finds sensitive spans, swaps each for a stable placeholder, and keeps a
// local map so the model's answer can be rehydrated with the real values after
// it comes back. The relay and the model only ever see the redacted text.
//
// Detection here is rule-based (regex + user terms) so the whole thing is
// inspectable and ships with zero model weights. The production firewall swaps
// this module for an on-device NER pass (transformers.js / a local model) that
// catches names and addresses in free text; the placeholder/rehydrate contract
// below stays identical, so nothing downstream changes.

// Each detector returns spans of a single category. Order matters: the most
// specific patterns (keys, SSNs) run before the greedier ones (numbers).
const DETECTORS = [
  {
    type: 'SECRET',
    label: 'API key / token',
    // OpenAI, Anthropic, AWS, GitHub, Google, Slack, generic bearer-ish tokens.
    // Allow hyphens/underscores inside the token body (sk-live-…, sk_test_…, sk-ant-…).
    re: /\b(sk[-_][a-zA-Z0-9_-]{16,}|AKIA[0-9A-Z]{16}|ghp_[A-Za-z0-9]{20,}|AIza[0-9A-Za-z\-_]{20,}|xox[baprs]-[0-9A-Za-z-]{10,})\b/g,
  },
  {
    type: 'EMAIL',
    label: 'Email',
    re: /\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}\b/g,
  },
  {
    type: 'SSN',
    label: 'SSN',
    re: /\b\d{3}-\d{2}-\d{4}\b/g,
  },
  {
    type: 'CARD',
    label: 'Card number',
    re: /\b\d(?:[ -]?\d){12,15}\b/g, // starts and ends on a digit, no trailing separator
    validate: luhn, // avoid eating order numbers / long IDs
  },
  {
    type: 'PHONE',
    label: 'Phone',
    re: /(\+?\d{1,3}[\s.-]?)?\(?\d{3}\)?[\s.-]?\d{3}[\s.-]?\d{4}\b/g,
  },
  {
    type: 'IP',
    label: 'IP address',
    re: /\b(?:(?:25[0-5]|2[0-4]\d|1?\d?\d)\.){3}(?:25[0-5]|2[0-4]\d|1?\d?\d)\b/g,
  },
]

function luhn(value) {
  const digits = value.replace(/[^\d]/g, '')
  if (digits.length < 13 || digits.length > 19) return false
  let sum = 0
  let alt = false
  for (let i = digits.length - 1; i >= 0; i--) {
    let n = parseInt(digits[i], 10)
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

// Build the user-term detector from custom strings (client names, project
// codenames, a patient's full name) — the things a generic regex can't know
// are sensitive but a therapist or a freelancer absolutely does.
function customDetector(terms) {
  const cleaned = terms.map((t) => t.trim()).filter(Boolean)
  if (!cleaned.length) return null
  // longest first so "Acme Health Systems" wins over "Acme"
  cleaned.sort((a, b) => b.length - a.length)
  const alternation = cleaned.map(escapeRegExp).join('|')
  return {
    type: 'TERM',
    label: 'Sensitive term',
    re: new RegExp(`\\b(${alternation})\\b`, 'gi'),
  }
}

/**
 * redact(text, customTerms, nerSpans) -> { redacted, map, spans }
 *   redacted: the safe string to send to the model
 *   map:      placeholder -> original (for rehydration)
 *   spans:    [{start, end, type, label, original, placeholder}] over ORIGINAL
 *             text, for the highlighted preview
 *   nerSpans: optional on-device-detected entities (names/orgs/locations).
 *             Lowest priority — precise regex/term matches always win the chars.
 */
export function redact(text, customTerms = [], nerSpans = []) {
  const detectors = [...DETECTORS]
  const custom = customDetector(customTerms)
  if (custom) detectors.unshift(custom) // user terms take priority

  const claimed = new Array(text.length).fill(false)
  const found = []

  const claim = (start, end) => {
    for (let i = start; i < end; i++) {
      if (claimed[i]) return false
    }
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
      if (!claim(start, end)) continue // a more specific detector already took it
      found.push({ start, end, type: det.type, label: det.label, original: value })
    }
  }

  // NER entities fill in the gaps the rules can't see (free-text names etc.),
  // but never override an email/secret/term that already claimed those chars.
  for (const s of nerSpans) {
    if (s.start == null || s.end == null || s.end <= s.start) continue
    if (!claim(s.start, s.end)) continue
    found.push({ start: s.start, end: s.end, type: s.type, label: s.label, original: text.slice(s.start, s.end) })
  }

  found.sort((a, b) => a.start - b.start)

  // Assign stable placeholders. Same original value -> same placeholder, so the
  // model still understands that two mentions are the same entity.
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
    spans.push({ ...f, placeholder })
  }

  // Rebuild the redacted string from the spans.
  let redacted = ''
  let cursor = 0
  for (const s of spans) {
    redacted += text.slice(cursor, s.start) + s.placeholder
    cursor = s.end
  }
  redacted += text.slice(cursor)

  return { redacted, map, spans }
}

/** Put the real values back into the model's answer, locally. */
export function rehydrate(answer, map) {
  let out = answer
  for (const [placeholder, original] of Object.entries(map)) {
    out = out.split(placeholder).join(original)
  }
  return out
}

export const CATEGORY_COLORS = {
  SECRET: '#c2410c',
  EMAIL: '#1d4ed8',
  SSN: '#be123c',
  CARD: '#be123c',
  PHONE: '#0369a1',
  IP: '#4338ca',
  TERM: '#15803d',
  NAME: '#9333ea',
  ORG: '#0d9488',
  LOCATION: '#a16207',
}
