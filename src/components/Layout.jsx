import { Outlet } from 'react-router-dom'
import Header from './Header'
import Footer from './Footer'
import FloatingActions from './FloatingActions'
import ScrollToTop from './ScrollToTop'

export default function Layout() {
  return (
    <div className="flex min-h-dvh flex-col">
      <ScrollToTop />
      <Header />
      <main id="main" tabIndex={-1} className="flex-1 outline-none">
        <Outlet />
      </main>
      <Footer />
      <FloatingActions />
    </div>
  )
}
