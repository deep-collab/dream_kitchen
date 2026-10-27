// A screen-recorded walkthrough of Hema's admin at phone size (390 x 844), so she can learn every
// screen on her own: title cards, a big caption bar, a tap circle for every tap, slow scrolling and
// a spoken narration (Windows text-to-speech). Uses /admin/demo (sample data, no login), plus the
// practice database for the two things the demo can't show: the customer's Track Order page and
// the real login page (Forgot password, Log out).
//
// Output (not in git): docs/video/admin-walkthrough.mp4 and one clip per part in docs/video/clips/.
//
// Run:  npm run build
//       UPI_ID=dreamkitchen@okaxis HEMA_EMAIL=hema@example.com DK_DEV_ADMIN_EMAIL=hema@example.com \
//       DK_DEV_ADMIN_PASSWORD=dev-only-pass DK_RELAX_LIMITS=1 DK_DEV_DATA_DIR=.dev-data/video \
//       npx vite preview --port 4173 --strictPort
//       node scripts/walkthrough-video.mjs            (or: node scripts/walkthrough-video.mjs 03 04 to redo some parts)
// Needs Windows for the voice; without it the video has captions only.
import { spawn, spawnSync } from 'node:child_process'
import { createHash } from 'node:crypto'
import { existsSync, mkdirSync, readFileSync, readdirSync, renameSync, rmSync, writeFileSync } from 'node:fs'
import { join, resolve } from 'node:path'
import { chromium } from 'playwright'
import ffmpegPath from 'ffmpeg-static'
import { dateChoices, dispatchRules } from '../src/lib/dates.js'
import { site } from '../src/config/site.js'

const BASE = process.env.DK_BASE || 'http://localhost:4173'
const OUT = resolve('docs/video')
const WORK = join(OUT, 'work')
const CLIPS = join(OUT, 'clips')
const VIEW = { width: 390, height: 844 }
const ADMIN = { email: process.env.DK_DEV_ADMIN_EMAIL || 'hema@example.com', password: process.env.DK_DEV_ADMIN_PASSWORD || 'dev-only-pass' }
const ONLY = process.argv.slice(2)
for (const d of [OUT, WORK, CLIPS, join(WORK, 'tts'), join(WORK, 'raw')]) mkdirSync(d, { recursive: true })
const sleep = (ms) => new Promise((r) => setTimeout(r, ms))
const host = new URL(site.url).host

/* ---------------- voice: Windows text-to-speech, one PowerShell kept open ---------------- */

const TTS_PS = `
Add-Type -AssemblyName System.Speech
$s = New-Object System.Speech.Synthesis.SpeechSynthesizer
try { $s.SelectVoice('Microsoft Zira Desktop') } catch {}
$s.Rate = 0
[Console]::Out.WriteLine('READY')
while ($true) {
  $line = [Console]::In.ReadLine()
  if ($line -eq $null) { break }
  $job = $line | ConvertFrom-Json
  $s.SetOutputToWaveFile($job.file)
  $s.Speak($job.text)
  $s.SetOutputToNull()
  [Console]::Out.WriteLine('DONE')
}
`
function startVoice() {
  if (process.platform !== 'win32' || process.env.DK_NO_VOICE) return null
  const ps = spawn('powershell.exe', ['-NoProfile', '-NonInteractive', '-EncodedCommand', Buffer.from(TTS_PS, 'utf16le').toString('base64')], { stdio: ['pipe', 'pipe', 'inherit'] })
  let buf = ''
  let waiting = []
  ps.stdout.on('data', (d) => {
    buf += d.toString()
    let i
    while ((i = buf.indexOf('\n')) >= 0) {
      const line = buf.slice(0, i).trim()
      buf = buf.slice(i + 1)
      if (line) waiting.shift()?.(line)
    }
  })
  const next = () => new Promise((r) => waiting.push(r))
  const ready = Promise.race([next(), sleep(15000).then(() => 'TIMEOUT')])
  let chain = Promise.resolve()
  return {
    ready,
    // -> path of a WAV file with `text` spoken (cached by text)
    speak(text) {
      const file = join(WORK, 'tts', `${createHash('sha1').update(`zira|0|${text}`).digest('hex').slice(0, 16)}.wav`)
      if (existsSync(file)) return Promise.resolve(file)
      chain = chain.then(async () => {
        const tmp = `${file}.tmp.wav`
        const done = next()
        ps.stdin.write(`${JSON.stringify({ text, file: tmp })}\n`)
        await done
        renameSync(tmp, file)
        return file
      })
      return chain
    },
    close: () => ps.stdin.end(),
  }
}

/** Length of a WAV file in ms */
function wavMs(file) {
  const b = readFileSync(file)
  let p = 12
  let byteRate = 0
  while (p < b.length - 8) {
    const id = b.toString('ascii', p, p + 4)
    const size = b.readUInt32LE(p + 4)
    if (id === 'fmt ') byteRate = b.readUInt32LE(p + 16)
    if (id === 'data') return Math.round((size / byteRate) * 1000)
    p += 8 + size + (size % 2)
  }
  return 0
}

/** What the voice says: the caption without the gold markers, rupees as words, ASCII only */
const spoken = (text) =>
  text
    .replace(/\*\*/g, '')
    .replace(/₹\s?([\d,]+)/g, '$1 rupees')
    .replace(/[‘’]/g, "'")
    .replace(/[“”]/g, '"')
    .replace(/[–—]/g, ', ')
    .replace(/→/g, ', then ')
    .replace(/[^\x20-\x7e]/g, '')

/* ---------------- what is drawn on top of the page while recording ---------------- */

