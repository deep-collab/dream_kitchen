import { useLocation, useParams } from 'react-router-dom'
import { useI18n } from '../i18n/I18nProvider'
import { useSeo } from '../hooks/useSeo'
import { useAsync } from '../hooks/useAsync'
import { getSavedBooking } from '../services'
import { normaliseBookingId } from '../lib/bookingId'
import { copyText } from '../lib/clipboard'
import { formatINR } from '../lib/pricing'
import { formatPhone } from '../lib/validation'
import { bookingMessage, bookingWhatsAppUrl } from '../lib/whatsappMessage'
import Container from '../components/ui/Container'
import Button from '../components/ui/Button'
import { useToast } from '../components/ui/Toast'
import Symbol from '../components/brand/Symbol'
import { batchText, durationText, locationText, modeText } from '../components/classes/classText'
import { CopyIcon, PinIcon } from '../components/icons'

/**
 * After "Send booking on WhatsApp". Nothing is booked until Hema replies, so the
 * page never says "booked": it says the booking is ready in WhatsApp, or, when the
 * browser blocked the tab, that one more step is needed (Open WhatsApp first).
 */
export default function ClassBooked() {
  useSeo('classBooked')
  const { t } = useI18n()
  const { id: rawId } = useParams()
  const id = normaliseBookingId(rawId)
  const { state } = useLocation()
  // Saved on this phone, so a refresh still shows it; navigation state covers blocked storage
  const { data: booking, loading } = useAsync(() => getSavedBooking(id).then((b) => b || (state?.booking?.id === id ? state.booking : null)), [id])

  if (loading) return <Container className="min-h-[50vh] py-16" aria-busy="true" />
  if (!booking) return <Missing id={id} />
  const blocked = state?.opened === false

  return (
    <Container className="py-10 lg:py-14">
      <div className="mx-auto max-w-[40rem]">
        <div className="text-center">
          <Symbol className="mx-auto h-16 w-auto" />
          <h1 className="t-h1 mt-4">{blocked ? t('booked.blockedTitle') : t('booked.title')}</h1>
          <p className="t-lead mt-3">{blocked ? t('booked.blockedLead') : t('booked.lead')}</p>
        </div>

        {blocked ? (
          <>
            <Fallback booking={booking} emphasise className="mt-8" />
            <IdCard id={booking.id} className="mt-6" />
          </>
        ) : (
          <>
            <IdCard id={booking.id} className="mt-8" />
            <Fallback booking={booking} className="mt-6" />
          </>
        )}

        <Details booking={booking} />

        <div className="mt-10 grid gap-3 sm:grid-cols-2">
          <Button variant="call" size="lg" fullWidth>
            {t('callOptions.call')}
          </Button>
          <Button to="/classes" variant="secondary" size="lg" fullWidth>
            {t('booked.moreClasses')}
          </Button>
        </div>
      </div>
    </Container>
  )
}

function IdCard({ id, className = '' }) {
  const { t } = useI18n()
  const toast = useToast()
  const copy = async () => toast.show({ message: (await copyText(id)) ? t('booked.copied') : t('success.copyFailed') })
  return (
    <section aria-labelledby="booking-id-label" className={`rounded-card border-2 border-ink p-5 text-center sm:p-6 ${className}`}>
      <p id="booking-id-label" className="font-bold text-brown-2">
        {t('booked.bookingId')}
      </p>
      <div className="mt-2 flex flex-wrap items-center justify-center gap-x-4 gap-y-2">
        <p className="font-body text-[1.75rem] leading-tight font-bold tracking-wide tabular-nums sm:text-[2.25rem]">{id}</p>
        <button
          type="button"
          onClick={copy}
          aria-label={t('booked.copyLabel', { id })}
          className="inline-flex min-h-12 items-center gap-2 rounded-control border-[1.5px] border-brown px-4 font-bold hover:bg-champagne"
        >
          <CopyIcon className="h-5 w-5" />
          <span>{t('success.copy')}</span>
        </button>
      </div>
      <p className="t-small mt-2 text-brown-2">{t('booked.saveId')}</p>
    </section>
  )
}

function Fallback({ booking, emphasise = false, className = '' }) {
  const { t } = useI18n()
  const toast = useToast()
  const copyDetails = async () => toast.show({ message: (await copyText(bookingMessage(booking))) ? t('booked.detailsCopied') : t('success.copyFailed') })
  return (
    <section aria-labelledby="fallback-title" className={`rounded-card bg-champagne p-5 sm:p-6 ${emphasise ? 'border-2 border-ink' : 'border border-line'} ${className}`}>
      <h2 id="fallback-title" className="t-h3">
        {t('success.fallbackTitle')}
      </h2>
      <p className="mt-2 text-brown-2">{t('booked.fallbackText')}</p>
      <div className="mt-5 grid gap-3">
        <Button variant="whatsapp" size="lg" href={bookingWhatsAppUrl(booking)} fullWidth>
          {t('success.openAgain')}
        </Button>
        <Button variant="secondary" icon={CopyIcon} fullWidth onClick={copyDetails}>
          {t('booked.copyDetails')}
        </Button>
      </div>
    </section>
  )
}

function Details({ booking: b }) {
  const { t, pick } = useI18n()
  const rows = [
    [t('booked.class'), `${pick(b.className)} (${modeText(b.mode, t)}, ${durationText(b.durationMinutes, t)})`],
    [t('booked.when'), batchText(b, t, { year: true })],
    [t('booked.people'), t('booking.totalFor', { count: b.people, price: formatINR(b.pricePerPerson) })],
    [t('booked.name'), `${b.customer.name}, ${formatPhone(b.customer.phone)}`],
  ]
  return (
    <section aria-labelledby="your-booking" className="mt-10 rounded-card border border-line p-5 sm:p-6">
      <h2 id="your-booking" className="t-h3">
        {t('booked.yourBooking')}
      </h2>
      <dl className="mt-4 grid gap-x-4 gap-y-3 sm:grid-cols-[auto_1fr]">
        {rows.map(([label, value]) => (
          <div key={label} className="contents">
            <dt className="font-bold">{label}</dt>
            <dd className="min-w-0 break-words">{value}</dd>
          </div>
        ))}
        <dt className="font-bold">{t('booked.where')}</dt>
        <dd className="flex items-start gap-2">
          <PinIcon className="mt-0.5 h-5 w-5 shrink-0" />
          {locationText(b.mode, t)}
        </dd>
      </dl>
      <div className="mt-4 flex items-baseline justify-between gap-4 border-t border-line pt-3">
        <p className="font-bold">{t('booked.total')}</p>
        <p className="t-price">{formatINR(b.total)}</p>
      </div>
    </section>
  )
}

function Missing({ id }) {
  const { t } = useI18n()
  return (
    <Container className="py-12 lg:py-16">
      <div className="max-w-[40rem]">
        <h1 className="t-h2">{t('booked.missingTitle')}</h1>
        <p className="mt-2 font-bold text-brown-2">{id}</p>
        <p className="t-lead mt-4 text-brown-2">{t('booked.missingText')}</p>
        <div className="mt-8 grid gap-3 sm:grid-cols-2">
          <Button variant="call" size="lg" fullWidth>
            {t('callOptions.call')}
          </Button>
          <Button variant="whatsapp" size="lg" fullWidth>
            {t('mobileMenu.chat')}
          </Button>
        </div>
        <Button to="/classes" variant="secondary" fullWidth className="mt-3">
          {t('booked.moreClasses')}
        </Button>
      </div>
    </Container>
  )
}
