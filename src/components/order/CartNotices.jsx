import { useI18n } from '../../i18n/I18nProvider'
import { useCart } from '../../context/CartProvider'
import Button from '../ui/Button'
import Notice from '../ui/Notice'
import { useToast } from '../ui/Toast'
import { AlertIcon, InfoIcon, TrashIcon } from '../icons'
import 'virtual:dk-strings/cart'

/**
 * Cart-wide results of the price check, shown in the cart and at checkout:
 * items that can't be ordered (with one tap to remove them all) and "Some prices
 * have been updated". Announced politely when they appear.
 *   id: put on the unavailable box so checkout can move focus to it
 */
export default function CartNotices({ id, className = '' }) {
  const { t, pick } = useI18n()
  const cart = useCart()
  const toast = useToast()
  const n = cart.unavailableIds.length

  const removeAll = () => {
    const names = cart.lines.filter((l) => l.unavailable).map((l) => pick(l.name))
    const undo = cart.removeMany(cart.unavailableIds)
    toast.show({ message: t('cart.removed', { name: names.join(', ') }), action: { label: t('cart.undo'), onClick: undo } })
  }

  return (
    <div aria-live="polite" className={n || cart.priceChanged ? `space-y-4 ${className}` : undefined}>
      {n > 0 && (
        <div id={id} tabIndex={-1} className="scroll-mt-28 rounded-card border-2 border-error bg-error-bg p-4 outline-none sm:p-5">
          <p className="flex items-start gap-2.5 font-bold text-error">
            <AlertIcon className="mt-0.5 h-6 w-6 shrink-0" />
            <span>{n === 1 ? t('cart.unavailableTitleOne') : t('cart.unavailableTitle', { count: n })}</span>
          </p>
          <p className="mt-1.5">{n === 1 ? t('cart.unavailableText') : t('cart.unavailableTextMany')}</p>
          <Button variant="secondary" icon={TrashIcon} className="mt-4" onClick={removeAll}>
            {n === 1 ? t('cart.removeUnavailableOne') : t('cart.removeUnavailable', { count: n })}
          </Button>
        </div>
      )}
      {cart.priceChanged && (
        <Notice icon={InfoIcon}>
          <p className="font-bold">{t('cart.pricesUpdated')}</p>
          <p className="mt-1">{t('cart.pricesUpdatedText')}</p>
        </Notice>
      )}
    </div>
  )
}
