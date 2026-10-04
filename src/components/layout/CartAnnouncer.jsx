import { useEffect, useRef, useState } from 'react'
import { useI18n } from '../../i18n/I18nProvider'
import { useCart } from '../../context/CartProvider'

// Announces cart count changes to screen readers ("Cart, 3 items"); silent on page load.
export default function CartAnnouncer() {
  const { t } = useI18n()
  const { count } = useCart()
  const first = useRef(true)
  const [message, setMessage] = useState('')
  useEffect(() => {
    if (first.current) {
      first.current = false
      return
    }
    setMessage(count === 1 ? t('common.cartWithCountOne') : t('common.cartWithCount', { count }))
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [count])
  return (
    <p className="sr-only" aria-live="polite" aria-atomic="true">
      {message}
    </p>
  )
}
