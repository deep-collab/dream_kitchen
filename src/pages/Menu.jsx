import { useCallback, useEffect, useRef, useState } from 'react'
import { Link, useLocation, useNavigate } from 'react-router-dom'
import { useI18n } from '../i18n/I18nProvider'
import { useSeo } from '../hooks/useSeo'
import { useAllOffers, useMenu, useShopStatus } from '../context/MenuProvider'
import Container from '../components/ui/Container'
import ProductCard from '../components/shop/ProductCard'
import { useShopSheets } from '../components/shop/ShopSheets'
import { TagIcon } from '../components/icons'
import { inOffer, OFFER_ZONE, RAJYOTSAVA } from '../lib/offers'
import { dateParts } from '../lib/dates'
import 'virtual:dk-strings/menu'

const reduceMotion = () => window.matchMedia('(prefers-reduced-motion: reduce)').matches
const OFFERS_TAB = 'offers'

/** Height of the sticky header + tabs once stuck */
function stickyOffset() {
  const header = document.querySelector('header')
  const tabs = document.getElementById('menu-tabs')
  return (header?.offsetHeight || 0) + (tabs?.offsetHeight || 0) + 8
}

function scrollToCategory(id, smooth = true) {
  const el = document.getElementById(id)
  if (!el) return
  const top = el.getBoundingClientRect().top + window.scrollY - stickyOffset() + 1
  window.scrollTo({ top, behavior: smooth && !reduceMotion() ? 'smooth' : 'instant' })
}

/**
 * The whole menu on one page: a sticky row of category tabs (tap = scroll there; the tab of the
 * section on screen lights up), and compact cards, 2 per row on phones.
 * Deep links: /menu#delight-boxes (home tiles), /menu?c=delight-boxes (old addresses),
 * /menu?item=<slug> (opens that product's sheet), /menu?offer=<id> (only that offer's products,
 * from the offer banner's "Shop the offer") and /menu?offer=all (every live offer's products: the
 * "Offers" tab, first in the row while an offer with products is live), /menu?offer=zone (the
 * Offer Zone: the Rajyotsava offer, every product at its offer price).
 */
