/*
  Photos customers add (drawing reference, payment screenshot): shrunk in the browser to at most
  1600px on the long side before upload (a 4–8 MB phone photo becomes a few hundred KB), then sent
  to /api/upload, which checks it and stores it privately. Also makes a tiny preview for the cart.
*/
import { api } from './api.js'

export const MAX_SIDE = 1600
export const MAX_BYTES = 5 * 1024 * 1024

async function decode(file) {
  if ('createImageBitmap' in window) return createImageBitmap(file, { imageOrientation: 'from-image' })
  const url = URL.createObjectURL(file)
  try {
    const img = new Image()
    img.src = url
    await img.decode()
    return img
  } finally {
    URL.revokeObjectURL(url)
  }
}

function draw(source, maxSide) {
  const scale = Math.min(1, maxSide / Math.max(source.width, source.height))
  const canvas = document.createElement('canvas')
  canvas.width = Math.max(1, Math.round(source.width * scale))
  canvas.height = Math.max(1, Math.round(source.height * scale))
  canvas.getContext('2d').drawImage(source, 0, 0, canvas.width, canvas.height)
  return canvas
}

const toBlob = (canvas, type, quality) => new Promise((resolve) => canvas.toBlob(resolve, type, quality))

/**
 * Shrinks a picked file. -> { blob, type, thumb } or { error: 'notImage' | 'tooLarge' }
 * WebP where the browser can make it (smaller), else JPEG.
 */
export async function prepareImage(file) {
  if (!file || (file.type && !file.type.startsWith('image/'))) return { error: 'notImage' }
  let source
  try {
    source = await decode(file)
  } catch {
    return { error: 'notImage' }
  }
  const canvas = draw(source, MAX_SIDE)
  let blob = await toBlob(canvas, 'image/webp', 0.85)
  if (!blob || blob.type !== 'image/webp') blob = await toBlob(canvas, 'image/jpeg', 0.85)
  if (!blob) return { error: 'notImage' }
  if (blob.size > MAX_BYTES) return { error: 'tooLarge' }
  const thumb = draw(source, 120).toDataURL('image/jpeg', 0.7)
  source.close?.()
  return { blob, type: blob.type, thumb }
}

/** Uploads a prepared image. kind: 'drawing' | 'payment' (with { code, phone }). -> api() result, data.path */
export function uploadImage(kind, prepared, { code, phone } = {}) {
  const q = new URLSearchParams(code ? { kind, code, phone } : { kind })
  return api('upload', null, { raw: prepared.blob, contentType: prepared.type, query: `?${q}`, timeout: 60000 })
}
