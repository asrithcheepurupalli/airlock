# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## What this is

Airlock is a privacy firewall for AI: it redacts sensitive data **on-device** before a prompt
reaches ChatGPT/Claude, then rehydrates the model's answer locally. It is **three deployables in
one repo**:

1. **Landing SPA** (`src/`, `index.html`) — Vite/React 19 marketing site, deploys to Vercel.
2. **MV3 browser extension** (`extension/`, built from `extension-src/`) — the actual product.
3. **Serverless API** (`api/`) — Vercel functions for Pro licensing only.

## Commands

```bash
npm run dev          # landing SPA + local relay (server.js) together
npm run build        # build the landing SPA -> dist/ (Vercel uses this)
npm run build:ext    # build the offscreen NER bundle + download model weights + ORT runtime
npm run package:ext  # zip the extension for the Chrome Web Store (run build:ext first)
npm test             # detection corpus (test/detection.mjs) — the only test suite
```

- **Single test:** `test/detection.mjs` is a plain Node script with an inline `CASES` array; there
  is no test runner/filter. Edit/comment cases in that file and re-run `npm test`.
- **Load the extension:** load `extension/` unpacked at `chrome://extensions`. **Reload it after
  any change to extension JS** — there is no HMR for the extension.
- `npm run build:ext` makes network calls (downloads ~110MB model weights from HuggingFace into
  the gitignored `extension/models/`). It wipes `extension/models/` first, so changing the model
  id never leaves a stale model behind to double the package size.

## The redaction engine exists in two copies — keep them in sync

The core detector logic is duplicated, intentionally, because the contexts differ:

- `src/redact.js` — ES module, used by the landing demo.
- `extension/redact.js` — plain IIFE attaching `window.AirlockEngine` (MV3 content scripts can't
  be modules), used by the extension. This one additionally has `sniffProspects` (a heuristic
  name/org sniffer the demo doesn't need).

**When you change detection rules (the `DETECTORS` array, `redact()` loop, capture-group handling),
change BOTH files.** `npm test` only exercises `extension/redact.js`. The shared NER post-processor
`src/ner-aggregate.js` IS imported by both the web worker and the extension offscreen doc — edit it
once.

## On-device NER (Pro only)

- Model: `Xenova/bert-base-NER-uncased` (q8), referenced in three places that must agree:
  `extension-src/offscreen.js`, `src/ner.worker.js`, `scripts/build-extension.mjs`.
- **Uncased on purpose:** the cased model detects nothing in lowercase text. Because the uncased
  model emits lowercased surface strings, `ner-aggregate.js` locates entities **case-insensitively**
  and slices the span from the original text to preserve casing. These two choices are coupled —
  don't revert one without the other.
- In the extension, the model runs in an **offscreen document** (`extension-src/offscreen.js`, built
  by `vite.ext.config.js` into `extension/offscreen/`), kept alive by the `background.js` service
  worker. The offscreen doc is created **lazily, only when a Pro user triggers detection**, so free
  users never load the weights.

## Free vs Pro, and the "no network" invariant

- **Free:** regex rules + the user's own term list, fully offline. Names/orgs are surfaced as
  "exposed" nudges (heuristic sniffer), never locked.
- **Pro:** unlocks the NER model; locks the **union** of model spans and sniffer spans.
- **The model ships bundled but dormant** in one ~89MB package; the license flips it on. It can't
  be downloaded at runtime because of the invariant below.
- **Invariant: the extension makes no network requests of its own and holds no network permission.**
  All licensing network traffic happens on the **website** (`activate.html` + `api/`), never in the
  extension. Preserve this — it's the core marketing/trust claim (see `STORE-SUBMISSION.md`).

## Pro licensing (offline, Gumroad)

Flow: buy on Gumroad → paste the Gumroad key on `public/activate.html` → `api/activate.js` verifies
it with Gumroad and mints an **Ed25519-signed token** (`lib/license.mjs`) → the token reaches the
extension → `extension/license.js` verifies it with Web Crypto **fully offline, forever**.

- Keypair: `scripts/gen-license-keys.mjs` (run once). Public key committed at
  `extension/license-pubkey.js`; private key gitignored `.license-private-key` and set as the
  `LICENSE_PRIVATE_KEY` Vercel env var.
- **Tokens must be deterministic:** the payload's issued time comes from the Gumroad purchase, never
  `Date.now()`, so the same key always mints the same token (Ed25519 signs deterministically).
- **One-click activation:** `extension/activate-bridge.js` is a content script injected only on
  `/activate`; the page hands it the token via same-origin `postMessage` (deliberately not
  `externally_connectable`, so no hardcoded extension id is needed).
- **Floating seat (one device per license):** `lib/seat.mjs` (dependency-free Upstash REST client)
  stores one device id per sale. `api/activate.js` claims the seat (409 if another device holds it)
  and binds the token to the device (`payload.d`); `extension/license.js` only grants Pro when the
  token's device matches. `api/release.js` frees a seat by token (popup Remove) or by Gumroad key
  (reinstall recovery). Seat enforcement is OFF if no Upstash env is set (activation still works).

## Other notes

- `server.js` is a **dev-only** relay (Express) for the landing demo's "send to Claude" path; it is
  NOT used in production. Production landing is static + the `api/` functions.
- Commits use the email `loksaiasrith123@gmail.com` (GitHub-verified for Vercel). `main`
  auto-deploys the landing to Vercel — push deliberately.
- No em/en dashes in any user-facing copy (project-wide style rule).
- Detection corpus + known gaps live in `DETECTION-TEST-CASES.md`; store submission fields in
  `STORE-SUBMISSION.md`; GTM copy in `GTM-LAUNCH.md`.
