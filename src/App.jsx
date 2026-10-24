import { lazy } from 'react'
import { Navigate, Route, Routes, useParams } from 'react-router-dom'
import { pages } from './routes'
import { legacyProductPath } from './config/redirects'
import { POLICY_PAGES } from './components/layout/nav'
import Layout from './components/layout/Layout'

// Every page loads on demand (src/routes.js). Layout shows the header and footer at once and
// holds a Suspense boundary for the page itself. Hema's admin is a separate app (admin/index.html).
const Home = lazy(pages.Home)
const Menu = lazy(pages.Menu)
const Customize = lazy(pages.Customize)
const Cart = lazy(pages.Cart)
const Checkout = lazy(pages.Checkout)
const CheckoutReview = lazy(pages.CheckoutReview)
const Pay = lazy(pages.Pay)
const OrderConfirmed = lazy(pages.OrderConfirmed)
const Track = lazy(pages.Track)
const Classes = lazy(pages.Classes)
const BookClass = lazy(pages.BookClass)
const Booking = lazy(pages.Booking)
const Story = lazy(pages.Story)
const Contact = lazy(pages.Contact)
const FAQ = lazy(pages.FAQ)
const Policy = lazy(pages.Policy)
const NotFound = lazy(pages.NotFound)

/** Old product addresses (Steps 2–5): the product's new card, or its category (public/_redirects does the same with a 301) */
function LegacyProduct() {
  const { slug } = useParams()
  return <Navigate to={legacyProductPath(slug)} replace />
}

export default function App() {
  return (
    <Routes>
      <Route element={<Layout />}>
        <Route index element={<Home />} />
        <Route path="menu" element={<Menu />} />
        <Route path="customize" element={<Customize />} />
        <Route path="cart" element={<Cart />} />
        <Route path="checkout" element={<Checkout />} />
        <Route path="checkout/review" element={<CheckoutReview />} />
        <Route path="pay/:code" element={<Pay />} />
        <Route path="order/:code" element={<OrderConfirmed />} />
        <Route path="track" element={<Track />} />
        <Route path="classes" element={<Classes />} />
        <Route path="classes/book" element={<BookClass />} />
        <Route path="classes/booking/:code" element={<Booking />} />
        <Route path="our-story" element={<Story />} />
        <Route path="contact" element={<Contact />} />
        <Route path="faq" element={<FAQ />} />
        {POLICY_PAGES.map((page) => (
          <Route key={page} path={page} element={<Policy key={page} page={page} />} />
        ))}
        {/* Old addresses */}
        <Route path="shop" element={<Navigate to="/menu" replace />} />
        <Route path="product/:slug" element={<LegacyProduct />} />
        <Route path="about" element={<Navigate to="/our-story" replace />} />
        <Route path="gallery" element={<Navigate to="/our-story" replace />} />
        <Route path="*" element={<NotFound />} />
      </Route>
    </Routes>
  )
}
