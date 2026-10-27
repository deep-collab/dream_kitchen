import { useEffect, useRef, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useOffers, useRajyotsava } from '../../context/MenuProvider'
import { OFFER_ZONE_HREF, RAJYOTSAVA } from '../../lib/offers'
import { rajyotsavaLine } from '../festival/rajyotsavaWords'
import { useI18n } from '../../i18n/I18nProvider'
import { smallPhoto } from '../../lib/productPhoto'
import { dateParts } from '../../lib/dates'
import { TagIcon } from '../icons'

const ROTATE_MS = 6000
const reduceMotion = () => typeof window !== 'undefined' && window.matchMedia?.('(prefers-reduced-motion: reduce)').matches

/**
 * Hema's live offers (admin -> Offers).
 *   "banner": the first thing on Home, above the hero: a wide black-and-gold card with her photo
 *   (cut 16:9 for phones and 3:1 for bigger screens in the admin), the title, the offer line, the
 *   end date and one clear button. On a phone it stays well under half the screen, so "Order now"
 *   is still on the first screen. Several offers are slides: swipe, tap a dot, or wait 6 seconds
 *   (not while a finger, the mouse or the keyboard is on them, and never with reduced motion).
 *   "strip": one slim line at the top of the Menu page.
 * The button goes to the menu showing only the offer's products ("Shop the offer"), or to the
 * product or section she chose. Nothing at all when no offer is live.
 */
export default function OfferBanner({ variant = 'banner' }) {
  const live = useOffers()
  // Kannada Rajyotsava first: its own slide (and its own words in the strip)
  const offers = [...live].sort((a, b) => (b.id === RAJYOTSAVA.id) - (a.id === RAJYOTSAVA.id))
  if (!offers.length) return null
  return variant === 'strip' ? <OfferStrip offers={offers} /> : <OfferSlides offers={offers} />
}

/** "Ends 3 Nov" (Indian date, in the visitor's language) */
function useEnds() {
  const { t } = useI18n()
  return (iso) => {
    const p = dateParts(iso)
    return t('banner.ends', { date: `${p.day} ${t('dates.months')[p.month - 1]}` })
  }
}

function Dots({ offers, index, onPick }) {
  const { t } = useI18n()
  const count = offers.length
  return (
    <div className="flex shrink-0">
      {offers.map((o, i) => (
        <button
          key={o.id}
          type="button"
          onClick={() => onPick(i)}
          aria-label={t('banner.offerShow', { n: i + 1, count })}
          aria-current={i === index ? 'true' : undefined}
          className="flex h-12 w-12 items-center justify-center"
          data-dk-offer-dot
        >
          <span className={`block h-2.5 rounded-full border border-gold transition-[width] ${i === index ? 'w-6 bg-gold' : 'w-2.5 bg-ink/40'}`} />
        </button>
      ))}
    </div>
  )
}