const OVERLAY_CSS = `
#vw-caption{position:fixed;left:0;right:0;bottom:0;z-index:2147483600;background:#0F0F0F;border-top:3px solid #C9A227;
  color:#FFF9EF;font:700 21px/1.35 "Segoe UI",Lato,Arial,sans-serif;padding:12px 16px 14px;min-height:104px;box-sizing:border-box;
  display:flex;flex-direction:column;justify-content:center;transition:opacity .25s;box-shadow:0 -6px 18px rgba(0,0,0,.25)}
#vw-caption.vw-hidden{opacity:0}
#vw-caption b{color:#EBD27A}
#vw-caption small{display:block;font:600 15px/1.3 "Segoe UI",Lato,Arial,sans-serif;color:#CDBF9E;margin-top:4px}
#vw-caption .vw-part{font:700 13px/1 "Segoe UI",Arial,sans-serif;letter-spacing:.12em;text-transform:uppercase;color:#C9A227;margin-bottom:6px}
.vw-tap{position:fixed;z-index:2147483646;pointer-events:none;width:56px;height:56px;margin:-28px 0 0 -28px;border-radius:50%;
  border:4px solid #D4AF37;background:rgba(235,210,122,.38);box-shadow:0 0 0 3px rgba(15,15,15,.55);animation:vw-tap .9s ease-out forwards}
@keyframes vw-tap{0%{transform:scale(.4);opacity:0}25%{transform:scale(1);opacity:1}70%{transform:scale(1.05);opacity:1}100%{transform:scale(1.5);opacity:0}}
.vw-look{position:absolute;z-index:2147483500;pointer-events:none;border:4px solid #D4AF37;border-radius:14px;
  box-shadow:0 0 0 4px rgba(15,15,15,.35),0 0 22px rgba(212,175,55,.75);animation:vw-pulse 1.2s ease-in-out infinite}
@keyframes vw-pulse{50%{box-shadow:0 0 0 4px rgba(15,15,15,.35),0 0 4px rgba(212,175,55,.3)}}
#vw-card{position:fixed;inset:0;z-index:2147483647;background:radial-gradient(circle at 50% 38%,#2a2112 0,#0F0F0F 62%);display:flex;flex-direction:column;
  align-items:center;justify-content:center;text-align:center;padding:32px;box-sizing:border-box;transition:opacity .5s}
#vw-card.vw-hidden{opacity:0}
#vw-card .vw-brand{font-family:Cinzel,"Trajan Pro","Times New Roman",serif;font-size:22px;letter-spacing:.08em;color:#EBD27A;margin-bottom:34px}
#vw-card .vw-num{font:700 16px/1 "Segoe UI",Arial,sans-serif;letter-spacing:.2em;text-transform:uppercase;color:#CDBF9E;margin-bottom:16px}
#vw-card .vw-title{font:700 40px/1.15 "Segoe UI",Lato,Arial,sans-serif;background:linear-gradient(180deg,#EBD27A,#D4AF37 55%,#B8901E);
  -webkit-background-clip:text;background-clip:text;color:transparent;margin:0 0 18px}
#vw-card .vw-line{width:80px;height:3px;background:#C9A227;margin:0 auto 20px}
#vw-card .vw-sub{font:600 20px/1.45 "Segoe UI",Lato,Arial,sans-serif;color:#FFF9EF;max-width:320px}
`
// Put in every page: the overlay styles and the helpers the script calls
const INIT = `(() => {
  const css = ${JSON.stringify(OVERLAY_CSS)}
  const add = () => {
    if (document.getElementById('vw-style')) return
    const s = document.createElement('style'); s.id = 'vw-style'; s.textContent = css; document.head.appendChild(s)
  }
  if (document.head) add(); else document.addEventListener('DOMContentLoaded', add)
  const html = (t) => t.replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/\\*\\*(.+?)\\*\\*/g,'<b>$1</b>')
  // Keep the caption just above the admin's bottom bar (so the tabs stay visible), and lift the
  // sticky Save buttons above the caption
  const place = () => {
    const c = document.getElementById('vw-caption'); if (!c) return
    const nav = document.querySelector('nav[aria-label="Admin"]')
    const navH = nav ? nav.getBoundingClientRect().height : 0
    c.style.bottom = navH + 'px'
    let lift = document.getElementById('vw-lift')
    if (!lift) { lift = document.createElement('style'); lift.id = 'vw-lift'; document.head.appendChild(lift) }
    const h = c.getBoundingClientRect().height
    lift.textContent = '.sticky.bottom-20{bottom:' + (navH + h + 8) + 'px!important} main{padding-bottom:' + (navH + h + 40) + 'px!important} [data-admin-packing-slip]{padding-bottom:' + (h + 20) + 'px}'
  }
  setInterval(place, 150)
  window.__vw = {
    caption(text, small, part) {
      add()
      let c = document.getElementById('vw-caption')
      if (!c) { c = document.createElement('div'); c.id = 'vw-caption'; document.body.appendChild(c) }
      c.innerHTML = (part ? '<div class="vw-part">' + html(part) + '</div>' : '') + '<div>' + html(text) + '</div>' + (small ? '<small>' + html(small) + '</small>' : '')
      c.classList.remove('vw-hidden'); place()
    },
    hideCaption() { document.getElementById('vw-caption')?.classList.add('vw-hidden') },
    tap(x, y) {
      const d = document.createElement('div'); d.className = 'vw-tap'; d.style.left = x + 'px'; d.style.top = y + 'px'
      document.body.appendChild(d); setTimeout(() => d.remove(), 1000)
    },
    look(rects) {
      this.unlook()
      for (const r of rects) {
        const d = document.createElement('div'); d.className = 'vw-look'
        Object.assign(d.style, { left: (r.x + scrollX - 6) + 'px', top: (r.y + scrollY - 6) + 'px', width: (r.width + 12) + 'px', height: (r.height + 12) + 'px' })
        document.body.appendChild(d)
      }
    },
    unlook() { document.querySelectorAll('.vw-look').forEach((d) => d.remove()) },
    card(num, title, sub) {
      add()
      let c = document.getElementById('vw-card')
      if (!c) { c = document.createElement('div'); c.id = 'vw-card'; document.body.appendChild(c) }
      c.innerHTML = '<div class="vw-brand">Dream Kitchen</div>' + (num ? '<div class="vw-num">' + html(num) + '</div>' : '') + '<h1 class="vw-title">' + html(title) + '</h1><div class="vw-line"></div><div class="vw-sub">' + html(sub || '') + '</div>'
      c.classList.remove('vw-hidden')
    },
    hideCard() { const c = document.getElementById('vw-card'); if (c) { c.classList.add('vw-hidden'); setTimeout(() => c.remove(), 600) } },
    // A slow, eased scroll, like a thumb
    scrollTo(y, ms) {
      const from = scrollY, to = Math.max(0, Math.min(y, document.documentElement.scrollHeight - innerHeight)), t0 = performance.now()
      return new Promise((done) => {
        const step = (t) => {
          const k = Math.min(1, (t - t0) / ms), e = k < .5 ? 2 * k * k : 1 - Math.pow(-2 * k + 2, 2) / 2
          scrollTo(0, from + (to - from) * e)
          k < 1 ? requestAnimationFrame(step) : done()
        }
        requestAnimationFrame(step)
      })
    },
    // The part of the screen not covered by the header, the caption or the bottom bar
    room() {
      const head = document.querySelector('header.sticky, .no-print.sticky')
      const top = head ? head.getBoundingClientRect().bottom : 0
      const cap = document.getElementById('vw-caption')
      const bottom = cap && !cap.classList.contains('vw-hidden') ? cap.getBoundingClientRect().top : innerHeight
      return { top, bottom }
    },
  }
})()`

