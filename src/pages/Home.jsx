import { useI18n } from '../i18n/I18nProvider'
import { useSeo } from '../hooks/useSeo'
import { formatCallHours } from '../lib/hours'
import Hero from '../components/home/Hero'
import Container from '../components/ui/Container'
import Button from '../components/ui/Button'
import { Link } from 'react-router-dom'
import { useMenu } from '../context/MenuProvider'
import ProductArt from '../components/art/ProductArt'

const CATEGORY_ART = { 'brownie-tubs': 'tub', 'delight-boxes': 'delight-box', cookies: 'cookie-dip-tin', chocolates: 'assortment' }

// Step 1: hero is final. The sections below are deliberately simple placeholders with
// true content only; Step 4 builds the full home page (tiles, best sellers, spotlight…).
export default function Home() {
  useSeo('home')
  const { t, pick } = useI18n()
  const menu = useMenu()
  return (
    <>
      <Hero />

      <section aria-labelledby="fresh-title" className="py-16 lg:py-24">
        <Container>
          <div className="max-w-[40rem]">
            <h2 id="fresh-title" className="t-h2">
              {t('home.fresh.title')}
            </h2>
            <p className="t-lead mt-4 text-brown-2">{t('home.fresh.text')}</p>
          </div>
          <ul className="mt-8 grid grid-cols-2 gap-3 sm:gap-5 lg:grid-cols-4">
            {(menu?.categories || []).map((c, i) => (
              <li key={c.id}>
                <Link to={`/shop#${c.slug}`} className="group block rounded-card border border-line bg-[#fffcf5] p-2 transition-shadow hover:shadow-[0_6px_24px_-12px_rgb(42_29_22/0.35)]">
                  <ProductArt kind={CATEGORY_ART[c.id]} variant={i} className="w-full" />
                  <span className="flex min-h-12 items-center px-2 pt-2 text-[1.125rem] leading-snug font-bold group-hover:underline">{pick(c.name)}</span>
                </Link>
              </li>
            ))}
          </ul>
          <Button to="/shop" className="mt-8">
            {t('home.fresh.cta')}
          </Button>
        </Container>
      </section>

      <hr className="rule-gold" />

      <section aria-labelledby="talk-title" className="bg-champagne py-16 lg:py-20">
        <Container className="grid gap-8 lg:grid-cols-[1fr_auto] lg:items-center lg:gap-16">
          <div className="max-w-[40rem]">
            <h2 id="talk-title" className="t-h2">
              {t('home.talk.title')}
            </h2>
            <p className="t-lead mt-4 text-brown-2">{t('home.talk.text')}</p>
            <p className="t-small mt-3 text-brown-2">
              {t('hours.label')}: {formatCallHours(t)}
            </p>
          </div>
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-1 lg:min-w-72">
            <Button variant="call" size="lg">
              {t('mobileMenu.callUs')}
            </Button>
            <Button variant="whatsapp" size="lg">
              {t('mobileMenu.chat')}
            </Button>
          </div>
        </Container>
      </section>
    </>
  )
}
