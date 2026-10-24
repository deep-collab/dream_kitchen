import { useI18n } from '../i18n/I18nProvider'
import { useSeo } from '../hooks/useSeo'
import { useShopStatus } from '../context/MenuProvider'
import { optionPrices } from '../config/shop'
import { site } from '../config/site'
import { formatINR } from '../lib/pricing'
import Container from '../components/ui/Container'
import { ChevronDownIcon } from '../components/icons'
import 'virtual:dk-strings/faq'

// Every number in the answers comes from config / Hema's settings, so they never go out of date.
const ITEMS = ['order', 'pay', 'courier', 'when', 'track', 'name', 'ragi', 'change']

export default function FAQ() {
  useSeo('faq')
  const { t } = useI18n()
  const { settings, razorpay } = useShopStatus()
  // Ordering and paying: Razorpay once it is set up, else the UPI reference (the fallback)
  const answer = (k) => (razorpay.enabled && (k === 'order' || k === 'pay') ? `faq.items.${k}.aOnline` : `faq.items.${k}.a`)
  const r = settings.courier.rates
  const vars = {
    phone: site.phone.display,
    days: settings.leadTimes.standardBusinessDays,
    drawingPrice: formatINR(optionPrices.drawing),
    smallKa: formatINR(r.small.karnataka),
    smallOut: formatINR(r.small.outside),
    largeKa: formatINR(r.large.karnataka),
    largeOut: formatINR(r.large.outside),
    xlKa: formatINR(r.xl.karnataka),
    xlOut: formatINR(r.xl.outside),
  }
  return (
    <Container className="py-6 lg:py-12">
      <div className="max-w-2xl">
        <h1 className="t-h2">{t('faq.title')}</h1>
        <p className="mt-1 text-brown-2">{t('faq.lead', vars)}</p>
        <div className="mt-5 divide-y divide-line border-y border-line">
          {ITEMS.map((k) => (
            <details key={k} className="group">
              <summary className="flex min-h-14 cursor-pointer list-none items-center justify-between gap-3 py-3 font-bold [&::-webkit-details-marker]:hidden">
                {t(`faq.items.${k}.q`)}
                <ChevronDownIcon className="h-5 w-5 shrink-0 transition-transform group-open:rotate-180" />
              </summary>
              <p className="pb-4">{t(answer(k), vars)}</p>
            </details>
          ))}
        </div>
      </div>
    </Container>
  )
}