/* ---------------- one recorded part ---------------- */

class Recorder {
  constructor(browser, voice, part) {
    this.browser = browser
    this.voice = voice
    this.part = part
    this.audio = [] // { at (ms from video start), file }
  }

  async open(extraCss = '') {
    const dir = join(WORK, 'raw', this.part.id)
    rmSync(dir, { recursive: true, force: true })
    this.ctx = await this.browser.newContext({
      viewport: VIEW,
      deviceScaleFactor: 1,
      isMobile: true,
      hasTouch: true,
      locale: 'en-IN',
      timezoneId: 'Asia/Kolkata',
      permissions: ['clipboard-read', 'clipboard-write'],
      recordVideo: { dir, size: VIEW },
    })
    await this.ctx.addInitScript(INIT)
    // the customer site's first-visit loading screen: already seen
    await this.ctx.addInitScript("try{localStorage.setItem('dk_intro_seen','1')}catch(e){}")
    if (extraCss) await this.ctx.addInitScript(`document.addEventListener('DOMContentLoaded',()=>{const s=document.createElement('style');s.textContent=${JSON.stringify(extraCss)};document.head.appendChild(s)})`)
    this.page = await this.ctx.newPage()
    this.t0 = Date.now()
    this.trim = 0
    return this.page
  }

  now() {
    return Date.now() - this.t0
  }

  async goto(path, ready) {
    await this.page.goto(path.startsWith('http') ? path : `${BASE}${path}`)
    if (ready) await this.page.waitForSelector(ready)
    await this.page.evaluate(() => document.fonts?.ready)
    if (this.lastCaption) await this.page.evaluate((a) => window.__vw.caption(...a), this.lastCaption)
    await sleep(200)
  }

  /**
   * Starts the clip: everything before this moment (the page loading) is cut off. First the screen
   * goes pure black for a moment: finding that in the video tells exactly how the video's clock
   * lines up with this script's, so each spoken line lands on its caption.
   */
  async startHere() {
    await this.page.evaluate(() => {
      const d = document.createElement('div')
      d.id = 'vw-black'
      d.style.cssText = 'position:fixed;inset:0;background:#000;z-index:2147483647'
      document.body.appendChild(d)
    })
    this.markAt = this.now()
    await sleep(600)
    await this.page.evaluate(() => window.__vw.card('', '', ''))
    await this.page.evaluate(() => document.getElementById('vw-black').remove())
    await sleep(120)
    this.trim = this.now()
  }

  /** Speaks `text` (when there's a voice) starting now; -> ms until the voice is done */
  async voiceNow(text, startedAt) {
    if (!this.voice) return Math.max(2600, spoken(text).split(/\s+/).length * 420)
    const file = await this.voice.speak(spoken(text))
    this.audio.push({ at: startedAt, file })
    return wavMs(file)
  }

  /**
   * One step: shows the caption, says it, runs `action` (taps, typing, scrolling) while she
   * listens, then waits until the voice has finished plus a pause, and at least `min` ms in all.
   */
  async say(text, action, { small = '', voice, min = 2200, pause = 350, lead = 500 } = {}) {
    this.lastCaption = [text, small, `Part ${this.part.n} · ${this.part.short}`]
    await this.page.evaluate((a) => window.__vw.caption(...a), this.lastCaption)
    const start = this.now()
    const ms = await this.voiceNow(voice || text, start)
    if (action) {
      await sleep(Math.max(0, lead - (this.now() - start)))
      await action()
    }
    const wait = Math.max(start + ms + pause, start + min) - this.now()
    if (wait > 0) await sleep(wait)
  }

  async card(num, title, sub, voice, ms = 2600) {
    await this.page.evaluate(([n, t, s]) => window.__vw.card(n, t, s), [num, title, sub])
    await this.page.evaluate(() => window.__vw.hideCaption())
    await sleep(80)
    const start = this.now()
    const voiceMs = voice ? await this.voiceNow(voice, start) : 0
    const wait = Math.max(start + voiceMs + 400, start + ms) - this.now()
    if (wait > 0) await sleep(wait)
  }

  async hideCard() {
    await this.page.evaluate(() => window.__vw.hideCard())
    await sleep(450)
  }

  /** Scrolls slowly so `target` sits in the free part of the screen (`at`: 'top' or 'center') */
  async show(target, { at = 'top', ms = 800, offset = 12 } = {}) {
    const loc = typeof target === 'string' ? this.page.locator(target).first() : target
    await loc.waitFor({ state: 'attached' })
    const { y, h, room, sy } = await loc.evaluate((el) => {
      const r = el.getBoundingClientRect()
      return { y: r.top, h: r.height, room: window.__vw.room(), sy: scrollY }
    })
    const free = room.bottom - room.top
    let dest
    if (at === 'center' && h < free) dest = sy + y - room.top - (free - h) / 2
    else dest = sy + y - room.top - offset
    if (Math.abs(dest - sy) < 8) return
    await this.page.evaluate(([d, t]) => window.__vw.scrollTo(d, t), [dest, ms])
    await sleep(150)
  }

  async scrollBy(dy, ms = 1000) {
    await this.page.evaluate(([d, t]) => window.__vw.scrollTo(scrollY + d, t), [dy, ms])
    await sleep(250)
  }

  async top(ms = 900) {
    await this.page.evaluate((t) => window.__vw.scrollTo(0, t), ms)
    await sleep(200)
  }

