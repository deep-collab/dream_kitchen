import { useI18n } from '../i18n/I18nProvider'
import { useSeo } from '../hooks/useSeo'
import PageHero from '../components/PageHero'
import Container from '../components/ui/Container'
import Button from '../components/ui/Button'

// Placeholder until Step 4 builds classes, batches and booking.
export default function Classes() {
  useSeo('classes')
  const { t } = useI18n()
  return (
    <>
      <PageHero title={t('classes.title')} subtitle={t('classes.text')} />
      <Container className="py-12 lg:py-16">
        <div className="flex flex-col gap-3 sm:flex-row">
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
