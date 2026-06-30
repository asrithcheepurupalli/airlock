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

// Thin line icons, drawn inline so the page ships no icon library. All use
// currentColor + round caps so they inherit the ink/red system.
const ICONS = {
  shield: 'M12 3l7 3v5c0 4.4-3 7.6-7 9-4-1.4-7-4.6-7-9V6l7-3zM8.5 12l2.5 2.5L15.5 10',
  loop: 'M4 9a8 8 0 0 1 13.5-3.5L20 8M20 5v3h-3M20 15a8 8 0 0 1-13.5 3.5L4 16M4 19v-3h3',
  sliders: 'M4 7h9M17 7h3M4 12h3M11 12h9M4 17h12M20 17h0',
  therapist: 'M21 11.5A8.4 8.4 0 0 1 12.5 20a9 9 0 0 1-3.9-.9L3 21l1.9-5.6A8.4 8.4 0 1 1 21 11.5zM8.5 11.2a2 2 0 0 1 3.5-1 2 2 0 0 1 3.5 1c0 1.6-3.5 3.6-3.5 3.6s-3.5-2-3.5-3.6z',
  scales: 'M12 3v18M7.5 21h9M5 7h14M12 4l-7 3M12 4l7 3M5 7l-2.5 6a3 3 0 0 0 5 0L5 7zM19 7l-2.5 6a3 3 0 0 0 5 0L19 7z',
  code: 'M8 8l-4 4 4 4M16 8l4 4-4 4M13.5 6l-3 12',
  chart: 'M4 5v14h16M7.5 14l3-3 2.5 2 4.5-5',
  people: 'M9 9a3 3 0 1 0 0-6 3 3 0 0 0 0 6zM3.5 20a5.5 5.5 0 0 1 11 0M16 7.5a3 3 0 0 1 0 5M17.5 20a5.5 5.5 0 0 0-2.5-4.6',
  briefcase: 'M5 8h14a1 1 0 0 1 1 1v9a1 1 0 0 1-1 1H5a1 1 0 0 1-1-1V9a1 1 0 0 1 1-1zM9 8V6a2 2 0 0 1 2-2h2a2 2 0 0 1 2 2v2M4 13h16',
}
function Icon({ name }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6"
      strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      {ICONS[name].split('M').filter(Boolean).map((d, i) => <path key={i} d={'M' + d} />)}
    </svg>
  )
}

const PILLARS = [
  ['shield', 'Provably local', 'The browser extension requests no network permission and makes no requests of its own. You can open the network tab and watch it stay silent. In a category where the famous names turned out to be data brokers, that proof is the product.'],
  ['loop', 'Reversible by design', 'Most tools strip your data and leave you decoding placeholders. Airlock restores them, so the round trip is invisible to you and airtight to the model.'],
  ['sliders', 'Built for your work', 'Term packs for the things a generic filter cannot know: a patient roster, privileged matter names, a project codename. Tuned per practice, by our studio.'],
]

const LEAK = [
  ['Marcus Hill', 'a named patient, identifiable health info'],
  ['marcus.hill@gmail.com', 'direct contact identifier'],
  ['Northgate Logistics', 'employer, re-identifies the patient'],
  ['4929 4929 4929 4929', 'payment data'],
]

// CTA targets. Swap STORE_URL for the Chrome Web Store listing once it is live,
// and PRO_URL for the Stripe checkout once payments are wired. Until then the
// buttons collect interest instead of dead-ending.
const STORE_URL = 'https://chromewebstore.google.com/detail/hbeghlogdgpojhmffabecfekegldapjc' // Chrome Web Store (live)
const PRO_URL = 'https://madebyac.gumroad.com/l/airlock' // Gumroad checkout (opens as an overlay)
const links = {
  free: STORE_URL || 'mailto:asrith@made-by-ac.com?subject=Notify%20me%20when%20Airlock%20launches',
  pro: PRO_URL || 'mailto:asrith@made-by-ac.com?subject=Airlock%20Pro%20waitlist',
  talk: 'mailto:asrith@made-by-ac.com?subject=Airlock%20for%20my%20team',
}
const freeLabel = STORE_URL ? 'Add to Chrome, free' : 'Notify me at launch'
const proLabel = PRO_URL ? 'Get Pro, $129 once' : 'Join the Pro waitlist'

