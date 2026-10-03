import { cloneElement } from 'react'
import { useI18n } from '../i18n/I18nProvider'

// Label + input + hint + inline error, wired up for screen readers
export default function Field({ id, label, hint, error, optional, children }) {
  const { t } = useI18n()
  const hintId = hint ? `${id}-hint` : undefined
  const errId = error ? `${id}-error` : undefined
  const describedBy = [hintId, errId].filter(Boolean).join(' ') || undefined
  return (
    <div>
      <label htmlFor={id} className="mb-1.5 block font-bold text-deep">
        {label}
        {optional && <span className="ml-1.5 text-sm font-semibold text-brown">({t('common.optional')})</span>}
      </label>
      {cloneElement(children, { id, 'aria-invalid': error ? 'true' : undefined, 'aria-describedby': describedBy })}
      {hint && !error && (
        <p id={hintId} className="mt-1.5 text-sm text-brown">
          {hint}
        </p>
      )}
      {error && (
        <p id={errId} className="mt-1.5 text-sm font-bold text-rose">
          {error}
        </p>
      )}
    </div>
  )
}
