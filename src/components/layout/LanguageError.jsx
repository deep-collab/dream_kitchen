import { useI18n } from '../../i18n/I18nProvider'
import { LANGS } from '../ui/LanguageToggle'
import { CloseIcon, LanguageIcon } from '../icons'

// Shown when ಕನ್ನಡ was chosen but its words could not be downloaded (e.g. no signal).
// The page stays in English and keeps everything typed; one tap tries again.
export default function LanguageError() {
  const { t, langFailed, setLang, dismissLangError, pendingLang } = useI18n()
  if (!langFailed) return null
  const kannada = LANGS.find((l) => l.code === 'kn')
  return (
    <div role="alert" className="border-b border-error/30 bg-error-bg text-brown">
      <div className="dk-container flex flex-wrap items-center gap-x-4 gap-y-2 py-2">
        <p className="min-w-0 flex-1 font-bold">{t('langError.text')}</p>
        <button
          type="button"
          onClick={() => setLang('kn')}
          aria-busy={pendingLang === 'kn' || undefined}
          className="inline-flex min-h-12 items-center gap-2 rounded-control border-[1.5px] border-ink px-4 font-bold hover:bg-champagne aria-busy:animate-pulse"
        >
          <LanguageIcon className="h-5 w-5" />
          <span className="sr-only">{t('langError.retry')}: </span>
          <span lang="kn">{kannada.label}</span>
        </button>
        <button type="button" onClick={dismissLangError} className="grid h-12 w-12 place-items-center rounded-control hover:bg-champagne">
          <CloseIcon className="h-6 w-6" />
          <span className="sr-only">{t('langError.close')}</span>
        </button>
      </div>
    </div>
  )
}
