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
- Two pages: the shop (`index.html`, `src/`) and Hema's admin (`admin/index.html`, `src/admin/`, its own bundle; customers download none of it).
- Server: **Netlify Functions** (`netlify/functions/*.mjs`, each at `/api/<name>`) + **Supabase** (Postgres + Auth + private Storage), reached over REST with the service key. Mock store for local dev and tests (`DK_MOCK_BACKEND=1`, set by `scripts/dev-api.mjs`).
- Email: Resend (or the dev outbox `.dev-data/outbox/`). Payments: on-site UPI (Phase 1, on); Razorpay (Phase 2, built, off until its keys exist).
- Secrets only in Netlify environment variables (`.env.example`, `docs/SETUP-BACKEND.md`). Never in code or chat. `node scripts/check-secrets.mjs` checks every build.
- Git: commit on the working branch; push only when the user says "push"; never merge without being asked.

## Single sources of truth
- **`src/config/shop.js`**: the menu, prices, options, courier rates and tiers, lead times, limits, UPI placeholders. TO CONFIRM marks what Hema hasn't given.
- **`src/lib/pricing.js`**: the one pricing module (unit prices, options, courier zone/tier/charge, Hema's admin overrides and settings, UPI link, UTR). Imported by the website **and** every server function, so totals can never disagree.
- `src/lib/dates.js` (dispatch dates, IST), `src/lib/checkout.js` (customer details), `src/lib/enquiry.js` (class enquiry): shared by site and server too.
- Hema's admin changes live in Supabase (`products` / `settings` override columns, NULL = config) and are applied by `applyOverrides` / `applySettings` on both sides.
- Text: `src/i18n/en.json` + `kn.json` (customer pages, both languages); `netlify/lib/emailText.mjs` (customer emails); admin text is English, in `src/admin`. Business details: `src/config/site.js`. Class page text: `src/data/classInfo.js`.

## The menu (Hema's, exactly; never invent prices, weights, ingredients or claims)
- Brownie Tubs: Ferrero Rocher Nutella, Lotus Biscoff, Red Velvet White Chocolate, Oreo Overload (prices kept from her first menu, TO CONFIRM), Dream Cake Tub ("Price coming soon").
- Delight Boxes 250 g / 500 g / 700 g: Red Velvet, Chocolate, Mango ₹650 / ₹1,250 / ₹1,900; Pista ₹750 / ₹1,500 / ₹2,250. Name on the box free (20 letters, English or Kannada); drawing +₹450 (description + optional reference photo; extra lead time).
- Brownies, 5 pieces: Plain ₹350, Nutty ₹549, Nutella ₹549, Walnut ₹650 (ragi +₹50), Assorted ₹700 (ragi +₹80). Ingredient names only, "Contains" line; ragi gluten status TO CONFIRM.
- Chocolates: Pista Bar ₹450 (250 g shown), Almond Bar ₹150 (no weight).
- Customize page only: Drawing Chocolate Bar ₹950.
- Weights shown only for Delight Box sizes and the Pista Bar (tub sizes are TO CONFIRM).
- Courier (customer pays, one charge per order, highest tier): Small ₹90 Karnataka / ₹100 outside; Large (Delight Box 500 g, 700 g) ₹100 / ₹150. Zone from the pincode (56–59 = Karnataka); a state mismatch warns, the pincode wins.

## Ordering and payment
Cart → Details → Review & courier (dispatch date: lead time in business days, Mon–Sat, IST; drawings
add the extra) → Place order (server re-prices; idempotent) → Pay by UPI (QR / upi:// link / UPI ID,
then the 12-digit UTR, optional screenshot) → Confirmation (works after reload). Hema confirms the
payment in /admin. Track Order works on any device with order ID + phone:
Placed → Payment confirmed → Preparing → Shipped (courier + tracking) → Delivered; Cancelled shown apart.
Order IDs `DK-YYMMDD-XXXX` (IST date + 4 characters, unique in the database).
No WhatsApp ordering anywhere; a plain "Chat on WhatsApp" link only on Contact. Call stays everywhere.

## Brand and look (unchanged)
Black #0F0F0F, gold #C9A227 + gradient (#EBD27A → #D4AF37 → #B8901E), champagne #F3E7CF, cream #FFF9EF,
brown #2A1D16, muted gold #CDBF9E. Gold text only on black. Cinzel for the wordmark only; Cormorant
Garamond headings; Lato body 18px; Noto Kannada fonts on demand. Hema's symbol `src/assets/symbol.svg`
unaltered. Gold line drawings until real photos (`public/products/<slug>.webp`, `scripts/photos.mjs`).
Details and tokens: `docs/DESIGN.md`.

## Simple for everyone (top priority)
- Home = compact hero + 6 photo tiles + short footer. Navigation: Home, Menu, Customize, Classes,
  Contact (tab bar on phones, header on desktop); Track Order, Our Story, FAQ in the footer.
- 3 taps from opening the site to "Add to cart". Product sheet: only the options that product has.
- Phone-first; 48px targets; 16px minimum text (tab labels the one exception, 14–15px); icons with words.
- Forms ask only what is needed; numeric keypads; errors say what is wrong and how to fix it.
- Loading screen: first visit only, ≤ 1 s, tap to skip, none with reduced motion.
- English and ಕನ್ನಡ for every customer text (Hema proofreads `docs/kannada-priority-for-hema.md`).

## Working rules
Ask only if truly blocked. Keep chat replies short. Explain manual steps in plain words. Never put
keys in code or chat. Run `npm test`, `node scripts/check-i18n.mjs` and `node scripts/qa-step6.mjs`
(dev server as described in that file) after changes. Speed budget: first-visit JS ≤ ~66 KB gzip
(`node scripts/bundle-report.mjs`), Lighthouse mobile Performance 90+, the rest 100.

## Build history
Steps 1–5 (Oct 2026): foundation, menu and cart, WhatsApp checkout, classes and pages, launch prep and
speed. Step 6 (5 Oct 2026): Hema's new menu, the simpler site, courier charges, orders and UPI payment
on the website, Supabase + Netlify Functions, the admin. See `docs/PROGRESS.md`.
