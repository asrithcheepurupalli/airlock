# Airlock, Chrome Web Store submission packet

Paste-ready fields for publishing the Free tier. Listing copy (name, summary,
long description) lives in `GTM-LAUNCH.md`; this file is the operational packet.

This is the LEAN FREE build: rules + your own sensitive terms, fully on-device,
zero network. Names/orgs detection and the model are the paid Pro upgrade, sold
separately through Gumroad, and never ship in this package.

## Before you upload
- [ ] `npm run package:ext` produces `airlock-extension-v0.1.0.zip` (~552 KB)
- [ ] Landing deployed so the privacy URL is live: `https://airlock.made-by-ac.com/privacy.html`
- [ ] Chrome Web Store developer account verified (trader status declared)

## Dev console fields

**Privacy policy URL:** `https://airlock.made-by-ac.com/privacy.html`

**Single purpose (one sentence):**
> Airlock locks sensitive data out of your prompt on your own device before you send it to an AI chat site, then restores your real values in the reply.

**Permission justifications** (the console asks per item):
- `storage`: "Saves the user's own sensitive-term list locally in the browser so it persists between sessions. Nothing is synced or transmitted."
- Host access (content scripts on `chatgpt.com`, `chat.openai.com`, `claude.ai`): "The extension adds an in-page control to these AI chat sites so the user can replace sensitive values before sending. It reads and rewrites only the compose box, locally."
- Remote code: **No.** All code is packaged in the extension. Nothing is fetched or eval'd from a remote source. The extension requests no network permission and makes no network requests of its own.

**Data usage / privacy practices** (declare honestly, this is Airlock's edge):
- Personally identifiable info, financial info, authentication info, personal communications, location, web history: **Not collected.**
- "I do not sell or transfer user data to third parties." YES
- "I do not use or transfer user data for purposes unrelated to my item's single purpose." YES
- "I do not use or transfer user data to determine creditworthiness or for lending." YES
- The extension makes no network requests of its own, verifiable in the network tab.

**Trader contact details** (required now that the account is declared a trader):
- Support email: `hello@made-by-ac.com`
- Business/contact address: a valid mailing address (a business or mailing address is fine; it does not have to be a home address).

## Store assets (in `extension/store/`)
- [ ] Icon: `extension/icons/icon128.png` (the redacted-word mark)
- [ ] Screenshot 1280x800: `extension/store/screenshot-1280x800.png`
- [ ] Small promo tile 440x280: `extension/store/marquee-tile.png`
- [ ] Recommended: replace the mockup screenshot with a real in-product capture (popup + in-page pill)

## Category & details
- Category: **Productivity**
- Language: English
- Listing copy: see `GTM-LAUNCH.md` then "Chrome Web Store listing"

## Notes for review
- The free build is intentionally tiny and fully offline: rules (emails, cards,
  secrets, IDs) plus the user's own sensitive-term list. It requests only
  `storage` and content-script access to the three AI chat sites. No background
  worker, no network permission, no remote code.
- The toolbar popup works everywhere and depends on no site markup; the in-page
  control targets the ChatGPT and Claude compose boxes.
- Automatic name/organization detection (the on-device model) is a separate paid
  upgrade and is not part of this submission.
