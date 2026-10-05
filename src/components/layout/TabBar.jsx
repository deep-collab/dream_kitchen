import { NavLink, useLocation } from 'react-router-dom'
import { useI18n } from '../../i18n/I18nProvider'
import { useAnyOverlayOpen } from '../../hooks/useModal'
import { isCheckoutPath, MAIN_NAV } from './nav'

// Phones and tablets (<1024px): the five main places, always within thumb reach, each an icon
// with its word. Hidden while a sheet is open, and on the checkout steps (they have their own
// total bar). Layout pads the page so it never covers content.
export default function TabBar() {
  const { t } = useI18n()
  const hidden = useAnyOverlayOpen()
  const { pathname } = useLocation()
  if (isCheckoutPath(pathname)) return null

  return (
    <nav
      aria-label={t('nav.main')}
      className={`fixed inset-x-0 bottom-0 z-40 border-t border-gold/45 bg-ink pb-[env(safe-area-inset-bottom)] transition-transform duration-200 lg:hidden ${hidden ? 'translate-y-full' : ''}`}
    >
      <ul className="mx-auto grid h-[var(--bar-h)] max-w-xl grid-cols-5">
        {MAIN_NAV.map(({ to, key, icon: Icon, end }) => (
          <li key={to}>
            <NavLink
              to={to}
              end={end}
              className={({ isActive }) =>
                `flex h-full flex-col items-center justify-center gap-0.5 px-0.5 text-center text-[0.9375rem] leading-tight font-bold transition-colors active:bg-white/10 ${
                  isActive ? 'text-gold-light' : 'text-cream'
                }`
              }
            >
              {({ isActive }) => (
                <>
                  <Icon className={`h-6 w-6 ${isActive ? 'text-gold-light' : 'text-gold'}`} />
                  <span className="max-w-full whitespace-nowrap [&:lang(kn)]:text-[0.875rem] [&:lang(kn)]:tracking-tight">{t(key)}</span>
                </>
              )}
            </NavLink>
          </li>
        ))}
      </ul>
    </nav>
  )
}
