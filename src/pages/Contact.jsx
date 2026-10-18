import { useState } from 'react'
import { Link } from 'react-router-dom'
import { useI18n } from '../i18n/I18nProvider'
import { useSeo } from '../hooks/useSeo'
import { useShopStatus } from '../context/MenuProvider'
import { hasCallHours, site, waLink } from '../config/site'
import { formatCallHours } from '../lib/hours'
import { ENQUIRY_MAX, GENERAL_FIELDS, enquiryErrors } from '../lib/enquiry'
import { formatPhone, tidyPhoneInput } from '../lib/validation'
import { errorText } from '../lib/api'
import { sendClassEnquiry } from '../services'
import Container from '../components/ui/Container'
import Button from '../components/ui/Button'
import TextField, { PhoneField } from '../components/ui/TextField'
import { AlertIcon, CheckIcon, ClockIcon, InstagramIcon, MailIcon, WhatsAppIcon } from '../components/icons'
import 'virtual:dk-strings/contact'

const EMPTY = { name: '', phone: '', message: '', website: '' }

/**
 * Contact: a plain "Chat on WhatsApp" link, Instagram, the phone number as text, hours / email /
 * FSSAI once Hema confirms them (src/config/site.js), and a message form (saved on the website;
 * Hema gets an email and sees it in the admin). The form shows only once the database is
 * connected, so it can never fail; until then WhatsApp takes questions.
 */
export default function Contact() {
  useSeo('contact')
  const { t } = useI18n()
  const { remoteLoaded, backendReady } = useShopStatus()
  const row = 'flex min-h-16 items-center gap-4 rounded-card border border-line bg-[#fffcf5] p-4 transition-colors hover:border-ink'
  return (
    <Container className="py-6 lg:py-12">
      <div className="grid gap-8 lg:grid-cols-2 lg:gap-12">
        <div className="max-w-xl">
          <h1 className="t-h2">{t('contact.title')}</h1>
          <p className="mt-1 text-brown-2">{t('contact.lead')}</p>

          <ul className="mt-5 space-y-3">
            <li>
              <a href={waLink()} target="_blank" rel="noopener noreferrer" className={row}>
                <WhatsAppIcon className="h-7 w-7 shrink-0 text-whatsapp" />
                <span>
                  <span className="block font-bold">
                    {t('contact.whatsapp')}
                    <span className="sr-only"> {t('common.newTab')}</span>
                  </span>
                  <span className="t-small block text-brown-2">{t('contact.whatsappText')}</span>
                </span>
              </a>
            </li>
            <li>
              <a
                href={site.instagramUrl}
                target="_blank"
                rel="noopener noreferrer"
                aria-label={t('common.instagramLabel', { handle: `@${site.instagramHandle}` })}
                className={row}
              >
                <InstagramIcon className="h-7 w-7 shrink-0" />
                <span>
                  <span className="block font-bold">{t('contact.instagram')}</span>
                  <span className="t-small block break-all text-brown-2">@{site.instagramHandle}</span>
                </span>
              </a>
            </li>
            {site.email && (
              <li>
                <a href={`mailto:${site.email}`} className={row}>
                  <MailIcon className="h-7 w-7 shrink-0" />
                  <span>
                    <span className="block font-bold">{t('contact.email')}</span>
                    <span className="t-small block break-all text-brown-2">{site.email}</span>
                  </span>
                </a>
              </li>
            )}
          </ul>

          <address className="mt-5 space-y-1 not-italic" data-dk-business>
            <p>
              <span className="font-bold">{site.name}</span> · {t('footer.owner')}
            </p>
            <p>
              <span className="font-bold">{t('contact.phone')}:</span> {site.phone.display}
            </p>
            {site.address && (
              <p>
                <span className="font-bold">{t('footer.address')}:</span> {site.address}
              </p>
            )}
          </address>
          {hasCallHours() && (
            <p className="mt-5 flex gap-3">
              <ClockIcon className="mt-0.5 h-6 w-6 shrink-0" />
              <span>
                <span className="block font-bold">{t('hours.label')}</span>
                {formatCallHours(t)}
              </span>
            </p>
          )}
          {site.fssai && (
            <p className="mt-3">
              <span className="font-bold">{t('contact.fssai')}:</span> {site.fssai}
            </p>
          )}
          <p className="mt-6 flex flex-wrap gap-x-6">
            <Link to="/track" className="inline-flex min-h-12 items-center font-bold underline underline-offset-4">
              {t('contact.track')}
            </Link>
            <Link to="/faq" className="inline-flex min-h-12 items-center font-bold underline underline-offset-4">
              {t('contact.faq')}
            </Link>
          </p>
        </div>

        {remoteLoaded && backendReady && <MessageForm />}
      </div>
    </Container>
  )
}

