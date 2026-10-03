import { forwardRef, useId } from 'react'
import { AlertIcon, CheckIcon } from '../icons'

/**
 * Required single choice shown as chips (flavours). Real radio inputs underneath,
 * so arrow keys and screen readers behave natively. Nothing is preselected.
 * options: [{ value, label }]
 */
const ChipRadioGroup = forwardRef(function ChipRadioGroup({ legend, hint, options, value, onChange, error }, ref) {
  const name = useId()
  const errId = `${name}-err`
  return (
    <fieldset ref={ref} tabIndex={-1} aria-describedby={error ? errId : undefined} className="scroll-mt-28 outline-none">
      <legend className="mb-1 text-[1.125rem] font-bold">{legend}</legend>
      {hint && <p className="t-small mb-3 text-brown-2">{hint}</p>}
      {error && (
        <p id={errId} className="t-small mb-3 flex items-center gap-2 font-bold text-error">
          <AlertIcon className="h-5 w-5 shrink-0" />
          {error}
        </p>
      )}
      <div className={`flex flex-wrap gap-2 ${error ? 'rounded-control outline-2 outline-offset-4 outline-error outline-dashed' : ''}`}>
        {options.map((o) => {
          const checked = value === o.value
          return (
            <label key={o.value} className="relative cursor-pointer">
              <input type="radio" name={name} value={o.value} checked={checked} onChange={() => onChange(o.value)} className="peer sr-only" />
              <span
                className={`chip peer-focus-visible:shadow-[0_0_0_3px_var(--color-ink)] peer-focus-visible:outline-3 peer-focus-visible:outline-offset-3 peer-focus-visible:outline-gold ${
                  checked ? 'is-selected' : ''
                }`}
              >
                {checked && <CheckIcon className="-ml-1" />}
                <span>{o.label}</span>
              </span>
            </label>
          )
        })}
      </div>
    </fieldset>
  )
})

export default ChipRadioGroup
