// Generates the original hand-drawn-style SVG illustrations used as
// SAMPLE product placeholders, the hero collage and the doodle background.
// Run: node scripts/make-art.mjs   (writes into public/)
import { writeFileSync, mkdirSync } from 'node:fs'

const C = {
  ink: '#3A2216', deep: '#2E1A12', dark: '#4A2C1D', choc: '#6B3F26', brown: '#8B5E3C',
  cocoa: '#A0673F', caramel: '#C98B4F', mid: '#C9A98A', tint: '#EBDCCB', cream: '#FBF6EE',
  off: '#FFFDF9', gold: '#D4A93A', goldSoft: '#EBCB7A', pink: '#F1C9C1', rose: '#E39C98',
  pist: '#A9C07E', leaf: '#93A96E', milk: '#B27A4E', white: '#FFFFFF',
}

let seed = 7
const rnd = () => ((seed = (seed * 16807) % 2147483647) / 2147483647)
const j = (a) => (rnd() - 0.5) * 2 * a
const n = (v) => Math.round(v * 10) / 10
const P = (p) => `${n(p[0])},${n(p[1])}`

// closed Catmull-Rom spline through points -> smooth, slightly wobbly outline
function closed(pts) {
  let d = `M${P(pts[0])}`
  const L = pts.length
  for (let i = 0; i < L; i++) {
    const p0 = pts[(i - 1 + L) % L], p1 = pts[i], p2 = pts[(i + 1) % L], p3 = pts[(i + 2) % L]
    const c1 = [p1[0] + (p2[0] - p0[0]) / 6, p1[1] + (p2[1] - p0[1]) / 6]
    const c2 = [p2[0] - (p3[0] - p1[0]) / 6, p2[1] - (p3[1] - p1[1]) / 6]
    d += `C${P(c1)} ${P(c2)} ${P(p2)}`
  }
  return d + 'Z'
}
function open(pts) {
  let d = `M${P(pts[0])}`
  for (let i = 0; i < pts.length - 1; i++) {
    const p0 = pts[Math.max(0, i - 1)], p1 = pts[i], p2 = pts[i + 1], p3 = pts[Math.min(pts.length - 1, i + 2)]
    const c1 = [p1[0] + (p2[0] - p0[0]) / 6, p1[1] + (p2[1] - p0[1]) / 6]
    const c2 = [p2[0] - (p3[0] - p1[0]) / 6, p2[1] - (p3[1] - p1[1]) / 6]
    d += `C${P(c1)} ${P(c2)} ${P(p2)}`
  }
  return d
}
function ellipsePts(cx, cy, rx, ry, jit = 0.04, k = 14) {
  const pts = []
  for (let i = 0; i < k; i++) {
    const a = (i / k) * Math.PI * 2
    const f = 1 + j(jit)
    pts.push([cx + Math.cos(a) * rx * f, cy + Math.sin(a) * ry * f])
  }
  return pts
}
function rectPts(x, y, w, h, r = 6, jit = 1.2) {
  const pts = []
  const edge = (ax, ay, bx, by) => {
    const len = Math.hypot(bx - ax, by - ay)
    const steps = Math.max(2, Math.round(len / 28))
    for (let i = 0; i <= steps; i++) {
      const t = i / steps
      pts.push([ax + (bx - ax) * t + j(jit), ay + (by - ay) * t + j(jit)])
    }
  }
  edge(x + r, y, x + w - r, y)
  edge(x + w, y + r, x + w, y + h - r)
  edge(x + w - r, y + h, x + r, y + h)
  edge(x, y + h - r, x, y + r)
  return pts
}
const path = (d, fill, o = {}) =>
  `<path d="${d}" fill="${fill}"${o.stroke ? ` stroke="${o.stroke}" stroke-width="${o.sw ?? 3}" stroke-linecap="round" stroke-linejoin="round"` : ''}${o.op != null ? ` opacity="${o.op}"` : ''}/>`
const line = (pts, stroke, sw = 2.5, op) => path(open(pts), 'none', { stroke, sw, op })
const seg = (a, b, stroke, sw = 2.5, op) => {
  const m = [(a[0] + b[0]) / 2 + j(1.5), (a[1] + b[1]) / 2 + j(1.5)]
  return line([a, m, b], stroke, sw, op)
}
// watercolour fill: a soft offset wash + the outlined shape
function wash(pts, fill, { stroke = C.ink, sw = 3, washFill, shift = 4 } = {}) {
  const off = pts.map(([x, y]) => [x + shift + j(1.5), y + shift * 0.6 + j(1.5)])
  return path(closed(off), washFill || fill, { op: 0.45 }) + path(closed(pts), fill, { stroke, sw })
}
const g = (inner, t = '') => `<g${t ? ` transform="${t}"` : ''}>${inner}</g>`

