import { useState } from 'react'
import { useI18n } from '../../i18n/I18nProvider'
import { useMenu } from '../../context/MenuProvider'
import { useCart } from '../../context/CartProvider'
import { site, telLink } from '../../config/site'
import { cheaperIndividually, comboIndividualTotal, comboSavings, formatINR, isComboComplete } from '../../lib/pricing'
import { makeComboLine, makeProductLine, MAX_QTY } from '../../lib/cart'
import ProductArt from '../art/ProductArt'
import Button from '../ui/Button'
import QuantityStepper from '../ui/QuantityStepper'
import { CloseIcon, PlusIcon } from '../icons'
import 'virtual:dk-strings/combo'
import 'virtual:dk-strings/customise'

/** State for "Pick any 3 bars for ₹699". `line` prefills it when editing a cart line. */
export function useComboBuilder(combo, line) {
  const menu = useMenu()
  const [picks, setPicks] = useState(() => (line ? [...line.picks] : []))
  const [qty, setQty] = useState(line?.qty || 1)
  const [showError, setShowError] = useState(false)
  const byId = menu?.productsById || {}
  const bars = combo.eligibleProductIds.map((id) => byId[id]).filter(Boolean)
  const full = picks.length >= combo.pick
  const complete = isComboComplete(combo, picks)

  return {
    combo,
    line,
    picks,
    qty,
    setQty,
    bars,
    byId,
    full,
    complete,
    showError,
    remaining: combo.pick - picks.length,
    individual: comboIndividualTotal(picks, byId),
    savings: comboSavings(combo, picks, byId),
    cheaper: cheaperIndividually(combo, picks, byId),
    pickBar: (id) => {
      if (full) return
      if (!combo.allowRepeats && picks.includes(id)) return
      setPicks((p) => [...p, id])
      setShowError(false)
    },
    removeAt: (i) => setPicks((p) => p.filter((_, idx) => idx !== i)),
    makeLine: () => {
      if (!complete) {
        setShowError(true)
        return null
      }
      return makeComboLine(combo, picks, qty, byId)
    },
    makeIndividualLines: () => picks.map((id) => makeProductLine(byId[id], {}, qty, { sections: menu.sections, occasions: menu.occasions })),
  }
}

