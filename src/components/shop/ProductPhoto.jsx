import { useContext, useState } from 'react'
import { photos } from '../../data/photos'
import { MenuContext } from '../../context/MenuProvider'
import ProductArt from '../art/ProductArt'

/**
 * A product's photo: the one Hema uploaded in the admin (from /api/menu), else the built-in one
 * (public/products/<slug>.webp, src/data/photos.js, written by scripts/photos.mjs), else its gold
 * line drawing. If a photo ever fails to load, the drawing takes its place, so there is never a
 * broken image.
 *   sizes: how wide it shows, for the browser to pick the 600px or 1200px file
 *   eager: for the first images on screen (not lazy)
 *   photo: a photo Hema chose for this place in particular (a Customize page tile); wins over the product's
 */
export default function ProductPhoto({ slug, art, photo = null, sizes = '(min-width: 1024px) 380px, 50vw', eager = false, rounded = 'rounded-control', className = '', alt = '' }) {
  const [failed, setFailed] = useState(false)
  const productPhoto = useContext(MenuContext)?.menu.productsById[slug]?.photo
  const uploaded = photo || productPhoto
  const v = photos[slug]
  if ((!v && !uploaded) || failed) return <ProductArt kind={art} rounded={rounded} className={className} label={alt || undefined} />
  const src = (suffix) => `/products/${slug}${suffix}.webp?v=${v}`
  const files = uploaded ? { src: uploaded } : { src: src('-600'), srcSet: `${src('-600')} 600w, ${src('')} 1200w`, sizes }
  return (
    <img
      {...files}
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