/* ---------- motifs ---------- */
function heart(cx, cy, s, fill = C.rose, stroke = C.ink, sw = 2.5) {
  const pts = []
  for (let i = 0; i < 18; i++) {
    const t = (i / 18) * Math.PI * 2
    const x = 16 * Math.sin(t) ** 3
    const y = -(13 * Math.cos(t) - 5 * Math.cos(2 * t) - 2 * Math.cos(3 * t) - Math.cos(4 * t))
    pts.push([cx + (x / 17) * s + j(0.5), cy + (y / 17) * s + j(0.5)])
  }
  return path(closed(pts), fill, { stroke, sw })
}
function daisy(cx, cy, r, petal = C.off, center = C.goldSoft, stroke = C.ink, sw = 2) {
  let s = ''
  for (let i = 0; i < 7; i++) {
    const a = (i / 7) * Math.PI * 2 + 0.3
    const px = cx + Math.cos(a) * r, py = cy + Math.sin(a) * r
    s += g(path(closed(ellipsePts(0, 0, r * 0.62, r * 0.36, 0.05, 10)), petal, { stroke, sw }), `translate(${n(px)} ${n(py)}) rotate(${n((a * 180) / Math.PI)})`)
  }
  return s + path(closed(ellipsePts(cx, cy, r * 0.48, r * 0.48, 0.06, 10)), center, { stroke, sw })
}
function sparkle(cx, cy, s, stroke = C.gold, sw = 2.5) {
  return seg([cx - s, cy], [cx + s, cy], stroke, sw) + seg([cx, cy - s], [cx, cy + s], stroke, sw)
}
function dots(cx, cy, rx, ry, count, fill, r = 3) {
  let s = ''
  for (let i = 0; i < count; i++) {
    const a = rnd() * Math.PI * 2, d = Math.sqrt(rnd())
    s += path(closed(ellipsePts(cx + Math.cos(a) * rx * d, cy + Math.sin(a) * ry * d, r, r * 0.8, 0.1, 6)), fill)
  }
  return s
}
function truffle(cx, cy, r, fill = C.choc, top = 'swirl') {
  let s = wash(ellipsePts(cx, cy, r, r * 0.92, 0.035, 14), fill, { washFill: C.cocoa })
  s += line([[cx - r * 0.55, cy - r * 0.35], [cx - r * 0.3, cy - r * 0.6], [cx - r * 0.05, cy - r * 0.68]], C.white, 3, 0.55)
  if (top === 'swirl') s += line([[cx - r * 0.5, cy + r * 0.05], [cx - r * 0.2, cy - r * 0.25], [cx + r * 0.2, cy - r * 0.1], [cx - r * 0.1, cy + r * 0.15], [cx + r * 0.45, cy + r * 0.1]], C.caramel, 3)
  if (top === 'dust') s += dots(cx, cy, r * 0.6, r * 0.55, 14, C.brown, 2)
  if (top === 'nuts') s += dots(cx, cy, r * 0.6, r * 0.55, 9, C.caramel, 3.5)
  if (top === 'rose') s += dots(cx, cy - r * 0.15, r * 0.55, r * 0.4, 7, C.rose, 3.5) + dots(cx, cy, r * 0.6, r * 0.5, 6, C.pist, 3)
  if (top === 'gold') s += dots(cx, cy - r * 0.2, r * 0.5, r * 0.3, 7, C.gold, 2.5)
  if (top === 'bean') {
    s += path(closed(ellipsePts(cx + r * 0.1, cy - r * 0.1, r * 0.32, r * 0.22, 0.03, 10)), C.dark, { stroke: C.ink, sw: 2 })
    s += line([[cx - r * 0.18, cy - r * 0.12], [cx + r * 0.1, cy - r * 0.02], [cx + r * 0.38, cy - r * 0.1]], C.caramel, 2)
  }
  return s
}
function cup(cx, top, w, h, fill = C.goldSoft) {
  const pts = [[cx - w / 2, top], [cx + w / 2, top], [cx + w * 0.38, top + h], [cx - w * 0.38, top + h]]
  let s = wash(pts.map((p) => [p[0] + j(1), p[1] + j(1)]), fill, { washFill: C.gold })
  for (let i = 1; i < 6; i++) {
    const t = i / 6
    s += seg([cx - w / 2 + w * t, top + 3], [cx - w * 0.38 + w * 0.76 * t, top + h - 3], C.ink, 1.8, 0.6)
  }
  return s
}
function truffleInCup(cx, cy, r, fill, top, cupFill) {
  return cup(cx, cy + r * 0.45, r * 2.1, r * 0.75, cupFill) + truffle(cx, cy, r, fill, top)
}
function bar(x, y, w, h, { fill = C.choc, rows = 4, cols = 3, wrap = C.gold, wrapH = 0.42, label } = {}) {
  let s = wash(rectPts(x, y, w, h, 8, 1.2), fill, { washFill: C.cocoa })
  const pw = w / cols, ph = (h * (1 - wrapH * 0.7)) / rows
  for (let r = 0; r < rows; r++)
    for (let c = 0; c < cols; c++)
      s += path(closed(rectPts(x + c * pw + 6, y + r * ph + 6, pw - 12, ph - 12, 4, 0.8)), C.brown, { stroke: C.ink, sw: 1.8, op: 0.9 })
  if (wrap) {
    const wy = y + h * (1 - wrapH)
    const pts = []
    for (let i = 0; i <= 8; i++) pts.push([x - 4 + ((w + 8) * i) / 8, wy + (i % 2 ? -9 : 4) + j(2)])
    pts.push([x + w + 4, y + h + 4], [x - 4, y + h + 4])
    s += path(closed(pts.map((p) => [p[0] + 4, p[1] + 3])), C.goldSoft, { op: 0.5 })
    s += path(closed(pts), wrap === 'paper' ? C.off : wrap, { stroke: C.ink, sw: 3 })
    const ly = wy + (h * wrapH) / 2
    s += path(closed(rectPts(x + w * 0.18, ly - 14, w * 0.64, 30, 8, 0.8)), C.dark, { stroke: C.ink, sw: 2 })
    if (label === 'heart') s += heart(x + w / 2, ly + 1, 9, C.rose, C.goldSoft, 1.5)
    else s += seg([x + w * 0.28, ly + 1], [x + w * 0.72, ly + 1], C.goldSoft, 3)
  }
  return s
}
function slab(x, y, w, h) {
  let s = wash(rectPts(x, y, w, h, 10, 2.5), C.milk, { washFill: C.caramel })
  s += dots(x + w / 2, y + h / 2, w * 0.42, h * 0.38, 10, C.caramel, 6)
  s += dots(x + w / 2, y + h / 2, w * 0.42, h * 0.38, 8, C.dark, 4.5)
  s += dots(x + w / 2, y + h / 2, w * 0.42, h * 0.38, 6, C.pist, 3.5)
  for (let i = 0; i < 3; i++) s += seg([x + 12 + i * 30, y + h - 12], [x + 30 + i * 30, y + h - 30], C.ink, 1.6, 0.4)
  return s
}
function brownie(x, y, s, { top = 'walnut', fill = C.dark } = {}) {
  let o = ''
  // side
  o += wash(rectPts(x, y + s * 0.22, s, s * 0.78, 6, 1), fill, { washFill: C.choc })
  // crinkly top surface
  const pts = []
  for (let i = 0; i <= 10; i++) pts.push([x + (s * i) / 10, y + (i % 2 ? 3 : -3) + j(2)])
  pts.push([x + s, y + s * 0.3], [x, y + s * 0.3])
  o += path(closed(pts), C.choc, { stroke: C.ink, sw: 3 })
  o += line([[x + s * 0.15, y + s * 0.1], [x + s * 0.35, y + s * 0.16], [x + s * 0.5, y + s * 0.08]], C.cocoa, 2)
  o += line([[x + s * 0.6, y + s * 0.18], [x + s * 0.85, y + s * 0.1]], C.cocoa, 2)
  // crumb texture on side
  o += dots(x + s / 2, y + s * 0.65, s * 0.42, s * 0.25, 10, C.choc, 2.2)
  if (top === 'walnut') {
    for (const [dx, dy] of [[0.28, 0.02], [0.7, 0.04]]) {
      o += path(closed(ellipsePts(x + s * dx, y + s * dy, s * 0.12, s * 0.08, 0.12, 10)), C.caramel, { stroke: C.ink, sw: 2 })
      o += seg([x + s * dx - s * 0.08, y + s * dy], [x + s * dx + s * 0.08, y + s * dy], C.brown, 1.5)
    }
  }
  if (top === 'chips') o += dots(x + s / 2, y + s * 0.08, s * 0.4, s * 0.08, 8, C.deep, 4)
  if (top === 'swirl') o += line([[x + s * 0.12, y + s * 0.12], [x + s * 0.3, y], [x + s * 0.5, y + s * 0.14], [x + s * 0.7, y], [x + s * 0.88, y + s * 0.12]], C.caramel, 5)
  if (top === 'sugar') o += dots(x + s / 2, y + s * 0.08, s * 0.42, s * 0.08, 14, C.off, 2)
  return o
}
function giftBox(x, y, w, h, { fill = C.dark, ribbon = C.gold, bow = true } = {}) {
  let s = wash(rectPts(x, y + h * 0.22, w, h * 0.78, 6, 1.2), fill, { washFill: C.choc })
  s += wash(rectPts(x - w * 0.05, y, w * 1.1, h * 0.26, 6, 1), fill === C.dark ? C.choc : C.tint, { washFill: C.cocoa })
  s += path(closed(rectPts(x + w * 0.44, y, w * 0.12, h, 2, 0.6)), ribbon, { stroke: C.ink, sw: 2.5 })
  s += path(closed(rectPts(x - w * 0.05, y + h * 0.08, w * 1.1, h * 0.09, 2, 0.6)), ribbon, { stroke: C.ink, sw: 2.5 })
  if (bow) {
    const cx = x + w / 2, cy = y - 2
    s += path(closed([[cx, cy], [cx - w * 0.28, cy - h * 0.22], [cx - w * 0.3, cy + h * 0.02]]), ribbon, { stroke: C.ink, sw: 2.5 })
    s += path(closed([[cx, cy], [cx + w * 0.28, cy - h * 0.22], [cx + w * 0.3, cy + h * 0.02]]), ribbon, { stroke: C.ink, sw: 2.5 })
    s += path(closed(ellipsePts(cx, cy, w * 0.06, w * 0.05, 0.05, 8)), C.goldSoft, { stroke: C.ink, sw: 2.5 })
  }
  return s
}
function openBox(x, y, w, h, items) {
  let s = wash(rectPts(x, y, w, h, 10, 1.2), C.dark, { washFill: C.choc })
  s += path(closed(rectPts(x + 10, y + 10, w - 20, h - 20, 6, 0.8)), C.tint, { stroke: C.ink, sw: 2 })
  s += items
  return s
}
function basket(cx, y, w, h) {
  const pts = [[cx - w / 2, y], [cx + w / 2, y], [cx + w * 0.4, y + h], [cx - w * 0.4, y + h]]
  let s = wash(pts.map((p) => [p[0] + j(1), p[1] + j(1)]), C.caramel, { washFill: C.goldSoft })
  for (let i = 1; i < 4; i++) {
    const t = i / 4
    s += line([[cx - w / 2 + w * 0.1 * t, y + h * t], [cx, y + h * t + 3], [cx + w / 2 - w * 0.1 * t, y + h * t]], C.brown, 2)
  }
  for (let i = 1; i < 7; i++) s += seg([cx - w / 2 + (w * i) / 7, y + 4], [cx - w * 0.4 + (w * 0.8 * i) / 7, y + h - 4], C.brown, 1.6, 0.7)
  s += path(closed(rectPts(cx - w / 2 - 6, y - 8, w + 12, 18, 9, 0.8)), C.cocoa, { stroke: C.ink, sw: 3 })
  return s
}
function cocoaPod(cx, cy, s, rot = 0, fill = C.caramel) {
  let o = wash(ellipsePts(0, 0, s * 0.42, s, 0.03, 14), fill, { washFill: C.goldSoft })
  for (const dx of [-0.2, 0, 0.2]) o += line([[dx * s, -s * 0.9], [dx * s * 1.3, 0], [dx * s, s * 0.9]], C.brown, 2)
  o += path(closed([[0, -s * 0.95], [s * 0.5, -s * 1.4], [s * 0.15, -s * 1.5]]), C.leaf, { stroke: C.ink, sw: 2.5 })
  return g(o, `translate(${cx} ${cy}) rotate(${rot})`)
}
function leaf(cx, cy, s, rot = 0, fill = C.leaf) {
  const o = path(closed([[0, -s], [s * 0.45, 0], [0, s], [-s * 0.45, 0]]), fill, { stroke: C.ink, sw: 2.2 }) + seg([0, -s * 0.9], [0, s * 0.9], C.ink, 1.6, 0.6)
  return g(o, `translate(${cx} ${cy}) rotate(${rot})`)
}

