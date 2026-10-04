import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react'
import { english as en } from './strings'
import { loadKannadaFonts } from '../config/fonts'
import { site } from '../config/site'
import KANNADA_URL from 'virtual:dk-kannada-url'

// English: the core sections are in the main bundle and each screen adds its own as it loads
// (src/i18n/strings.js). Kannada (UI words + menu text) is one JSON file, fetched only when
// someone reads in ಕನ್ನಡ.
const dictionaries = { en }
let menuKannada = {} // English menu text -> Kannada (from the data files)
let kannadaLoad = null
const STORAGE_KEY = 'dk_lang'
const I18nContext = createContext(null)

/**
 * Fetches all the Kannada once (UI words + menu text, one JSON file; scripts/kannada-split.mjs).
 * Resolves when it is ready. It is data, not a script, so after a dropped signal it can simply
 * be fetched again (a failed script import would stay failed for the life of the page).
 */
export function loadKannada() {
  kannadaLoad ||= fetch(KANNADA_URL)
    .then((r) => {
      if (!r.ok) throw new Error(`Kannada: ${r.status}`)
      return r.json()
    })
    .then(
    (m) => {
      dictionaries.kn = m.kn
      menuKannada = m.menu
    },
    (error) => {
      kannadaLoad = null
      throw error
    },
  )
  return kannadaLoad
}
const kannadaReady = () => Boolean(dictionaries.kn)

function lookup(dict, key) {
  return key.split('.').reduce((node, part) => (node == null ? undefined : node[part]), dict)
}

// Filled into any string without being passed, so the number lives only in site.js
const GLOBAL_VARS = { phone: site.phone.display }

function interpolate(value, vars) {
  if (typeof value !== 'string') return value
  const all = { ...GLOBAL_VARS, ...vars }
  return value.replace(/\{(\w+)\}/g, (m, name) => (all[name] != null ? String(all[name]) : m))
}

export function readStoredLang() {
  try {
    const v = localStorage.getItem(STORAGE_KEY)
    return v === 'kn' || v === 'en' ? v : 'en'
  } catch {
    return 'en'
  }
}

// Menu text in Kannada: the data's own `kn` (Stage B, or unit tests), else the lazy table
// keyed by the English, else weights ("250g" -> "250 ಗ್ರಾಂ" from kn.json units), else English.
function kannadaFor(field) {
  if (field.kn) return field.kn
  if (menuKannada[field.en]) return menuKannada[field.en]
  const weight = /^(\d+(?:\.\d+)?)(g|kg)$/.exec(field.en || '')
  if (weight && dictionaries.kn?.units) return interpolate(dictionaries.kn.units[weight[2]], { n: weight[1] })
  return field.en
}

// t('a.b', {x}) -> string (falls back to English, then the key itself)
// pick({en, kn}) -> the text for the current language
function useTranslator(lang, extra) {
  const t = useCallback(
    (key, vars) => {
      const value = lookup(dictionaries[lang], key) ?? lookup(en, key) ?? key
      return interpolate(value, vars)
    },
    [lang],
  )
  const pick = useCallback((field) => (field && typeof field === 'object' ? (lang === 'kn' ? kannadaFor(field) : field.en) : field), [lang])
  return useMemo(() => ({ lang, t, pick, ...extra }), [lang, t, pick, extra])
}

/**
 * initialLang: 'kn' only once loadKannada() has finished (src/main.jsx waits for it), so a
 * Kannada reader never sees English first. setLang('kn') keeps the page as it is (cart, half-
 * filled forms and all) until the chunk arrives, then switches in one go. If it can't load,
 * the page stays in English and `langFailed` lets the layout offer a retry.
 */
export function I18nProvider({ children, initialLang = 'en', initialFailed = false }) {
  const [lang, setLangState] = useState(initialLang)
  const [pendingLang, setPendingLang] = useState(null)
  const [langFailed, setLangFailed] = useState(initialFailed)

  const setLang = useCallback((next) => {
    if (next !== 'kn' || kannadaReady()) {
      setLangFailed(false)
      setLangState(next)
      return
    }
    setPendingLang('kn')
    loadKannadaFonts() // in parallel with the words
    loadKannada()
      .then(
        () => {
          setLangFailed(false)
          setLangState('kn')
        },
        () => setLangFailed(true),
      )
      .finally(() => setPendingLang(null))
  }, [])
  const dismissLangError = useCallback(() => setLangFailed(false), [])

  useEffect(() => {
    document.documentElement.lang = lang === 'kn' ? 'kn' : 'en'
    // Kannada fonts are only fetched once someone actually reads in Kannada
    if (lang === 'kn') loadKannadaFonts()
    try {
      localStorage.setItem(STORAGE_KEY, lang)
    } catch {
      /* storage unavailable: choice lasts for this visit only */
    }
  }, [lang])

  const extra = useMemo(() => ({ setLang, pendingLang, langFailed, dismissLangError }), [setLang, pendingLang, langFailed, dismissLangError])
  const value = useTranslator(lang, extra)
  return <I18nContext.Provider value={value}>{children}</I18nContext.Provider>
}

/**
 * Renders a subtree in a fixed language without changing the site language
 * (used by /styleguide to show English and Kannada side by side; it calls loadKannada first).
 * Also put lang="kn" on the wrapping element so Kannada typography applies.
 */
export function I18nScope({ lang, children }) {
  const parent = useContext(I18nContext)
  const extra = useMemo(() => ({ setLang: parent.setLang, pendingLang: null, langFailed: false, dismissLangError: parent.dismissLangError }), [parent])
  const value = useTranslator(lang, extra)
  return <I18nContext.Provider value={value}>{children}</I18nContext.Provider>
}

export function useI18n() {
  const ctx = useContext(I18nContext)
  if (!ctx) throw new Error('useI18n must be used inside I18nProvider')
  return ctx
}
