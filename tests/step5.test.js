import { readdirSync, readFileSync } from 'node:fs'
import { join } from 'node:path'
import { describe, expect, it } from 'vitest'
import { site, classesEnabled, hasCallHours, hasDeliveryCharge } from '../src/config/site.js'
import { MAIN_NAV, MORE_NAV } from '../src/components/layout/nav.js'
import { products } from '../src/data/products.js'
import { sitemapPaths, sitemapXml, robotsTxt } from '../scripts/sitemap.mjs'
import { findPairs, KANNADA, kannadaTable, stripKannada } from '../scripts/kannada-split.mjs'
import en from '../src/i18n/en.json'
import kn from '../src/i18n/kn.json'

describe('launch defaults (src/config/site.js)', () => {
  it('classes are off and unconfirmed details are empty until Hema confirms them', () => {
    expect(site.classes.enabled).toBe(false)
    expect(classesEnabled()).toBe(false)
    expect(site.hours).toBeNull()
    expect(hasCallHours()).toBe(false)
    expect(site.delivery.charge).toBeNull()
    expect(hasDeliveryCharge()).toBe(false)
    for (const key of ['email', 'fssai', 'shelfLife']) expect(site[key]).toBe('')
  })
})

describe('classes switched off: no class text or link anywhere', () => {
  it('navigation (header, phone menu, footer) has no Classes link', () => {
    expect([...MAIN_NAV, ...MORE_NAV].map((n) => n.to)).not.toContain('/classes')
  })

  it('sitemap lists /classes only when switched on, and every real product', () => {
    expect(sitemapPaths({ classesEnabled: false })).not.toContain('/classes')
    expect(sitemapPaths({ classesEnabled: true })).toContain('/classes')
    const xml = sitemapXml({ url: 'https://example.com/', classesEnabled: false })
    expect(xml).not.toMatch(/\/classes\b/) // ("classic-…" products are fine)
    for (const p of products.filter((x) => x.active)) expect(xml).toContain(`https://example.com/product/${p.slug}</loc>`)
    expect(xml.match(/<url>/g)).toHaveLength(7 + products.filter((x) => x.active).length)
    expect(robotsTxt({ url: 'https://example.com' })).toContain('Sitemap: https://example.com/sitemap.xml')
  })

  // Every string that can appear outside the Classes and booking screens. While classes are off
  // the pages choose the variant without classes (contact.call.text, notFound.help,
  // seo.faq.desc, FAQ without its classes answer, Our Story without "Teaching others").
  it('every string shown outside the class screens has a version without classes', () => {
    const walk = (node, path = '') => (typeof node === 'string' ? [[path, node]] : Object.entries(node).flatMap(([k, v]) => walk(v, path ? `${path}.${k}` : k)))
    const onlyWhenOn = /^(classes|booking|booked|nav\.classes|home\.classes|about\.teach|faq\.items\.classes|seo\.classes|seo\.classBooked|styleguide)\.?|Classes$/
    for (const [dict, word] of [
      [en, /class/i],
      [kn, /ತರಗತಿ/],
    ]) {
      const leaks = walk(dict).filter(([k, v]) => word.test(v) && !onlyWhenOn.test(k))
      expect(leaks).toEqual([])
    }
  })

  it('the code shows each class-only string behind the switch', () => {
    const read = (f) => readFileSync(f, 'utf8')
    expect(read('src/App.jsx')).toMatch(/classesEnabled\(\) && <Route path="classes"/)
    expect(read('src/pages/Home.jsx')).toMatch(/classesEnabled\(\) && \(\s*<>\s*<ClassesTeaser/)
    expect(read('src/pages/About.jsx')).toMatch(/k !== 'teach' \|\| classesEnabled\(\)/)
    expect(read('src/pages/FAQ.jsx')).toMatch(/k !== 'classes' \|\| classesEnabled\(\)/)
    expect(read('src/pages/Contact.jsx')).toMatch(/classesEnabled\(\) \? 'contact\.call\.textClasses' : 'contact\.call\.text'/)
    expect(read('src/pages/NotFound.jsx')).toMatch(/classesEnabled\(\) \? 'notFound\.helpClasses' : 'notFound\.help'/)
  })
})

describe('Kannada split (scripts/kannada-split.mjs): English visitors never download Kannada', () => {
  const files = readdirSync('src/data').filter((f) => f.endsWith('.js'))

  it('leaves no Kannada in any data file after the split', () => {
    for (const f of files) {
      const out = stripKannada(readFileSync(join('src/data', f), 'utf8'), f)
      expect(KANNADA.test(out.replace(/\/\*[\s\S]*?\*\/|\/\/[^\n]*/g, '')), f).toBe(false)
    }
  })

  it('gives every Kannada text back, keyed by its English, with no English text meaning two things', () => {
    const table = kannadaTable('src/data')
    let pairs = 0
    for (const f of files)
      for (const { en: e, kn: k } of findPairs(readFileSync(join('src/data', f), 'utf8'))) {
        pairs++
        expect(table[e]).toBe(k)
      }
    expect(pairs).toBeGreaterThan(120)
  })

  it('refuses Kannada it cannot split (e.g. built in a template) and conflicting translations', () => {
    expect(() => stripKannada("export const w = (g) => ({ en: `${g}g`, kn: `${g} ಗ್ರಾಂ` })")).toThrow(/still has Kannada/)
    expect(stripKannada("export const a = { en: 'Mango', kn: 'ಮಾವು' }")).toBe("export const a = { en: 'Mango' }")
  })

  it('weights get their Kannada unit from kn.json, not the code', () => {
    expect(kn.units).toEqual({ g: '{n} ಗ್ರಾಂ', kg: '{n} ಕೆ.ಜಿ' })
    const code = readFileSync('src/lib/weights.js', 'utf8').replace(/\/\*[\s\S]*?\*\//g, '') // its comment shows an example
    expect(code).toMatch(/export const weightLabel/)
    expect(KANNADA.test(code)).toBe(false)
  })
})
