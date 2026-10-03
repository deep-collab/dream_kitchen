import { useEffect, useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import { useI18n } from '../i18n/I18nProvider'
import { useCart } from '../context/CartProvider'
import { formatPrice, formatWeight } from '../lib/format'
import { CheckIcon, PlusIcon } from './icons'
import ProductTags from './ProductTags'
import Button from './ui/Button'

// Legacy card for the temporary sample data. Step 2 replaces it with the customise flow.
export default function ProductCard({ product }) {
  const { t, pick } = useI18n()
  const { add } = useCart()
  const [added, setAdded] = useState(false)
  const timer = useRef()
  const name = pick(product.name)

  useEffect(() => () => window.clearTimeout(timer.current), [])

  const onAdd = () => {
    add(product, 1)
    setAdded(true)
    window.clearTimeout(timer.current)
    timer.current = window.setTimeout(() => setAdded(false), 1400)
  }

  return (
    <article className="card flex h-full flex-col overflow-hidden">
      <Link to={`/product/${product.slug}`} className="relative block aspect-square bg-ink" tabIndex={-1} aria-hidden="true">
        <img src={product.image} alt="" loading="lazy" decoding="async" width="400" height="400" className="h-full w-full object-cover" />
        <ProductTags product={product} className="absolute top-3 left-3" />
      </Link>
      <div className="flex flex-1 flex-col p-4 sm:p-5">
        <h3 className="t-h3">
          <Link to={`/product/${product.slug}`} className="inline-flex min-h-12 items-center hover:underline">
            {name}
          </Link>
        </h3>
        <p className="t-small mt-1 text-brown-2">{formatWeight(product.weight, t)}</p>
        <div className="mt-auto flex flex-wrap items-center justify-between gap-2 pt-4">
          <p className="t-price">{formatPrice(product.price)}</p>
          {!product.soldOut && (
            <Button onClick={onAdd} icon={added ? CheckIcon : PlusIcon} aria-label={`${t('common.addToCartFull')}: ${name}`} className={added ? 'pop' : ''}>
              {added ? t('common.added') : t('common.addToCart')}
            </Button>
          )}
        </div>
      </div>
    </article>
  )
}
