# Photos waiting to be converted

Put product photos here (JPG, PNG or WebP), named after the product, for example:

    pista-bar.jpg
    red-velvet-delight-box.png
    classes.jpg              (the Classes tile on the home page)

Then run `node scripts/photos.mjs`. It makes the two sizes the site uses in `public/products/`,
updates `src/data/photos.js`, and moves the original to `photos-incoming/done/` (not committed).
The full list of names, and an AI prompt for each photo, is in `docs/photo-prompts.md`.