function OfferSlides({ offers }) {
  const { t, pick } = useI18n()
  const navigate = useNavigate()
  const ends = useEnds()
  const track = useRef(null)
  const [index, setIndex] = useState(0)
  const [paused, setPaused] = useState(false)
  const count = offers.length
  const many = count > 1

  const goTo = (i, smooth = true) => {
    const el = track.current
    if (!el) return
    el.scrollTo({ left: i * el.clientWidth, behavior: smooth && !reduceMotion() ? 'smooth' : 'instant' })
  }
  // The dot follows the slide the visitor swiped to
  const onScroll = () => {
    const el = track.current
    if (el) setIndex(Math.min(count - 1, Math.max(0, Math.round(el.scrollLeft / Math.max(1, el.clientWidth)))))
  }
  useEffect(() => {
    if (!many || paused || reduceMotion()) return undefined
    const timer = setInterval(() => {
      if (document.visibilityState === 'visible') goTo((index + 1) % count)
    }, ROTATE_MS)
    return () => clearInterval(timer)
  }, [many, paused, count, index]) // eslint-disable-line react-hooks/exhaustive-deps
  // An offer that ends while the page is open: back to the first slide
  useEffect(() => {
    if (index >= count) goTo(0, false)
  }, [count]) // eslint-disable-line react-hooks/exhaustive-deps

  const hold = {
    onPointerEnter: () => setPaused(true),
    onPointerLeave: () => setPaused(false),
    onTouchStart: () => setPaused(true),
    onFocusCapture: () => setPaused(true),
    onBlurCapture: () => setPaused(false),
  }

  return (
    <section aria-label={t('banner.offers')} aria-roledescription="carousel" className="on-dark bg-ink" data-dk-offers="banner" {...hold}>
      <div className="dk-container pt-2 pb-2.5 md:pt-3 md:pb-4">
        <div className="dk-rise relative overflow-hidden rounded-card border border-gold/50 bg-[#1b1612] shadow-[0_10px_30px_-18px_rgb(201_162_39/0.6)]">
          <div ref={track} onScroll={onScroll} className="flex snap-x snap-mandatory overflow-x-auto overscroll-x-contain [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
            {offers.map((o, i) =>
              o.id === RAJYOTSAVA.id ? (
                <RajyotsavaSlide key={o.id} label={t('banner.offerShow', { n: i + 1, count })} hidden={many && i !== index} navigate={navigate} many={many} />
              ) : (
              <Slide
                key={o.id}
                offer={o}
                first={i === 0}
                label={t('banner.offerShow', { n: i + 1, count })}
                hidden={many && i !== index}
                ends={ends(o.endsOn)}
                cta={o.button ? pick(o.button) : t(o.items ? 'banner.shopOffer' : 'banner.offerCta')}
                navigate={navigate}
                many={many}
              />
              ),
            )}
          </div>
          {many && (
            <div className="absolute right-1 bottom-1 rounded-full bg-ink/60 md:right-2 md:bottom-2 short:right-auto short:left-1">
              <Dots offers={offers} index={index} onPick={(i) => goTo(i)} />
            </div>
          )}
        </div>
      </div>
    </section>
  )
}

/**
 * Kannada Rajyotsava's slide: no photo needed. Black and gold with the Karnataka colours (a flag
 * ribbon down the left, a soft yellow and red glow), "Happy Kannada Rajyotsava", a big "50% OFF",
 * the offer line ("on everything · All of November · Online orders only") and "Go to Offer Zone".
 * As short as the other slides, so "Order now" stays on a phone's first screen.
 */
function RajyotsavaSlide({ label, hidden, navigate, many }) {
  const { t, lang } = useI18n()
  const raj = useRajyotsava()
  if (!raj) return null
  const kn = lang === 'kn'
  const [what, when, online] = rajyotsavaLine(raj, t)
  return (
    <article
      aria-roledescription="slide"
      aria-label={label}
      aria-hidden={hidden || undefined}
      inert={hidden || undefined}
      className="relative w-full shrink-0 cursor-pointer snap-center snap-always"
      onClick={() => navigate(OFFER_ZONE_HREF)}
      data-dk-offer={raj.id}
      data-dk-raj-banner
    >
      <div aria-hidden="true" className="absolute inset-y-0 left-0 flex w-2 flex-col md:w-2.5">
        <span className="h-1/2 bg-[#f6c512]" />
        <span className="h-1/2 bg-[#d62828]" />
      </div>
      <div className="flex flex-wrap items-center gap-x-4 gap-y-1 bg-[radial-gradient(70%_120%_at_0%_0%,rgb(246_197_18/0.2),transparent_65%),radial-gradient(70%_120%_at_100%_100%,rgb(214_40_40/0.28),transparent_65%)] py-2.5 pr-3 pl-5 md:flex-nowrap md:gap-x-6 md:py-4 md:pr-6 md:pl-8 short:py-2">
        <p className={`dk-raj-off shrink-0 font-bold ${kn ? 'font-kannada-serif text-[1.75rem] leading-[1.22] md:text-[2.375rem]' : 'font-heading text-[2.75rem] leading-none md:text-[3.5rem]'} short:text-[2rem]`}>
          {t('banner.rajOff', { percent: raj.percent })}
          {/* Phones: "on everything" beside the big words, so the banner is a line shorter */}
          <span className={`ml-2 align-middle text-cream md:hidden ${kn ? 'text-base' : 'font-body text-[1.0625rem]'}`} style={{ WebkitTextFillColor: 'currentColor' }}>
            {t('banner.rajEverything')}
          </span>
        </p>
        <div className="min-w-0 flex-1 basis-40">
          {/* short phones: no greeting line (the popup greets), so "Order now" stays on the first screen */}
          <p className={`leading-snug font-bold text-gold-light short:hidden ${kn ? 'font-kannada-serif text-[1.0625rem] md:text-xl' : 'text-[1.1875rem] md:text-2xl md:leading-tight'}`}>{t('banner.rajHello')}</p>
          <p className="t-small leading-snug text-cream md:text-body">
            <span className="hidden md:inline">{what} · </span>
            <span className="whitespace-nowrap">{when}</span> · <strong className="whitespace-nowrap text-gold-light">{online}</strong>
          </p>
        </div>
        <div className={`flex w-full items-center md:w-auto ${many ? 'pr-24 md:pr-16' : ''}`}>
          <Link to={OFFER_ZONE_HREF} className="btn btn-primary min-h-12 px-5 py-2 short:px-4" data-dk-offer-link onClick={(e) => e.stopPropagation()}>
            <span aria-hidden="true">🎁</span>
            <span>{t('banner.rajGo')}</span>
          </Link>
        </div>
      </div>
    </article>
  )
}

