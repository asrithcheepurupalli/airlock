# Airlock detection test cases

A stress corpus for the on-device detection. Run each input through the extension
and check the **Expected** column. Cases marked **MISS (today)** are known gaps in
the current build (regex rules + heuristic name sniffer); they are the bar for the
upgraded model. "Rules" = `redact.js` detectors. "Sniffer" = `sniffProspects`
heuristic. "Model" = the NER model (Pro).

Today's known limits, in one line: the name sniffer only fires on a Capitalized
known-first-name followed by another Capitalized token, so it misses lowercase,
all-caps, single-token, and non-Western names; phone/number rules are tuned to
US 10-digit shapes; orgs need a legal/sector suffix.

## Names (PER)

| Input | Expected | Status |
|---|---|---|
| `John Smith` | lock NAME | sniffer OK |
| `john smith` | lock NAME | **MISS (today)** — lowercase, model needed |
| `JOHN SMITH` | lock NAME | **MISS** — all caps |
| `Priya` (alone) | lock NAME | **MISS** — single token |
| `priya raj` | lock NAME | **MISS** — lowercase multi-word |
| `Mary-Jane Watson` | lock NAME | **MISS** — hyphenated surname |
| `John Q. Public` | lock NAME | partial — middle initial |
| `O'Brien`, `D'Souza` | lock NAME | **MISS** — apostrophe |
| `van der Berg`, `de la Cruz` | lock NAME | **MISS** — lowercase particles + spaces |
| `Nguyen Van Anh` | lock NAME | **MISS** — name order / not in dictionary |
| `Müller`, `Søren`, `José` | lock NAME | **MISS** — diacritics |
| `Dr. Smith`, `dr. smith` | lock NAME | partial — title rule catches `Dr. Smith` only |
| `met with grace yesterday` | lock NAME (grace) | **MISS** — lowercase name that is also a word (hard: needs context) |
| `Will`, `Mark`, `Rose` | ambiguous | model + context should decide |
| `J.S.` / `J. S.` (initials) | lock NAME | **MISS** |
| `email john at acme` | lock NAME (john) | **MISS** — lowercase, mid-sentence |

## Organizations (ORG)

| Input | Expected | Status |
|---|---|---|
| `Acme Health Systems` | lock ORG | rule OK (suffix `Systems`) |
| `acme health systems` | lock ORG | **MISS** — lowercase |
| `Goldman Sachs` | lock ORG | **MISS** — no legal/sector suffix |
| `Procter & Gamble` | lock ORG | partial — `&` handling |
| `IBM`, `NHS`, `KPMG` | lock ORG | **MISS** — acronyms |
| `Spotify`, `Stripe` | lock ORG | **MISS** — single-word brand |
| `the Mayo Clinic` | lock ORG | rule OK (`Clinic`) |

## Places (LOCATION) — Pro/model only

| Input | Expected | Status |
|---|---|---|
| `New York`, `London` | lock LOCATION | model |
| `new york`, `london` | lock LOCATION | **MISS** — lowercase, model needed |
| `NYC`, `LA`, `UK` | lock LOCATION | **MISS** — abbreviations |
| `221B Baker Street` | lock LOCATION/address | **MISS** — street address |
| `Vizag` / `Visakhapatnam` | lock LOCATION | model (coverage check) |

## Phone numbers — "fewer digits" and odd shapes

| Input | Expected | Status |
|---|---|---|
| `555-123-4567` | lock PHONE | rule OK |
| `555-1234` (7-digit local) | lock PHONE | **MISS** — fewer digits |
| `+44 20 7946 0958` (UK) | lock PHONE | partial — intl spacing |
| `+91 98765 43210` (India) | lock PHONE | partial |
| `(555) 123 4567` | lock PHONE | rule OK |
| `555.123.4567` | lock PHONE | rule OK |
| `555 123 4567 x89` (extension) | lock incl. ext | **MISS** — extension digits |
| `12345` (short code) | maybe PHONE | ambiguous — decide policy |

## Numbers / IDs — "lesser digits" and formats

