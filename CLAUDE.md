# Dream Kitchen — Permanent Website

Read `docs/PROGRESS.md` first in every session. Step 6 (5 Oct 2026, `docs/HEMA-REQUESTS-2026-10-05.md`)
replaced the menu, the ordering and most pages; where an older note (BUILD_BRIEF.md, git history)
disagrees with this file, this file wins.

## Client
Dream Kitchen: home-based handmade brownie tubs, delight boxes, brownies and chocolates, made fresh
to order and sent all over India by courier. Founder: Hema. She started as a student with ₹2,500
and grew it into a loved home brand. She also teaches chocolate classes (details coming).
- Phone: one place only, `PHONE` in `src/config/site.js` (a test fails if the digits appear anywhere else)
- Instagram: @dreamkitchen_01_homemade
- Tagline: "Turning your cravings into sweet memories."
- Customers: mostly on phones, all ages across Karnataka and beyond, including people who are not
  comfortable typing. Keep everything simple, big and plain.

## Stack
- Vite 8 + React components running on **Preact** (preact/compat alias in vite.config.js) + react-router + Tailwind 4.
  Avoid React-only APIs that preact/compat lacks.
- Two pages: the shop (`index.html`, `src/`) and Hema's admin (`admin/index.html`, `src/admin/`, its own bundle; customers download none of it). `/admin/demo` = the same admin on sample data, in the browser only (`src/admin/demo`).
- Every admin action lives in `netlify/lib/adminCore.mjs` (no Node-only code): the `admin` function runs it after the login check (Supabase Auth, `admin_users`, 30 days idle = log in again), and the demo runs it on `netlify/lib/store/memoryCore.mjs`. In the browser build `netlify/lib/env.mjs` is swapped for `src/admin/demo/browserEnv.js` (vite.config.js), so no secret's name reaches a browser.
- Server: **Netlify Functions** (`netlify/functions/*.mjs`, each at `/api/<name>`) + **Supabase** (Postgres + Auth + private Storage), reached over REST with the service key. Mock store for local dev and tests (`DK_MOCK_BACKEND=1`, set by `scripts/dev-api.mjs`).
- Email: Resend (or the dev outbox `<DK_DEV_DATA_DIR>/outbox/`). Templates: `netlify/lib/emailTemplates.mjs`. Payments: **Razorpay is the main way** as soon as its keys exist (orders and class bookings); UPI (Hema checks the UTR) only as the fallback while it isn't; neither = "Online ordering opens soon – WhatsApp us".
- Database setup for the owner: one file, `supabase/setup-all.sql` (`node scripts/setup-sql.mjs`; a test fails if it is stale). Owner's guide: `docs/SETUP-BACKEND.md`; Hema's: `docs/admin-guide-for-hema.md`.
- Secrets only in Netlify environment variables (`.env.example`, `docs/SETUP-BACKEND.md`). Never in code or chat. `node scripts/check-secrets.mjs` checks every build.
- Git: commit on the working branch; push only when the user says "push"; never merge without being asked.
- **Live site: https://luminous-salmiakki-fa7e70.netlify.app** (`site.url` in `src/config/site.js`). Netlify is connected
  to `main`: every push to `main` deploys to the live site (about 2 minutes).

