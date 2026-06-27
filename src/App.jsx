import { useEffect } from 'react'
import Lenis from 'lenis'
import Demo from './Demo.jsx'
import Stages from './Stages.jsx'

// The made. mark: italic Fraunces, semibold, with an upright brand-red period.
// Sub-brands (airlock., table., studio.) reuse the exact pattern. The dot is the logo.
function Wordmark({ name }) {
  return (
    <span className="wordmark"><span className="wm-word">{name}</span><span className="wm-dot">.</span></span>
  )
}

const LEAK = [
  ['Marcus Hill', 'a named patient, identifiable health info'],
  ['marcus.hill@gmail.com', 'direct contact identifier'],
  ['Northgate Logistics', 'employer, re-identifies the patient'],
  ['4929 4929 4929 4929', 'payment data'],
]

// CTA targets. Swap STORE_URL for the Chrome Web Store listing once it is live,
// and PRO_URL for the Stripe checkout once payments are wired. Until then the
// buttons collect interest instead of dead-ending.
const STORE_URL = '' // e.g. https://chrome.google.com/webstore/detail/<id>
const PRO_URL = 'https://madebyac.gumroad.com/l/airlock' // Gumroad checkout (opens as an overlay)
const links = {
  free: STORE_URL || 'mailto:hello@made-by-ac.com?subject=Notify%20me%20when%20Airlock%20launches',
  pro: PRO_URL || 'mailto:hello@made-by-ac.com?subject=Airlock%20Pro%20waitlist',
  talk: 'mailto:hello@made-by-ac.com?subject=Airlock%20for%20my%20team',
}
const freeLabel = STORE_URL ? 'Add to Chrome, free' : 'Notify me at launch'
const proLabel = PRO_URL ? 'Get Pro, $129 once' : 'Join the Pro waitlist'

const STAKES = [
  ['Deleted is not deleted', 'A 2025 court order forced OpenAI to preserve chats people had already erased. The provider keeps a copy whether you want it or not.'],
  ['No agreement protects you', 'Consumer ChatGPT and Claude offer no business associate agreement. For a therapist or a lawyer, a single paste can be the violation.'],
  ['Trained on by default', 'Consumer chatbots learn from what you type unless you dig through settings to opt out, and even then a copy was already sent.'],
]

const AUDIENCE = [
  ['Therapists and clinicians', 'Draft notes and letters without putting a client where a consumer chatbot can keep them.'],
  ['Lawyers and small firms', 'Confidentiality is the job. Airlock is the thin layer that lets AI help without the privileged details going with it.'],
  ['Founders and developers', 'Paste the client brief, the API key, the proprietary code. Airlock makes sure there is nothing in it to leak.'],
  ['Finance and accounting', 'Account numbers, balances, client names. Get the analysis without handing over the ledger.'],
  ['HR and recruiting', 'Salaries, reviews, candidate details. Use AI on the words without exposing the people.'],
  ['Consultants and agencies', 'Every client is someone else\'s secret. Keep their names and numbers off a third party\'s servers.'],
]

