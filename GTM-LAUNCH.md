# Airlock · extension-first launch pack

Self-serve, viral-first. Build proof and a top of funnel with the Chrome
extension, then convert the warmest leads into the Practice tier. All copy below
follows the house rule: no em or en dashes.

Sequence: Chrome Web Store listing live, then Show HN the same morning, then the
value-first subreddit posts over the following week, then the X thread. Publish
the trust audit (below) alongside the Show HN, because that is the objection that
sinks every privacy extension.

---

## 1. Chrome Web Store listing

**Name:** Airlock, privacy firewall for AI

**Summary (132 char):**
Strip names, emails, secrets and client data out of your prompt on your device, before it reaches ChatGPT or Claude.

**Category:** Productivity · **Single purpose:** redact sensitive data from AI prompts locally.

**Description:**
You paste a lot into ChatGPT and Claude. Client names, emails, API keys, patient
details, things that are not supposed to leave your machine. Airlock catches them
before they do.

It sits on the page. When your draft contains something sensitive, the Airlock
pill lights up. One click swaps each value for a placeholder, so the model still
understands your request but never sees who it is about. When the answer comes
back, your real values are restored in the reply, on your device.

How it stays honest:
- Detection runs on your machine. The extension requests no network permission
  and makes no requests of its own.
- The only traffic is your browser talking to ChatGPT and Claude as it already
  does, now with the sensitive bits removed first.
- The code is open. Open your network tab and watch Airlock stay silent.

Free forever to redact in the popup. Pro brings it into the chat page with an
on-device model that catches names and places in plain writing.

Built by our studio. Airlock raises the cost of a leak to near zero. It is a
strong safety layer, not a compliance guarantee.

**Permission justification (the reviewer will ask):**
- `storage`: saves your sensitive term list and settings locally. No other
  permission is requested. No host permissions, no remote code, no analytics.

---

## 2. Show HN

**Title:** Show HN: Airlock, an on-device privacy firewall that redacts prompts before they reach the LLM

**Body:**
We kept pasting things into ChatGPT that should not have left our machines:
client names, an API key, a contract clause. The provider toggles do not help,
because the data is already sent. A 2025 court order made the point bluntly: it
forced OpenAI to preserve chats people had deleted. Deleting the chat does not
delete the chat.

So we built Airlock. It runs in the browser. Sensitive spans in your draft are
detected locally, swapped for stable placeholders before anything is sent, and
restored in the answer afterward. The model sees the structure of your request,
not the identities in it.

Two layers of detection. Fast rules for structured data (emails, cards via Luhn,
secrets in several key formats). A small NER model running in a Web Worker for
the messy human stuff: names, employers, places. Same value maps to the same
placeholder, so the model still treats two mentions as one entity.

The part we care most about is provability, because this category is full of
tools that turned out to be data brokers. The extension declares only the
storage permission, no host or network permission, and makes zero requests of
its own. Network capture is in the repo so you do not have to take our word for
it.

Honest limitations: rule detection is high precision but misses unusual formats,
and NER has a recall ceiling, so this raises the cost of a leak rather than
guaranteeing zero. The in-page selectors track current ChatGPT and Claude markup
and will need upkeep as those change. We would love feedback on the detection
quality and on the reversible round trip.

Demo and code: [link]

---

## 3. Reddit, value-first (not a launch spam)

**r/privacy** · Title: I got tired of trusting the toggle, so I made my AI prompts get redacted before they leave the browser

Body: Quick context first, because this sub has seen a lot of fake-local
"privacy" extensions. The thing that bugged me: every provider privacy setting
acts after your prompt is already on their servers. Temporary Chat still keeps a
copy. So I wrote a small tool that strips names, emails and secrets out of the
prompt on the device first, sends only placeholders, and puts the real values
back into the answer locally.

The only claim that matters here is locality, so: it requests just the storage
permission, no network permission, and makes no requests of its own. Open your
network tab and it stays silent. Code and a traffic capture are linked. I would
genuinely value people here trying to poke holes in the local claim.

[link] Happy to answer anything.

**r/ExperiencedDevs** · Title: We were pasting proprietary code into ChatGPT. Built a local redactor so we stop leaking it.

Body: Short version: pasting client code and the occasional key into an LLM is a
quiet liability, and the enterprise DLP tools start at hundreds of seats. We
wanted the one person version. Airlock redacts secrets, internal hostnames and
identifiers on-device before the prompt is sent, then rehydrates the answer. No
network permission, code is open. Curious whether the secret patterns hold up
against what you actually paste, and what we are missing.

**r/therapists** (the conversion vertical, post later, softer) · Title: A way to use ChatGPT for drafting without putting a client's name where it can be kept

Body: There is no business associate agreement on consumer ChatGPT, and the APA
is clear about not entering patient data. But the drafting help is genuinely
useful. So the practical question is how to get the help without the
identifiers leaving. The approach that works for me: redact names, contact info
and the rest on my own device before anything is sent, then have the real values
restored in the reply. Sharing the tool I use in case it helps someone here.
This raises the bar a lot, it is not a substitute for your own judgment about
what is appropriate to enter.

---

## 4. X launch thread

1/ Your deleted ChatGPT chats are not deleted. A 2025 court order forced OpenAI
to preserve chats people had erased. Every provider privacy toggle acts after
your prompt is already sent. We built the thing that acts before. Airlock.

2/ It runs in your browser. Names, emails, secrets and client data are stripped
out of your prompt on your device, swapped for placeholders, then restored in the
answer locally. The model sees the shape of your request, never who it is about.

3/ Two layers. Fast rules for emails, cards and API keys. A small model running
locally for names, employers and places in plain writing. Same value, same
placeholder, so the model still reasons correctly.

4/ The part we obsessed over: proof. No network permission, no requests of our
own, open code, a traffic capture in the repo. This category is full of tools
that quietly sold prompts. Do not trust us, watch the network tab.

5/ Free to redact anything in the popup. Pro brings it into ChatGPT and Claude.
For clinics and firms we tune it to your matters. [link]

---

## 5. Trust audit to publish with the launch

The single objection that sinks a privacy extension is "how do I know it is
actually local." Pre-empt it:
- Link the `manifest.json` showing only the `storage` permission.
- Publish a short screen recording or HAR capture of the network tab during a
  full redact and reply, showing Airlock originates nothing.
- Keep the repo public and the detection code readable top to bottom.
- State the limits plainly. Overclaiming is how trust dies in this category.

---

## 6. Why extension-first (the logic)

- Self-serve and viral. A Show HN plus three honest subreddit posts can seed the
  first thousand users without a sales motion.
- The demo is the ad. Watching a client email turn into placeholders live is the
  whole pitch.
- It builds the proof and the top of funnel. The warmest therapist and small-firm
  leads that come through then convert into the Practice tier, which is the
  higher-margin, services-led motion our studio runs anyway.
- Pricing ladder: Free (popup redactor) to Pro ($15/mo or $129 once) to Practice
  (per seat, tuned, supported). The known ceiling is BastionGPT at $20, and it
  does not even redact, so there is room.
