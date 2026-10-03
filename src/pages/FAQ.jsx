import { useI18n } from '../i18n/I18nProvider'
import { useSeo } from '../hooks/useSeo'
import { site } from '../config/site'
import PageHero from '../components/PageHero'
import Container from '../components/ui/Container'
import Button from '../components/ui/Button'
import { ChevronDownIcon } from '../components/icons'

export default function FAQ() {
  useSeo('faq')
  const { t } = useI18n()
  const items = t('faq.items')
  const vars = { charge: site.delivery.charge, days: site.ordering.dispatchAfterBusinessDays }
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
                  {it.q}
                  <ChevronDownIcon className="h-6 w-6 shrink-0 transition-transform group-open:rotate-180" />
                </summary>
                <p className="border-t border-line px-5 py-4">{fill(it.a)}</p>
              </details>
            ))}
        </div>
        <div className="mt-10 flex flex-col gap-3 sm:flex-row">
          <Button variant="call" size="lg">
            {t('mobileMenu.callUs')}
          </Button>
          <Button variant="whatsapp" size="lg">
            {t('mobileMenu.chat')}
          </Button>
        </div>
      </Container>
    </>
  )
}