/* ---------- scene wrapper for product cards ---------- */
function scene(inner, bg = C.tint) {
  seed += 13
  let deco = path(closed(ellipsePts(200, 214, 150, 140, 0.07, 16)), bg, { op: 0.9 })
  deco += path(closed(ellipsePts(214, 226, 140, 128, 0.08, 16)), C.off, { op: 0.35 })
  deco += sparkle(64, 78, 9) + sparkle(340, 330, 7) + heart(338, 82, 9, C.pink, C.ink, 2) + daisy(64, 336, 11)
  deco += path(closed(ellipsePts(200, 336, 120, 12, 0.05, 12)), C.mid, { op: 0.35 })
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 400 400"><rect width="400" height="400" fill="${C.cream}"/>${deco}${inner}</svg>`
}

const products = {
  'dark-bar': () => scene(g(bar(130, 90, 140, 230, { fill: C.dark, rows: 4, cols: 3 }), 'rotate(-8 200 205)'), C.tint),
  'name-bar': () => scene(g(bar(130, 90, 140, 230, { fill: C.choc, wrap: C.rose, label: 'heart' }), 'rotate(7 200 205)') + heart(300, 140, 14, C.rose), '#F3DCD3'),
  'rocher': () => scene([[150, 250], [250, 250], [200, 255], [175, 190], [228, 192], [202, 135]].map(([x, y]) => truffle(x, y, 40, C.milk, 'nuts')).join(''), '#F0DFC4'),
  'fruit-nut': () => scene(g(slab(95, 120, 210, 170), 'rotate(-6 200 205)') + leaf(320, 120, 18, 30), C.tint),
  'walnut-brownie': () => scene(brownie(115, 140, 170, { top: 'walnut' }), '#E9D3BC'),
  'eggless-brownie': () => scene(brownie(115, 140, 170, { top: 'chips', fill: C.deep }) + daisy(318, 140, 14), '#EADCC8'),
  'brownie-box': () => scene(openBox(80, 105, 240, 200, [0, 1, 2].flatMap((c) => [0, 1].map((r) => brownie(98 + c * 72, 130 + r * 82, 60, { top: ['walnut', 'chips', 'sugar', 'swirl', 'chips', 'walnut'][c * 2 + r] }))).join('')), '#E6D2BD'),
  'swirl-brownie': () => scene(brownie(115, 140, 170, { top: 'swirl' }) + sparkle(318, 150, 10), '#EEDCC5'),
  'dark-truffles': () => scene(openBox(90, 95, 220, 220, [0, 1, 2].flatMap((c) => [0, 1, 2].map((r) => truffle(135 + c * 65, 140 + r * 65, 26, C.dark, ['swirl', 'dust', 'gold'][(c + r) % 3]))).join('')), C.tint),
  'coffee-truffles': () => scene(truffleInCup(140, 200, 48, C.choc, 'bean', C.goldSoft) + truffleInCup(260, 220, 48, C.dark, 'dust', C.tint) + truffleInCup(200, 290, 40, C.choc, 'bean', C.goldSoft), '#E9D9C3'),
  'rose-truffles': () => scene(truffleInCup(145, 200, 48, C.choc, 'rose', C.pink) + truffleInCup(258, 215, 48, C.dark, 'rose', C.pink) + leaf(200, 120, 20, -20, C.pist) + heart(205, 300, 16, C.rose), '#F2DAD2'),
  'little-hamper': () => scene(g(bar(150, 90, 60, 110, { fill: C.dark, rows: 3, cols: 2, wrapH: 0.5 }), 'rotate(-12 180 145)') + truffle(240, 160, 30, C.choc, 'swirl') + daisy(282, 128, 13) + basket(200, 200, 210, 120), '#EFDFC6'),
  'grand-hamper': () => scene(giftBox(225, 165, 110, 110, { fill: C.choc }) + basket(165, 215, 190, 105) + g(bar(110, 115, 54, 100, { fill: C.dark, rows: 3, cols: 2, wrapH: 0.5 }), 'rotate(-10 137 165)') + truffle(195, 190, 26, C.dark, 'gold') + sparkle(318, 112, 10) + sparkle(90, 120, 8), '#F1E1C4'),
  'custom-box': () => scene(openBox(80, 105, 240, 200, [[0, 0, 'swirl'], [1, 0, 'rose'], [2, 0, 'nuts'], [0, 1, 'gold'], [2, 1, 'dust']].map(([c, r, t]) => truffle(130 + c * 70, 160 + r * 85, 28, [C.dark, C.choc, C.milk][(c + r) % 3], t)).join('') + heart(200, 245, 22, C.rose)), C.tint),
}

