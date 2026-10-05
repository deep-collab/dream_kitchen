/*
  Vite plugin: English visitors never download Kannada menu text.

  The data files (src/data/*.js, plus the shop config src/config/shop.js) are written with both
  languages side by side,
  { en: 'Mango', kn: 'ಮಾವು' }, which is how Hema's admin panel will store them later.
  In the browser build:
    - every { en, kn } pair loses its `kn` half, so the data in the main bundle is English only;
    - the Kannada halves go into the Kannada JSON file ({ 'Mango': 'ಮಾವು', ... }, see below),
      fetched only when someone chooses ಕನ್ನಡ.
  pick() then finds the Kannada by the English text (src/i18n/I18nProvider.jsx).

  The build stops if a data file still contains Kannada after the split (e.g. built from a
  template string), or if one English text has two different Kannada translations.
  Unit tests (Vitest) read the data files untouched.
*/
import { readdirSync, readFileSync } from 'node:fs'
import { createHash } from 'node:crypto'
import { join, resolve } from 'node:path'
import { parseAst } from 'vite'

export const KANNADA = /[ಀ-೿]/

const text = (node) => {
  if (node?.type === 'Literal' && typeof node.value === 'string') return node.value
  if (node?.type === 'TemplateLiteral' && node.expressions.length === 0) return node.quasis.map((q) => q.value.cooked).join('')
  return null
}
const keyName = (p) => (p.key.type === 'Identifier' ? p.key.name : p.key.value)

/** Finds every { en: '…', kn: '…' } object. -> [{ en, kn, cut: [start, end] }] (cut removes the kn property) */
export function findPairs(code) {
  const pairs = []
  const visit = (node) => {
    if (!node || typeof node !== 'object') return
    if (Array.isArray(node)) return node.forEach(visit)
    if (node.type === 'ObjectExpression' && node.properties.length === 2 && node.properties.every((p) => p.type === 'Property' && !p.computed)) {
      const [a, b] = node.properties
      const names = [keyName(a), keyName(b)]
      if (names.includes('en') && names.includes('kn')) {
        const enProp = names[0] === 'en' ? a : b
        const knProp = names[0] === 'kn' ? a : b
        const en = text(enProp.value)
        const kn = text(knProp.value)
        if (en !== null && kn !== null) {
          // remove ", kn: '…'" (or "kn: '…', " when kn comes first)
          pairs.push({ en, kn, cut: knProp === b ? [a.end, b.end] : [a.start, b.start] })
          return
        }
      }
    }
    for (const k in node) if (k !== 'parent' && node[k] && typeof node[k] === 'object') visit(node[k])
  }
  visit(parseAst(code))
  return pairs
}

/** Data file without its Kannada halves. Throws if Kannada is left anywhere in it. */
export function stripKannada(code, id = 'data file') {
  let out = code
  for (const { cut } of findPairs(code).sort((x, y) => y.cut[0] - x.cut[0])) out = out.slice(0, cut[0]) + out.slice(cut[1])
  // Kannada inside comments is harmless (comments are dropped), so only check the code
  const left = out.replace(/\/\*[\s\S]*?\*\/|\/\/[^\n]*/g, '').match(new RegExp(`.{0,30}${KANNADA.source}.{0,30}`))
  if (left) throw new Error(`[dk-kannada-split] ${id} still has Kannada after the split, near: ${left[0].trim()}\nWrite it as a { en, kn } pair of plain strings.`)
  return out
}

/** Files whose { en, kn } pairs are split: every src/data/*.js and the shop config */
export const DATA_FILES = ['src/config/shop.js']
export const dataFiles = (root) => [
  ...readdirSync(resolve(root, 'src/data'))
    .filter((f) => f.endsWith('.js'))
    .map((f) => join(resolve(root, 'src/data'), f)),
  ...DATA_FILES.map((f) => resolve(root, f)),
]

/** { english: kannada } from every data file. Throws on an English text with two translations. */
export function kannadaTable(root) {
  const table = {}
  for (const file of dataFiles(root)) {
    for (const { en, kn } of findPairs(readFileSync(file, 'utf8'))) {
      if (table[en] !== undefined && table[en] !== kn) throw new Error(`[dk-kannada-split] "${en}" has two Kannada translations: "${table[en]}" and "${kn}". Use one.`)
      table[en] = kn
    }
  }
  return table
}

/*
  All Kannada, as one JSON file the browser fetches only when someone chooses ಕನ್ನಡ:
  { kn: <kn.json>, menu: <English menu text -> Kannada> }. Data, not code, on purpose: browsers
  remember a failed import() of a script for the life of the page, so after a dropped signal a
  script could never load again; a failed fetch() can simply be retried.
    build: written as assets/kannada-<hash>.json; virtual:dk-kannada-url exports its address
    dev:   served fresh at /__dk/kannada.json
*/
const URL_VIRTUAL = 'virtual:dk-kannada-url'
const URL_RESOLVED = '\0dk-kannada-url'
const DEV_URL = '/__dk/kannada.json'

export function kannadaPayload(root) {
  const kn = JSON.parse(readFileSync(resolve(root, 'src/i18n/kn.json'), 'utf8'))
  return JSON.stringify({ kn, menu: kannadaTable(root) })
}

/** The built file's name: changes whenever any Kannada changes, so browsers never keep an old copy */
export const kannadaFileName = (root) => `assets/kannada-${createHash('sha256').update(kannadaPayload(root)).digest('hex').slice(0, 10)}.json`

export default function kannadaSplit() {
  let dataDir
  let extra = []
  let root
  let building = false
  let fileName
  const isData = (id) => {
    const path = id.replaceAll('\\', '/')
    return (path.startsWith(dataDir) && path.endsWith('.js')) || extra.includes(path)
  }
  return {
    name: 'dk-kannada-split',
    enforce: 'pre',
    configResolved(config) {
      root = config.root
      building = config.command === 'build'
      dataDir = resolve(config.root, 'src/data').replaceAll('\\', '/') + '/'
      extra = DATA_FILES.map((f) => resolve(config.root, f).replaceAll('\\', '/'))
    },
    configureServer(server) {
      server.middlewares.use(DEV_URL, (req, res) => {
        res.setHeader('Content-Type', 'application/json; charset=utf-8')
        res.end(kannadaPayload(root))
      })
    },
    resolveId: (id) => (id === URL_VIRTUAL ? URL_RESOLVED : null),
    load(id) {
      if (id !== URL_RESOLVED) return null
      if (!building) return `export default ${JSON.stringify(DEV_URL)}`
      fileName = kannadaFileName(root)
      return `export default ${JSON.stringify(`/${fileName}`)}`
    },
    generateBundle() {
      if (fileName) this.emitFile({ type: 'asset', fileName, source: kannadaPayload(root) })
    },
    transform(code, id, options) {
      // Unit tests and the server (the dev API loads the functions through Vite's SSR) read the
      // data files as written: order records and emails need the Kannada names
      if (process.env.VITEST || options?.ssr || !isData(id.split('?')[0])) return null
      return { code: stripKannada(code, id), map: null }
    },
  }
}
