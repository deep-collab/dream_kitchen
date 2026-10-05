// POST /api/class-enquiry: saves a class enquiry from the Classes page and emails Hema.
import { checkOrigin, clientIp, handle, HttpError, json, readJson } from '../lib/http.mjs'
import { getStore } from '../lib/store/index.mjs'
import { checkHoneypot, limit } from '../lib/limits.mjs'
import { hemaEnquiry, sendAll } from '../lib/email.mjs'
import { cleanEnquiry, enquiryErrors } from '../../src/lib/enquiry.js'

export default handle(async (req, context) => {
  checkOrigin(req)
  const body = await readJson(req, 8_000)
  checkHoneypot(body)
  const fields = enquiryErrors(body)
  if (Object.keys(fields).length) throw new HttpError(400, 'details', { fields })
  const store = getStore()
  const row = cleanEnquiry(body)
  await limit(store, 'enquiryIp', clientIp(req, context))
  await limit(store, 'enquiryPhone', row.phone)
  const saved = await store.insertEnquiry(row)
  await sendAll([hemaEnquiry(saved)])
  return json(201, { ok: true })
})

export const config = { path: '/api/class-enquiry' }
