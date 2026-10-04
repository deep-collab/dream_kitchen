/**
 * A real photo (Hema's certificate, gallery photos; product photos in Stage B).
 *   photo: { src, width, height, srcSet?: [{ src, width }] }
 *     width/height: the photo's own size in pixels. They are always set on the <img>, so the
 *     space is kept while it downloads and nothing on the page jumps.
 *     srcSet: smaller copies (e.g. 400, 800, 1200 wide). The browser picks the one that
 *     fits the screen, so phones never download the big file.
 *   sizes:  how wide it shows, e.g. '(min-width: 1024px) 33vw, 50vw'
 *   eager:  only for a photo near the top of the page; everything else loads when scrolled near
 */
export default function Photo({ photo, alt, sizes = '100vw', eager = false, className = '' }) {
  const srcSet = photo.srcSet?.length ? photo.srcSet.map((s) => `${s.src} ${s.width}w`).join(', ') : undefined
  return (
    <img
      src={photo.src}
      srcSet={srcSet}
      sizes={srcSet ? sizes : undefined}
      width={photo.width}
      height={photo.height}
      alt={alt}
      loading={eager ? 'eager' : 'lazy'}
      decoding="async"
      className={`h-auto max-w-full ${className}`}
    />
  )
}
