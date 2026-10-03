import { useEffect, useState } from 'react'
import { Link, NavLink, useLocation } from 'react-router-dom'
import { useI18n } from '../i18n/I18nProvider'
import { useCart } from '../context/CartProvider'
import LogoBadge from './LogoBadge'
import LangToggle from './LangToggle'
import { CartIcon, CloseIcon, MenuIcon } from './Icons'

export const NAV = [
  ['/', 'nav.home'],
  ['/shop', 'nav.shop'],
  ['/about', 'nav.about'],
  ['/gallery', 'nav.gallery'],
  ['/track', 'nav.track'],
  ['/faq', 'nav.faq'],
  ['/contact', 'nav.contact'],
]

export default function Header() {
  const { t } = useI18n()
  const { pieces } = useCart()
  const [open, setOpen] = useState(false)
  const { pathname } = useLocation()

  useEffect(() => setOpen(false), [pathname])
  useEffect(() => {
    if (!open) return
    const onKey = (e) => e.key === 'Escape' && setOpen(false)
    document.addEventListener('keydown', onKey)
    document.body.style.overflow = 'hidden'
    return () => {
      document.removeEventListener('keydown', onKey)
      document.body.style.overflow = ''
    }
  }, [open])

  const linkCls = ({ isActive }) =>
    `whitespace-nowrap rounded-full px-2.5 py-2 text-[0.95rem] font-bold transition ${isActive ? 'bg-tint text-deep' : 'text-dark hover:bg-tint/60'}`

  return (
    <header className="sticky top-0 z-40 border-b border-tint bg-cream/95 backdrop-blur">
      <a
        href="#main"
        className="sr-only focus:not-sr-only focus:absolute focus:top-2 focus:left-2 focus:z-50 focus:rounded-full focus:bg-dark focus:px-4 focus:py-2 focus:text-cream"
      >
        {t('nav.skip')}
      </a>
      <div className="container-dk flex h-16 items-center gap-2 sm:h-[4.5rem] sm:gap-3">
        <Link to="/" className="flex min-w-0 items-center gap-2.5" aria-label={t('brand.name')}>
          <LogoBadge size="sm" />
          <span className="hidden min-w-0 flex-col leading-tight sm:flex">
            <span className="font-display text-xl font-bold text-deep">{t('brand.name')}</span>
            <span className="truncate text-xs font-semibold text-brown">{t('brand.tagline')}</span>
          </span>
        </Link>

        <nav aria-label="Main" className="ml-auto hidden items-center gap-0.5 xl:flex">
          {NAV.map(([to, key]) => (
            <NavLink key={to} to={to} end={to === '/'} className={linkCls}>
              {t(key)}
            </NavLink>
          ))}
        </nav>

        <div className="ml-auto flex items-center gap-1.5 sm:gap-2 xl:ml-3">
          <LangToggle />
          <Link
            to="/cart"
            className="relative hidden h-12 w-12 place-items-center rounded-full text-dark transition hover:bg-tint md:grid"
            aria-label={t('common.cartWithCount', { count: pieces })}
          >
            <CartIcon />
            {pieces > 0 && (
              <span key={pieces} className="pop absolute -top-0.5 -right-0.5 grid h-6 min-w-6 place-items-center rounded-full bg-gold px-1 text-xs font-extrabold text-deep">
                {pieces}
              </span>
            )}
          </Link>
          <button
            type="button"
            className="grid h-12 w-12 place-items-center rounded-full text-dark transition hover:bg-tint xl:hidden"
            onClick={() => setOpen(true)}
            aria-label={t('nav.openMenu')}
            aria-expanded={open}
            aria-controls="mobile-menu"
          >
            <MenuIcon />
          </button>
        </div>
      </div>

      {open && (
        <div className="fixed inset-0 z-50 xl:hidden" id="mobile-menu" role="dialog" aria-modal="true" aria-label={t('nav.menu')}>
          <div className="absolute inset-0 bg-deep/40" onClick={() => setOpen(false)} aria-hidden="true" />
          <div className="doodle-bg doodle-bg-faint absolute top-0 right-0 flex h-full w-[86%] max-w-sm flex-col overflow-y-auto bg-cream shadow-lift">
            <div className="flex items-center justify-between border-b border-tint p-4">
              <span className="flex items-center gap-2.5">
                <LogoBadge size="sm" />
                <span className="font-display text-xl font-bold text-deep">{t('brand.name')}</span>
              </span>
              <button
                type="button"
                autoFocus
                className="grid h-12 w-12 place-items-center rounded-full bg-offwhite text-dark hover:bg-tint"
                onClick={() => setOpen(false)}
                aria-label={t('nav.closeMenu')}
              >
                <CloseIcon />
              </button>
            </div>
            <nav aria-label="Mobile" className="flex flex-col gap-1.5 p-4">
              {NAV.map(([to, key]) => (
                <NavLink
                  key={to}
                  to={to}
                  end={to === '/'}
                  className={({ isActive }) =>
                    `flex min-h-12 items-center rounded-2xl px-4 text-lg font-bold ${isActive ? 'bg-dark text-cream' : 'bg-offwhite text-dark hover:bg-tint'}`
                  }
                >
                  {t(key)}
                </NavLink>
              ))}
              <NavLink to="/cart" className="mt-2 flex min-h-12 items-center justify-between rounded-2xl bg-offwhite px-4 text-lg font-bold text-dark hover:bg-tint">
                <span className="flex items-center gap-2">
                  <CartIcon /> {t('nav.cart')}
                </span>
                <span className="rounded-full bg-gold px-2.5 text-sm font-extrabold text-deep">{pieces}</span>
              </NavLink>
            </nav>
          </div>
        </div>
      )}
    </header>
  )
}
