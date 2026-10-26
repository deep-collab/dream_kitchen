/*
  The festival backgrounds (developer options -> Site background), drawn on one <canvas> each.
  Loaded only while a festival theme is on (a separate file), so everyday visitors download none of it.

  Light on phones: at most 30 frames a second, at most 1.5 device pixels per CSS pixel, a few dozen
  shapes, no images or video. The drawing stops while the tab is hidden, and with "reduce motion"
  (or animation switched off) one still frame is drawn and nothing moves. How faint it is comes from
  the canvas's CSS opacity (the admin's slider), so the shapes here use their full colours.

  startTheme(canvas, { id, animate, dark }) -> stop()
    dark: drawn on black (the home hero) rather than on the cream pages
*/

const FPS = 30
const TAU = Math.PI * 2
// A fixed sequence, so every visit (and the still frame) looks the same
function seeded(seed) {
  let s = seed >>> 0
  return () => ((s = (s * 1664525 + 1013904223) >>> 0) / 4294967296)
}

/* ---------- Kannada Rajyotsava: the Karnataka flag (yellow over red), softly waving ---------- */
function flag(g, w, h, t) {
  const fw = Math.min(w * 0.86, 1100)
  const fh = Math.min(fw * 0.6, h * 0.62)
  const x0 = (w - fw) / 2
  const y0 = h * 0.46 - fh / 2
  const strip = Math.max(3, Math.round(fw / 160))
  for (let x = 0; x < fw; x += strip) {
    const k = x / fw
    // the wave grows from the pole side (left) to the free end
    const wave = Math.sin(k * 7 - t * 1.6) * fh * 0.06 * k + Math.sin(k * 3.1 - t * 0.9) * fh * 0.025
    const shade = 0.82 + 0.18 * Math.cos(k * 7 - t * 1.6)
    g.fillStyle = `rgb(${Math.round(250 * shade)},${Math.round(204 * shade)},${Math.round(22 * shade)})`
    g.fillRect(x0 + x, y0 + wave, strip + 0.6, fh / 2 + 0.6)
    g.fillStyle = `rgb(${Math.round(214 * shade)},${Math.round(40 * shade)},${Math.round(40 * shade)})`
    g.fillRect(x0 + x, y0 + wave + fh / 2, strip + 0.6, fh / 2)
  }
  // Soft edges all round, so it reads as a light wash of colour rather than a box
  g.globalCompositeOperation = 'destination-in'
  for (const [ax, ay, bx, by] of [
    [x0, 0, x0 + fw, 0],
    [0, y0 - fh * 0.08, 0, y0 + fh * 1.08],
  ]) {
    const fade = g.createLinearGradient(ax, ay, bx, by)
    fade.addColorStop(0, 'rgba(0,0,0,0)')
    fade.addColorStop(0.16, 'rgba(0,0,0,1)')
    fade.addColorStop(0.84, 'rgba(0,0,0,1)')
    fade.addColorStop(1, 'rgba(0,0,0,0)')
    g.fillStyle = fade
    g.fillRect(0, 0, w, h)
  }
  g.globalCompositeOperation = 'source-over'
}

/* ---------- Diwali: a row of diyas with flickering flames, and gentle sparkles ---------- */
function diwaliScene(rand) {
  const sparkles = Array.from({ length: 34 }, () => ({ x: rand(), y: rand() * 0.8, r: 2 + rand() * 4, p: rand() * TAU, s: 0.6 + rand() * 1.4 }))
  return (g, w, h, t, dark) => {
    const n = Math.max(3, Math.min(9, Math.round(w / 150)))
    const size = Math.min(70, w / (n * 1.6))
    for (let i = 0; i < n; i++) {
      const cx = (w / n) * (i + 0.5)
      const cy = h - size * 0.9
      // glow
      const glow = g.createRadialGradient(cx, cy - size * 0.55, 1, cx, cy - size * 0.55, size * 1.4)
      glow.addColorStop(0, 'rgba(255,190,60,0.85)')
      glow.addColorStop(1, 'rgba(255,190,60,0)')
      g.fillStyle = glow
      g.fillRect(cx - size * 1.5, cy - size * 2, size * 3, size * 2.6)
      // clay bowl
      g.fillStyle = dark ? '#c4622d' : '#a4471c'
      g.beginPath()
      g.ellipse(cx, cy, size * 0.62, size * 0.3, 0, 0, Math.PI)
      g.fill()
      g.fillRect(cx - size * 0.62, cy - size * 0.06, size * 1.24, size * 0.08)
      // flame (flickers)
      const f = 1 + 0.12 * Math.sin(t * 9 + i * 1.7) + 0.06 * Math.sin(t * 23 + i)
      g.fillStyle = '#ffb42e'
      g.beginPath()
      g.moveTo(cx, cy - size * 0.75 * f)
      g.quadraticCurveTo(cx + size * 0.2, cy - size * 0.25, cx, cy - size * 0.08)
      g.quadraticCurveTo(cx - size * 0.2, cy - size * 0.25, cx, cy - size * 0.75 * f)
      g.fill()
    }
    for (const s of sparkles) {
      const a = 0.5 + 0.5 * Math.sin(t * s.s + s.p)
      star(g, s.x * w, s.y * h, s.r * (0.6 + a * 0.6), `rgba(212,175,55,${a})`)
    }
  }
}

function star(g, x, y, r, color) {
  g.fillStyle = color
  g.beginPath()
  g.moveTo(x, y - r * 2)
  g.quadraticCurveTo(x, y, x + r * 2, y)
  g.quadraticCurveTo(x, y, x, y + r * 2)
  g.quadraticCurveTo(x, y, x - r * 2, y)
  g.quadraticCurveTo(x, y, x, y - r * 2)
  g.fill()
}