const STAKES = [
  ['Deleted is not deleted', 'A 2025 court order forced OpenAI to preserve chats people had already erased. The provider keeps a copy whether you want it or not.'],
  ['No agreement protects you', 'Consumer ChatGPT and Claude offer no business associate agreement. For a therapist or a lawyer, a single paste can be the violation.'],
  ['Trained on by default', 'Consumer chatbots learn from what you type unless you dig through settings to opt out, and even then a copy was already sent.'],
]

const AUDIENCE = [
  ['therapist', 'Therapists and clinicians', 'Draft notes and letters without putting a client where a consumer chatbot can keep them.'],
  ['scales', 'Lawyers and small firms', 'Confidentiality is the job. Airlock is the thin layer that lets AI help without the privileged details going with it.'],
  ['code', 'Founders and developers', 'Paste the client brief, the API key, the proprietary code. Airlock makes sure there is nothing in it to leak.'],
  ['chart', 'Finance and accounting', 'Account numbers, balances, client names. Get the analysis without handing over the ledger.'],
  ['people', 'HR and recruiting', 'Salaries, reviews, candidate details. Use AI on the words without exposing the people.'],
  ['briefcase', 'Consultants and agencies', 'Every client is someone else\'s secret. Keep their names and numbers off a third party\'s servers.'],
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
          <a href="/demo">Demo</a>
          <a href="#pricing">Pricing</a>
          <a href="/activate.html">Activate</a>
          <a className="nav-cta" href="#pricing">Get Airlock</a>
        </div>
      </nav>

      <header className="hero" id="top">
        <p className="eyebrow">A <Wordmark name="made" /> product</p>
        <h1>The AI you use should never<br />see your client's name.</h1>
        <p className="lede">Airlock is a privacy firewall for AI. It strips names, emails,
          secrets and client data out of your prompt on your own device, before a single
          word reaches ChatGPT, Claude or Gemini. Then it puts your real values back into the
          answer. The model only ever sees placeholders.</p>

        <div className="hero-cta">
          <a className="btn-primary" href={links.free}>{freeLabel}</a>
          <a className="btn-ghost" href="#how">See how it works</a>
        </div>
        <a
          className="ph-badge"
          href="https://www.producthunt.com/products/airlock-6?embed=true&utm_source=badge-featured&utm_medium=badge&utm_campaign=badge-airlock-6"
          target="_blank"
          rel="noopener noreferrer"
          aria-label="Airlock on Product Hunt"
          style={{ display: 'inline-block', marginTop: '24px' }}
        >
          <img
            src="https://api.producthunt.com/widgets/embed-image/v1/featured.svg?post_id=1184875&theme=light&t=1782843190496"
            alt="Airlock - Redact your prompts on-device before AI ever sees them | Product Hunt"
            width="250"
            height="54"
          />
        </a>

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
            {PILLARS.map(([icon, t, d]) => (
              <div className="pillar" key={t}>
                <span className="pillar-ic"><Icon name={icon} /></span>
                <h3>{t}</h3>
                <p>{d}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="who" id="who">
        <h2>Who it is for</h2>
        <p className="section-lede center">It is not three professions, it is a habit. Anyone
          whose work touches other people's secrets, and who has started to lean on AI to move
          faster, needs a layer between the two.</p>
        <div className="audience">
          {AUDIENCE.map(([icon, t, d]) => (
            <div className="aud" key={t}>
              <span className="aud-ic"><Icon name={icon} /></span>
              <h3>{t}</h3>
              <p>{d}</p>
            </div>
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
        <a className="cta-btn" href="mailto:asrith@made-by-ac.com?subject=Airlock">Talk to our studio</a>
      </section>

      <footer className="site-foot">
        <span className="brand"><Wordmark name="made" /></span>
        <span className="muted">Airlock is a privacy firewall for AI. Built by our studio.</span>
        <a className="muted" href="/support.html">Support</a>
        <a className="muted" href="/privacy.html">Privacy</a>
      </footer>
    </div>
  )
}
