import { useContext, useState } from 'react'
import { photos } from '../../data/photos'
import { MenuContext } from '../../context/MenuProvider'
import { uploadedPhotoFiles } from '../../lib/productPhoto'
import ProductArt from '../art/ProductArt'

/**
 * A product's photo: the one Hema uploaded in the admin (from /api/menu, 600px + 1200px), else the
 * built-in one (public/products/<slug>.webp, src/data/photos.js, written by scripts/photos.mjs), else
 * its gold line drawing. If a photo ever fails to load, the next one in that list takes its place,
 * so there is never a broken image.
 *   sizes: how wide it shows, for the browser to pick the 600px or 1200px file
 *   eager: for the first images on screen (not lazy)
 */
export default function ProductPhoto({ slug, art, sizes = '(min-width: 1024px) 380px, 50vw', eager = false, rounded = 'rounded-control', className = '', alt = '' }) {
  const [failed, setFailed] = useState({}) // { [Hema's photo address]: true, builtIn: true }
  const uploaded = useContext(MenuContext)?.menu.productsById[slug]?.photo
  const v = photos[slug]
  const useUploaded = uploaded && !failed[uploaded]
  if (!useUploaded && (!v || failed.builtIn)) return <ProductArt kind={art} rounded={rounded} className={className} label={alt || undefined} />
  const src = (suffix) => `/products/${slug}${suffix}.webp?v=${v}`
  const files = useUploaded ? uploadedPhotoFiles(uploaded, sizes) : { src: src('-600'), srcSet: `${src('-600')} 600w, ${src('')} 1200w`, sizes }
  return (
    <img
      key={files.src}
      {...files}
      width="600"
      height="600"
      alt={alt}
      loading={eager ? 'eager' : 'lazy'}
      decoding="async"
      onError={() => setFailed((f) => ({ ...f, [useUploaded ? uploaded : 'builtIn']: true }))}
      className={`block bg-ink object-cover ${rounded} ${className}`}
    />
  )
}
