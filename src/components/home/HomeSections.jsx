import { useState } from 'react'
import { Link } from 'react-router-dom'
import { useI18n } from '../../i18n/I18nProvider'
import { useMenu } from '../../context/MenuProvider'
import { useAsync } from '../../hooks/useAsync'
import { getClasses, getReviews } from '../../services'
import { site } from '../../config/site'
import { formatCallHours } from '../../lib/hours'
import { formatINR, fromPrice } from '../../lib/pricing'
import Container from '../ui/Container'
import Button from '../ui/Button'
import Sheet from '../ui/Sheet'
import SectionHeading from '../ui/SectionHeading'
import ProductArt from '../art/ProductArt'
import Symbol from '../brand/Symbol'
import ProductCard from '../shop/ProductCard'
import { useShopSheets } from '../shop/ShopSheets'
import CallbackForm from '../contact/CallbackForm'
import VoiceMessageButton from '../contact/VoiceMessageButton'
import { batchText, durationText, modeText } from '../classes/classText'
import { AwardIcon, CallbackIcon, ClockIcon, InstagramIcon } from '../icons'

const CATEGORY_ART = { 'brownie-tubs': 'tub', 'delight-boxes': 'delight-box', cookies: 'cookie-dip-tin', chocolates: 'assortment' }
const Diamond = () => <span aria-hidden="true" className="mt-[0.7em] h-1.5 w-1.5 shrink-0 rotate-45 bg-gold" />

/* ---------- four category tiles (cream) ---------- */
export function CategoryTiles() {
  const { t, pick } = useI18n()
  const menu = useMenu()
  return (
    <section aria-labelledby="menu-title" className="py-14 lg:py-20">
      <Container>
        <SectionHeading id="menu-title" title={t('home.fresh.title')} lead={t('home.fresh.text')} />
        <ul className="grid grid-cols-2 gap-3 sm:gap-5 lg:grid-cols-4">
          {(menu?.categories || []).map((c, i) => (
            <li key={c.id}>
              <Link to={`/shop#${c.slug}`} className="group block rounded-card border border-line bg-[#fffcf5] p-2 transition-shadow hover:shadow-[0_6px_24px_-12px_rgb(42_29_22/0.35)]">
                <ProductArt kind={CATEGORY_ART[c.id]} variant={i} className="w-full" />
                <span className="flex min-h-12 items-center px-2 pt-2 text-[1.125rem] leading-snug font-bold group-hover:underline">{pick(c.name)}</span>
              </Link>
            </li>
          ))}
        </ul>
        <Button to="/shop" variant="secondary" className="mt-8">
          {t('home.fresh.cta')}
        </Button>
      </Container>
    </section>
  )
}

/* ---------- best sellers (champagne): her badges + her "Our best sellers" group ---------- */
export function BestSellers() {
  const { t } = useI18n()
  const menu = useMenu()
  if (!menu) return null
  const spotlight = menu.products.filter((p) => p.badges.length)
  const group = menu.products.filter((p) => p.sectionId === 'best-sellers')
  return (
    <section aria-labelledby="best-title" className="bg-champagne py-14 lg:py-20">
      <Container>
        <SectionHeading id="best-title" title={t('home.best.title')} lead={t('home.best.lead')} />
        <ul className="grid gap-4 sm:gap-5 lg:grid-cols-2">
          {spotlight.map((p) => (
            <li key={p.id}>
              <ProductCard product={p} spotlight showContext />
            </li>
          ))}
        </ul>
        <ul className="mt-4 grid gap-4 sm:mt-5 sm:grid-cols-2 sm:gap-5 lg:grid-cols-3">
          {group.map((p) => (
            <li key={p.id}>
              <ProductCard product={p} />
            </li>
          ))}
        </ul>
      </Container>
    </section>
  )
}

