import { useEffect, useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import { useI18n } from '../i18n/I18nProvider'
import { useCart } from '../context/CartProvider'
import { formatPrice, formatWeight } from '../lib/format'
import { CheckIcon, PlusIcon } from './Icons'
import ProductTags from './ProductTags'

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
    <article className="card group flex h-full flex-col overflow-hidden transition duration-300 hover:-translate-y-1 hover:shadow-lift">
      <Link to={`/product/${product.slug}`} className="relative block aspect-square overflow-hidden bg-cream" tabIndex={-1} aria-hidden="true">
        <img
          src={product.image}
          alt=""
          loading="lazy"
          decoding="async"
          width="400"
          height="400"
          className={`h-full w-full object-cover transition duration-500 group-hover:scale-105 ${product.soldOut ? 'opacity-60 grayscale-[35%]' : ''}`}
        />
        <ProductTags product={product} className="absolute top-3 left-3 right-3" />
      </Link>
      <div className="flex flex-1 flex-col p-4 sm:p-5">
        <h3 className="font-display text-lg leading-snug font-bold sm:text-xl">
          <Link to={`/product/${product.slug}`} className="hover:text-brown">
            {name}
          </Link>
        </h3>
        <p className="mt-1 text-sm text-brown">{formatWeight(product.weight, t)}</p>
        <div className="mt-auto flex flex-wrap items-center justify-between gap-2 pt-4">
          <p className="text-xl font-extrabold text-deep">{formatPrice(product.price)}</p>
          {product.soldOut ? (
            <span className="tag tag-soldout px-3 py-1.5 text-sm">{t('common.soldOut')}</span>
          ) : (
            <button
              type="button"
              onClick={onAdd}
              className={`btn btn-sm ${added ? 'btn-gold pop' : 'btn-primary'}`}
              aria-label={`${t('common.addToCartFull')}: ${name}`}
            >
              {added ? <CheckIcon className="h-5 w-5" /> : <PlusIcon className="h-5 w-5" />}
              <span>{added ? t('common.added') : t('common.addToCart')}</span>
            </button>
          )}
        </div>
      </div>
    </article>
  )
}