  /** A tap: scroll it into view if needed, show the circle, then tap (or only show it: click:false) */
  async tap(target, { click = true, show = true, wait = 380 } = {}) {
    const loc = typeof target === 'string' ? this.page.locator(target).first() : target
    await loc.waitFor({ state: 'visible' })
    if (show) {
      const inView = await loc.evaluate((el) => {
        const r = el.getBoundingClientRect()
        const room = window.__vw.room()
        return r.top >= room.top + 4 && r.bottom <= room.bottom - 4
      })
      if (!inView) await this.show(loc, { at: 'center' })
    }
    const box = await loc.boundingBox()
    await this.page.evaluate(([x, y]) => window.__vw.tap(x, y), [box.x + box.width / 2, box.y + box.height / 2])
    await sleep(wait)
    if (click) await loc.click()
    await sleep(250)
  }

  /** Types like a person (one letter at a time) */
  async type(target, text, { clear = true, delay = 60 } = {}) {
    const loc = typeof target === 'string' ? this.page.locator(target).first() : target
    await this.tap(loc)
    if (clear) {
      await loc.fill('')
      await sleep(120)
    }
    await loc.pressSequentially(text, { delay })
    await sleep(300)
  }

  /** A pulsing gold frame around things to look at */
  async look(...targets) {
    const first = typeof targets[0] === 'string' ? this.page.locator(targets[0]).first() : targets[0]
    const inView = await first.evaluate((el) => {
      const r = el.getBoundingClientRect()
      const room = window.__vw.room()
      return r.top >= room.top && r.bottom <= room.bottom
    })
    if (!inView) await this.show(first, { at: 'center' })
    const rects = []
    for (const t of targets) {
      const loc = typeof t === 'string' ? this.page.locator(t).first() : t
      rects.push(await loc.boundingBox())
    }
    await this.page.evaluate((r) => window.__vw.look(r), rects.filter(Boolean))
  }

  async unlook() {
    await this.page.evaluate(() => window.__vw.unlook())
  }

  async close() {
    await sleep(700)
    const video = this.page.video()
    await this.ctx.close()
    return { video: await video.path(), trim: this.trim, markAt: this.markAt, audio: this.audio, end: this.now() }
  }
}

/* ---------------- practice-database data for Track Order ---------------- */

async function api(name, body, token) {
  const r = await fetch(`${BASE}/api/${name}`, {
    method: 'POST',
    headers: { 'content-type': 'application/json', ...(token ? { authorization: `Bearer ${token}` } : {}) },
    body: JSON.stringify(body),
  })
  const json = await r.json().catch(() => null)
  if (!r.ok) throw new Error(`${name}: ${r.status} ${JSON.stringify(json)}`)
  return json
}

/** A shipped order in the practice database, to show the customer's Track Order page */
async function shippedPracticeOrder() {
  const phone = '9845012345'
  const made = await api('create-order', {
    idempotencyKey: `video-${Date.now()}-abcdefgh`,
    items: [{ productId: 'red-velvet-delight-box', selection: { size: '500g', name: 'Happy Birthday Amma' }, qty: 1, unitPrice: 1250 }],
    customer: { name: 'Asha Rao', phone, email: '', line1: '12, 3rd Cross', line2: 'Jayanagar 4th Block', city: 'Bengaluru', pincode: '560011', state: 'karnataka', landmark: '', note: '' },
    dispatchDate: dateChoices(new Date(), 1, dispatchRules({ drawing: false }))[0],
    expectedTotal: 1250 + 100,
  })
  const code = made.order.code
  await api('submit-payment', { code, phone, utr: '612398745601' })
  const { accessToken } = await api('admin', { action: 'login', ...ADMIN })
  for (const [step, extra] of [
    ['paymentReceived', {}],
    ['preparing', {}],
    ['shipped', { courierName: 'DTDC', trackingNo: 'D41285573' }],
  ])
    await api('admin', { action: 'orderAction', code, step, ...extra }, accessToken)
  return { code, phone }
}

/* ---------------- the parts ---------------- */

const DEMO = '/admin/demo'
const orderCard = (r, name) => r.page.locator('[data-admin-order]', { hasText: name }).first()
const btn = (r, name) => r.page.getByRole('button', { name, exact: true }).first()
const link = (r, name) => r.page.getByRole('link', { name }).first()
const navTab = (r, name) => r.page.locator('nav[aria-label="Admin"] a', { hasText: name })
const product = (r, id) => r.page.locator(`[data-admin-product="${id}"]`)

