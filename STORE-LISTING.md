# Airlock, Chrome Web Store listing (paste-ready)

Every field below matches the SHIPPED wired build (storage + offscreen + host
access to ChatGPT, Claude and Gemini + bundled model). House rule: no em or en dashes.

---

## Item name
Airlock, privacy firewall for AI

## Summary (132 char max)
Strip names, emails, secrets and client data out of your prompt on your device, before it reaches ChatGPT, Claude or Gemini.

## Category
Productivity > Tools

## Language
English (United States)

## Description
You paste a lot into ChatGPT, Claude and Gemini. Client names, emails, API keys,
patient details, contract terms, things that are not supposed to leave your
machine. Airlock catches them before they do.

It sits on the page. When your draft contains something sensitive, the Airlock
pill lights up. One click swaps each value for a placeholder, so the model still
understands your request but never sees who it is about. When the answer comes
back, your real values are restored in the reply, on your device.

How it stays honest:
- Detection runs on your machine. The extension makes no network requests of its
  own and asks for no network permission. Its only access is to the ChatGPT,
  Claude and Gemini pages, so it can rewrite your draft before you send it.
- The only traffic is your browser talking to those sites as it already does, now
  with the sensitive parts removed first.
- Open your network tab and watch Airlock stay silent.

Two layers of detection:
- Fast on-device rules for structured data: emails, phone numbers, card numbers
  (Luhn checked), government IDs, and API keys in many formats.
- Pro adds a names model that runs entirely on your device and catches the messy
  human stuff in plain writing: names, organizations and places.

Free forever to redact in the popup and in the page. Pro brings the on-device
model that auto catches names, organizations and places, and activates with an
offline license key your browser verifies locally.

Built by our studio. Airlock raises the cost of a leak to near zero. It is a
strong safety layer, not a compliance guarantee.

## Single purpose (one sentence)
Airlock redacts sensitive data from your prompt on your own device before you
send it to an AI chat site, then restores your real values in the reply.

## Permission justifications (the reviewer asks one per item)
- storage: Saves your own sensitive-term list and your offline Pro license
  locally in the browser so they persist between sessions. Nothing is synced or
  transmitted.
- offscreen: Hosts the on-device name-detection model in a background offscreen
  document so detection runs locally without blocking the page. It is created
  only when a Pro user triggers detection. The model and its runtime are packaged
  in the extension and nothing is fetched at runtime.
- Host access to chatgpt.com, chat.openai.com, claude.ai and gemini.google.com:
  The extension adds an in-page control to these AI chat sites so you can replace
  sensitive values before sending. It reads and rewrites only the compose box,
  locally.
- Remote code: No. All code and model weights are packaged in the extension.
  Nothing is fetched or eval'd from a remote source. The wasm-unsafe-eval entry
  in the CSP exists only so the bundled ONNX runtime can execute the local model;
  no remote code is involved.

## Data safety / privacy practices (declare honestly, this is Airlock's edge)
- Personally identifiable info, financial info, authentication info, personal
  communications, location, web history, health info: Not collected.
- I do not sell or transfer user data to third parties: YES
- I do not use or transfer user data for purposes unrelated to the single
  purpose: YES
- I do not use or transfer user data to determine creditworthiness or for
  lending: YES
- The extension makes no network requests of its own, verifiable in the network
  tab.

## Privacy policy URL
https://airlock.made-by-ac.com/privacy.html

## Support URL
https://airlock.made-by-ac.com/support.html

## Assets (rendered on-brand; regenerate with extension/store/_src/render.sh)
- Icon 128: extension/icons/icon128.png
- Screenshots 1280x800 (upload all three, in order):
  1. extension/store/screenshot-1-1280x800.png (in-page lock, the pill mid-redaction)
  2. extension/store/screenshot-2-1280x800.png (before/after: what you type vs what the model sees)
  3. extension/store/screenshot-3-1280x800.png (no-network trust: 0 requests, runs on device)
- Small promo tile 440x280: extension/store/marquee-tile.png

## Trader contact (required now that the account is a declared trader)
- Support email: hello@made-by-ac.com
- A valid business/mailing address (does not have to be a home address)

## Supported (state in your own expectations, not a store field)
Desktop Chrome and Chromium browsers (Chrome, Edge, Brave, Arc, Opera, Vivaldi,
ChromeOS). In-page support is ChatGPT, Claude and Gemini. The popup redactor works
for any text you paste, on any site. NOT mobile, NOT Firefox/Safari, NOT the
desktop apps (those are not browser pages an extension can reach).
