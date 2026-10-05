import { Link } from 'react-router-dom'
import { useSeo } from '../hooks/useSeo'
import { useI18n } from '../i18n/I18nProvider'
import { useMenu } from '../context/MenuProvider'
import Hero from '../components/home/Hero'
import Container from '../components/ui/Container'
import ProductPhoto from '../components/shop/ProductPhoto'
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
 */
export default function Home() {
  useSeo('home')
  const { t, pick } = useI18n()
  const menu = useMenu()
  const tiles = [
    ...menu.categories.map((c) => ({ key: c.id, to: `/menu#${c.id}`, label: pick(c.name), slug: TILE_PHOTO[c.id], art: c.art })),
    { key: 'customize', to: '/customize', label: t('nav.customize'), slug: 'drawing-chocolate-bar', art: 'drawing-bar' },
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
              <li key={tile.key}>
                <Link
                  to={tile.to}
                  data-dk-tile
                  className="group block overflow-hidden rounded-card border border-line bg-[#fffcf5] transition-shadow hover:shadow-[0_6px_24px_-12px_rgb(42_29_22/0.35)]"
                >
                  <ProductPhoto slug={tile.slug} art={tile.art} eager={i < 2} rounded="rounded-none" sizes="(min-width: 640px) 33vw, 50vw" className="aspect-[4/3] w-full" />
                  <span className="flex min-h-12 items-center px-3 py-2 leading-snug font-bold group-hover:underline sm:px-4">{tile.label}</span>
                </Link>
              </li>
            ))}
          </ul>
        </Container>
      </section>
    </>
  )
}
