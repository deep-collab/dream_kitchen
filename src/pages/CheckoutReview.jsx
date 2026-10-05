import { useRef, useState } from 'react'
import { Link, Navigate, useNavigate } from 'react-router-dom'
import { useI18n } from '../i18n/I18nProvider'
import { useCart } from '../context/CartProvider'
import { useMenu, useShopStatus } from '../context/MenuProvider'
import { useSeo } from '../hooks/useSeo'
import { useCartQuote } from '../hooks/useCartQuote'
import { states } from '../data/states'
import { site } from '../config/site'
import { ordering } from '../config/shop'
import { formatINR, zoneForPincode } from '../lib/pricing'
import { dateChoices, dispatchRules, earliestDate, formatDay, latestDate, preferredDateError } from '../lib/dates'
import { formatPhone } from '../lib/validation'
import { lineChoices } from '../lib/lineText'
import { attemptKey, clearAttempt, clearDraft, loadDraft, rememberOrder, saveDraft } from '../lib/deviceStore'
import { errorText } from '../lib/api'
import { createOrder } from '../services'
import Container from '../components/ui/Container'
import Button from '../components/ui/Button'
import ProductPhoto from '../components/shop/ProductPhoto'
import DateChips from '../components/checkout/DateChips'
import TotalRows from '../components/order/TotalRows'
import { CheckoutProgress, TotalBar } from '../components/checkout/CheckoutFrame'
import { AlertIcon } from '../components/icons'
import 'virtual:dk-strings/checkout'
import 'virtual:dk-strings/cart'

/**
 * Checkout step 2 of 3: the items, where they go, the exact courier charge, the dispatch date, and
 * "Place order and pay ₹X". The server prices everything again; if anything changed it says so and
 * the customer sees today's prices before trying again. A double tap never makes two orders.
 */
