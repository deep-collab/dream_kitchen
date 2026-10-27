import { useState } from 'react'
import { adminCall } from './api'
import { Btn, card, day, ErrorText, Loading, PageTitle, Pill, SaveMessage, useAdminData, useSave } from './ui'
import { activeBackground, BG_OPACITY, cleanBackground } from '../lib/siteConfig'
import { istToday } from '../lib/offers'
import ThemeLayer from '../components/background/ThemeLayer'
import { ImageIcon } from '../components/icons'
import symbolUrl from '../assets/symbol.svg'

const copy = (v) => JSON.parse(JSON.stringify(v))

/**
 * A picture for the "own picture" background, made light on the phone: at most 1600 px wide,
 * washed with cream so it can only ever be a soft texture, WebP. -> { image, imageSmall } or null
 */
async function lightPicture(file) {
  let bitmap
  try {
    bitmap = await createImageBitmap(file, { imageOrientation: 'from-image' })
  } catch {
    return null
  }
  const make = (maxW, max) => {
    const scale = Math.min(1, maxW / bitmap.width)
    const c = document.createElement('canvas')
    c.width = Math.round(bitmap.width * scale)
    c.height = Math.round(bitmap.height * scale)
    const g = c.getContext('2d')
    g.drawImage(bitmap, 0, 0, c.width, c.height)
    g.fillStyle = 'rgba(255, 249, 239, 0.35)'
    g.fillRect(0, 0, c.width, c.height)
    const type = c.toDataURL('image/webp', 0.8).startsWith('data:image/webp') ? 'image/webp' : 'image/jpeg'
    for (const q of [0.78, 0.66, 0.54, 0.42, 0.3]) {
      const url = c.toDataURL(type, q)
      if (url.length < max) return url
    }
    return null
  }
  const image = make(1600, 600_000)
  const imageSmall = image && make(800, 150_000)
  bitmap.close?.()
  return image && imageSmall ? { image, imageSmall } : null
}

/** One preview: a sample of the cream pages and of the black home hero, with the background behind */
function Preview({ bg }) {
  const logo = bg.id === 'default'
  return (
    <div className="grid gap-2 sm:grid-cols-2" aria-hidden="true" data-admin-bg-preview={bg.id}>
      <div className="relative isolate h-44 overflow-hidden rounded-card border border-line bg-cream p-3">
        {!logo && <ThemeLayer bg={bg} className="absolute inset-0 -z-10 h-full w-full" />}
        <p className="font-heading text-xl font-bold">Menu</p>
        <p className="t-small text-brown-2">A page of the website, with its words on top.</p>
        <div className="mt-2 grid grid-cols-2 gap-2">
          <div className="h-14 rounded-control border border-line bg-[#fffcf5]" />
          <div className="h-14 rounded-control border border-line bg-[#fffcf5]" />
        </div>
      </div>
      <div className="relative isolate h-44 overflow-hidden rounded-card bg-ink p-3 text-center text-cream">
        {logo ? (
          <img src={symbolUrl} alt="" className="absolute top-[10%] left-[45%] -z-10 w-[70%] rotate-[-8deg]" style={{ opacity: bg.opacity * 4 > 1 ? 1 : bg.opacity * 4 }} />
        ) : (
          <ThemeLayer bg={bg} dark className="absolute inset-0 -z-10 h-full w-full" />
        )}
        <p className="font-wordmark text-xl text-gold-light">Dream Kitchen</p>
        <p className="t-small">The home page’s top part</p>
        <span className="mt-3 inline-flex min-h-10 items-center rounded-control bg-[linear-gradient(180deg,#ebd27a,#d4af37_55%,#b8901e)] px-4 font-bold text-ink">Order now</span>
      </div>
      {logo && <p className="t-small text-brown-2 sm:col-span-2">The logo preview is shown a little stronger than on the website so you can see it.</p>}
    </div>
  )
}

/**
 * Developer options -> Site background: the faint layer behind the website. The default is the
 * light Dream Kitchen logo behind the home hero. Each festival theme can be switched on for its
 * dates (Indian time); after the end date the website goes back to the default by itself. Every
 * theme has its own strength and animation switch, and a preview before saving.
 */
