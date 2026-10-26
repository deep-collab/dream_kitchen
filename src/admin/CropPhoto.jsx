import { useEffect, useRef, useState } from 'react'
import { Btn } from './ui'

/*
  The offer banner's photo, cut on Hema's phone into the two fixed shapes the website uses:
    wide  3:1  (computers and tablets)  1500 × 500  + 750 × 250
    phone 16:9 (phones)                 1200 × 675  + 600 × 338
  She drags the photo inside each frame to choose what shows, and zooms with the slider. Both
  frames are the real previews: what is inside the frame is exactly what the website shows.
*/
export const SHAPES = {
  wide: { aspect: 3, out: [1500, 500], small: [750, 250], label: 'Computers (wide, 3:1)' },
  phone: { aspect: 16 / 9, out: [1200, 675], small: [600, 338], label: 'Phones (16:9)' },
}

/** The biggest part of the photo with this shape, made smaller by zoom, centred on (cx, cy) */
function cropRect(img, aspect, view) {
  const base = img.width / img.height > aspect ? { w: img.height * aspect, h: img.height } : { w: img.width, h: img.width / aspect }
  const w = base.w / view.zoom
  const h = base.h / view.zoom
  const cx = Math.min(img.width - w / 2, Math.max(w / 2, view.cx))
  const cy = Math.min(img.height - h / 2, Math.max(h / 2, view.cy))
  return { x: cx - w / 2, y: cy - h / 2, w, h, cx, cy }
}

function encode(canvas, max) {
  const type = canvas.toDataURL('image/webp', 0.8).startsWith('data:image/webp') ? 'image/webp' : 'image/jpeg'
  for (const q of [0.82, 0.74, 0.66, 0.58, 0.5, 0.42, 0.34]) {
    const url = canvas.toDataURL(type, q)
    if (url.length < max) return url
  }
  return null
}

function draw(bitmap, rect, [w, h]) {
  const c = document.createElement('canvas')
  c.width = w
  c.height = h
  const g = c.getContext('2d')
  g.imageSmoothingQuality = 'high'
  g.drawImage(bitmap, rect.x, rect.y, rect.w, rect.h, 0, 0, w, h)
  return c
}

/** Both shapes as files for the admin action: { wide: { image, imageSmall }, phone: { ... } } or null */
export function cropFiles(bitmap, views) {
  const out = {}
  for (const [key, shape] of Object.entries(SHAPES)) {
    const rect = cropRect(bitmap, shape.aspect, views[key])
    const big = draw(bitmap, rect, shape.out)
    const image = encode(big, 520_000)
    const imageSmall = image && encode(draw(big, { x: 0, y: 0, w: big.width, h: big.height }, shape.small), 160_000)
    if (!image || !imageSmall) return null
    out[key] = { image, imageSmall }
  }
  return out
}

/**
 * The cropping screen for one photo file. onDone({ wide, phone }) with the files ready to send,
 * onCancel(). Nothing is uploaded here.
 */
export default function CropPhoto({ file, onDone, onCancel }) {
  const [bitmap, setBitmap] = useState(null)
  const [url, setUrl] = useState('')
  const [views, setViews] = useState(null)
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)

  useEffect(() => {
    let alive = true
    const objectUrl = URL.createObjectURL(file)
    setUrl(objectUrl)
    createImageBitmap(file, { imageOrientation: 'from-image' })
      .then((b) => {
        if (!alive) return b.close?.()
        setBitmap(b)
        const start = { zoom: 1, cx: b.width / 2, cy: b.height / 2 }
        setViews({ wide: start, phone: start })
      })
      .catch(() => alive && setError('That file isn’t a photo the website can use. Try another one.'))
    return () => {
      alive = false
      URL.revokeObjectURL(objectUrl)
    }
  }, [file])

  const done = async () => {
    setBusy(true)
    await new Promise((r) => setTimeout(r, 30)) // let "Preparing…" paint before the work
    const files = cropFiles(bitmap, views)
    setBusy(false)
    if (!files) return setError('That photo could not be made small enough. Try another one.')
    onDone(files)
  }

  if (error)
    return (
      <div className="space-y-2" role="alert">
        <p className="font-bold text-error">{error}</p>
        <Btn tone="light" onClick={onCancel}>
          Choose another photo
        </Btn>
      </div>
    )
  if (!bitmap || !views) return <p className="text-brown-2">Opening the photo…</p>

  return (
    <div className="space-y-4" data-admin-crop>
      <p className="t-small text-brown-2">Drag the photo to choose what shows in each frame. Use the slider to zoom in. What you see in the frames is exactly what the website shows.</p>
      {Object.entries(SHAPES).map(([key, shape]) => (
        <Frame key={key} id={key} shape={shape} bitmap={bitmap} url={url} view={views[key]} onChange={(v) => setViews((all) => ({ ...all, [key]: v }))} />
      ))}
      <div className="flex flex-wrap gap-2">
        <Btn tone="gold" onClick={done} disabled={busy} data-admin-crop-done>
          {busy ? 'Preparing…' : 'Use this photo'}
        </Btn>
        <Btn tone="light" onClick={onCancel} disabled={busy}>
          Cancel
        </Btn>
      </div>
    </div>
  )
}

function Frame({ id, shape, bitmap, url, view, onChange }) {
  const box = useRef(null)
  const drag = useRef(null)
  const [width, setWidth] = useState(0)
  useEffect(() => {
    const el = box.current
    if (!el) return undefined
    const ro = new ResizeObserver(() => setWidth(el.clientWidth))
    ro.observe(el)
    return () => ro.disconnect()
  }, [])
  const rect = cropRect(bitmap, shape.aspect, view)
  const scale = width ? width / rect.w : 0

  const onPointerDown = (e) => {
    e.currentTarget.setPointerCapture(e.pointerId)
    drag.current = { x: e.clientX, y: e.clientY, cx: rect.cx, cy: rect.cy }
  }
  const onPointerMove = (e) => {
    if (!drag.current || !scale) return
    const d = drag.current
    onChange({ ...view, cx: d.cx - (e.clientX - d.x) / scale, cy: d.cy - (e.clientY - d.y) / scale })
  }
  const end = () => {
    drag.current = null
    onChange({ ...view, cx: rect.cx, cy: rect.cy }) // keep the photo inside the frame
  }

  return (
    <div>
      <p className="mb-1 font-bold">{shape.label}</p>
      <div
        ref={box}
        className="relative w-full cursor-grab touch-none overflow-hidden rounded-card border-2 border-gold bg-ink select-none active:cursor-grabbing"
        style={{ aspectRatio: String(shape.aspect) }}
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={end}
        onPointerCancel={end}
        data-admin-crop-frame={id}
      >
        {scale > 0 && (
          <img
            src={url}
            alt=""
            draggable={false}
            className="pointer-events-none absolute max-w-none"
            style={{ width: bitmap.width * scale, height: bitmap.height * scale, left: -rect.x * scale, top: -rect.y * scale }}
          />
        )}
      </div>
      <label className="mt-1 flex min-h-12 items-center gap-3">
        <span className="t-small font-bold">Zoom</span>
        <input type="range" min="1" max="3" step="0.05" value={view.zoom} onChange={(e) => onChange({ ...view, zoom: Number(e.target.value) })} className="h-12 flex-1 accent-ink" data-admin-crop-zoom={id} />
      </label>
    </div>
  )
}
