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
