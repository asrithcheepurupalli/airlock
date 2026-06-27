// api/release.js — free a floating seat so the license can move to another device.
//
// Two ways to prove ownership:
//   { token }       a signed Airlock token (normal "Remove" flow from the popup)
//   { licenseKey }  the Gumroad key (recovery, e.g. after a reinstall wiped the
//                   device's token and it can't release itself)
//
// The extension never calls this; the website does. Releasing only touches seat
// state, never any user content.
import { verifyLicense, publicKeyX } from '../lib/license.mjs'
import { releaseSeat, seatConfigured } from '../lib/seat.mjs'

const ALLOWED = (process.env.ALLOWED_ORIGINS || 'http://localhost:5173,https://airlock.made-by-ac.com')
  .split(',').map((s) => s.trim()).filter(Boolean)

function setCors(req, res) {
  const origin = req.headers.origin
  if (origin && ALLOWED.includes(origin)) res.setHeader('Access-Control-Allow-Origin', origin)
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS')
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type')
}

export default async function handler(req, res) {
  setCors(req, res)
  if (req.method === 'OPTIONS') return res.status(204).end()
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' })

  const privKey = process.env.LICENSE_PRIVATE_KEY
  if (!privKey) return res.status(500).json({ error: 'Server is not configured.' })
  if (!seatConfigured()) return res.status(200).json({ ok: true, note: 'no seat store; nothing to release' })

  const body = typeof req.body === 'string' ? safeJson(req.body) : req.body || {}
  const token = String(body.token || '').trim()
  const licenseKey = String(body.licenseKey || '').trim()

  let saleId = ''
  let deviceId = '' // when set, only that device's own seat is freed

  if (token) {
    const payload = verifyLicense(token, publicKeyX(privKey))
    if (!payload) return res.status(400).json({ error: 'That token did not verify.' })
    saleId = payload.s || ''
    deviceId = payload.d || ''
  } else if (licenseKey) {
    // Recovery path: confirm the key is a real purchase, then free its seat
    // regardless of which device holds it.
    const productId = process.env.GUMROAD_PRODUCT_ID
    const productPermalink = process.env.GUMROAD_PRODUCT_PERMALINK
    let data
    try {
      const r = await fetch('https://api.gumroad.com/v2/licenses/verify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: new URLSearchParams({
          ...(productId ? { product_id: productId } : { product_permalink: productPermalink }),
          license_key: licenseKey,
          increment_uses_count: 'false',
        }),
      })
      data = await r.json()
    } catch (_e) {
      return res.status(502).json({ error: 'Could not reach Gumroad. Try again in a moment.' })
    }
    if (!data || !data.success || !data.purchase) {
      return res.status(400).json({ error: 'That license key was not recognized.' })
    }
    saleId = data.purchase.sale_id || data.purchase.id || licenseKey
  } else {
    return res.status(400).json({ error: 'Provide a token or a license key.' })
  }

  try {
    await releaseSeat(saleId, deviceId)
  } catch (_e) {
    return res.status(502).json({ error: 'Could not reach the license store. Try again in a moment.' })
  }
  return res.status(200).json({ ok: true })
}

function safeJson(s) {
  try { return JSON.parse(s) } catch (_e) { return {} }
}
