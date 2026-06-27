# airlock. — positioning one-pager

> Working brief for the made. privacy-firewall product. Competitive section is
> refined from a dedicated teardown (see end); everything else is decided.

## One line

**Airlock is a privacy firewall between you and AI.** It strips sensitive data
on your device before any prompt reaches ChatGPT or Claude, then puts your real
values back into the answer locally. The model never sees your client's name.

## The wedge (why this, why now)

**Detection is NOT the moat — don't build your thesis on it.** In April 2026
OpenAI open-sourced "Privacy Filter," a free Apache-2.0 on-device PII model
(~96% F1). The redaction *engine* is commoditizing; infra gateways (Cloudflare
AI Gateway, Kong) are turning the firewall mechanic into a checkbox. "We redact"
is table stakes.

The durable moat is the intersection of three properties **no one currently
combines into one self-serve product**, aimed at the solo regulated practitioner
the enterprise floors and the consumer BAAs both exclude:

1. **Client-side reversible redaction** — rehydrate the answer, don't just strip
   and leave the user decoding `[NAME_1]`. (This is what the prototype already
   does; most competitors don't.)
2. **Sub-$30/mo, install-and-go, keep-your-own-LLM** — a thin safety layer over
   the ChatGPT/Claude habit, not a $1,200/seat workflow replacement and not a
   BAA endpoint that ships raw data under contract.
3. **Vertical-aware + provably local** — PHI / privilege / secret dictionaries,
   and a zero-network, open-source, reproducible build a non-technical user can
   trust.

The supporting structural fact still holds, just stated precisely: OpenAI gave
away the *model* but did **not** put pre-send redaction inside consumer ChatGPT,
and has a permanent data incentive not to. Consumer ChatGPT/Claude/Gemini now
train by default (Anthropic flipped consumer Claude to train-unless-opt-out on
Aug 28 2025, 5-year retention). There is **no consumer BAA anywhere** — not
Plus, not the $8 Go plan, not ChatGPT Team. The behavior is universal and
non-compliant: ~77% of GenAI users paste straight into chatbots, mostly from
unmanaged personal accounts. The people who feel it hardest are barred from the
easy path — the APA tells clinicians flat-out *not* to enter patient data into
ChatGPT; ABA Formal Opinion 512 (July 2024) requires informed client consent
before client info touches a self-learning GenAI tool, and says boilerplate
won't cut it.

## Naming

Recommendation: **Airlock.** A chamber where something is decontaminated before
it crosses into a space it could harm — exactly the mechanic. Short, ownable,
not a privacy cliché, sits well beside Pingless / HomeCast.

| Name | Read | Note |
|---|---|---|
| **Airlock** ✅ | the boundary nothing raw crosses | lead candidate |
| Redline | a line your data won't cross | legal connotation fits the law-firm vertical |
| Veil | what the model sees through | softer, less mechanical |
| Cleanroom | sanitized before it ships | a touch enterprise/clinical |

Avoid "Cloak" — tainted by the (killed) voice-cloak thesis and the broken
Glaze/Nightshade lineage.

## Who pays first (pick ONE vertical to wrap)

Generic prosumers are the funnel; the *paying* wedge is a regulated solo/small
practice where confidentiality is license-to-operate and a compliance budget
already exists:

1. **Solo & small-practice therapists** — strongest. No HIPAA BAA on consumer
   ChatGPT; 67% name data breaches their #1 AI fear. They *want* the tool and
   are barred from it. Airlock unlocks it.
2. **Small law firms / solo attorneys** — confidentiality is the job; ABA
   guidance creates top-down pressure; they already buy compliance tooling.
3. **Indie devs / small studios** — pasting proprietary client code into
   chatbots; this is literally our own agency's problem (we'd be user zero).

## Pricing

- **Prosumer**: $8–20/mo (anchors: ChatGPT Plus $20, password managers $3–5).
- **Team / practice**: per-seat for 4-therapist clinics and 6-person firms, with
  an audit log and BAA-adjacent posture they can show a regulator.
- The pitch isn't "save money" — it's **unlock a tool you're currently
  forbidden to use.** That reframes price entirely.

## Messaging

- Headline: **"Your deleted ChatGPT chats aren't deleted. A court just proved
  it."** → "Airlock makes sure the model never sees your client's name in the
  first place."
- Proof in 5 seconds: the live before/after panel in the prototype — the user
  watches their client's name become `[TERM_1]` *before* anything is sent, and
  watches their real values reappear in the answer. The demo *is* the argument.
- Trust line: detection runs in your browser; it's open and inspectable; nothing
  raw ever leaves the device. (Critical — there's malware *impersonating*
  privacy extensions, so "demonstrably local + open" is itself a moat.)

## Reddit / X go-to-market

