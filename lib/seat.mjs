// seat.mjs — floating-seat state: one device id per sale, stored in Upstash Redis
// over its REST API (no dependency, just fetch). Reads UPSTASH_REDIS_REST_URL /
// _TOKEN, or Vercel KV's KV_REST_API_URL / _TOKEN. If neither is set, seat
// enforcement is simply off (activation still works, just unlimited devices).
const URL_ = process.env.UPSTASH_REDIS_REST_URL || process.env.KV_REST_API_URL
const TOKEN = process.env.UPSTASH_REDIS_REST_TOKEN || process.env.KV_REST_API_TOKEN

export function seatConfigured() {
  return !!(URL_ && TOKEN)
}

async function cmd(args) {
  const r = await fetch(URL_, {
    method: 'POST',
    headers: { Authorization: `Bearer ${TOKEN}`, 'Content-Type': 'application/json' },
    body: JSON.stringify(args),
  })
  if (!r.ok) throw new Error(`kv ${r.status}`)
  return (await r.json()).result
}

const key = (saleId) => `airlock:seat:${saleId}`

export async function seatHolder(saleId) {
  return await cmd(['GET', key(saleId)])
}

// Claim the seat for deviceId if it is free or already ours. Returns true if held
// by us afterwards, false if another device holds it. (GET-then-SET is not atomic,
// but a one-seat consumer license is low-stakes enough not to need a lua script.)
export async function claimSeat(saleId, deviceId) {
  const cur = await seatHolder(saleId)
  if (cur && cur !== deviceId) return false
  await cmd(['SET', key(saleId), deviceId])
  return true
}

// Free the seat. With a deviceId, only frees it if we hold it (normal release).
// Without one, frees unconditionally (recovery by license key after a reinstall).
export async function releaseSeat(saleId, deviceId) {
  if (deviceId) {
    const cur = await seatHolder(saleId)
    if (cur && cur !== deviceId) return false
  }
  await cmd(['DEL', key(saleId)])
  return true
}
