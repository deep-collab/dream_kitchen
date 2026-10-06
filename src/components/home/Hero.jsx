import { useI18n } from '../../i18n/I18nProvider'
import { site, waLink } from '../../config/site'
import Wordmark from '../brand/Wordmark'
import Symbol from '../brand/Symbol'
import Button from '../ui/Button'
import { WhatsAppIcon } from '../icons'
import 'virtual:dk-strings/home'

// The two outline buttons: compact side by side on phones (48px tall), full size on desktop
const SIDE = 'flex-auto whitespace-nowrap max-md:min-h-12 max-md:gap-2 max-md:px-2.5 max-md:py-2 max-md:text-base md:min-w-52 md:flex-none'

/**
 * Compact home hero (Step 6: under 60% of a phone screen): Hema's logo, her tagline and three
 * buttons: "Order now" (the menu), "Order on WhatsApp" and "Book a class" (7 Oct 2026). Phones:
 * Order now full width, the other two side by side below it; desktop: all three in one row.
 * The lockup and tagline carry data-dk-hero so the first-visit loading screen can glide its own
 * lockup into exactly this place before it leaves.
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
      <div className="dk-container flex flex-col items-center pt-3 pb-4 text-center md:pt-10 md:pb-12">
        <Wordmark variant="stacked" as="h1" handoff />
        <p className="dk-tagline mt-3 md:mt-5" data-dk-hero="tagline">
          {t('brand.tagline')}
        </p>
        <div className="mt-3 flex w-full max-w-sm flex-wrap justify-center gap-2 md:mt-6 md:w-auto md:max-w-none md:flex-nowrap md:gap-3">
          <Button to="/menu" size="lg" className="w-full max-md:min-h-[52px] max-md:py-2 md:w-auto md:min-w-52" data-dk-order>
            {t('home.orderNow')}
          </Button>
          <Button variant="secondary" size="lg" href={waLink(site.whatsappOrderText)} icon={WhatsAppIcon} className={`${SIDE} [&_svg]:text-gold`}>
            {t('home.whatsappOrder')}
            <span className="sr-only"> {t('common.newTab')}</span>
          </Button>
          <Button variant="secondary" size="lg" to="/classes#book" className={SIDE}>
            {t('home.bookClass')}
          </Button>
        </div>
      </div>
      <hr className="rule-gold absolute inset-x-0 bottom-0" />
    </section>
  )
}