function Slide({ offer: o, first, label, hidden, ends, cta, navigate, many }) {
  const { pick } = useI18n()
  const photo = o.photoPhone || o.photo
  const go = o.href ? () => navigate(o.href) : undefined
  const words = (
    <div className={`relative flex min-w-0 flex-col gap-1.5 p-3 md:gap-2 md:px-6 md:py-4 short:gap-1 short:py-2.5 short:pl-2.5 ${photo ? 'mt-auto md:mt-0 md:flex-1 md:justify-center short:mt-0 short:flex-1' : ''}`}>
      <p className="flex items-start gap-1.5 text-[1.1875rem] leading-snug font-bold text-gold-light md:text-2xl md:leading-tight short:text-[1.0625rem]">
        <TagIcon className={`mt-1 h-5 w-5 shrink-0 text-gold md:h-6 md:w-6 ${photo ? 'short:hidden' : ''}`} />
        <span className="line-clamp-2">{pick(o.title)}</span>
      </p>
      {/* short phones: no offer line, so "Order now" stays on the first screen */}
      {o.message && <p className="t-small line-clamp-1 leading-snug text-cream md:text-body short:hidden">{pick(o.message)}</p>}
      {/* short phones with a photo: the end date as a small line under the title */}
      {photo && (
        <p className="t-small hidden font-bold text-champagne short:block" data-dk-offer-ends>
          {ends}
        </p>
      )}
      {/* the dots sit in the bottom-right corner, beside the button: this row keeps clear of them */}
      <div className={`mt-0.5 flex flex-wrap items-center gap-2 md:mt-1 md:gap-3 ${many ? 'pr-24 short:pr-0' : ''}`}>
        {o.href && (
          <Link to={o.href} className="btn btn-primary min-h-12 px-5 py-2 short:px-4" data-dk-offer-link onClick={(e) => e.stopPropagation()}>
            <span>{cta}</span>
            <span aria-hidden="true">›</span>
          </Link>
        )}
        <span className={`t-small rounded-full border border-gold/50 bg-ink/60 px-3 py-1 font-bold text-champagne ${photo ? 'hidden md:inline' : ''}`} data-dk-offer-ends>
          {ends}
        </span>
      </div>
    </div>
  )
  // On a phone photo the end date sits in its top-left corner, so the words take one row less
  const endsOnPhoto = (
    <span className="t-small absolute top-2 left-2 rounded-full border border-gold/50 bg-ink/75 px-3 py-0.5 font-bold text-champagne md:hidden short:hidden" data-dk-offer-ends>
      {ends}
    </span>
  )
  return (
    <article
      aria-roledescription="slide"
      aria-label={label}
      aria-hidden={hidden || undefined}
      inert={hidden || undefined}
      className={`relative w-full shrink-0 snap-center snap-always ${go ? 'cursor-pointer' : ''}`}
      onClick={go}
      data-dk-offer={o.id}
    >
      {photo ? (
        // Phones: the 16:9 photo fills the card, the words on it. Short phones: the 16:9 photo small on the left,
        // the words beside it. Bigger screens: a slim wide card, the words on the left and the 3:1 photo on the
        // right. Either way the home hero's "Order now" stays on the first screen.
        <div className="relative flex aspect-video w-full flex-col md:aspect-auto md:min-h-[176px] md:flex-row short:aspect-auto short:flex-row short:items-center">
          <div className="absolute inset-0 md:relative md:inset-auto md:order-2 md:w-[min(46%,528px)] md:shrink-0 short:relative short:inset-auto short:my-2.5 short:ml-2.5 short:aspect-video short:w-[36%] short:shrink-0 short:overflow-hidden short:rounded-control">
            <picture>
              {o.photo && <source media="(min-width: 768px)" srcSet={`${smallPhoto(o.photo)} 750w, ${o.photo} 1500w`} sizes="528px" />}
              <img
                src={smallPhoto(photo)}
                srcSet={`${smallPhoto(photo)} 600w, ${photo} 1200w`}
                sizes="100vw"
                alt=""
                fetchPriority={first ? 'high' : undefined}
                decoding="async"
                className="absolute inset-0 h-full w-full object-cover"
              />
            </picture>
            {/* Keeps the words readable on any photo (phones), and blends the photo into the card (bigger screens) */}
            <div
              aria-hidden="true"
              className="absolute inset-0 bg-[linear-gradient(to_top,rgb(15_15_15/0.94)_0%,rgb(15_15_15/0.78)_42%,rgb(15_15_15/0)_78%)] md:bg-[linear-gradient(to_right,#1b1612_0%,rgb(27_22_18/0)_30%)] short:hidden"
            />
            {endsOnPhoto}
          </div>
          {words}
        </div>
      ) : (
        <div className="bg-[radial-gradient(120%_140%_at_100%_0%,rgb(201_162_39/0.28),transparent_60%)] md:py-2">{words}</div>
      )}
    </article>
  )
}

