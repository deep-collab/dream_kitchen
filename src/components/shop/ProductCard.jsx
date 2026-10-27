import { useI18n } from '../../i18n/I18nProvider'
import { formatINR, fromPrice, hasPriceRange, isForSale } from '../../lib/pricing'
import { RAJYOTSAVA, regularFrom } from '../../lib/offers'
import { PlusIcon, TagIcon } from '../icons'
import ProductPhoto from './ProductPhoto'
import { useShopSheets } from './ShopSheets'
import 'virtual:dk-strings/menu'

/**
 * One product on the menu: photo, name, "from ₹X" and a small "+". The whole card is one button
 * that opens the product sheet (one big target; the "+" is its visual cue). 2 per row on phones.
 * In a live offer: the offer's badge on the photo, and with a special price the regular price
 * crossed out next to the offer price.
 */
export default function ProductCard({ product, eager = false }) {
  const { t, pick } = useI18n()
  const { openProduct } = useShopSheets()
  const name = pick(product.name)
  const forSale = isForSale(product)
  const from = fromPrice(product)
  const was = forSale ? regularFrom(product) : null
  const price = product.soldOut ? t('menu.soldOut') : from == null ? t('menu.priceSoon') : hasPriceRange(product) ? t('menu.from', { price: formatINR(from) }) : formatINR(from)
  const badge = product.offer ? (product.offer.badge ? pick(product.offer.badge) : t('menu.offerBadge')) : ''
  // Kannada Rajyotsava's "50% OFF": Karnataka red, so it stands out on every card
  const festive = product.offer?.id === RAJYOTSAVA.id

  return (
    <article data-dk-card className="h-full">
      <button
        type="button"
        data-dk-open
        onClick={() => openProduct(product)}
        className="group flex h-full w-full flex-col overflow-hidden rounded-card border border-line bg-[#fffcf5] text-left transition-shadow hover:shadow-[0_6px_24px_-12px_rgb(42_29_22/0.35)]"
      >
        <span className="relative block">
          <ProductPhoto
            slug={product.slug}
            art={product.art}
            eager={eager}
            rounded="rounded-none"
            sizes="(min-width: 1024px) 280px, (min-width: 640px) 33vw, 50vw"
            className={`aspect-square w-full ${forSale ? '' : 'grayscale-[60%]'}`}
          />
          {badge && (
            <span
              className={`absolute top-2 left-2 inline-flex max-w-[calc(100%-1rem)] items-center gap-1 rounded-full px-2.5 py-0.5 text-[0.875rem] leading-snug font-bold ${festive ? 'border border-[#f6c512] bg-[#b3261e] text-cream shadow-[0_2px_8px_-2px_rgb(214_40_40/0.6)]' : 'bg-ink text-gold-light'}`}
              data-dk-offer-badge
            >
              <TagIcon className={`h-3.5 w-3.5 shrink-0 ${festive ? 'text-[#f6c512]' : 'text-gold'}`} />
              <span className="truncate">{badge}</span>
            </span>
          )}
        </span>
        <span className="flex flex-1 flex-col gap-1 p-3 sm:p-4">
          <span className="leading-snug font-bold [overflow-wrap:anywhere]">{name}</span>
          <span className="mt-auto flex items-end justify-between gap-2 pt-1">
            <span className="flex flex-wrap items-baseline gap-x-1.5">
              {was != null && (
                <s className="t-small text-brown-2" data-dk-was-price>
                  <span className="sr-only">{t('menu.wasPrice')} </span>
                  {formatINR(was)}
                </s>
              )}
              <span className={forSale ? `t-price text-[1.0625rem] ${was != null ? 'text-[#8a1c14]' : ''}` : 't-small font-bold text-brown-2'}>{price}</span>
            </span>
            <span aria-hidden="true" className={`grid h-9 w-9 shrink-0 place-items-center rounded-full ${forSale ? 'bg-ink text-gold-light' : 'border border-control-line text-brown-2'}`}>
              <PlusIcon className="h-5 w-5" />
            </span>
          </span>
        </span>
      </button>
    </article>
  )
}
