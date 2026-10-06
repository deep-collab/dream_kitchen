import { useEffect, useState } from 'react'
import { useLocation } from 'react-router-dom'
import { useI18n } from '../i18n/I18nProvider'
import { useSeo } from '../hooks/useSeo'
import { classInfo } from '../data/classInfo'
import { ENQUIRY_FIELDS, ENQUIRY_MAX, enquiryErrors } from '../lib/enquiry'
import { formatPhone, tidyPhoneInput } from '../lib/validation'
import { errorText } from '../lib/api'
import { sendClassEnquiry } from '../services'
import Container from '../components/ui/Container'
import Button from '../components/ui/Button'
import TextField, { PhoneField } from '../components/ui/TextField'
import ProductArt from '../components/art/ProductArt'
import { AlertIcon, CheckIcon } from '../components/icons'
import 'virtual:dk-strings/classes'

const SECTIONS = ['learn', 'duration', 'fee', 'batch', 'dates', 'bring']
const EMPTY = { name: '', phone: '', interest: '', dates: '', message: '', website: '' }

/**
 * Classes: a short info page (every section from src/data/classInfo.js, "Details coming soon"
 * until Hema fills it in) and an enquiry form saved on the website; Hema gets an email.
 */
export default function Classes() {
  useSeo('classes')
  const { t, pick, lang } = useI18n()
  const [form, setForm] = useState(EMPTY)
  const [tried, setTried] = useState(false)
  const [busy, setBusy] = useState(false)
  const [sent, setSent] = useState(null)
  const [error, setError] = useState(null)
  const errors = enquiryErrors(form)
  const msg = (k) => tried && errors[k] && t(`classes.errors.${k}.${errors[k]}`, { max: ENQUIRY_MAX[k] })
  const set = (k) => (e) => setForm((f) => ({ ...f, [k]: e.target.value }))

  // /classes#book (the home page's "Book a class"): land on the booking form
  const { hash } = useLocation()
  useEffect(() => {
    if (hash !== '#book') return
    const land = () => document.getElementById('book')?.scrollIntoView({ block: 'start' })
    requestAnimationFrame(land)
    // the fonts can still change the layout: land again once they are in
    document.fonts?.ready.then(land)
  }, [hash])

  const onSubmit = async (e) => {
    e.preventDefault()
    setTried(true)
    const bad = ENQUIRY_FIELDS.find((k) => errors[k])
    if (bad) return document.getElementById(`ce-${bad}`)?.focus()
    setBusy(true)
    setError(null)
    const r = await sendClassEnquiry({ ...form, lang })
    setBusy(false)
    if (r.ok) {
      setSent(form.phone)
      setForm(EMPTY)
      setTried(false)
    } else setError(errorText(t, r))
  }

  return (
    <Container className="py-6 lg:py-10">
      <div className="grid gap-8 lg:grid-cols-2 lg:gap-12">
        <div>
          <div className="flex items-start gap-4">
            <ProductArt kind="class" rounded="rounded-card" className="h-20 w-20 shrink-0" />
            <div>
              <h1 className="t-h2">{t('classes.title')}</h1>
              <p className="mt-1 text-brown-2">{t('classes.lead')}</p>
            </div>
          </div>
          <dl className="mt-5 divide-y divide-line border-y border-line">
            {SECTIONS.map((k) => (
              <div key={k} className="grid gap-1 py-3 sm:grid-cols-[10rem_1fr]">
                <dt className="font-bold">{t(`classes.sections.${k}`)}</dt>
                <dd className={classInfo[k] ? '' : 'text-brown-2 italic'}>{classInfo[k] ? pick(classInfo[k]) : t('classes.soon')}</dd>
              </div>
            ))}
          </dl>
        </div>

        <section id="book" aria-labelledby="ce-title" className="scroll-mt-[calc(var(--header-h)+1rem)] rounded-card bg-champagne p-4 sm:p-6">
          <h2 id="ce-title" className="t-h3">
            {t('classes.formTitle')}
          </h2>
          {sent ? (
            <div role="status" className="mt-4 space-y-3">
              <p className="flex items-center gap-2 font-bold">
                <CheckIcon className="h-6 w-6" />
                {t('classes.sentTitle')}
              </p>
              <p>{t('classes.sentText', { phone: formatPhone(sent) })}</p>
              <Button variant="secondary" onClick={() => setSent(null)}>
                {t('classes.another')}
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
              <TextField id="ce-name" label={t('classes.name')} autoComplete="name" maxLength={ENQUIRY_MAX.name} value={form.name} onChange={set('name')} error={msg('name')} />
              <PhoneField
                id="ce-phone"
                label={t('classes.phone')}
                value={form.phone}
                onChange={set('phone')}
                onBlur={() => setForm((f) => ({ ...f, phone: tidyPhoneInput(f.phone) }))}
                error={msg('phone')}
              />
              <TextField id="ce-interest" label={t('classes.interest')} hint={t('classes.interestHint')} maxLength={ENQUIRY_MAX.interest} value={form.interest} onChange={set('interest')} error={msg('interest')} />
              <TextField id="ce-dates" label={t('classes.dates')} hint={t('classes.datesHint')} optional maxLength={ENQUIRY_MAX.dates} value={form.dates} onChange={set('dates')} error={msg('dates')} />
              <TextField id="ce-message" as="textarea" rows={3} label={t('classes.message')} optional maxLength={ENQUIRY_MAX.message} value={form.message} onChange={set('message')} error={msg('message')} />
              {error && (
                <p role="alert" className="flex items-start gap-2 font-bold text-error">
                  <AlertIcon className="mt-0.5 h-5 w-5 shrink-0" />
                  {error}
                </p>
              )}
              <Button type="submit" size="lg" fullWidth disabled={busy} data-dk-enquire>
                {busy ? t('classes.sending') : t('classes.send')}
              </Button>
            </form>
          )}
        </section>
      </div>
    </Container>
  )
}
