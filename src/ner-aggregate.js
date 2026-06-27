// ner-aggregate.js — turn raw token-classification output into clean entity
// spans. Kept separate from the worker so it can be unit-tested in Node against
// the real model output.
//
// The token-classification pipeline emits one entry per WordPiece sub-token
// (e.g. "Dana", "Rey", "##es") tagged B-PER / I-PER / O, WITHOUT character
// offsets. So we (1) group consecutive tokens into whole entities, (2) rebuild
// each entity's surface text from the pieces, and (3) locate that text in the
// original string with a moving cursor to recover start/end.

// Map model tags to our redaction categories. MISC is too noisy to trust.
export const TAG = {
  PER: { type: 'NAME', label: 'Name' },
  ORG: { type: 'ORG', label: 'Organization' },
  LOC: { type: 'LOCATION', label: 'Location' },
}
export const MIN_SCORE = 0.6

export function aggregate(tokens, text) {
  // 1) group tokens into entities
  const groups = []
  let cur = null
  const flush = () => {
    if (cur) groups.push(cur)
    cur = null
  }

  for (const t of tokens) {
    const raw = t.entity || t.entity_group || 'O'
    const word = t.word || ''
    const isSub = word.startsWith('##')

    if (raw === 'O') {
      flush()
      continue
    }
    const base = raw.includes('-') ? raw.split('-').pop() : raw

    // A WordPiece continuation can never start a new entity — always glue it to
    // the current group (the model sometimes mis-tags subwords as B-).
    if (isSub) {
      if (cur) {
        cur.parts.push(word)
        cur.score = Math.max(cur.score, t.score)
      }
      continue
    }

    const isBegin = raw.startsWith('B-')
    if (cur && cur.base === base && !isBegin) {
      cur.parts.push(word)
      cur.score = Math.max(cur.score, t.score)
    } else {
      flush()
      cur = { base, parts: [word], score: t.score }
    }
  }
  flush()

  // 2) + 3) reconstruct surface form and locate it in the original text
  const spans = []
  let cursor = 0
  for (const g of groups) {
    if (!TAG[g.base] || g.score < MIN_SCORE) continue
    let surface = ''
    g.parts.forEach((w, i) => {
      surface += w.startsWith('##') ? w.slice(2) : (i === 0 ? '' : ' ') + w
    })
    if (!surface) continue
    const idx = text.indexOf(surface, cursor)
    if (idx === -1) continue // reconstruction didn't match (rare) — skip safely
    const start = idx
    const end = idx + surface.length
    spans.push({
      start,
      end,
      type: TAG[g.base].type,
      label: TAG[g.base].label,
      original: text.slice(start, end),
    })
    cursor = end
  }
  return spans
}
