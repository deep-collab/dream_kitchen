import { useI18n } from '../../i18n/I18nProvider'
import Wordmark from '../brand/Wordmark'
import Symbol from '../brand/Symbol'
import Button from '../ui/Button'

// Tiny four-point gold sparkles kept to the edges so they never sit behind text.
// [left %, top %, size px, twinkle duration s, delay s]
const SPARKLES = [
  [8, 14, 9, 5.5, 0],
  [90, 10, 7, 6.5, 1.8],
  [16, 58, 6, 7, 3.1],
  [84, 46, 11, 6, 0.9],
  [5, 86, 7, 5, 2.4],
  [94, 78, 6, 7.5, 4],
  [70, 92, 8, 6.2, 1.2],
]

function Sparkle({ size, style }) {
  return (
    <svg viewBox="0 0 20 20" width={size} height={size} className="dk-sparkle absolute text-gold-light" style={style} aria-hidden="true">
      <path d="M10 0c.6 5.2 4.2 8.8 10 10-5.8 1.2-9.4 4.8-10 10-.6-5.2-4.2-8.8-10-10 5.8-1.2 9.4-4.8 10-10Z" fill="currentColor" />
    </svg>
  )
}

/**
 * Home hero. The lockup and tagline carry data-dk-hero so the inline loading screen
 * can glide its own lockup into exactly this position before it leaves.
 */
export default function Hero() {
  const { t } = useI18n()
  return (
    <section className="on-dark relative isolate overflow-hidden bg-ink text-cream">
      <div aria-hidden="true" className="pointer-events-none absolute inset-0 -z-10">
        <div className="dk-drift absolute top-[30%] left-[38%] w-[150vw] max-w-[1000px] text-gold opacity-[0.045] md:top-[8%] md:left-[52%] md:w-[85vw]">
          <Symbol flat className="block h-auto w-full" />
        </div>
        {SPARKLES.map(([left, top, size, dur, delay], i) => (
          <Sparkle key={i} size={size} style={{ left: `${left}%`, top: `${top}%`, '--dur': `${dur}s`, '--delay': `${delay}s` }} />
        ))}
      </div>

      <div className="dk-container flex flex-col items-center pt-8 pb-14 text-center md:pt-12 md:pb-20 lg:pt-10 lg:pb-20">
        <Wordmark variant="stacked" as="h1" handoff />
        <p className="dk-tagline mt-7 lg:mt-6" data-dk-hero="tagline">
          {t('brand.tagline')}
        </p>
        <p className="t-lead mt-4 max-w-[30rem] text-muted lg:max-w-[36rem]">{t('hero.support')}</p>
        <div className="mt-8 flex w-full max-w-sm flex-col gap-3 sm:w-auto sm:max-w-none sm:flex-row sm:justify-center">
          <Button to="/shop" size="lg" className="sm:min-w-52">
            {t('hero.orderNow')}
          </Button>
          <Button variant="call" size="lg" className="sm:min-w-52">
            {t('hero.callToOrder')}
          </Button>
        </div>
      </div>
      <hr className="rule-gold absolute inset-x-0 bottom-0" />
    </section>
  )
}
