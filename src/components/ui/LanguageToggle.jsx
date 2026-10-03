import { useI18n } from '../../i18n/I18nProvider'

const LANGS = [
  { code: 'en', label: 'English', short: 'EN' },
  { code: 'kn', label: 'ಕನ್ನಡ', short: 'ಕನ್ನಡ' },
]

/**
 * English / ಕನ್ನಡ switch for black surfaces.
 *   segmented: both options visible, current one filled (header from 768px, mobile menu)
 *   compact:   one button naming the other language (phone header, where space is tight)
 */
export default function LanguageToggle({ variant = 'segmented', size = 'md', className = '' }) {
  const { lang, setLang, t } = useI18n()

  if (variant === 'compact') {
    const other = LANGS.find((l) => l.code !== lang)
    return (
      <button
        type="button"
        onClick={() => setLang(other.code)}
        className={`inline-flex min-h-12 min-w-12 items-center justify-center rounded-control px-2 font-bold text-cream transition-colors hover:bg-white/10 ${className}`}
      >
        <span className="sr-only">{t('nav.language')}: </span>
        <span lang={other.code} className="border-b border-gold/70 pb-px">
          {other.short}
        </span>
      </button>
    )
  }

  const big = size === 'lg'
  return (
    <div role="group" aria-label={t('nav.language')} className={`inline-flex rounded-full border border-ink-line bg-ink-2 p-1 ${className}`}>
      {LANGS.map((l) => {
        const active = lang === l.code
        return (
          <button
            key={l.code}
            type="button"
            lang={l.code}
            aria-pressed={active}
            onClick={() => setLang(l.code)}
            className={`min-h-12 rounded-full font-bold transition-colors ${big ? 'min-w-28 px-5 text-[1.125rem]' : 'min-w-12 px-3.5 text-base'} ${
              active ? 'bg-gold-mid text-ink' : 'text-cream hover:bg-white/10'
            }`}
          >
            {big ? l.label : l.short}
          </button>
        )
      })}
    </div>
  )
}
