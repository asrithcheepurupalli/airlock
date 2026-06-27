// redact.js (extension build) - same firewall core as the web app, but a plain
// script (no ES modules, content scripts can't be modules) that exposes the
// engine on a global so both the content script and the popup can use it.
//
// This build is rules + your sensitive-term list only: instant, dependency-free,
// and genuinely zero-network - the strongest version of the "provably local"
// claim. (The on-device NER model is the documented next increment; it needs the
// weights bundled as web-accessible resources + an offscreen document.)

;(function () {
  const DETECTORS = [
    {
      type: 'SECRET',
      label: 'API key / token',
      // Common provider prefixes. Newer ones (github_pat_, hf_, sk-proj via sk-)
      // included. Distinctive prefixes keep false positives near zero.
      re: /\b(sk[-_][a-zA-Z0-9_-]{16,}|AKIA[0-9A-Z]{16}|gh[pousr]_[A-Za-z0-9]{20,}|github_pat_[A-Za-z0-9_]{22,}|AIza[0-9A-Za-z\-_]{20,}|xox[baprs]-[0-9A-Za-z-]{10,}|hf_[A-Za-z0-9]{30,})\b/g,
    },
    // JSON Web Token: header.payload.signature, each base64url.
    { type: 'SECRET', label: 'JWT', re: /\beyJ[A-Za-z0-9_-]{8,}\.[A-Za-z0-9_-]{6,}\.[A-Za-z0-9_-]{6,}/g },
    { type: 'EMAIL', label: 'Email', re: /\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}\b/g },
    // SSN with dashes OR spaces (the 3-2-4 grouping is distinctive).
    { type: 'SSN', label: 'SSN', re: /\b\d{3}[-\s]\d{2}[-\s]\d{4}\b/g },
    // SSN as a bare 9-digit run, ONLY right after an SSN/social keyword (else a
    // plain 9-digit number is far too ambiguous to lock). Locks the digits only.
    { type: 'SSN', label: 'SSN', re: /\b(?:ssn|social(?:\s+security)?(?:\s+(?:no|number|#))?)\b[:#\s]*(\d{9})\b/gi, group: 1 },
    { type: 'CARD', label: 'Card number', re: /\b\d(?:[ -]?\d){12,15}\b/g, validate: luhn },
    // Phones: international (+CC then 7-14 digits) and US 10-digit. A digit-count
    // check rejects stray number runs.
    {
      type: 'PHONE',
      label: 'Phone',
      re: /(?:\+\d{1,3}[\s.-]?\d(?:[\s.-]?\d){6,13}|(?:\+?1[\s.-]?)?\(?\d{3}\)?[\s.-]?\d{3}[\s.-]?\d{4})(?:\s?(?:x|ext\.?)\s?\d{1,5})?/g,
      validate: phoneValid,
    },
    // 7-digit local number, ONLY after a phone keyword (a bare NNN-NNNN is too
    // easily a range like 100-2000 to lock on its own). Locks the digits only.
    {
      type: 'PHONE',
      label: 'Phone',
      re: /\b(?:call|phone|telephone|tel|mobile|cell|fax|contact|dial)\b[:.\s#]*(\d{3}[-.]\d{4})/gi,
      group: 1,
    },
    { type: 'IP', label: 'IP address', re: /\b(?:(?:25[0-5]|2[0-4]\d|1?\d?\d)\.){3}(?:25[0-5]|2[0-4]\d|1?\d?\d)\b/g },
  ]

  function phoneValid(v) {
    const d = v.replace(/\D/g, '')
    if (d.length < 7 || d.length > 15) return false
    if (/^(\d)\1+$/.test(d)) return false // all-same-digit isn't a phone
    return true
  }

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

  // --- FREE-tier name/org SNIFFER (heuristic, no model) -------------------
  // The free build can't run the 104MB NER model, but it can cheaply *suspect*
  // names and organizations with a small dictionary plus a few patterns. These
  // are never locked on free (precision is not guaranteed). They are surfaced as
  // "exposed" so the user sees exactly what Pro's model would catch. Conservative
  // on purpose: better to miss a name than to cry wolf on a capitalized word.
  const FIRST_NAMES = new Set(
    ('james john robert michael william david richard joseph thomas charles christopher daniel matthew anthony ' +
      'donald mark paul steven andrew kenneth joshua kevin brian george edward ronald timothy jason jeffrey ryan ' +
      'jacob gary nicholas eric jonathan stephen larry justin scott brandon benjamin samuel gregory alexander ' +
      'patrick frank raymond jack dennis jerry tyler aaron jose adam henry nathan douglas peter zachary kyle ethan ' +
      'jeremy walter keith roger noah liam lucas mason logan elijah oliver ' +
      'mary patricia jennifer linda elizabeth barbara susan jessica sarah karen nancy lisa margaret betty sandra ' +
      'ashley dorothy kimberly emily donna michelle carol amanda melissa deborah stephanie rebecca laura sharon ' +
      'cynthia kathleen helen amy angela anna brenda pamela nicole ruth katherine samantha christine emma catherine ' +
      'debra rachel carolyn janet maria heather diane julie victoria kelly christina lauren joan evelyn judith megan ' +
      'hannah jacqueline martha teresa abigail alice julia sophia isabella mia ava amelia harper ella chloe zoe grace ' +
      'olivia madison aria scarlett lena dana marcus ' +
      'priya raj arjun anil sunita amit neha rohan ananya vikram deepak kavya sanjay pooja rahul meera karan divya ' +
      'aditya nisha sandeep ishaan tara varun lakshmi ramesh swati naveen ' +
      'wei li chen ahmed fatima omar yusuf aisha hassan mohammed ali sofia santiago mateo diego lucia carlos juan ' +
      'ana miguel pedro elena').split(' ')
  )
  const ORG_SUFFIX =
    'Inc|LLC|Ltd|Limited|Corp|Corporation|Company|Group|Holdings|Partners|Associates|Systems|Solutions|Technologies|' +
    'Technology|Health|Healthcare|Hospital|Clinic|Medical|Bank|Capital|Ventures|Labs|Laboratories|Foundation|' +
    'Institute|University|College|Logistics|Industries|Enterprises|Media|Studios|Agency|Consulting|Insurance|' +
    'Pharmaceuticals|Pharma|Motors|Foods|Airlines|Networks|Services|Trust|Realty|Properties'
  // Capitalized proper-noun runs ending in an org suffix. Kept case-sensitive on
  // purpose: lowercasing it makes the leading {0,4} tokens vacuum up unrelated
  // function words ("and priya raj at acme health"). Lowercase orgs are left to
  // the NER model, which has the context the regex lacks.
  const ORG_RE = new RegExp(`\\b([A-Z][\\w&.]*(?:\\s+[A-Z][\\w&.]*){0,4})\\s+(${ORG_SUFFIX})\\b\\.?`, 'g')
  const TITLE_RE = /\b(?:Mr|Mrs|Ms|Miss|Dr|Prof|Sir|Mx)\.?\s+([A-Za-zÀ-ÿ][A-Za-zÀ-ÿ'’-]+(?:\s+[A-Za-zÀ-ÿ][A-Za-zÀ-ÿ'’-]+)?)/gi
  const WORD_TOKEN = /[\p{L}][\p{L}'’.\-]*/gu
  // Words that often follow a first name but are not surnames, used to suppress
  // the noisiest false pairs ("mark the", "will you", "grace and").
  const NAME_STOPWORDS = new Set(
    ('the a an and or but to of in on at by as so if it its for with from into over about ' +
      'you your was is are were will would can could should may might must do does did has have had ' +
      'said says say told get got this that then there here my me we he she they them his her our their ' +
      'who what when where why how please thanks thank hi hello hey just like only also not no yes ok okay ' +
      'after before again very really still even more most some any each ' +
      // common nouns that often trail a first name but are not surnames
      'period time day days week weeks month months year years note notes list team group call meeting ' +
      'project account number card key code file page line area level point case plan deal role rate today')
      .split(' ')
  )

  function sniffProspects(text, lockedSpans) {
    text = text || ''
    lockedSpans = lockedSpans || []
    const taken = new Array(text.length).fill(false)
    for (const s of lockedSpans) for (let i = s.start; i < s.end && i < text.length; i++) taken[i] = true
    const free = (s, e) => {
      for (let i = s; i < e; i++) if (taken[i]) return false
      return true
    }
    const out = []
    const push = (start, end, type) => {
      if (start < 0 || end > text.length || end <= start || !free(start, end)) return
      for (let i = start; i < end; i++) taken[i] = true
      out.push({ start, end, type, original: text.slice(start, end) })
    }
    let m
    ORG_RE.lastIndex = 0
    while ((m = ORG_RE.exec(text))) {
      let end = m.index + m[0].length
      if (text[end - 1] === '.') end--
      push(m.index, end, 'ORG')
    }
    TITLE_RE.lastIndex = 0
    while ((m = TITLE_RE.exec(text))) {
      const ni = m.index + m[0].indexOf(m[1])
      push(ni, ni + m[1].length, 'NAME')
    }
    // adjacent word tokens (any case) where the first is a known given name and
    // the second looks like a surname: a letter-word that is not a common
    // stopword. Catches "John Smith", "john smith", "JOHN SMITH", "priya raj".
    const toks = []
    WORD_TOKEN.lastIndex = 0
    while ((m = WORD_TOKEN.exec(text))) toks.push({ w: m[0], start: m.index, end: m.index + m[0].length })
    for (let i = 0; i < toks.length - 1; i++) {
      const a = toks[i]
      const b = toks[i + 1]
      const surname = b.w.replace(/[.'’-]+$/, '')
      if (
        FIRST_NAMES.has(a.w.toLowerCase()) &&
        /^[ \t]+$/.test(text.slice(a.end, b.start)) &&
        surname.length >= 2 &&
        !NAME_STOPWORDS.has(surname.toLowerCase())
      ) {
        push(a.start, b.end, 'NAME')
        i++
      }
    }
    out.sort((a, b) => a.start - b.start)
    return out
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
        // A detector may lock only a capture group (e.g. the digits after an SSN
        // keyword) rather than the whole match.
        let value = m[0]
        let start = m.index
        if (det.group) {
          const g = m[det.group]
          if (g == null) continue
          const gi = m[0].indexOf(g)
          start = m.index + (gi < 0 ? 0 : gi)
          value = g
        }
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

  window.AirlockEngine = { redact, rehydrate, CATEGORY_COLORS, sniffProspects }
})()