| Input | Expected | Status |
|---|---|---|
| `4111 1111 1111 1111` (Visa) | lock CARD | rule OK (Luhn) |
| `3782 822463 10005` (Amex, 15) | lock CARD | check — 15-digit grouping |
| `4111-1111 1111-1111` (mixed sep) | lock CARD | **MISS** — irregular separators |
| `123-45-6789` (SSN) | lock SSN | rule OK |
| `123456789` (SSN no dashes) | lock SSN | **MISS** — no separators |
| `123 45 6789` (SSN spaced) | lock SSN | **MISS** — spaced |
| Account no. `000123456` (short) | lock ID | **MISS** — generic short number policy |
| Routing `021000021`, IBAN `GB29 NWBK...` | lock ID | **MISS** — not covered |

## Email — case and obfuscation

| Input | Expected | Status |
|---|---|---|
| `john@acme.com` | lock EMAIL | rule OK |
| `JOHN@ACME.COM` | lock EMAIL | rule OK (case-insensitive) |
| `john+tag@acme.com` | lock EMAIL | rule OK |
| `user@münchen.de` (IDN) | lock EMAIL | **MISS** — unicode domain |
| `john [at] acme [dot] com` | lock EMAIL | **MISS** — obfuscated |

## Secrets / keys — formats and case

| Input | Expected | Status |
|---|---|---|
| `sk-...`, `AKIA...`, `ghp_...`, `AIza...`, `xoxb-...` | lock SECRET | rule OK |
| `github_pat_...`, `sk-proj-...`, `hf_...` | lock SECRET | **MISS** — newer prefixes |
| JWT `eyJhbGciOi...` | lock SECRET | **MISS** — JWT shape |
| `-----BEGIN PRIVATE KEY-----` | lock SECRET | **MISS** — PEM block |

## Sensitive terms (user list)

| Input (terms: `Acme, Project Falcon`) | Expected | Status |
|---|---|---|
| `acme`, `ACME` | lock TERM | rule OK (case-insensitive) |
| `Acme's roadmap` | lock TERM (`Acme`) | check — possessive boundary |
| `Project  Falcon` (double space) | lock TERM | **MISS** — whitespace variance |

## Done in the rules pass (2026-06-27) — covered + regression-tested in `npm test`
- **Phones**: international (`+44 20 7946 0958`, `+91 98765 43210`), US 10-digit,
  and 7-digit local **when preceded by a phone keyword** (call/tel/mobile/...). A
  bare `NNN-NNNN` is intentionally NOT locked (too easily a range like `100-2000`).
- **SSN**: dashes or spaces (`123 45 6789`), and a bare 9-digit run only after an
  SSN/social keyword. A bare 9-digit number elsewhere is left alone.
- **Secrets**: added `github_pat_`, `hf_`, JWTs (`eyJ….….…`); `gh[pousr]_` covers
  more GitHub token types; `sk-` covers `sk-proj-`.
- **Names (Free nudge)**: the sniffer is now case-insensitive, so `john smith`,
  `JOHN SMITH`, `priya raj` surface as "exposed". A stopword guard suppresses the
  noisy pairs (`mark the`, `will you`, `grace period`).
- **Pro locking**: now locks the UNION of the model and the sniffer, so lowercase
  names the cased model misses still get caught.

Still model territory (cased BERT underperforms; needs the uncased-model upgrade):
fully-lowercase orgs (`acme health systems`), lowercase places, single-token and
diacritic names. These stay as Free "exposed" nudges until the model is swapped.

## Notes for the upgrade
- The model already emits PER/ORG/LOC (see `src/ner-aggregate.js`), so most NAME /
  ORG / LOCATION misses above should resolve once Pro NER runs in-page.
- Lowercase / all-caps / diacritics are the highest-value name gaps.
- Phone/number "fewer digits" and SSN-without-separators are rule gaps, not model
  gaps — widen the regexes in `redact.js` rather than relying on NER.
- Decide an explicit policy for ambiguous shorts (`12345`, generic account
  numbers): better to surface as "exposed" than to over-lock and corrupt prompts.
