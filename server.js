// server.js — the relay.
//
// The whole point of Airlock is that this process is dumb and blind: it receives
// already-redacted text and forwards it to Claude. It never sees raw PII, never
// stores anything, and (in the real product) would be replaceable by the user's
// own key talking straight to the model. It exists here only so the API key
// isn't shipped to the browser.

import express from 'express'
import cors from 'cors'
import dotenv from 'dotenv'
import Anthropic from '@anthropic-ai/sdk'

dotenv.config()

const app = express()

// Only allow the dev site and your own deployed origin to call the relay, so a
// self-hosted instance with a real key can't be used as an open Claude proxy.
const ALLOWED = (process.env.ALLOWED_ORIGINS || 'http://localhost:5173,http://localhost:4173')
  .split(',').map((s) => s.trim()).filter(Boolean)
app.use(cors({
  origin: (origin, cb) => (!origin || ALLOWED.includes(origin) ? cb(null, true) : cb(new Error('Origin not allowed'))),
}))
app.use(express.json({ limit: '64kb' }))

// Cheap in-memory per-IP rate limit (defense in depth behind the origin check).
const hits = new Map()
function rateLimit(req, res, next) {
  const ip = (req.headers['x-forwarded-for'] || req.socket.remoteAddress || 'x').toString().split(',')[0]
  const now = Date.now()
  const rec = hits.get(ip) || { n: 0, t: now }
  if (now - rec.t > 60000) { rec.n = 0; rec.t = now }
  rec.n++
  hits.set(ip, rec)
  if (rec.n > 20) return res.status(429).json({ error: 'Too many requests. Slow down.' })
  next()
}

const apiKey = process.env.ANTHROPIC_API_KEY
const client = apiKey ? new Anthropic({ apiKey }) : null
const MODEL = 'claude-opus-4-8'

app.get('/api/health', (_req, res) => {
  res.json({ ok: true, mode: client ? 'live' : 'demo' })
})

app.post('/api/complete', rateLimit, async (req, res) => {
  const { redacted } = req.body || {}
  if (typeof redacted !== 'string' || !redacted.trim()) {
    return res.status(400).json({ error: 'Missing redacted prompt.' })
  }
  if (redacted.length > 8000) {
    return res.status(413).json({ error: 'Prompt too long for the demo relay.' })
  }

  // Guardrail: this relay should only ever see placeholder-shaped tokens, never
  // raw secrets. If something that looks like a live key slipped through, refuse
  // rather than forward it. (Belt-and-suspenders behind the client redactor.)
  if (/\b(sk[-_][a-zA-Z0-9_-]{16,}|AKIA[0-9A-Z]{16}|ghp_[A-Za-z0-9]{20,})\b/.test(redacted)) {
    return res.status(422).json({ error: 'Refusing: unredacted secret detected in payload.' })
  }

  if (!client) {
    // DEMO MODE — no key. Build a believable answer from whatever placeholders
    // actually arrived, so rehydration always has real values to restore.
    const seen = redacted.match(/\[[A-Z]+_\d+\]/g) || []
    const first = (...types) => seen.find((p) => types.some((t) => p.startsWith(`[${t}_`)))
    const who = first('NAME', 'TERM', 'ORG') || 'there'
    const subject = first('NAME', 'TERM')
    const email = first('EMAIL')
    const phone = first('PHONE')
    const reachAt = [email, phone].filter(Boolean).join(' or ')
    const sample =
      `Here's a draft reply you can send:\n\n` +
      `Hi ${who}, thanks for reaching out. I've reviewed ` +
      `${subject ? `the notes for ${subject}` : 'your request'} and will follow up` +
      `${reachAt ? ` at ${reachAt}` : ''} by Friday.\n\n` +
      `(Demo mode: add an ANTHROPIC_API_KEY to .env for a real Claude completion. ` +
      `Notice the model only ever saw the placeholders above.)`
    return res.json({ answer: sample, mode: 'demo', model: null })
  }

  try {
    const message = await client.messages.create({
      model: MODEL,
      max_tokens: 4096,
      messages: [{ role: 'user', content: redacted }],
    })
    const answer = message.content
      .filter((b) => b.type === 'text')
      .map((b) => b.text)
      .join('')
    res.json({ answer, mode: 'live', model: message.model })
  } catch (err) {
    console.error('relay error:', err?.message || err)
    res.status(502).json({ error: 'Upstream model error. Check your API key and try again.' })
  }
})

const PORT = process.env.PORT || 8787
app.listen(PORT, () => {
  console.log(`\n  Airlock relay on :${PORT}  (${client ? 'live' : 'demo'} mode)`)
  console.log(`  The relay only ever receives redacted text.\n`)
})
