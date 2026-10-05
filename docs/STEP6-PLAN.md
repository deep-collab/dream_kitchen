# Step 6 plan: Hema's requests of 5 Oct 2026

Brief: `docs/HEMA-REQUESTS-2026-10-05.md`. This plan was written before any code changed (Phase 0).
"TO CONFIRM" = waiting for Hema; it is always a clearly marked value in config, never a guess shown as fact.

---

## (a) Every current product: keep, change or remove

Old = Step 5 menu (35 products + 1 combo). New = Hema's diary, voice notes and confirmations.

### Brownie Tubs
| Old product | Old price (250 g / 500 g / 750 g) | Decision | New |
|---|---|---|---|
| Ferrero Rocher Nutella | ₹549 / ₹999 / ₹1,499 | **Change**: renamed "Ferrero Rocher Nutella Tub" | Prices kept from her first menu, **flagged TO CONFIRM** |
| Lotus Biscoff Bliss | ₹449 / ₹799 / ₹1,149 | **Change**: renamed "Lotus Biscoff Tub" | Kept, TO CONFIRM |
| Red Velvet White Chocolate | ₹449 / ₹799 / ₹1,149 | **Change**: renamed "Red Velvet White Chocolate Tub" | Kept, TO CONFIRM |
| Oreo Overload | ₹399 / ₹699 / ₹999 | **Change**: renamed "Oreo Overload Tub" | Kept, TO CONFIRM |
| Nutty Caramel Crunch | ₹429 / ₹749 / ₹1,049 | **Remove** (not on the new list) | — |
| (new) Dream Cake Tub | — | **Add** | No price: "Price coming soon", Add to cart off. Turned on from config or admin |

Why the four old prices stay: the brief says to keep tub prices that came from Hema and flag them. They came from her first menu (BUILD_BRIEF.md). Each tub has `priceStatus` in config: `'live'` shows prices, `'coming-soon'` hides them and turns off Add to cart. Changing it is a config edit (or an admin price entry), not code.
Conflict to flag: the old tub sizes are weights (250 g / 500 g / 750 g), and the new rule says weights are shown only for Delight Boxes and the Pista Bar. Tub sizes are TO CONFIRM anyway, so the old size names stay with the old prices and are on the TO CONFIRM list.

### Delight Boxes (the old 9 become 4, with new prices)
| Old product | Old price | Decision | New price (250 g / 500 g / 700 g) |
|---|---|---|---|
| Red Velvet Delight (250 g) | ₹950 | **Change** → Red Velvet Delight Box | ₹650 / ₹1,250 / ₹1,900 |
| Chocolate Delight (500/700 g) | ₹950 / ₹1,100 | **Change** → Chocolate Delight Box | ₹650 / ₹1,250 / ₹1,900 |
| Mango Delight (500/700 g) | ₹950 / ₹1,100 | **Change** → Mango Delight Box | ₹650 / ₹1,250 / ₹1,900 |
| Pista Delight (250 g) | ₹950 | **Change** → Pista Delight Box | ₹750 / ₹1,500 / ₹2,250 |
| Dreamy Biscoff Delight (4 flavours) | ₹550 | **Remove** | — |
| Strawberry Red Velvet Delight | ₹950 / ₹1,100 | **Remove** | — |
| Butterscotch Delight | ₹950 / ₹1,100 | **Remove** ("Butter" crossed out in her diary) | — |
| Red Velvet Premium Delight | ₹1,800 / ₹2,100 | **Remove** (merged into Red Velvet Delight Box) | — |
| Pista Premium Delight | ₹1,800 / ₹2,400 | **Remove** (merged into Pista Delight Box) | — |

Options on all four: Name on the box (free, 20 characters, English or Kannada) and Add a drawing (+₹450, description up to 200 characters, optional reference photo). The old "Name on box +₹100" is gone.

### Brownies (new category; 5 pieces per box)
| Product | Price | Ragi version |
|---|---|---|
| Plain Brownies | ₹350 | +₹50 → ₹400 |
| Nutty Brownies | ₹549 | +₹50 → ₹599 |
| Nutella Brownies | ₹549 | +₹50 → ₹599 |
| Walnut Brownies | ₹650 | +₹50 → ₹700 |
| Assorted Brownies | ₹700 | +₹80 → ₹780 |
Ingredients (names only): maida, dark chocolate, butter, cocoa powder, powdered sugar, eggs, essence, plus the topping. Ragi uses ragi flour instead of maida. "Contains: egg, dairy, gluten, nuts where used." Ragi gluten status: TO CONFIRM.