Communities that will rally around the court-order hook and the local-first
thesis: **r/privacy, r/therapists, r/msp, r/ExperiencedDevs, r/LawFirmMarketing,
Hacker News.** Launch post = the NYT-retention story + a 20-second screen
recording of a real client email being redacted live, then the answer
rehydrating. Lead with the demo, not the feature list.

## Competitive landscape & how we're positioned

The category exists but is sub-scale — most consumer extensions have <300 users.
The feature that matters (map → send placeholder → **restore** the real value
into the answer) is rare; most tools only strip or block. Each incumbent holds
at most two of our three properties; none holds all three.

**Direct (consumer redact-and-restore):**
- **PrivacyScrubber** — closest polished competitor. Regex (50+ types), reversible,
  100% local, best pricing in the category (Free / $15mo / $110 lifetime / $99mo
  Teams). *Weakness: regex-only, misses names & addresses.* → We win on **real
  NER** (catches what regex can't) + a compliance wrapper.
- **Caviard.ai** — most-marketed, but thin: claims NER, ships regex; only ~264
  actual users; reversibility is a manual reveal toggle, not auto re-insertion.
  → We win on a real reversible round-trip and substance over marketing.
- **"Local Privacy Firewall"** (top Show HN, 236★) — regex + local BERT, but
  **block/warn only, not reversible.** Its HN comments are free research: latency
  kills the workflow, regex over-flags, an on/off toggle creates inconsistent-use
  risk. Heed all three.

**The price-anchor to beat:**
- **BastionGPT** — $20–65/user/mo, 10k+ orgs, proves the regulated buyer pays at
  ~$20. But it **does not redact** — it relies on a BAA endpoint and sends raw
  PHI in the clear under contract. → Our line: *"They send raw PHI under a
  contract; we make sure there's nothing to leak."* Privacy-by-design vs
  privacy-by-trust.

**Enterprise DLP (absorption risk, wrong shape for our ICP):** Nightfall,
Harmonic ($163/user/yr, **200-seat floor ≈ $32.6k**), WitnessAI ($180/user/yr,
**1,000-seat floor = $180k**), Prompt Security (acq. SentinelOne ~$180M), Strac,
Cyberhaven, Zscaler. All top-down, MDM-deployed, seat-floored 100–1,000× above a
4-person clinic. → *"No 200-seat minimum, no MDM, no demo call."*

**Vertical SaaS (replace the habit, don't protect it):** therapy scribes
(Mentalyc, Upheal, Blueprint, $19–99mo) and legal AI (Harvey $1,200+/seat,
CoCounsel, Spellbook) all sign BAAs but make you *migrate*. → *"Keep the
ChatGPT/Claude you already use — we're a thin safety layer over your habit, not
a replacement."*

**Platforms:** OpenAI's free Privacy Filter is the engine, not a finished
product for a clinician. → *"We use that engine, we don't compete with it; we
give a non-technical user a finished, reversible, cross-LLM product with a
trail — and a locality you can audit, not a server you must trust."*

## Trust is the GTM tax (and the second moat)

"AI privacy extension" is the exact disguise attackers use — FakeGPT, the Jan
2026 extensions that stole chats from ~900k users, and **Urban VPN**, installed
*for* privacy by millions, caught silently selling AI prompts to a data broker
(Dec 2025). We inherit guilt by association and must **over-prove locality**:
- zero host/network permissions in the manifest (storage-only),
- open source + reproducible builds,
- a public network-traffic-capture audit showing nothing leaves the device.

Once detection is free, **reversible round-trip quality** (consistent surrogates,
clean rehydration, low over-redaction so utility survives) and **provable trust**
are the only durable moats. Obsess over both.

## The honest caveat & re-evaluate trigger

Detection is commoditized; our edge is reversibility + vertical packaging +
provable locality. **Revisit the whole thesis if** OpenAI/Anthropic ship default
on-device pre-send redaction *inside the consumer app*, or a self-serve sub-$50
BAA tier. Neither exists as of June 2026, and the data incentive says they won't
rush it.

## Tech reality check (feasibility: green)

Reversible, context-aware redaction runs client-side today: **GLiNER.js** (ONNX,
~100–200M params, WebGPU/WASM, zero-shot custom PII labels) or transformers.js
BERT-NER, plus regex/Luhn recognizers to lift recall; reversibility via a JS port
of Presidio's InstanceCounter (consistent surrogate per entity, map in local
storage, reverse on the reply). Architecture pattern for re-inserting entities:
**Hide-and-Seek** (arXiv:2309.03057). Sub-second on WebGPU after warm-up.

*Citation hygiene for the deck:* the reversible-pseudonymization-preserves-utility
claim should cite **Yermilov et al., TrustNLP@ACL 2023 (arXiv:2306.05561)** and
the ACL 2025 robust-utility-preserving-anonymization paper — **not** the
~98.5%/86.6% Xiao et al. figure (arXiv:2604.06409), whose "consistency" is
narrative, not cryptographic. Verify before quoting.
