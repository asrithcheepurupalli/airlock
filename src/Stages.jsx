import { useMemo, useState } from 'react'
import { redact, rehydrate, CATEGORY_COLORS } from './redact.js'

// A transparent, step-through view of what actually happens when you "airlock"
// a prompt. It runs the real engine on a fixed example (names/org via terms so
// it is deterministic without the model), and draws the line your data never
// crosses. Nothing here is faked: the redacted string and the key map are the
// engine's real output.

const EXAMPLE =
  'Email Dana Reyes at dana.reyes@acmehealth.com about the Acme Health invoice. Card on file 4929 4929 4929 4929.'
// what the on-device model would return for this text (name + org), so the demo
// shows the real NAME_/ORG_ placeholders rather than generic terms
const MODEL_SPANS = [
  ['Dana Reyes', 'NAME', 'Name'],
  ['Acme Health', 'ORG', 'Org'],
].map(([v, type, label]) => {
  const start = EXAMPLE.indexOf(v)
  return { start, end: start + v.length, type, label }
})

const STEPS = [
  { key: 'draft', tab: 'Draft' },
  { key: 'detect', tab: 'Detect' },
  { key: 'swap', tab: 'Pseudonymize' },
  { key: 'send', tab: 'Send' },
  { key: 'reply', tab: 'Reply' },
  { key: 'restore', tab: 'Restore' },
]

const CAPTIONS = {
  draft: ['Your prompt, as you typed it', 'Nothing has happened yet. This is the raw text sitting in your compose box.'],
  detect: ['Detected on your device', 'Fast rules catch structured data (email, card). A small model catches names and orgs. Zero bytes have left your machine.'],
  swap: ['Swapped for placeholders', 'Each value becomes a stable token. The same value always maps to the same token, so the model still reasons correctly.'],
  send: ['Only placeholders are sent', 'The redacted version crosses to ChatGPT or Claude. Your real values stay behind, in a key map that never leaves the device.'],
  reply: ['The model answers blind', 'It writes a perfectly good reply using the placeholders. It never saw who any of this is about.'],
  restore: ['Restored, locally', 'Airlock puts your real values back into the answer on your device, so it reads naturally to you. The round trip is invisible.'],
}

function splitSpans(text, spans) {
  const sorted = [...spans].sort((a, b) => a.start - b.start)
  const out = []
  let i = 0
  for (const s of sorted) {
    if (s.start > i) out.push({ t: text.slice(i, s.start) })
    out.push({ t: text.slice(s.start, s.end), span: s })
    i = s.end
  }
  if (i < text.length) out.push({ t: text.slice(i) })
  return out
}

export default function Stages() {
  const [step, setStep] = useState(0)
  const cur = STEPS[step].key

  const { redacted, map, spans, phOf, answer, restored } = useMemo(() => {
    const r = redact(EXAMPLE, [], MODEL_SPANS)
    const phOf = {}
    for (const [ph, val] of Object.entries(r.map)) phOf[val] = ph
    // a believable model reply, written purely in placeholders
    const answer =
      `Here's a draft you can send:\n\nHi ${phOf['Dana Reyes'] || '[NAME_1]'}, regarding the ` +
      `${phOf['Acme Health'] || '[ORG_1]'} invoice. We have the card ending in the number on file ` +
      `(${phOf['4929 4929 4929 4929'] || '[CARD_1]'}) and will email you at ` +
      `${phOf['dana.reyes@acmehealth.com'] || '[EMAIL_1]'}.`
    return { ...r, phOf, answer, restored: rehydrate(answer, r.map) }
  }, [])

  const segs = splitSpans(EXAMPLE, spans)
  const color = (s) => CATEGORY_COLORS[s.type] || '#475569'

  // text where each detected value is shown as its placeholder chip
  const swapped = segs.map((seg, i) =>
    seg.span ? (
      <span key={i} className="stg-ph">{phOf[seg.span.original]}</span>
    ) : (
      <span key={i}>{seg.t}</span>
    ),
  )

  const deviceActive = cur !== 'send' && cur !== 'reply'
  const cloudActive = cur === 'send' || cur === 'reply'

  return (
    <section className="stages" id="how">
      <h2>Watch the airlock work</h2>
      <p className="section-lede center">No black box. Step through exactly what happens to a real
        prompt, and see the one line your sensitive data never crosses.</p>

      <div className="stg-tabs" role="tablist">
        {STEPS.map((s, i) => (
          <button
            key={s.key}
            role="tab"
            className={'stg-tab' + (i === step ? ' on' : '') + (i < step ? ' done' : '')}
            onClick={() => setStep(i)}
          >
            <span className="stg-n">{i + 1}</span>{s.tab}
          </button>
        ))}
      </div>

      <div className="stg-stage">
        {/* your device */}
        <div className={'stg-side device' + (deviceActive ? ' active' : '')}>
          <div className="stg-side-head"><span className="stg-dot live" /> Your device</div>

          {cur === 'restore' ? (
            <div className="stg-readout">{restored}</div>
          ) : cur === 'send' || cur === 'reply' ? (
            <div className="stg-keymap">
              <div className="stg-keymap-h">Key map · stays here</div>
              {Object.entries(map).map(([ph, val]) => (
                <div className="stg-kv" key={ph}><span className="stg-ph sm">{ph}</span><span>{val}</span></div>
              ))}
            </div>
          ) : (
            <div className="stg-readout">
              {cur === 'swap'
                ? swapped
                : segs.map((seg, i) =>
                    seg.span ? (
                      <span
                        key={i}
                        className={'stg-mark' + (cur === 'detect' ? ' lit' : '')}
                        style={{ '--c': color(seg.span) }}
                      >
                        {seg.t}
                        {cur === 'detect' && <span className="stg-tag">{seg.span.type}</span>}
                      </span>
                    ) : (
                      <span key={i}>{seg.t}</span>
                    ),
                  )}
            </div>
          )}
        </div>

        {/* the boundary */}
        <div className="stg-divider"><span>airlock</span></div>

        {/* the AI */}
        <div className={'stg-side cloud' + (cloudActive ? ' active' : '')}>
          <div className="stg-side-head"><span className="stg-dot" /> ChatGPT / Claude</div>
          {cur === 'send' ? (
            <div className="stg-readout mono sent">{redacted}</div>
          ) : cur === 'reply' ? (
            <div className="stg-readout mono">{answer}</div>
          ) : (
            <div className="stg-empty">It only ever receives placeholders.</div>
          )}
        </div>
      </div>

      <div className="stg-foot">
        <div className="stg-caption">
          <strong>{CAPTIONS[cur][0]}</strong>
          <span>{CAPTIONS[cur][1]}</span>
        </div>
        <div className="stg-nav">
          <button className="link" onClick={() => setStep((s) => Math.max(0, s - 1))} disabled={step === 0}>Back</button>
          {step < STEPS.length - 1 ? (
            <button onClick={() => setStep((s) => s + 1)}>Next stage</button>
          ) : (
            <button onClick={() => setStep(0)}>Replay</button>
          )}
        </div>
      </div>
    </section>
  )
}