### Chocolates
| Old product | Old price | Decision | New |
|---|---|---|---|
| Colour Blast Bar (9 flavours) | ₹150 | **Remove** | — |
| Dark / Milk Chocolate bars | ₹150 each | **Remove** | — |
| White / Strawberry Dark / Orange Milk Chocolate bars | ₹200 each | **Remove** | — |
| Cranberry White / Hazelnut Dark / Almond Milk Chocolate bars | ₹250 each | **Remove** | — |
| Walnut White Chocolate bar | ₹300 | **Remove** | — |
| Coconut Bar | ₹280 | **Remove** | — |
| Classic Favourites ×7 (Dark, Milk, White, Caramel Delight, Assortment, Dry Fruits, Triple Layer) | ₹250–₹1,400 by weight | **Remove** | — |
| Bars combo "pick any 3 for ₹699" | ₹699 | **Remove completely** (offer, builder, home teaser) | — |
| (new) Pista Bar | — | **Add** | ₹450, shown as "250 g" |
| (new) Almond Bar | — | **Add** | ₹150, no weight shown |

### Cookies (whole category removed)
| Old product | Old price | Decision |
|---|---|---|
| Assorted Cookie Dip Box | ₹349 / ₹599 / ₹849 | **Remove** |
| Cookie Pie Tin | ₹950 / ₹1,100 | **Remove** |
| Cookie Pie Box | ₹250 | **Remove** |

### Customize (new page, not in the main menu)
| Product | Price |
|---|---|
| Drawing Chocolate Bar | ₹950 (drawing description + optional reference photo) |

Removed with the menu: occasions chips, per-item notes, flavour chips, the badges (Signature, Top selling, Our best sellers), "What you get" panel, the search box.
Old product addresses redirect: kept products → their new card on `/menu`; removed ones → their category (`public/_redirects`, 301).

---

## (b) Every page and section

