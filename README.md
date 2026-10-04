# Dream Kitchen website

Website for Dream Kitchen, Hema's home kitchen for handmade chocolates, loaded brownie tubs, delight boxes and cookies in Karnataka.
Built with Vite + React + react-router + Tailwind CSS. The brief is in `CLAUDE.md`; progress is in `docs/PROGRESS.md`.

**Status: Stage A (Steps 1–4 of 5 done).** Customers order and book classes through WhatsApp. Orders, bookings and call-back requests are kept only on the customer's phone until Stage B (Supabase) adds the database and Hema's admin panel.

## Run it on your computer

```bash
npm install      # first time only
npm run dev      # then open http://localhost:5173
npm test         # unit tests
npm run build    # production build, saved to /dist
```

Checks used in QA: `node scripts/check-i18n.mjs` (every string in English and Kannada, none unused) and `node scripts/qa-step4.mjs` (needs `npm run dev -- --port 5173`; screenshots and report in `docs/screenshots/step4`).

## Where things live

| What | File |
|---|---|
| Phone and WhatsApp number (one line: `PHONE`), Instagram, call hours, delivery charge, pre-booking rules, the "Area or city" field, the 90-day date limit, class settings, FSSAI, email | `src/config/site.js` |
| Hema's menu (35 products, her words and prices), categories, the 3-bar combo | `src/data/products.js`, `src/data/categories.js`, `src/data/combos.js` |
| Chocolate classes (SAMPLE) | `src/data/classes.js` |
| Customer reviews (empty: the home section stays hidden until real ones are added) | `src/data/reviews.js` |
| All English text / all Kannada text | `src/i18n/en.json` / `src/i18n/kn.json` |
| Kannada list for Hema to proofread | `docs/kannada-for-hema.md` (rebuild: `node scripts/kannada-list.mjs`) |
| Data functions (menu, orders, classes, bookings, call-backs, reviews, gallery) | `src/services/index.js` |
| Design rules | `docs/DESIGN.md` |

### Settings you can change without touching code (`src/config/site.js`)

- `PHONE`: Hema's 10-digit number. Every Call button, WhatsApp link, page text and the Google listing use it. A test fails if the number is typed anywhere else.
- `ordering.areaField`: `'required'`, `'optional'` or `'off'` for the "Area or city" field at checkout.
- `ordering.maxDaysAhead`: how far ahead a customer may pick a date (90 days now).
- `ordering.closedDates`: Hema's holidays, e.g. `['2026-11-01']`.
- `classes.certificateImage`: put a photo in `public/` and its path here (e.g. `'/certificate.jpg'`) to replace the "Certificate coming soon" note.

## Needs Hema's confirmation

Placeholders in `src/config/site.js` (shown on the site only once filled, except where noted):

1. **Call hours**: "10 am – 8 pm, Monday to Saturday" is a placeholder and is shown now.
2. **Delivery charge**: ₹50 flat across Karnataka is a placeholder and is used in every order total.
3. **FSSAI licence number**, **shelf life**, **email**: empty, so hidden.
4. **Final web address**: `dreamkitchen.netlify.app` is a placeholder (Step 5 sets canonical and Open Graph links).

Classes (`src/data/classes.js`: all marked `sample: true`):

5. **Every class is a sample.** The four titles, prices, lengths and group sizes come from the brief. The "What you'll learn" points, the weekly day and time (Saturday or Sunday, 11 am / 4 pm / 5 pm), and the seat counts were written for the demo. **Before launch, replace them with Hema's real classes or hide the Classes page.** Otherwise customers can book a date that doesn't exist.
6. **How classes are paid.** The booking message says "Please confirm my seats and share the payment details", and the page says Hema replies with payment details and the address (or a joining link for online). Please confirm that this is how she wants it.
7. **Booking closes** 1 day before a class, and one booking can take up to 6 seats (`site.classes`). Please confirm both.
8. **Certificate**: send the photo once she has it.

Words:

9. **All Kannada** needs proofreading: `docs/kannada-for-hema.md` (Part 1 is new in Steps 3–4; Part 2 is earlier text).
10. **Our Story** uses only the facts in the brief (student, ₹2,500, loved home brand, handmade, fresh to order, classes, certification). Hema's own words would make it much better.
11. **FAQ**: "Can I change my order?" says only "call or WhatsApp Hema as soon as you can". Add her real policy if she has one. The name-on-box answer lists the products that offer it today; update it if that changes.
12. **Reviews**: none are shown. Add real ones (with the customer's permission) to `src/data/reviews.js`.
13. **Gallery**: no photos yet. It points to Instagram until Hema uploads photos (Stage B).

## How ordering works now (Stage A)

- Pre-booking only. Every order is dispatched after 2 business days (Monday to Saturday), worked out in Indian time whatever the phone's clock says.
- Karnataka pincodes only (56, 57, 58, 59), flat delivery charge.
- Checkout makes an order ID like `DK-261005-7Q4M`: the date the order is **placed** (Indian time), then 4 random characters. It then opens WhatsApp with the full order in English. Payment is by UPI, shared by Hema on WhatsApp.
- Class bookings work the same way with `CL-…` IDs.
- If the phone blocks WhatsApp from opening, the site says "One more step" and shows an Open WhatsApp button. It never claims something was sent when it wasn't.
- Track Order finds orders placed on the same phone (status "Received"). Stage B adds real tracking.

## Phases

1. Stage A, Steps 1–4 ✅: design, menu, cart, checkout, WhatsApp ordering, call-backs, Track Order, classes, all pages, English and Kannada
2. Step 5: full QA, performance, SEO, polish
3. Stage B: Supabase database, Hema's admin panel, real tracking; Netlify deploy (`public/_redirects` already handles page refreshes)
