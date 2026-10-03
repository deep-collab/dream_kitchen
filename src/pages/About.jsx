import { useI18n } from '../i18n/I18nProvider'
import { useSeo } from '../hooks/useSeo'
import PageHero from '../components/PageHero'
import Container from '../components/ui/Container'
import Button from '../components/ui/Button'

// Our Story: placeholder copy (true facts only) until Step 4 writes the full story.
export default function About() {
  useSeo('about')
  const { t } = useI18n()
  return (
    <>
      <PageHero title={t('about.title')} />
      <Container className="py-12 lg:py-16">
        <div className="t-lead max-w-[40rem] space-y-5">
          <p>{t('about.p1')}</p>
          <p>{t('about.p2')}</p>
          <p className="text-brown-2">{t('about.p3')}</p>
        </div>
        <Button to="/shop" className="mt-10">
          {t('about.cta')}
        </Button>
      </Container>
    </>
  )
}