| Page / section | Decision | Notes |
|---|---|---|
| Loading screen | **Simplify** | 1 s max, first visit ever only (not every session), tap to skip, none with reduced motion |
| Header | **Simplify** | Logo, language, Call, Cart icon with count. Desktop (≥1024px) adds the 5 nav items |
| Hamburger menu (MobileMenu) | **Remove** | Replaced by a 5-item bottom tab bar on phones/tablets |
| Pre-booking strip under the header | **Remove** | Dispatch info moves to the sheet, cart and checkout. Its place is taken by Hema's optional announcement / "store closed" banner (admin setting) |
| Mobile bottom bar (Call / WhatsApp / Cart) | **Change** | Becomes the tab bar: Home, Menu, Customize, Classes, Contact (WhatsApp order links removed) |
| Footer | **Simplify** | Call, Track Order, Our Story, FAQ, Contact, language toggle, © line |
| Home: hero | **Simplify** | Logo + tagline + one "Order now", ≤ 60% of a 390px screen. "Call to order" button and support paragraph go |
| Home: category tiles | **Change** | 6 big photo tiles (Tubs, Delight Boxes, Brownies, Chocolates, Customize, Classes), 2/3/3×2 per row |
| Home: best sellers | **Remove** | Badges and "Our best sellers" group are gone with the old menu |
| Home: Brownie Tub spotlight ("What you get", slogan) | **Remove** | Hema's words; kept in git history |
| Home: combo teaser | **Remove** | Offer removed |
| Home: classes teaser | **Remove** | Classes has its own tile and page |
| Home: story teaser | **Move** → Our Story (already there) | |
| Home: reviews | **Remove** | Never had real reviews |
| Home: call band (Call, WhatsApp, call back, voice) | **Remove** | Call stays in the header and footer; WhatsApp only on Contact |
| Home: Instagram band | **Move** → Our Story | |
| Shop `/shop` | **Replace** → Menu `/menu` | Sticky tabs (Tubs, Delight Boxes, Brownies, Chocolates) + scroll-spy, compact 2-per-row cards. `/shop` redirects |
| Product page `/product/:slug` | **Remove** | Redirects to `/menu?item=<slug>` (opens the sheet) or the category |
| Customise sheet | **Simplify** | Only size / ragi / name / drawing, live price, big Add to cart, "+ courier from ₹90" |
| Combo builder | **Remove** | |
| Customize `/customize` | **New** | Two blocks: Delight Box with name / drawing; Drawing Chocolate Bar |
| Cart | **Change** | Courier line (exact rates for the cart's tier), price-changed / sold-out handling kept |
| Checkout | **Rebuild** | 3 steps with progress bar: Details → Review & courier → Pay. Sticky total on phones. Remember details + "Not you? Clear" |
| WhatsApp order message | **Remove** | Orders are saved on the website |
| Pay step | **New** | UPI QR + "Pay with UPI app" + UTR (+ optional screenshot); Razorpay built but off |
| Order success `/order/:id` | **Rebuild** | Confirmation: ID + copy, items, total, payment status, dispatch date, Track, Call; works after reload |
| Track Order | **Rebuild** | Any device: order ID + phone, timeline Placed → Payment confirmed → Preparing → Shipped → Delivered; Cancelled separate |
| Classes | **Rebuild** | Short info page from config ("Details coming soon") + on-site enquiry form. Old SAMPLE classes and booking flow removed (sample text, brief 1.7) |
| Class booked page | **Remove** | |
| Our Story | **Keep**, gains the Instagram band | |
| Gallery | **Remove** | It only said "photos coming soon". Redirects to Our Story |
| Contact | **Simplify** | Call, Chat on WhatsApp (the only WhatsApp link), Instagram, hours/email when set. Call-back form and voice message (both WhatsApp) removed |
| FAQ | **Change** | Courier, payment, dispatch, drawing answers updated |
| 404 | **Keep** | WhatsApp button removed |
| Styleguide (dev only) | **Keep**, trimmed to components that still exist | |
| Admin `/admin` | **New** | Separate page bundle (own HTML entry), noindex, Supabase login |

---

## (c) Data model and file plan

### Single sources of truth
- `src/config/shop.js` — **the one menu / pricing / courier / lead-time config**: categories, products (sizes, prices, options, courier tier, ingredients, `priceStatus`, TO CONFIRM notes), courier rates and tiers, Karnataka pincode prefixes, lead times, order limits, payment defaults (UPI placeholders), classes info text. Plain `{ en, kn }` pairs, so the Kannada build split strips Kannada from it for English visitors.
- `src/lib/pricing.js` — **the one shared pricing module** (pure, no browser APIs): unit price for a selection, "from" price, courier tier/zone/charge, pincode and state checks, cart validation, order totals, applying Hema's admin overrides to the config. Imported by the website **and** by every Netlify Function, so totals can never disagree.
- `src/lib/dates.js` — dispatch dates in IST (lead time + drawing extra), shared the same way.
- Admin overrides (prices, sold out, hidden, tub sizes, rates, lead times, UPI, banner, store open) live in Supabase and are applied on top of the config by the same `applyOverrides()` on both sides.

### Supabase (free tier) — documented in `docs/DATA-MODEL.md`
- `products` (id, slug, category, name_en, name_kn, sizes jsonb, price, options jsonb, courier_tier, price_status, active, sold_out, sort, image) — seeded from config by `scripts/seed-menu.mjs`
- `orders` (id, order_code unique, idempotency_key unique, created_at, customer name/phone/email, address fields, state, zone, items jsonb snapshot, subtotal, courier, total, dispatch_date, payment_method, utr, payment_screenshot, payment_status, status, courier_name, tracking_no, tracking_url, cancel_reason, notes, admin_notes, razorpay ids)
- `order_events` (id, order_id, at, from_status, to_status, by, note)
- `class_enquiries` (id, created_at, name, phone, interest, preferred_dates, message, status)
- `settings` (single row: upi_id, upi_name, upi_qr, lead times, courier rates, store_open, closed_message, announcement)
- `admin_users` (user_id → auth.users), `rate_limits` (key, window_start, hits)
- RLS on for every table. Anonymous and logged-in customers: no direct access to orders, events, enquiries, rate limits. Public read only for active products and public settings columns (through a view). Admin (is_admin()) reads/writes. All writes go through Netlify Functions using the service role.
- SQL functions: `create_order` (idempotent insert + "placed" event in one transaction), `admin_update_order` (status change + event), `hit_rate_limit`.
- Storage: private bucket `uploads` (drawing references, payment screenshots): images only, 5 MB max, signed URLs for admin only; images resized in the browser to ≤1600px first.
- Migrations: `supabase/migrations/*.sql`. Tested locally against real Postgres (PGlite) with a small Supabase shim (roles + `auth.uid()`), so RLS is checked for real.

### Netlify Functions (`netlify/functions`, v2, paths under `/api/`)
`menu` (public overrides + public settings), `create-order`, `order` (code + phone → confirmation/track view), `submit-payment` (UTR), `upload`, `class-enquiry`, `razorpay-order`, `razorpay-verify`, `razorpay-webhook`, `admin` (login, refresh, orders, order detail, status actions, menu, settings, enquiries).
Shared server code in `netlify/lib/`: request helpers, validation, rate limiting, honeypot, store (`supabase` via REST with the service key | `memory` for dev and tests), email (Resend, or a dev outbox), Razorpay helpers. In dev, a Vite plugin serves `/api/*` from the same function files against the dev store, so `npm run dev` runs the whole flow with no accounts. On Netlify without Supabase keys, functions answer "not set up yet" instead of silently losing orders.

### Website files (main changes)
- New: `src/pages/Menu.jsx`, `Customize.jsx`, `Pay` step inside `Checkout.jsx`, `OrderConfirmed.jsx`, rebuilt `Track.jsx`, `Classes.jsx`; `src/components/layout/TabBar.jsx`; `src/components/shop/ProductPhoto.jsx` (photo or gold drawing); `src/lib/api.js` (fetch wrapper), `src/lib/images.js` (resize before upload); `src/context/SettingsProvider.jsx` (banner, store open, UPI, overrides).
- Removed: Shop, Product, ClassBooked, Gallery pages; combos, occasions, ComboBuilder/ComboCard, BookingSheet/ClassCard, CallbackForm, VoiceMessageButton, MobileMenu, NoticeStrip, whatsappMessage/openWhatsApp, classes SAMPLE data.
- Admin: `admin/index.html` + `src/admin/*` (own entry, so customer pages download 0 KB of it).
- Photos: `public/products/<slug>.webp` (1200) + `<slug>-600.webp`, `scripts/photos.mjs` (drop JPG/PNG into `photos-incoming/`), `src/data/photos.json` manifest so only existing photos are referenced; gold drawings otherwise.
- Docs: `docs/DATA-MODEL.md`, `docs/SETUP-BACKEND.md`, `docs/admin-guide-for-hema.md`, `docs/photo-prompts.md`, updated Kannada list.

### Order rules
- Order ID `DK-YYMMDD-XXXX` (IST date + 4 characters from a 32-letter alphabet), unique in the database, retried on a clash. Track Order needs the ID **and** the phone.
- Courier: one charge per order = the highest tier in the cart for the destination zone. Small ₹90 / ₹100, Large ₹100 / ₹150. Delight Box 500 g and 700 g = Large; everything else Small (per product/size in config).
- Zone from the pincode (56–59 = Karnataka). State dropdown; a mismatch shows a friendly warning and the pincode wins.
- Dispatch date: earliest = today (IST) + standard lead time in business days, + the drawing extra when the cart has a drawing. "Delivery time depends on the courier after dispatch."
- Payment status: pending → submitted (UTR given, "awaiting check") → confirmed. Order status: placed → payment_confirmed → preparing → shipped → delivered, or cancelled.
- Abuse limits: honeypot field, rate limits per IP and phone (database counter), max quantity per item (config), length limits on every text field, server re-prices everything.

---

## (d) Risks

| Risk | Mitigation |
|---|---|
| Showing old tub prices that Hema has since changed, now with real payment | Flagged TO CONFIRM in config, the final report and LAUNCH.md; one config line (or the admin price screen) switches any tub to "Price coming soon" |
| Website and server totals drift apart | One config + one pricing module imported by both; the server rejects any mismatch and the cart re-checks prices |
| Orders lost if Netlify runs without Supabase keys | Functions refuse with "not set up yet" on Netlify; the memory store only runs locally or in tests |
| UPI not set at launch | "Payments open soon", Pay disabled, red warning in admin; no unpaid orders are created |
| Fake UTRs | Status says "awaiting check"; Hema confirms against her bank app before preparing; Razorpay (Phase 2) automates it later |
| Spam orders / enquiries | Honeypot, IP + phone rate limits, length limits, server validation |
| Customer data exposure | RLS on every table, no public order reads, Track needs ID + phone and is rate limited, private bucket + admin-only signed URLs, no secrets in the built JS (checked) |
| Free-tier limits (Supabase pauses idle projects after a week; Resend 100 emails/day) | Documented in SETUP-BACKEND.md with what to do; a weekly order or a scheduled ping keeps it awake |
| Bundle growth (new checkout, uploads, pay step) | Admin is a separate entry; pay/upload code loads only on the step that needs it; bundle report checked against the Step 5 budget |
| Kannada strings unchecked | Every new string goes to docs/kannada-priority-for-hema.md |
| Kannada labels overflowing the 5-item tab bar at 360px | Measured in QA at 360/390/768/1280 × EN/KN; labels allowed two lines inside the bar |
| No real photos yet | Gold drawings as fallbacks, the photo manifest prevents broken images, prompts in docs/photo-prompts.md |
| No Docker / Supabase CLI on this machine | Migrations tested in PGlite (real Postgres in WebAssembly) with a Supabase shim; functions tested with the memory store; the Supabase REST adapter tested with a mocked fetch |
| Drawing lead time not given | `leadTimes.drawingExtraBusinessDays` is a TO CONFIRM placeholder; the note on the site doesn't state a number |
