import { lazy, Suspense } from 'react'
import { Navigate, Route, Routes } from 'react-router-dom'
import Layout from './components/layout/Layout'
import Home from './pages/Home'
import Shop from './pages/Shop'
import Product from './pages/Product'
import Cart from './pages/Cart'
import Checkout from './pages/Checkout'
import OrderSuccess from './pages/OrderSuccess'
import Track from './pages/Track'
import About from './pages/About'
import Classes from './pages/Classes'
import ClassBooked from './pages/ClassBooked'
import Gallery from './pages/Gallery'
import Contact from './pages/Contact'
import FAQ from './pages/FAQ'
import NotFound from './pages/NotFound'

// Dev-only component reference for QA. The import sits behind import.meta.env.DEV, so
// production builds drop it entirely (and it is never in the sitemap).
const Styleguide = import.meta.env.DEV ? lazy(() => import('./pages/Styleguide')) : null

export default function App() {
  return (
    <Routes>
      <Route element={<Layout />}>
        <Route index element={<Home />} />
        <Route path="shop" element={<Shop />} />
        <Route path="product/:slug" element={<Product />} />
        <Route path="cart" element={<Cart />} />
        <Route path="checkout" element={<Checkout />} />
        <Route path="order/:id" element={<OrderSuccess />} />
        <Route path="track" element={<Track />} />
        <Route path="classes" element={<Classes />} />
        <Route path="classes/booked/:id" element={<ClassBooked />} />
        <Route path="our-story" element={<About />} />
        <Route path="about" element={<Navigate to="/our-story" replace />} />
        <Route path="gallery" element={<Gallery />} />
        <Route path="contact" element={<Contact />} />
        <Route path="faq" element={<FAQ />} />
        {Styleguide && (
          <Route
            path="styleguide"
            element={
              <Suspense fallback={null}>
                <Styleguide />
              </Suspense>
            }
          />
        )}
        <Route path="*" element={<NotFound />} />
      </Route>
    </Routes>
  )
}
