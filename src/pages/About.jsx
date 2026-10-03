import { Link } from 'react-router-dom'
import { useI18n } from '../i18n/I18nProvider'
import { useSeo } from '../hooks/useSeo'
import PageHero from '../components/PageHero'
import LogoBadge from '../components/LogoBadge'
import Reveal from '../components/Reveal'
import { ArrowRightIcon, HandIcon, HeartIcon, LeafIcon } from '../components/Icons'

export default function About() {
  useSeo('about')
  const { t } = useI18n()
  const values = [
    ['v1', LeafIcon],
    ['v2', HandIcon],
    ['v3', HeartIcon],
  ]
  return (
    <>
      <PageHero eyebrow={t('about.eyebrow')} title={t('about.title')} />
      <section className="container-dk py-10 sm:py-14">
        <div className="card grid items-center gap-8 p-6 sm:p-10 lg:grid-cols-[auto_1fr]">
          <div className="flex justify-center">
            <LogoBadge size="lg" className="-rotate-2" />
          </div>
          <div className="space-y-4 text-lg">
            <p>{t('about.p1')}</p>
            <p>{t('about.p2')}</p>
            <p>{t('about.p3')}</p>
          </div>
        </div>
      </section>
      <section className="doodle-bg doodle-bg-faint border-y border-tint py-12 sm:py-16" aria-labelledby="values-title">
        <div className="container-dk">
          <h2 id="values-title" className="card-cream mx-auto mb-8 max-w-md px-6 py-4 text-center text-3xl font-bold">
            {t('about.values.title')}
          </h2>
          <ul className="grid gap-4 sm:grid-cols-3">
            {values.map(([k, Icon], i) => (
              <Reveal as="li" key={k} delay={i * 80} className="card p-6 text-center">
                <span className="mx-auto grid h-14 w-14 place-items-center rounded-full bg-tint text-dark">
                  <Icon className="h-7 w-7" />
                </span>
                <h3 className="mt-3 text-xl font-bold">{t(`about.values.${k}.title`)}</h3>
                <p className="mt-1 text-brown">{t(`about.values.${k}.text`)}</p>
              </Reveal>
            ))}
          </ul>
        </div>
      </section>
      <div className="container-dk py-12 text-center">
        <Link to="/shop" className="btn btn-primary px-8 text-lg">
          {t('about.cta')} <ArrowRightIcon className="h-5 w-5" />
        </Link>
      </div>
    </>
  )
}
