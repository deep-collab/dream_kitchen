import { useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { useI18n } from '../i18n/I18nProvider'
import { useCart } from '../context/CartProvider'
import { useSeo } from '../hooks/useSeo'
import { useAsync } from '../hooks/useAsync'
import { getCategories, getProduct, getProducts } from '../services'
import { site } from '../config/site'
import { formatPrice, formatWeight } from '../lib/format'
import QuantityStepper from '../components/ui/QuantityStepper'
import Container from '../components/ui/Container'
import Button from '../components/ui/Button'
import ProductCard from '../components/ProductCard'
import ProductTags from '../components/ProductTags'
import NotFound from './NotFound'
import { ArrowLeftIcon, CheckIcon, PlusIcon, TruckIcon } from '../components/icons'

// Legacy product page over sample data. Step 2 rebuilds it with the customise UI.
export default function Product() {
  const { slug } = useParams()
  const { data, loading } = useAsync(async () => {
    const product = await getProduct(slug)
    if (!product) return { product: null }
    const [cats, related] = await Promise.all([getCategories(), getProducts({ category: product.category })])
    return { product, category: cats.find((c) => c.id === product.category), related: related.filter((p) => p.id !== product.id).slice(0, 4) }
  }, [slug])

  if (loading) return <div className="min-h-[50vh]" />
  if (!data?.product) return <NotFound />
  return <ProductView key={slug} {...data} />
}

function ProductView({ product, category, related }) {
  const { t, pick } = useI18n()
  const { add } = useCart()
  const navigate = useNavigate()
  const [qty, setQty] = useState(1)
  const [added, setAdded] = useState(false)
  const name = pick(product.name)
  useSeo('product', { title: `${name} | ${t('brand.name')}`, desc: pick(product.description) })

  const onAdd = () => {
    add(product, qty)
    setAdded(true)
    setTimeout(() => setAdded(false), 1500)
  }

  return (
    <>
      <Container className="py-8 lg:py-12">
        <Link to="/shop" className="mb-6 inline-flex min-h-12 items-center gap-2 rounded-control font-bold hover:underline">
          <ArrowLeftIcon className="h-5 w-5" /> {t('common.backToShop')}
        </Link>
        <div className="grid gap-8 lg:grid-cols-2 lg:gap-12">
          <figure className="overflow-hidden rounded-card bg-ink">
            <img src={product.image} alt={name} width="400" height="400" className="aspect-square w-full object-cover" />
          </figure>

          <div>
            <ProductTags product={product} />
            {category && (
              <p className="t-small mt-3 text-brown-2">
                {t('product.category')}:{' '}
                <Link className="link inline-flex min-h-12 items-center" to={`/shop?category=${category.id}`}>
                  {pick(category.name)}
                </Link>
              </p>
            )}
            <h1 className="t-h1 mt-2">{name}</h1>
            <p className="mt-1 text-brown-2">{formatWeight(product.weight, t)}</p>
            <p className="t-price mt-4">{formatPrice(product.price)}</p>
            <p className="mt-4">{pick(product.description)}</p>

            {!product.soldOut && (
              <div className="mt-8 flex flex-wrap items-center gap-3">
                <QuantityStepper value={qty} onChange={setQty} />
                <Button onClick={onAdd} icon={added ? CheckIcon : PlusIcon} className={`flex-1 ${added ? 'pop' : ''}`}>
                  {added ? t('common.added') : t('common.addToCartFull')}
                </Button>
                <Button
                  variant="secondary"
                  fullWidth
                  onClick={() => {
                    add(product, qty)
                    navigate('/cart')
                  }}
                >
                  {t('product.buyNow')}
                </Button>
              </div>
            )}

            <p className="mt-8 flex gap-3 border-t border-line pt-6">
              <TruckIcon className="mt-0.5 h-6 w-6 shrink-0" />
              <span>
                <span className="block font-bold">{t('product.delivery')}</span>
                <span className="text-brown-2">{t('product.deliveryText', { charge: site.delivery.charge })}</span>
              </span>
            </p>
          </div>
        </div>
      </Container>

      {related.length > 0 && (
        <section className="bg-champagne py-12 lg:py-16" aria-labelledby="related-title">
          <Container>
            <h2 id="related-title" className="t-h2 mb-8">
              {t('product.related')}
            </h2>
            <ul className="grid gap-4 sm:grid-cols-2 sm:gap-6 lg:grid-cols-4">
              {related.map((p) => (
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
