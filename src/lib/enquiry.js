/*
  Class enquiry form: limits and checks shared by the Classes page and the class-enquiry function.
  enquiryErrors(form) -> { field: code } (empty = fine); the page shows classes.errors.<field>.<code>.
*/
import { normalisePhone, oneLine, phoneError } from './validation.js'

export const ENQUIRY_FIELDS = ['name', 'phone', 'interest', 'dates', 'message']
export const ENQUIRY_MAX = { name: 60, interest: 80, dates: 120, message: 500 }

export function enquiryErrors(form = {}) {
  const v = (k) => oneLine(form[k])
  const errors = {
    name: !v('name') ? 'required' : v('name').length < 2 ? 'short' : v('name').length > ENQUIRY_MAX.name ? 'long' : null,
    phone: phoneError(form.phone),
    interest: !v('interest') ? 'required' : v('interest').length > ENQUIRY_MAX.interest ? 'long' : null,
    dates: v('dates').length > ENQUIRY_MAX.dates ? 'long' : null,
    message: String(form.message ?? '').trim().length > ENQUIRY_MAX.message ? 'long' : null,
  }
  return Object.fromEntries(Object.entries(errors).filter(([, e]) => e))
}

export function cleanEnquiry(form = {}) {
  return {
    name: oneLine(form.name).slice(0, ENQUIRY_MAX.name),
    phone: normalisePhone(form.phone),
    interest: oneLine(form.interest).slice(0, ENQUIRY_MAX.interest),
    preferred_dates: oneLine(form.dates).slice(0, ENQUIRY_MAX.dates) || null,
    message: String(form.message ?? '').trim().replace(/\r\n/g, '\n').slice(0, ENQUIRY_MAX.message) || null,
    lang: form.lang === 'kn' ? 'kn' : 'en',
  }
}
