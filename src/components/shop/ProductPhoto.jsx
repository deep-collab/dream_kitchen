import { useState } from 'react'
import { photos } from '../../data/photos'
import ProductArt from '../art/ProductArt'

/**
 * A product's photo (public/products/<slug>.webp), or its gold line drawing until a real photo
 * exists (src/data/photos.js, written by scripts/photos.mjs). If a photo ever fails to load, the
 * drawing takes its place, so there is never a broken image.
 *   sizes: how wide it shows, for the browser to pick the 600px or 1200px file
 *   eager: for the first images on screen (not lazy)
 */
export default function ProductPhoto({ slug, art, sizes = '(min-width: 1024px) 380px, 50vw', eager = false, rounded = 'rounded-control', className = '', alt = '' }) {
  const [failed, setFailed] = useState(false)
  const v = photos[slug]
  if (!v || failed) return <ProductArt kind={art} rounded={rounded} className={className} label={alt || undefined} />
  const src = (suffix) => `/products/${slug}${suffix}.webp?v=${v}`
  return (
    <img
      src={src('-600')}
      srcSet={`${src('-600')} 600w, ${src('')} 1200w`}
      sizes={sizes}
      width="600"
      height="600"
      alt={alt}
      loading={eager ? 'eager' : 'lazy'}
      decoding="async"
      onError={() => setFailed(true)}
      className={`block bg-ink object-cover ${rounded} ${className}`}
    />
  )
}
