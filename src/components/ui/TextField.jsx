import { useId } from 'react'
import { useI18n } from '../../i18n/I18nProvider'
import { AlertIcon } from '../icons'

/**
 * Label + control + hint + error slot, wired for screen readers.
 *   as:     'input' (default) | 'textarea' | 'select' (pass <option>s as children)
 *   prefix: short fixed text inside the field's left edge (e.g. "+91")
 * The error (what is wrong and how to fix it) shows above the hint.
 */
export default function TextField({ id, label, hint, error, optional = false, as = 'input', prefix, className = '', children, ...props }) {
  const { t } = useI18n()
  const autoId = useId()
  const fieldId = id || autoId
  const hintId = hint ? `${fieldId}-hint` : undefined
  const errId = error ? `${fieldId}-error` : undefined
  const describedBy = [errId, hintId].filter(Boolean).join(' ') || undefined
  const Control = as

  const control = (
    <Control
      id={fieldId}
      className={`field-control ${prefix ? 'pl-[3.75rem]' : ''}`}
      aria-invalid={error ? 'true' : undefined}
      aria-describedby={describedBy}
      {...props}
    >
      {children}
    </Control>
  )

  return (
    <div className={className}>
      <label htmlFor={fieldId} className="mb-2 block leading-snug font-bold">
        {label}
        {optional && <span className="t-small ml-2 font-normal text-brown-2">({t('common.optional')})</span>}
      </label>
      {prefix ? (
        <div className="relative">
          <span aria-hidden="true" className="pointer-events-none absolute inset-y-0 left-0 flex w-[3.25rem] items-center justify-center border-r border-line font-bold text-brown-2">
            {prefix}
          </span>
          {control}
        </div>
      ) : (
        control
      )}
      {error && (
        <p id={errId} className="t-small mt-2 flex items-start gap-2 font-bold text-error">
          <AlertIcon className="mt-[0.15em] h-5 w-5 shrink-0" />
          {error}
        </p>
      )}
      {hint && (
        <p id={hintId} className="t-small mt-2 text-brown-2">
          {hint}
        </p>
      )}
    </div>
  )
}

// 10-digit Indian mobile: number keypad, phone autofill, +91 shown as a fixed prefix.
export function PhoneField(props) {
  return <TextField type="tel" inputMode="numeric" autoComplete="tel-national" maxLength={14} placeholder="98765 43210" prefix="+91" {...props} />
}