const PARTS = [
  {
    id: '01-opening',
    short: 'Opening the admin',
    title: 'Opening the admin',
    sub: 'Where to find it, and what “DEMO” means',
    async run(r) {
      await r.say(`Open **${host}/admin** in Chrome on your phone.`, null, { voice: 'Open your website in Chrome, and add slash admin at the end.' })
      await r.say('Type your **email** and **password**, then tap **Log in**.', async () => {
        await r.look('form')
      })
      await r.unlook()
      await r.say('To practise, tap **See the demo**. No log in needed.', async () => {
        await r.tap(link(r, 'See the demo'))
        await r.page.waitForSelector('[data-admin-card]')
      })
      await r.say('**DEMO** means practice: made-up orders. Changes vanish when you close the page.', async () => {
        await r.look('[data-admin-demo-badge]', '[data-admin-demo]')
      })
      await r.unlook()
      await r.say('The five buttons at the bottom take you everywhere.', async () => {
        await r.look('nav[aria-label="Admin"]')
      })
      await r.unlook()
    },
  },
  {
    id: '02-home',
    short: 'Home',
    title: 'Home: your day at a glance',
    sub: 'Six big cards. Tap one to open its list.',
    start: DEMO,
    ready: '[data-admin-card]',
    async run(r) {
      await r.say('**Home** shows your day. A yellow box means a **UPI payment to check**.', async () => {
        await r.look('[data-admin-card="toCheck"]')
      })
      await r.say('**New orders today**, and the **payments received today**.', async () => {
        await r.look('[data-admin-card="newOrders"]', '[data-admin-card="payments"]')
      })
      await r.say('**Orders to pack** are paid. **Orders to ship** are being made.', async () => {
        await r.show('[data-admin-card="toPack"]', { at: 'center' })
        await r.look('[data-admin-card="toPack"]', '[data-admin-card="toShip"]')
      })
      await r.say('**This weekend’s class bookings**, and **new enquiries**.', async () => {
        await r.show('[data-admin-card="weekend"]', { at: 'center' })
        await r.look('[data-admin-card="weekend"]', '[data-admin-card="enquiries"]')
      })
      await r.unlook()
      await r.say('Tap a card to open its list. Here: **Orders to pack**.', async () => {
        await r.tap('[data-admin-card="toPack"]')
      })
    },
  },
  {
    id: '03-orders',
    short: 'Orders',
    title: 'Orders',
    sub: 'Lists, search, and everything about one order',
    start: `${DEMO}/orders`,
    ready: '[data-admin-order]',
    async run(r) {
      await r.say('**New**: not paid yet, or a UPI payment to check.', async () => {
        await r.look('[role=tablist]')
      })
      await r.unlook()
      await r.say('**Paid**: make these next. The soonest dispatch is at the top.', async () => {
        await r.tap(r.page.getByRole('tab', { name: /^Paid/ }))
      })
      await r.say('Then **Preparing**, **Shipped**, **Delivered**. Swipe the tabs to see them all.', async () => {
        await r.tap(r.page.getByRole('tab', { name: /^Preparing/ }))
        await sleep(700)
        await r.page.getByRole('tab', { name: /^Cancelled/ }).scrollIntoViewIfNeeded()
        await sleep(500)
        await r.tap(r.page.getByRole('tab', { name: /^Shipped/ }))
      })
      await r.say('To find an order, type a **name, phone or order ID**, tap **Search**, then the order.', async () => {
        await r.type('#order-search', 'Asha')
        await r.tap(btn(r, 'Search'))
        await sleep(500)
        await r.tap(orderCard(r, 'Asha Rao'))
        await r.page.waitForSelector('[data-admin-address]')
      })
      await r.say('**Items** shows exactly what to make: the **size** and the **name on the box**.', async () => {
        await r.show(r.page.getByRole('heading', { name: 'Items', exact: true }))
        await r.look(r.page.locator('li', { hasText: 'Size:' }).first(), r.page.locator('li', { hasText: 'Name on the box' }).first())
      })
      await r.unlook()
      await r.say('**Drawing**: what to draw, and the customer’s **reference photo**.', async () => {
        await r.show(r.page.locator('li', { hasText: 'Drawing:' }).first())
        await r.look(r.page.locator('li', { hasText: 'Drawing:' }).first(), 'img[alt="Reference photo for the drawing"]')
      })
      await r.unlook()
      await r.say('**Ragi version** means make it with ragi. Then the **dispatch date** and the note.', async () => {
        await r.show(r.page.getByText('Dispatch on'), { at: 'center' })
      })
      await r.say('**Payment**: the **Razorpay payment ID** helps if you need to refund.', async () => {
        await r.show(r.page.getByRole('heading', { name: 'Payment', exact: true }))
        await r.look('[data-admin-razorpay-id]')
      })
      await r.unlook()
      await r.say('**Copy address**, then paste it into the courier’s app.', async () => {
        await r.show(r.page.getByRole('heading', { name: 'Customer', exact: true }))
        await r.tap('[data-admin-copy-address]')
      })
      await r.say('**WhatsApp** opens a chat with the customer, hello already typed.', async () => {
        await r.tap('[data-admin-whatsapp]', { click: false })
        await r.look('[data-admin-whatsapp]')
      })
      await r.unlook()
    },
  },
  {
    id: '04-order-status',
    short: 'Order status',
    title: 'Moving an order along',
    sub: 'Preparing → Shipped → Delivered, or Cancel',
    start: `${DEMO}/orders?tab=paid`,
    ready: '[data-admin-order]',
    async before() {
      this.track = await shippedPracticeOrder()
    },
    async run(r) {
      await r.say('Open a paid order. When you start making it, tap **Preparing**.', async () => {
        await r.tap(orderCard(r, 'Asha Rao'))
        await r.page.waitForSelector('[data-admin-action="preparing"]')
        await r.tap('[data-admin-action="preparing"]')
        await r.page.waitForSelector('[data-admin-action="shipped"]')
      })
      await r.say('When the parcel leaves, tap **Shipped**.', async () => {
        await r.tap('[data-admin-action="shipped"]')
      })
      await r.say('Type the **courier name** and the **tracking number**.', async () => {
        await r.type(r.page.getByPlaceholder('e.g. DTDC, India Post'), 'DTDC', { delay: 70 })
        await r.type(r.page.locator('label:has-text("Tracking number") input'), 'D41285573', { delay: 70 })
      })
      await r.say('Tap **Save as shipped**. The customer gets an email.', async () => {
        await r.tap('[data-admin-confirm="shipped"]')
        await r.page.waitForSelector('[data-admin-action="delivered"]')
      })
      await r.say('When it arrives, tap **Delivered**. Every step is kept in the **History**.', async () => {
        await r.tap('[data-admin-action="delivered"]')
        await sleep(400)
        await r.show(r.page.getByRole('heading', { name: 'History', exact: true }))
        await r.look('[data-admin-history]')
      })
      await r.unlook()
      await r.say('To cancel an order, open it and tap **Cancel order**.', async () => {
        await r.tap(navTab(r, 'Orders'))
        await r.tap(r.page.getByRole('tab', { name: /^Paid/ }))
        await r.tap(orderCard(r, 'Lakshmi Gowda'))
        await r.page.waitForSelector('[data-admin-action="cancel"]')
        await r.tap('[data-admin-action="cancel"]')
      })
      await r.say('Write why. The customer sees it. Tap **Cancel this order**.', async () => {
        await r.type(r.page.locator('label:has-text("Why is it cancelled?") input'), 'Sorry, we are fully booked', { delay: 55 })
        await r.tap('[data-admin-confirm="cancel"]')
        await r.page.waitForSelector('text=Cancelled: Sorry')
      })
      await r.say('Refund in the **Razorpay dashboard**, then write it in the **Refund note**.', async () => {
        await r.type('[data-admin-refund]', 'Refunded in full on 11 Oct', { delay: 50 })
        await r.tap(btn(r, 'Save refund note'))
      })
      await r.say('Your customer checks the order on **Track Order** on the website.', async () => {
        await r.goto(`/track?id=${this.track.code}`, '#tr-phone')
        await r.type('#tr-phone', this.track.phone, { delay: 60 })
        await r.tap('[data-dk-track]')
        await r.page.waitForSelector('[data-dk-status]')
      })
      await r.say('They see each step, the **courier** and the **tracking number**.', async () => {
        await r.show('[data-dk-status]')
        await r.scrollBy(240, 1200)
      })
    },
  },
  {
    id: '05-packing-slip',
    short: 'Packing slip',
    title: 'Printing a packing slip',
    sub: 'The address in big letters, and what is inside',
    start: `${DEMO}/orders?tab=paid`,
    ready: '[data-admin-order]',
    async run(r) {
      await r.say('Open the order, then tap **Print packing slip**.', async () => {
        await r.tap(orderCard(r, 'Asha Rao'))
        await r.page.waitForSelector('[data-admin-slip]')
        await r.tap('[data-admin-slip]')
        await r.page.waitForSelector('[data-admin-packing-slip]')
      })
      await r.say('The **address** in big letters, and the phone number.', async () => {
        await r.look(r.page.locator('section', { hasText: 'Ship to' }))
      })
      await r.unlook()
      await r.say('Below: **what is in the parcel**. No prices.', async () => {
        await r.show(r.page.getByText('In this parcel'))
      })
      await r.say('Tap **Print**, then choose your printer or **Save as PDF**.', async () => {
        await r.top()
        await r.tap('[data-admin-print]', { click: false })
      })
    },
  },
  {
    id: '06-classes',
    short: 'Classes',
    title: 'Class bookings',
    sub: 'Who is coming, closing a weekend, fees, times and seats',
    start: `${DEMO}/classes`,
    ready: '[data-admin-booking]',
    async run(r) {
      await r.say('**Classes**: pick a **weekend** and a **time slot** to see its bookings.', async () => {
        await r.tap('[data-admin-weekend]', { click: false })
        const first = await r.page.locator('[data-admin-weekend] option').nth(1).getAttribute('value')
        await r.page.selectOption('[data-admin-weekend]', first)
        await sleep(700)
        await r.tap('[data-admin-slot]', { click: false })
        await r.page.selectOption('[data-admin-slot]', 'morning')
      })
      await r.say('Tap a booking to see the class, time, fee and payment.', async () => {
        await r.tap(r.page.locator('[data-admin-booking]').first())
        await r.page.waitForSelector('text=Time (both days)')
      })
      await r.say('**Who’s coming**: everyone in each slot, and the **seats** taken.', async () => {
        await r.tap(navTab(r, 'Classes'))
        await r.tap(r.page.getByRole('tab', { name: 'Who’s coming' }))
        await r.page.waitForSelector('[data-admin-attendees]')
        await r.look(r.page.locator('[data-admin-attendees]').first())
      })
      await r.unlook()
      await r.say('**Weekends**: close a weekend for a holiday, or one slot when it is full.', async () => {
        await r.tap(r.page.getByRole('tab', { name: 'Weekends' }))
        await r.page.waitForSelector('[data-admin-weekend-card]')
      })
      await r.say('Tap **Close**, write why if you like, then **Close this slot**.', async () => {
        await r.tap(r.page.locator('[data-admin-block-slot]').first())
        await r.type(r.page.getByPlaceholder('e.g. Holiday, Full'), 'Full', { delay: 90 })
        await r.tap('[data-admin-confirm-block]')
      })
      await r.say('Nobody can book it now. **Open** opens it again.', async () => {
        await r.look(r.page.getByRole('button', { name: 'Open', exact: true }).first())
      })
      await r.unlook()
      await r.say('**Fees & times**: class fees, the two time slots, and **seats per slot**.', async () => {
        await r.tap(r.page.getByRole('tab', { name: 'Fees & times' }))
        await r.page.waitForSelector('[data-admin-seats]')
      })
      await r.say('Change a number, here **8 seats** to **10**, then tap **Save class settings**.', async () => {
        await r.type('[data-admin-seats]', '10', { delay: 150 })
        await r.tap('[data-admin-save-classes]')
      })
    },
  },
  {
    id: '07-menu',
    short: 'Menu',
    title: 'Your menu',
    sub: 'Prices, Sold out, Hide, tub sizes, photos and Undo',
    start: `${DEMO}/menu`,
    ready: '[data-admin-product]',
    async run(r) {
      const box = product(r, 'red-velvet-delight-box')
      await r.say('To change a price, type the new one. Here **₹650** becomes **₹700**.', async () => {
        await r.show(box)
        await r.type(box.getByLabel(/^Price for 250/), '700', { delay: 150 })
      })
      await r.say('Tap **Save**. The website changes within a minute.', async () => {
        await r.tap(box.locator('[data-admin-save-product]'))
        await box.getByText('Changed by you').waitFor()
      })
      await r.say('Made a mistake? **Back to original** undoes your change.', async () => {
        await r.look(box.getByRole('button', { name: 'Back to original' }))
        await sleep(900)
        await r.unlook()
        await r.tap(box.getByRole('button', { name: 'Back to original' }))
      })
      await r.say('Run out? Tap **Mark sold out**. Later, tap **Back in stock**.', async () => {
        await r.tap(box.locator('[data-admin-soldout]'))
        await sleep(900)
        await r.tap(box.getByRole('button', { name: 'Back in stock' }))
      })
      await r.say('**Hide from menu** takes it off the website. **Show on menu** brings it back.', async () => {
        await r.tap(box.getByRole('button', { name: 'Hide from menu' }))
        await sleep(900)
        await r.tap(box.getByRole('button', { name: 'Show on menu' }))
      })
      const tub = product(r, 'dream-cake-tub')
      await r.say('**Tubs**: tap **+ Add a size**, type the size and price. These are only examples.', async () => {
        await r.show(tub)
        await r.tap(tub.getByRole('button', { name: '+ Add a size' }))
        await r.type(tub.getByLabel(/^Size \d+ name$/).last(), '500 g', { delay: 70 })
        await r.type(tub.getByLabel(/^Price for/).last(), '800', { delay: 120 })
      })
      await r.say('Tick **Show prices and allow ordering**, then **Save**.', async () => {
        await r.tap(tub.getByText('Show prices and allow ordering'))
        await r.tap(tub.locator('[data-admin-save-product]'))
      })
      const bar = product(r, 'almond-bar')
      await r.say('New photo? Tap **Change photo** and pick one. **Use the old photo** undoes it.', async () => {
        await r.show(bar)
        const chooser = r.page.waitForEvent('filechooser')
        await r.tap(bar.getByText('Change photo'))
        await (await chooser).setFiles(resolve('public/products/drawing-chocolate-bar.webp'))
        await bar.getByText('Photo saved').waitFor()
        await r.look(bar.locator('img').first(), bar.getByRole('button', { name: 'Use the old photo' }))
      })
      await r.unlook()
    },
  },
  {
    id: '08-settings',
    short: 'Settings',
    title: 'Settings',
    sub: 'Courier rates, dispatch time, banner, open or closed, emails, UPI',
    start: `${DEMO}/more`,
    ready: '[data-admin-more]',
    async run(r) {
      await r.say('**Settings** is under **More**.', async () => {
        await r.tap('[data-admin-more="settings"]')
        await r.page.waitForSelector('[data-admin-save-settings]')
      })
      await r.say('Going on holiday? Untick **Taking orders**, and say when you are back.', async () => {
        await r.tap('[data-admin-store-open]')
        await r.type(r.page.locator('label:has-text("Back on") input'), 'Back on 2 November', { delay: 55 })
        await sleep(500)
        await r.tap('[data-admin-store-open]')
      })
      await r.say('The **announcement banner** shows one line on every page.', async () => {
        await r.type('[data-admin-announcement]', 'Diwali orders close on 25 Oct', { delay: 55 })
      })
      await r.say('**Courier charges**, for Karnataka and outside.', async () => {
        await r.show(r.page.getByRole('heading', { name: 'Courier charges (₹)' }))
        await r.look(r.page.locator('section', { hasText: 'Courier charges' }))
      })
      await r.unlook()
      await r.say('Days needed **before dispatch**, and the **email** that gets new orders.', async () => {
        await r.show(r.page.getByRole('heading', { name: 'Time needed before dispatch' }))
        await r.look(r.page.locator('section', { hasText: 'Time needed before dispatch' }), '[data-admin-alert-email]')
      })
      await r.unlook()
      await r.say('**UPI** is the backup way to pay, only while Razorpay is not set up.', async () => {
        await r.show(r.page.getByRole('heading', { name: /^UPI/ }))
      })
      await r.say('When you are done, tap **Save settings**.', async () => {
        await r.tap('[data-admin-save-settings]')
      })
    },
  },
  {
    id: '09-enquiries',
    short: 'Enquiries',
    title: 'Enquiries',
    sub: 'Messages from the website',
    start: `${DEMO}/more`,
    ready: '[data-admin-more]',
    async run(r) {
      await r.say('Messages from the website are in **More**, **Enquiries**.', async () => {
        await r.tap('[data-admin-more="enquiries"]')
        await r.page.waitForSelector('[data-admin-enquiry]')
      })
      await r.say('Tap **Reply on WhatsApp**. A chat opens with a thank you typed.', async () => {
        await r.tap(r.page.locator('[data-admin-reply]').first(), { click: false })
        await r.look(r.page.locator('[data-admin-reply]').first())
      })
      await r.unlook()
      await r.say('Then tap **Mark handled**. It moves to **Handled**.', async () => {
        await r.tap(r.page.locator('[data-admin-handled]').first())
        await sleep(800)
        await r.tap(r.page.getByRole('tab', { name: /^Handled/ }))
      })
    },
  },
  {
    id: '10-reports',
    short: 'Reports',
    title: 'Reports',
    sub: 'The month in numbers, and downloads for Excel',
    start: `${DEMO}/more`,
    ready: '[data-admin-more]',
    async run(r) {
      await r.say('**Reports** shows this month’s **orders** and **money**.', async () => {
        await r.tap('[data-admin-more="reports"]')
        await r.page.waitForSelector('[data-admin-monthly]')
        await r.look(r.page.locator('[data-admin-monthly] dl'))
      })
      await r.unlook()
      await r.say('**Top 5 products** shows what sold most.', async () => {
        await r.show(r.page.getByRole('heading', { name: 'Top 5 products' }), { at: 'center' })
      })
      await r.say('**Download orders** saves a file for Excel or Google Sheets.', async () => {
        await r.show(r.page.getByRole('heading', { name: 'Download (CSV)' }))
        const dl = r.page.waitForEvent('download')
        await r.tap('[data-admin-download="orders"]')
        await dl
      })
    },
  },
  {
    id: '11-setup-login',
    short: 'Setup check and log in',
    title: 'Setup check, Log out and Forgot password',
    sub: 'Is everything connected?',
    start: `${DEMO}/more`,
    ready: '[data-admin-more]',
    // The practice database's own warning never shows on the real website
    css: '[data-admin-warnings]{display:none!important}',
    async run(r) {
      await r.say('**Setup check** is in **More**. Green means that part works.', async () => {
        await r.tap('[data-admin-more="setup"]')
        await r.page.waitForSelector('[data-admin-setup]')
        await r.look('[data-admin-setup-row="supabase"]')
      })
      await r.say('Red means not ready. Send Jashwanth a photo of it.', async () => {
        await r.unlook()
        await r.look('[data-admin-setup-row="razorpay"]')
      })
      await r.unlook()
      await r.say('Forgot your password? On the log in page, tap **Forgot password?**', async () => {
        await r.goto('/admin', 'input[type=email]')
        await r.tap('[data-admin-forgot]')
      })
      await r.say('Type your email and tap **Send me the link**.', async () => {
        await r.type('input[type=email]', ADMIN.email, { delay: 45 })
        await r.tap(btn(r, 'Send me the link'))
        await r.page.waitForSelector('text=is on its way')
      })
      await r.say('Open the email **on this phone** and make a new password.')
      await r.say('Then log in with your new password.', async () => {
        await r.tap(btn(r, 'Back to log in'))
        await r.page.locator('input[type=email]').fill(ADMIN.email)
        await r.page.locator('input[type=password]').fill(ADMIN.password)
        await r.tap(btn(r, 'Log in'))
        await r.page.waitForSelector('[data-admin-logout]')
      })
      await r.say('To log out, tap **Log out** at the top.', async () => {
        await r.tap('[data-admin-logout]')
        await r.page.waitForSelector('input[type=email]')
      })
    },
  },
]

