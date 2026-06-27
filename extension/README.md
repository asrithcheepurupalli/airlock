# airlock — browser extension (Manifest V3)

The privacy firewall as a real extension, so the redaction sits right on the
ChatGPT / Claude page instead of in a separate web app.

## Load it

1. `chrome://extensions` → toggle **Developer mode** (top right)
2. **Load unpacked** → select this `extension/` folder
3. Pin Airlock, then open ChatGPT or Claude. The pill appears bottom-right.

## What you can do

- **In the chat page:** the bottom-right pill shows a live count of sensitive
  spans in your draft. Click **Redact** to swap them for placeholders in place,
  then send normally. When the reply comes back, your real values are restored
  in the displayed text — the model only ever saw the placeholders.
- **In the toolbar popup:** paste anything, set your sensitive terms, and copy
  the redacted version. This surface always works, independent of any site's DOM.

## The locality claim (this is the moat)

- `manifest.json` requests **only `storage`** — no `host_permissions`, no
  network permission. The extension makes **no requests of its own**; the only
  traffic is your browser talking to ChatGPT/Claude as it already does.
- `content_scripts.matches` grants page access to inject the UI — that is page
  access, not network egress.
- Detection runs in `redact.js`, which you can read top to bottom. Verify the
  claim yourself: open DevTools → Network with the extension active and confirm
  Airlock originates nothing.

## On-device NER (wired, pending a packaging pass)

The full architecture for the name catcher is in place:
- `background.js` keeps one **offscreen document** alive,
- `offscreen.html` + `extension-src/offscreen.js` host the `bert-base-NER` model,
- `content.js` asks for detections and merges them into the redaction,
- `redact.js` takes NER spans, with precise rules always winning on overlap.

To activate it:

```bash
npm run build:ext   # bundles the offscreen worker, fetches weights, copies wasm
```

then reload the unpacked extension. **Without this step the extension still
works fully on rules + your term list** (it degrades gracefully), so it is
loadable as-is today.

**Known packaging issue to finish in a real browser:** the build currently
produces a heavy (~180 MB) extension because transformers.js's web bundle embeds
the ONNX wasm (a 56 MB JS file) and the quantized weights are ~104 MB. The fix is
to externalize the ORT wasm and ship only the weights, which needs Chrome loaded
to iterate on (offscreen + wasm-path resolution can't be verified headlessly).
The NER engine itself is proven against the real model in the web app
(`../src/ner-aggregate.js`).

## Honest scope (DOM)

The in-page pill targets current ChatGPT/Claude markup and may need a nudge as
those SPAs change. The popup does not depend on page markup, so it always works.

## Store assets

`icon.svg` plus rasterized `icons/16,48,128`, and `store/` holds a 1280x800
listing screenshot and a 440x280 tile. The listing copy lives in
`../GTM-LAUNCH.md`. Real in-product screenshots should replace the mockup once
the extension is loaded in Chrome.
