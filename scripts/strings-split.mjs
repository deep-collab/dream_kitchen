/*
  Vite plugin: English UI text arrives with the screen that shows it.

  en.json stays the one file people edit (and that the checks and Hema's Kannada list read).
  At build time it is cut into pieces:
    virtual:dk-strings/core       sections every page needs (menu, footer, buttons, dates…),
                                  part of the main bundle (src/i18n/strings.js)
    virtual:dk-strings/<section>  one section, e.g. 'checkout'. Importing it adds that
                                  section to the English dictionary.
  Rule (checked by scripts/check-i18n.mjs): a file that shows text from a section outside
  CORE imports that section itself, e.g. `import 'virtual:dk-strings/checkout'`, so the text
  is always there when its screen is, whichever page loaded it first.
  Kannada is not split: its one lazy chunk (src/i18n/kannada.js) has everything.
*/
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'

export const CORE_SECTIONS = ['brand', 'nav', 'common', 'footer', 'mobileBar', 'wa', 'header', 'notice', 'mobileMenu', 'hours', 'dates', 'units', 'langError', 'badges', 'callOptions', 'seo', 'cart']
const PREFIX = 'virtual:dk-strings/'

export default function stringsSplit() {
  let enPath
  let registry
  return {
    name: 'dk-strings-split',
    enforce: 'pre',
    configResolved(config) {
      enPath = resolve(config.root, 'src/i18n/en.json')
      registry = resolve(config.root, 'src/i18n/strings.js').replaceAll('\\', '/')
    },
    resolveId: (id) => (id.startsWith(PREFIX) ? `\0${id}` : null),
    load(id) {
      if (!id.startsWith(`\0${PREFIX}`)) return null
      this.addWatchFile(enPath)
      const en = JSON.parse(readFileSync(enPath, 'utf8'))
      const name = id.slice(PREFIX.length + 1)
      if (name === 'core') return `export default ${JSON.stringify(Object.fromEntries(CORE_SECTIONS.map((s) => [s, en[s]])))}`
      if (!(name in en)) this.error(`[dk-strings] en.json has no section "${name}"`)
      if (CORE_SECTIONS.includes(name)) this.error(`[dk-strings] "${name}" is already in the core strings; don't import it`)
      return `import { addEnglish } from '${registry}'\naddEnglish(${JSON.stringify({ [name]: en[name] })})\n`
    },
  }
}
