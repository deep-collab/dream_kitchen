import { Link } from 'react-router-dom'
import { useI18n } from '../i18n/I18nProvider'
import { useSeo } from '../hooks/useSeo'
import { useAsync } from '../hooks/useAsync'
import { getCategories, getProducts } from '../services'
import { site } from '../config/site'
import LogoBadge from '../components/LogoBadge'
import ProductCard from '../components/ProductCard'
import SectionHeading from '../components/SectionHeading'
import Reveal from '../components/Reveal'
import { ArrowRightIcon, EggIcon, HandIcon, InstagramIcon, LeafIcon, TruckIcon } from '../components/Icons'

function Hero() {
  const { t } = useI18n()
  return (
    <section className="doodle-bg overflow-hidden border-b border-tint">
      <div className="container-dk grid items-center gap-8 py-8 sm:py-12 lg:grid-cols-[1.05fr_1fr] lg:gap-12 lg:py-16">
        <div className="card-cream relative px-5 py-7 text-center sm:px-10 sm:py-10 lg:text-left">
          <div className="flex flex-col items-center gap-4 lg:flex-row lg:items-center">
            <span className="lg:hidden">
              <LogoBadge size="md" />
            </span>
            <p className="eyebrow">
              <span aria-hidden="true" className="text-gold">✦</span> {t('home.hero.eyebrow')}
            </p>
          </div>
          <h1 className="mt-3 text-4xl leading-tight font-bold sm:text-5xl lg:text-[3.5rem]">{t('home.hero.title')}</h1>
          <p className="mx-auto mt-4 max-w-xl text-lg text-brown lg:mx-0">{t('home.hero.subtitle')}</p>
          <div className="mt-7 flex flex-col gap-3 sm:flex-row sm:justify-center lg:justify-start">
            <Link to="/shop" className="btn btn-primary px-8 text-lg">
              {t('home.hero.shopNow')} <ArrowRightIcon className="h-5 w-5" />
            </Link>
            <a href="#menu" className="btn btn-secondary px-8 text-lg">
              {t('home.hero.exploreMenu')}
            </a>
          </div>
        </div>
        <div className="relative mx-auto w-full max-w-md lg:max-w-none">
          <img src="/hero-art.svg" alt={t('home.hero.artAlt')} width="600" height="600" className="float-slow w-full" fetchPriority="high" />
          <span className="absolute right-2 bottom-2 hidden rotate-3 lg:block">
            <LogoBadge size="lg" />
          </span>
        </div>
      </div>
    </section>
  )
}

function TrustBadges() {
  const { t } = useI18n()
  const items = [
    ['pure', LeafIcon],
    ['handmade', HandIcon],
    ['eggless', EggIcon],
    ['delivery', TruckIcon],
  ]
  return (
    <section aria-label={t('home.trust.title')} className="container-dk -mt-px py-10 sm:py-14">
      <ul className="grid grid-cols-2 gap-3 sm:gap-5 lg:grid-cols-4">
        {items.map(([key, Icon], i) => (
          <Reveal as="li" key={key} delay={i * 80} className="card flex flex-col items-center p-4 text-center sm:p-6">
            <span className="grid h-14 w-14 place-items-center rounded-full bg-tint text-dark">
              <Icon className="h-7 w-7" />
            </span>
            <h2 className="mt-3 font-display text-lg font-bold sm:text-xl">{t(`home.trust.${key}.title`)}</h2>
            <p className="mt-1 text-[0.95rem] text-brown">{t(`home.trust.${key}.text`, { charge: site.delivery.charge })}</p>
          </Reveal>
        ))}
      </ul>
    </section>
  )
}

