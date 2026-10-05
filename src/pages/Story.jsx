import { useI18n } from '../i18n/I18nProvider'
import { useSeo } from '../hooks/useSeo'
import { site } from '../config/site'
import Container from '../components/ui/Container'
import Button from '../components/ui/Button'
import Symbol from '../components/brand/Symbol'
import { InstagramIcon } from '../components/icons'
import 'virtual:dk-strings/story'

// Our Story: only facts from the brief (student, ₹2,500, loved home brand, handmade and fresh to
// order, classes), plus the Instagram band that used to sit on the home page.
const PARTS = ['start', 'fresh', 'teach']

export default function Story() {
  useSeo('story')
  const { t } = useI18n()
  return (
    <Container className="py-6 lg:py-12">
      <div className="grid gap-8 lg:grid-cols-[minmax(0,1fr)_16rem] lg:gap-16">
        <div className="max-w-[40rem]">
          <h1 className="t-h1">{t('story.title')}</h1>
          <p className="t-lead mt-2 text-brown-2">{t('story.lead')}</p>
          <div className="mt-6 space-y-6">
            {PARTS.map((k) => (
              <section key={k} aria-labelledby={`story-${k}`}>
                <h2 id={`story-${k}`} className="t-h3">
                  {t(`story.${k}.title`)}
                </h2>
                <p className="mt-2">{t(`story.${k}.text`)}</p>
                {k === 'teach' && (
                  <Button to="/classes" variant="secondary" className="mt-3">
                    {t('story.teach.cta')}
                  </Button>
                )}
              </section>
            ))}
          </div>
        </div>
        <div className="order-first flex items-center gap-4 lg:order-none lg:flex-col lg:items-start">
          <Symbol className="h-20 w-auto lg:h-36" />
          <p className="font-heading text-[1.375rem] leading-snug font-semibold">{t('brand.tagline')}</p>
        </div>
      </div>

      <section aria-labelledby="story-ig" className="on-dark mt-8 rounded-card bg-ink p-5 text-cream sm:p-6">
        <h2 id="story-ig" className="t-h3 text-gold-light">
          {t('story.instagram.title')}
        </h2>
        <p className="mt-2 text-muted">{t('story.instagram.text')}</p>
        <Button href={site.instagram.url} icon={InstagramIcon} variant="secondary" className="mt-4">
          {t('story.instagram.cta')}
          <span className="sr-only"> {t('common.newTab')}</span>
        </Button>
      </section>

      <Button to="/menu" size="lg" className="mt-6">
        {t('story.cta')}
      </Button>
    </Container>
  )
}
