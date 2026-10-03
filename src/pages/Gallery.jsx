import { useI18n } from '../i18n/I18nProvider'
import { useSeo } from '../hooks/useSeo'
import { site } from '../config/site'
import PageHero from '../components/PageHero'
import Container from '../components/ui/Container'
import Button from '../components/ui/Button'
import { InstagramIcon } from '../components/icons'

// Real photos arrive with the admin panel (Stage B); until then point to Instagram.
export default function Gallery() {
  useSeo('gallery')
  const { t } = useI18n()
  return (
    <>
      <PageHero title={t('gallery.title')} subtitle={t('gallery.subtitle')} />
      <Container className="py-12 lg:py-16">
        <Button href={site.instagram.url} icon={InstagramIcon} size="lg">
          {t('gallery.follow')}
        </Button>
      </Container>
    </>
  )
}
