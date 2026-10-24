import { useEffect, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useOffers } from '../../context/MenuProvider'
import { useI18n } from '../../i18n/I18nProvider'
import { smallPhoto } from '../../lib/productPhoto'
import { TagIcon } from '../icons'

const ROTATE_MS = 6000
const reduceMotion = () => typeof window !== 'undefined' && window.matchMedia?.('(prefers-reduced-motion: reduce)').matches

/**
 * Hema's live offers (admin -> Offers): a black-and-gold banner at the very top of Home
 * (variant "banner") or a slim one-line strip at the top of the Menu page ("strip"). More than one:
 * they take turns every 6 seconds (not while a finger, the mouse or the keyboard is on them, and
 * never with reduced motion), with dots to pick one. Tapping goes to the product or menu section
 * she chose. Nothing at all when no offer is live. Offers never change a price.
 */
export default function OfferBanner({ variant = 'banner' }) {
  const offers = useOffers()
  const { t, pick } = useI18n()
  const navigate = useNavigate()
  const [index, setIndex] = useState(0)
  const [paused, setPaused] = useState(false)
  const count = offers.length
  const many = count > 1

  useEffect(() => {
    if (!many || paused || reduceMotion()) return undefined
    const timer = setInterval(() => setIndex((i) => (i + 1) % count), ROTATE_MS)
    return () => clearInterval(timer)
  }, [many, paused, count])

  if (!count) return null
  const offer = offers[index % count]
  const cta = offer.button ? pick(offer.button) : t('banner.offerCta')
  const hold = {
    onPointerEnter: () => setPaused(true),
    onPointerLeave: () => setPaused(false),
    onFocusCapture: () => setPaused(true),
    onBlurCapture: () => setPaused(false),
  }
  const dots = many && (
    <div className="-mr-3 flex shrink-0">
      {offers.map((o, i) => (
        <button
          key={o.id}
          type="button"
          onClick={() => setIndex(i)}
          aria-label={t('banner.offerShow', { n: i + 1, count })}
          aria-current={i === index % count ? 'true' : undefined}
          className="flex h-12 w-12 items-center justify-center"
          data-dk-offer-dot
        >
          <span className={`block h-2.5 w-2.5 rounded-full border border-gold ${i === index % count ? 'bg-gold' : 'bg-transparent'}`} />
        </button>
      ))}
    </div>
  )

  if (variant === 'strip')
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
          {dots}
        </div>
      </aside>
    )

  return (
    <section aria-label={t('banner.offers')} className="on-dark border-b border-gold/45 bg-[#1b1612] text-cream" data-dk-offers="banner" {...hold}>
      <div className="dk-container py-2.5 md:py-4">
        {/* The whole card goes to the offer on a tap; the button is the one link for keyboards and screen readers */}
        <div key={offer.id} className={`dk-offer-in flex items-center gap-3 ${offer.href ? 'cursor-pointer' : ''}`} onClick={offer.href ? () => navigate(offer.href) : undefined}>
          {offer.photo && (
            <img src={smallPhoto(offer.photo)} alt="" width="64" height="64" decoding="async" className="h-16 w-16 shrink-0 rounded-control border border-gold/45 bg-ink object-cover md:h-20 md:w-20" />
          )}
          <div className="min-w-0 flex-1">
            <p className="flex items-start gap-1.5 leading-snug font-bold text-gold-light md:text-xl">
              <TagIcon className="mt-0.5 h-5 w-5 shrink-0 text-gold md:mt-1" />
              <span>{pick(offer.title)}</span>
            </p>
            {offer.message && <p className="t-small mt-0.5 line-clamp-2 leading-snug text-cream">{pick(offer.message)}</p>}
          </div>
        </div>
        {(offer.href || many) && (
          <div className="mt-2 flex items-center gap-2">
            {offer.href && (
              <Link to={offer.href} className="btn btn-secondary btn-on-dark min-h-12 px-5 py-2" data-dk-offer-link>
                <span>{cta}</span>
                <span aria-hidden="true">›</span>
              </Link>
            )}
            <div className="ml-auto">{dots}</div>
          </div>
        )}
      </div>
    </section>
  )
}
