# Airlock , Chrome Web Store submission checklist

Everything needed to publish the Free tier. Listing copy (name, summary,
description) lives in `GTM-LAUNCH.md`; this file is the operational checklist.

## Before you upload
- [ ] `npm run build:ext` (offscreen build + model weights + ORT runtime)
- [ ] `npm run package:ext` → produces `airlock-extension-v0.1.0.zip` (~88 MB)
- [ ] Landing deployed so the privacy URL is live: `https://airlock.made-by-ac.com/privacy.html`
- [ ] A Chrome Web Store developer account ($5 one-time)

## Dev console fields

**Privacy policy URL:** `https://airlock.made-by-ac.com/privacy.html`

**Single purpose (one sentence):**
> Airlock redacts sensitive data from your prompt on your own device before you send it to an AI chat site, then restores your real values in the reply.

**Permission justifications** (the console asks per permission):
- `storage` , "Saves the user's settings and their own sensitive-term list locally in the browser. Nothing is synced or transmitted."
- `offscreen` , "Hosts the on-device name-detection model in a background page so detection runs locally without blocking the page."
- Host access (content scripts on `chatgpt.com`, `chat.openai.com`, `claude.ai`) , "The extension adds an in-page redaction control to these AI chat sites so the user can replace sensitive values before sending. It reads and rewrites only the compose box, locally."
- Remote code: **No.** All code and model weights are packaged in the extension; nothing is fetched or eval'd from a remote source.

**Data usage / privacy practices** (declare honestly , this is Airlock's edge):
- Personally identifiable info, authentication info, personal communications, etc.: **Not collected.**
- "I do not sell or transfer user data to third parties." ✓
- "I do not use or transfer user data for purposes unrelated to my item's single purpose." ✓
- "I do not use or transfer user data to determine creditworthiness or for lending." ✓
- The extension makes no network requests of its own (verifiable in the network tab).

## Store assets (in `extension/store/`)
- [ ] Icon: `extension/icons/icon128.png` (the redacted-word mark)
- [ ] Screenshot 1280x800: `extension/store/screenshot-1280x800.png`
- [ ] Small promo tile 440x280: `extension/store/marquee-tile.png`
- [ ] Replace the screenshot with a real in-product capture once loaded (recommended)

## Category & details
- Category: **Productivity**
- Language: English
- Listing copy: see `GTM-LAUNCH.md` → "Chrome Web Store listing"

## Notes for review
- First-load downloads nothing; the ~100 MB is the bundled on-device model
  (`bert-base-NER`, q8) plus the ONNX runtime, both packaged so the extension
  works fully offline and network-free. This is the core privacy claim.
- The in-page control currently targets ChatGPT and Claude compose boxes; the
  toolbar popup redactor works everywhere and depends on no site markup.
