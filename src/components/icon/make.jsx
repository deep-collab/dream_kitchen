// Wraps a lucide icon: one stroke weight for the whole site, decorative (the words beside
// an icon carry the meaning, so every icon is aria-hidden).
export const ICON_STROKE = 1.75

export const make = (Lucide) =>
  function Icon({ className = 'h-6 w-6', ...props }) {
    return <Lucide className={className} strokeWidth={ICON_STROKE} aria-hidden="true" focusable="false" {...props} />
  }