function OfferStrip({ offers }) {
  const { t, pick } = useI18n()
  const [index, setIndex] = useState(0)
  const [paused, setPaused] = useState(false)
  const count = offers.length
  const many = count > 1
  useEffect(() => {
    if (!many || paused || reduceMotion()) return undefined
    const timer = setInterval(() => setIndex((i) => (i + 1) % count), ROTATE_MS)
    return () => clearInterval(timer)
  }, [many, paused, count])
  const shown = offers[index % count]
  const raj = shown.id === RAJYOTSAVA.id
  const offer = raj ? { ...shown, href: OFFER_ZONE_HREF, title: { en: `${t('banner.rajHello')} · ${t('banner.rajOff', { percent: shown.deal.value })}`, kn: `${t('banner.rajHello')} · ${t('banner.rajOff', { percent: shown.deal.value })}` } } : shown
  const cta = raj ? t('banner.zone') : offer.button ? pick(offer.button) : t(offer.items ? 'banner.shopOffer' : 'banner.offerCta')
  const hold = {
    onPointerEnter: () => setPaused(true),
    onPointerLeave: () => setPaused(false),
    onFocusCapture: () => setPaused(true),
    onBlurCapture: () => setPaused(false),
  }
  return (
    <aside aria-label={t('banner.offers')} className="on-dark border-b border-gold/45 bg-[#1b1612] text-cream" data-dk-offers="strip" {...hold}>
      <div className="dk-container flex min-h-12 items-center gap-2">
        <div key={offer.id} className="dk-offer-in flex min-w-0 flex-1 items-center">
          {offer.href ? (
            <Link to={offer.href} className="flex min-h-12 min-w-0 flex-1 items-center gap-2 font-bold">
              <TagIcon className="h-5 w-5 shrink-0 text-gold" />
              <span className="truncate text-gold-light">{pick(offer.title)}</span>
              {/* Phones: the title gets the room, an arrow says it is a link; wider screens add the button's words */}
              <span className="ml-auto shrink-0 pl-1 text-cream">
                <span className="hidden underline underline-offset-4 sm:inline">{cta} </span>
                <span aria-hidden="true">›</span>
              </span>
            </Link>
          ) : (
            <p className="flex min-h-12 min-w-0 items-center gap-2 font-bold">
              <TagIcon className="h-5 w-5 shrink-0 text-gold" />
              <span className="truncate text-gold-light">{pick(offer.title)}</span>
            </p>
          )}
        </div>
        {many && (
          <div className="-mr-3">
            <Dots offers={offers} index={index % count} onPick={setIndex} />
          </div>
        )}
      </div>
    </aside>
  )
}
