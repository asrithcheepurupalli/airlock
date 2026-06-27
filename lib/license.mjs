// Airlock Pro license format: a compact, offline-verifiable signed token.
//
//   license = base64url(JSON payload) + "." + base64url(ed25519 signature)
//
// The server (Gumroad webhook) mints it with the PRIVATE key. The extension
// verifies it with the bundled PUBLIC key, entirely offline. No phone-home,
// ever, even at activation. This is the moat.
import crypto from 'node:crypto'

const b64url = (buf) =>
  Buffer.from(buf).toString('base64').replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '')
const fromB64url = (s) => Buffer.from(s.replace(/-/g, '+').replace(/_/g, '/'), 'base64')

// payload: { e: email, p: 'airlock-pro', s: saleId, i: issuedUnixSeconds }
export function mintLicense(payload, privKeyB64) {
  const key = crypto.createPrivateKey({ key: Buffer.from(privKeyB64, 'base64'), format: 'der', type: 'pkcs8' })
  const msg = b64url(JSON.stringify(payload))
  const sig = crypto.sign(null, Buffer.from(msg), key)
  return msg + '.' + b64url(sig)
}

// Node-side verify (used by tests). The browser does the same with Web Crypto.
export function verifyLicense(license, pubJwkX) {
  const [msg, sigB64] = String(license).split('.')
  if (!msg || !sigB64) return null
  const pub = crypto.createPublicKey({ key: { kty: 'OKP', crv: 'Ed25519', x: pubJwkX }, format: 'jwk' })
  const ok = crypto.verify(null, Buffer.from(msg), pub, fromB64url(sigB64))
  if (!ok) return null
  try {
    const payload = JSON.parse(fromB64url(msg).toString())
    return payload.p === 'airlock-pro' ? payload : null
  } catch (_e) {
    return null
  }
}