/* ---------- hero collage ---------- */
function hero() {
  seed = 99
  let s = path(closed(ellipsePts(300, 300, 260, 240, 0.07, 18)), C.tint, { op: 0.95 })
  s += path(closed(ellipsePts(318, 316, 240, 220, 0.08, 18)), C.off, { op: 0.4 })
  s += cocoaPod(120, 170, 70, -25)
  s += giftBox(330, 120, 170, 160, { fill: C.dark })
  s += g(bar(150, 250, 120, 200, { fill: C.choc, rows: 4, cols: 3 }), 'rotate(-10 210 350)')
  s += truffleInCup(370, 370, 52, C.dark, 'gold', C.goldSoft)
  s += truffleInCup(480, 400, 42, C.choc, 'swirl', C.tint)
  s += brownie(300, 440, 90, { top: 'walnut' })
  s += heart(520, 300, 16, C.rose) + heart(90, 330, 12, C.pink)
  s += daisy(110, 470, 16) + daisy(520, 170, 13)
  s += sparkle(280, 70, 12) + sparkle(540, 500, 10) + sparkle(70, 80, 8)
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 600 600">${s}</svg>`
}

/* ---------- doodle background tile (faint, outline-led) ---------- */
function doodles() {
  seed = 4242
  const soft = { ink: '#8B5E3C' }
  const items = []
  const T = (inner, x, y, r, sc = 1) => items.push(g(inner, `translate(${x} ${y}) rotate(${r}) scale(${sc})`))
  const ink = C.ink
  // temporarily soften ink for the tile
  C.ink = soft.ink
  T(bar(-30, -50, 60, 100, { fill: C.mid, rows: 3, cols: 2, wrap: C.goldSoft, wrapH: 0.4 }), 70, 80, -18, 0.8)
  T(truffleInCup(0, 0, 26, C.mid, 'swirl', C.tint), 250, 60, 8, 0.85)
  T(heart(0, 0, 14, C.pink), 380, 120, 12)
  T(daisy(0, 0, 12, C.off, C.goldSoft), 170, 170, 0)
  T(cocoaPod(0, 0, 34, 0, C.goldSoft), 420, 260, 30, 0.8)
  T(brownie(-35, -35, 70, { fill: C.mid, top: 'walnut' }), 90, 300, -8, 0.8)
  T(giftBox(-35, -35, 70, 70, { fill: C.tint, ribbon: C.pink }), 280, 250, 6, 0.85)
  T(heart(0, 0, 10, C.goldSoft), 40, 200, -15)
  T(daisy(0, 0, 10, C.off, C.pink), 360, 400, 0)
  T(truffle(0, 0, 22, C.tint, 'dust'), 200, 400, 0)
  T(sparkle(0, 0, 8, C.gold, 2), 330, 30, 0)
  T(sparkle(0, 0, 7, C.gold, 2), 150, 250, 0)
  T(heart(0, 0, 9, C.pink), 450, 440, 10)
  T(daisy(0, 0, 9, C.off, C.goldSoft), 30, 440, 0)
  T(bar(-25, -40, 50, 80, { fill: C.tint, rows: 3, cols: 2, wrap: C.pink, wrapH: 0.45 }), 440, 170, 20, 0.7)
  C.ink = ink
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 480 480" width="480" height="480"><g opacity="0.55">${items.join('')}</g></svg>`
}

mkdirSync('public/products', { recursive: true })
for (const [k, fn] of Object.entries(products)) writeFileSync(`public/products/${k}.svg`, fn())
writeFileSync('public/hero-art.svg', hero())
writeFileSync('public/doodles.svg', doodles())
console.log('Wrote', Object.keys(products).length, 'product images + hero + doodles')