const END = { id: '12-end', title: 'Questions?', sub: 'WhatsApp Jashwanth', voice: 'Questions? Send a WhatsApp message to Jashwanth. Happy baking, Hema!' }

/* ---------------- video files ---------------- */

function ff(args) {
  const r = spawnSync(ffmpegPath, ['-hide_banner', '-loglevel', 'error', '-y', ...args], { stdio: 'inherit' })
  if (r.status !== 0) throw new Error(`ffmpeg failed: ${args.join(' ')}`)
}

const VIDEO_OUT = ['-c:v', 'libx264', '-preset', 'slow', '-crf', '20', '-profile:v', 'high', '-pix_fmt', 'yuv420p', '-r', '25', '-fps_mode', 'cfr']
const AUDIO_OUT = ['-c:a', 'aac', '-b:a', '96k', '-ar', '44100', '-ac', '1']

/** Where the black moment starts in the recorded video (ms) */
function findBlack(video) {
  const r = spawnSync(ffmpegPath, ['-hide_banner', '-i', video, '-vf', 'blackdetect=d=0.2:pic_th=0.98:pix_th=0.04', '-an', '-f', 'null', '-'], { encoding: 'utf8' })
  const m = /black_start:([\d.]+)/.exec(r.stderr || '')
  if (!m) throw new Error(`no black mark found in ${video}`)
  return Math.round(Number(m[1]) * 1000)
}