export default function App() {
  useEffect(() => {
    const lenis = new Lenis({ duration: 0.9, smoothWheel: true })
    window.__airlockLenis = lenis
    let id
    const raf = (t) => { lenis.raf(t); id = requestAnimationFrame(raf) }
    id = requestAnimationFrame(raf)
    // smooth in-page anchor jumps
    const onClick = (e) => {
      const a = e.target.closest('a[href^="#"]')
      if (!a) return
      const target = document.querySelector(a.getAttribute('href'))
      if (!target) return
      e.preventDefault()
      lenis.scrollTo(target, { offset: -10 })
    }
    document.addEventListener('click', onClick)
    return () => {
      cancelAnimationFrame(id)
      document.removeEventListener('click', onClick)
      lenis.destroy()
      delete window.__airlockLenis
    }
  }, [])

  return (
    <div className="page">
      <nav className="nav">
        <a className="brand" href="#top"><Wordmark name="airlock" /></a>
        <div className="nav-right">
          <a href="#how">How it works</a>
          <a href="#pricing">Pricing</a>
          <a className="nav-cta" href="#pricing">Get Airlock</a>
        </div>
      </nav>

      <header className="hero" id="top">
        <p className="eyebrow">A <Wordmark name="made" /> product</p>
        <h1>The AI you use should never<br />see your client's name.</h1>
        <p className="lede">Airlock is a privacy firewall for AI. It strips names, emails,
          secrets and client data out of your prompt on your own device, before a single
          word reaches ChatGPT or Claude. Then it puts your real values back into the
          answer. The model only ever sees placeholders.</p>

        <div className="hero-cta">
          <a className="btn-primary" href={links.free}>{freeLabel}</a>
          <a className="btn-ghost" href="#how">See how it works</a>
        </div>

        <div className="demo-frame">
          <div className="demo-frame-head">
            <span className="demo-dots"><i /><i /><i /></span>
            <span className="demo-title"><Wordmark name="airlock" /> live demo</span>
            <span className="demo-note">nothing here leaves your machine</span>
          </div>
          <Demo />
        </div>
      </header>

      <section className="band">
        <div className="band-inner">
          <h2>What we are solving</h2>
          <p className="section-lede">Every day, people paste things into ChatGPT they would
            never post in public: a client's name, a patient's history, an API key, a contract
            clause. The moment you hit send, it is on someone else's servers, and the provider's
            privacy toggle acts too late to help.</p>

          <div className="stakes">
            {STAKES.map(([t, d]) => (
              <div className="stake" key={t}><h4>{t}</h4><p>{d}</p></div>
            ))}
          </div>

          <div className="contrast">
            <div className="contrast-col leak">
              <h4>Without Airlock</h4>
              <p className="contrast-sub">A therapist's prompt. Here is what leaves the
                building, in the clear:</p>
              <ul>
                {LEAK.map(([v, why]) => (
                  <li key={v}><code>{v}</code><span>{why}</span></li>
                ))}
              </ul>
            </div>
            <div className="contrast-col safe">
              <h4>With Airlock</h4>
              <p className="contrast-sub">The same prompt. What the model actually receives:</p>
              <div className="safe-text">
                Help me write a follow-up note. My client is <em>[NAME_1]</em>
                {' '}(<em>[EMAIL_1]</em>), who I see for anxiety. His employer is
                {' '}<em>[ORG_1]</em>, and his copay of <em>[CARD_1]</em> is still open.
              </div>
              <p className="contrast-foot">Four identifiers never left the device. The model
                sees the shape of the request, not who it is about.</p>
            </div>
          </div>
        </div>
      </section>

      <Stages />

      <section className="band trust">
        <div className="band-inner">
          <h2>Why this holds</h2>
          <div className="pillars">
            <div className="pillar">
              <h3>Provably local</h3>
              <p>The browser extension requests no network permission and makes no requests
                of its own. You can open the network tab and watch it stay silent. In a
                category where the famous names turned out to be data brokers, that proof is
                the product.</p>
            </div>
            <div className="pillar">
              <h3>Reversible by design</h3>
              <p>Most tools strip your data and leave you decoding placeholders. Airlock
                restores them, so the round trip is invisible to you and airtight to the
                model.</p>
            </div>
            <div className="pillar">
              <h3>Built for your work</h3>
              <p>Term packs for the things a generic filter cannot know: a patient roster,
                privileged matter names, a project codename. Tuned per practice, by our studio.</p>
            </div>
          </div>
        </div>
      </section>

      <section className="who" id="who">
        <h2>Who it is for</h2>
        <p className="section-lede center">It is not three professions, it is a habit. Anyone
          whose work touches other people's secrets, and who has started to lean on AI to move
          faster, needs a layer between the two.</p>
        <div className="audience">
          {AUDIENCE.map(([t, d]) => (
            <div className="aud" key={t}><h3>{t}</h3><p>{d}</p></div>
          ))}
        </div>
        <p className="who-foot">And honestly, anyone who has ever pasted something into ChatGPT
          and hesitated, just for a second, before hitting send.</p>
      </section>

      <section className="pricing" id="pricing">
        <h2>Pricing</h2>
        <p className="section-lede center">Everything runs on your machine, so Free is genuinely
          free to give away. Pro adds the on-device model that catches the hardest thing to spot
          on your own: the people.</p>
        <div className="tiers">
          <div className="tier">
            <h3>Free</h3>
            <p className="price">$0</p>
            <p className="tier-sub">Yours forever, no account.</p>
            <ul>
              <li>Lock data in the popup and in-page</li>
              <li>Rules for emails, cards, secrets, IDs</li>
              <li>Your own sensitive term list</li>
              <li>Unlimited. No daily limits, ever</li>
            </ul>
            <a className="tier-btn ghost" href={links.free}>{freeLabel}</a>
          </div>
          <div className="tier featured">
            <span className="tier-flag">Most popular</span>
            <h3>Pro</h3>
            <p className="price">$129<span> once</span></p>
            <p className="tier-sub">Pay once. No subscription, ever.</p>
            <ul>
              <li>Everything in Free, plus the model</li>
              <li>Auto-catches names, orgs and places</li>
              <li>Curated packs for health, legal, code</li>
              <li>Replies restore your real values, locally</li>
            </ul>
            <a className="tier-btn gumroad-button" href={links.pro}>{proLabel}</a>
          </div>
          <div className="tier">
            <h3>Practice</h3>
            <p className="price">Let's talk</p>
            <p className="tier-sub">For clinics and firms.</p>
            <ul>
              <li>Seats for your whole team</li>
              <li>Term packs tuned to your matters</li>
              <li>A usage trail you can show a regulator</li>
              <li>Set up and supported by our studio</li>
            </ul>
            <a className="tier-btn ghost" href={links.talk}>Talk to us</a>
          </div>
        </div>
        <p className="pricing-note">Pro activates with an offline license key. Even when you pay,
          the extension still makes no network requests of its own. The proof survives the paywall.
          {' '}<a href="/activate.html">Already bought? Activate your key</a>.</p>
      </section>

      <section className="cta" id="talk">
        <h2>Want this for your practice?</h2>
        <p>We are a small studio that builds sharp, defensible products and tunes them to
          how you actually work. Tell us what you handle, and we will set Airlock up for it.</p>
        <a className="cta-btn" href="mailto:hello@made-by-ac.com?subject=Airlock">Talk to our studio</a>
      </section>

      <footer className="site-foot">
        <span className="brand"><Wordmark name="made" /></span>
        <span className="muted">Airlock is a privacy firewall for AI. Built by our studio.</span>
        <a className="muted" href="/privacy.html">Privacy</a>
      </footer>
    </div>
  )
}
