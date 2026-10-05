// Step 6 site rules: the simpler navigation, no WhatsApp ordering, nothing left of the old menu,
// old addresses redirect, and the Kannada split still keeps Kannada away from English visitors.
import { readdirSync, readFileSync, statSync } from 'node:fs'
import { join } from 'node:path'
import { describe, expect, it } from 'vitest'
import { findPairs, KANNADA, kannadaTable, stripKannada, dataFiles } from '../scripts/kannada-split.mjs'
import { legacyProductPath, redirectsFile, RENAMED, REMOVED } from '../src/config/redirects.js'
import { products } from '../src/config/shop.js'
import { sitemapXml } from '../scripts/sitemap.mjs'
import { MAIN_NAV } from '../src/components/layout/nav.js'
import kn from '../src/i18n/kn.json'
import en from '../src/i18n/en.json'

const srcFiles = []
const walk = (p) => (statSync(p).isDirectory() ? readdirSync(p).forEach((f) => walk(join(p, f))) : /\.(js|jsx|mjs)$/.test(p) && srcFiles.push(p))
walk('src')
const read = (f) => readFileSync(f, 'utf8')

describe('navigation', () => {
  it('has at most five main items: Home, Menu, Customize, Classes, Contact', () => {
    expect(MAIN_NAV.map((n) => n.to)).toEqual(['/', '/menu', '/customize', '/classes', '/contact'])
  })
})

describe('no WhatsApp ordering', () => {
  it('only the Contact page links to WhatsApp (plus the Button helper it could use)', () => {
    const users = srcFiles.filter((f) => /waLink\(|wa\.me/.test(read(f))).map((f) => f.replaceAll('\\', '/'))
    expect(users.sort()).toEqual(['src/components/ui/Button.jsx', 'src/config/site.js', 'src/pages/Contact.jsx'])
  })

  it('no text speaks of sending orders on WhatsApp any more', () => {
    const text = JSON.stringify(en)
    expect(text).not.toMatch(/order on WhatsApp|Send order|WhatsApp order/i)
  })
})

describe('the old menu is gone', () => {
  it('no removed product, offer or sample text in the code or the words', () => {
    const banned = /Colour Blast|Cookie Pie|Cookie Dip|Classic Favourite|pick any 3|Butterscotch|Nutty Caramel|Dreamy Biscoff|SAMPLE class|Triple Layer/i
    const offenders = srcFiles.filter((f) => !f.includes('redirects.js') && banned.test(read(f)))
    expect(offenders).toEqual([])
    expect(JSON.stringify(en)).not.toMatch(banned)
  })
})

describe('old addresses', () => {
  it('every kept product opens its card, every removed one its category', () => {
    const ids = new Set(products.map((p) => p.id))
    for (const [, slug] of Object.entries(RENAMED)) expect(ids.has(slug), slug).toBe(true)
    expect(legacyProductPath('lotus-biscoff-bliss-tub')).toBe('/menu?item=lotus-biscoff-tub')
    expect(legacyProductPath('pista-premium-delight')).toBe('/menu?item=pista-delight-box')
    expect(legacyProductPath('classic-triple-layer-chocolate')).toBe('/menu?c=chocolates')
    expect(legacyProductPath('butterscotch-delight')).toBe('/menu?c=delight-boxes')
    expect(legacyProductPath('cookie-pie-tin')).toBe('/menu')
    expect(Object.keys(RENAMED).length + Object.keys(REMOVED).length).toBe(35) // the whole Step 5 menu
  })

  it('Netlify gets 301s before the app rewrite, and the admin has its own page', () => {
    const lines = redirectsFile().split('\n').filter((l) => l && !l.startsWith('#'))
    expect(lines).toContain('/shop  /menu  301')
    expect(lines).toContain('/product/coconut-bar  /menu?c=chocolates  301')
    expect(lines.indexOf('/admin/*  /admin/index.html  200')).toBeLessThan(lines.indexOf('/*  /index.html  200'))
    expect(lines.at(-1)).toBe('/*  /index.html  200')
  })

  it('the sitemap lists the public pages only', () => {
    const xml = sitemapXml({ url: 'https://example.com/' })
    expect(xml).toContain('<loc>https://example.com/menu</loc>')
    expect(xml).not.toMatch(/checkout|admin|cart|product\//)
  })
})

describe('Kannada split (scripts/kannada-split.mjs): English visitors never download Kannada', () => {
  const files = dataFiles('.')

  it('covers the shop config and every data file, leaving no Kannada behind', () => {
    expect(files.map((f) => f.replaceAll('\\', '/')).some((f) => f.endsWith('src/config/shop.js'))).toBe(true)
    for (const f of files) {
      const out = stripKannada(read(f), f)
      expect(KANNADA.test(out.replace(/\/\*[\s\S]*?\*\/|\/\/[^\n]*/g, '')), f).toBe(false)
    }
  })

  it('gives every Kannada text back, keyed by its English, with no English text meaning two things', () => {
    const table = kannadaTable('.')
    let pairs = 0
    for (const f of files)
      for (const { en: e, kn: k } of findPairs(read(f))) {
        pairs++
        expect(table[e]).toBe(k)
      }
    expect(pairs).toBeGreaterThan(60)
  })

  it('weights get their Kannada unit from kn.json', () => {
    expect(kn.units).toEqual({ g: '{n} ಗ್ರಾಂ', kg: '{n} ಕೆ.ಜಿ' })
  })
})
