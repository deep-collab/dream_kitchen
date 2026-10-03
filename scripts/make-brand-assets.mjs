// Generates favicons, app icons, the Open Graph image and the web manifest from the
// unaltered brand symbol (src/assets/symbol.svg).  Run:  npm run brand
import { writeFileSync, mkdirSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { chromium } from 'playwright'
import { readSymbol, gradientMarkup } from './symbol.mjs'
import { FONTS_EN } from '../src/config/fonts.js'

const PUBLIC = fileURLToPath(new URL('../public/', import.meta.url))
const INK = '#0F0F0F'
const sym = readSymbol()
const [, , VW, VH] = sym.viewBox.split(/\s+/).map(Number)

// The symbol placed inside a square of `size`, occupying `fraction` of its width.
function symbolInSquare(size, fraction, { radius = 0, background = INK, id = 'g', opacity = 1 } = {}) {
  const scale = (size * fraction) / VW
  const x = (size - VW * scale) / 2
  const y = (size - VH * scale) / 2
  const bg = background ? `<rect width="${size}" height="${size}" rx="${radius}" fill="${background}"/>` : ''
  return (
    `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${size} ${size}" width="${size}" height="${size}">` +
    `<defs>${gradientMarkup(sym, id)}</defs>${bg}` +
    `<path transform="translate(${x.toFixed(2)} ${y.toFixed(2)}) scale(${scale.toFixed(5)})" fill="url(#${id})" fill-rule="${sym.fillRule}" opacity="${opacity}" d="${sym.d}"/>` +
    `</svg>`
  )
}

const ogHtml = `<!doctype html><html><head><meta charset="utf-8">
<link rel="stylesheet" href="${FONTS_EN}">
<style>
  html,body{margin:0;width:1200px;height:630px;background:${INK};overflow:hidden}
  .frame{position:absolute;inset:26px;border:1px solid rgba(201,162,39,.38);border-radius:4px}
  .mark{position:absolute;right:-230px;bottom:-250px;width:620px;opacity:.045}
  .wrap{position:absolute;inset:0;display:flex;align-items:center;justify-content:center;gap:64px;padding:0 90px}
  .sym{width:300px;flex:none}
  .text{display:flex;flex-direction:column;align-items:flex-start}
  .name{margin:0;font:600 82px/1.0 Cinzel,serif;letter-spacing:.035em;text-transform:uppercase}
  .name span{display:block;background:linear-gradient(180deg,#EBD27A 0%,#D4AF37 55%,#B8901E 100%);-webkit-background-clip:text;background-clip:text;color:transparent}
  .sub{margin:22px 0 0;display:flex;align-items:center;gap:18px;font:600 24px/1 Cinzel,serif;letter-spacing:.26em;text-transform:uppercase;color:#D4AF37}
  .sub::after{content:"";width:90px;height:1px;background:#C9A227;opacity:.8}
  .tag{margin:34px 0 0;font:italic 600 40px/1.2 "Cormorant Garamond",serif;color:#CDBF9E;max-width:600px;text-wrap:balance}
</style></head><body>
<div class="frame"></div>
<div class="mark">${symbolInSquare(620, 1, { background: null, id: 'gm' })}</div>
<div class="wrap">
  <div class="sym">${symbolInSquare(300, 1, { background: null, id: 'gs' })}</div>
  <div class="text">
    <p class="name"><span>Dream</span><span>Kitchen</span></p>
    <p class="sub">Handmade chocolates</p>
    <p class="tag">Turning your cravings into sweet memories.</p>
  </div>
</div></body></html>`

async function main() {
  mkdirSync(PUBLIC, { recursive: true })

  // favicon.svg: rounded black tile so the gold reads on light and dark browser tabs
  writeFileSync(PUBLIC + 'favicon.svg', symbolInSquare(64, 0.8, { radius: 14 }))
  // Temporary product tile until Step 2 draws per-type line art
  writeFileSync(PUBLIC + 'products/placeholder.svg', symbolInSquare(400, 0.42, { opacity: 0.32 }))

  const browser = await chromium.launch()
  const page = await browser.newPage()
  const png = async (name, size, svg) => {
    await page.setViewportSize({ width: size, height: size })
    await page.setContent(`<html><body style="margin:0;background:transparent">${svg}</body></html>`)
    await page.screenshot({ path: PUBLIC + name, omitBackground: true, clip: { x: 0, y: 0, width: size, height: size } })
  }
  await png('favicon-32.png', 32, symbolInSquare(32, 0.84, { radius: 7 }))
  // iOS and Android mask these themselves: full-bleed black, symbol inside the safe zone
  await png('apple-touch-icon-180.png', 180, symbolInSquare(180, 0.66))
  await png('icon-192.png', 192, symbolInSquare(192, 0.62))
  await png('icon-512.png', 512, symbolInSquare(512, 0.62))

  await page.setViewportSize({ width: 1200, height: 630 })
  await page.setContent(ogHtml, { waitUntil: 'networkidle' })
  await page.evaluate(() => document.fonts.ready)
  await page.screenshot({ path: PUBLIC + 'og-image.png' })
  await browser.close()

  const manifest = {
    name: 'Dream Kitchen: Handmade Chocolates',
    short_name: 'Dream Kitchen',
    description: 'Handmade chocolates, loaded brownie tubs and delight boxes, made fresh to order.',
    start_url: '/',
    display: 'standalone',
    background_color: INK,
    theme_color: INK,
    icons: [
      { src: '/icon-192.png', sizes: '192x192', type: 'image/png', purpose: 'any' },
      { src: '/icon-512.png', sizes: '512x512', type: 'image/png', purpose: 'any' },
      { src: '/icon-512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
    ],
  }
  writeFileSync(PUBLIC + 'site.webmanifest', JSON.stringify(manifest, null, 2) + '\n')
  console.log('Brand assets written to public/')
}

main().catch((err) => {
  console.error(err)
  process.exit(1)
})
