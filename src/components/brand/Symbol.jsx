// The gold brand symbol. It references the single inline copy of the artwork
// (#dk-symbol in index.html, built from the unaltered src/assets/symbol.svg), so
// using it anywhere costs no extra bytes.
export const SYMBOL_VIEWBOX = '0 0 220.3 213.0' // same as src/assets/symbol.svg

export default function Symbol({ className = '', label, flat = false, ...props }) {
  return (
    <svg
      viewBox={SYMBOL_VIEWBOX}
      className={className}
      role={label ? 'img' : undefined}
      aria-label={label || undefined}
      aria-hidden={label ? undefined : 'true'}
      focusable="false"
      {...props}
    >
      <use href="#dk-symbol" fill={flat ? 'currentColor' : 'url(#dk-gold)'} />
    </svg>
  )
}
