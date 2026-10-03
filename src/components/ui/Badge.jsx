/**
 * Small label for badges Hema actually uses (Signature, Top selling) and states such
 * as Sold out. Text never goes below 16px.
 *   tone: 'gold' (ink with gold text: her badges) | 'soft' (champagne) | 'dark' (ink with cream)
 */
const TONES = {
  gold: 'bg-ink text-gold-light',
  soft: 'bg-champagne text-brown border border-line',
  dark: 'bg-ink text-cream',
}

export default function Badge({ tone = 'gold', icon: Icon, children, className = '' }) {
  return (
    <span className={`t-small inline-flex items-center gap-1.5 rounded-inline px-2.5 py-0.5 font-bold ${TONES[tone]} ${className}`}>
      {Icon && <Icon className="h-4 w-4" />}
      {children}
    </span>
  )
}
