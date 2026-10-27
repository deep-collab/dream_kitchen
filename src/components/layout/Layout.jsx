import { Suspense, useEffect } from 'react'
import { Outlet, useLocation } from 'react-router-dom'
import { useI18n } from '../../i18n/I18nProvider'
import { prefetchOrderPath } from '../../routes'
import ScrollToTop from '../ScrollToTop'
import Header from './Header'
import Banner from './Banner'
import OfferBanner from './OfferBanner'
import SiteBackground from './SiteBackground'
import LanguageError from './LanguageError'
import Footer from './Footer'
import TabBar from './TabBar'
import CartAnnouncer from './CartAnnouncer'
import RajyotsavaGate from '../festival/RajyotsavaGate'

// Tells the inline loading screen, Hema's settings fetch and the QA scripts that the first page
// has painted. It sits inside the page's Suspense boundary, so it runs only once the page's own
// chunk has loaded and rendered. Then, on an idle phone, the order pages are fetched ahead.
function FirstPaint() {
  useEffect(() => {
    if (window.__dkReady) return
    window.__dkReady = true
    window.dispatchEvent(new Event('dk:ready'))
    prefetchOrderPath()
  }, [])
  return null
}

// Hema's live offers: the banner at the very top of Home, a slim strip on the Menu page. Part of
// the main bundle (not the pages' own files), so the page never waits for one more file to draw.
function PageOffers() {
  const { pathname, search } = useLocation()
  if (pathname === '/') return <OfferBanner />
  // The menu showing one offer's products has its own heading instead of the strip
  if (pathname === '/menu' && !new URLSearchParams(search).has('offer')) return <OfferBanner variant="strip" />
  return null
}

// Holds the space while a page's chunk downloads, so the footer never jumps
const PageLoading = () => <div aria-busy="true" className="min-h-dvh" />

// Shell for every page. #dk-app is made inert while a sheet is open.
export default function Layout() {
  const { t } = useI18n()
  // `isolate`: the festival background (SiteBackground) sits between the page's cream and the content
  return (
    <div id="dk-app" className="isolate flex min-h-dvh flex-col">
      <SiteBackground />
      <ScrollToTop />
      <a
        href="#main"
        className="sr-only z-[70] rounded-control bg-gold-mid px-5 py-3 font-bold text-ink focus:not-sr-only focus:fixed focus:top-3 focus:left-3"
      >
        {t('nav.skip')}
      </a>
      <Header />
      <Banner />
      <LanguageError />
      <main id="main" tabIndex={-1} className="flex-1 outline-none">
        <PageOffers />
        <Suspense fallback={<PageLoading />}>
          <Outlet />
          <FirstPaint />
        </Suspense>
      </main>
      <Footer />
      <TabBar />
      <CartAnnouncer />
      <RajyotsavaGate />
    </div>
  )
}
