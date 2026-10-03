import { Link } from 'react-router-dom'
import { useI18n } from '../i18n/I18nProvider'
import { useCart } from '../context/CartProvider'
import { waLink } from '../config/site'
import { formatPrice } from '../lib/format'
import { CartIcon, WhatsAppIcon } from './Icons'

// Phones: sticky bottom bar with Cart + WhatsApp. Desktop: floating WhatsApp button.
export default function FloatingActions() {
  const { t } = useI18n()
  const { pieces, subtotal } = useCart()
  const wa = waLink(t('wa.general'))

  return (
    <>
      <div className="fixed inset-x-0 bottom-0 z-30 border-t border-tint bg-cream/95 px-3 pt-2 pb-[max(0.5rem,env(safe-area-inset-bottom))] shadow-[0_-8px_24px_-12px_rgb(74_44_29/0.35)] backdrop-blur md:hidden">
        <div className="mx-auto flex max-w-lg gap-2">
          <Link to="/cart" className="btn btn-primary flex-1 justify-between px-4" aria-label={t('common.cartWithCount', { count: pieces })}>
            <span className="flex items-center gap-2">
              <span className="relative">
                <CartIcon />
                {pieces > 0 && (
                  <span key={pieces} className="pop absolute -top-2 -right-2.5 grid h-5 min-w-5 place-items-center rounded-full bg-gold px-1 text-[0.7rem] font-extrabold text-deep">
                    {pieces}
                  </span>
                )}
              </span>
              {t('mobileBar.cart')}
            </span>
            <span className="text-gold-soft">{pieces ? formatPrice(subtotal) : t('mobileBar.empty')}</span>
          </Link>
          <a href={wa} target="_blank" rel="noopener noreferrer" className="btn btn-whatsapp px-4">
            <WhatsAppIcon />
            {t('mobileBar.whatsapp')}
          </a>
        </div>
      </div>

      <a
        href={wa}
        target="_blank"
        rel="noopener noreferrer"
        aria-label={t('common.chatWhatsapp')}
        title={t('common.chatWhatsapp')}
        className="fixed right-6 bottom-6 z-30 hidden h-16 w-16 place-items-center rounded-full bg-whatsapp text-white shadow-lift ring-4 ring-cream transition hover:scale-105 md:grid"
      >
        <WhatsAppIcon className="h-8 w-8" />
      </a>
    </>
  )
}
