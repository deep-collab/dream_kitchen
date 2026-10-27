import { Fragment, useRef } from 'react'
import { createPortal } from 'react-dom'
import { Link } from 'react-router-dom'
import { useI18n } from '../../i18n/I18nProvider'
import { useModal } from '../../hooks/useModal'
import { OFFER_ZONE_HREF } from '../../lib/offers'
import Wordmark from '../brand/Wordmark'
import { CloseIcon } from '../icons'
import { rajyotsavaLine } from './rajyotsavaWords'

/**
 * The Kannada Rajyotsava popup (once per visit while the offer is live; RajyotsavaGate decides).
 * Karnataka red and yellow with Dream Kitchen's black and gold: a thin flag ribbon on top, a soft
 * glow, the logo (in Kannada when the site is), a big "50% OFF", the offer in one line and two
 * buttons: "Go to Offer Zone" (the menu at the offer prices) and "Maybe later". ✕, tapping outside
 * and Esc close it too. Fades and scales in (just fades with reduced motion); the page behind is
 * already up and stays as it was.
 */
export default function RajyotsavaPopup({ offer, onClose }) {
  const { t, lang } = useI18n()
  const card = useRef(null)
  const go = useRef(null)
  useModal(true, { ref: card, onClose, initialFocusRef: go })
  const kn = lang === 'kn'
  const line = rajyotsavaLine(offer, t)

  return createPortal(
    <div className="dk-raj-backdrop fixed inset-0 z-[80] flex items-center justify-center bg-ink/75 p-4 backdrop-blur-[3px]" onClick={onClose} data-dk-raj-popup>
      <div
        ref={card}
        role="dialog"
        aria-modal="true"
        aria-labelledby="dk-raj-title"
        aria-describedby="dk-raj-text"
        onClick={(e) => e.stopPropagation()}
        className="dk-raj-card on-dark relative w-full max-w-[25rem] rounded-[1.25rem] bg-[linear-gradient(135deg,#f6c512,#d4af37_45%,#d62828)] p-[1.5px] shadow-[0_0_40px_-4px_rgb(246_197_18/0.45),0_0_90px_-10px_rgb(214_40_40/0.55)]"
      >
        <div className="relative overflow-hidden rounded-[calc(1.25rem-1.5px)] bg-ink bg-[radial-gradient(90%_60%_at_0%_0%,rgb(246_197_18/0.22),transparent_70%),radial-gradient(90%_60%_at_100%_100%,rgb(214_40_40/0.3),transparent_70%)] px-5 pt-7 pb-5 text-center text-cream">
          {/* The Karnataka flag: yellow over red, a thin ribbon across the top */}
          <div aria-hidden="true" className="absolute inset-x-0 top-0 flex h-2.5 flex-col">
            <span className="h-1/2 bg-[#f6c512]" />
            <span className="h-1/2 bg-[#d62828]" />
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label={t('banner.rajClose')}
            className="absolute top-3.5 right-1.5 grid h-12 w-12 place-items-center rounded-full text-champagne transition-colors hover:bg-white/10 hover:text-gold-light"
            data-dk-raj-close
          >
            <CloseIcon className="h-6 w-6" />
          </button>

          <Wordmark variant="stacked" size="sm" className="mx-auto" />

          <h2 id="dk-raj-title" className={`mt-3 text-gold-light ${kn ? 'font-kannada-serif text-[1.3125rem] leading-snug font-semibold' : 't-h3'}`}>
            {t('banner.rajHello')}
          </h2>
          <p className={`dk-raj-off mt-1 font-bold ${kn ? 'font-kannada-serif text-[2.625rem] leading-[1.3]' : 'font-heading text-[4.25rem] leading-none tracking-tight'}`} data-dk-raj-off>
            {t('banner.rajOff', { percent: offer.percent })}
          </p>
          <p id="dk-raj-text" className="mt-3 text-[1.0625rem] leading-snug text-cream">
            {/* The dots stay outside the unbreakable parts, so the line can wrap between them */}
            {line.map((part, i) => (
              <Fragment key={i}>
                {i > 0 && <span aria-hidden="true"> · </span>}
                <span className={i === 2 ? 'font-bold whitespace-nowrap text-gold-light' : i === 1 ? 'whitespace-nowrap' : ''}>{part}</span>
              </Fragment>
            ))}
          </p>

          <div className="mt-5 flex flex-col gap-1">
            <Link ref={go} to={OFFER_ZONE_HREF} onClick={onClose} className="btn btn-primary btn-lg btn-block" data-dk-raj-go>
              <span aria-hidden="true">🎁</span>
              <span>{t('banner.rajGo')}</span>
            </Link>
            <button type="button" onClick={onClose} className="inline-flex min-h-12 items-center justify-center rounded-control px-4 font-bold text-champagne underline-offset-4 hover:underline" data-dk-raj-later>
              {t('banner.rajLater')}
            </button>
          </div>
        </div>
      </div>
    </div>,
    document.body,
  )
}
