// Request and response helpers shared by every function (Netlify Functions v2: web Request in,
// web Response out). Errors are thrown as HttpError and turned into small JSON answers; the
// website shows its own words for each `error` code, so no server text reaches customers.

export class HttpError extends Error {
  constructor(status, code, extra = {}) {
    super(code)
    this.status = status
    this.code = code
    this.extra = extra
  }
}

const BASE_HEADERS = {
  'content-type': 'application/json; charset=utf-8',
  'cache-control': 'no-store',
  'x-content-type-options': 'nosniff',
}

export const json = (status, body, headers = {}) => new Response(JSON.stringify(body), { status, headers: { ...BASE_HEADERS, ...headers } })

/** Reads a JSON object body, refusing anything larger than `max` bytes */
export async function readJson(req, max = 32_000) {
  const declared = Number(req.headers.get('content-length') || 0)
  if (declared > max) throw new HttpError(413, 'tooLarge')
  const text = await req.text()
  if (text.length > max) throw new HttpError(413, 'tooLarge')
  try {
    const data = JSON.parse(text || '{}')
    if (!data || typeof data !== 'object' || Array.isArray(data)) throw new Error('not an object')
    return data
  } catch {
    throw new HttpError(400, 'badRequest')
  }
}

/** The caller's IP (Netlify puts it on the context; the header is the fallback) */
export function clientIp(req, context) {
  return (
    context?.ip ||
    req.headers.get('x-nf-client-connection-ip') ||
    (req.headers.get('x-forwarded-for') || '').split(',')[0].trim() ||
    'unknown'
  )
}

/**
 * Wraps a function body: method check, JSON errors, and no stack traces to the browser.
 *   export default handle(async (req, context) => json(200, {...}), { methods: ['POST'] })
 */
export function handle(fn, { methods = ['POST'] } = {}) {
  return async (req, context) => {
    if (!methods.includes(req.method)) return json(405, { error: 'method' }, { allow: methods.join(', ') })
    try {
      return await fn(req, context)
    } catch (error) {
      if (error instanceof HttpError) return json(error.status, { error: error.code, ...error.extra })
      console.error('[dk] unexpected error', error)
      return json(500, { error: 'server' })
    }
  }
}

/** Same-site check for state-changing requests: a browser always sends Origin on POST */
export function checkOrigin(req) {
  const origin = req.headers.get('origin')
  if (!origin) return
  const host = req.headers.get('x-forwarded-host') || req.headers.get('host')
  try {
    if (new URL(origin).host !== host) throw new HttpError(403, 'origin')
  } catch (e) {
    if (e instanceof HttpError) throw e
    throw new HttpError(403, 'origin')
  }
}
