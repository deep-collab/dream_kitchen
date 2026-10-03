// Gold count pill on black surfaces. Re-keyed on change so it pops when items are added.
export default function CartCount({ count, className = '' }) {
  if (!count) return null
  return (
    <span
      key={count}
      aria-hidden="true"
      className={`pop inline-grid h-6 min-w-6 place-items-center rounded-full bg-gold-mid px-1.5 text-base leading-none font-bold text-ink tabular-nums ${className}`}
    >
      {count > 99 ? '99+' : count}
    </span>
  )
}
