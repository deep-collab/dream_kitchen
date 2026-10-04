import { lazy, Suspense } from 'react'
import { Navigate, Route, Routes } from 'react-router-dom'
import { classesEnabled } from './config/site'
import { pages } from './routes'
import Layout from './components/layout/Layout'

// Every page loads on demand (src/routes.js). Layout shows the header and footer at once
// and holds a Suspense boundary for the page itself.
const Home = lazy(pages.Home)
const Shop = lazy(pages.Shop)
const Product = lazy(pages.Product)
const Cart = lazy(pages.Cart)
const Checkout = lazy(pages.Checkout)
const OrderSuccess = lazy(pages.OrderSuccess)
const Track = lazy(pages.Track)
const About = lazy(pages.About)
const Classes = lazy(pages.Classes)
const ClassBooked = lazy(pages.ClassBooked)
const Gallery = lazy(pages.Gallery)
const Contact = lazy(pages.Contact)
const FAQ = lazy(pages.FAQ)
const NotFound = lazy(pages.NotFound)

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
        {/* While classes are switched off (site.classes.enabled) these addresses are a normal 404 */}
        {classesEnabled() && <Route path="classes" element={<Classes />} />}
        {classesEnabled() && <Route path="classes/booked/:id" element={<ClassBooked />} />}
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
