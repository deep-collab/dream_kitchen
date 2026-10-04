import { useI18n } from '../../i18n/I18nProvider'
import { useCart } from '../../context/CartProvider'
import { formatINR, lineTotal } from '../../lib/pricing'
import { lineChoices } from '../../lib/lineText'
import ProductArt from '../art/ProductArt'
import { useToast } from '../ui/Toast'
import LineStatus from './LineStatus'
import { TrashIcon } from '../icons'
import 'virtual:dk-strings/customise'

/**
 * Checkout's compact list of cart lines: every choice, quantity × price, line
 * total, and what changed since it was added. An unavailable line gets its own
 * one-tap Remove (with Undo).
 */
export default function SummaryLines({ lines }) {
  const { t, pick } = useI18n()
  const cart = useCart()
  const toast = useToast()

  const onRemove = (line) => {
    const undo = cart.remove(line.id)
    toast.show({ message: t('cart.removed', { name: pick(line.name) }), action: { label: t('cart.undo'), onClick: undo } })
  }

  return (
    <ul className="divide-y divide-line border-y border-line">
      {lines.map((line) => {
        const name = pick(line.name)
        const choices = lineChoices(line, { t, pick })
        return (
          <li key={line.id} className={`flex gap-3 py-4 ${line.unavailable ? 'opacity-90' : ''}`}>
            <ProductArt kind={line.image} className={`h-14 w-14 shrink-0 ${line.unavailable ? 'grayscale' : ''}`} />
            <div className="min-w-0 flex-1">
              <div className="flex items-start justify-between gap-3">
                <p className="min-w-0 leading-snug font-bold">{name}</p>
                {!line.unavailable && <p className="shrink-0 font-bold tabular-nums">{formatINR(lineTotal(line))}</p>}
              </div>
              <p className="t-small text-brown-2 tabular-nums">{t('customise.totalFor', { qty: line.qty, unit: formatINR(line.unitPrice) })}</p>
              {choices.length > 0 && (
                <dl className="t-small mt-1 grid grid-cols-[auto_1fr] gap-x-2.5">
                  {choices.map((ch) => (
                    <div key={ch.key} className="contents">
                      <dt className="text-brown-2">{ch.label}</dt>
                      <dd className="min-w-0 break-words">{ch.value}</dd>
                    </div>
                  ))}
                </dl>
              )}
              <LineStatus line={line} className="mt-2" />
              {line.unavailable && (
                <button
                  type="button"
                  onClick={() => onRemove(line)}
                  className="mt-2 inline-flex min-h-12 items-center gap-1.5 rounded-control border-[1.5px] border-brown px-3 font-bold hover:bg-champagne"
                >
                  <TrashIcon className="h-5 w-5" />
                  <span>
                    {t('common.remove')}
                    <span className="sr-only"> {name}</span>
                  </span>
                </button>
              )}
            </div>
          </li>
        )
      })}
    </ul>
  )
}
