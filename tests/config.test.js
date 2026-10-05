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
