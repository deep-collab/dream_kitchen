// Measuring aid: serves dist/ over HTTP/2 with gzip, like Netlify does, because `vite preview`
// speaks HTTP/1.1 (6 connections at a time), which makes a site of many small files look slower
// than it will be in production. Self-signed certificate, made on the fly; local use only.
//   node scripts/serve-http2.mjs [port]   (default 4443) then https://localhost:4443
// scripts/lighthouse.mjs uses it with DK_LH_BASE=https://localhost:4443.
import { execFileSync } from 'node:child_process'
import { existsSync, mkdtempSync, readFileSync, statSync } from 'node:fs'
import { createSecureServer } from 'node:http2'
import { tmpdir } from 'node:os'
import { extname, join, normalize } from 'node:path'
import { gzipSync } from 'node:zlib'

const PORT = Number(process.argv[2]) || 4443
const DIST = process.env.DK_DIST || 'dist' // DK_DIST: serve another build (e.g. the Step 4 baseline)
const TYPES = { '.html': 'text/html; charset=utf-8', '.js': 'text/javascript', '.css': 'text/css', '.json': 'application/json', '.svg': 'image/svg+xml', '.png': 'image/png', '.xml': 'application/xml', '.txt': 'text/plain', '.webmanifest': 'application/manifest+json' }

// A throwaway self-signed certificate (openssl ships with Git for Windows)
const dir = mkdtempSync(join(tmpdir(), 'dk-h2-'))
execFileSync('openssl', ['req', '-x509', '-newkey', 'rsa:2048', '-nodes', '-days', '2', '-subj', '/CN=localhost', '-keyout', join(dir, 'key.pem'), '-out', join(dir, 'cert.pem')], { stdio: 'ignore' })

const cache = new Map()
const server = createSecureServer({ key: readFileSync(join(dir, 'key.pem')), cert: readFileSync(join(dir, 'cert.pem')), allowHTTP1: true }, (req, res) => {
  let path = normalize(decodeURIComponent(new URL(req.url, 'https://x').pathname)).replaceAll('\\', '/')
  let file = join(DIST, path)
  if (!existsSync(file) || statSync(file).isDirectory()) file = join(DIST, 'index.html') // like public/_redirects
  const type = TYPES[extname(file)] || 'application/octet-stream'
  if (!cache.has(file)) cache.set(file, gzipSync(readFileSync(file)))
  res.writeHead(200, { 'content-type': type, 'content-encoding': 'gzip', 'cache-control': path.startsWith('/assets/') ? 'public, max-age=31536000, immutable' : 'no-cache' })
  res.end(cache.get(file))
})
server.listen(PORT, () => console.log(`HTTP/2 on https://localhost:${PORT} (dist/)`))
