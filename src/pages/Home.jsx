import { Link } from 'react-router-dom'
import { useSeo } from '../hooks/useSeo'
import { useI18n } from '../i18n/I18nProvider'
import { useMenu, usePagePhotos } from '../context/MenuProvider'
import Hero from '../components/home/Hero'
import Container from '../components/ui/Container'
import ProductPhoto from '../components/shop/ProductPhoto'
import Button from '../components/ui/Button'
import { BrushIcon } from '../components/icons'
import { optionPrices } from '../config/shop'
import { formatINR, fromPrice } from '../lib/pricing'
import 'virtual:dk-strings/home'

// Each tile shows the photo of one product from it (a gold drawing until real photos exist)
const TILE_PHOTO = {
  'brownie-tubs': 'ferrero-rocher-nutella-tub',
  'delight-boxes': 'red-velvet-delight-box',
  brownies: 'assorted-brownies',
  chocolates: 'pista-bar',
}

/**
 * Home is three parts (Hema's request): a compact hero, six big photo tiles, and the short
 * footer (from the layout). Tiles: 2 per row on phones, 3 on tablets and desktops (3 × 2).
 * Under the tiles, one small card for her specialty, hand-drawn chocolates, linking to Customize.
 * Above everything, her live offers (admin -> Offers; shown by the layout, components/layout/OfferBanner).
 */
export default function Home() {
  useSeo('home')
  const { t, pick } = useI18n()
  const menu = useMenu()
  const pagePhotos = usePagePhotos()
  const bar = menu.productsById['drawing-chocolate-bar']
  // A section Hema fills herself (Cookie Tins) shows the photo of its first product
  const tilePhoto = (c) => TILE_PHOTO[c.id] || menu.products.find((p) => p.category === c.id)?.slug
  const tiles = [
    ...menu.categories.map((c) => ({ key: c.id, to: `/menu#${c.id}`, label: pick(c.name), slug: tilePhoto(c), art: c.art })),
    { key: 'customize', to: '/customize', label: t('nav.customize'), slug: 'drawing-chocolate-bar', art: 'drawing-bar', photo: pagePhotos['home-customize'] },
    { key: 'classes', to: '/classes', label: t('nav.classes'), slug: 'classes', art: 'class' },
  ]
  return (
    <>
      <Hero />
      <section aria-labelledby="pick-title" className="py-6 md:py-10">
        <Container>
          <h2 id="pick-title" className="sr-only">
            {t('home.pick')}
          </h2>
          <ul className="grid grid-cols-2 gap-3 sm:grid-cols-3 sm:gap-5">
            {tiles.map((tile, i) => (
              // An odd last tile (7 with Cookie Tins) spans the row, so the grid stays even
              <li key={tile.key} className={i === tiles.length - 1 ? `${tiles.length % 2 ? 'max-sm:col-span-2' : ''} ${tiles.length % 3 === 1 ? 'sm:col-span-3' : ''}` : undefined}>
                <Link
                  to={tile.to}
                  data-dk-tile
                  className="group block overflow-hidden rounded-card border border-line bg-[#fffcf5] transition-shadow hover:shadow-[0_6px_24px_-12px_rgb(42_29_22/0.35)]"
                >
                  <ProductPhoto
                    slug={tile.slug}
                    photo={tile.photo}
                    art={tile.art}
                    eager={i < 2}
                    rounded="rounded-none"
                    sizes="(min-width: 640px) 33vw, 50vw"
                    className={`w-full ${i === tiles.length - 1 && tiles.length % 2 ? 'aspect-[8/3] sm:aspect-[4/3]' : 'aspect-[4/3]'} ${i === tiles.length - 1 && tiles.length % 3 === 1 ? 'sm:aspect-[4/1]' : ''}`}
                  />
                  <span className="flex min-h-12 items-center px-3 py-2 leading-snug font-bold group-hover:underline sm:px-4">{tile.label}</span>
                </Link>
              </li>
            ))}
          </ul>
          {bar && (
            <section aria-labelledby="special-title" className="mt-3 flex items-center gap-3 rounded-card border border-line bg-[#fffcf5] p-3 sm:mt-5 sm:gap-4 sm:p-4">
              <ProductPhoto slug={bar.slug} photo={pagePhotos['home-customize']} art={bar.art} sizes="96px" className="h-20 w-20 shrink-0 sm:h-24 sm:w-24" />
              <div className="min-w-0 flex-1 sm:flex sm:items-center sm:gap-4">
                <div className="min-w-0 flex-1">
                  <h2 id="special-title" className="leading-snug font-bold">
                    {t('home.special.title')}
                  </h2>
                  <p className="t-small mt-0.5 text-brown-2">
                    {t('home.special.text', { drawingPrice: formatINR(optionPrices.drawing), barPrice: formatINR(fromPrice(bar) ?? 0) })}
                  </p>
                </div>
                <Button to="/customize" icon={BrushIcon} className="mt-2 shrink-0 sm:mt-0">
                  {t('nav.customize')}
                </Button>
              </div>
            </section>
          )}
        </Container>
      </section>
    </>
  )
}
