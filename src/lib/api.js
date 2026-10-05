/*
  Calls to the server (Netlify Functions at /api/*). Every answer comes back as
  { ok: true, data } or { ok: false, error, status, ...details }, where `error` is a code the page
  turns into words (errors.<code> in en.json / kn.json). Never throws.
*/
const TIMEOUT = 20000

export async function api(name, body, { method = 'POST', raw, contentType, query = '', timeout = TIMEOUT } = {}) {
  const controller = new AbortController()
  const timer = setTimeout(() => controller.abort(), timeout)
  try {
    const res = await fetch(`/api/${name}${query}`, {
      method,
      headers: raw ? { 'content-type': contentType || 'application/octet-stream' } : method === 'GET' ? {} : { 'content-type': 'application/json' },
      body: method === 'GET' ? undefined : raw || JSON.stringify(body ?? {}),
      signal: controller.signal,
    })
    let data = null
    try {
      data = await res.json()
    } catch {
      data = null
    }
    if (res.ok) return { ok: true, data, status: res.status }
    return { ...(data || {}), ok: false, status: res.status, error: data?.error || (res.status === 404 ? 'notFound' : 'server') }
  } catch {
    return { ok: false, status: 0, error: 'network' }
  } finally {
    clearTimeout(timer)
  }
}

const KNOWN = ['network', 'server', 'tooMany', 'notReady', 'storeClosed', 'paymentsClosed', 'priceChanged', 'items', 'dispatchDate', 'details', 'rejected', 'notPending']

/** Words for an error result: errors.<code> when there is one, else the general message */
export function errorText(t, result) {
  const code = result?.error === 'totalChanged' ? 'priceChanged' : result?.error
  return t(`errors.${KNOWN.includes(code) ? code : 'server'}`)
}
