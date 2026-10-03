import { readFileSync } from 'node:fs'
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import { readSymbol, spriteMarkup } from './scripts/symbol.mjs'
import { FONTS_EN, FONTS_KN, KN_FONTS_LINK_ID } from './src/config/fonts.js'

const readJson = (path) => JSON.parse(readFileSync(new URL(path, import.meta.url), 'utf8'))
const escapeHtml = (s) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/"/g, '&quot;')

// Fills the {{dk:*}} markers in index.html: the symbol sprite (from the unaltered
// src/assets/symbol.svg) and the loading-screen tagline (from the i18n files), so the
// inline loading screen has one source for its artwork and its words. Font URLs come
// from src/config/fonts.js.
function dreamKitchenHtml() {
  return {
    name: 'dream-kitchen-html',
    transformIndexHtml: {
      order: 'pre',
      handler(html) {
        const sym = readSymbol()
        const en = readJson('./src/i18n/en.json')
        const kn = readJson('./src/i18n/kn.json')
        return html
          .replace('{{dk:sprite}}', spriteMarkup(sym))
          .replaceAll('{{dk:viewBox}}', sym.viewBox)
          .replace('{{dk:tagline-en}}', escapeHtml(en.brand.tagline))
          .replace('{{dk:tagline-kn}}', escapeHtml(kn.brand.tagline))
          .replace('{{dk:brand-aria}}', escapeHtml(en.brand.lockupLabel))
          .replaceAll('{{dk:fonts-en}}', escapeHtml(FONTS_EN))
          .replace('{{dk:fonts-kn}}', FONTS_KN)
          .replace('{{dk:kn-link-id}}', KN_FONTS_LINK_ID)
      },
    },
  }
}

export default defineConfig({
  plugins: [dreamKitchenHtml(), react(), tailwindcss()],
})
