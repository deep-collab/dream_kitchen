import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { useLocation, useSearchParams } from 'react-router-dom'
import { useI18n } from '../i18n/I18nProvider'
import { useSeo } from '../hooks/useSeo'
import { useMenu } from '../context/MenuProvider'
import Container from '../components/ui/Container'
import Button from '../components/ui/Button'
import ProductCard from '../components/shop/ProductCard'
import ComboCard from '../components/shop/ComboCard'
import { CheckIcon, CloseIcon, SearchIcon } from '../components/icons'

const SPOTLIGHT = (p) => p.badges.includes('signature') || p.badges.includes('top-selling')
const reduceMotion = () => window.matchMedia('(prefers-reduced-motion: reduce)').matches

/** Height of the sticky header + category tabs once stuck (not where the tabs sit right now) */
function stickyOffset() {
  const header = document.querySelector('header')
  const tabs = document.getElementById('shop-tabs')
  return (header?.offsetHeight || 0) + (tabs?.offsetHeight || 0) + 8
}

function scrollToCategory(slug, smooth = true) {
  const el = document.getElementById(slug)
  if (!el) return
  const top = el.getBoundingClientRect().top + window.scrollY - stickyOffset() + 1
  window.scrollTo({ top, behavior: smooth && !reduceMotion() ? 'smooth' : 'instant' })
}

