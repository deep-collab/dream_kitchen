import { useI18n } from '../../i18n/I18nProvider'
import { telLink } from '../../config/site'
import { useAnyOverlayOpen } from '../../hooks/useModal'
import { PhoneIcon, WhatsAppIcon } from '../icons'

/**
 * Phones only (<768px), on /checkout in place of the usual bottom bar: a small
 * labelled Call button and the main "Send order on WhatsApp ₹<total>" button,
 * which submits the checkout form (form attribute), always within thumb reach.
 * Slides away while a sheet is open, like the usual bar.
 */
export default function CheckoutBar({ formId, label, disabled }) {
  const { t } = useI18n()
  const hidden = useAnyOverlayOpen()
  return (
    <div
      className={`fixed inset-x-0 bottom-0 z-40 border-t border-gold/45 bg-ink pb-[env(safe-area-inset-bottom)] transition-transform duration-200 md:hidden ${hidden ? 'translate-y-full' : ''}`}
    >
      <div className="flex h-[var(--bar-h)] items-stretch gap-2 px-2 py-2">
        <a
          href={telLink}
          className="flex w-16 shrink-0 flex-col items-center justify-center gap-0.5 rounded-control text-base leading-tight font-bold text-cream active:bg-white/10"
        >
          <PhoneIcon className="h-6 w-6 text-gold" />
          <span>{t('checkout.call')}</span>
        </a>
        <button
          type="submit"
          form={formId}
          disabled={disabled}
          className="btn btn-whatsapp min-h-0 flex-1 gap-2 px-3 py-1 text-[1.0625rem] leading-tight [&_svg]:h-6 [&_svg]:w-6"
        >
          <WhatsAppIcon />
          <span className="text-balance">{label}</span>
        </button>
      </div>
    </div>
  )
}
