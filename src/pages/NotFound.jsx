import 'virtual:dk-strings/notFound'

import { useI18n } from '../i18n/I18nProvider'
import { useSeo } from '../hooks/useSeo'
import Container from '../components/ui/Container'
import Button from '../components/ui/Button'
import Symbol from '../components/brand/Symbol'
import { classesEnabled } from '../config/site'

export default function NotFound() {
  useSeo('notFound', undefined, { noindex: true })
  const { t } = useI18n()
  return (
    <Container className="py-16 lg:py-24">
      <div className="max-w-[36rem]">
        <Symbol flat className="h-20 w-auto text-line" />
        <h1 className="t-h1 mt-6">{t('notFound.title')}</h1>
        <p className="t-lead mt-4 text-brown-2">{t('notFound.text')}</p>
        <div className="mt-8 flex flex-col gap-3 sm:flex-row">
          <Button to="/">{t('notFound.home')}</Button>
          <Button to="/shop" variant="secondary">
            {t('notFound.shop')}
          </Button>
        </div>
        <p className="mt-10 text-brown-2">{t(classesEnabled() ? 'notFound.helpClasses' : 'notFound.help')}</p>
        <div className="mt-4 flex flex-col gap-3 sm:flex-row">
          <Button variant="call">{t('callOptions.call')}</Button>
          <Button variant="whatsapp">{t('mobileMenu.chat')}</Button>
        </div>
      </div>
    </Container>
  )
}
