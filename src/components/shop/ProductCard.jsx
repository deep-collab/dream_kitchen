import { useI18n } from '../../i18n/I18nProvider'
import { formatINR, fromPrice, hasPriceRange, isForSale } from '../../lib/pricing'
import { PlusIcon } from '../icons'
import ProductPhoto from './ProductPhoto'
import { useShopSheets } from './ShopSheets'
import 'virtual:dk-strings/menu'

/**
 * One product on the menu: photo, name, "from ₹X" and a small "+". The whole card is one button
 * that opens the product sheet (one big target; the "+" is its visual cue). 2 per row on phones.
 */
export default function ProductCard({ product, eager = false }) {
  const { t, pick } = useI18n()
  const { openProduct } = useShopSheets()
  const name = pick(product.name)
  const forSale = isForSale(product)
  const from = fromPrice(product)
  const price = product.soldOut ? t('menu.soldOut') : from == null ? t('menu.priceSoon') : hasPriceRange(product) ? t('menu.from', { price: formatINR(from) }) : formatINR(from)

  return (
    <article data-dk-card className="h-full">
      <button
        type="button"
        data-dk-open
        onClick={() => openProduct(product)}
        className="group flex h-full w-full flex-col overflow-hidden rounded-card border border-line bg-[#fffcf5] text-left transition-shadow hover:shadow-[0_6px_24px_-12px_rgb(42_29_22/0.35)]"
      >
        <ProductPhoto
          slug={product.slug}
          art={product.art}
          eager={eager}
          rounded="rounded-none"
          sizes="(min-width: 1024px) 280px, (min-width: 640px) 33vw, 50vw"
          className={`aspect-square w-full ${forSale ? '' : 'grayscale-[60%]'}`}
        />
        <span className="flex flex-1 flex-col gap-1 p-3 sm:p-4">
          <span className="leading-snug font-bold [overflow-wrap:anywhere]">{name}</span>
          <span className="mt-auto flex items-end justify-between gap-2 pt-1">
            <span className={forSale ? 't-price text-[1.0625rem]' : 't-small font-bold text-brown-2'}>{price}</span>
            <span aria-hidden="true" className={`grid h-9 w-9 shrink-0 place-items-center rounded-full ${forSale ? 'bg-ink text-gold-light' : 'border border-control-line text-brown-2'}`}>
              <PlusIcon className="h-5 w-5" />
            </span>
          </span>
        </span>
      </button>
    </article>
  )
}