function MessageForm() {
  const { t, lang } = useI18n()
  const [form, setForm] = useState(EMPTY)
  const [tried, setTried] = useState(false)
  const [busy, setBusy] = useState(false)
  const [sent, setSent] = useState(null)
  const [error, setError] = useState(null)
  const errors = enquiryErrors(form, 'general')
  const msg = (k) => tried && errors[k] && t(`contact.errors.${k}.${errors[k]}`, { max: ENQUIRY_MAX[k] })
  const set = (k) => (e) => setForm((f) => ({ ...f, [k]: e.target.value }))

  const onSubmit = async (e) => {
    e.preventDefault()
    setTried(true)
    const bad = GENERAL_FIELDS.find((k) => errors[k])
    if (bad) return document.getElementById(`cm-${bad}`)?.focus()
    setBusy(true)
    setError(null)
    const r = await sendClassEnquiry({ ...form, kind: 'general', lang })
    setBusy(false)
    if (r.ok) {
      setSent(form.phone)
      setForm(EMPTY)
      setTried(false)
    } else setError(errorText(t, r))
  }

  return (
    <section aria-labelledby="cm-title" className="rounded-card bg-champagne p-4 sm:p-6 lg:self-start">
      <h2 id="cm-title" className="t-h3">
        {t('contact.formTitle')}
      </h2>
      {sent ? (
        <div role="status" className="mt-4 space-y-3">
          <p className="flex items-center gap-2 font-bold">
            <CheckIcon className="h-6 w-6" />
            {t('contact.sentTitle')}
          </p>
          <p>{t('contact.sentText', { phone: formatPhone(sent) })}</p>
          <Button variant="secondary" onClick={() => setSent(null)}>
            {t('contact.another')}
          </Button>
        </div>
      ) : (
        <form noValidate onSubmit={onSubmit} className="mt-4 space-y-4">
          <div aria-hidden="true" className="absolute -left-[9999px] h-px w-px overflow-hidden">
            <label>
              Website
              <input tabIndex={-1} autoComplete="off" value={form.website} onChange={set('website')} />
            </label>
          </div>
          <TextField id="cm-name" label={t('contact.name')} autoComplete="name" maxLength={ENQUIRY_MAX.name} value={form.name} onChange={set('name')} error={msg('name')} />
          <PhoneField id="cm-phone" label={t('contact.phoneField')} value={form.phone} onChange={set('phone')} onBlur={() => setForm((f) => ({ ...f, phone: tidyPhoneInput(f.phone) }))} error={msg('phone')} />
          <TextField id="cm-message" as="textarea" rows={4} label={t('contact.message')} maxLength={ENQUIRY_MAX.message} value={form.message} onChange={set('message')} error={msg('message')} />
          {error && (
            <p role="alert" className="flex items-start gap-2 font-bold text-error">
              <AlertIcon className="mt-0.5 h-5 w-5 shrink-0" />
              {error}
            </p>
          )}
          <Button type="submit" size="lg" fullWidth disabled={busy} data-dk-message>
            {busy ? t('contact.sending') : t('contact.send')}
          </Button>
        </form>
      )}
    </section>
  )
}
