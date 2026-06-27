// api/activate.js — turns a Gumroad license key into an Airlock Pro token.
//
// This runs on OUR server, in the browser tab, exactly once. It is the only
// network step in the whole flow, and the extension is never part of it: the
// buyer fetches their signed token here, then pastes it into the extension,
// which from then on verifies offline forever.
//
//   POST { licenseKey }  ->  { token, email }   (200)
//                            { error }           (400 / 402 / 500)
//
// Env required on Vercel:
//   LICENSE_PRIVATE_KEY  base64 pkcs8 Ed25519 private key (from .license-private-key)
//   GUMROAD_PRODUCT_ID   the product id of the Airlock Pro product on Gumroad
import { mintLicense } from '../lib/license.mjs'

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
  // Gumroad verify takes product_id (preferred for products made after Jan 2023)
  // or the older product_permalink (the slug after /l/, e.g. "airlock").
  const productId = process.env.GUMROAD_PRODUCT_ID
  const productPermalink = process.env.GUMROAD_PRODUCT_PERMALINK
  if (!privKey || (!productId && !productPermalink)) {
    return res.status(500).json({ error: 'Server is not configured for activation yet.' })
  }

  const body = typeof req.body === 'string' ? safeJson(req.body) : req.body || {}
  const licenseKey = String(body.licenseKey || '').trim()
  if (!licenseKey || licenseKey.length > 100) {
    return res.status(400).json({ error: 'Enter the license key from your Gumroad receipt.' })
  }

  // Verify with Gumroad WITHOUT incrementing the use count, so the buyer can
  // re-fetch their token on a new machine without burning a seat.
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

  const p = data.purchase
  if (p.refunded || p.disputed || p.chargebacked) {
    return res.status(402).json({ error: 'This purchase is no longer active.' })
  }
  // Cancelled/ended subscriptions (not used for the one-time product, but cheap to guard).
  if (p.subscription_cancelled_at || p.subscription_failed_at) {
    return res.status(402).json({ error: 'This subscription is no longer active.' })
  }

  // The payload must be DETERMINISTIC so the same Gumroad key always mints the
  // exact same token (Ed25519 signs deterministically). So derive the issued time
  // from the purchase itself — never Date.now(), which would change every call.
  const token = mintLicense(
    {
      e: p.email || '',
      p: 'airlock-pro',
      s: p.sale_id || p.id || licenseKey,
      i: purchaseSeconds(p),
    },
    privKey
  )

  return res.status(200).json({ token, email: p.email || '' })
}

// Stable unix seconds for the purchase, from whichever timestamp Gumroad returns.
// Falls back to 0 (still deterministic) if none is present.
function purchaseSeconds(p) {
  const t = p.sale_timestamp || p.created_at
  const ms = t ? Date.parse(t) : NaN
  return Number.isNaN(ms) ? 0 : Math.floor(ms / 1000)
}

function safeJson(s) {
  try { return JSON.parse(s) } catch (_e) { return {} }
}
