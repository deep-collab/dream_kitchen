import { useI18n } from '../../i18n/I18nProvider'
import { logoLines, site } from '../../config/site'
import Symbol from './Symbol'

// The printed logo as a lockup: symbol, "DREAM KITCHEN" in Cinzel capitals, and
// "Handmade Chocolates" beneath. In Kannada (27 Oct 2026) the same lockup with Hema's Kannada
// words from src/config/site.js (logo: "ಡ್ರೀಮ್ ಕಿಚನ್", "ಕೈಯಿಂದ ಮಾಡಿದ ಚಾಕೊಲೇಟ್‌ಗಳು") in Noto Serif
// Kannada: same symbol, gold, size and place; it changes with the language button.
//   stacked:    symbol above (hero, loading screen, footer). Styles live in index.html
//               (.dk-lockup, .dk-lockup--kn) because the inline loading screen shares them.
//   horizontal: symbol left (header). Two lines on phones, one line from 768px.
export default function Wordmark({ variant = 'horizontal', size = 'hero', as: Tag = 'div', handoff = false, className = '' }) {
  const { t, lang, pick } = useI18n()
  const label = t('brand.lockupLabel')
  const kn = lang === 'kn'
  const [name1, name2] = kn ? logoLines(pick(site.logo.name)) : ['Dream', 'Kitchen']
  const [sub1, sub2] = kn ? logoLines(pick(site.logo.tagline)) : ['Handmade', 'Chocolates']

  if (variant === 'stacked') {
    return (
      <Tag
        className={`dk-lockup ${size === 'sm' ? 'dk-lockup--sm' : 'dk-lockup--hero'} ${kn ? 'dk-lockup--kn' : ''} ${className}`}
        aria-label={label}
        role={Tag === 'div' ? 'img' : undefined}
        data-dk-hero={handoff ? 'lockup' : undefined}
        data-dk-logo={kn ? 'kn' : 'en'}
      >
        <Symbol className="dk-lockup__symbol" />
        {/* The spaces keep the words apart for tools that read the visible text (e.g. voice control) */}
        <span className="dk-lockup__name" aria-hidden="true" lang={kn ? 'kn' : undefined}>
          <span>{name1}</span> <span>{name2}</span>
        </span>{' '}
        <span className="dk-lockup__sub" aria-hidden="true" lang={kn ? 'kn' : undefined}>
          <span className="dk-lockup__ruled">{sub1}</span> <span>{sub2}</span>
        </span>
      </Tag>
    )
  }

  return (
    <Tag className={`flex items-center gap-2.5 md:gap-3 ${className}`} data-dk-logo={kn ? 'kn' : 'en'}>
      <Symbol className="h-10 w-auto shrink-0 md:h-11 xl:h-12" />
      {kn ? (
        <span className="flex flex-col font-kannada-serif leading-none font-semibold" aria-hidden="true" lang="kn">
          <span className="gold-text text-[15px] leading-[1.3] md:text-[19px] md:leading-[1.3]">
            {name1} <br className="md:hidden" />
            {name2}
          </span>
          <span className="mt-1 hidden text-[12px] leading-none tracking-[0.04em] text-gold-mid md:block">
            {sub1} {sub2}
          </span>
        </span>
      ) : (
        <span className="flex flex-col font-wordmark leading-none font-semibold uppercase" aria-hidden="true">
          <span className="gold-text text-[15px] leading-[1.08] tracking-[0.04em] md:text-[20px] md:leading-[1.1]">
            Dream <br className="md:hidden" />
            Kitchen
          </span>
          <span className="mt-1.5 hidden text-[11px] leading-none tracking-[0.24em] text-gold-mid md:block">Handmade Chocolates</span>
        </span>
      )}
      <span className="sr-only">{label}</span>
    </Tag>
  )
}
