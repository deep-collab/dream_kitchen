import { Suspense, useEffect } from 'react'
import { Outlet } from 'react-router-dom'
import { useI18n } from '../../i18n/I18nProvider'
import { prefetchOrderPath } from '../../routes'
import ScrollToTop from '../ScrollToTop'
import Header from './Header'
import NoticeStrip from './NoticeStrip'
import LanguageError from './LanguageError'
import Footer from './Footer'
import MobileBar from './MobileBar'
import CartAnnouncer from './CartAnnouncer'

// Tells the inline loading screen (index.html) and the QA scripts that the first page has
// painted. It sits inside the page's Suspense boundary, so it runs only once the page's own
// chunk has loaded and rendered (siblings in a boundary commit together), never for the
// empty frame. Then, on an idle phone, the order pages are fetched ahead of time.
function FirstPaint() {
  useEffect(() => {
    if (window.__dkReady) return
    window.__dkReady = true
    window.dispatchEvent(new Event('dk:ready'))
    prefetchOrderPath()
  }, [])
  return null
}

// Holds the space while a page's chunk downloads (first visit only: later navigations keep
// the current page on screen until the next one is ready), so the footer never jumps.
const PageLoading = () => <div aria-busy="true" className="min-h-dvh" />

// Shell for every page. #dk-app is made inert while a sheet or the menu is open.
export default function Layout() {
  const { t } = useI18n()

  return (
    <div id="dk-app" className="flex min-h-dvh flex-col">
      <ScrollToTop />
      <a
        href="#main"
        className="sr-only z-[70] rounded-control bg-gold-mid px-5 py-3 font-bold text-ink focus:not-sr-only focus:fixed focus:top-3 focus:left-3"
      >
        {t('nav.skip')}
      </a>
      <Header />
      <NoticeStrip />
      <LanguageError />
      <main id="main" tabIndex={-1} className="flex-1 outline-none">
        <Suspense fallback={<PageLoading />}>
          <Outlet />
          <FirstPaint />
        </Suspense>
      </main>
      <Footer />
      <MobileBar />
      <CartAnnouncer />
    </div>
  )
}
