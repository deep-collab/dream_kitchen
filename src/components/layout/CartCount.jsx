// Gold count pill on black surfaces. Re-keyed on change so it pops when items are added.
export default function CartCount({ count, className = '' }) {
  if (!count) return null
  return (
    <span
      key={count}
      aria-hidden="true"
      className={`pop inline-grid h-6 min-w-6 place-items-center rounded-full bg-gold-mid px-1.5 text-base leading-none font-bold text-ink tabular-nums ${className}`}
    >
      {count > 99 ? '99+' : count}
    </span>
  )
}

/**
 * Screen-reader end of a cart link's name: the link reads its visible word "Cart" and then
 * this (", 3 items" / ", 1 item" / ", empty"). No aria-label, so the spoken name always
 * starts with what is on screen (voice control users say what they see).
 */
export function CartItemsSr({ count, t }) {
  const text = !count ? t('common.cartEmptySr') : count === 1 ? t('common.cartItemsOne') : t('common.cartItems', { count })
  return <span className="sr-only">{text}</span>
}
