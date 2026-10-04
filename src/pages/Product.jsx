import { Link, useParams } from 'react-router-dom'
import { useI18n } from '../i18n/I18nProvider'
import { useSeo } from '../hooks/useSeo'
import { useMenu } from '../context/MenuProvider'
import { useCart } from '../context/CartProvider'
import Container from '../components/ui/Container'
import Badge from '../components/ui/Badge'
import { useToast } from '../components/ui/Toast'
import ProductCard, { BADGE_KEYS } from '../components/shop/ProductCard'
import { useAddedToast } from '../components/shop/ShopSheets'
import { ProductDetails } from '../components/shop/ShopSheetBodies'
import ProductArt from '../components/art/ProductArt'
import { AddBar, CustomiseFields, useCustomise } from '../components/shop/Customise'
import NotFound from './NotFound'
import 'virtual:dk-strings/product'

// /product/:slug: deep-linkable, with the same choices as the sheet, inline.
export default function Product() {
  const { slug } = useParams()
  const menu = useMenu()
  // Full screen while the menu loads, so the footer never starts in view and then jumps
  if (!menu) return <div aria-busy="true" className="min-h-dvh" />
  const product = menu.products.find((p) => p.slug === slug)
  if (!product) return <NotFound />
  return <ProductView key={slug} product={product} menu={menu} />
}

function ProductView({ product, menu }) {
  const { t, pick } = useI18n()
  const cart = useCart()
  const toast = useToast()
  const added = useAddedToast()
  const c = useCustomise(product)
  const category = menu.categories.find((x) => x.id === product.categoryId)
  const section = category.sections.find((s) => s.id === product.sectionId)
  const name = pick(product.name)
  const more = menu.products.filter((p) => p.categoryId === product.categoryId && p.id !== product.id).slice(0, 3)

  useSeo('product', {
    title: t('product.metaTitle', { name, category: pick(category.name) }),
    desc: product.description ? pick(product.description) : t('product.metaDesc', { name, category: pick(category.name) }),
  })

  const onAdd = () => {
    const line = c.submit()
    if (!line) return
    cart.add(line)
    added(false)
  }

  const share = async () => {
    const url = window.location.href
    try {
      if (navigator.share) await navigator.share({ title: name, url })
      else {
        await navigator.clipboard.writeText(url)
        toast.show({ message: t('product.copied') })
      }
    } catch {
      /* the person closed the share sheet */
    }
  }

  return (
    <>
      <Container className="py-8 lg:py-12">
        <nav aria-label={t('product.breadcrumb')} className="t-small">
          <ol className="flex flex-wrap items-center gap-x-2 text-brown-2">
            <li>
              <Link to="/shop" className="inline-flex min-h-12 min-w-12 items-center underline underline-offset-4 hover:text-brown">
                {t('nav.shop')}
              </Link>
            </li>
            <li aria-hidden="true">/</li>
            <li>
              <Link to={`/shop#${category.slug}`} className="inline-flex min-h-12 min-w-12 items-center underline underline-offset-4 hover:text-brown">
                {pick(category.name)}
              </Link>
            </li>
          </ol>
        </nav>

        <div className="mt-4 grid gap-8 lg:grid-cols-[1fr_1.05fr] lg:gap-14">
          <div className="lg:sticky lg:top-[calc(var(--header-h)+1.5rem)] lg:self-start">
            <ProductArt kind={product.image} variant={product.sort} rounded="rounded-card" className="mx-auto w-full max-w-md lg:max-w-none" />
          </div>

          <div>
            {section?.name && <p className="font-bold text-brown-2">{pick(section.name)}</p>}
            <div className="flex flex-wrap gap-2">
              {product.badges.map((b) => (
                <Badge key={b} className="mt-2">
                  {t(BADGE_KEYS[b])}
                </Badge>
              ))}
            </div>
            <h1 className="t-h1 mt-2">{name}</h1>
            <div className="mt-4">
              <ProductDetails product={product} large />
            </div>

            <div className="mt-10 border-t border-line pt-8">
              <CustomiseFields c={c} />
            </div>
            <div className="sticky bottom-[calc(var(--bar-h)+env(safe-area-inset-bottom))] z-20 -mx-[var(--gutter)] mt-8 border-t border-line bg-cream px-[var(--gutter)] pt-3 md:static md:mx-0 md:rounded-card md:border md:bg-champagne md:p-5">
              <AddBar c={c} onAdd={onAdd} />
            </div>
            <button type="button" onClick={share} className="link mt-4 inline-flex min-h-12 items-center font-bold">
              {t('product.share')}
            </button>
          </div>
        </div>
      </Container>

      {more.length > 0 && (
        <section aria-labelledby="more-title" className="border-t border-line bg-champagne py-12 lg:py-16">
          <Container>
            <h2 id="more-title" className="t-h2 mb-8">
              {t('product.more', { category: pick(category.name) })}
            </h2>
            <ul className="grid gap-4 sm:grid-cols-2 sm:gap-5 lg:grid-cols-3">
              {more.map((p) => (
                <li key={p.id}>
                  <ProductCard product={p} />
                </li>
              ))}
            </ul>
          </Container>
        </section>
      )}
    </>
  )
}
