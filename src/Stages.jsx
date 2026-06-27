import { useEffect, useMemo, useRef, useState } from 'react'
import { redact, rehydrate, CATEGORY_COLORS } from './redact.js'

// A full-screen, scroll-driven walkthrough of what actually happens when you
// "airlock" a prompt. On desktop the section pins and each scroll-beat advances
// a stage; on mobile it falls back to a tap stepper (no scroll-jacking). It runs
// the real engine on a fixed example, so nothing here is faked.

const EXAMPLE =
  'Email Dana Reyes at dana.reyes@acmehealth.com about the Acme Health Systems invoice. Card on file 4929 4929 4929 4929.'
const MODEL_SPANS = [
  ['Dana Reyes', 'NAME', 'Name'],
  ['Acme Health Systems', 'ORG', 'Org'],
].map(([v, type, label]) => {
  const start = EXAMPLE.indexOf(v)
  return { start, end: start + v.length, type, label }
})

const STEP_SCROLL_VH = 55 // scroll length per stage (lower = quicker to move through)
const STEPS = [
  { key: 'draft', tab: 'Draft' },
  { key: 'detect', tab: 'Detect' },
  { key: 'swap', tab: 'Pseudonymize' },
  { key: 'send', tab: 'Send' },
  { key: 'reply', tab: 'Reply' },
  { key: 'restore', tab: 'Restore' },
]
const CAPTIONS = {
  draft: ['Your prompt, as you typed it', 'The raw text sitting in your compose box. Nothing has happened yet.'],
  detect: ['Detected on your device', 'Rules catch structured data; a small model catches names and orgs. Zero bytes have left your machine.'],
  swap: ['Swapped for placeholders', 'Each value becomes a stable token. The same value always maps to the same token, so the model still reasons correctly.'],
  send: ['Only placeholders are sent', 'The redacted version crosses to ChatGPT or Claude. Your real values stay behind, in a key map that never leaves the device.'],
  reply: ['The model answers blind', 'It writes a perfectly good reply using the placeholders. It never saw who any of this is about.'],
  restore: ['Restored, locally', 'Airlock puts your real values back into the answer on your device. The round trip is invisible to you, airtight to the model.'],
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
  const [pinned, setPinned] = useState(true)
  const sectionRef = useRef(null)
  const cur = STEPS[step].key

  const { redacted, map, spans, phOf, answer, restored } = useMemo(() => {
    const r = redact(EXAMPLE, [], MODEL_SPANS)
    const phOf = {}
    for (const [ph, val] of Object.entries(r.map)) phOf[val] = ph
    const answer =
      `Here's a draft you can send:\n\nHi ${phOf['Dana Reyes'] || '[NAME_1]'}, regarding the ` +
      `${phOf['Acme Health Systems'] || '[ORG_1]'} invoice. We have the card on file ` +
      `(${phOf['4929 4929 4929 4929'] || '[CARD_1]'}) and will email you at ` +
      `${phOf['dana.reyes@acmehealth.com'] || '[EMAIL_1]'}.`
    return { ...r, phOf, answer, restored: rehydrate(answer, r.map) }
  }, [])

  // desktop vs mobile
  useEffect(() => {
    const mq = window.matchMedia('(max-width: 860px)')
    const apply = () => setPinned(!mq.matches)
    apply()
    mq.addEventListener('change', apply)
    return () => mq.removeEventListener('change', apply)
  }, [])

  // scroll-driven stage on desktop
  useEffect(() => {
    if (!pinned) return
    const el = sectionRef.current
    if (!el) return
    let raf = 0
    const update = () => {
      const vh = window.innerHeight
      const total = el.offsetHeight - vh
      const scrolled = Math.min(Math.max(-el.getBoundingClientRect().top, 0), total)
      const progress = total > 0 ? scrolled / total : 0
      const idx = Math.max(0, Math.min(STEPS.length - 1, Math.floor(progress * STEPS.length)))
      setStep(idx)
    }
    const onScroll = () => {
      cancelAnimationFrame(raf)
      raf = requestAnimationFrame(update)
    }
    window.addEventListener('scroll', onScroll, { passive: true })
    update()
    return () => {
      window.removeEventListener('scroll', onScroll)
      cancelAnimationFrame(raf)
    }
  }, [pinned])

  function scrollToStep(i) {
    const el = sectionRef.current
    if (!el || !pinned) return setStep(i)
    const total = el.offsetHeight - window.innerHeight
    const top = el.offsetTop + (i + 0.5) * (total / STEPS.length)
    if (window.__airlockLenis) window.__airlockLenis.scrollTo(top)
    else window.scrollTo({ top, behavior: 'smooth' })
  }

  const segs = splitSpans(EXAMPLE, spans)
  const color = (s) => CATEGORY_COLORS[s.type] || '#475569'
  const deviceActive = cur !== 'send' && cur !== 'reply'
  const cloudActive = cur === 'send' || cur === 'reply'

  const deviceBody = () => {
    if (cur === 'restore') return <div className="sc-text">{restored}</div>
    if (cur === 'send' || cur === 'reply') {
      return (
        <div className="sc-keymap">
          <div className="sc-keymap-h">Key map · stays here</div>
          {Object.entries(map).map(([ph, val]) => (
            <div className="sc-kv" key={ph}><span className="sc-ph">{ph}</span><span className="sc-kv-v">{val}</span></div>
          ))}
        </div>
      )
    }
    return (
      <div className="sc-text">
        {segs.map((seg, i) => {
          if (!seg.span) return <span key={i}>{seg.t}</span>
          if (cur === 'swap') return <span key={i} className="sc-ph">{phOf[seg.span.original]}</span>
          return (
            <span key={i} className={'sc-mark' + (cur === 'detect' ? ' lit' : '')} style={{ '--c': color(seg.span) }}>
              {seg.t}
              {cur === 'detect' && <span className="sc-tag">{seg.span.type}</span>}
            </span>
          )
        })}
      </div>
    )
  }

  const cloudBody = () => {
    if (cur === 'send') return <div className="sc-text mono sent">{redacted}</div>
    if (cur === 'reply') return <div className="sc-text mono">{answer}</div>
    return <div className="sc-empty">It only ever receives placeholders.</div>
  }

  const stage = (
    <div className="stages-inner">
      <div className="stages-topbar">
        <span className="stages-kicker">Watch the airlock work</span>
        <div className="stages-rail">
          {STEPS.map((s, i) => (
            <button
              key={s.key}
              className={'rail-step' + (i === step ? ' on' : '') + (i < step ? ' done' : '')}
              onClick={() => scrollToStep(i)}
            >
              <span className="rail-n">{String(i + 1).padStart(2, '0')}</span>
              <span className="rail-label">{s.tab}</span>
            </button>
          ))}
        </div>
      </div>

      <div className={'stages-canvas s-' + cur}>
        <div className={'sc-panel device' + (deviceActive ? ' live' : '')}>
          <div className="sc-head"><span className="sc-dot live" /> Your device</div>
          <div className="sc-body" key={'d' + cur}>{deviceBody()}</div>
        </div>
        <div className={'sc-bound' + (cur === 'send' ? ' crossing' : '')}>
          <span className="sc-bound-label">airlock</span>
        </div>
        <div className={'sc-panel cloud' + (cloudActive ? ' live' : '')}>
          <div className="sc-head"><span className="sc-dot" /> ChatGPT / Claude</div>
          <div className="sc-body" key={'c' + cur}>{cloudBody()}</div>
        </div>
      </div>

      <div className="stages-caption" key={cur}>
        <span className="cap-step">{String(step + 1).padStart(2, '0')} / {String(STEPS.length).padStart(2, '0')}</span>
        <h3>{CAPTIONS[cur][0]}</h3>
        <p>{CAPTIONS[cur][1]}</p>
        {!pinned && (
          <div className="cap-nav">
            <button className="link" onClick={() => setStep((s) => Math.max(0, s - 1))} disabled={step === 0}>Back</button>
            {step < STEPS.length - 1
              ? <button onClick={() => setStep((s) => s + 1)}>Next stage</button>
              : <button onClick={() => setStep(0)}>Replay</button>}
          </div>
        )}
      </div>
    </div>
  )

  return (
    <section
      className={'stages-scroll' + (pinned ? ' pinned' : '')}
      id="how"
      ref={sectionRef}
      style={pinned ? { height: `${STEPS.length * STEP_SCROLL_VH}vh` } : undefined}
    >
      <div className="stages-pin">{stage}</div>
    </section>
  )
}
