import { useEffect, useRef } from 'react'

/**
 * One festival background (or Hema's own picture), faint, behind everything and never in the way:
 * aria-hidden, no pointer events. The drawing code (./themes.js) is fetched only when a festival
 * theme is on. Used site-wide on the cream pages (SiteBackground), on the black home hero (dark),
 * and in the admin's preview.
 *   bg: src/lib/siteConfig.js activeBackground() -> { id, opacity, animate, image }
 */
export default function ThemeLayer({ bg, dark = false, className = '' }) {
  const canvas = useRef(null)
  useEffect(() => {
    if (!bg || bg.id === 'default' || bg.id === 'custom' || !canvas.current) return undefined
    let stop = () => {}
    let cancelled = false
    import('./themes').then(({ startTheme }) => {
      if (!cancelled && canvas.current) stop = startTheme(canvas.current, { id: bg.id, animate: bg.animate, dark })
    })
    return () => {
      cancelled = true
      stop()
    }
  }, [bg?.id, bg?.animate, dark]) // eslint-disable-line react-hooks/exhaustive-deps

  if (!bg || bg.id === 'default') return null
  const style = { opacity: bg.opacity }
  if (bg.id === 'custom')
    return bg.image ? (
      <div aria-hidden="true" className={`pointer-events-none bg-cover bg-center ${className}`} style={{ ...style, backgroundImage: `url("${bg.image}")`, filter: 'saturate(0.7)' }} data-dk-bg="custom" />
    ) : null
  return <canvas ref={canvas} aria-hidden="true" className={`pointer-events-none block ${className}`} style={style} data-dk-bg={bg.id} />
}
