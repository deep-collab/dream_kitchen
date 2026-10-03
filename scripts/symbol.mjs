// Reads the brand symbol (src/assets/symbol.svg, kept byte-for-byte as supplied)
// and exposes its parts so the loader, sprite, favicons and OG image all share
// one source. Nothing here changes the artwork.
import { readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'

export const SYMBOL_FILE = fileURLToPath(new URL('../src/assets/symbol.svg', import.meta.url))

export function readSymbol() {
  const svg = readFileSync(SYMBOL_FILE, 'utf8')
  const viewBox = svg.match(/viewBox="([^"]+)"/)[1]
  const d = svg.match(/<path[^>]*\sd="([^"]+)"/)[1]
  const fillRule = svg.match(/<path[^>]*fill-rule="([^"]+)"/)?.[1] || 'nonzero'
  const gradient = svg.match(/<linearGradient([^>]*)>/)[1]
  const attr = (name) => gradient.match(new RegExp(`${name}="([^"]+)"`))?.[1]
  const stops = [...svg.matchAll(/<stop offset="([^"]+)" stop-color="([^"]+)"/g)].map(([, offset, color]) => ({ offset, color }))
  return { svg, viewBox, d, fillRule, stops, x1: attr('x1'), y1: attr('y1'), x2: attr('x2'), y2: attr('y2') }
}

// <linearGradient> markup with a chosen id (same stops and direction as the file)
export function gradientMarkup(sym, id) {
  const stops = sym.stops.map((s) => `<stop offset="${s.offset}" stop-color="${s.color}"/>`).join('')
  return `<linearGradient id="${id}" x1="${sym.x1}" y1="${sym.y1}" x2="${sym.x2}" y2="${sym.y2}">${stops}</linearGradient>`
}

// Hidden inline sprite: one copy of the path, referenced by <use href="#dk-symbol">
// from the loading screen and from React. Not display:none, so gradients render.
export function spriteMarkup(sym) {
  return (
    `<svg id="dk-sprite" aria-hidden="true" focusable="false" width="0" height="0" ` +
    `style="position:absolute;width:0;height:0;overflow:hidden">` +
    `<defs>${gradientMarkup(sym, 'dk-gold')}` +
    `<path id="dk-symbol" fill-rule="${sym.fillRule}" pathLength="1" d="${sym.d}"/></defs></svg>`
  )
}