export default function Menu() {
  useSeo('menu')
  const { t, pick } = useI18n()
  const menu = useMenu()
  const offers = useAllOffers().filter((o) => o.items)
  const { remoteLoaded } = useShopStatus()
  const { hash, search } = useLocation()
  const navigate = useNavigate()
  const { openProduct } = useShopSheets()
  const asked = new URLSearchParams(search).get('offer')
  const offerParam = asked === OFFER_ZONE ? RAJYOTSAVA.id : asked
  const filtering = Boolean(offerParam)
  const [active, setActive] = useState(menu.categories[0]?.id)
  const tabsRef = useRef(null)
  const spyPaused = useRef(false)

  // Deep links: on arrival, and when a link on this page (the offer strip) points to a section
  useEffect(() => {
    if (filtering) return
    const params = new URLSearchParams(search)
    const target = decodeURIComponent(hash.slice(1)) || params.get('c')
    if (target && menu.categories.some((c) => c.id === target)) {
      setActive(target)
      requestAnimationFrame(() => scrollToCategory(target, false))
      // the fonts can still change the layout: land again once they are in
      document.fonts?.ready.then(() => scrollToCategory(target, false))
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [hash, filtering])
  // ?item=<slug> (e.g. from an offer): a product Hema added in the admin is known only once her
  // menu has arrived, so wait for it (a config product opens at once)
  const itemDone = useRef(null)
  useEffect(() => {
    const item = new URLSearchParams(search).get('item')
    if (!item) return void (itemDone.current = null)
    if (itemDone.current === search) return
    const product = menu.products.find((p) => p.slug === item)
    if (!product && !remoteLoaded) return
    itemDone.current = search
    if (product) {
      requestAnimationFrame(() => scrollToCategory(product.category, false))
      openProduct(product)
    }
    navigate({ hash: product ? `#${product.category}` : '' }, { replace: true })
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [search, menu, remoteLoaded])
  // Into or out of an offer's products: start at the top
  useEffect(() => {
    if (filtering) window.scrollTo({ top: 0, behavior: 'instant' })
  }, [offerParam]) // eslint-disable-line react-hooks/exhaustive-deps

  // Scroll-spy: the last category whose top has passed under the tabs
  useEffect(() => {
    if (filtering) return setActive(OFFERS_TAB)
    let raf = 0
    const onScroll = () => {
      cancelAnimationFrame(raf)
      raf = requestAnimationFrame(() => {
        if (spyPaused.current) return
        const offset = stickyOffset() + 40
        let current = menu.categories[0]?.id
        for (const c of menu.categories) {
          const el = document.getElementById(c.id)
          if (el && el.getBoundingClientRect().top <= offset) current = c.id
        }
        setActive(current)
      })
    }
    onScroll()
    window.addEventListener('scroll', onScroll, { passive: true })
    return () => {
      cancelAnimationFrame(raf)
      window.removeEventListener('scroll', onScroll)
    }
  }, [menu, filtering])

  // Keep the active tab in view inside the tab row
  useEffect(() => {
    const bar = tabsRef.current
    const tab = bar?.querySelector(`[data-tab="${active}"]`)
    if (!bar || !tab) return
    bar.scrollTo({ left: tab.offsetLeft - (bar.clientWidth - tab.clientWidth) / 2, behavior: reduceMotion() ? 'instant' : 'smooth' })
  }, [active])

  const goTo = useCallback(
    (e, id) => {
      e.preventDefault()
      // From an offer's products, a section tab goes back to the full menu, at that section
      if (filtering) return navigate(`/menu#${id}`)
      setActive(id)
      spyPaused.current = true
      scrollToCategory(id)
      window.history.replaceState(window.history.state, '', `#${id}`)
      setTimeout(() => (spyPaused.current = false), reduceMotion() ? 50 : 700)
    },
    [filtering, navigate],
  )

  const tab = (id, label, onClick, href) => {
    const isActive = active === id
    return (
      <li key={id} className="shrink-0">
        <a
          href={href}
          data-tab={id}
          onClick={onClick}
          aria-current={isActive ? 'true' : undefined}
          className={`inline-flex min-h-12 items-center gap-1.5 rounded-full px-4 font-bold whitespace-nowrap transition-colors ${isActive ? 'bg-ink text-gold-light' : 'text-brown hover:bg-champagne'} ${id === OFFERS_TAB && !isActive ? 'border border-gold' : ''}`}
        >
          {id === OFFERS_TAB && <TagIcon className={`h-4 w-4 ${isActive ? 'text-gold' : 'text-gold-deep'}`} />}
          {label}
        </a>
      </li>
    )
  }

  return (
    <>
      <Container className="pt-5 pb-3 lg:pt-8">
        <h1 className="t-h2">{t('menu.title')}</h1>
        <p className="t-small mt-1 text-brown-2">{t('menu.lead')}</p>
      </Container>

      <nav id="menu-tabs" aria-label={t('menu.tabs')} className="sticky top-[var(--header-h)] z-30 border-y border-line bg-cream/95 backdrop-blur supports-[backdrop-filter]:bg-cream/85">
        <Container>
          <ul ref={tabsRef} className="-mx-[var(--gutter)] flex gap-1.5 overflow-x-auto px-[var(--gutter)] py-1.5 [scrollbar-width:none] sm:justify-center [&::-webkit-scrollbar]:hidden">
            {offers.length > 0 &&
              tab(OFFERS_TAB, t('menu.offersTab'), (e) => {
                e.preventDefault()
                navigate('/menu?offer=all')
              }, '/menu?offer=all')}
            {menu.categories.map((c) => tab(c.id, pick(c.tab || c.name), (e) => goTo(e, c.id), `#${c.id}`))}
          </ul>
        </Container>
      </nav>

      {filtering ? (
        <OfferProducts offerParam={offerParam} offers={offers} products={menu.products} ready={remoteLoaded} />
      ) : (
        menu.categories.map((c, ci) => {
          const products = menu.products.filter((p) => p.category === c.id && p.menu !== false)
          if (!products.length) return null
          return (
            <section key={c.id} id={c.id} aria-labelledby={`${c.id}-title`} className="pt-6 pb-4 lg:pt-10">
              <Container>
                <div className="mb-3 flex flex-wrap items-baseline gap-x-3">
                  <h2 id={`${c.id}-title`} className="t-h3">
                    {pick(c.name)}
                  </h2>
                  {c.note && <p className="t-small text-brown-2">{pick(c.note)}</p>}
                </div>
                <ProductGrid products={products} eagerFirst={ci === 0} />
              </Container>
            </section>
          )
        })
      )}
      <div className="h-6" />
    </>
  )
}

function ProductGrid({ products, eagerFirst }) {
  return (
    <ul className="grid grid-cols-2 gap-3 sm:grid-cols-3 sm:gap-4 lg:grid-cols-4 lg:gap-5">
      {products.map((p, i) => (
        <li key={p.id}>
          <ProductCard product={p} eager={eagerFirst && i < 2} />
        </li>
      ))}
    </ul>
  )
}

/** Only the products of one live offer (or of all of them), with a way back to the full menu */
function OfferProducts({ offerParam, offers, products, ready }) {
  const { t, pick } = useI18n()
  const one = offerParam === 'all' ? null : offers.find((o) => o.id === offerParam)
  const zone = one?.id === RAJYOTSAVA.id
  const shown = offerParam === 'all' ? offers : one ? [one] : []
  const list = products.filter((p) => p.menu !== false && shown.some((o) => inOffer(o, p)))
  const ends = (iso) => {
    const p = dateParts(iso)
    return t('banner.ends', { date: `${p.day} ${t('dates.months')[p.month - 1]}` })
  }
  // Waiting for Hema's offers to arrive: nothing yet (it is a moment)
  if (!shown.length && !ready) return <div aria-busy="true" className="min-h-[50vh]" />
  return (
    <section aria-labelledby="offer-title" className="pt-5 pb-4 lg:pt-8" data-dk-offer-menu={zone ? OFFER_ZONE : offerParam}>
      <Container>
        <div className="on-dark flex flex-col gap-3 rounded-card border border-gold/50 bg-ink p-4 text-cream sm:flex-row sm:items-center sm:gap-x-4 md:p-5">
          <div className="min-w-0 sm:flex-1">
            <p className="flex flex-wrap items-center gap-x-2 gap-y-1">
              <span className="inline-flex items-center gap-1 rounded-full whitespace-nowrap bg-[linear-gradient(180deg,#ebd27a,#d4af37_55%,#b8901e)] px-2.5 py-0.5 text-[0.9375rem] font-bold text-ink">
                <TagIcon className="h-4 w-4" />
                {one?.badge ? pick(one.badge) : t('menu.offerBadge')}
              </span>
              {one && <span className="t-small font-bold text-champagne">{ends(one.endsOn)}</span>}
            </p>
            <h2 id="offer-title" className="t-h3 mt-1.5 text-gold-light">
              {zone ? (
                <>
                  {t('banner.zone')} <span aria-hidden="true">🎁</span>
                </>
              ) : one ? (
                pick(one.title)
              ) : shown.length ? (
                t('menu.offersAll')
              ) : (
                t('menu.offerEnded')
              )}
            </h2>
            {zone ? (
              <p className="t-small mt-0.5 text-cream" data-dk-zone-text>
                {t('banner.rajHello')}: {t('banner.rajZoneText', { percent: one.deal.value })} <strong className="text-gold-light">{t('banner.rajOnline')}</strong>
              </p>
            ) : (
              one?.message && <p className="t-small mt-0.5 text-cream">{pick(one.message)}</p>
            )}
          </div>
          <Link to="/menu" className="btn btn-secondary min-h-12 self-start px-5 py-2 sm:self-auto" data-dk-full-menu>
            {t('menu.fullMenu')}
          </Link>
        </div>
        {list.length > 0 ? (
          <div className="mt-4">
            <ProductGrid products={list} eagerFirst />
          </div>
        ) : (
          <p className="mt-4 text-brown-2">{shown.length ? t('menu.offerEmpty') : t('menu.offerEndedText')}</p>
        )}
      </Container>
    </section>
  )
}
