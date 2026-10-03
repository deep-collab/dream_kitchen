import { useI18n } from '../i18n/I18nProvider'
import { useSeo } from '../hooks/useSeo'
import { site, waLink } from '../config/site'
import PageHero from '../components/PageHero'
import { ChevronDownIcon, WhatsAppIcon } from '../components/Icons'

export default function FAQ() {
  useSeo('faq')
  const { t } = useI18n()
  const items = t('faq.items')
  const vars = {
    charge: site.delivery.charge,
    threshold: site.order.bulkThreshold,
    days: site.order.bulkMinDaysAhead,
    shelfLife: site.shelfLife,
    fssai: site.fssai,
  }
  const fill = (s) => s.replace(/\{(\w+)\}/g, (m, k) => (vars[k] != null ? vars[k] : m))

  return (
    <>
      <PageHero title={t('faq.title')} subtitle={t('faq.subtitle')} />
      <div className="container-dk max-w-3xl py-8 sm:py-12">
        <div className="space-y-3">
          {Array.isArray(items) &&
            items.map((it, i) => (
              <details key={i} className="card group overflow-hidden" open={i === 0}>
                <summary className="flex min-h-14 cursor-pointer list-none items-center justify-between gap-3 px-5 py-4 font-display text-lg font-bold text-deep marker:hidden [&::-webkit-details-marker]:hidden">
                  {it.q}
                  <ChevronDownIcon className="h-6 w-6 shrink-0 text-brown transition group-open:rotate-180" />
                </summary>
                <p className="border-t border-tint px-5 py-4 text-dark">{fill(it.a)}</p>
              </details>
            ))}
        </div>
        <div className="mt-8 text-center">
          <a href={waLink(t('wa.general'))} target="_blank" rel="noopener noreferrer" className="btn btn-whatsapp">
            <WhatsAppIcon /> {t('common.chatWhatsapp')}
          </a>
        </div>
      </div>
    </>
  )
}
