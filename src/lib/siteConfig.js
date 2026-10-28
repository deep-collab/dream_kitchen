/*
  The site settings the developer options change (admin -> More -> Developer options), stored one
  per row in the site_config table ({ key: value as JSON }). Pure functions shared by the website,
  the admin and the server: the server checks every value with these before saving, and the
  website checks again before using one, so a bad or missing value never breaks a page. Anything
  missing or wrong falls back to the built-in default (what the site did before the setting existed).

  Keys:
    background   the faint layer behind the website (default logo, festival themes, own picture)
    devAccess    { owner: boolean }: Hema (the owner account) sees the developer options too
*/
import { istToday } from './offers.js'

const isDate = (v) => typeof v === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(v)
export const isPhotoUrl = (v) => typeof v === 'string' && v.length <= 500 && /^(https:\/\/|\/api\/photo\/)/.test(v)

/* ======================= background ======================= */

/**
 * The background themes. "default" is the faint Dream Kitchen logo behind the home hero (as the
 * site always had). The others are drawn on the page (canvas), light enough to stay behind
 * everything; "custom" is a picture uploaded in the admin, shown very faint.
 */
export const BACKGROUND_THEMES = [
  { id: 'default', name: 'Default: the light Dream Kitchen logo' },
  { id: 'rajyotsava', name: 'Kannada Rajyotsava: a softly waving Karnataka flag' },
  { id: 'diwali', name: 'Diwali: glowing diyas and gentle sparkles' },
  { id: 'christmas', name: 'Christmas: slow falling snow and small stars' },
  { id: 'newyear', name: 'New Year: soft fireworks' },
  { id: 'valentine', name: 'Valentine’s: small floating hearts' },
  { id: 'custom', name: 'Your own picture (made light automatically)' },
]
export const BACKGROUND_IDS = BACKGROUND_THEMES.map((t) => t.id)
// Opacity in percent. Light by default; never so strong that text gets hard to read.
export const BG_OPACITY = { min: 1, max: 20, default: 7, logo: 4.5 }

const opacity = (v, fallback) => (typeof v === 'number' && Number.isFinite(v) ? Math.min(BG_OPACITY.max, Math.max(BG_OPACITY.min, Math.round(v * 2) / 2)) : fallback)

/**
 * { themes: { [id]: { on, opacity, animate, startsOn, endsOn } }, customImage }
 *   on: use this theme on its dates (the default needs no dates: it shows whenever no other does)
 *   startsOn / endsOn: Indian dates, both days included; '' = no limit on that side
 */
export function cleanBackground(v) {
  const src = v && typeof v === 'object' ? v : {}
  const themes = {}
  for (const id of BACKGROUND_IDS) {
    const t = src.themes?.[id] && typeof src.themes[id] === 'object' ? src.themes[id] : {}
    const startsOn = isDate(t.startsOn) ? t.startsOn : ''
    const endsOn = isDate(t.endsOn) && (!startsOn || t.endsOn >= startsOn) ? t.endsOn : ''
    themes[id] = {
      on: id === 'default' ? true : t.on === true,
      opacity: opacity(t.opacity, id === 'default' ? BG_OPACITY.logo : BG_OPACITY.default),
      animate: t.animate !== false,
      startsOn: id === 'default' ? '' : startsOn,
      endsOn: id === 'default' ? '' : endsOn,
    }
  }
  const customImage = isPhotoUrl(src.customImage) ? src.customImage : null
  if (!customImage) themes.custom.on = false
  return { themes, customImage }
}

/** What the server accepts: errors per theme, { [id]: 'dates' | 'image' } (empty = fine) */
export function backgroundErrors(v) {
  const errors = {}
  for (const id of BACKGROUND_IDS) {
    const t = v?.themes?.[id]
    if (!t) continue
    if ((t.startsOn && !isDate(t.startsOn)) || (t.endsOn && !isDate(t.endsOn)) || (isDate(t.startsOn) && isDate(t.endsOn) && t.endsOn < t.startsOn)) errors[id] = 'dates'
  }
  if (v?.themes?.custom?.on && !isPhotoUrl(v?.customImage)) errors.custom = 'image'
  return errors
}

const showsOn = (t, today) => t.on && (!t.startsOn || today >= t.startsOn) && (!t.endsOn || today <= t.endsOn)

/**
 * The background to show today: the festival theme whose dates include today (if two overlap, the
 * one that started last), else the default logo. -> { id, opacity (0..1), animate, image }
 */
export function activeBackground(bg, today = istToday()) {
  const b = cleanBackground(bg)
  const chosen =
    BACKGROUND_IDS.filter((id) => id !== 'default' && showsOn(b.themes[id], today)).sort((x, y) => (b.themes[x].startsOn < b.themes[y].startsOn ? 1 : -1))[0] || 'default'
  const t = b.themes[chosen]
  return { id: chosen, opacity: t.opacity / 100, animate: t.animate, image: chosen === 'custom' ? b.customImage : null }
}

/**
 * The background to show, with Kannada Rajyotsava: on its dates the faint background is the
 * Karnataka flag (yellow over red, softly waving; its strength from src/config/rajyotsava.js,
 * `flagOpacity`, 7%, else the developer options'; animation from the developer options, still with
 * "reduce motion"); afterwards (or switched off) the usual one, by itself.
 *   raj: the display offer (src/lib/offers.js rajyotsavaDisplay) or null
 */
export function festivalBackground(bg, today = istToday(), raj = null) {
  if (!raj) return activeBackground(bg, today)
  const t = cleanBackground(bg).themes.rajyotsava
  const strength = typeof raj === 'object' && Number.isFinite(raj.flagOpacity) ? opacity(raj.flagOpacity, t.opacity) : t.opacity
  return { id: 'rajyotsava', opacity: strength / 100, animate: t.animate, image: null }
}

/* ======================= who sees the developer options ======================= */

export const cleanDevAccess = (v) => ({ owner: v?.owner === true })

/* ======================= all of it ======================= */

/** Every key, cleaned (the admin's view) */
export function cleanConfig(map = {}) {
  return {
    background: cleanBackground(map.background),
    devAccess: cleanDevAccess(map.devAccess),
  }
}

/** The part the website gets in /api/menu (nothing private: no access lists, no message templates) */
export function publicConfig(map = {}) {
  const c = cleanConfig(map)
  return { background: c.background }
}
