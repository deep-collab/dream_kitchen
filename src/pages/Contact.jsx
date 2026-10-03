import { useState } from 'react'
import { useI18n } from '../i18n/I18nProvider'
import en from '../i18n/en.json'
import { useSeo } from '../hooks/useSeo'
import { createEnquiry } from '../services'
import { site, telLink, waLink } from '../config/site'
import { isValidPhone } from '../lib/validation'
import { enquiryMessage } from '../lib/whatsappMessage'
import { formatCallHours } from '../lib/hours'
import PageHero from '../components/PageHero'
import Container from '../components/ui/Container'
import Button from '../components/ui/Button'
import TextField, { PhoneField } from '../components/ui/TextField'
import { ClockIcon, InstagramIcon, PhoneIcon, PinIcon, WhatsAppIcon } from '../components/icons'

// Step 4 rebuilds this page (call-back form, voice message). Enquiry form kept working meanwhile.
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
    [PhoneIcon, t('mobileBar.call'), site.phone.display, telLink],
    [WhatsAppIcon, t('contact.whatsapp'), site.phone.display, waLink(t('wa.general'))],
    [InstagramIcon, t('contact.instagram'), site.instagram.handle, site.instagram.url],
    [ClockIcon, t('contact.hours'), formatCallHours(t)],
    [PinIcon, t('contact.location'), t('contact.deliveryText')],
  ]

  return (
    <>
      <PageHero title={t('contact.title')} subtitle={t('contact.subtitle')} />
      <Container className="grid gap-10 py-12 lg:grid-cols-[1.3fr_1fr] lg:items-start lg:py-16">
        <form onSubmit={onSubmit} noValidate className="space-y-6">
          <h2 className="t-h2">{t('contact.formTitle')}</h2>
          {sent && (
            <p role="status" className="rounded-card border border-line bg-champagne p-4 font-bold">
              {t('contact.sent')}
            </p>
          )}
          <div className="grid gap-6 sm:grid-cols-2">
            <TextField id="en-name" label={t('contact.name')} autoComplete="name" value={form.name} onChange={set('name')} error={show('name')} />
            <PhoneField id="en-phone" label={t('contact.phone')} value={form.phone} onChange={set('phone')} error={show('phone')} />
          </div>
          <TextField id="en-type" as="select" label={t('contact.type')} value={form.type} onChange={set('type')}>
            {TYPES.map((k) => (
              <option key={k} value={k}>
                {t(`contact.types.${k}`)}
              </option>
            ))}
          </TextField>
          <TextField
            id="en-message"
            as="textarea"
            rows={4}
            maxLength={800}
            label={t('contact.message')}
            placeholder={t('contact.messagePlaceholder')}
            value={form.message}
            onChange={set('message')}
            error={show('message')}
          />
          <Button type="submit" variant="whatsapp" size="lg" fullWidth icon={WhatsAppIcon}>
            {t('contact.submit')}
          </Button>
        </form>

        <aside aria-labelledby="reach-title" className="rounded-card bg-champagne p-6">
          <h2 id="reach-title" className="t-h3">
            {t('contact.reach')}
          </h2>
          <ul className="mt-4 space-y-4">
            {reach.map(([Icon, label, value, href]) => (
              <li key={label} className="flex gap-3">
                <Icon className="mt-1 h-6 w-6 shrink-0" />
                <div className="min-w-0">
                  <p className="t-small text-brown-2">{label}</p>
                  {href ? (
                    <a
                      className="link inline-flex min-h-12 items-center font-bold break-all"
                      href={href}
                      target={href.startsWith('http') ? '_blank' : undefined}
                      rel={href.startsWith('http') ? 'noopener noreferrer' : undefined}
                    >
                      {value}
                    </a>
                  ) : (
                    <p className="font-bold">{value}</p>
                  )}
                </div>
              </li>
            ))}
          </ul>
        </aside>
      </Container>
    </>
  )
}
