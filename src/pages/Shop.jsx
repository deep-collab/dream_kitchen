import { useSearchParams } from 'react-router-dom'
import { useI18n } from '../i18n/I18nProvider'
import { useSeo } from '../hooks/useSeo'
import { useAsync } from '../hooks/useAsync'
import { getCategories, getProducts } from '../services'
import PageHero from '../components/PageHero'
import ProductCard from '../components/ProductCard'
import Container from '../components/ui/Container'
import Chip from '../components/ui/Chip'
import Button from '../components/ui/Button'
import { SearchIcon } from '../components/icons'

// Legacy shop over the temporary sample data. Step 2 rebuilds it (tabs, sections, sheet).
const SORTS = [
  ['featured', 'shop.sortFeatured'],
  ['price-asc', 'shop.sortPriceLow'],
  ['price-desc', 'shop.sortPriceHigh'],
  ['name', 'shop.sortName'],
]

export default function Shop() {
  useSeo('shop')
  const { t, pick } = useI18n()
  const [params, setParams] = useSearchParams()
  const category = params.get('category') || 'all'
  const search = params.get('q') || ''
  const sort = params.get('sort') || 'featured'

  const { data: cats = [] } = useAsync(getCategories, [])
  const { data: list = [], loading } = useAsync(() => getProducts({ category, search, sort }), [category, search, sort])

  const update = (key, value, fallback) => {
    const next = new URLSearchParams(params)
    if (!value || value === fallback) next.delete(key)
    else next.set(key, value)
    setParams(next, { replace: true })
  }

  const chips = [{ id: 'all', name: t('shop.all') }, ...cats]

  return (
    <>
      <PageHero title={t('shop.title')} subtitle={t('shop.subtitle')} />
      <Container className="py-10 lg:py-14">
        <div className="grid gap-5 sm:grid-cols-[1fr_auto] sm:items-end">
          <div>
            <label htmlFor="shop-search" className="mb-2 block font-bold">
              {t('shop.search')}
            </label>
            <div className="relative">
              <SearchIcon className="pointer-events-none absolute top-1/2 left-4 h-5 w-5 -translate-y-1/2 text-brown-2" />
              <input
                id="shop-search"
                type="search"
                value={search}
                onChange={(e) => update('q', e.target.value, '')}
                placeholder={t('shop.searchPlaceholder')}
                className="field-control pl-12"
                autoComplete="off"
              />
            </div>
          </div>
          <div>
            <label htmlFor="shop-sort" className="mb-2 block font-bold">
              {t('shop.sort')}
            </label>
            <select id="shop-sort" value={sort} onChange={(e) => update('sort', e.target.value, 'featured')} className="field-control sm:min-w-60">
              {SORTS.map(([v, key]) => (
                <option key={v} value={v}>
                  {t(key)}
                </option>
              ))}
            </select>
          </div>
        </div>
        <div role="group" aria-label={t('shop.categories')} className="-mx-1 mt-5 flex gap-2 overflow-x-auto px-1 pb-2 sm:flex-wrap sm:overflow-visible">
          {chips.map((c) => (
            <Chip key={c.id} className="shrink-0" selected={category === c.id} onClick={() => update('category', c.id, 'all')}>
              {pick(c.name)}
            </Chip>
          ))}
        </div>

        <p className="mt-6 mb-4 font-bold text-brown-2" aria-live="polite">
          {loading ? t('common.loading') : list.length === 1 ? t('shop.resultsOne') : t('shop.results', { count: list.length })}
        </p>

        {!loading && list.length === 0 ? (
          <div className="card p-8">
            <p className="t-lead">{t('shop.empty')}</p>
            <Button variant="secondary" className="mt-4" onClick={() => setParams({}, { replace: true })}>
              {t('shop.clear')}
            </Button>
          </div>
        ) : (
          <ul className="grid gap-4 sm:grid-cols-2 sm:gap-6 lg:grid-cols-3 xl:grid-cols-4">
            {list.map((p) => (
              <li key={p.id}>
                <ProductCard product={p} />
              </li>
            ))}
          </ul>
        )}
      </Container>
    </>
  )
}
