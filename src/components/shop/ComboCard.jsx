import { useI18n } from '../../i18n/I18nProvider'
import { formatINR } from '../../lib/pricing'
import ProductArt from '../art/ProductArt'
import { useShopSheets } from './ShopSheets'

// "Pick any 3 bars for ₹699": a distinct black card with three bars fanned out.
export default function ComboCard({ combo }) {
  const { t, pick } = useI18n()
  const { openCombo } = useShopSheets()
  return (
    <article className="on-dark relative flex flex-col gap-5 rounded-card border border-gold/60 bg-ink p-5 text-cream has-[button:focus-visible]:outline-3 has-[button:focus-visible]:outline-offset-3 has-[button:focus-visible]:outline-gold sm:col-span-2 sm:flex-row sm:items-center sm:p-7">
      <div aria-hidden="true" className="flex shrink-0 justify-center sm:w-56">
        {[0, 1, 2].map((i) => (
          <ProductArt key={i} kind="bar" variant={i + 1} className={`h-20 w-20 rounded-control border border-gold/40 sm:h-24 sm:w-24 ${i === 1 ? 'z-10 -mx-3 -translate-y-2' : ''} ${i === 0 ? '-rotate-6' : i === 2 ? 'rotate-6' : ''}`} />
        ))}
      </div>
      <div className="min-w-0 flex-1">
        <h3 className="t-h3 text-gold-light">
          <button type="button" onClick={() => openCombo(combo)} className="text-left outline-none after:absolute after:inset-0 after:rounded-card after:content-['']">
            {pick(combo.name)}
          </button>
        </h3>
        <p className="mt-2 text-muted">{t('combo.cardText', { count: combo.eligibleProductIds.length })}</p>
        <div className="mt-4 flex flex-wrap items-center justify-between gap-3">
          <p className="t-price text-gold-light">{formatINR(combo.price)}</p>
          <span aria-hidden="true" className="btn btn-primary btn-on-dark min-h-11 px-4">
            {t('combo.choose', { count: combo.pick })}
          </span>
        </div>
      </div>
    </article>
  )
}
