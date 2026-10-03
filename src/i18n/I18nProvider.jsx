import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react'
import en from './en.json'
import kn from './kn.json'
import { loadKannadaFonts } from '../config/fonts'

const dictionaries = { en, kn }
const STORAGE_KEY = 'dk_lang'
const I18nContext = createContext(null)

function lookup(dict, key) {
  return key.split('.').reduce((node, part) => (node == null ? undefined : node[part]), dict)
}

function interpolate(value, vars) {
  if (typeof value !== 'string' || !vars) return value
  return value.replace(/\{(\w+)\}/g, (m, name) => (vars[name] != null ? String(vars[name]) : m))
}

function readStoredLang() {
  try {
    const v = localStorage.getItem(STORAGE_KEY)
    return v === 'kn' || v === 'en' ? v : 'en'
  } catch {
    return 'en'
  }
}

// t('a.b', {x}) -> string (falls back to English, then the key itself)
// pick({en, kn}) -> the text for the given language
function useTranslator(lang, setLang) {
  const t = useCallback(
    (key, vars) => {
      const value = lookup(dictionaries[lang], key) ?? lookup(en, key) ?? key
      return interpolate(value, vars)
    },
    [lang],
  )
  const pick = useCallback((field) => (field && typeof field === 'object' ? field[lang] || field.en : field), [lang])
  return useMemo(() => ({ lang, setLang, t, pick }), [lang, setLang, t, pick])
}

export function I18nProvider({ children }) {
  const [lang, setLangState] = useState(readStoredLang)

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

  const value = useTranslator(lang, setLangState)
  return <I18nContext.Provider value={value}>{children}</I18nContext.Provider>
}

/**
 * Renders a subtree in a fixed language without changing the site language
 * (used by /styleguide to show English and Kannada side by side).
 * Also put lang="kn" on the wrapping element so Kannada typography applies.
 */
export function I18nScope({ lang, children }) {
  const parent = useContext(I18nContext)
  const value = useTranslator(lang, parent.setLang)
  return <I18nContext.Provider value={value}>{children}</I18nContext.Provider>
}

export function useI18n() {
  const ctx = useContext(I18nContext)
  if (!ctx) throw new Error('useI18n must be used inside I18nProvider')
  return ctx
}
