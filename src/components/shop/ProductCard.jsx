import { useId } from 'react'
import { useI18n } from '../../i18n/I18nProvider'
import { formatINR, fromPrice, hasPriceRange, optionGroup } from '../../lib/pricing'
import ProductArt from '../art/ProductArt'
import Badge from '../ui/Badge'
import { useShopSheets } from './ShopSheets'
import { useMenu } from '../../context/MenuProvider'

export const BADGE_KEYS = { signature: 'badges.signature', 'top-selling': 'badges.topSelling' }

/** "250g, 500g or 750g" / "4 flavours" / "250g": the short facts line under a card title */
export function useProductFacts() {
  const { t, pick } = useI18n()
  return (product) => {
    const sizes = optionGroup(product, 'size')
    const flavours = optionGroup(product, 'flavour')
    const parts = []
    if (sizes && sizes.choices.length > 1) {
      const labels = sizes.choices.map((c) => pick(c.label))
      parts.push(t('shop.sizesList', { list: labels.slice(0, -1).join(', '), last: labels.at(-1) }))
    } else if (product.grams) parts.push(t('customise.weighs', { grams: product.grams }))
    if (flavours) parts.push(t('shop.flavourCount', { count: flavours.choices.length }))
    return parts.join('. ')
  }
}

/**
 * One product. Phones: a full-width list card (art left). From 640px: a grid card.
 * The whole card is one button that opens the customise sheet.
 * spotlight: her Signature tub and Top selling chocolate get a black, wider card.
 */
export default function ProductCard({ product, spotlight = false, wide = false, showContext = false }) {
  const { t, pick } = useI18n()
  const menu = useMenu()
  const section = showContext ? menu?.sections.find((s) => s.id === product.sectionId) : null
  const category = showContext ? menu?.categories.find((c) => c.id === product.categoryId) : null
  const context = section?.name || category?.name
  const { openProduct } = useShopSheets()
  const facts = useProductFacts()(product)
  const priceId = useId()
  const name = pick(product.name)
  const price = hasPriceRange(product) ? t('shop.from', { price: formatINR(fromPrice(product)) }) : formatINR(fromPrice(product))
  const sold = product.soldOut

  const surface = spotlight ? 'on-dark bg-ink text-cream border-gold/60' : 'bg-[#fffcf5] border-line'
  const muted = spotlight ? 'text-muted' : 'text-brown-2'

  return (
    <article
      className={`relative flex h-full gap-4 rounded-card border p-3 transition-shadow has-[button:focus-visible]:shadow-[0_0_0_3px_var(--color-ink)] has-[button:focus-visible]:outline-3 has-[button:focus-visible]:outline-offset-3 has-[button:focus-visible]:outline-gold sm:flex-col sm:gap-0 sm:p-0 ${surface} ${spotlight || wide ? 'sm:flex-row' : ''} ${sold ? 'opacity-75' : 'hover:shadow-[0_6px_24px_-12px_rgb(42_29_22/0.35)]'}`}
    >
      <ProductArt
        kind={product.image}
        variant={product.sort}
        rounded={spotlight || wide ? 'rounded-control sm:rounded-none sm:rounded-l-card' : 'rounded-control sm:rounded-none sm:rounded-t-card'}
        className={`h-28 w-28 shrink-0 ${spotlight || wide ? 'sm:h-auto sm:w-[36%] sm:max-w-60' : 'sm:aspect-[4/3] sm:h-auto sm:w-full'} ${sold ? 'grayscale' : ''}`}
      />
      <div className={`flex min-w-0 flex-1 flex-col sm:p-5 ${spotlight || wide ? 'sm:justify-center sm:p-7' : ''}`}>
        {(product.badges.length > 0 || sold) && (
          <div className="mb-1.5 flex flex-wrap gap-1.5">
            {sold && <Badge tone="soft">{t('shop.soldOut')}</Badge>}
            {product.badges.map((b) => (
              <Badge key={b} tone={spotlight ? 'soft' : 'gold'}>
                {t(BADGE_KEYS[b])}
              </Badge>
            ))}
          </div>
        )}
        {context && <p className={`t-small ${muted}`}>{pick(context)}</p>}
        <h3 className={`font-body leading-snug font-bold ${spotlight ? 'text-[1.375rem]' : 'text-[1.125rem]'}`}>
          {sold ? (
            name
          ) : (
            <button
              type="button"
              onClick={() => openProduct(product)}
              aria-describedby={priceId}
              className="text-left outline-none after:absolute after:inset-0 after:rounded-card after:content-['']"
            >
              {name}
            </button>
          )}
        </h3>
        {product.description && <p className={`t-small mt-1 line-clamp-2 ${muted}`}>{pick(product.description)}</p>}
        {facts && <p className={`t-small mt-1 ${muted}`}>{facts}</p>}
        <div className="mt-auto flex flex-wrap items-end justify-between gap-x-3 gap-y-2 pt-3">
          <p id={priceId} className="t-price">
            {price}
            {product.pricePerKg && <span className={`t-small ml-2 font-normal ${muted}`}>{t('customise.perKg', { price: formatINR(product.pricePerKg) })}</span>}
          </p>
          {sold ? (
            <p className={`t-small w-full ${muted}`}>{t('shop.soldOutHelp')}</p>
          ) : (
            <span aria-hidden="true" className={`btn min-h-11 px-4 ${spotlight ? 'btn-primary btn-on-dark' : 'btn-primary'}`}>
              {t('shop.choose')}
            </span>
          )}
        </div>
      </div>
    </article>
  )
}
