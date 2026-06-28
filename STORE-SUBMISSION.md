# Airlock, Chrome Web Store submission packet

Paste-ready fields for publishing. Listing copy (name, summary, long description)
lives in `GTM-LAUNCH.md`; this file is the operational packet.

ONE package, two tiers. Free is rules + your own sensitive terms, fully on-device,
zero network. The on-device names model (offscreen document + weights) is bundled
in the SAME package but stays DORMANT until a valid offline Pro license activates
it: free users never create the offscreen document, so they never load the
weights. It travels in the package because Airlock takes no network permission and
fetches nothing at runtime, so the model can't be downloaded later without
breaking that guarantee.

## Before you upload
- [ ] `npm run build:ext` then `npm run package:ext` produces `airlock-extension-v0.1.0.zip` (~89 MB, model bundled)
- [ ] Landing deployed so the privacy URL is live: `https://airlock.made-by-ac.com/privacy.html`
- [ ] Chrome Web Store developer account verified (trader status declared)

## Dev console fields

**Privacy policy URL:** `https://airlock.made-by-ac.com/privacy.html`

**Support URL:** `https://airlock.made-by-ac.com/support.html`

**Single purpose (one sentence):**
> Airlock locks sensitive data out of your prompt on your own device before you send it to an AI chat site, then restores your real values in the reply.

**Permission justifications** (the console asks per item):
- `storage`: "Saves the user's own sensitive-term list and their offline Pro license locally in the browser so they persist between sessions. Nothing is synced or transmitted."
- `offscreen`: "Hosts the on-device name-detection model in a background offscreen document so detection runs locally without blocking the page. Created only when a Pro user triggers detection; the model and runtime are packaged in the extension and nothing is fetched at runtime."
- Host access (content scripts on `chatgpt.com`, `chat.openai.com`, `claude.ai`, `gemini.google.com`): "The extension adds an in-page control to these AI chat sites so the user can replace sensitive values before sending. It reads and rewrites only the compose box, locally."
- Remote code: **No.** All code AND model weights are packaged in the extension. Nothing is fetched or eval'd from a remote source. The extension requests no network permission and makes no network requests of its own. The CSP allows `wasm-unsafe-eval` solely so the bundled ONNX runtime can execute the local model; no remote code is involved."

**Data usage / privacy practices** (declare honestly, this is Airlock's edge):
- Personally identifiable info, financial info, authentication info, personal communications, location, web history: **Not collected.**
- "I do not sell or transfer user data to third parties." YES
- "I do not use or transfer user data for purposes unrelated to my item's single purpose." YES
- "I do not use or transfer user data to determine creditworthiness or for lending." YES
- The extension makes no network requests of its own, verifiable in the network tab.

**Trader contact details** (required now that the account is declared a trader):
- Support email: `asrith@made-by-ac.com`
- Business/contact address: a valid mailing address (a business or mailing address is fine; it does not have to be a home address).

## Store assets (in `extension/store/`, regenerate with `_src/render.sh`)
- [ ] Icon: `extension/icons/icon128.png` (the redacted-word mark)
- [ ] Screenshots 1280x800 (upload all three in order):
      `screenshot-1-1280x800.png` (in-page lock), `screenshot-2-1280x800.png`
      (before/after), `screenshot-3-1280x800.png` (no-network trust)
- [ ] Small promo tile 440x280: `extension/store/marquee-tile.png`
- Optional later: swap shot 1 for a real screen capture of the live pill mid-redaction

## Category & details
- Category: **Productivity > Tools** (horizontal privacy utility; not dev-only, not a comms client)
- Language: English
- Listing copy: see `GTM-LAUNCH.md` then "Chrome Web Store listing"

## Notes for review
- Everything runs on the user's device and the extension takes no network
  permission: rules (emails, cards, secrets, IDs) plus the user's own
  sensitive-term list, and for Pro an on-device names model. Nothing is fetched
  or transmitted; this is verifiable in the network tab (the tab stays empty).
- The on-device model (Xenova/bert-base-NER-uncased, quantized) ships in the package
  and runs in an offscreen document via a bundled ONNX/WASM runtime. It is loaded
  only when a user with a valid offline Pro license triggers name detection; free
  users never create the offscreen document. The `wasm-unsafe-eval` CSP entry is
  only for the local runtime, not remote code.
- The toolbar popup works everywhere and depends on no site markup; the in-page
  control targets the ChatGPT, Claude and Gemini compose boxes.
- The package includes one content script declared with `"world": "MAIN"`
  (`inject-main.js`). It exists solely to replace the text in the page's own
  compose box (ProseMirror/Quill revert edits made from the isolated content
  script). It adds no permission, makes no network request, and only acts when
  the user clicks the in-page Lock control. It is bundled, not remote.
- Pro is unlocked by an offline, signed license key the user pastes in; the
  extension verifies it locally with Web Crypto and never contacts a server.