/* ---------- Brownie Tub spotlight (black band): her intro, "What you get", slogan ---------- */
export function TubSpotlight() {
  const { t, pick } = useI18n()
  const menu = useMenu()
  const tubs = menu?.categories.find((c) => c.id === 'brownie-tubs')
  if (!tubs) return null
  const from = Math.min(...menu.products.filter((p) => p.categoryId === tubs.id).map(fromPrice))
  return (
    <section aria-labelledby="tubs-title" className="on-dark border-y border-gold/45 bg-ink py-14 text-cream lg:py-20">
      <Container className="grid gap-10 lg:grid-cols-[minmax(0,5fr)_minmax(0,7fr)] lg:items-center lg:gap-16">
        <ProductArt kind="tub" variant={2} rounded="rounded-card" className="mx-auto w-full max-w-[15rem] border border-gold/30 sm:max-w-[20rem] lg:max-w-none" />
        <div>
          <h2 id="tubs-title" className="t-h2">
            {pick(tubs.name)}
          </h2>
          <p className="t-lead mt-3 text-muted">{pick(tubs.intro)}</p>
          <p className="mt-3 font-bold text-gold-light">{t('shop.highlights', { list: tubs.highlights.map(pick).join('. ') })}</p>
          <h3 className="t-h3 mt-8">{t('shop.whatYouGet')}</h3>
          <ul className="mt-3 grid gap-x-6 gap-y-2 sm:grid-cols-2">
            {tubs.whatYouGet.map((w) => (
              <li key={w.en} className="flex gap-2.5">
                <Diamond />
                <span>{pick(w)}</span>
              </li>
            ))}
          </ul>
          <p className="gold-text mt-8 font-heading text-[1.75rem] leading-tight font-semibold lg:text-[2.125rem]">{pick(tubs.slogan)}</p>
          <p className="t-price mt-8 text-gold-light">{t('shop.from', { price: formatINR(from) })}</p>
          <Button to={`/shop#${tubs.slug}`} size="lg" className="mt-3 w-full sm:w-auto">
            {t('home.spotlight.cta')}
          </Button>
        </div>
      </Container>
    </section>
  )
}

/* ---------- bars combo teaser (cream): opens the combo builder straight away ---------- */
export function ComboTeaser() {
  const { t, pick } = useI18n()
  const menu = useMenu()
  const { openCombo } = useShopSheets()
  const combo = menu?.combos[0]
  if (!combo) return null
  return (
    <section aria-labelledby="combo-title" className="py-14 lg:py-20">
      <Container className="grid gap-8 md:grid-cols-[minmax(0,1fr)_minmax(0,1fr)] md:items-center lg:gap-16">
        <div>
          <h2 id="combo-title" className="t-h2">
            {pick(combo.name)}
          </h2>
          <p className="t-lead mt-3 text-brown-2">{t('combo.cardText', { count: combo.eligibleProductIds.length })}</p>
          <div className="mt-7 flex flex-col gap-3 sm:flex-row">
            <Button size="lg" aria-haspopup="dialog" onClick={() => openCombo(combo)}>
              {t('combo.choose', { count: combo.pick })}
            </Button>
            <Button to="/shop#chocolates" variant="secondary" size="lg">
              {t('home.combo.all')}
            </Button>
          </div>
        </div>
        <div aria-hidden="true" className="grid grid-cols-3 gap-2 rounded-card border border-line bg-champagne p-3 sm:gap-3 sm:p-4 md:order-first">
          {[0, 1, 2].map((i) => (
            <ProductArt key={i} kind="bar" variant={i + 1} className="w-full" />
          ))}
        </div>
      </Container>
    </section>
  )
}

/* ---------- classes teaser (champagne) ---------- */
export function ClassesTeaser() {
  const { t, pick } = useI18n()
  const { data: list } = useAsync(() => getClasses(), [])
  return (
    <section aria-labelledby="home-classes-title" className="bg-champagne py-14 lg:py-20">
      <Container className="grid gap-10 lg:grid-cols-[minmax(0,5fr)_minmax(0,7fr)] lg:gap-16">
        <div>
          <h2 id="home-classes-title" className="t-h2">
            {t('home.classes.title')}
          </h2>
          <p className="t-lead mt-3 text-brown-2">{t('home.classes.text')}</p>
          <p className="mt-5 flex items-start gap-3">
            <AwardIcon className="mt-0.5 h-6 w-6 shrink-0" />
            <span>{t('classes.cert.text')}</span>
          </p>
          <Button to="/classes" size="lg" className="mt-7">
            {t('home.classes.cta')}
          </Button>
        </div>
        <ul className="divide-y divide-line self-start rounded-card border border-line bg-[#fffcf5]" aria-busy={!list}>
          {list?.map((cls) => (
            <li key={cls.id}>
              <Link to={`/classes#${cls.slug}`} className="group flex min-h-12 items-start gap-4 p-4 sm:p-5">
                <ProductArt kind={cls.image} variant={cls.sort} className="h-16 w-16 shrink-0" />
                <span className="min-w-0 flex-1">
                  <span className="block leading-snug font-bold group-hover:underline">{pick(cls.title)}</span>
                  <span className="t-small mt-0.5 block text-brown-2">
                    {modeText(cls.mode, t)}, {durationText(cls.durationMinutes, t)}
                    {cls.ages ? `, ${t('classes.ages', cls.ages)}` : ''}
                  </span>
                  {cls.batches[0] && <span className="t-small mt-0.5 block text-brown-2">{t('home.classes.next', { date: batchText(cls.batches[0], t) })}</span>}
                </span>
                <span className="t-price shrink-0">{formatINR(cls.price)}</span>
              </Link>
            </li>
          ))}
        </ul>
      </Container>
    </section>
  )
}

