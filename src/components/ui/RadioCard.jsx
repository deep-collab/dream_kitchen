import { useId } from 'react'
import { formatINR } from '../../lib/pricing'

/**
 * Large tappable choice showing a label and its price (sizes and weights).
 * A real radio input sits underneath, so arrow keys and screen readers work natively.
 */
export function RadioCard({ name, value, checked, onChange, label, price, detail }) {
  return (
    <label className="relative block cursor-pointer">
      <input type="radio" name={name} value={value} checked={checked} onChange={() => onChange(value)} className="peer sr-only" />
      <span className="flex min-h-16 items-center gap-3 rounded-control border-[1.5px] border-control-line bg-[#fffdf8] px-4 py-3 transition-colors peer-checked:border-ink peer-checked:bg-champagne peer-checked:shadow-[inset_0_0_0_1px_var(--color-ink)] peer-focus-visible:outline-3 peer-focus-visible:outline-offset-3 peer-focus-visible:outline-gold peer-focus-visible:shadow-[0_0_0_3px_var(--color-ink)] hover:border-brown-2">
        <span
          aria-hidden="true"
          className={`grid h-6 w-6 shrink-0 place-items-center rounded-full border-2 ${checked ? 'border-ink' : 'border-control-line'}`}
        >
          {checked && <span className="h-3 w-3 rounded-full bg-ink" />}
        </span>
        <span className="min-w-0 flex-1">
          <span className="block leading-snug font-bold">{label}</span>
          {detail && <span className="t-small block text-brown-2">{detail}</span>}
        </span>
        {price != null && <span className="t-price shrink-0">{formatINR(price)}</span>}
      </span>
    </label>
  )
}

/** Fieldset + legend wrapper. options: [{ value, label, price, detail }] */
export default function RadioCardGroup({ legend, options, value, onChange, columns = 1 }) {
  const name = useId()
  return (
    <fieldset>
      <legend className="mb-3 text-[1.125rem] font-bold">{legend}</legend>
      <div className={`grid gap-3 ${columns === 2 ? 'sm:grid-cols-2' : ''}`}>
        {options.map((o) => (
          <RadioCard key={o.value} name={name} {...o} checked={value === o.value} onChange={onChange} />
        ))}
      </div>
    </fieldset>
  )
}
