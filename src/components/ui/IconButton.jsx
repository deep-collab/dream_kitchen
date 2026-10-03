/**
 * Square 48px control for places where a word does not fit (stepper +/-, sheet close).
 * `label` is required: it is the accessible name, and is shown beside the icon when
 * `showLabel` is set (preferred wherever there is room, because icons pair with words).
 */
export default function IconButton({ icon: Icon, label, showLabel = false, tone = 'light', className = '', type = 'button', ...props }) {
  const palette =
    tone === 'dark'
      ? 'text-cream hover:bg-white/10 border-ink-line'
      : 'text-brown hover:bg-champagne border-control-line'
  return (
    <button
      type={type}
      aria-label={showLabel ? undefined : label}
      className={`inline-flex min-h-12 min-w-12 shrink-0 items-center justify-center gap-2 rounded-control border-[1.5px] font-bold transition-colors disabled:cursor-not-allowed disabled:opacity-40 ${showLabel ? 'px-3.5' : ''} ${palette} ${className}`}
      {...props}
    >
      <Icon className="h-6 w-6" />
      {showLabel && <span className="t-small font-bold">{label}</span>}
    </button>
  )
}