/* ---------- Hema's story (cream) ---------- */
export function StoryTeaser() {
  const { t } = useI18n()
  return (
    <section aria-labelledby="story-title" className="py-14 lg:py-20">
      <Container className="grid gap-8 md:grid-cols-[auto_minmax(0,1fr)] md:items-center md:gap-12">
        <Symbol className="h-24 w-auto md:h-36" />
        <div className="max-w-[40rem]">
          <h2 id="story-title" className="t-h2">
            {t('home.story.title')}
          </h2>
          <p className="t-lead mt-3">{t('home.story.text')}</p>
          <Button to="/our-story" variant="secondary" className="mt-7">
            {t('home.story.cta')}
          </Button>
        </div>
      </Container>
    </section>
  )
}

/* ---------- reviews: rendered only when real, approved reviews exist ---------- */
export function Reviews() {
  const { t } = useI18n()
  const { data: reviews } = useAsync(() => getReviews(), [])
  if (!reviews?.length) return null
  return (
    <section aria-labelledby="reviews-title" className="bg-champagne py-14 lg:py-20">
      <Container>
        <SectionHeading id="reviews-title" title={t('home.reviews.title')} />
        <ul className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {reviews.map((r) => (
            <li key={r.id}>
              <figure className="card h-full p-5">
                <blockquote lang={r.lang} className="t-lead">
                  “{r.text}”
                </blockquote>
                <figcaption className="mt-3 font-bold">{r.name}</figcaption>
              </figure>
            </li>
          ))}
        </ul>
      </Container>
    </section>
  )
}

/* ---------- call / WhatsApp / voice band (black) ---------- */
export function TalkBand() {
  const { t } = useI18n()
  const [open, setOpen] = useState(false)
  return (
    <section aria-labelledby="talk-title" className="on-dark border-y border-gold/45 bg-ink py-14 text-cream lg:py-20">
      <Container className="grid gap-8 lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)] lg:items-center lg:gap-16">
        <div className="max-w-[36rem]">
          <h2 id="talk-title" className="t-h2">
            {t('home.talk.title')}
          </h2>
          <p className="t-lead mt-3 text-muted">{t('home.talk.text')}</p>
          <p className="mt-4 flex items-start gap-3 text-muted">
            <ClockIcon className="mt-0.5 h-6 w-6 shrink-0 text-gold" />
            <span>
              {t('hours.label')}: {formatCallHours(t)}
            </span>
          </p>
        </div>
        <div className="grid gap-3 sm:grid-cols-2">
          <Button variant="call" size="lg" fullWidth className="sm:col-span-2">
            {t('callOptions.call')}
          </Button>
          <Button variant="whatsapp" fullWidth>
            {t('mobileMenu.chat')}
          </Button>
          <Button variant="secondary" icon={CallbackIcon} fullWidth aria-haspopup="dialog" onClick={() => setOpen(true)}>
            {t('callOptions.requestCallback')}
          </Button>
          <VoiceMessageButton fullWidth tone="dark" className="sm:col-span-2" />
        </div>
      </Container>
      <Sheet open={open} onClose={() => setOpen(false)} title={t('callback.title')}>
        <CallbackForm onDone={() => setOpen(false)} />
      </Sheet>
    </section>
  )
}

/* ---------- Instagram (champagne) ---------- */
export function InstagramBand() {
  const { t } = useI18n()
  return (
    <section aria-labelledby="insta-title" className="bg-champagne py-14 lg:py-16">
      <Container className="flex flex-col gap-6 md:flex-row md:items-center md:justify-between">
        <div className="flex gap-4">
          <span aria-hidden="true" className="grid h-14 w-14 shrink-0 place-items-center rounded-full bg-ink text-gold">
            <InstagramIcon className="h-7 w-7" />
          </span>
          <div className="min-w-0">
            <h2 id="insta-title" className="t-h2">
              {t('home.instagram.title')}
            </h2>
            <p className="mt-2 text-brown-2">{t('home.instagram.text')}</p>
            <p className="mt-1 font-bold break-all">{site.instagram.handle}</p>
          </div>
        </div>
        <Button href={site.instagram.url} icon={InstagramIcon} size="lg" className="shrink-0" aria-label={`${t('home.instagram.cta')} ${t('common.newTab')}`}>
          {t('home.instagram.cta')}
        </Button>
      </Container>
    </section>
  )
}