/** Tray, comparison, then the 10 bars */
export function ComboBody({ b, onAddIndividually }) {
  const { t, pick } = useI18n()
  const counts = b.picks.reduce((acc, id) => ({ ...acc, [id]: (acc[id] || 0) + 1 }), {})

  return (
    <div>
      <p>{t('combo.intro', { count: b.combo.pick, price: formatINR(b.combo.price) })}</p>

      <div className="sticky top-[-1.25rem] z-10 -mx-5 mt-4 border-b border-line bg-cream px-5 pt-3 pb-4">
        <p className="mb-2 font-bold" aria-live="polite">
          {b.full ? t('combo.trayFull') : t('combo.trayCount', { picked: b.picks.length, total: b.combo.pick })}
        </p>
        <ol className="grid grid-cols-3 gap-2">
          {Array.from({ length: b.combo.pick }, (_, i) => {
            const id = b.picks[i]
            const bar = id && b.byId[id]
            return (
              <li key={i} className={`relative flex min-h-28 flex-col items-center rounded-control p-1.5 text-center sm:min-h-36 sm:p-2 ${bar ? 'border border-ink bg-champagne' : 'border-[1.5px] border-dashed border-control-line'}`}>
                {bar ? (
                  <>
                    <ProductArt kind="bar" variant={i} className="hidden h-14 w-14 sm:block" />
                    <span className="t-small line-clamp-2 leading-snug font-bold sm:mt-1.5">{pick(bar.name)}</span>
                    <button
                      type="button"
                      onClick={() => b.removeAt(i)}
                      className="mt-auto inline-flex min-h-12 items-center gap-1 rounded-control px-2 text-brown-2 hover:bg-cream hover:text-error"
                    >
                      <CloseIcon className="h-5 w-5" />
                      <span className="t-small font-bold">
                        {t('common.remove')}
                        <span className="sr-only"> {pick(bar.name)}</span>
                      </span>
                    </button>
                  </>
                ) : (
                  <span className="m-auto text-brown-2">{t('combo.slot', { n: i + 1 })}</span>
                )}
              </li>
            )
          })}
        </ol>
      </div>

      {b.complete && (
        <div className="mt-5 rounded-card border border-line bg-champagne p-4" aria-live="polite">
          <dl className="space-y-1">
            <div className="flex justify-between gap-3">
              <dt>{t('combo.separately')}</dt>
              <dd className="font-bold tabular-nums">{formatINR(b.individual)}</dd>
            </div>
            <div className="flex justify-between gap-3">
              <dt>{t('combo.comboPrice')}</dt>
              <dd className="font-bold tabular-nums">{formatINR(b.combo.price)}</dd>
            </div>
          </dl>
          {b.savings > 0 && <p className="t-price mt-3 border-t border-line pt-3">{t('combo.save', { amount: formatINR(b.savings) })}</p>}
          {b.cheaper && (
            <div className="mt-3 border-t border-line pt-3">
              <p>{t('combo.cheaperHint', { amount: formatINR(b.individual), price: formatINR(b.combo.price) })}</p>
              <Button variant="secondary" fullWidth className="mt-3" onClick={onAddIndividually}>
                {t('combo.addIndividually', { amount: formatINR(b.individual * b.qty) })}
              </Button>
            </div>
          )}
        </div>
      )}

      <ul className="mt-5 divide-y divide-line">
        {b.bars.map((bar, i) => (
          <li key={bar.id} className="flex items-center gap-3 py-2">
            <ProductArt kind="bar" variant={i} className="h-12 w-12 shrink-0" />
            <span className="min-w-0 flex-1">
              <span className="block leading-snug font-bold">{pick(bar.name)}</span>
              <span className="t-small text-brown-2 tabular-nums">
                {formatINR(bar.price)}
                {counts[bar.id] ? ` ${t('combo.inTray', { count: counts[bar.id] })}` : ''}
              </span>
            </span>
            <button
              type="button"
              onClick={() => b.pickBar(bar.id)}
              disabled={b.full}
              className="inline-flex min-h-12 shrink-0 items-center gap-1.5 rounded-control border-[1.5px] border-ink px-3 font-bold transition-colors hover:bg-champagne disabled:cursor-not-allowed disabled:border-control-line disabled:text-brown-2"
            >
              <PlusIcon className="h-5 w-5" />
              <span>
                {t('combo.add')}
                <span className="sr-only"> {pick(bar.name)}</span>
              </span>
            </button>
          </li>
        ))}
      </ul>
    </div>
  )
}

/** Sticky footer: quantity + add */
export function ComboFooter({ b, onAdd }) {
  const { t } = useI18n()
  const total = b.combo.price * b.qty
  return (
    <div>
      <div className="mb-2 flex items-center justify-between gap-3">
        <QuantityStepper value={b.qty} onChange={b.setQty} max={MAX_QTY} />
        <p className="t-price" aria-live="polite">
          {formatINR(total)}
        </p>
      </div>
      {!b.complete && (
        <p className={`t-small mb-2 ${b.showError ? 'font-bold text-error' : 'text-brown-2'}`} role={b.showError ? 'alert' : undefined}>
          {t('combo.pickMore', { count: b.remaining })}
        </p>
      )}
      <Button size="lg" fullWidth onClick={onAdd} aria-disabled={!b.complete || undefined}>
        {t(b.line ? 'customise.save' : 'customise.add', { price: formatINR(total) })}
      </Button>
      <p className="mt-1 text-center">
        <a href={telLink} className="t-small inline-flex min-h-12 items-center text-brown-2 underline underline-offset-4 hover:text-brown">
          {t('customise.call', { phone: site.phone.short })}
        </a>
      </p>
    </div>
  )
}

/** Convenience used by the sheet: wires the builder to the cart */
export function useComboActions(b, onDone, added) {
  const cart = useCart()
  return {
    onAdd: () => {
      const next = b.makeLine()
      if (!next) return
      if (b.line) cart.update(b.line.id, next)
      else cart.add(next)
      onDone()
      added(Boolean(b.line))
    },
    onAddIndividually: () => {
      if (b.line) cart.remove(b.line.id)
      b.makeIndividualLines().forEach((l) => cart.add(l))
      onDone()
      added(false)
    },
  }
}