## Single sources of truth
- **`src/config/shop.js`**: the menu, prices, options, courier rates and tiers, lead times, limits, UPI placeholders. TO CONFIRM marks what Hema hasn't given.
- **`src/lib/pricing.js`**: the one pricing module (unit prices, options, courier zone/tier/charge, Hema's admin overrides and settings, UPI link, UTR). Imported by the website **and** every server function, so totals can never disagree.
- `src/lib/dates.js` (dispatch dates, IST), `src/lib/checkout.js` (customer details), `src/lib/enquiry.js` (class enquiry): shared by site and server too.
- Hema's admin changes live in Supabase (`products` / `settings` override columns, NULL = config) and are applied by `applyOverrides` / `applySettings` on both sides.
- Text: `src/i18n/en.json` + `kn.json` (customer pages, both languages); `netlify/lib/emailText.mjs` (customer emails); admin text is English, in `src/admin`. Business details: `src/config/site.js`. Class details (days, slots, the three classes and prices, seats): `src/data/classInfo.js`; booking rules (weekends, seats, booking IDs `DK-CL-YYMMDD-XXXX`): `src/lib/classes.js` + `src/lib/classTimes.js`, shared by site and server.

## The menu (Hema's, exactly; never invent prices, weights, ingredients or claims)
- Brownie Tubs: Ferrero Rocher Nutella, Lotus Biscoff, Red Velvet White Chocolate, Oreo Overload (prices kept from her first menu, TO CONFIRM), Dream Cake Tub ("Price coming soon").
- Delight Boxes 250 g / 500 g / 700 g: Red Velvet, Chocolate, Mango ₹650 / ₹1,250 / ₹1,900; Pista ₹750 / ₹1,500 / ₹2,250. Name on the box free (20 letters, English or Kannada); drawing +₹450 (description + optional reference photo; extra lead time).
- Brownies, 5 pieces: Plain ₹350, Nutty ₹549, Nutella ₹549, Walnut ₹650 (ragi +₹50), Assorted ₹700 (ragi +₹80). Ingredient names only, "Contains" line; ragi gluten status TO CONFIRM.
- Chocolates: Pista Bar ₹450 (250 g shown), Almond Bar ₹150 (no weight).
- Customize page only: Drawing Chocolate Bar ₹950.
- Weights shown only for Delight Box sizes and the Pista Bar (tub sizes are TO CONFIRM).
- Courier (customer pays, one charge per order, the highest rate among its tiers): 250 g ₹90 Karnataka / ₹100 outside; 500–700 g (Delight Box 500 g, 700 g) ₹100 / ₹150; 750 g tubs (TO CONFIRM, defaults to the 500–700 g rate). Zone from the pincode (56–59 = Karnataka); a state mismatch warns, the pincode wins. Hema sets all six rates in admin Settings.

## Ordering and payment
Cart → Details → Review & courier (dispatch date: lead time in business days, Mon–Sat, IST; drawings
add the extra) → Place order (server re-prices; idempotent) → Pay: Razorpay (one button; a closed
window or failed card can simply try again, the same Razorpay order is reused; signature check +
webhook mark it Paid) or, only while Razorpay isn't set up, UPI (QR / upi:// link / UPI ID, then the
12-digit UTR; Hema confirms it in /admin) → Confirmation (works after reload). Track Order works on any device with order ID + phone:
Placed → Payment confirmed → Preparing → Shipped (courier + tracking) → Delivered; Cancelled shown apart.
Order IDs `DK-YYMMDD-XXXX` (IST date + 4 characters, unique in the database).
Classes: Classes → Book now → /classes/book (class → one of the next 8 weekends → slot → details → pay)
→ /classes/booking/DK-CL-YYMMDD-XXXX. Hema blocks weekends/slots and sets fees, times and seats in
admin → Classes. Emails: Hema when an order/booking is paid (or has a UPI reference to check) and for
every website message; the customer (if they gave an email) for the confirmation and every status change.
WhatsApp (Hema, 7 Oct 2026): the home hero's "Order on WhatsApp" (message typed in: `site.whatsappOrderText`),
"Chat on WhatsApp" on Contact, and "Book on WhatsApp" on each class card. While the database isn't connected
(`/api/menu` → `ready: false`, `backendReady` in MenuProvider): Track Order shows "coming soon" + WhatsApp
instead of its form, the class enquiry form is hidden, and the cart and checkout review say "Online ordering
opens soon – order on WhatsApp" with a WhatsApp button carrying the cart (`src/lib/whatsappText.js`).
No Call buttons or tel: links on customer pages; the number is plain text on Contact (Hema's admin keeps
Call / WhatsApp-the-customer). Help texts and emails say "WhatsApp us on {phone}", never "call".

## Brand and look (unchanged)
Black #0F0F0F, gold #C9A227 + gradient (#EBD27A → #D4AF37 → #B8901E), champagne #F3E7CF, cream #FFF9EF,
brown #2A1D16, muted gold #CDBF9E. Gold text only on black. Cinzel for the wordmark only; Cormorant
Garamond headings; Lato body 18px; Noto Kannada fonts on demand. Hema's symbol `src/assets/symbol.svg`
unaltered. Gold line drawings until real photos (`public/products/<slug>.webp`, `scripts/photos.mjs`).
Details and tokens: `docs/DESIGN.md`.

## Simple for everyone (top priority)
- Home = compact hero + 6 photo tiles + a small "hand-drawn chocolates" card (to Customize) + short footer. Navigation: Home, Menu, Customize, Classes,
  Contact (tab bar on phones, header on desktop); Track Order, Our Story, FAQ in the footer.
- 3 taps from opening the site to "Add to cart". Product sheet: only the options that product has.
- Phone-first; 48px targets; 16px minimum text (tab labels the one exception, 14–15px); icons with words.
- Forms ask only what is needed; numeric keypads; errors say what is wrong and how to fix it.
- Loading screen: first visit only, ≤ 1 s, tap to skip, none with reduced motion.
- English and ಕನ್ನಡ for every customer text (Hema proofreads `docs/kannada-priority-for-hema.md`).

## Working rules
Ask only if truly blocked. Keep chat replies short. Explain manual steps in plain words. Never put
keys in code or chat. Run `npm test`, `node scripts/check-i18n.mjs`, `node scripts/qa-step6.mjs` and `node scripts/qa-admin.mjs`
(dev server as described in those files; a fresh `DK_DEV_DATA_DIR` per run is best) and
`node scripts/qa-payments.mjs` (starts its own server) after changes. Speed budget: first-visit JS ≤ ~66 KB gzip
(`node scripts/bundle-report.mjs`), Lighthouse mobile Performance 90+, the rest 100.

## Policy pages (Razorpay)
/terms, /refund, /shipping, /privacy: one page (`src/pages/Policy.jsx`), English text in `src/data/policies.js`
(Hema's refund rules; never add a policy she hasn't agreed to). Linked from every footer with the business
details (`src/components/layout/BusinessDetails.jsx`). Unknown business details are TODO in `src/config/site.js`.
Without JavaScript (Razorpay's check): `scripts/prerender.mjs` writes dist/terms|refund|shipping|privacy|contact|menu.html
at build time (full text, title, footer details, config prices); `src/main.jsx` empties #root before the app renders.

## Build history
Admin complete (10 Oct 2026, branch admin-complete): the full admin, class booking on the site,
Razorpay as the main payment, the demo admin, the setup check, new guides. See `docs/PROGRESS.md`.
Steps 1–5 (Oct 2026): foundation, menu and cart, WhatsApp checkout, classes and pages, launch prep and
speed. Step 6 (5 Oct 2026): Hema's new menu, the simpler site, courier charges, orders and UPI payment
on the website, Supabase + Netlify Functions, the admin. See `docs/PROGRESS.md`.
