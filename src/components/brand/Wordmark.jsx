import { useI18n } from '../../i18n/I18nProvider'
import Symbol from './Symbol'

// The printed logo as a lockup: symbol, "DREAM KITCHEN" in Cinzel capitals, and
// "Handmade Chocolates" beneath. Brand words stay English in both languages.
//   stacked:    symbol above (hero, loading screen, footer). Styles live in index.html
//               (.dk-lockup) because the inline loading screen shares them.
//   horizontal: symbol left (header). Two lines on phones, one line from 768px.
export default function Wordmark({ variant = 'horizontal', size = 'hero', as: Tag = 'div', handoff = false, className = '' }) {
  const { t } = useI18n()
  const label = t('brand.lockupLabel')

  if (variant === 'stacked') {
    return (
      <Tag
        className={`dk-lockup ${size === 'sm' ? 'dk-lockup--sm' : 'dk-lockup--hero'} ${className}`}
        aria-label={label}
        role={Tag === 'div' ? 'img' : undefined}
        data-dk-hero={handoff ? 'lockup' : undefined}
      >
        <Symbol className="dk-lockup__symbol" />
        <span className="dk-lockup__name" aria-hidden="true">
          <span>Dream</span>
          <span>Kitchen</span>
        </span>
        <span className="dk-lockup__sub" aria-hidden="true">
          <span className="dk-lockup__ruled">Handmade</span>
          <span>Chocolates</span>
        </span>
      </Tag>
    )
  }

  return (
    <Tag className={`flex items-center gap-2.5 md:gap-3 ${className}`}>
      <Symbol className="h-10 w-auto shrink-0 md:h-11 xl:h-12" />
      <span className="flex flex-col font-wordmark leading-none font-semibold uppercase" aria-hidden="true">
        <span className="gold-text text-[15px] leading-[1.08] tracking-[0.04em] md:text-[20px] md:leading-[1.1]">
          Dream <br className="md:hidden" />
          Kitchen
        </span>
        <span className="mt-1.5 hidden text-[11px] leading-none tracking-[0.24em] text-gold-mid md:block">Handmade Chocolates</span>
      </span>
      <span className="sr-only">{label}</span>
    </Tag>
  )
}
