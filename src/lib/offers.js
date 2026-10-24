/*
  Hema's offers (admin -> Offers) and the photos of the Customize tiles (admin -> Menu ->
  Customize page). Pure functions shared by the website, the admin and the server.

  An offer is display-only: a banner at the top of Home (and a slim strip on the Menu page) with
  her title, short message, optional photo and one button to a category or a product. It never
  changes a price; she changes prices herself in admin -> Menu.
  Dates are Indian calendar dates (IST), both days included: an offer from 24 Oct to 31 Oct shows
  from midnight on the 24th to midnight at the end of the 31st, Indian time.
*/

export const OFFER_MAX = { title: 60, message: 120, button: 24 }
// More than this many live offers at once: the first ones show (the banner stays quick to read)
export const MAX_LIVE_OFFERS = 5

/** Today's date in India ("2026-10-23"). India has no summer time, so a fixed +5:30 is exact. */
export const istToday = (now = new Date()) => new Date(now.getTime() + 330 * 60_000).toISOString().slice(0, 10)

/** 'off' (switched off) | 'scheduled' (starts later) | 'live' | 'ended' */
export function offerStatus(offer, today = istToday()) {
  if (!offer.active) return 'off'
  if (today < offer.startsOn) return 'scheduled'
  if (today > offer.endsOn) return 'ended'
  return 'live'
}

/**
 * Where an offer's button goes. Stored as one word pair:
 *   'category:<id>' (that menu section), 'product:<id>' (that product's sheet), 'page:customize'.
 *   '' = no button (the banner just shows the message).
 */
export const LINK_PATTERN = /^(|category:[a-z0-9-]{2,40}|product:[a-z0-9][a-z0-9-]{1,59}|page:customize)$/

/** The website address for an offer's link ('' when there is none) */
export function offerHref(link) {
  const [kind, id] = String(link || '').split(':')
  if (kind === 'category') return `/menu#${id}`
  if (kind === 'product') return `/menu?item=${id}`
  if (kind === 'page' && id === 'customize') return '/customize'
  return ''
}

const pair = (v, max) => {
  if (!v || typeof v !== 'object') return null
  const en = String(v.en ?? '').replace(/\s+/g, ' ').trim().slice(0, max)
  if (!en) return null
  const kn = String(v.kn ?? '').replace(/\s+/g, ' ').trim().slice(0, max)
  return { en, kn: kn || en }
}
const isDate = (v) => typeof v === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(v)
export const isPhotoUrl = (v) => typeof v === 'string' && v.length <= 500 && /^(https:\/\/|\/api\/photo\/)/.test(v)

/**
 * An offer as the website gets it from /api/menu, checked again in the browser so a bad row
 * never breaks the page. -> { id, title, message, button, href, photo, startsOn, endsOn } or null
 */
export function cleanOffer(o) {
  if (!o || typeof o.id !== 'string') return null
  const title = pair(o.title, OFFER_MAX.title)
  if (!title || !isDate(o.startsOn) || !isDate(o.endsOn) || o.endsOn < o.startsOn) return null
  const href = LINK_PATTERN.test(o.link || '') ? offerHref(o.link) : ''
  return {
    id: o.id,
    title,
    message: pair(o.message, OFFER_MAX.message),
    button: href ? pair(o.button, OFFER_MAX.button) : null,
    href,
    photo: isPhotoUrl(o.photo) ? o.photo : null,
    startsOn: o.startsOn,
    endsOn: o.endsOn,
    active: o.active !== false,
  }
}

/** The offers to show right now, in Hema's order (the soonest to end first) */
export function liveOffers(list, today = istToday()) {
  return (Array.isArray(list) ? list : [])
    .map(cleanOffer)
    .filter((o) => o && offerStatus(o, today) === 'live')
    .sort((a, b) => (a.endsOn < b.endsOn ? -1 : a.endsOn > b.endsOn ? 1 : 0))
    .slice(0, MAX_LIVE_OFFERS)
}

/*
  The photos on the Customize page and Home's customise tile and card. Each has its own photo
  Hema can change (admin -> Menu -> Customize page); until she does, it shows the product photo
  named here (the photo that was always there).
*/
export const PAGE_PHOTOS = [
  { id: 'customize-box', fallback: 'red-velvet-delight-box', art: 'delight-box', name: 'Customize page: “Delight Box with a name or a drawing”' },
  { id: 'customize-bar', fallback: 'drawing-chocolate-bar', art: 'drawing-bar', name: 'Customize page: “Drawing Chocolate Bar”' },
  { id: 'home-customize', fallback: 'drawing-chocolate-bar', art: 'drawing-bar', name: 'Home page: the “Customize” tile and the hand-drawn chocolates card' },
]
export const PAGE_PHOTO_IDS = PAGE_PHOTOS.map((p) => p.id)

/** { [slot id]: photo address } from /api/menu, keeping only known slots and real addresses */
export function cleanPagePhotos(map) {
  const out = {}
  for (const id of PAGE_PHOTO_IDS) if (isPhotoUrl(map?.[id])) out[id] = map[id]
  return out
}