/* ---------- Christmas: slow falling snow and small stars ---------- */
function snowScene(rand) {
  const flakes = Array.from({ length: 70 }, () => ({ x: rand(), y: rand(), r: 1.5 + rand() * 3.5, v: 0.012 + rand() * 0.02, d: rand() * TAU }))
  const stars = Array.from({ length: 12 }, () => ({ x: rand(), y: rand() * 0.3, r: 2 + rand() * 3, p: rand() * TAU }))
  return (g, w, h, t, dark) => {
    g.fillStyle = dark ? '#ffffff' : '#6f8fb3'
    for (const f of flakes) {
      const y = ((f.y + t * f.v) % 1.05) * h
      const x = f.x * w + Math.sin(t * 0.6 + f.d) * 18
      g.beginPath()
      g.arc(x, y, f.r, 0, TAU)
      g.fill()
    }
    for (const s of stars) star(g, s.x * w, s.y * h, s.r * (0.75 + 0.25 * Math.sin(t * 1.3 + s.p)), dark ? '#ebd27a' : '#b8901e')
  }
}

/* ---------- New Year: soft fireworks bursts ---------- */
function fireworksScene(rand) {
  const colors = ['#d4af37', '#ebd27a', '#e0607e', '#3fa7a0', '#f3e7cf']
  const bursts = Array.from({ length: 6 }, (_, i) => ({ x: 0.12 + rand() * 0.76, y: 0.12 + rand() * 0.45, c: colors[i % colors.length], o: i * 0.9, n: 22 + Math.round(rand() * 10) }))
  const period = 5.4
  return (g, w, h, t) => {
    for (const b of bursts) {
      const life = ((t + b.o) % period) / 2.2 // 0..1 while the burst lives, then a pause
      if (life > 1) continue
      const radius = Math.min(w, h) * 0.16 * (1 - (1 - life) ** 3)
      g.fillStyle = b.c
      g.globalAlpha = 1 - life
      for (let i = 0; i < b.n; i++) {
        const a = (i / b.n) * TAU
        const px = b.x * w + Math.cos(a) * radius
        const py = b.y * h + Math.sin(a) * radius + life * life * 30 // a little gravity
        g.beginPath()
        g.arc(px, py, 2.6, 0, TAU)
        g.fill()
      }
      g.globalAlpha = 1
    }
  }
}

/* ---------- Valentine's: small hearts floating up ---------- */
function heartsScene(rand) {
  const hearts = Array.from({ length: 26 }, () => ({ x: rand(), y: rand(), s: 7 + rand() * 12, v: 0.01 + rand() * 0.018, d: rand() * TAU, c: rand() < 0.5 ? '#d6336c' : '#f06595' }))
  return (g, w, h, t) => {
    for (const p of hearts) {
      const y = (1.05 - ((p.y + t * p.v) % 1.1)) * h
      const x = p.x * w + Math.sin(t * 0.8 + p.d) * 16
      heart(g, x, y, p.s, p.c)
    }
  }
}

function heart(g, x, y, s, color) {
  g.fillStyle = color
  g.beginPath()
  g.moveTo(x, y + s * 0.35)
  g.bezierCurveTo(x - s, y - s * 0.3, x - s * 0.45, y - s * 1.05, x, y - s * 0.45)
  g.bezierCurveTo(x + s * 0.45, y - s * 1.05, x + s, y - s * 0.3, x, y + s * 0.35)
  g.fill()
}

const SCENES = {
  rajyotsava: () => flag,
  diwali: () => diwaliScene(seeded(11)),
  christmas: () => snowScene(seeded(23)),
  newyear: () => fireworksScene(seeded(37)),
  valentine: () => heartsScene(seeded(41)),
}

export const hasScene = (id) => id in SCENES

/** Draws a theme on the canvas, moving if allowed. -> stop() */
export function startTheme(canvas, { id, animate = true, dark = false }) {
  const make = SCENES[id]
  const g = canvas.getContext('2d')
  if (!make || !g) return () => {}
  const draw = make()
  const still = !animate || window.matchMedia?.('(prefers-reduced-motion: reduce)').matches
  let w = 0
  let h = 0
  const size = () => {
    const dpr = Math.min(window.devicePixelRatio || 1, 1.5)
    w = canvas.clientWidth
    h = canvas.clientHeight
    canvas.width = Math.round(w * dpr)
    canvas.height = Math.round(h * dpr)
    g.setTransform(dpr, 0, 0, dpr, 0, 0)
  }
  const paint = (t) => {
    g.clearRect(0, 0, w, h)
    draw(g, w, h, t, dark)
  }
  size()
  let raf = 0
  let last = 0
  const start = performance.now()
  const frame = (now) => {
    raf = requestAnimationFrame(frame)
    if (now - last < 1000 / FPS) return
    last = now
    paint((now - start) / 1000)
  }
  const run = () => {
    cancelAnimationFrame(raf)
    if (!still && document.visibilityState === 'visible') raf = requestAnimationFrame(frame)
  }
  const onResize = () => {
    size()
    paint(still ? 4 : (performance.now() - start) / 1000)
  }
  paint(4)
  run()
  document.addEventListener('visibilitychange', run)
  window.addEventListener('resize', onResize)
  return () => {
    cancelAnimationFrame(raf)
    document.removeEventListener('visibilitychange', run)
    window.removeEventListener('resize', onResize)
  }
}
