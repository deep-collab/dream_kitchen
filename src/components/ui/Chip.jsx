import { CheckIcon } from '../icons'

/**
 * Pill toggle for flavours, occasions and filters. Selection is shown by colour AND a
 * tick, never colour alone. In single-choice groups pass role="radio" (the chip then
 * uses aria-checked); otherwise it is a toggle button with aria-pressed.
 */
export default function Chip({ selected = false, role, children, className = '', ...props }) {
  const state = role === 'radio' ? { role, 'aria-checked': selected } : { 'aria-pressed': selected }
  return (
    <button type="button" className={`chip ${className}`} {...state} {...props}>
      {selected && <CheckIcon className="-ml-1 h-[1.1em] w-[1.1em]" />}
      <span>{children}</span>
    </button>
  )
}
