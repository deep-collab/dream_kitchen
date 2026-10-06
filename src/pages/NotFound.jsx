import { useI18n } from '../i18n/I18nProvider'
import { useSeo } from '../hooks/useSeo'
import Container from '../components/ui/Container'
import Button from '../components/ui/Button'
import Symbol from '../components/brand/Symbol'
import 'virtual:dk-strings/notFound'

export default function NotFound() {
  useSeo('notFound', undefined, { noindex: true })
  const { t } = useI18n()
  return (
    <Container className="py-10 lg:py-20">
      <div className="max-w-[36rem]">
        <Symbol flat className="h-16 w-auto text-line" />
        <h1 className="t-h2 mt-4">{t('notFound.title')}</h1>
        <p className="mt-3 text-brown-2">{t('notFound.text')}</p>
        <div className="mt-6 flex flex-col gap-3 sm:flex-row">
          <Button to="/menu">{t('notFound.menu')}</Button>
          <Button to="/" variant="secondary">
            {t('notFound.home')}
          </Button>
        </div>
        <p className="mt-8 text-brown-2">{t('notFound.help')}</p>
        <div className="mt-3 flex flex-col gap-3 sm:flex-row">
          <Button to="/track" variant="secondary">
            {t('nav.track')}
          </Button>
        </div>
      </div>
    </Container>
  )
}