export default function CheckoutReview() {
  useSeo('checkout')
  const { t, pick, lang } = useI18n()
  const cart = useCart()
  const menu = useMenu()
  const navigate = useNavigate()
  const { settings, canOrder, remoteLoaded, refresh } = useShopStatus()
  const [draft] = useState(loadDraft)
  const form = draft?.form
  const zone = form ? zoneForPincode(form.pincode) : null
  const q = useCartQuote(zone)
  const now = new Date()
  const rules = dispatchRules({ drawing: q.hasDrawing, leadTimes: settings.leadTimes })
  const earliest = earliestDate(now, rules)
  const [date, setDate] = useState(() => (draft?.date && !preferredDateError(draft.date, now, rules) ? draft.date : earliest))
  const [dateMode, setDateMode] = useState('chip')
  const [placing, setPlacing] = useState(false)
  const [error, setError] = useState(null)
  const sending = useRef(false)
  const names = t('dates')

  if (!form || !zone) return <Navigate to="/checkout" replace />
  if (!cart.lines.length && !sending.current) return <Navigate to="/cart" replace state={{ notice: 'checkoutEmpty' }} />
  if (cart.unavailableIds.length && !sending.current) return <Navigate to="/cart" replace />

  const dateError = preferredDateError(date, now, rules)
  const chips = dateChoices(now, ordering.dateChoices, rules)

  const onPlace = async () => {
    if (sending.current || !canOrder) return
    if (dateError) {
      setError(t(`checkout.errors.date.${dateError}`, { date: formatDay(earliest, names), days: ordering.maxDaysAhead }))
      document.getElementById('co-date-group')?.scrollIntoView({ block: 'center' })
      return
    }
    const items = q.lines.map((l) => ({ productId: l.productId, selection: l.selection, qty: l.qty, unitPrice: l.unitPrice }))
    const body = { items, customer: form, dispatchDate: date, expectedTotal: q.total, lang, website: form.website || '' }
    body.idempotencyKey = attemptKey(JSON.stringify(body))
    sending.current = true
    setPlacing(true)
    setError(null)
    saveDraft({ ...draft, date })
    const r = await createOrder(body)
    if (r.ok) {
      const order = r.data.order
      rememberOrder(order.code, form.phone)
      clearAttempt()
      clearDraft()
      cart.clear()
      navigate(`/pay/${order.code}`, { replace: true, state: { order } })
      return
    }
    sending.current = false
    setPlacing(false)
    if (r.error === 'priceChanged' || r.error === 'totalChanged' || r.error === 'items') refresh()
    if (r.error === 'dispatchDate' && r.earliest) setDate(r.earliest)
    if (r.error === 'details') return navigate('/checkout')
    setError(errorText(t, r))
  }

  const st = states.find((s) => s.id === form.state)
  const ready = remoteLoaded && canOrder
  const label = !remoteLoaded ? t('common.loading') : !canOrder ? t('checkout.paymentsSoon') : placing ? t('checkout.placing') : t('checkout.placeOrder', { price: formatINR(q.total) })

  return (
    <Container className="py-5 pb-44 lg:py-10">
      <CheckoutProgress step={2} />
      <h1 className="t-h2">{t('checkout.reviewTitle')}</h1>

      <div className="mt-5 grid gap-8 lg:grid-cols-[minmax(0,1fr)_24rem] lg:items-start">
        <div className="min-w-0 space-y-7">
          <section aria-labelledby="rv-items">
            <div className="flex items-baseline justify-between gap-3">
              <h2 id="rv-items" className="text-[1.125rem] font-bold">
                {cart.count === 1 ? t('cart.countLineOne') : t('cart.countLine', { count: cart.count })}
              </h2>
              <Link to="/cart" className="inline-flex min-h-12 items-center font-bold underline underline-offset-4">
                {t('checkout.editItems')}
              </Link>
            </div>
            <ul className="divide-y divide-line border-y border-line">
              {q.lines.map((line) => {
                const product = menu.productsById[line.productId]
                const choices = lineChoices(line, product, { t, pick })
                return (
                  <li key={line.id} className="flex gap-3 py-3">
                    <ProductPhoto slug={product.slug} art={product.art} sizes="56px" className="h-14 w-14 shrink-0" />
                    <div className="min-w-0 flex-1">
                      <div className="flex justify-between gap-3">
                        <p className="leading-snug font-bold">
                          {pick(product.name)} <span className="font-normal text-brown-2">× {line.qty}</span>
                        </p>
                        <p className="shrink-0 font-bold tabular-nums">{formatINR(line.unitPrice * line.qty)}</p>
                      </div>
                      {choices.length > 0 && <p className="t-small text-brown-2">{choices.map((c) => (c.label ? `${c.label}: ${c.value}` : c.value)).join(' · ')}</p>}
                    </div>
                  </li>
                )
              })}
            </ul>
          </section>

          <section aria-labelledby="rv-to" className="rounded-card border border-line bg-[#fffcf5] p-4">
            <div className="flex items-baseline justify-between gap-3">
              <h2 id="rv-to" className="font-bold">
                {t('checkout.deliverTo')}
              </h2>
              <Link to="/checkout" className="inline-flex min-h-12 items-center font-bold underline underline-offset-4">
                {t('checkout.editDetails')}
              </Link>
            </div>
            <address className="t-small not-italic">
              <span className="block font-bold">{form.name}</span>
              <span className="block">{formatPhone(form.phone)}</span>
              <span className="block">{[form.line1, form.line2, form.landmark].filter(Boolean).join(', ')}</span>
              <span className="block">
                {form.city} {form.pincode}, {st ? pick(st.name) : ''}
              </span>
            </address>
          </section>

          <div>
            <DateChips
              name="co-date"
              choices={chips}
              earliest={earliest}
              latest={latestDate(now, rules)}
              value={date}
              mode={dateMode}
              hint={t(q.hasDrawing ? 'checkout.dispatchHintDrawing' : 'checkout.dispatchHint', { date: formatDay(earliest, names) })}
              onChange={({ date: d, mode }) => {
                setDateMode(mode)
                setDate(d)
              }}
              error={dateError && date ? t(`checkout.errors.date.${dateError}`, { date: formatDay(earliest, names), days: ordering.maxDaysAhead }) : undefined}
            />
            <p className="t-small mt-3 font-bold">{t('checkout.courierNote')}</p>
          </div>
        </div>

        <aside className="lg:sticky lg:top-[calc(var(--header-h)+1.5rem)]">
          <div className="rounded-card bg-champagne p-5">
            <TotalRows subtotal={q.subtotal} courier={q.courier} zone={zone} live />
          </div>
          {error && (
            <p role="alert" className="mt-4 flex items-start gap-2 rounded-control border-[1.5px] border-error bg-error-bg p-3 font-bold">
              <AlertIcon className="mt-0.5 h-5 w-5 shrink-0 text-error" />
              <span>{error}</span>
            </p>
          )}
          <TotalBar label={t('cart.total')} total={formatINR(q.total ?? q.subtotal)} note={remoteLoaded && !canOrder ? t('checkout.paymentsSoonText', { phone: site.phone.display }) : undefined}>
            <Button size="lg" fullWidth onClick={onPlace} disabled={!ready || placing} aria-busy={placing || undefined} data-dk-place>
              {label}
            </Button>
          </TotalBar>
        </aside>
      </div>
    </Container>
  )
}
