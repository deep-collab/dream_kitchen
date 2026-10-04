import { useI18n } from '../i18n/I18nProvider'
import { useSeo } from '../hooks/useSeo'
import { site } from '../config/site'
import { useMenu } from '../context/MenuProvider'
import { NAME_MAX } from '../components/shop/Customise'
import PageHero from '../components/PageHero'
import Container from '../components/ui/Container'
import CallOptions from '../components/contact/CallOptions'
import { ChevronDownIcon } from '../components/icons'

// Answers use only rules the site already follows; numbers come from config, so
// they change with it ({days}, {charge}, {namePrice}, {nameMax}, {phone}).
export default function FAQ() {
  useSeo('faq')
  const { t } = useI18n()
  const menu = useMenu()
  const items = menu ? t('faq.items') : null // the name-on-box price comes from the menu data
  const vars = {
    charge: site.delivery.charge,
    days: site.ordering.dispatchAfterBusinessDays,
    namePrice: menu?.products.find((p) => p.nameCustomisation)?.nameCustomisationPrice,
    nameMax: NAME_MAX,
    phone: site.phone.display,
  }
  const fill = (s) => s.replace(/\{(\w+)\}/g, (m, k) => (vars[k] != null ? vars[k] : m))

  return (
    <>
      <PageHero title={t('faq.title')} subtitle={t('faq.subtitle')} />
      <Container className="py-12 lg:py-16">
        <div className="max-w-[46rem] space-y-3">
          {Array.isArray(items) &&
            items.map((it, i) => (
              <details key={i} className="card group" open={i === 0}>
                <summary className="flex min-h-14 cursor-pointer list-none items-center justify-between gap-4 rounded-card px-5 py-4 font-bold [&::-webkit-details-marker]:hidden">
                  {fill(it.q)}
                  <ChevronDownIcon className="h-6 w-6 shrink-0 transition-transform group-open:rotate-180" />
                </summary>
                <p className="border-t border-line px-5 py-4">{fill(it.a)}</p>
              </details>
            ))}
        </div>
        <CallOptions title={t('faq.stillTitle')} variant="feature" className="mt-10 max-w-[46rem]" />
      </Container>
    </>
  )
}
