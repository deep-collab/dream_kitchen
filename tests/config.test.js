import { readdirSync, readFileSync, statSync } from 'node:fs'
import { join } from 'node:path'
import { describe, expect, it } from 'vitest'
import { site, telLink, waLink } from '../src/config/site.js'

describe('phone number: one place only (src/config/site.js)', () => {
  const digits = site.phone.tel.replace(/^\+91/, '')

  it('every form of the number comes from the same 10 digits', () => {
    expect(digits).toMatch(/^[6-9]\d{9}$/)
    expect(site.phone.display.replace(/\D/g, '')).toBe(`91${digits}`)
    expect(site.phone.short.replace(/\D/g, '')).toBe(digits)
    expect(site.whatsapp).toBe(`91${digits}`)
    expect(telLink).toBe(`tel:+91${digits}`)
    expect(waLink('')).toBe(`https://wa.me/91${digits}`)
  })

  it('no other file spells the number out (website, server, scripts, tests)', () => {
    // The digits with any spaces, dashes or dots between them ("98765 43210", "9876-543210")
    const pattern = new RegExp(digits.split('').join('[\\s.-]?'))
    const roots = ['src', 'netlify', 'supabase', 'scripts', 'tests', 'public', 'index.html', 'vite.config.js', 'admin']
    const files = []
    const walk = (p) => {
      try {
        statSync(p).isDirectory() ? readdirSync(p).forEach((f) => walk(join(p, f))) : files.push(p)
      } catch {
        /* a root that doesn't exist yet */
      }
    }
    roots.forEach(walk)
    const textFiles = files.filter((f) => /\.(js|jsx|mjs|json|html|css|txt|webmanifest|xml|svg|toml|sql)$/.test(f))
    expect(textFiles.length).toBeGreaterThan(80)
    const offenders = textFiles.filter((f) => f.replaceAll('\\', '/') !== 'src/config/site.js' && pattern.test(readFileSync(f, 'utf8')))
    expect(offenders).toEqual([])
  })
})

describe('Instagram: one place only (src/config/site.js)', () => {
  const textFiles = () => {
    const files = []
    const walk = (p) => {
      try {
        statSync(p).isDirectory() ? readdirSync(p).forEach((f) => walk(join(p, f))) : files.push(p.replaceAll('\\', '/'))
      } catch {
        /* a root that doesn't exist yet */
      }
    }
    ;['src', 'netlify', 'scripts', 'public', 'admin', 'index.html', 'vite.config.js', 'netlify.toml'].forEach(walk)
    return files.filter((f) => /\.(js|jsx|mjs|json|html|css|txt|webmanifest|xml|svg|toml)$/.test(f))
  }
  // Every <a> whose address mentions Instagram, with its attributes
  const instagramLinks = (html) =>
    [...html.matchAll(/<a\b([^>]*)>([\s\S]*?)<\/a>/g)]
      .filter(([, attrs]) => /instagram/i.test(attrs))
      .map(([, attrs, inner]) => ({
        ...Object.fromEntries([...attrs.matchAll(/([\w-]+)="([^"]*)"/g)].map(([, k, v]) => [k, v])),
        text: inner.replace(/<[^>]+>/g, '').trim(),
      }))

  it('the handle and the exact profile address', () => {
    expect(site.instagramHandle).toBe('dreamkitchen_01_homemade')
    expect(site.instagramUrl).toBe('https://www.instagram.com/dreamkitchen_01_homemade/')
  })

  it('no other file spells the address out, and none uses an instagram:// app link', () => {
    const offenders = textFiles().filter((f) => f !== 'src/config/site.js' && /instagram\.com|instagram:\/\//i.test(readFileSync(f, 'utf8')))
    expect(offenders).toEqual([])
  })

  it('every Instagram link in the app reads the config address', () => {
    const jsx = textFiles().filter((f) => f.startsWith('src/') && f.endsWith('.jsx'))
    const hrefs = jsx.flatMap((f) => [...readFileSync(f, 'utf8').matchAll(/href=\{([^}]*instagram[^}]*)\}/gi)].map((m) => `${f}: ${m[1]}`))
    expect(hrefs.length).toBeGreaterThanOrEqual(3) // footer, Contact, Our Story
    for (const h of hrefs) expect(h).toMatch(/: site\.instagramUrl$/)
  })

  it('every Instagram link in the prerendered pages (English and Kannada) is the config address, in a new tab', async () => {
    const { PRERENDER_PAGES, prerenderPage } = await import('../scripts/prerender.mjs')
    const indexHtml = `<html><head><title>x</title><meta name="description" content="" /><meta property="og:title" content="" />
      <meta property="og:description" content="" /><meta property="og:url" content="" /><link rel="canonical" href="" /></head>
      <body><div id="root"></div></body></html>`
    for (const lang of ['en', 'kn']) {
      const t = JSON.parse(readFileSync(`src/i18n/${lang}.json`, 'utf8'))
      for (const page of PRERENDER_PAGES) {
        const links = instagramLinks(prerenderPage(indexHtml, page, t))
        expect(links.length, `${lang} ${page}`).toBeGreaterThanOrEqual(1) // at least the footer
        for (const link of links) {
          expect(link.href, `${lang} ${page}`).toBe(site.instagramUrl)
          expect(link.target).toBe('_blank')
          expect(link.rel).toBe('noopener noreferrer')
          expect(link['aria-label']).toContain(`@${site.instagramHandle}`)
          expect(link.onclick).toBeUndefined()
        }
        // The handle reads the same in both languages
        expect(links.some((l) => l.text === `@${site.instagramHandle}`), `${lang} ${page}`).toBe(true)
      }
    }
  })

  it('index.html takes its JSON-LD sameAs from the config', () => {
    expect(readFileSync('index.html', 'utf8')).toContain('"sameAs": ["{{dk:instagram}}"]')
    expect(readFileSync('vite.config.js', 'utf8')).toContain(".replace('{{dk:instagram}}', site.instagramUrl)")
  })
})

describe('supabase/setup-all.sql (the one file the owner pastes into Supabase)', () => {
  it('is up to date with the migrations and the seed (run: node scripts/setup-sql.mjs)', async () => {
    const { setupSql } = await import('../scripts/setup-sql.mjs')
    expect(readFileSync('supabase/setup-all.sql', 'utf8').replace(/\r\n/g, '\n')).toBe(setupSql())
  })

  it('runs in a fresh Postgres in one go, and again without errors', async () => {
    const { PGlite } = await import('@electric-sql/pglite')
    const { SHIM } = await import('./helpers/supabaseShim.js')
    const db = new PGlite()
    await db.exec(SHIM)
    const sql = readFileSync('supabase/setup-all.sql', 'utf8')
    await db.exec(sql)
    await db.exec(sql)
    expect((await db.query('select count(*)::int as n from public.products')).rows[0].n).toBe(17)
  }, 60_000)
})
