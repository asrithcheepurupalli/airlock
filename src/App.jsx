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

export default function App() {
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

        <div className="demo-frame">
          <div className="demo-frame-head">
            <span>Try it now. Nothing you type here leaves your machine.</span>
          </div>
          <Demo />
        </div>
      </header>

      <section className="band">
        <div className="band-inner">
          <h2>What we are solving</h2>
          <p className="section-lede">Every time a professional pastes a real prompt into
            ChatGPT, confidential data leaves their device. There is no business associate
            agreement on consumer ChatGPT, so for a therapist or a lawyer that paste can
            itself be a violation, and consumer chatbots now train on it by default.</p>

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
        <div className="audience">
          <div className="aud"><h3>Therapists</h3><p>Keep using the tools you like without
            putting a client's name where a consumer chatbot can keep it.</p></div>
          <div className="aud"><h3>Small law firms</h3><p>Confidentiality is the job. Airlock
            is the thin layer that lets the AI help without the privileged details going with it.</p></div>
          <div className="aud"><h3>Indie studios</h3><p>Paste the client brief, the API key,
            the proprietary code. Airlock makes sure there is nothing in it to leak.</p></div>
        </div>
      </section>

      <section className="pricing" id="pricing">
        <h2>Pricing</h2>
        <p className="section-lede center">Detection runs on your machine, so the free tier
          is genuinely free to give away. You pay when you want it to live inside ChatGPT and
          Claude and work without thinking about it.</p>
        <div className="tiers">
          <div className="tier">
            <h3>Free</h3>
            <p className="price">$0</p>
            <p className="tier-sub">The redactor, forever.</p>
            <ul>
              <li>Redact anything in the toolbar popup</li>
              <li>Rules for emails, secrets, cards, IDs</li>
              <li>Your own sensitive term list</li>
              <li>Nothing ever leaves your device</li>
            </ul>
            <a className="tier-btn ghost" href="#talk">Install free</a>
          </div>
          <div className="tier featured">
            <span className="tier-flag">Most popular</span>
            <h3>Pro</h3>
            <p className="price">$15<span>/mo</span></p>
            <p className="tier-sub">or $129 once, yours for good.</p>
            <ul>
              <li>Works right inside ChatGPT and Claude</li>
              <li>On-device model catches names and places</li>
              <li>Answers rehydrate automatically</li>
              <li>Vertical term packs (health, legal, code)</li>
            </ul>
            <a className="tier-btn" href="#talk">Get Pro</a>
          </div>
          <div className="tier">
            <h3>Practice</h3>
            <p className="price">Let's talk</p>
            <p className="tier-sub">For clinics and firms.</p>
            <ul>
              <li>Seats for your whole team</li>
              <li>Term packs tuned to your matters</li>
              <li>An audit trail you can show a regulator</li>
              <li>Set up and supported by our studio</li>
            </ul>
            <a className="tier-btn ghost" href="#talk">Talk to us</a>
          </div>
        </div>
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
