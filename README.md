# Dream Kitchen website

Website for Dream Kitchen, Hema's home kitchen for handmade chocolates, loaded brownie tubs, delight boxes and cookies in Karnataka.
Built with Vite + React components (run on Preact, see below) + react-router + Tailwind CSS. The brief is in `CLAUDE.md`, progress in `docs/PROGRESS.md`, and what must be true before going live in `LAUNCH.md`.

**Status: Stage A (Steps 1–5 done).** Customers order through WhatsApp. Orders and call-back requests are kept only on the customer's phone until Stage B (Supabase) adds the database and Hema's admin panel.

## Run it on your computer

```bash
npm install      # first time only
npm run dev      # then open http://localhost:5173
npm test         # unit tests
npm run build    # production build, saved to /dist (Netlify runs this, see netlify.toml)
```

Checks used in QA (dev server: `npm run dev -- --port 5173`; production: `npm run build && npm run preview -- --port 4173`):

| Check | Command |
|---|---|
| Every string in English and Kannada, none unused, each screen loads its own text | `node scripts/check-i18n.mjs` |
| Launch defaults, language switching mid-order, failed Kannada download (dev) | `node scripts/qa-step5.mjs` |
| Classes switched on: booking flow and all Step 4 checks (dev) | `node scripts/qa-step4.mjs docs/screenshots/step5/classes-on` |
| What each page downloads; English visitors get no Kannada (production) | `node scripts/bundle-report.mjs` |
| Lighthouse mobile on home, menu, product, cart, checkout (production) | `node scripts/lighthouse.mjs after` |
| Kannada list for Hema | `node scripts/kannada-list.mjs` |

## Where things live

| What | File |
|---|---|
| Phone and WhatsApp number (one line: `PHONE`), Instagram, call hours, delivery charge, pre-booking rules, the "Area or city" field, the 90-day date limit, the classes switch, FSSAI, email | `src/config/site.js` |
| Hema's menu (35 products, her words and prices), categories, the 3-bar combo | `src/data/products.js`, `src/data/categories.js`, `src/data/combos.js` |
| Chocolate classes (SAMPLE, switched off) | `src/data/classes.js` |
| Customer reviews (empty: the home section stays hidden until real ones are added) | `src/data/reviews.js` |
| All English text / all Kannada text | `src/i18n/en.json` / `src/i18n/kn.json` |
| Kannada for Hema to check (short list first, the rest after) | `docs/kannada-priority-for-hema.md` |
| Data functions (menu, orders, classes, bookings, call-backs, reviews, gallery) | `src/services/index.js` |
| Design rules | `docs/DESIGN.md` |

### Settings you can change without touching code (`src/config/site.js`)

- `PHONE`: Hema's 10-digit number. Every Call button, WhatsApp link, page text and the Google listing use it. A test fails if the number is typed anywhere else.
- **Unconfirmed details stay empty until Hema confirms them**, and an empty value is hidden everywhere: `hours` (call hours), `delivery.charge`, `email`, `fssai`, `shelfLife`, `classes.certificateImage`. Each has an example in its comment. While the delivery charge is empty, cart and checkout say "Hema confirms it on WhatsApp", the button reads "Send order on WhatsApp ₹399 + delivery", and the WhatsApp order says "Delivery: to be confirmed".
- `classes.enabled`: `false` (now) hides the whole Classes part: page, home section, menu and footer links, the FAQ answer, Our Story's "Teaching others" and the sitemap entry. `true` brings it all back exactly as built in Step 4.
- `ordering.areaField`: `'required'`, `'optional'` or `'off'` for the "Area or city" field at checkout.
- `ordering.maxDaysAhead`: how far ahead a customer may pick a date (90 days now).
- `ordering.closedDates`: Hema's holidays, e.g. `['2026-11-01']`.
- `classes.certificateImage`: Hema's certificate photo, replacing the "Certificate coming soon" note. Put it in `public/` at two sizes (about 600 and 1200 pixels wide) and fill in `{ src, width, height, srcSet }` as shown in the comment there. Width and height stop the page jumping while it loads.

## Needs Hema's confirmation

The full tick-list is `LAUNCH.md`. In short:

1. **Call hours** and the **delivery charge**: empty (hidden) until she confirms them.
2. **FSSAI licence number**, **shelf life**, **email**: empty, so hidden.
3. **Final web address**: `dreamkitchen.netlify.app` is a placeholder in `site.url` (sitemap, robots.txt, Google).
4. **Classes**: switched off. Every class in `src/data/classes.js` is a sample (titles, prices, lengths and group sizes from the brief; "What you'll learn", days, times and seats written for the demo). To launch them: her real classes, how they are paid (the booking message asks Hema for "the payment details"), the 1-day booking cut-off and the 6-seat limit, then `classes.enabled: true`.
5. **Certificate**: send the photo once she has it.
6. **Kannada**: the first table of `docs/kannada-priority-for-hema.md` (54 lines customers act on), then the rest when she can.
7. **Our Story** uses only the facts in the brief. Hema's own words would make it much better.
8. **FAQ**: "Can I change my order?" says only "call or WhatsApp Hema as soon as you can". Add her real policy if she has one.
9. **Reviews** and **Gallery photos**: none yet; never invented.

## How ordering works now (Stage A)

- Pre-booking only. Every order is dispatched after 2 business days (Monday to Saturday), worked out in Indian time whatever the phone's clock says.
- Karnataka pincodes only (56, 57, 58, 59). Flat delivery charge once Hema confirms it.
- Checkout makes an order ID like `DK-261005-7Q4M`: the date the order is **placed** (Indian time), then 4 random characters. It then opens WhatsApp with the full order in English. Payment is by UPI, shared by Hema on WhatsApp.
- **Class booking IDs** are `CL-YYMMDD-XXXX` (e.g. `CL-261005-7Q4M`), not the brief's CL-0001, for the same reason as orders: nothing is stored centrally yet, so a counter on each phone would give every phone CL-0001. Stage B switches both to database numbers.
- If the phone blocks WhatsApp from opening, the site says "One more step" and shows an Open WhatsApp button. It never claims something was sent when it wasn't.
- Track Order finds orders placed on the same phone (status "Received"). Stage B adds real tracking.

## Speed (Step 5)

- Every page is its own small download; the menu data, the customise sheet and each screen's English text load with the screens that use them.
- All Kannada (words and menu names) is one file, fetched only when someone chooses ಕನ್ನಡ. English visitors never download it. The only Kannada they get is the word ಕನ್ನಡ on the language button and the tagline on the loading screen.
- The site runs on **Preact** (an ~8 KB React-compatible library) instead of React (~63 KB), through an alias in `vite.config.js`; components are written as React components. `react` stays in `package.json` only because react-router and the build plugin list it as a peer.
- Result: a first visit downloads 45–66 KB of JavaScript in English (was 149 KB) and 59–79 KB in Kannada.

## Phases

1. Stage A, Steps 1–5 ✅: design, menu, cart, checkout, WhatsApp ordering, call-backs, Track Order, classes (off until Hema's are ready), all pages, English and Kannada, speed and launch prep
2. Stage B: Supabase database, Hema's admin panel, real tracking and order numbers
