import { useId } from 'react'

/**
 * On/off switch with its label on the left (the whole row is the 48px+ target).
 * State is shown by position, colour and an "On"/"Off" word for clarity.
 */
export default function Toggle({ label, description, checked, onChange, onText, offText, className = '' }) {
  const id = useId()
  const descId = description ? `${id}-desc` : undefined
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      aria-describedby={descId}
      onClick={() => onChange(!checked)}
      className={`flex min-h-14 w-full items-center gap-4 rounded-control border-[1.5px] px-4 py-2.5 text-left transition-colors ${
        checked ? 'border-ink bg-champagne' : 'border-control-line bg-[#fffdf8] hover:border-brown-2'
      } ${className}`}
    >
      <span className="min-w-0 flex-1">
        <span className="block leading-snug font-bold">{label}</span>
        {description && (
          <span id={descId} className="t-small block text-brown-2">
            {description}
          </span>
        )}
      </span>
      {(onText || offText) && (
        <span className="t-small shrink-0 font-bold text-brown-2" aria-hidden="true">
          {checked ? onText : offText}
        </span>
      )}
      <span aria-hidden="true" className={`relative h-8 w-[3.25rem] shrink-0 rounded-full transition-colors ${checked ? 'bg-ink' : 'bg-control-line'}`}>
        <span
          className={`absolute top-1 left-1 h-6 w-6 rounded-full shadow-[0_1px_2px_rgb(0_0_0/0.3)] transition-transform duration-200 ${
            checked ? 'translate-x-5 bg-gold-light' : 'bg-cream'
          }`}
        />
      </span>
    </button>
  )
}
