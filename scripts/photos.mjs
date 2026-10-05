/*
  Product photos: drop JPG, PNG or WebP files into photos-incoming/, named after the product
  (e.g. pista-bar.jpg, red-velvet-delight-box.png; the list is printed if a name is unknown),
  then run:   node scripts/photos.mjs
  Each photo is centre-cropped to a square and saved as
    public/products/<slug>.webp      1200 × 1200 (sheets, big screens)
    public/products/<slug>-600.webp   600 × 600 (cards on phones)
  and src/data/photos.js is updated, so the site shows it instead of the gold drawing.
  The original is moved to photos-incoming/done/. Commit public/products and src/data/photos.js.
  Remove a photo: delete its two files and run the script again (the list is rebuilt from the folder).
*/
import { createHash } from 'node:crypto'
import { existsSync, mkdirSync, readdirSync, readFileSync, renameSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'
import sharp from 'sharp'
import { products } from '../src/config/shop.js'

const IN = 'photos-incoming'
const OUT = 'public/products'
// Every photo slot: each product, plus the Classes tile on the home page
export const SLOTS = [...products.map((p) => p.id), 'classes']

mkdirSync(IN, { recursive: true })
mkdirSync(OUT, { recursive: true })
mkdirSync(join(IN, 'done'), { recursive: true })

let converted = 0
const unknown = []
for (const file of readdirSync(IN).filter((f) => /\.(jpe?g|png|webp)$/i.test(f))) {
  const slug = file.replace(/\.[^.]+$/, '').toLowerCase().trim()
  if (!SLOTS.includes(slug)) {
    unknown.push(file)
    continue
  }
  const input = readFileSync(join(IN, file))
  const square = (size) => sharp(input).rotate().resize(size, size, { fit: 'cover', position: 'attention' }).webp({ quality: 82, effort: 5 })
  await square(1200).toFile(join(OUT, `${slug}.webp`))
  await square(600).toFile(join(OUT, `${slug}-600.webp`))
  renameSync(join(IN, file), join(IN, 'done', file))
  converted++
  console.log(`✓ ${file} -> ${OUT}/${slug}.webp + ${slug}-600.webp`)
}

// The manifest: only slugs with both files, with a short version from the big file's content
const photos = {}
for (const slug of SLOTS) {
  const big = join(OUT, `${slug}.webp`)
  if (existsSync(big) && existsSync(join(OUT, `${slug}-600.webp`))) photos[slug] = createHash('sha256').update(readFileSync(big)).digest('hex').slice(0, 8)
}
writeFileSync(
  'src/data/photos.js',
  `// Which product photos exist in public/products/ (<slug>.webp 1200px + <slug>-600.webp), with a
// version that changes whenever a photo is replaced. Written by scripts/photos.mjs; do not edit
// by hand. A slug missing here shows its gold line drawing instead, so no image is ever broken.
export const photos = ${JSON.stringify(photos, null, 2)}
`,
)

console.log(`\n${converted} photo(s) converted. ${Object.keys(photos).length} of ${SLOTS.length} products have a photo.`)
if (unknown.length) {
  console.log(`\nNot used (the file name must be one of these):\n  ${SLOTS.join('\n  ')}\nUnknown: ${unknown.join(', ')}`)
  process.exitCode = 1
}
