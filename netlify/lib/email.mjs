// Sending emails. With RESEND_API_KEY set they go out through Resend (free tier). Without it
// (local dev, tests) each email is kept in an outbox instead (and written to
// DK_DEV_DATA_DIR/outbox), so nothing leaves the machine and the QA scripts can read them.
// An email that fails never fails the order. The emails themselves: emailTemplates.mjs.
import { mkdirSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'
import { config } from './env.mjs'

export * from './emailTemplates.mjs'

export const outbox = []

/** Where Hema's alert emails go: the address set in admin Settings, else HEMA_EMAIL */
export const alertEmail = (settingsRow) => settingsRow?.alert_email || config.hemaEmail || ''

/** Sends one email; never throws (an email problem must not lose an order). Returns true if sent or stored. */
export async function sendEmail(message, { fetchImpl = globalThis.fetch } = {}) {
  if (!message?.to) return false
  const entry = { ...message, from: config.emailFrom, at: new Date().toISOString() }
  if (!config.resendKey) {
    outbox.push(entry)
    if (config.devDataDir) {
      try {
        const dir = join(config.devDataDir, 'outbox')
        mkdirSync(dir, { recursive: true })
        writeFileSync(join(dir, `${Date.now()}-${message.subject.replace(/[^a-z0-9]+/gi, '-').slice(0, 60)}.json`), JSON.stringify(entry, null, 2))
      } catch {
        /* dev only */
      }
    }
    console.info(`[dk email] (not sent: no RESEND_API_KEY) to ${message.to}: ${message.subject}`)
    return true
  }
  const controller = new AbortController()
  const timer = setTimeout(() => controller.abort(), 6000)
  try {
    const res = await fetchImpl('https://api.resend.com/emails', {
      method: 'POST',
      headers: { authorization: `Bearer ${config.resendKey}`, 'content-type': 'application/json' },
      body: JSON.stringify({ from: config.emailFrom, to: [message.to], subject: message.subject, text: message.text, html: message.html }),
      signal: controller.signal,
    })
    if (!res.ok) console.error('[dk email] Resend refused', res.status, (await res.text()).slice(0, 300))
    return res.ok
  } catch (error) {
    console.error('[dk email] failed', error?.message)
    return false
  } finally {
    clearTimeout(timer)
  }
}

/** Sends several at once, waiting at most a few seconds in total */
export const sendAll = (messages) => Promise.all(messages.filter((m) => m?.to).map((m) => sendEmail(m)))
