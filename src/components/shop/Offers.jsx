import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useI18n } from '../../i18n/I18nProvider'
import { useShowcase } from '../../context/MenuProvider'
import Button from '../ui/Button'
import { ChevronLeftIcon, ChevronRightIcon, TagIcon } from '../icons'
import 'virtual:dk-strings/offers'

const ROTATE_MS = 6000
const reduceMotion = () => typeof window !== 'undefined' && window.matchMedia?.('(prefers-reduced-motion: reduce)').matches

/**
 * Which offer is showing: the next one every 6 seconds while there are several, paused while
 * someone is touching, hovering or reading it (focus inside), and never by itself with reduced motion.
 */
function useRotation(count) {
  const [index, setIndex] = useState(0)
  const [paused, setPaused] = useState(false)
  useEffect(() => {
    if (count < 2 || paused || reduceMotion()) return undefined
    const timer = setInterval(() => setIndex((i) => (i + 1) % count), ROTATE_MS)
    return () => clearInterval(timer)
  }, [count, paused])
  const current = count ? index % count : 0
  const go = (i) => setIndex((i + count) % count)
  const pause = {
    onMouseEnter: () => setPaused(true),
    onMouseLeave: () => setPaused(false),
    onFocus: () => setPaused(true),
    onBlur: (e) => !e.currentTarget.contains(e.relatedTarget) && setPaused(false),
    onTouchStart: () => setPaused(true),
  }
  return { current, go, pause, paused }
}

/** Previous / dots / next, big enough to tap (48px) */
function Controls({ count, current, go, dark = true }) {
  const { t } = useI18n()
  const btn = `grid h-12 w-12 shrink-0 place-items-center rounded-full ${dark ? 'text-gold-light hover:bg-ink-2' : 'text-brown hover:bg-champagne'}`
  return (
    <div className="flex items-center justify-center gap-1">
      <button type="button" className={btn} onClick={() => go(current - 1)} aria-label={t('offers.previous')} data-dk-offer-prev>
        <ChevronLeftIcon className="h-6 w-6" />
      </button>
      {Array.from({ length: count }, (_, i) => (
        <button key={i} type="button" className="grid h-12 w-8 place-items-center" onClick={() => go(i)} aria-label={t('offers.goTo', { n: i + 1, total: count })} aria-current={i === current ? 'true' : undefined}>
          <span className={`block h-2.5 rounded-full transition-all ${i === current ? 'w-6 bg-gold-light' : `w-2.5 ${dark ? 'bg-muted/50' : 'bg-control-line'}`}`} />
        </button>
      ))}
      <button type="button" className={btn} onClick={() => go(current + 1)} aria-label={t('offers.next')} data-dk-offer-next>
        <ChevronRightIcon className="h-6 w-6" />
      </button>
    </div>
  )
}

/** The offer's photo; if it ever fails to load, the banner simply goes on without it */
function OfferPhoto({ src, eager }) {
  const [failed, setFailed] = useState(false)
  if (!src || failed) return null
  return (
    <img
      src={src}
      alt=""
      width="1200"
      height="600"
      loading={eager ? 'eager' : 'lazy'}
      decoding="async"
      onError={() => setFailed(true)}
      className="block aspect-[2/1] w-full bg-ink object-cover md:aspect-auto md:h-full md:w-2/5 md:shrink-0"
    />
  )
}

/**
 * Hema's offers at the top of the home page (admin -> Offers): a black and gold card with her
 * photo, title, short message and one button. Several offers take turns; none = nothing at all.
 * All the slides sit in one grid cell, so the card keeps the height of the tallest and the page
 * doesn't jump as they change. Display only: the button just goes to a category or product.
 */
