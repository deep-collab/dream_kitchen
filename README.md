# Dream Kitchen website

Website for Dream Kitchen, Hema's home kitchen for handmade chocolates and brownies in Karnataka.
Built with Vite + React + react-router + Tailwind CSS. The project brief is in `CLAUDE.md`.

**Status: Phase 1 (front-end sample).** Customers order through WhatsApp. Products and orders are sample data for now.

## Run it on your computer

```bash
npm install      # first time only
npm run dev      # then open http://localhost:5173
npm run build    # production build, saved to /dist
```

## Where things live

| What | File |
|---|---|
| WhatsApp number, email, FSSAI, shelf life, delivery charge, order rules, social links | `src/config/site.js` |
| Products and categories (SAMPLE) | `src/data/products.js` |
| Demo orders for Track Order (SAMPLE) | `src/data/mockOrders.js` |
| All English text | `src/i18n/en.json` |
| All Kannada text | `src/i18n/kn.json` |
| Data functions (getProducts, getProduct, createOrder, getOrderStatus, createEnquiry) | `src/services/index.js` |
| Logo, favicon, product drawings, doodle background | `public/` |
| Script that redraws the product, hero and doodle drawings | `scripts/make-art.mjs` (`node scripts/make-art.mjs`) |

## Things to replace before going live

1. **`src/config/site.js`**: the WhatsApp number (`9XXXXXXXXX`), email, FSSAI number and shelf life (`XX days`). Also check the delivery charge (Rs 50 is a sample value).
2. **Products**: the 14 products, prices and descriptions are invented samples. Swap in Hema's real menu and photos.
3. **Copy**: several lines were written for the sample and need Hema to confirm them, such as "no preservatives", "no compound chocolate", the 10 am–8 pm WhatsApp hours and which items are eggless.
4. **Domain**: `dreamkitchen.netlify.app` is a placeholder in `site.js`, `public/robots.txt` and `public/sitemap.xml`.

## Kannada text: needs proofreading

Every Kannada string (`src/i18n/kn.json` and the `kn` fields in `src/data/products.js`) was written for this sample.
**Hema or another native speaker must proofread it before launch.**

## Ordering rules (from `site.js`)

- Minimum order: 1 piece. The cart is saved in the browser.
- More than 6 pieces in total: the delivery date must be at least 2 days ahead. A friendly notice appears in the cart and at checkout.
- Normal orders: the earliest delivery date is tomorrow (`standardMinDaysAhead`, a sample value you can change).
- Karnataka pincodes only (they start with 56, 57, 58 or 59). Flat delivery charge.
- On checkout the site creates an order ID (DK-0001, DK-0002 …) and opens WhatsApp with the full order filled in. Payment is by UPI, shared by Hema on WhatsApp.
- Phase 1 numbers orders separately in each browser. Phase 2 (Supabase) gives every order a shared, unique number.

## Track Order demo

Order IDs placed from this browser can be tracked straight away (their status is "Received").
Demo IDs: `DK-0101` and `DK-0102`, both with phone `9876543210`.

## Logo

`public/logo.png` and `public/logo-sm.png` were cropped from `logo-source.jpg` (a phone photo), straightened, and lightly cleaned up to reduce glare.
The source photo is fairly low resolution (about 600 px across the sticker), so the edges are slightly soft.
For the sharpest result, ask the designer for the original logo file (PNG or SVG) and replace these two files.

## Phases

1. ✅ Front-end, design, languages, cart, WhatsApp checkout, mock tracking
2. Supabase: database, admin login, real orders and tracking
3. Netlify deploy from GitHub (`public/_redirects` already handles page refreshes)