/** One part: the recording from `trim` on, with every narration placed where its caption appeared */
function makeClip(rec, file) {
  // this script's clock -> the video's clock
  const shift = findBlack(rec.video) - rec.markAt
  const { video, audio } = rec
  const trim = rec.trim + shift
  const end = rec.end + shift
  console.log(`  video clock offset ${shift} ms`)
  const args = ['-ss', (trim / 1000).toFixed(3), '-t', ((end - trim) / 1000).toFixed(3), '-i', video]
  audio.forEach((a) => args.push('-i', a.file))
  // a silent bed as long as the clip, so every clip has sound and they join cleanly
  args.push('-f', 'lavfi', '-t', ((end - trim) / 1000).toFixed(3), '-i', 'anullsrc=r=44100:cl=mono')
  const bed = audio.length + 1
  const parts = audio.map((a, i) => `[${i + 1}:a]aresample=44100,adelay=${Math.max(0, a.at + shift - trim)}:all=1[a${i}]`)
  const mix = `${audio.map((_, i) => `[a${i}]`).join('')}[${bed}:a]amix=inputs=${audio.length + 1}:normalize=0:duration=longest[aout]`
  args.push('-filter_complex', [...parts, mix].join(';'), '-map', '0:v', '-map', '[aout]', ...VIDEO_OUT, ...AUDIO_OUT, '-shortest', '-movflags', '+faststart', file)
  ff(args)
}

