// Product photos Hema uploads in the admin come in two sizes, side by side in storage, like the
// built-in ones (scripts/photos.mjs): <product>/<time>-1200.webp (product sheets, big screens) and
// <product>/<time>-600.webp (menu cards on phones). products.photo_url holds the 1200px address;
// the 600px one is worked out from it. Older uploads (one file, <time>.webp) have no 600px partner.
const BIG = /-1200\.(webp|jpg)$/

/** The 600px address of Hema's photo (the same address for an older one-size photo) */
export const smallPhoto = (url) => (BIG.test(url || '') ? url.replace(BIG, '-600.$1') : url)

/** <img> attributes for Hema's photo: both sizes for the browser to choose from, when there are two */
export const uploadedPhotoFiles = (url, sizes) => (BIG.test(url) ? { src: smallPhoto(url), srcSet: `${smallPhoto(url)} 600w, ${url} 1200w`, sizes } : { src: url })