function BestSellers() {
  const { t } = useI18n()
  const { data: list = [] } = useAsync(() => getProducts({ bestSellers: true }), [])
  return (
    <section className="container-dk py-10 sm:py-14" aria-labelledby="bestsellers-title">
      <SectionHeading id="bestsellers-title" eyebrow={t('home.bestsellers.eyebrow')} title={t('home.bestsellers.title')} subtitle={t('home.bestsellers.subtitle')} />
      <div className="grid grid-cols-2 gap-3 sm:gap-6 lg:grid-cols-3">
        {list.slice(0, 6).map((p, i) => (
          <Reveal key={p.id} delay={(i % 3) * 80}>
            <ProductCard product={p} />
          </Reveal>
        ))}
      </div>
      <div className="mt-8 text-center">
        <Link to="/shop" className="btn btn-secondary">
          {t('common.viewAll')} <ArrowRightIcon className="h-5 w-5" />
        </Link>
      </div>
    </section>
  )
}

function Categories() {
  const { t, pick } = useI18n()
  const { data } = useAsync(async () => ({ cats: await getCategories(), all: await getProducts() }), [])
  const cats = data?.cats || []
  const count = (id) => data?.all.filter((p) => p.category === id).length || 0
  return (
    <section id="menu" className="doodle-bg doodle-bg-faint border-y border-tint py-12 sm:py-16" aria-labelledby="menu-title">
      <div className="container-dk">
        <div className="card-cream mx-auto mb-8 max-w-2xl px-5 pt-6 pb-1 sm:mb-10">
          <SectionHeading id="menu-title" eyebrow={t('home.categories.eyebrow')} title={t('home.categories.title')} />
        </div>
        <ul className="grid gap-4 sm:grid-cols-2 lg:grid-cols-5 lg:gap-5">
          {cats.map((c, i) => (
            <Reveal as="li" key={c.id} delay={i * 70}>
              <Link to={`/shop?category=${c.id}`} className="card group flex h-full items-center gap-4 p-3 transition hover:-translate-y-1 hover:shadow-lift sm:p-4 lg:flex-col lg:items-start lg:p-0">
                <div className="relative w-24 shrink-0 overflow-hidden rounded-2xl sm:w-28 lg:w-full lg:rounded-b-none lg:rounded-t-3xl">
                  <img src={c.image} alt="" loading="lazy" width="400" height="400" className="aspect-square w-full object-cover transition duration-500 group-hover:scale-105" />
                  <span className="absolute top-2 left-2 grid h-9 w-9 place-items-center rounded-full bg-dark font-display text-sm font-bold text-gold-soft lg:h-11 lg:w-11 lg:text-base">
                    {String(i + 1).padStart(2, '0')}
                  </span>
                </div>
                <div className="min-w-0 lg:px-4 lg:pb-5">
                  <h3 className="font-display text-lg leading-snug font-bold sm:text-xl">{pick(c.name)}</h3>
                  <p className="mt-1 text-[0.95rem] text-brown">{pick(c.blurb)}</p>
                  <p className="mt-2 inline-flex items-center gap-1 text-sm font-extrabold text-dark">
                    {t('home.categories.items', { count: count(c.id) })} <ArrowRightIcon className="h-4 w-4 transition group-hover:translate-x-1" />
                  </p>
                </div>
              </Link>
            </Reveal>
          ))}
        </ul>
      </div>
    </section>
  )
}

function Story() {
  const { t } = useI18n()
  const stats = [
    ['₹2,500', t('home.story.stat1')],
    ['₹50,000', t('home.story.stat2')],
    ['100%', t('home.story.stat3')],
  ]
  return (
    <section className="container-dk py-12 sm:py-16" aria-labelledby="story-title">
      <Reveal className="card grid overflow-hidden lg:grid-cols-[0.9fr_1.1fr]">
        <div className="doodle-bg grid place-items-center bg-tint/60 p-8 sm:p-10">
          <LogoBadge size="lg" />
        </div>
        <div className="p-6 sm:p-10">
          <p className="eyebrow">{t('home.story.eyebrow')}</p>
          <h2 id="story-title" className="mt-2 text-3xl font-bold sm:text-4xl">
            {t('home.story.title')}
          </h2>
          <p className="mt-4 text-lg text-dark">{t('home.story.text')}</p>
          <dl className="mt-6 grid grid-cols-3 gap-2 sm:gap-4">
            {stats.map(([v, label]) => (
              <div key={label} className="rounded-2xl bg-cream p-3 text-center sm:p-4">
                <dt className="text-xs font-bold text-brown sm:text-sm">{label}</dt>
                <dd className="font-display text-lg font-bold text-deep sm:text-2xl">{v}</dd>
              </div>
            ))}
          </dl>
          <Link to="/about" className="btn btn-primary mt-7">
            {t('home.story.cta')} <ArrowRightIcon className="h-5 w-5" />
          </Link>
        </div>
      </Reveal>
    </section>
  )
}