/* ---------------- run ---------------- */

let browser = await chromium.launch()
let voice = startVoice()
if (voice && (await voice.ready) !== 'READY') {
  console.warn('Windows text-to-speech did not start: captions only')
  voice = null
}
/**
 * Records one part. The headless browser now and then stops drawing (seen once, mid-typing) and
 * then waits forever: after 4 minutes the part is recorded again in a fresh browser, up to 3 tries.
 */
async function attempt(record) {
  for (let n = 1; ; n++) {
    let timer
    try {
      return await Promise.race([record(), new Promise((_, no) => (timer = setTimeout(() => no(new Error('timed out')), 240_000)))])
    } catch (e) {
      if (n >= 3) throw e
      console.warn(`  try ${n} failed (${e.message.split('\n')[0]}), recording it again`)
      await Promise.race([browser.close(), sleep(10_000)]).catch(() => {})
      browser = await chromium.launch()
    } finally {
      clearTimeout(timer)
    }
  }
}

const done = []
try {
  for (const [i, part] of PARTS.entries()) {
    part.n = i + 1
    const file = join(CLIPS, `${part.id}.mp4`)
    if (ONLY.length && !ONLY.some((o) => part.id.startsWith(o))) {
      if (existsSync(file)) done.push(file)
      continue
    }
    console.log(`recording ${part.id}…`)
    const rec = await attempt(async () => {
      await part.before?.()
      const r = new Recorder(browser, voice, part)
      await r.open(part.css)
      await r.goto(part.start || '/admin', part.ready || 'input[type=email]')
      await r.startHere()
      await r.card(`Part ${part.n} of ${PARTS.length}`, part.title, part.sub, `Part ${part.n}. ${spoken(part.title)}.`)
      await r.hideCard()
      await part.run.call(part, r)
      return r.close()
    })
    makeClip(rec, file)
    done.push(file)
    console.log(`  ${file} (${((rec.end - rec.trim) / 1000).toFixed(0)} s)`)
  }

  // The end card
  const endFile = join(WORK, `${END.id}.mp4`)
  const endRec = await attempt(async () => {
    const r = new Recorder(browser, voice, { id: END.id, n: PARTS.length + 1, short: 'End' })
    await r.open()
    await r.goto(DEMO, '[data-admin-card]')
    await r.startHere()
    await r.card('', END.title, `**${END.sub}**`, END.voice, 5000)
    await sleep(1200)
    return r.close()
  })
  makeClip(endRec, endFile)

  // Everything in one video
  if (done.length === PARTS.length) {
    const all = [...done, endFile]
    const inputs = all.flatMap((f) => ['-i', f])
    const filter = `${all.map((_, i) => `[${i}:v][${i}:a]`).join('')}concat=n=${all.length}:v=1:a=1[v][a]`
    const full = join(OUT, 'admin-walkthrough.mp4')
    ff([...inputs, '-filter_complex', filter, '-map', '[v]', '-map', '[a]', ...VIDEO_OUT, ...AUDIO_OUT, '-movflags', '+faststart', full])
    console.log(`\n${full}`)
  } else console.log(`\n${done.length} of ${PARTS.length} clips ready; run without arguments for the full video`)
  console.log(`clips: ${readdirSync(CLIPS).join(', ')}`)
} finally {
  voice?.close()
  await browser.close()
}
writeFileSync(join(WORK, 'last-run.txt'), new Date().toISOString())
