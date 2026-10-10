/*
  Enquiry forms: limits and checks shared by the pages and the enquiry function.
    kind 'class'   (Classes page): name, phone, which class / what to learn, dates, message
    kind 'general' (Contact page): name, phone, message
  enquiryErrors(form, kind) -> { field: code } (empty = fine); the page shows
  classes.errors.<field>.<code> (or contact.errors.<field>.<code>).
*/
import { normalisePhone, oneLine, phoneError } from './validation.js'

export const ENQUIRY_FIELDS = ['name', 'phone', 'interest', 'dates', 'message']
export const GENERAL_FIELDS = ['name', 'phone', 'message']
export const ENQUIRY_MAX = { name: 60, interest: 80, dates: 120, message: 500 }
export const GENERAL_INTEREST = 'General message'

export function enquiryErrors(form = {}, kind = 'class') {
  const v = (k) => oneLine(form[k])
  const message = String(form.message ?? '').trim()
  const errors = {
    name: !v('name') ? 'required' : v('name').length < 2 ? 'short' : v('name').length > ENQUIRY_MAX.name ? 'long' : null,
    phone: phoneError(form.phone),
    interest: kind === 'general' ? null : !v('interest') ? 'required' : v('interest').length > ENQUIRY_MAX.interest ? 'long' : null,
    dates: kind === 'general' ? null : v('dates').length > ENQUIRY_MAX.dates ? 'long' : null,
    message: kind === 'general' && message.length < 2 ? 'required' : message.length > ENQUIRY_MAX.message ? 'long' : null,
  }
  return Object.fromEntries(Object.entries(errors).filter(([, e]) => e))
}

export function cleanEnquiry(form = {}, kind = 'class') {
  return {
    kind,
    name: oneLine(form.name).slice(0, ENQUIRY_MAX.name),
    phone: normalisePhone(form.phone),
    interest: kind === 'general' ? GENERAL_INTEREST : oneLine(form.interest).slice(0, ENQUIRY_MAX.interest),
    preferred_dates: kind === 'general' ? null : oneLine(form.dates).slice(0, ENQUIRY_MAX.dates) || null,
    message: String(form.message ?? '').trim().replace(/\r\n/g, '\n').slice(0, ENQUIRY_MAX.message) || null,
    lang: form.lang === 'kn' ? 'kn' : 'en',
  }
}
