/*
  Vite plugin: /api/* in local development (`npm run dev`) and `vite preview`, served by the very
  same files Netlify runs (netlify/functions/<name>.mjs), so the whole order flow works on this
  machine with no accounts.
    - Without SUPABASE_URL in .env: the mock store (DK_MOCK_BACKEND=1), kept in .dev-data/, and
      emails go to .dev-data/outbox/ instead of being sent.
    - With Supabase keys in .env: the real project (careful: real orders).
  Admin login on the mock store: set DK_DEV_ADMIN_EMAIL and DK_DEV_ADMIN_PASSWORD in .env.
  Netlify itself routes /api/* by each function's `config.path`; this plugin is never deployed.
*/
import { resolve } from 'node:path'
import { pathToFileURL } from 'node:url'
import { loadEnv } from 'vite'

function middleware(load) {
  return async (req, res, next) => {
    if (!req.url?.startsWith('/api/')) return next()
    const name = req.url.slice(5).split(/[?/]/)[0]
    if (!/^[a-z][a-z0-9-]*$/.test(name)) return next()
    let mod
    try {
      mod = await load(name)
    } catch {
      res.statusCode = 404
      return res.end('{"error":"notFound"}')
    }
    try {
      const chunks = []
      for await (const c of req) chunks.push(c)
      const headers = new Headers()
      for (const [k, v] of Object.entries(req.headers)) if (typeof v === 'string') headers.set(k, v)
      const hasBody = !['GET', 'HEAD'].includes(req.method)
      const request = new Request(`http://${req.headers.host}${req.url}`, { method: req.method, headers, body: hasBody ? Buffer.concat(chunks) : undefined })
      const response = await mod.default(request, { ip: req.socket.remoteAddress || '127.0.0.1' })
      res.statusCode = response.status
      response.headers.forEach((v, k) => res.setHeader(k, v))
      res.end(Buffer.from(await response.arrayBuffer()))
    } catch (error) {
      console.error('[dk dev-api]', error)
      res.statusCode = 500
      res.end('{"error":"server"}')
    }
  }
}

export default function devApi() {
  return {
    name: 'dk-dev-api',
    config(_, { mode }) {
      // Server-side variables from .env (Vite only exposes VITE_* to the browser, never these)
      const env = loadEnv(mode, process.cwd(), '')
      for (const [k, v] of Object.entries(env)) if (!k.startsWith('VITE_') && !(k in process.env)) process.env[k] = v
      if (!process.env.SUPABASE_URL) process.env.DK_MOCK_BACKEND ??= '1'
      process.env.DK_DEV_DATA_DIR ??= '.dev-data'
    },
    configureServer(server) {
      server.middlewares.use(middleware((name) => server.ssrLoadModule(`/netlify/functions/${name}.mjs`)))
    },
    configurePreviewServer(server) {
      server.middlewares.use(middleware((name) => import(pathToFileURL(resolve(`netlify/functions/${name}.mjs`)).href)))
    },
  }
}
