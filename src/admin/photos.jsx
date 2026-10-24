import { useId } from 'react'
import { adminCall } from './api'
import { Btn, btnClass, SaveMessage, useSave } from './ui'
import { AlertIcon, ImageIcon } from '../components/icons'

/**
 * A photo from Hema's phone (camera or gallery), made ready for the website on the phone itself,
 * the same two sizes as the built-in photos: cut to a square from the middle, 1200 × 1200 and
 * 600 × 600, WebP (JPEG on phones that can't make WebP), each shrunk until it is small enough
 * (at most about 650 KB and 150 KB; a real photo is about 100 KB and 40 KB).
 * -> { image, imageSmall } (data URLs), or null when the file isn't a picture.
 */
export async function productPhotoFiles(file) {
  let bitmap
  try {
    bitmap = await createImageBitmap(file, { imageOrientation: 'from-image' })
  } catch {
    return null
  }
  const side = Math.min(bitmap.width, bitmap.height)
  const square = (from, sx, sy, sSide, out) => {
    const canvas = document.createElement('canvas')
    canvas.width = out
    canvas.height = out
    const g = canvas.getContext('2d')
    g.imageSmoothingQuality = 'high'
    g.drawImage(from, sx, sy, sSide, sSide, 0, 0, out, out)
    return canvas
  }
  const big = square(bitmap, (bitmap.width - side) / 2, (bitmap.height - side) / 2, side, 1200)
  bitmap.close?.()
  const small = square(big, 0, 0, 1200, 600) // from the 1200px one: smoother than straight from a 4000px photo
  const type = big.toDataURL('image/webp', 0.8).startsWith('data:image/webp') ? 'image/webp' : 'image/jpeg'
  const encode = (canvas, max) => {
    for (const q of [0.82, 0.72, 0.62, 0.52, 0.42, 0.32, 0.22]) {
      const url = canvas.toDataURL(type, q)
      if (url.length < max) return url
    }
    return null
  }
  const image = encode(big, 900_000)
  const imageSmall = image && encode(small, 200_000)
  return image && imageSmall ? { image, imageSmall } : null
}

/**
 * The big "Change photo" button (the phone opens its gallery or camera) and, when there is one of
 * Hema's own photos, a button to take it away again. While it uploads the website keeps the
 * current photo; a failed upload says so in plain words and changes nothing.
 *   action: the admin action ('productPhoto', 'pagePhoto', 'offerPhoto'), id: what the photo is for
 *   onSaved(data): the action's answer
 */
export function PhotoButtons({ action, id, hasOwn, removeText = 'Remove photo', onSaved, testId }) {
  const save = useSave()
  const fileId = useId()
  const uploading = save.status === 'saving'
  const send = (body) =>
    save.run(async () => {
      const r = await adminCall(action, { id, ...body })
      if (r.ok) onSaved(r.data)
      return r
    }, body.image === null ? 'Photo removed.' : 'Photo saved. It is on the website now.')

  const onPhoto = async (e) => {
    const file = e.target.files?.[0]
    e.target.value = ''
    if (!file) return
    save.run(async () => {
      const files = await productPhotoFiles(file)
      if (!files) return { ok: false, error: 'fields', fields: { photo: 'image' } }
      const r = await adminCall(action, { id, ...files })
      if (r.ok) onSaved(r.data)
      return r
    }, 'Photo saved. It is on the website now.')
  }

  return (
    <div className="space-y-2">
      <label htmlFor={fileId} className={`${btnClass('dark')} min-h-14 w-full cursor-pointer text-lg ${uploading ? 'pointer-events-none opacity-60' : ''}`} aria-busy={uploading}>
        <ImageIcon className="h-6 w-6" /> {uploading ? 'Uploading photo…' : 'Change photo'}
      </label>
      <input id={fileId} type="file" accept="image/*" className="sr-only" onChange={onPhoto} disabled={uploading} data-admin-photo={testId ?? id} />
      {hasOwn && (
        <Btn tone="light" className="w-full" onClick={() => send({ image: null })} disabled={uploading}>
          {removeText}
        </Btn>
      )}
      {save.status === 'error' ? (
        <p role="alert" className="flex items-start gap-2 font-bold text-error" data-admin-photo-error>
          <AlertIcon className="mt-0.5 h-5 w-5 shrink-0" />
          {save.fields?.photo
            ? 'That file isn’t a photo the website can use. Try another one.'
            : `${save.message.startsWith('No internet') ? 'No internet connection. ' : ''}The photo was not uploaded, so the website still shows the current photo. Please try again.`}
        </p>
      ) : (
        <SaveMessage save={save} />
      )}
    </div>
  )
}

/** "45 / 200": how much of the room is used, red when it is full */
export function Counter({ value, max }) {
  const n = String(value || '').length
  return (
    <span className={`t-small mt-1 block text-right ${n >= max ? 'font-bold text-error' : 'text-brown-2'}`} data-admin-counter>
      {n} / {max}
    </span>
  )
}
