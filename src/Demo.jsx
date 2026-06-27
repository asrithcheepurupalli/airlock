import { useEffect, useMemo, useRef, useState } from 'react'
import { redact, rehydrate, CATEGORY_COLORS } from './redact.js'
import { detectEntities, setStatusHandler } from './ner.js'

const SAMPLE = `Draft a warm reply to my client Acme Health Systems. The main contact is Dana Reyes (dana.reyes@acmehealth.com, 415-555-0182), and the treating clinician is Dr. Lena Park. They asked about the invoice for patient John Carver in Oakland. Our Stripe key is sk-live-4eC39HqLyjWDarjtT1zdp7dcabc123 if you need it.`

const DEFAULT_TERMS = ['Acme Health Systems']

const NER_LABELS = {
  idle: '',
  loading: 'on-device model: loading',
  ready: 'on-device model: ready',
  error: 'on-device model: unavailable (rules and terms still active)',
}

function Highlighted({ text, spans }) {
  if (!spans.length) return <span>{text}</span>
  const out = []
  let cursor = 0
  spans.forEach((s, i) => {
    if (s.start > cursor) out.push(<span key={`t${i}`}>{text.slice(cursor, s.start)}</span>)
    out.push(
      <mark
        key={`m${i}`}
        className="chip"
        style={{ ['--c']: CATEGORY_COLORS[s.type] || '#475569' }}
        title={`${s.label} becomes ${s.placeholder}`}
      >
        {s.original}
      </mark>
    )
    cursor = s.end
  })
  if (cursor < text.length) out.push(<span key="tail">{text.slice(cursor)}</span>)
  return <>{out}</>
}

export default function Demo() {
  const [input, setInput] = useState(SAMPLE)
  const [terms, setTerms] = useState(DEFAULT_TERMS.join(', '))
  const [answer, setAnswer] = useState('')
  const [rawAnswer, setRawAnswer] = useState('')
  const [busy, setBusy] = useState(false)
  const [mode, setMode] = useState('')
  const [showModelView, setShowModelView] = useState(false)
  const [nerSpans, setNerSpans] = useState([])
  const [nerStatus, setNerStatus] = useState('idle')
  const reqRef = useRef(0)

  const termList = useMemo(
    () => terms.split(',').map((t) => t.trim()).filter(Boolean),
    [terms]
  )
  const { redacted, map, spans } = useMemo(
    () => redact(input, termList, nerSpans),
    [input, termList, nerSpans]
  )

  useEffect(() => {
    setStatusHandler(setNerStatus)
  }, [])

  useEffect(() => {
    const seq = ++reqRef.current
    const handle = setTimeout(async () => {
      const found = await detectEntities(input)
      if (reqRef.current === seq) setNerSpans(found)
    }, 350)
    return () => clearTimeout(handle)
  }, [input])

  // When no relay is reachable (e.g. the public static site), build the same
  // demo-mode answer locally so the round trip still shows rehydration working,
  // and so the landing needs no open backend proxy.
  function mockAnswer(red) {
    const seen = red.match(/\[[A-Z]+_\d+\]/g) || []
    const first = (...types) => seen.find((p) => types.some((t) => p.startsWith(`[${t}_`)))
    const who = first('NAME', 'TERM', 'ORG') || 'there'
    const subject = first('NAME', 'TERM')
    const reachAt = [first('EMAIL'), first('PHONE')].filter(Boolean).join(' or ')
    return (
      `Here's a draft reply you can send:\n\nHi ${who}, thanks for reaching out. I've reviewed ` +
      `${subject ? `the notes for ${subject}` : 'your request'} and will follow up` +
      `${reachAt ? ` at ${reachAt}` : ''} by Friday.\n\n` +
      `(This demo runs entirely in your browser. The model only ever saw the placeholders above.)`
    )
  }

  async function send() {
    setBusy(true)
    setAnswer('')
    setRawAnswer('')
    try {
      const res = await fetch('/api/complete', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ redacted }),
      })
      if (!res.ok) throw new Error('relay unavailable')
      const data = await res.json()
      if (data.error) throw new Error(data.error)
      setRawAnswer(data.answer)
      setAnswer(rehydrate(data.answer, map))
      setMode(data.mode)
    } catch (e) {
      const a = mockAnswer(redacted) // graceful local fallback, no backend needed
      setRawAnswer(a)
      setAnswer(rehydrate(a, map))
      setMode('demo')
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="demo">
      <div className="demo-input">
        <label className="lbl">Your prompt <span className="muted">(type anything, redaction is live)</span></label>
        <textarea value={input} onChange={(e) => setInput(e.target.value)} rows={5} spellCheck={false} />
        <label className="lbl">Sensitive terms <span className="muted">(clients, codenames a generic filter cannot know)</span></label>
        <input className="terms" value={terms} onChange={(e) => setTerms(e.target.value)} />
      </div>

      <div className="grid">
        <div className="card">
          <div className="card-head">
            <h3>What you wrote</h3>
            <span className="badge">
              {spans.length} sensitive {spans.length === 1 ? 'span' : 'spans'}
              {nerStatus === 'loading' && ', scanning'}
            </span>
          </div>
          <div className="readout"><Highlighted text={input} spans={spans} /></div>
        </div>

        <div className="card model">
          <div className="card-head">
            <h3>What the model receives</h3>
            <span className="badge ok">leaves your device</span>
          </div>
          <div className="readout mono">{redacted}</div>
          <p className="fineprint">Every real value stayed local in a key map only your
            browser holds. The model answers in placeholders, and Airlock restores your
            real values into the reply afterward.</p>
        </div>
      </div>

      <div className="actions">
        <button onClick={send} disabled={busy || !input.trim()}>
          {busy ? 'Sending redacted prompt' : 'Send through the firewall'}
        </button>
        {mode && <span className={`mode mode-${mode}`}>{mode === 'live' ? 'live, claude-opus-4-8' : 'demo mode (no API key)'}</span>}
        {nerStatus !== 'idle' && <span className={`ner-status ner-${nerStatus}`}>{NER_LABELS[nerStatus]}</span>}
      </div>

      {answer && (
        <div className="card answer">
          <div className="card-head">
            <h3>Answer <span className="muted">(rehydrated with your real values)</span></h3>
            {rawAnswer && (
              <button className="link" onClick={() => setShowModelView((v) => !v)}>
                {showModelView ? 'show your version' : 'show what the model actually returned'}
              </button>
            )}
          </div>
          <div className="readout answer-body">{showModelView ? rawAnswer : answer}</div>
        </div>
      )}
    </div>
  )
}