export default function DevBackground() {
  const { data, error, setData } = useAdminData(() => adminCall('devConfig'), [])
  const [draft, setDraft] = useState(null)
  const [previewId, setPreviewId] = useState(null)
  const save = useSave()
  const upload = useSave()
  if (error) return <ErrorText>{error}</ErrorText>
  if (!data) return <Loading />
  const bg = draft || data.background
  const today = istToday()
  const changed = Boolean(draft) && JSON.stringify(cleanBackground(draft)) !== JSON.stringify(cleanBackground(data.background))
  const setTheme = (id, patch) => setDraft((d) => {
    const next = copy(d || data.background)
    next.themes[id] = { ...next.themes[id], ...patch }
    return next
  })
  const nameOf = (id) => data.themes.find((t) => t.id === id)?.name || id
  const nowLive = activeBackground(data.background, today)
  const afterSave = activeBackground(bg, today)
  const shownId = previewId || afterSave.id
  const t = bg.themes[shownId]
  const preview = { id: shownId, opacity: t.opacity / 100, animate: t.animate, image: shownId === 'custom' ? bg.customImage : null }

  const onSave = () =>
    save.run(async () => {
      const r = await adminCall('saveBackground', { background: cleanBackground(bg) })
      if (r.ok) {
        setData(r.data)
        setDraft(null)
      }
      return r
    }, 'Saved. Visitors see it the next time they open a page.')

  const onPicture = async (e) => {
    const file = e.target.files?.[0]
    e.target.value = ''
    if (!file) return
    upload.run(async () => {
      const files = await lightPicture(file)
      if (!files) return { ok: false, error: 'fields', fields: { photo: 'image' } }
      const r = await adminCall('backgroundImage', files)
      if (r.ok) {
        setDraft((d) => ({ ...copy(d || data.background), customImage: r.data.url }))
        setPreviewId('custom')
      }
      return r
    }, 'Picture ready. Switch it on below and save to use it.')
  }

  return (
    <div className="space-y-4" data-admin-dev-background>
      <PageTitle>Site background</PageTitle>
      <p className="text-brown-2">A faint layer behind everything on the website. It stays light so every word is easy to read, moves slowly (never for visitors who ask their phone for less motion), and stops while the page is hidden.</p>

      <div className={`${card} space-y-3`}>
        <p className="font-bold">
          Today the website shows: <span data-admin-bg-live={nowLive.id}>{nameOf(nowLive.id)}</span>
        </p>
        {changed && (
          <p className="font-bold text-[#6b4b00]">
            After you save: <span data-admin-bg-after={afterSave.id}>{nameOf(afterSave.id)}</span>
          </p>
        )}
        <p className="t-small text-brown-2">Preview: {nameOf(shownId)}</p>
        <Preview bg={preview} />
      </div>

      <ul className="space-y-3">
        {data.themes.map(({ id, name }) => {
          const th = bg.themes[id]
          const isDefault = id === 'default'
          const live = afterSave.id === id
          return (
            <li key={id} className={`${card} space-y-3 ${live ? 'border-[#1a6b3a]' : ''}`} data-admin-bg-theme={id}>
              <div className="flex flex-wrap items-center justify-between gap-2">
                <p className="font-bold">{name}</p>
                {live ? <Pill tone="good">Shows today</Pill> : !isDefault && th.on ? <Pill tone="warn">On, for its dates</Pill> : null}
              </div>

              {id === 'custom' && (
                <div className="flex flex-wrap items-center gap-3">
                  {bg.customImage && <img src={bg.customImage} alt="" className="h-16 w-24 rounded-control object-cover" />}
                  <label htmlFor="bg-picture" className="inline-flex min-h-12 cursor-pointer items-center gap-2 rounded-control border-[1.5px] border-brown px-4 font-bold">
                    <ImageIcon className="h-5 w-5" /> {bg.customImage ? 'Change picture' : 'Choose a picture'}
                  </label>
                  <input id="bg-picture" type="file" accept="image/*" className="sr-only" onChange={onPicture} data-admin-bg-picture />
                  <SaveMessage save={upload} />
                </div>
              )}

              {!isDefault && (
                <>
                  <label className="flex min-h-12 items-center gap-3 font-bold">
                    <input
                      type="checkbox"
                      className="h-6 w-6 accent-ink"
                      checked={th.on}
                      disabled={id === 'custom' && !bg.customImage}
                      onChange={(e) => setTheme(id, { on: e.target.checked })}
                      data-admin-bg-on={id}
                    />
                    Use it on these dates
                  </label>
                  <div className="grid gap-3 sm:grid-cols-2">
                    <label className="block">
                      <span className="mb-1 block font-bold">From</span>
                      <input type="date" className="field-control" value={th.startsOn} onChange={(e) => setTheme(id, { startsOn: e.target.value })} data-admin-bg-start={id} />
                      <span className="t-small mt-1 block text-brown-2">Empty: from now.</span>
                    </label>
                    <label className="block">
                      <span className="mb-1 block font-bold">Until (included)</span>
                      <input type="date" className="field-control" value={th.endsOn} min={th.startsOn || undefined} onChange={(e) => setTheme(id, { endsOn: e.target.value })} data-admin-bg-end={id} />
                      <span className="t-small mt-1 block text-brown-2">{th.endsOn ? `Back to the default after ${day(th.endsOn)}.` : 'Empty: until you switch it off.'}</span>
                    </label>
                  </div>
                </>
              )}

              <label className="block">
                <span className="mb-1 flex justify-between font-bold">
                  <span>How strong</span>
                  <span data-admin-bg-opacity-value={id}>{th.opacity}%</span>
                </span>
                <input
                  type="range"
                  min={BG_OPACITY.min}
                  max={BG_OPACITY.max}
                  step="0.5"
                  value={th.opacity}
                  onChange={(e) => {
                    setTheme(id, { opacity: Number(e.target.value) })
                    setPreviewId(id)
                  }}
                  className="h-12 w-full accent-ink"
                  data-admin-bg-opacity={id}
                />
                <span className="t-small block text-brown-2">Light is best: 5 to 10%.</span>
              </label>
              {id !== 'custom' && (
                <label className="flex min-h-12 items-center gap-3">
                  <input type="checkbox" className="h-6 w-6 accent-ink" checked={th.animate} onChange={(e) => setTheme(id, { animate: e.target.checked })} />
                  Moves slowly (off: stays still)
                </label>
              )}
              <Btn tone="light" onClick={() => setPreviewId(id)} data-admin-bg-preview-btn={id}>
                Preview this
              </Btn>
            </li>
          )
        })}
      </ul>

      <div className="sticky bottom-20 z-10 space-y-2 rounded-card border border-line bg-cream/95 p-3 backdrop-blur">
        <SaveMessage save={save} />
        {save.fields && Object.keys(save.fields).length > 0 && (
          <p className="font-bold text-error">{save.fields.custom ? 'Choose a picture before switching “Your own picture” on.' : 'Check the dates: the end is before the start.'}</p>
        )}
        <div className="flex gap-2">
          <Btn tone="gold" className="flex-1" onClick={onSave} disabled={!changed || save.status === 'saving'} data-admin-bg-save>
            {save.status === 'saving' ? 'Saving…' : 'Save background'}
          </Btn>
          <Btn tone="light" onClick={() => setDraft(null)} disabled={!changed}>
            Undo changes
          </Btn>
        </div>
      </div>

      {data.isDeveloper && <DevAccess on={data.devAccess.owner} onSaved={setData} />}
    </div>
  )
}

/** Only for the developer: whether Hema's account sees the developer options too */
function DevAccess({ on, onSaved }) {
  const save = useSave()
  const flip = () =>
    save.run(async () => {
      const r = await adminCall('setDevAccess', { owner: !on })
      if (r.ok) onSaved(r.data)
      return r
    }, !on ? 'Hema now sees the developer options in More.' : 'The developer options are hidden from Hema again.')
  return (
    <div className={`${card} space-y-2`} data-admin-dev-access>
      <p className="font-bold">Show the developer options to Hema</p>
      <p className="t-small text-brown-2">{on ? 'On: Hema sees them in More (no tapping needed).' : 'Off: only you see them (after tapping the version 7 times).'}</p>
      <Btn tone={on ? 'light' : 'dark'} onClick={flip} disabled={save.status === 'saving'} data-admin-dev-access-toggle>
        {on ? 'Hide them from Hema' : 'Show them to Hema'}
      </Btn>
      <SaveMessage save={save} />
    </div>
  )
}