export function OfferBanner() {
  const { t, pick } = useI18n()
  const { offers } = useShowcase()
  const { current, go, pause } = useRotation(offers.length)
  if (!offers.length) return null
  const many = offers.length > 1
  return (
    <section aria-label={t('offers.label')} aria-roledescription={many ? 'carousel' : undefined} className="pt-5 md:pt-8" data-dk-offers {...pause}>
      <div className="dk-container">
        <div className="on-dark overflow-hidden rounded-card border border-gold/60 bg-ink text-cream shadow-[0_10px_30px_-18px_rgb(0_0_0/0.6)]">
          <div className="grid">
            {offers.map((o, i) => (
              <article
                key={o.id}
                aria-roledescription={many ? 'slide' : undefined}
                aria-label={many ? t('offers.goTo', { n: i + 1, total: offers.length }) : undefined}
                aria-hidden={i !== current}
                inert={i !== current ? '' : undefined}
                className={`[grid-area:1/1] flex flex-col transition-opacity duration-500 md:flex-row ${i === current ? 'opacity-100' : 'invisible opacity-0'}`}
                data-dk-offer={o.id}
              >
                <OfferPhoto src={o.photo} eager={i === 0} />
                <div className="flex flex-1 flex-col justify-center gap-2 p-4 sm:p-5 md:p-8">
                  <p className="flex items-center gap-2 text-sm font-bold tracking-wide text-gold uppercase">
                    <TagIcon className="h-5 w-5" /> {t('offers.label')}
                  </p>
                  <h2 className="font-heading text-[1.75rem] leading-tight font-semibold text-gold-light md:text-[2.25rem]">{pick(o.title)}</h2>
                  {o.message && <p className="text-cream/90">{pick(o.message)}</p>}
                  {o.link && o.button && (
                    <Button to={o.link} tone="dark" className="mt-2 self-start max-sm:w-full" data-dk-offer-button>
                      {pick(o.button)}
                    </Button>
                  )}
                </div>
              </article>
            ))}
          </div>
          {many && (
            <div className="border-t border-ink-line px-2 py-1">
              <Controls count={offers.length} current={current} go={go} />
            </div>
          )}
        </div>
      </div>
    </section>
  )
}

/**
 * The slim offer strip on the menu page: title, short message and a link, one line on desktop.
 *   onGo(link): lets the menu page handle links to itself (scroll to a category, open a product);
 *   returns true when it did. Anything else (the Customize page) is a normal page change.
 */
export function OfferStrip({ onGo }) {
  const { t, pick } = useI18n()
  const { offers } = useShowcase()
  const navigate = useNavigate()
  const { current, go, pause } = useRotation(offers.length)
  if (!offers.length) return null
  const o = offers[current]
  const onClick = (e) => {
    e.preventDefault()
    if (!onGo?.(o.link)) navigate(o.link)
  }
  return (
    <aside aria-label={t('offers.label')} className="on-dark mt-3 flex items-center gap-2 rounded-control border border-gold/50 bg-ink py-1 pr-1 pl-3 text-cream" data-dk-offer-strip {...pause}>
      <TagIcon className="h-5 w-5 shrink-0 text-gold" />
      {/* The button moves under the title when both don't fit on one line (long Kannada words) */}
      <div className="flex min-w-0 flex-1 flex-wrap items-center justify-between gap-x-3">
        <p className="t-small min-w-0 flex-[1_1_10rem] py-1.5 [overflow-wrap:anywhere]" aria-live="polite" aria-atomic="true">
          <strong className="text-gold-light">{pick(o.title)}</strong>
          {o.message && <span className="text-cream/85 max-sm:hidden"> · {pick(o.message)}</span>}
        </p>
        {o.link && o.button && (
          <a href={o.link} onClick={onClick} className="-ml-3 inline-flex min-h-12 max-w-full items-center rounded-control px-3 font-bold text-gold-light underline underline-offset-4 hover:bg-ink-2 sm:ml-0" data-dk-offer-strip-button>
            {pick(o.button)}
          </a>
        )}
      </div>
      {offers.length > 1 && (
        <button type="button" className="grid h-12 w-10 shrink-0 place-items-center rounded-full text-gold-light hover:bg-ink-2" onClick={() => go(current + 1)} aria-label={t('offers.next')}>
          <ChevronRightIcon className="h-5 w-5" />
        </button>
      )}
    </aside>
  )
}
