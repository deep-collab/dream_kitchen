// Upload checks (no Node-only code: the demo admin runs these in the browser): the real image type from the first bytes (never the file name or the
// Content-Type the browser claims), and the size limit.
export const MAX_BYTES = 5 * 1024 * 1024
export const MIME = { jpg: 'image/jpeg', png: 'image/png', webp: 'image/webp' }

/** 'jpg' | 'png' | 'webp' | null */
export function imageType(b) {
  if (b.length > 3 && b[0] === 0xff && b[1] === 0xd8 && b[2] === 0xff) return 'jpg'
  if (b.length > 8 && b[0] === 0x89 && b[1] === 0x50 && b[2] === 0x4e && b[3] === 0x47 && b[4] === 0x0d && b[5] === 0x0a && b[6] === 0x1a && b[7] === 0x0a) return 'png'
  if (b.length > 12 && String.fromCharCode(...b.slice(0, 4)) === 'RIFF' && String.fromCharCode(...b.slice(8, 12)) === 'WEBP') return 'webp'
  return null
}

/** A data:image/...;base64 URL -> { type, bytes } (the admin's QR upload), or null */
export function fromDataUrl(value, max = 300_000) {
  const m = /^data:image\/(png|jpeg|webp);base64,([A-Za-z0-9+/=]+)$/.exec(String(value || ''))
  if (!m) return null
  const bytes = typeof Buffer !== 'undefined' ? Uint8Array.from(Buffer.from(m[2], 'base64')) : Uint8Array.from(atob(m[2]), (c) => c.charCodeAt(0))
  if (!bytes.length || bytes.length > max) return null
  const type = imageType(bytes)
  return type ? { type, bytes } : null
}
