import { useI18n } from '../../i18n/I18nProvider'
import Wordmark from '../brand/Wordmark'
import Symbol from '../brand/Symbol'
import Button from '../ui/Button'
import 'virtual:dk-strings/home'

/**
 * Compact home hero (Step 6: under 60% of a phone screen): Hema's logo, her tagline and one
 * "Order now". The lockup and tagline carry data-dk-hero so the first-visit loading screen can
 * glide its own lockup into exactly this place before it leaves.
 */
export default function Hero() {
  const { t } = useI18n()
  return (
    <section className="on-dark relative isolate overflow-hidden bg-ink text-cream">
      <div aria-hidden="true" className="pointer-events-none absolute inset-0 -z-10">
        <div className="dk-drift absolute top-[22%] left-[40%] w-[140vw] max-w-[900px] text-gold opacity-[0.045] md:top-[4%] md:left-[54%] md:w-[80vw]">
          <Symbol flat className="block h-auto w-full" />
        </div>
      </div>
      <div className="dk-container flex flex-col items-center pt-6 pb-8 text-center md:pt-10 md:pb-12">
        <Wordmark variant="stacked" as="h1" handoff />
        <p className="dk-tagline mt-5" data-dk-hero="tagline">
          {t('brand.tagline')}
        </p>
        <Button to="/menu" size="lg" className="mt-6 w-full max-w-xs" data-dk-order>
          {t('home.orderNow')}
        </Button>
      </div>
      <hr className="rule-gold absolute inset-x-0 bottom-0" />
    </section>
  )
}
