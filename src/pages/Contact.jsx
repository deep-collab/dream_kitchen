import { useState } from 'react'
import { useI18n } from '../i18n/I18nProvider'
import en from '../i18n/en.json'
import { useSeo } from '../hooks/useSeo'
import { createEnquiry } from '../services'
import { site, waLink } from '../config/site'
import { isValidPhone } from '../lib/validation'
import { enquiryMessage } from '../lib/whatsapp'
import PageHero from '../components/PageHero'
import Field from '../components/Field'
import { ClockIcon, InstagramIcon, MailIcon, PinIcon, WhatsAppIcon } from '../components/Icons'

const TYPES = ['general', 'bulk', 'custom', 'wedding', 'return']

export default function Contact() {
  useSeo('contact')
  const { t } = useI18n()
  const [form, setForm] = useState({ name: '', phone: '', type: 'general', message: '' })
  const [submitted, setSubmitted] = useState(false)
  const [sent, setSent] = useState(false)

  const errors = {}
  if (form.name.trim().length < 2) errors.name = t('contact.errors.name')
  if (!isValidPhone(form.phone)) errors.phone = t('contact.errors.phone')
  if (form.message.trim().length < 5) errors.message = t('contact.errors.message')
  const show = (k) => (submitted ? errors[k] : undefined)
  const set = (k) => (e) => setForm((f) => ({ ...f, [k]: e.target.value }))

  const onSubmit = async (e) => {
    e.preventDefault()
    setSubmitted(true)
    const bad = ['name', 'phone', 'message'].find((k) => errors[k])
    if (bad) {
      document.getElementById(`en-${bad}`)?.focus()
      return
    }
    const win = window.open('', '_blank')
    const enquiry = await createEnquiry(form)
    // Enquiry type label is sent in English so messages stay consistent
    const url = waLink(enquiryMessage(enquiry, en.contact.types[form.type]))
    if (win) {
      win.opener = null
      win.location.href = url
    } else {
      window.location.href = url
    }
    setSent(true)
    setSubmitted(false)
    setForm({ name: '', phone: '', type: 'general', message: '' })
  }

  const reach = [
    [WhatsAppIcon, t('contact.whatsapp'), `+91 ${site.whatsapp}`, waLink(t('wa.general'))],
    [MailIcon, t('contact.email'), site.email, `mailto:${site.email}`],
    [InstagramIcon, t('contact.instagram'), site.social.instagramHandle, site.social.instagram],
    [PinIcon, t('contact.location'), t('contact.locationText')],
    [ClockIcon, t('contact.hours'), t('contact.hoursText')],
  ]

  return (
    <>
      <PageHero title={t('contact.title')} subtitle={t('contact.subtitle')} />
      <div className="container-dk grid gap-6 py-8 sm:py-10 lg:grid-cols-[1.3fr_1fr] lg:items-start">
        <form onSubmit={onSubmit} noValidate className="card space-y-5 p-5 sm:p-8">
          <h2 className="text-2xl font-bold">{t('contact.formTitle')}</h2>
          {sent && (
            <p role="status" className="rounded-2xl bg-[#E5F2E3] p-3 font-bold text-[#1F4D25]">
              {t('contact.sent')}
            </p>
          )}
          <div className="grid gap-5 sm:grid-cols-2">
            <Field id="en-name" label={t('contact.name')} error={show('name')}>
              <input className="input" autoComplete="name" value={form.name} onChange={set('name')} />
            </Field>
            <Field id="en-phone" label={t('contact.phone')} error={show('phone')}>
              <input className="input" type="tel" inputMode="numeric" autoComplete="tel-national" placeholder="98765 43210" value={form.phone} onChange={set('phone')} />
            </Field>
          </div>
          <Field id="en-type" label={t('contact.type')}>
            <select className="input" value={form.type} onChange={set('type')}>
              {TYPES.map((k) => (
                <option key={k} value={k}>
                  {t(`contact.types.${k}`)}
                </option>
              ))}
            </select>
          </Field>
          <Field id="en-message" label={t('contact.message')} error={show('message')}>
            <textarea className="input min-h-32" rows={4} maxLength={800} placeholder={t('contact.messagePlaceholder')} value={form.message} onChange={set('message')} />
          </Field>
          <button type="submit" className="btn btn-whatsapp w-full text-lg">
            <WhatsAppIcon /> {t('contact.submit')}
          </button>
        </form>

        <aside className="card-cream p-5 sm:p-6" aria-labelledby="reach-title">
          <h2 id="reach-title" className="text-2xl font-bold">
            {t('contact.reach')}
          </h2>
          <ul className="mt-4 space-y-3">
            {reach.map(([Icon, label, value, href]) => (
              <li key={label} className="flex gap-3">
                <span className="grid h-11 w-11 shrink-0 place-items-center rounded-full bg-tint text-dark">
                  <Icon className="h-5 w-5" />
                </span>
                <div className="min-w-0">
                  <p className="text-sm font-bold text-brown">{label}</p>
                  {href ? (
                    <a className="link-underline font-bold break-words text-deep" href={href} target={href.startsWith('http') ? '_blank' : undefined} rel="noopener noreferrer">
                      {value}
                    </a>
                  ) : (
                    <p className="font-bold text-deep">{value}</p>
                  )}
                </div>
              </li>
            ))}
          </ul>
        </aside>
      </div>
    </>
  )
}

