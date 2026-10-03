import { useEffect } from 'react'
import { Outlet } from 'react-router-dom'
import { useI18n } from '../../i18n/I18nProvider'
import ScrollToTop from '../ScrollToTop'
import Header from './Header'
import NoticeStrip from './NoticeStrip'
import Footer from './Footer'
import MobileBar from './MobileBar'
import CartAnnouncer from './CartAnnouncer'

// Shell for every page. #dk-app is made inert while a sheet or the menu is open.
export default function Layout() {
  const { t } = useI18n()

  // Tell the inline loading screen (index.html) that the first page has painted
  useEffect(() => {
    window.__dkReady = true
    window.dispatchEvent(new Event('dk:ready'))
  }, [])

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
      <main id="main" tabIndex={-1} className="flex-1 outline-none">
        <Outlet />
      </main>
      <Footer />
      <MobileBar />
      <CartAnnouncer />
    </div>
  )
}
