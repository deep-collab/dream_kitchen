import { useEffect, useState } from 'react'
import { useLocation } from 'react-router-dom'
import { useI18n } from '../i18n/I18nProvider'
import { useSeo } from '../hooks/useSeo'
import { classSchedule, classes } from '../data/classInfo'
import { applyClassSettings, slotLabel } from '../lib/classTimes'
import { waLink } from '../config/site'
import { useShopStatus } from '../context/MenuProvider'
import { formatINR } from '../lib/pricing'
import { classBookingText } from '../lib/whatsappText'
import { ENQUIRY_FIELDS, ENQUIRY_MAX, enquiryErrors } from '../lib/enquiry'
import { formatPhone, tidyPhoneInput } from '../lib/validation'
import { errorText } from '../lib/api'
import { sendClassEnquiry } from '../services'
import Container from '../components/ui/Container'
import Button from '../components/ui/Button'
import Badge from '../components/ui/Badge'
import TextField, { PhoneField } from '../components/ui/TextField'
import ProductArt from '../components/art/ProductArt'
import { AlertIcon, CheckIcon } from '../components/icons'
import 'virtual:dk-strings/classes'

const FACTS = ['when', 'duration', 'slots']
const EMPTY = { name: '', phone: '', interest: '', dates: '', message: '', website: '' }

/**
 * Classes (Hema's details, 7 Oct 2026, from src/data/classInfo.js): when, how long and the time
 * slots, then one short card per class with its price and "Book on WhatsApp". The enquiry form
 * (saved on the website; Hema gets an email) shows only once the database is connected, so it
 * can never fail; until then the WhatsApp buttons take bookings and questions.
 */
export default function Classes() {
  useSeo('classes')
  const { t, pick, lang } = useI18n()
  const { remoteLoaded, backendReady, razorpay, settings } = useShopStatus()
  // Online booking: the database is connected and there is a way to pay (Razorpay, or the UPI fallback)
  const bookOnline = remoteLoaded && backendReady && (razorpay.enabled || Boolean(settings.payment.upiId))
  const [form, setForm] = useState(EMPTY)
  const [tried, setTried] = useState(false)
  const [busy, setBusy] = useState(false)
  const [sent, setSent] = useState(null)
  const [error, setError] = useState(null)
  const errors = enquiryErrors(form)
  const msg = (k) => tried && errors[k] && t(`classes.errors.${k}.${errors[k]}`, { max: ENQUIRY_MAX[k] })
  const set = (k) => (e) => setForm((f) => ({ ...f, [k]: e.target.value }))

  // /classes#book (the home page's "Book a class"): land on the class cards
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
              <p className="mt-1 text-brown-2">{t(bookOnline ? 'classes.leadBook' : 'classes.lead')}</p>
            </div>
          </div>
          <dl className="mt-5 divide-y divide-line border-y border-line">
            {FACTS.map((k) => (
              <div key={k} className="grid gap-1 py-3 sm:grid-cols-[10rem_1fr]">
                <dt className="font-bold">{t(`classes.sections.${k}`)}</dt>
                <dd>{k === 'slots' ? applyClassSettings().slots.map((s) => slotLabel(s, lang, pick)).join(t('classes.slotsOr')) : pick(classSchedule[k])}</dd>
              </div>
            ))}
          </dl>
        </div>

        <div className="space-y-8">
          <section id="book" aria-labelledby="cl-title" className="scroll-mt-[calc(var(--header-h)+1rem)]">
            <h2 id="cl-title" className="t-h3">
              {t('classes.choose')}
            </h2>
            <ul className="mt-3 space-y-3">
              {classes.map((c) => (
                <li key={c.id} data-dk-class={c.id} className="rounded-card border border-line bg-[#fffcf5] p-4 sm:p-5">
                  <div className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1">
                    <h3 className="t-h3">{t('classes.cardTitle', { name: pick(c.name) })}</h3>
                    <p className="t-price tabular-nums">{formatINR(c.price)}</p>
                  </div>
                  {c.beginnerFriendly && (
                    <Badge tone="soft" className="mt-2">
                      {t('classes.beginner')}
                    </Badge>
                  )}
                  {bookOnline ? (
                    <Button to={`/classes/book?class=${c.id}`} fullWidth className="mt-3" data-dk-book-class={c.id}>
                      {t('classes.bookNow')}
                      <span className="sr-only"> {t('classes.cardTitle', { name: pick(c.name) })}</span>
                    </Button>
                  ) : (
                    <Button variant="whatsapp" href={waLink(classBookingText(c))} fullWidth className="mt-3">
                      {t('classes.bookWhatsApp')}
                      <span className="sr-only">
                        {' '}
                        {t('classes.cardTitle', { name: pick(c.name) })} {t('common.newTab')}
                      </span>
                    </Button>
                  )}
                </li>
              ))}
            </ul>
          </section>

          {/* Only once the database is connected (until then it could not be sent) */}
          {remoteLoaded && backendReady && (
            <section aria-labelledby="ce-title" className="rounded-card bg-champagne p-4 sm:p-6">
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
          )}
        </div>
      </div>
    </Container>
  )
}
