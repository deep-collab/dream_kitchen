// Google Fonts requests. English fonts load on every page; the Kannada pair is only
// requested once the language is Kannada (see I18nProvider and the <head> script in
// index.html, which receives these URLs at build time from vite.config.js).
export const FONTS_EN =
  'https://fonts.googleapis.com/css2?family=Cinzel:wght@600&family=Cormorant+Garamond:ital,wght@0,600;1,600&family=Lato:wght@400;700&display=swap'

export const FONTS_KN =
  'https://fonts.googleapis.com/css2?family=Noto+Sans+Kannada:wght@400;700&family=Noto+Serif+Kannada:wght@600&display=swap'

export const KN_FONTS_LINK_ID = 'dk-kn-fonts'

export function loadKannadaFonts() {
  if (typeof document === 'undefined' || document.getElementById(KN_FONTS_LINK_ID)) return
  const link = document.createElement('link')
  link.id = KN_FONTS_LINK_ID
  link.rel = 'stylesheet'
  link.href = FONTS_KN
  document.head.appendChild(link)
}
