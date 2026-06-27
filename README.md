# airlock.

**A privacy firewall between you and the cloud LLM.** Airlock strips and
pseudonymizes sensitive data — names, emails, phone numbers, secrets, client and
patient identifiers — *on your device*, before a single prompt reaches ChatGPT
or Claude. The model answers in terms of placeholders; Airlock puts your real
values back into the reply locally. The model, and any server in between, never
sees the real thing.

This is the structural moat: OpenAI and Anthropic cannot sell you privacy *from
themselves* — their business runs on retention, and a 2025 court order forced
OpenAI to preserve chats users had deleted. "Raw PII never crosses the trust
boundary" is a position only an independent, client-side layer can hold.

## Run it (zero-config)

```bash
npm install
npm run dev
```

Open http://localhost:5173. It works with **no API key** — demo mode returns a
canned answer so you can watch redaction and rehydration end to end. Add a key
for a real Claude completion over the redacted prompt:

```bash
cp .env.example .env        # then paste ANTHROPIC_API_KEY=...
```

## How it works

```
   you type ──▶  redact()  ──▶   relay  ──▶  Claude
   (browser)    on-device         (blind)     (sees only placeholders)
       ▲            │
       └─ rehydrate()  ◀── answer in placeholders ◀──┘
          (browser, local key-map)
```

- **`src/redact.js`** — the firewall core. Finds sensitive spans (regex + your
  own sensitive-term list + on-device NER), swaps each for a stable placeholder
  (`[EMAIL_1]`, `[NAME_1]`, `[SECRET_1]`), and keeps the real values in a map
  that lives only in the browser. Same value → same placeholder, so the model
  still understands two mentions are the same entity. Precise rule matches
  (emails, secrets, terms) always win the characters over fuzzier NER spans.
- **`src/ner.worker.js` + `src/ner-aggregate.js`** — the on-device name catcher.
  A real NER model (`Xenova/bert-base-NER`) runs in a Web Worker via
  transformers.js and tags people, organizations, and locations in free text —
  the things no regex or term list can know. Weights download once (cached),
  then every scan is local; no text leaves the browser. Best-effort: if the
  model can't load, the firewall falls back to rules + terms.
- **`server.js`** — a deliberately dumb relay. Receives redacted text only,
  forwards to `claude-opus-4-8`, returns the answer. Refuses to forward anything
  that still looks like a live secret. In production this is replaceable by the
  user's own key talking straight to the model.

Two-layer detection by design: **fast, inspectable rules** for structured data
(emails, cards via Luhn, secrets) and an **on-device model** for the messy human
stuff (names, places). The shipping extension bundles the weights so even the
one-time download disappears and the manifest can declare zero network
permissions.

## Why "airlock"

An airlock is a chamber where something is decontaminated before it crosses into
a space it could harm. Your prompt passes through, sanitized; the answer is
re-pressurized with your real data on the way back. Nothing raw ever crosses the
boundary. (Working name — see POSITIONING.md.)

## Status

Prototype. Verified end to end: rule detection (secrets in both `sk-live-` and
`sk_test_` shapes, email, Luhn-checked cards, SSN, phone, IP, custom terms),
**on-device NER** (the real `bert-base-NER` model caught Dana Reyes, Lena Park,
John Carver, and Oakland on the sample with no term list), rule-over-NER
precedence on overlaps, local rehydration, and a relay guardrail that refuses
unredacted secrets.
