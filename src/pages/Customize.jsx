import { useI18n } from '../i18n/I18nProvider'
import { useSeo } from '../hooks/useSeo'
import { useMenu, useShowcase } from '../context/MenuProvider'
import { customizeTiles, optionPrices } from '../config/shop'
import { formatINR, fromPrice, isForSale } from '../lib/pricing'
import Container from '../components/ui/Container'
import Button from '../components/ui/Button'
import ProductPhoto from '../components/shop/ProductPhoto'
import { useShopSheets } from '../components/shop/ShopSheets'
import { BrushIcon } from '../components/icons'
import 'virtual:dk-strings/customize'
import 'virtual:dk-strings/menu'

const [BOX_TILE, BAR_TILE] = customizeTiles

/**
 * The two ways to personalise (Hema): a Delight Box with a name or a drawing (opens that box's
 * sheet with the options in view), and the Drawing Chocolate Bar, which is listed only here.
 * Then any product Hema added to "Customize page" in the admin. Each tile shows the photo she
 * chose for it in admin -> Menu (else the product's own photo, else its gold drawing).
 */
export default function Customize() {
  useSeo('customize')
  const { t, pick } = useI18n()
  const menu = useMenu()
  const { tilePhotos } = useShowcase()
  const { openProduct } = useShopSheets()
  const boxes = menu.products.filter((p) => p.category === 'delight-boxes')
  const bar = menu.productsById['drawing-chocolate-bar']
  const more = menu.products.filter((p) => p.category === 'customize' && p.added)

  return (
    <Container className="py-6 lg:py-10">
      <h1 className="t-h2">{t('customize.title')}</h1>
      <p className="mt-1 text-brown-2">{t('customize.lead')}</p>

      <div className="mt-6 grid gap-5 lg:grid-cols-2">
        <section aria-labelledby="cz-box" className="rounded-card border border-line bg-[#fffcf5] p-4 sm:p-5" data-dk-tile={BOX_TILE.id}>
          <div className="flex gap-4">
            <ProductPhoto slug={BOX_TILE.photoOf} art={BOX_TILE.art} photo={tilePhotos[BOX_TILE.id]} eager sizes="112px" className="h-24 w-24 shrink-0 sm:h-28 sm:w-28" />
            <div className="min-w-0">
              <h2 id="cz-box" className="t-h3">
                {t('customize.box.title')}
              </h2>
              <p className="t-small mt-1">{t('customize.box.text', { price: formatINR(optionPrices.drawing) })}</p>
            </div>
          </div>
          <p className="mt-4 font-bold">{t('customize.box.pick')}</p>
          <ul className="mt-2 grid grid-cols-2 gap-2">
            {boxes.map((p) => (
              <li key={p.id}>
                <button
                  type="button"
                  onClick={() => openProduct(p, { focus: 'custom' })}
                  disabled={!isForSale(p)}
                  className="flex min-h-14 w-full flex-col justify-center rounded-control border-[1.5px] border-control-line bg-cream px-3 py-2 text-left transition-colors hover:border-ink disabled:opacity-60"
                >
                  <span className="leading-tight font-bold">{pick(p.name)}</span>
                  {fromPrice(p) != null && <span className="t-small text-brown-2">{t('menu.from', { price: formatINR(fromPrice(p)) })}</span>}
                </button>
              </li>
            ))}
          </ul>
        </section>

        {bar && (
          <section aria-labelledby="cz-bar" className="rounded-card border border-line bg-[#fffcf5] p-4 sm:p-5" data-dk-tile={BAR_TILE.id}>
            <div className="flex gap-4">
              <ProductPhoto slug={bar.slug} art={bar.art} photo={tilePhotos[BAR_TILE.id]} eager sizes="112px" className="h-24 w-24 shrink-0 sm:h-28 sm:w-28" />
              <div className="min-w-0">
                <h2 id="cz-bar" className="t-h3">
                  {t('customize.bar.title')}
                </h2>
                <p className="t-small mt-1">{t('customize.bar.text')}</p>
              </div>
            </div>
            <Button icon={BrushIcon} fullWidth className="mt-4" onClick={() => openProduct(bar)} disabled={!isForSale(bar)}>
              {t('customize.bar.cta', { price: formatINR(fromPrice(bar) ?? 0) })}
            </Button>
          </section>
        )}

        {more.map((p) => {
          const forSale = isForSale(p)
          const from = fromPrice(p)
          return (
            <section key={p.id} aria-labelledby={`cz-${p.id}`} className="rounded-card border border-line bg-[#fffcf5] p-4 sm:p-5" data-dk-tile={p.id}>
              <div className="flex gap-4">
                <ProductPhoto slug={p.slug} art={p.art} sizes="112px" className="h-24 w-24 shrink-0 sm:h-28 sm:w-28" />
                <div className="min-w-0">
                  <h2 id={`cz-${p.id}`} className="t-h3 [overflow-wrap:anywhere]">
                    {pick(p.name)}
                  </h2>
                  {p.description && <p className="t-small mt-1">{pick(p.description)}</p>}
                </div>
              </div>
              <Button fullWidth className="mt-4" onClick={() => openProduct(p)} disabled={!forSale}>
                {p.soldOut ? t('menu.soldOut') : from == null ? t('menu.priceSoon') : t('customize.choose', { price: (p.sizes?.length || 0) > 1 ? t('menu.from', { price: formatINR(from) }) : formatINR(from) })}
              </Button>
            </section>
          )
        })}
      </div>
      <p className="t-small mt-4 text-brown-2">{t('customize.drawingNote')}</p>
    </Container>
  )
}
