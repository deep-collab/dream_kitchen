import { useI18n } from '../i18n/I18nProvider'
import { useSeo } from '../hooks/useSeo'
import PageHero from '../components/PageHero'
import Container from '../components/ui/Container'
import Button from '../components/ui/Button'
import Symbol from '../components/brand/Symbol'
import CertificationNote from '../components/classes/CertificationNote'

// Our Story: only facts from the brief (student, ₹2,500, loved home brand, handmade
// and fresh to order, classes, certification). Hema's own words replace these later.
const PARTS = ['start', 'fresh', 'teach']

export default function About() {
  useSeo('about')
  const { t } = useI18n()
  return (
    <>
      <PageHero title={t('about.title')} subtitle={t('about.lead')} />
      <Container className="py-12 lg:py-16">
        <div className="grid gap-12 lg:grid-cols-[minmax(0,1fr)_18rem] lg:gap-20">
          <div className="max-w-[40rem] space-y-10">
            {PARTS.map((k) => (
              <section key={k} aria-labelledby={`story-${k}`}>
                <h2 id={`story-${k}`} className="t-h2">
                  {t(`about.${k}.title`)}
                </h2>
                <p className="t-lead mt-3">{t(`about.${k}.text`)}</p>
                {k === 'teach' && (
                  <Button to="/classes" variant="secondary" className="mt-5">
                    {t('about.teach.cta')}
                  </Button>
                )}
              </section>
            ))}
          </div>
          <div className="order-first flex flex-col items-start gap-6 lg:order-none">
            <Symbol className="h-28 w-auto lg:h-40" />
            <p className="font-heading text-[1.5rem] leading-snug font-semibold">{t('brand.tagline')}</p>
          </div>
        </div>
        <CertificationNote className="mt-12 max-w-[40rem]" />
        <div className="mt-10 flex flex-col gap-3 sm:flex-row">
          <Button to="/shop" size="lg">
            {t('about.cta')}
          </Button>
          <Button variant="call" size="lg">
            {t('callOptions.call')}
          </Button>
        </div>
      </Container>
    </>
  )
}
