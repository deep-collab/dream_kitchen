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

// The database is older than the code: a migration hasn't been run on it (SQLite / D1 and Postgres words)
const OLD_DATABASE = /no such (table|column)|has no column named|column .* does not exist|relation .* does not exist/i

/** True when an error means the database still needs a migration (D1 puts the SQLite words in `cause`) */
export const needsMigration = (error) => OLD_DATABASE.test(`${error?.message || ''} ${error?.cause?.message || ''}`)

/**
 * Wraps a function body: method check, JSON errors, and no stack traces to the browser.
 *   export default handle(async (req, context) => json(200, {...}), { methods: ['POST'] })
 * An unexpected error is logged in full (path, admin action, stack) with a short ref that the
 * answer carries too, so the admin can show it and the log line can be found
 * (`npx wrangler tail`). An out-of-date database answers 'dbUpdate', not 'server'.
 */
export function handle(fn, { methods = ['POST'] } = {}) {
  return async (req, context) => {
    if (!methods.includes(req.method)) return json(405, { error: 'method' }, { allow: methods.join(', ') })
    try {
      return await fn(req, context)
    } catch (error) {
      if (error instanceof HttpError) return json(error.status, { error: error.code, ...error.extra })
      const ref = Math.random().toString(36).slice(2, 8).toUpperCase()
      const where = `${req.method} ${new URL(req.url).pathname}${error?.action ? ` action=${error.action}` : ''}`
      const old = needsMigration(error)
      console.error(`[dk] ${old ? 'database needs a migration' : 'unexpected error'} ref=${ref} ${where}:`, error?.stack || error, error?.cause ? `cause: ${error.cause?.stack || error.cause}` : '')
      return old ? json(503, { error: 'dbUpdate', ref }) : json(500, { error: 'server', ref })
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
