import { Link } from 'react-router-dom'
import { useI18n } from '../i18n/I18nProvider'
import { useSeo } from '../hooks/useSeo'

export default function NotFound() {
  useSeo('notFound')
  const { t } = useI18n()
  return (
    <section className="doodle-bg py-12 sm:py-20">
      <div className="container-dk">
        <div className="card-cream mx-auto max-w-lg p-6 text-center sm:p-10">
          <img src="/products/walnut-brownie.svg" alt="" width="200" height="200" className="mx-auto h-40 w-40 rounded-3xl" />
          <p className="mt-4 font-display text-6xl font-bold text-mid" aria-hidden="true">
            404
          </p>
          <h1 className="mt-2 text-3xl font-bold">{t('notFound.title')}</h1>
          <p className="mt-3 text-lg text-brown">{t('notFound.text')}</p>
          <div className="mt-6 flex flex-col gap-3 sm:flex-row sm:justify-center">
            <Link to="/" className="btn btn-primary">
              {t('notFound.home')}
            </Link>
            <Link to="/shop" className="btn btn-secondary">
              {t('notFound.shop')}
            </Link>
          </div>
        </div>
      </div>
    </section>
  )
}