function HowToOrder() {
  const { t } = useI18n()
  return (
    <section className="container-dk py-10 sm:py-14" aria-labelledby="how-title">
      <SectionHeading id="how-title" eyebrow={t('home.how.eyebrow')} title={t('home.how.title')} />
      <ol className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {['s1', 's2', 's3', 's4'].map((s, i) => (
          <Reveal as="li" key={s} delay={i * 80} className="card relative p-6 pt-8">
            <span className="absolute -top-4 left-6 grid h-10 w-10 place-items-center rounded-full bg-gold font-display font-bold text-deep shadow-soft">{i + 1}</span>
            <h3 className="font-display text-xl font-bold">{t(`home.how.${s}.title`)}</h3>
            <p className="mt-2 text-brown">{t(`home.how.${s}.text`)}</p>
          </Reveal>
        ))}
      </ol>
    </section>
  )
}

function Instagram() {
  const { t } = useI18n()
  const tiles = ['dark-truffles', 'brownie-box', 'grand-hamper', 'rocher', 'coffee-truffles', 'name-bar']
  return (
    <section className="doodle-bg doodle-bg-faint border-y border-tint py-12 sm:py-16" aria-labelledby="ig-title">
      <div className="container-dk">
        <div className="card-cream mx-auto max-w-2xl px-5 py-7 text-center">
          <p className="eyebrow">{t('home.instagram.eyebrow')}</p>
          <h2 id="ig-title" className="mt-2 text-3xl font-bold sm:text-4xl">
            {t('home.instagram.title')}
          </h2>
          <p className="mt-3 text-lg text-brown">{t('home.instagram.text', { handle: site.social.instagramHandle })}</p>
        </div>
        <ul className="mt-8 grid grid-cols-3 gap-2 sm:gap-4 lg:grid-cols-6">
          {tiles.map((img) => (
            <li key={img}>
              <a href={site.social.instagram} target="_blank" rel="noopener noreferrer" className="group block overflow-hidden rounded-2xl border border-tint bg-offwhite shadow-soft" aria-label={`${t('home.instagram.cta')} (${site.social.instagramHandle})`}>
                <img src={`/products/${img}.svg`} alt="" loading="lazy" width="400" height="400" className="aspect-square w-full object-cover transition duration-500 group-hover:scale-105" />
              </a>
            </li>
          ))}
        </ul>
        <div className="mt-8 text-center">
          <a href={site.social.instagram} target="_blank" rel="noopener noreferrer" className="btn btn-primary">
            <InstagramIcon /> {t('home.instagram.cta')}
          </a>
        </div>
      </div>
    </section>
  )
}

function EnquiryCta() {
  const { t } = useI18n()
  return (
    <section className="container-dk py-12 sm:py-16">
      <Reveal className="relative overflow-hidden rounded-3xl bg-dark px-6 py-10 text-center text-cream shadow-lift sm:px-12">
        <h2 className="text-3xl font-bold text-cream sm:text-4xl">{t('home.cta.title')}</h2>
        <p className="mx-auto mt-3 max-w-xl text-lg text-cream/85">{t('home.cta.text')}</p>
        <Link to="/contact" className="btn btn-gold mt-6 px-8">
          {t('home.cta.button')} <ArrowRightIcon className="h-5 w-5" />
        </Link>
      </Reveal>
    </section>
  )
}

export default function Home() {
  useSeo('home')
  return (
    <>
      <Hero />
      <TrustBadges />
      <BestSellers />
      <Categories />
      <Story />
      <HowToOrder />
      <Instagram />
      <EnquiryCta />
    </>
  )
}
