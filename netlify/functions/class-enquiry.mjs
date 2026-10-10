// POST /api/class-enquiry: saves a message from the website and emails Hema.
//   kind 'class'   (default): the class question form on the Classes page
//   kind 'general': the message form on the Contact page
import { checkOrigin, clientIp, handle, HttpError, json, readJson } from '../lib/http.mjs'
import { getStore } from '../lib/store/index.mjs'
import { checkHoneypot, limit } from '../lib/limits.mjs'
import { alertEmail, hemaEnquiry, sendAll } from '../lib/email.mjs'
import { cleanEnquiry, enquiryErrors } from '../../src/lib/enquiry.js'

export default handle(async (req, context) => {
  checkOrigin(req)
  const body = await readJson(req, 8_000)
  checkHoneypot(body)
  const kind = body.kind === 'general' ? 'general' : 'class'
  const fields = enquiryErrors(body, kind)
  if (Object.keys(fields).length) throw new HttpError(400, 'details', { fields })
  const store = getStore()
  const row = cleanEnquiry(body, kind)
  await limit(store, 'enquiryIp', clientIp(req, context))
  await limit(store, 'enquiryPhone', row.phone)
  const saved = await store.insertEnquiry(row)
  await sendAll([hemaEnquiry(saved, alertEmail(await store.getSettings()))])
  return json(201, { ok: true })
})

export const config = { path: '/api/class-enquiry' }