export default function Shop() {
  useSeo('shop')
  const { t, pick } = useI18n()
  const menu = useMenu()
  const { hash } = useLocation()
  const [params, setParams] = useSearchParams()
  const [query, setQuery] = useState(params.get('q') || '')
  const [active, setActive] = useState(null)
  const tabsRef = useRef(null)
  const spyPaused = useRef(false)

  const q = query.trim().toLowerCase()
  const results = useMemo(() => {
    if (!menu || !q) return null
    const products = menu.products.filter((p) => p.name.en.toLowerCase().includes(q) || p.name.kn.toLowerCase().includes(q))
    const combos = menu.combos.filter((c) => c.name.en.toLowerCase().includes(q) || c.name.kn.toLowerCase().includes(q))
    return { products, combos, count: products.length + combos.length }
  }, [menu, q])

  const onSearch = (value) => {
    setQuery(value)
    const next = new URLSearchParams(params)
    if (value.trim()) next.set('q', value)
    else next.delete('q')
    setParams(next, { replace: true, preventScrollReset: true })
  }

  // Deep links: /shop#chocolates scrolls there once the menu has rendered
  useEffect(() => {
    if (!menu || !hash || q) return
    const slug = decodeURIComponent(hash.slice(1))
    requestAnimationFrame(() => scrollToCategory(slug, false))
    setActive(slug)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [menu, hash])

  // Scroll-spy: the last category whose top has passed under the tabs
  useEffect(() => {
    if (!menu || q) return
    let raf = 0
    const onScroll = () => {
      cancelAnimationFrame(raf)
      raf = requestAnimationFrame(() => {
        if (spyPaused.current) return
        const offset = stickyOffset() + 40
        let current = menu.categories[0].slug
        for (const c of menu.categories) {
          const el = document.getElementById(c.slug)
          if (el && el.getBoundingClientRect().top <= offset) current = c.slug
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
  }, [menu, q])

  // Keep the active tab visible inside the horizontally scrolling tab bar
  useEffect(() => {
    const bar = tabsRef.current
    const tab = bar?.querySelector(`[data-slug="${active}"]`)
    if (!bar || !tab) return
    const left = tab.offsetLeft - (bar.clientWidth - tab.clientWidth) / 2
    bar.scrollTo({ left, behavior: reduceMotion() ? 'instant' : 'smooth' })
  }, [active])

  const goTo = useCallback((e, slug) => {
    e.preventDefault()
    setActive(slug)
    spyPaused.current = true
    scrollToCategory(slug)
    window.history.replaceState(window.history.state, '', `#${slug}`)
    setTimeout(() => (spyPaused.current = false), reduceMotion() ? 50 : 700)
  }, [])

  return (
    <>
      <section className="bg-champagne pt-10 pb-8 lg:pt-14 lg:pb-10">
        <Container>
          <h1 className="t-h1">{t('shop.title')}</h1>
          <p className="t-lead mt-3 max-w-[40rem] text-brown-2">{t('shop.subtitle')}</p>
          <div role="search" className="mt-6 max-w-[34rem]">
            <label htmlFor="shop-search" className="mb-2 block font-bold">
              {t('shop.search')}
            </label>
            <div className="relative">
              <SearchIcon className="pointer-events-none absolute top-1/2 left-4 h-5 w-5 -translate-y-1/2 text-brown-2" />
              <input
                id="shop-search"
                type="search"
                enterKeyHint="search"
                value={query}
                onChange={(e) => onSearch(e.target.value)}
                placeholder={t('shop.searchPlaceholder')}
                className="field-control pr-14 pl-12 [&::-webkit-search-cancel-button]:hidden"
                autoComplete="off"
              />
              {query && (
                <button
                  type="button"
                  onClick={() => {
                    onSearch('')
                    document.getElementById('shop-search')?.focus()
                  }}
                  className="absolute top-1/2 right-1 grid h-12 w-12 -translate-y-1/2 place-items-center rounded-control text-brown-2 hover:bg-champagne"
                  aria-label={t('shop.clearSearch')}
                >
                  <CloseIcon className="h-5 w-5" />
                </button>
              )}
            </div>
          </div>
        </Container>
      </section>

      {!q && (
        <nav
          id="shop-tabs"
          aria-label={t('shop.categories')}
          className="sticky top-[var(--header-h)] z-30 border-y border-line bg-cream/95 backdrop-blur supports-[backdrop-filter]:bg-cream/85"
        >
          <Container>
            <ul ref={tabsRef} className="-mx-[var(--gutter)] flex gap-2 overflow-x-auto px-[var(--gutter)] py-2 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
              {(menu?.categories || []).map((c) => {
                const isActive = active === c.slug
                return (
                  <li key={c.id} className="shrink-0">
                    <a
                      href={`#${c.slug}`}
                      data-slug={c.slug}
                      onClick={(e) => goTo(e, c.slug)}
                      aria-current={isActive ? 'true' : undefined}
                      className={`inline-flex min-h-12 items-center rounded-full px-4 font-bold whitespace-nowrap transition-colors ${
                        isActive ? 'bg-ink text-gold-light' : 'text-brown hover:bg-champagne'
                      }`}
                    >
                      {pick(c.name)}
                    </a>
                  </li>
                )
              })}
            </ul>
          </Container>
        </nav>
      )}

      {!menu ? (
        <div className="min-h-[60vh]" />
      ) : q ? (
        <SearchResults results={results} query={query} />
      ) : (
        menu.categories.map((c, i) => <CategoryBlock key={c.id} category={c} menu={menu} alt={i % 2 === 1} />)
      )}
    </>
  )
}

function CategoryBlock({ category, menu, alt }) {
  const { t, pick } = useI18n()
  const products = menu.products.filter((p) => p.categoryId === category.id)
  return (
    <section
      id={category.slug}
      aria-labelledby={`${category.slug}-title`}
      className={`scroll-mt-[calc(var(--header-h)+5rem)] border-t border-line py-12 lg:py-16 ${alt ? 'bg-champagne' : ''}`}
    >
      <Container>
        <div className={category.whatYouGet ? 'grid gap-8 lg:grid-cols-[1fr_1.1fr] lg:items-start lg:gap-12' : ''}>
          <div className="max-w-[40rem]">
            <h2 id={`${category.slug}-title`} className="t-h2">
              {pick(category.name)}
            </h2>
            {category.note && <p className="mt-2 font-heading text-[1.375rem] italic text-brown-2 lg:text-[1.5rem]">{pick(category.note)}</p>}
            {category.intro && <p className="t-lead mt-3">{pick(category.intro)}</p>}
            {category.highlights && (
              <p className="mt-3 font-bold text-brown-2">{t('shop.highlights', { list: category.highlights.map((h) => pick(h)).join(', ') })}</p>
            )}
          </div>
          {category.whatYouGet && <WhatYouGet category={category} />}
        </div>

        {category.sections.map((s) => {
          const list = products.filter((p) => p.sectionId === s.id)
          const combos = menu.combos.filter((cb) => cb.sectionId === s.id)
          if (!list.length && !combos.length) return null
          return (
            <div key={s.id} className="mt-10 first-of-type:mt-8">
              {s.name && (
                <div className="mb-5 flex flex-wrap items-baseline gap-x-4 gap-y-1">
                  <h3 className="t-h3">{pick(s.name)}</h3>
                  {s.intro && <p className="text-brown-2">{pick(s.intro)}</p>}
                </div>
              )}
              <ul className="grid gap-4 sm:grid-cols-2 sm:gap-5 lg:grid-cols-3">
                {combos.map((cb) => (
                  <li key={cb.id} className="sm:col-span-2 lg:col-span-3">
                    <ComboCard combo={cb} />
                  </li>
                ))}
                {list.map((p) => {
                  // A section with one product gets a wide card instead of a lonely tall one
                  const wide = list.length === 1 && !combos.length
                  return (
                    <li key={p.id} className={SPOTLIGHT(p) || wide ? 'sm:col-span-2' : ''}>
                      <ProductCard product={p} spotlight={SPOTLIGHT(p)} wide={wide} />
                    </li>
                  )
                })}
              </ul>
            </div>
          )
        })}
      </Container>
    </section>
  )
}

function WhatYouGet({ category }) {
  const { t, pick } = useI18n()
  return (
    <aside aria-labelledby={`${category.slug}-get`} className="on-dark rounded-card bg-ink p-6 text-cream lg:p-8">
      <h3 id={`${category.slug}-get`} className="t-h3 text-gold-light">
        {t('shop.whatYouGet')}
      </h3>
      <ul className="mt-4 grid gap-x-6 gap-y-2 sm:grid-cols-2">
        {category.whatYouGet.map((item) => (
          <li key={item.en} className="flex gap-2.5">
            <CheckIcon className="mt-1 h-5 w-5 shrink-0 text-gold" />
            <span>{pick(item)}</span>
          </li>
        ))}
      </ul>
      <p className="mt-6 border-t border-ink-line pt-5 font-heading text-[1.5rem] leading-snug font-semibold italic">
        <span className="gold-text">{pick(category.slogan)}</span>
      </p>
    </aside>
  )
}

function SearchResults({ results, query }) {
  const { t } = useI18n()
  const count = results?.count || 0
  return (
    <section aria-labelledby="results-title" className="border-t border-line py-10 lg:py-14">
      <Container>
        <h2 id="results-title" className="t-h3" aria-live="polite">
          {count === 1 ? t('shop.resultsOne', { query: query.trim() }) : t('shop.results', { count, query: query.trim() })}
        </h2>
        {count === 0 ? (
          <div className="mt-6 max-w-[36rem] rounded-card border border-line bg-champagne p-6">
            <p className="t-lead">{t('shop.empty')}</p>
            <div className="mt-5 grid gap-3 sm:grid-cols-2">
              <Button variant="call">{t('mobileMenu.callUs')}</Button>
              <Button variant="whatsapp">{t('mobileMenu.chat')}</Button>
            </div>
          </div>
        ) : (
          <ul className="mt-6 grid gap-4 sm:grid-cols-2 sm:gap-5 lg:grid-cols-3">
            {results.combos.map((cb) => (
              <li key={cb.id} className="sm:col-span-2 lg:col-span-3">
                <ComboCard combo={cb} />
              </li>
            ))}
            {results.products.map((p) => (
              <li key={p.id}>
                <ProductCard product={p} showContext />
              </li>
            ))}
          </ul>
        )}
      </Container>
    </section>
  )
}
