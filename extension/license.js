// license.js the extension's offline Pro check. A plain script (not a module, so
// content scripts and the popup can both load it) that exposes window.AirlockLicense.
//
// It verifies an Ed25519-signed token entirely with Web Crypto against the bundled
// public key (license-pubkey.js). It NEVER talks to the network, not even to
// activate. The buyer pastes a token they fetched on our website; from then on the
// extension proves it locally, forever. That offline proof is the whole point.
;(function () {
  const STORE_KEY = 'airlock_license' // chrome.storage.local: { token }
  const pubX = (typeof window !== 'undefined' && window.AIRLOCK_LICENSE_PUBKEY) || ''

  const fromB64url = (s) => {
    const pad = s.length % 4 ? '='.repeat(4 - (s.length % 4)) : ''
    const bin = atob(s.replace(/-/g, '+').replace(/_/g, '/') + pad)
    const out = new Uint8Array(bin.length)
    for (let i = 0; i < bin.length; i++) out[i] = bin.charCodeAt(i)
    return out
  }

  let keyPromise = null
  function publicKey() {
    if (!pubX) return Promise.reject(new Error('no public key bundled'))
    if (!keyPromise) {
      keyPromise = crypto.subtle.importKey(
        'jwk',
        { kty: 'OKP', crv: 'Ed25519', x: pubX },
        { name: 'Ed25519' },
        false,
        ['verify']
      )
    }
    return keyPromise
  }

  // Returns the payload object if the token is authentic and is an airlock-pro
  // license, otherwise null. Pure crypto, no I/O.
  async function verify(token) {
    try {
      const [msg, sigB64] = String(token || '').trim().split('.')
      if (!msg || !sigB64) return null
      const key = await publicKey()
      const ok = await crypto.subtle.verify(
        'Ed25519',
        key,
        fromB64url(sigB64),
        new TextEncoder().encode(msg)
      )
      if (!ok) return null
      const payload = JSON.parse(new TextDecoder().decode(fromB64url(msg)))
      return payload && payload.p === 'airlock-pro' ? payload : null
    } catch (_e) {
      return null
    }
  }

  function getStored() {
    return new Promise((resolve) => {
      try {
        chrome.storage?.local?.get([STORE_KEY], (r) => resolve(r?.[STORE_KEY]?.token || ''))
      } catch (_e) {
        resolve('')
      }
    })
  }

  // A stable per-install id, created once and kept in local storage. Floating-seat
  // tokens are bound to it: a token only grants Pro on the device that activated.
  const DEVICE_KEY = 'airlock_device_id'
  function deviceId() {
    return new Promise((resolve) => {
      try {
        chrome.storage.local.get([DEVICE_KEY], (r) => {
          const existing = r && r[DEVICE_KEY]
          if (existing) return resolve(existing)
          const id = crypto.randomUUID ? crypto.randomUUID() : 'd-' + Date.now() + '-' + (performance.now() | 0)
          chrome.storage.local.set({ [DEVICE_KEY]: id }, () => resolve(id))
        })
      } catch (_e) {
        resolve('')
      }
    })
  }

  // The live Pro state: { pro, email }. Re-verifies the stored token every call so
  // a tampered storage value can never grant Pro.
  async function state() {
    const token = await getStored()
    if (!token) return { pro: false, email: '' }
    const payload = await verify(token)
    if (!payload) return { pro: false, email: '' }
    // Device-bound tokens only grant Pro on the device that activated them.
    if (payload.d) {
      const myId = await deviceId()
      if (payload.d !== myId) return { pro: false, email: '', wrongDevice: true }
    }
    return { pro: true, email: payload.e || '' }
  }

  // Verify a pasted token and, if valid, persist it. Returns the payload or null.
  async function activate(token) {
    const payload = await verify(token)
    if (!payload) return null
    await new Promise((resolve) => {
      try {
        chrome.storage?.local?.set({ [STORE_KEY]: { token: String(token).trim() } }, resolve)
      } catch (_e) {
        resolve()
      }
    })
    return payload
  }

  function deactivate() {
    return new Promise((resolve) => {
      try {
        chrome.storage?.local?.remove([STORE_KEY], resolve)
      } catch (_e) {
        resolve()
      }
    })
  }

  window.AirlockLicense = { verify, state, activate, deactivate, deviceId, getToken: getStored }
})()
