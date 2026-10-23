import { useCallback, useEffect, useRef, useState } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import { useI18n } from '../i18n/I18nProvider'
import { useSeo } from '../hooks/useSeo'
import { useMenu, useShopStatus } from '../context/MenuProvider'
import Container from '../components/ui/Container'
import ProductCard from '../components/shop/ProductCard'
import { useShopSheets } from '../components/shop/ShopSheets'
import 'virtual:dk-strings/menu'

const reduceMotion = () => window.matchMedia('(prefers-reduced-motion: reduce)').matches

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
 * /menu?item=<slug> (opens that product's sheet).
 */
export default function Menu() {
  useSeo('menu')
  const { t, pick } = useI18n()
  const menu = useMenu()
  const { remoteLoaded } = useShopStatus()
  const { hash, search } = useLocation()
  const navigate = useNavigate()
  const { openProduct } = useShopSheets()
  const [active, setActive] = useState(menu.categories[0]?.id)
  const tabsRef = useRef(null)
  const spyPaused = useRef(false)

  // Deep links: on arrival, and when a link on this page (the offer strip) points to a section
  useEffect(() => {
    const params = new URLSearchParams(search)
    const target = decodeURIComponent(hash.slice(1)) || params.get('c')
    if (target && menu.categories.some((c) => c.id === target)) {
      setActive(target)
      requestAnimationFrame(() => scrollToCategory(target, false))
      // the fonts can still change the layout: land again once they are in
      document.fonts?.ready.then(() => scrollToCategory(target, false))
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [hash])
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

  // Scroll-spy: the last category whose top has passed under the tabs
  useEffect(() => {
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
  }, [menu])

  // Keep the active tab in view inside the tab row
  useEffect(() => {
    const bar = tabsRef.current
    const tab = bar?.querySelector(`[data-tab="${active}"]`)
    if (!bar || !tab) return
    bar.scrollTo({ left: tab.offsetLeft - (bar.clientWidth - tab.clientWidth) / 2, behavior: reduceMotion() ? 'instant' : 'smooth' })
  }, [active])

  const goTo = useCallback((e, id) => {
    e.preventDefault()
    setActive(id)
    spyPaused.current = true
    scrollToCategory(id)
    window.history.replaceState(window.history.state, '', `#${id}`)
    setTimeout(() => (spyPaused.current = false), reduceMotion() ? 50 : 700)
  }, [])

  return (
    <>
      <Container className="pt-5 pb-3 lg:pt-8">
        <h1 className="t-h2">{t('menu.title')}</h1>
        <p className="t-small mt-1 text-brown-2">{t('menu.lead')}</p>
      </Container>

      <nav id="menu-tabs" aria-label={t('menu.tabs')} className="sticky top-[var(--header-h)] z-30 border-y border-line bg-cream/95 backdrop-blur supports-[backdrop-filter]:bg-cream/85">
        <Container>
          <ul ref={tabsRef} className="-mx-[var(--gutter)] flex gap-1.5 overflow-x-auto px-[var(--gutter)] py-1.5 [scrollbar-width:none] sm:justify-center [&::-webkit-scrollbar]:hidden">
            {menu.categories.map((c) => {
              const isActive = active === c.id
              return (
                <li key={c.id} className="shrink-0">
                  <a
                    href={`#${c.id}`}
                    data-tab={c.id}
                    onClick={(e) => goTo(e, c.id)}
                    aria-current={isActive ? 'true' : undefined}
                    className={`inline-flex min-h-12 items-center rounded-full px-4 font-bold whitespace-nowrap transition-colors ${isActive ? 'bg-ink text-gold-light' : 'text-brown hover:bg-champagne'}`}
                  >
                    {pick(c.tab || c.name)}
                  </a>
                </li>
              )
            })}
          </ul>
        </Container>
      </nav>

      {menu.categories.map((c, ci) => {
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
              <ul className="grid grid-cols-2 gap-3 sm:grid-cols-3 sm:gap-4 lg:grid-cols-4 lg:gap-5">
                {products.map((p, i) => (
                  <li key={p.id}>
                    <ProductCard product={p} eager={ci === 0 && i < 2} />
                  </li>
                ))}
              </ul>
            </Container>
          </section>
        )
      })}
      <div className="h-6" />
    </>
  )
}
