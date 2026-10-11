# Build progress

Read this first in every session. Source of truth: CLAUDE.md. Design rules: docs/DESIGN.md (Step 6 section first). Data: docs/DATA-MODEL.md. Setup: docs/SETUP-BACKEND.md.

## 11 Oct 2026: policy pages for Razorpay verification
- [x] /terms, /refund, /shipping, /privacy (`src/pages/Policy.jsx`, text in `src/data/policies.js`, English only with a Kannada note; lead time and courier rates read live from config/admin). Refund rules are Hema's (no refunds; custom orders and classes non-refundable, class date can shift with 24 h notice; damaged/melted/incorrect/quality items replaced if reported within 24 h with photos/video)
- [x] Footer on every page: the four policies + Contact, business name, owner, phone, email/address once filled, Instagram. Contact shows name, owner, phone, address
- [x] "No refund on customized orders and classes." under Place order, Pay and Book & pay (`TotalBar noRefund`)
- [x] Products without a price are left off the menu (MenuProvider), so every product shown has a price; they return once Hema prices them in admin
- [x] TODO in `src/config/site.js`: email, address, jurisdictionCity, deliveryTime (empty = hidden or neutral wording)
- [x] Checks: `node scripts/qa-policies.mjs` (5 pages × 390/1280 × EN/KN, opened directly and refreshed, on dev and on the production build), qa-step6 0 problems, qa-admin 18/18, qa-payments 9/9, 302 tests, check-i18n and check-secrets clean; first-visit JS +~0.5 KB

## 10 Oct 2026: the complete admin, connected end to end (branch admin-complete)
- [x] Database: migration `20261010000001_admin_complete.sql` (class bookings + history, closed weekends/slots, seats under a lock in `create_booking`, product photos in a public bucket, refund note and paid_at, general messages, alert email and class settings hidden from the public, admin last activity, a 750 g courier tier). One file for the owner: `supabase/setup-all.sql` (tested: runs twice in a fresh Postgres)
- [x] Login: Supabase Auth, only `admin_users` (Hema + owner); Forgot password (Supabase link → /admin/reset); 30 days unused → log in again (checked on the server and the phone); Log out; new Supabase `sb_secret_` keys supported
- [x] Admin (`src/admin`, its own bundle, noindex): Home cards; Orders (New/Paid/Preparing/Shipped/Delivered/Cancelled + Today, search, Razorpay payment ID, WhatsApp with the order ID, refund note, history, packing slip); Classes (bookings by weekend/slot, who's coming, close weekends/slots, fees/times/seats); Menu (+ photos from the phone, resized to 1000 px WebP); Settings (3 courier weights, alert email, UPI as fallback); Enquiries (new/handled, WhatsApp reply); Reports (month + top 5, CSV); Setup check (no login needed, no secrets shown)
- [x] Every admin action in `netlify/lib/adminCore.mjs`, shared by the real admin and `/admin/demo` (sample data in the browser, fixed IDs, 0 network calls)
- [x] Payments: Razorpay is the main way when its keys exist (orders and bookings; retry reuses the Razorpay order; signature + webhook; amounts must match; repeats change nothing); UPI only as the fallback; neither → "Online ordering opens soon – WhatsApp us"
- [x] Emails (Resend): Hema for every paid order / booking (or UPI reference to check) and every message; customers for the confirmation and every status change
- [x] Website: /classes/book and /classes/booking/DK-CL-…; Book now on the Classes page; Contact message form; uploaded photos everywhere; all text in English and Kannada (new part in docs/kannada-priority-for-hema.md)
- [x] Guides: docs/SETUP-BACKEND.md rewritten for a non-coder; docs/admin-guide-for-hema.md with new screenshots (docs/screenshots/admin/guide)

### Tests and checks (10 Oct)
- `npm test`: 302 unit/server/database tests, incl. 28 new admin tests (30-day login, forgot password, home cards, tabs/search, refund note, bookings end to end incl. a race for the last seat, blocks, fee changes, Razorpay success/failure/retry/duplicate/tampered, reports, photos, setup check) and database security for the new tables
- `node scripts/qa-admin.mjs`: every admin screen at 390 px in the demo and on the practice database, the main flows, 0 console errors, 0 sideways scroll, every target ≥ 48 px, customers load 0 admin files: 18/18
- `node scripts/qa-payments.mjs`: Razorpay test mode in the browser with stand-ins (closed window, failed card, retry, success, emails once, duplicate webhook, tampered amount, class booking): 9/9
- `node scripts/qa-step6.mjs`: every customer page incl. the booking pages, 4 widths × EN/KN: 0 problems
- check-i18n clean; check-secrets clean (no keys and no secret names in dist/)
- Speed (first-visit JS, gzip): English 45.5–55.4 KB (was 44.4–52.6), Kannada 56.5–65.7 KB (was 54–62.2); Lighthouse mobile Home 95 / Menu 98 / Cart 99 / Checkout 100, the rest 100

### Known and accepted
- 750 g courier rate: Hema hasn't given one; it defaults to the 500–700 g rate (TO CONFIRM; she can set it in Settings)
- Seats per slot are shared by the three classes (one Hema, one room). Not set = no limit and no seat count on the site
- Razorpay usually asks for Terms, Privacy, Refund and Shipping pages before approving: they need Hema's own policies (not written here, not invented)
- Customer emails need a verified domain in Resend (until then only Hema's arrive)

## 7 Oct 2026: classes, and the site without a database
- [x] Classes: Hema's details (every Saturday and Sunday, 2-day class, 9–11 AM or 12–2 PM) and 3 cards: Basic ₹2,500, Advanced ₹3,500, Brownie ₹3,500 (beginner friendly), each "Book on WhatsApp" ("Hi, I'd like to book the <class> class"). Empty rows removed. "Book a class" on Home lands on the cards
- [x] Until the database keys are set (`/api/menu` → ready: false): Track Order shows "Order tracking coming soon. WhatsApp us for your order status." + WhatsApp; the class enquiry form is hidden; the cart and checkout review show "Online ordering opens soon – order on WhatsApp." and a WhatsApp button with the cart typed in (instead of Checkout / Place order)
- [x] Checked with no database (390/1280 × EN/KN, every page: no errors, no failing /api calls, nothing clipped) and with the mock database (qa-step6 clean, enquiry form and Track Order work)
- New Kannada for Hema to check: class days/slots/names, the cards, Track "coming soon", the "opens soon" line
- [x] Every "call {phone}" text (sheet, errors, Track, FAQ, 404, SEO, customer emails) now says "WhatsApp us on {phone}"; "Call hours" is "Hours". Kept: the delivery-note example "please call before delivering" (the courier calling the customer)

## 7 Oct 2026: home hero buttons, no Call
- [x] Hero: "Order now" (menu) + "Order on WhatsApp" (wa.me, "Hi Dream Kitchen, I'd like to place an order.") + "Book a class" (/classes#book lands on the enquiry form). Phones: Order now full width, the other two side by side (48px); desktop: one row. Hero height unchanged at 390px (466 EN / 468 KN) and 1280px
- [x] Call buttons and tel: links removed from customer pages (header, footer, product sheet, Contact, order confirmed, 404); the number is plain text on Contact. Contact texts updated; tests and qa-step6 enforce the new rule
- Known: at 360px in Kannada the two outline buttons stack (each full width, nothing clipped); they fit side by side from ~375px
- New Kannada for Hema to check: ವಾಟ್ಸ್‌ಆ್ಯಪ್ ಆರ್ಡರ್, ತರಗತಿ ಬುಕ್ ಮಾಡಿ, ಫೋನ್, the Contact lead and WhatsApp line

## Step 6: Hema's requests of 5 Oct 2026 (branch step6-hema-requests)
Brief: docs/HEMA-REQUESTS-2026-10-05.md. Plan (product and page tables, data model, risks): docs/STEP6-PLAN.md.
- [x] Phase 0: brief saved, plan, before screenshots and heights (docs/screenshots/step6/before)
- [x] Phase 1: one shop config (src/config/shop.js) and one pricing module (src/lib/pricing.js) shared by site and server; dispatch dates with drawing lead time; Indian states
- [x] Phase 2: Supabase migration (RLS everywhere, SQL functions for the service role only, private uploads bucket), seed, 11 Netlify Functions, mock store, Resend email + dev outbox, Razorpay built but off, rate limits + honeypot
- [x] Phase 3: the simpler site: Home (hero + 6 tiles), 5-item navigation, Menu with tabs, product sheet (size / ragi / name / drawing + photo), Customize, Cart with courier, 3-step checkout, UPI Pay, confirmation, Track Order on any device, Classes info + enquiry, Contact (only WhatsApp link), Story, FAQ; old menu, combo, WhatsApp ordering, call-back, gallery, product pages and sample classes removed; old addresses 301; 1-second first-visit loader
- [x] Phase 4: /admin (own bundle): orders tabs, order detail with one-tap actions, menu, settings, enquiries
- [x] Phase 5: photo pipeline (scripts/photos.mjs) and docs/photo-prompts.md
- [x] Phase 6: QA script, secrets check, bundle and Lighthouse, DATA-MODEL, SETUP-BACKEND, admin guide with screenshots, Kannada list
- [x] Two self-critique rounds (below)
- [x] Committed locally on step6-hema-requests (not pushed, not merged)

### Measured (390 × 844 phone; before = Step 5 site, after = Step 6)
| | Before | After |
|---|---|---|
| Home height | 9.43 screens | 2.09 screens |
| Menu height | 12.34 | 4.49 |
| Product sheet content | 1.73 | 0.64 |
| Checkout (first screen of the form) | 5.45 | 2.81 (step 1 of 3) |
| Taps from opening the site to Add to cart | 3 | 3 |
| First-time checkout, cart → confirmation (QA typing at ~9 letters/s) | — (WhatsApp) | 13 s, 13 steps |
| First-visit JS, English (gzip) | 45–66 KB | 44–53 KB |
| First-visit JS, Kannada | 59–79 KB | 54–62 KB |
| Lighthouse mobile, English: Performance (Home / Menu / Cart / Checkout) | 91 / 90 / 91 / 91 | 92 / 91 / 93 / 91 |
| Lighthouse Accessibility / Best Practices / SEO | 100 / 100 / 100 | 100 / 100 / 100 |
| Lighthouse Performance, Kannada | 80 / 82 / 85 / 84 | 79 / 80 / 78 / 88 |
Screenshots: docs/screenshots/step6 (before/, after/, <width>-<lang>-<page>.png, admin/). Reports: qa-report.json, bundle-after.json, lighthouse-after(-kn).json.

### Tests
251 unit tests: every price combination and the brief's examples (₹1,700 / ₹2,700 / ₹780 / ₹700 / ₹800 / ₹950), every courier case, cart and re-pricing, 37 server tests (tampered price and total, sold out, duplicate submit, bad pincodes, the whole admin journey, Razorpay signatures), 19 database tests in real Postgres (PGlite: anon can't read orders, RLS, constraints, functions), 8 Supabase adapter tests. `node scripts/qa-step6.mjs`: 4 widths × EN/KN × 17 screens clean; journey to Track Order on another browser; emails; enquiry to admin; security; loader. `node scripts/check-secrets.mjs`: dist/ clean (proven with a planted key).

### Step 6 self-critique log
Bugs the QA found while building (fixed): Kannada date chips and "Earliest" badge too wide at 360/768px; the Customize tab label 1px too wide at 360px; the footer FAQ link 35px wide; Kannada tab labels breaking inside a word (now one line, 14px); a menu save in the admin wiping its own "Saved" message; **the dev server stripped the Kannada names from the server's copy of the menu** (orders and emails now always carry both languages; the build-time split skips server code).

Round 1 (as a first-time customer on a slow phone, as Hema with 10 orders, as a picky designer), all fixed:
1. Cart on phones: Continue was below the fold even with two items. The cart now has the same sticky total bar as checkout.
2. Checkout: a Karnataka pincode now fills in the state (one less thing to choose).
3. Admin order cards didn't say what to make; they now list the items ("Pista Delight Box 500 g + drawing × 1, …").
4. New orders appeared only after a reload; the list now refreshes on return to the app and every minute, plus a Refresh button.
5. "Preparing" is sorted by dispatch date (what to make next first).
6. "← Orders" lost the tab Hema came from; it goes back to it now.
7. Admin headings fell back to a system serif (the admin loads no web fonts); they use the body font, bold.
8. The footer's last line could hide under the taller total bar on cart and checkout; more room there.

Round 2, all fixed:
9. An empty cart lost the tab bar (no total bar to replace it); it keeps it now.
10. With orders paused by Hema, the Review button said "Payments open soon"; it now says "Orders are paused for now." with her message.
Re-run after each round: tests, check-i18n, qa-step6 (0 problems), compare heights, bundle report, secrets.

Known and accepted:
- Real accounts are needed for the live site (docs/SETUP-BACKEND.md). Until then it shows the menu and "Payments open soon"; nothing breaks.
- Netlify routes /api/* to the functions by their `config.path`; LAUNCH.md has the one live check (`/api/menu`).
- No product photos yet: gold drawings everywhere (identical per category).
- Home has a small layout shift in Lighthouse (CLS 0.075, under the 0.1 limit), most likely the logo font arriving.
- UPI payments are confirmed by Hema by hand (Phase 1); Razorpay automates it once she has an account.
- The tub weights (250 g / 500 g / 750 g) show because her first menu had them; tub sizes are TO CONFIRM.
- Kannada: as built; Hema proofreads docs/kannada-priority-for-hema.md. (Owner: no more Kannada work this step.)

## Step 1: Foundation
- [x] A. CLAUDE.md = PART 1 + build roadmap; this checklist
- [x] B. docs/AUDIT.md; removed doodle theme, old palette, old logo (old product data kept temporarily)
- [x] C. docs/DESIGN.md (tokens, type, space, radius, shadows, wireframes, inventory, self-review)
- [x] D. src/assets/symbol.svg (unaltered), Wordmark (horizontal + stacked), favicons, OG image, manifest
- [x] E. Design system: tokens + CSS variables, global styles, fonts (Kannada on demand), icons, UI components, /styleguide (dev only)
- [x] F. Layout shell: skip link, header, mobile menu, pre-booking strip, mobile bottom bar, footer
- [x] G. Loading screen (inline in index.html)
- [x] H. Hero
- [x] I. en/kn strings for everything new; Kannada overflow checks
- [x] QA: build, screenshots (360/390/768/1280 × EN/KN), self-critique + fixes, a11y/contrast/tap targets/no h-scroll, Call/WhatsApp links, loader behaviour
- [x] Committed locally (not pushed)

## Step 2: Menu, shop, customise, cart
- [x] Carry-over: phone menu button shows "Menu" / "ಮೆನು" under the icon (48px, Call fully visible, no overflow at 360px)
- [x] Data files shaped like Supabase tables: src/data/categories.js, products.js (35 products), combos.js (bars-pick-3), JSDoc shapes; her words only, Kannada for every name and description
- [x] Old SAMPLE products removed everywhere (mockOrders kept until Step 3)
- [x] src/lib/pricing.js + src/lib/cart.js (pure), Vitest: tests/pricing.test.js, 132 tests incl. all 68 menu prices
- [x] Gold line-art illustrations (8 kinds) in components/art/ProductArt.jsx
- [x] Shop: sticky category tabs with scroll-spy and #deep links, sections, What you get panel, search (EN + KN) with empty state, list cards on phones / grid from 640px, spotlight cards (Signature, Top selling), wide cards for single-item sections, combo card, sold-out state
- [x] Product page /product/:slug: breadcrumb, inline customise, share link, More from this category, title + meta
- [x] Customise sheet: sizes (radio cards), flavour (required chips + inline error), name on box (+₹100 only when on and typed, 20 max, live preview), occasion, note (120), quantity 1–20, live total (aria-live), call line, toast with View cart
- [x] Bars combo builder: 3-slot tray, repeats, savings, cheaper-individually hint with "Add these individually", one cart line
- [x] Cart (schema v2, old v1 dropped): readable choices, Edit (reopens prefilled sheet), Remove with Undo, merge identical lines, summary with delivery and pre-booking note, call card, empty state
- [x] QA: screenshots docs/screenshots/step2 (360/390/768/1280 × EN/KN), critique + fixes below

### Step 2 self-critique log
QA script: `node scripts/qa-step2.mjs` (dev server on port 5173). i18n check: `node scripts/check-i18n.mjs`. Tests: `npm test`.

Round 1 issues, all fixed:
1. Opening /shop#delight-boxes stopped about 470px short. The offset used the tab bar's current position (not yet stuck). It now uses header height + tab height.
2. A dark ~15px strip down the right edge on phones (the reserved scrollbar gutter showing the black page background). The gutter is now reserved only for mouse users on wider screens.
3. Desktop: single-product sections (Colour Blast, Dreamy Biscoff) left one tall square card in a 3-column grid. They now get a wide horizontal card, and grid art is 4:3.
4. Product names on cards and cart lines were thin Cormorant at 18px. They're now Lato bold (Cormorant kept for headings).
5. The cart repeated "Dreamy Biscoff Delight" (section name = product name). The section line is now skipped when identical.
6. The Dreamy Biscoff section intro repeated the product's own line. The section copy was removed (her line stays on the product).
7. The combo tray took about 230px on phones and hid the comparison. Slots are compact on phones (art from 640px).
8. Tap targets: cart line name links (22px tall) and the breadcrumb "Shop" (35px wide). Both now 48px.
9. Screen-reader names read "Add : Dark Chocolate" (stray space). Hidden suffixes are now nested in the visible label ("Add Dark Chocolate").
10. "1 items" fixed with a singular string. Two rupee formatters merged into formatINR.
11. Tub illustration: the spoon sat on the Ferrero ball like a honey dipper. Moved to the other side.

Final run: 0 sideways scroll, 0 clipped Kannada/English text in buttons, chips, tabs or the sheet footer, 0 targets under 48px. Keyboard: focus stays in the sheet for 40 Tabs, Esc closes it, focus returns to the card. Phone: swipe down and tap outside both close the sheet, and the bottom bar hides while it's open. Deep links highlight the right tab.

Known and accepted for now:
- Cart lines snapshot price and labels when added. If Hema changes a price, carts already open keep the old price until re-added. Stage B re-prices on the server when an order is placed. (Resolved in Step 3: src/lib/reprice.js.)
- The old checkout (Step 3 rebuilds it) still uses the old date rule; it now reads the v2 cart and sends each line's choices in English. (Resolved in Step 3.)
- All Kannada (menu names, descriptions, UI) needs Hema's proofreading.

## Step 3: Checkout and ordering
- [x] A. Price re-check: src/lib/reprice.js (changed price updated and flagged "Was ₹999, now ₹1,099"; removed, inactive, sold-out or changed choices flagged unavailable). CartProvider serves checked lines; cart and checkout show "Some prices have been updated" and block checkout until unavailable lines are removed (one tap, with Undo). Closes the Step 2 "known and accepted" item.
- [x] B. Dispatch dates: src/lib/dates.js, always Indian time (Asia/Kolkata). Config in site.ordering: businessDays Mon–Sat, closedDates [], dispatchAfterBusinessDays 2, orderCutoffHour null (hook, tested, unused), dateChoices 10, maxDaysAhead 90
- [x] C. Checkout rebuilt: call card at the top, your details, delivery address (address, area or city, Karnataka pincode), date chips (next 10 allowed dates, Earliest marked, Pick another date with min = earliest), pre-booking line, note (200), summary, payment line, Remember my details (on by default). Inline errors on blur and submit, focus to the first problem, polite announcement, aria-invalid/aria-describedby. Phone sticky bar: Call + "Send order on WhatsApp ₹<total>". Empty cart redirects to /cart with a message.
- [x] D. Interim order ID DK-YYMMDD-XXXX (src/lib/orderId.js, CLAUDE.md note); src/lib/order.js builds the record; services.createOrder saves it on the phone; src/lib/whatsappMessage.js builds the English plain-text message; WhatsApp opens synchronously in the tap (src/lib/openWhatsApp.js)
- [x] E. Order success /order/:id: big ID + Copy, "ready in WhatsApp" message (or "One more step" when the browser blocked the tab), fallback box (Open WhatsApp again, Copy order details, Call), 3 next steps, order details, Track this order, Continue shopping. Cart emptied once, only after the order is saved and the page loaded; refresh still shows the order.
- [x] F. CallbackForm (phone, optional name, Morning/Afternoon/Evening) + VoiceMessageButton + CallOptions card, used in checkout, cart and the empty search state
- [x] G. Track Order: ID + phone (prefilled from the URL), StatusTracker Received → Confirmed → Preparing → Dispatched → Delivered, not-found message with Call and WhatsApp; only services.getOrderStatus changes in Stage B
- [x] H. Old checkout, old date rule (bulkThreshold), mockOrders, lib/whatsapp.js, lib/format.js, lib/orderRules.js and OrderSummary removed. All strings in en.json and kn.json; check-i18n now also checks runtime keys, en/kn parity, placeholders and emoji
- [x] QA: 211 tests, build clean, screenshots docs/screenshots/step3 (360/390/768/1280 × EN/KN), whatsapp-samples.txt, critique + fixes below
- [x] Committed locally (not pushed)

### Step 3 self-critique log
QA script: `node scripts/qa-step3.mjs` (dev server on port 5173; "now" is frozen with Playwright's clock, WhatsApp is stubbed so nothing leaves the machine). Report: docs/screenshots/step3/qa-report.json. Tests: `npm test`. Strings: `node scripts/check-i18n.mjs`.

Bug found while testing (fixed): `Button` with variant "whatsapp" or "call" silently rendered its default link even when it was a submit button. The call-back form's "Send request" and the desktop "Send order on WhatsApp" would have opened a plain chat instead of submitting. It also affected the existing Contact enquiry form. The default link now applies only to plain buttons.

Round 1 issues, all fixed:
1. The top call card filled the whole first phone screen before the form began. Dropped its extra paragraph (the buttons say it all); the form starts one scroll sooner.
2. The "Earliest" tag sat on top of the weekday text. Chips got top room and the tag is centred on the chip's edge.
3. Kannada chips broke after the comma ("ಸೋಮ," / "12 ಅಕ್ಟೋಬರ್"). Chips now always show the weekday above the date, in both languages.
4. Desktop: the summary column scrolled away, leaving half the screen blank beside the date and note sections. It is now sticky (and scrolls inside itself if a big order makes it taller than the screen).
5. When a browser blocked the WhatsApp tab, the page still said "Your order is ready in WhatsApp". It now says "One more step: send your order on WhatsApp" and puts the Open WhatsApp box first.
6. The "Was ₹999, now ₹1,099" pill was invisible on the champagne summary and unevenly spaced. Now an info-icon line with the old price struck through.
7. Track Order at tablet width: three columns squeezed the hint and split the example ID across lines. Now two fields with the button below; the example ID uses non-breaking hyphens.
8. Autofilled "+91 98450 12345" showed beside the fixed "+91" ("+91 +91 …"). Valid numbers are tidied to "98450 12345" on blur (checkout, call-back, track).
9. After the empty-checkout redirect the notice repeated "Your cart is empty". It now explains the rule: checkout needs at least 1 item.
10. QA capture fixes: full-page shots hide the fixed bars and scroll to the top first (they drew the bar and header mid-page), and every shot waits for the web fonts.

Round 2 issue, fixed: on tablets the five Kannada step names ran into each other in the horizontal tracker. It stays vertical until 1024px.

Final run: 0 sideways scroll, 0 clipped text, 0 targets under 48px across all screens and both languages. 88 link checks: every Call link is tel:+919535706956, every WhatsApp link wa.me/919535706956, and all 16 WhatsApp tabs opened during the run went to 919535706956. An empty submit focuses the name field, marks 5 fields aria-invalid plus the date group, and announces "Please fix 6 things. First: Enter your name." A sold-out item blocks sending and moves focus to the notice. Friday → chips start Monday 12 Oct; 11:30 pm IST Saturday on a phone set to Auckland (already Sunday there) → chips start Tuesday 13 Oct. Typing a Sunday in "Pick another date" says "We are closed on that day". The success page survives a refresh and the cart is empty afterwards.

Known and accepted for now:
- Stage A orders live only on the customer's phone, so Track Order shows "Received" for orders placed on this phone and the not-found message elsewhere. Stage B: Supabase RPC.
- The native date input shows the browser's own date format (mm/dd/yyyy on an English-US desktop, dd/mm/yyyy on Indian phones).
- The JS bundle grew by about 50 KB (new pages and strings in both languages). Step 5 can lazy-load kn.json and the checkout.
- All new Kannada needs Hema's proofreading.

## Step 4: Classes, home, other pages, Kannada
- [x] Step 3 carry-overs:
  - Order ID date: DK-261005 is correct. The sample order is placed on Mon 5 Oct, and 7 Oct is its preferred delivery date. The ID always carries the day the order is placed, in Indian time. The fixture now makes its ID with the real generator. New tests cover sample vs preferred date, 00:15 IST while UTC is still the day before, and a month rollover. The browser check is in qa-step4.
  - "Area or city" field (`site.ordering.areaField`: required/optional/off) and the 90-day limit (`site.ordering.maxDaysAhead`) are side by side in `src/config/site.js`, with tests.
  - Phone number: one line (`PHONE` in site.js). Strings use `{phone}`, which the translator fills. index.html (meta description and JSON-LD) is filled by the Vite plugin. The QA scripts and tests read config. tests/config.test.js fails if the digits appear in any other file (checked by planting one).
  - Kannada list: docs/kannada-for-hema.md, generated by `node scripts/kannada-list.mjs`. Part 1 has 344 new strings (Steps 3–4 and the class data); Part 2 has 278 earlier ones (Steps 1–2 and the menu).
- [x] Classes: src/data/classes.js (4 SAMPLE classes; Supabase shape), src/lib/classes.js (next 4 weekend batches in Indian time, booking closes 1 day before, at most 6 seats per booking, from `site.classes`), src/lib/bookingId.js (CL-YYMMDD-XXXX, see CLAUDE.md). Classes page has a certification note (`site.classes.certificateImage` swaps in the photo), class cards, "How booking works", and call options. BookingSheet opens WhatsApp inside the tap. /classes/booked/:id: ID + Copy, Open WhatsApp again, Copy details, Call; survives a refresh.
- [x] Home: tiles, best sellers (her badges and her "Our best sellers" group, opening the same customise sheet), Brownie Tub band (her intro, What you get, slogan, from ₹399), combo teaser (opens the builder), classes list, story, reviews (hidden while src/data/reviews.js is empty), call band (Call, WhatsApp, call back, voice), Instagram
- [x] Our Story (facts from the brief only), Gallery (says photos are coming and points to Instagram; never shows illustrations as photos), Contact (Call, WhatsApp + voice, call-back form, Instagram, hours, delivery; email and FSSAI appear once filled; the old sample "enquiry" form with its invented types was removed), FAQ (9 answers, numbers from config and data; invented policies removed), 404 (Call and WhatsApp)
- [x] Honesty fix in CallbackForm: when the browser blocks WhatsApp it now says "One more step" with Open WhatsApp, not "Your request is ready in WhatsApp"
- [x] Full Kannada: every new string in en/kn. check-i18n now also covers runtime keys and fails on unused strings (14 dead ones removed). qa-step4 scans every Kannada page, sheet and success page for leftover English, with a self-test.
- [x] README rewritten (it still described the old sample), with "Needs Hema's confirmation"
- [x] QA: 231 tests, build clean, screenshots docs/screenshots/step4 (360/390/768/1280 × EN/KN), whatsapp-samples.txt, critique and fixes below
- [x] Committed locally (not pushed)

### Step 4 self-critique log
QA script: `node scripts/qa-step4.mjs` (dev server on port 5173). It freezes "now" at Mon 5 Oct 2026, 10 am IST, stubs WhatsApp (nothing leaves the machine) and exits non-zero on any problem. Report: docs/screenshots/step4/qa-report.json. Kannada list: `node scripts/kannada-list.mjs`.

Round 1 (smoke screenshots), all fixed:
1. Class cards on phones squeezed the summary into a narrow column beside the art. The summary now runs full width under the title.
2. "What you'll learn" and "Upcoming dates" were thin Cormorant at body size. They are now Lato bold, matching the product names.
3. Times broke across lines ("Sat, 10 Oct, 11 / am"). Hour words now use non-breaking spaces in both languages (these strings are never used in WhatsApp messages).
4. The Brownie Tub illustration took about 350px of black on phones before any text. It is now smaller on phones, and "from ₹399" sits above the button instead of trailing below it.
5. Kannada "In person" was ನೇರವಾಗಿ ("directly"). It is now ನೇರ ತರಗತಿ.
6. Our Story said "completing her chocolatier certification" twice (text and note). The text no longer repeats it.

Round 2 (qa-step4), all fixed:
7. /classes#kids-chocolate-fun (from the home teaser) landed in the wrong place: in Kannada the card ended up above the screen (−113px). The page scrolled before the web fonts arrived and changed the card heights.
8. Even when it landed, the card was about 130px below the header: its own scroll margin stacked on the page's header padding. Removed. The check is now "0–40px below the header" (was "within 200px").
9. An empty booking moved focus to "Your name" while the first field on screen is the date, so the date error was scrolled out of sight. Errors now follow screen order (date, people, name, phone).
10. On a 360px Kannada phone the certification note wrapped one word per line beside its icon. The icon now sits beside the title only.
11. QA script bugs: the "empty booking opened WhatsApp" check counted tabs from earlier runs, and an empty Kannada scan could not prove the scanner worked. It now compares counts from just before the submit and plants English as a self-test.

Round 3 (the #class landing, found flaky across runs), all fixed:
12. Re-scrolling on font events and on a fixed 4-second timer still landed Kannada phones 15–55px below the header from run to run: on a busy machine the Kannada fonts arrived after the window closed. The page now watches its own layout (ResizeObserver on main). It keeps re-scrolling until the fonts are loaded and the layout has been still for 1 second (10-second cap), and stops at once if the person scrolls, taps or presses a key. 40 repeats: 15px every time.
13. Testing "the person scrolls right away" showed them pulled back to the card. A trace proved it was not the re-scroll: the page's CSS smooth scrolling animated a 2,300px glide that swallowed their first scroll. The landing is now instant, as on the Shop page. qa-step4 keeps this as a regression check.
14. The phone-number guard test caught the new kannada-list.mjs, which spelled the number in its notes. It now reads it from config.

Final run (`node scripts/qa-step4.mjs`, exit 0): 0 sideways scroll, 0 clipped text, 0 targets under 48px, 0 English left on Kannada pages (scanner self-test passed), 1,112 Call/WhatsApp links checked with 0 wrong, 18 WhatsApp tabs opened with 0 to a wrong number. "Ready in WhatsApp" appears only when the tab opened and "One more step" when it was blocked, for bookings and call-backs at every width and in both languages. Empty booking: focus goes to the date, with "Please fix 3 things. First: Choose a date for the class." Esc closes the sheet and returns focus to its Book button. Bookings survive a refresh. Every #class link lands 15px below the header, and a person who scrolls right away is left alone. Order ID in the browser: placed Mon 5 Oct 10 am (delivery 7 Oct) gives DK-261005-…; placed 00:15 IST on 6 Oct, on a phone still showing 5 Oct, gives DK-261006-…. Screenshots: 232 in docs/screenshots/step4.

Known and accepted for now:
- Class dates, seats and "what you'll learn" are SAMPLE and look real on the page. They must be replaced (or the page hidden) before launch: README item 5.
- Seats left always show the full class (Stage A doesn't know of other bookings). Stage B: class_batches.
- JS bundle: 488 → 544 KB (142 → 153 KB gzip), with no new libraries. The growth is the new pages and their Kannada text. Step 5: lazy-load pages and kn.json.
- All Kannada needs Hema's proofreading (docs/kannada-for-hema.md).

## Step 5: Launch prep and speed
- [x] Classes switch: `site.classes.enabled` (false). Off hides the page (/classes and /classes/booked/… are the 404), the home section, menu, phone menu and footer links, the FAQ answer, Our Story's "Teaching others", and the sitemap entry. Every string shown elsewhere has a version without classes (contact.call.text, notFound.help, seo.faq.desc). Unit tests (tests/step5.test.js) check navigation, sitemap, strings and the switch in each page; qa-step5 checks every page at 4 widths × EN/KN, with a self-test, for any class text or link.
- [x] Unconfirmed details empty by default, hidden everywhere: `hours: null`, `delivery.charge: null`, email, fssai, shelfLife, `certificateImage: null` (each marked UNCONFIRMED with an example). The delivery charge needed real logic: `deliveryChargeFor()` returns null while unconfirmed, and TotalRows shows "Hema confirms it on WhatsApp" / "Total before delivery". The checkout button reads "₹2,199 + delivery" and the WhatsApp order "Delivery: to be confirmed | Total: ₹2,199 + delivery". Order tests now state their own ₹50 charge instead of relying on the placeholder.
- [x] Booking IDs stay CL-YYMMDD-XXXX; README explains why.
- [x] docs/kannada-priority-for-hema.md (`node scripts/kannada-list.mjs`): Part 1 is 71 lines (54 texts customers act on, grouped by screen, English | Kannada | Correct?, examples instead of {placeholders}, no keys). Part 2, "Later, if you have time", has the other 585. The old docs/kannada-for-hema.md is replaced.
- [x] Speed, with no React: owner approved Preact (preact/compat alias in vite.config.js; measured in a throwaway experiment first). Every page is lazy (src/routes.js). The customise/combo sheets load on first open. Menu, class and review data load on demand. English text is split per screen (scripts/strings-split.mjs; check-i18n enforces each file importing its sections). Icons are one file each. All Kannada is one JSON file fetched only for ಕನ್ನಡ (scripts/kannada-split.mjs strips `kn` from the data at build time and fails on anything it can't split). A head script preloads the current page's files (route preload) and, for returning Kannada readers, the Kannada file.
- [x] Images: `Photo` (width/height always, srcSet for phones, lazy unless near the top) for the certificate and gallery. Today's site has no photos: product art and the logo are inline SVG. Fonts: preconnect + non-blocking stylesheet preload; nothing else preloaded.
- [x] Launch: LAUNCH.md tick-list; netlify.toml (build, publish, Node 22, a year's caching for hashed files); sitemap.xml and robots.txt generated from data and config (the old sitemap listed 14 products from the old sample); the 404 page is `noindex`; the stale public/products/placeholder.svg is removed.
- [x] Accessibility: logo and cart links' spoken names now match what is on screen (Lighthouse label-content-name-mismatch, failing on every page before); "1 items" fixed.
- [x] QA: 241 tests, check-i18n clean, build clean; qa-step5 (launch defaults) and qa-step4 (classes on) clean; bundle-report and Lighthouse below. Screenshots: docs/screenshots/step5 (classes-on/ has the class screens only; the rest are in the main set).
- [x] Committed locally (not pushed)

### Speed, measured
First visit, JavaScript downloaded before the page shows (gzip, `node scripts/bundle-report.mjs`, production build):

| | Before (Step 4) | After |
|---|---|---|
| Every page, English | 149 KB (one file) | 45–66 KB (Home 65.6, Menu 63.9, Checkout 66, 404 45.3) |
| Every page, Kannada | 149 KB | 59–79 KB (the Kannada file is 13.8 KB) |
| English visitor downloads Kannada | yes (menu names, kn.json) | never (checked on all 11 pages) |

Lighthouse mobile (default throttling, cold cache, real cart, median of 3; `node scripts/lighthouse.mjs`). Served over HTTP/2 like Netlify (`scripts/serve-http2.mjs`); the Step 4 build was rebuilt from git and measured the same way. Accessibility, Best Practices and SEO are 100 on every page after.

| Performance | EN before | EN after | KN before | KN after |
|---|---|---|---|---|
| Home | 95 | 91 | 75 | 80 |
| Menu | 96 | 90 | 81 | 82 |
| Product | 75 | 93 | 77 | 84 |
| Cart | 87 | 91 | 80 | 85 |
| Checkout | 95 | 91 | 73 | 84 |

Over HTTP/1.1 (`vite preview`) the after numbers are within 1–2 points (EN 89–91, KN 77–86). The JSON files are in docs/screenshots/step5.

### Step 5 self-critique log
Round 1 (measuring), all fixed:
1. My first Lighthouse run measured an empty cart: Lighthouse ignores a profile passed through --chrome-flags, so checkout redirected to /cart unnoticed. The runner now starts its own Chrome per run and refuses any run that lands on another address.
2. The next runs were all from a warm cache ("0 KB of JavaScript"): 172 orphaned Chrome processes from earlier runs were still listening on the shared port, and Lighthouse attached to them. Each run now gets its own port, Chrome is stopped by profile path, and a run with no JavaScript downloaded is refused.
3. A stale Step 4 dev server held port 5173 (it survived TaskStop), so a smoke test passed against old code. Stopped and restarted before any QA.
4. My bundle report counted the idle prefetch as "first load" for Kannada visitors. It now counts only files requested before the page signals it has rendered.

Round 2 (speed), all fixed:
5. The router looked 62 KB in the bundle attribution; built on its own it is 14 KB (source maps over-attribute). React + ReactDOM were the real 63 KB. Without a framework change the best was 104–125 KB, so I asked; with Preact, 45–66 KB.
6. Splitting pages made a waterfall (HTML → main code → page code → menu data). Lighthouse LCP went 2.3 s → 3.3 s and Checkout fell to 86. Fixed with the route preload, and by starting menu preparation when a menu page starts loading rather than after its first render (Menu 88 → 90).
7. The Kannada preload hint sat after the stylesheet, so the browser only ran it once the CSS arrived (~0.6 s on slow 4G). Moved above it: the Kannada file starts at 188 ms instead of 622, and throttled Kannada LCP went 2.10 s → 1.55 s.
8. Ruled out by measurement, not assumption: the loading screen (home LCP identical with and without it), the Kannada web fonts (no change when blocked), and HTTP/1.1 vs HTTP/2 (1–2 points).
9. Lazy-loading the phone menu overlay saved 0.2 KB. Reverted: not worth a slower first tap.

Round 3 (correctness), all fixed:
10. Retrying a failed Kannada download could never work: browsers cache a failed import() of a script for the life of the page. Kannada is now a JSON file fetched with fetch(), and the retry works (tested with the network cut, then restored).
11. The Kannada list's Part 1 said "Add a name on the box (+₹549)". Each text now has its own example values (+₹100).
12. The phone-number guard caught my kannada-list.mjs spelling the number again; it reads config.
13. Node scripts couldn't import products.js after I moved weightLabel (extensionless import); fixed with the .js extension.
14. Two launch blockers found while writing LAUNCH.md: Node version not pinned (Vite 8 needs 20.19+), and every unknown address answers 200, so Google could list "404" pages. netlify.toml pins Node 22; the 404 page is noindex.
15. Nine icons nobody used (egg, leaf, heart… from the old sample's invented "trust badges") removed.

Known and accepted for now:
- Kannada Lighthouse is 80–85: the page can't show until its Kannada text arrives, and Kannada text takes longer to lay out. The next real lever is pre-rendering pages to static HTML at build time (not done; it's a bigger change, proposed in the Step 5 report).
- Home, Menu and Checkout score a few points below Step 4 in English (95/96/95 → 91/90/91; still ≥ 90). Lighthouse's simulated LCP penalises a chain of small files more than one big file; measured with real 4× CPU / slow 4G throttling, home's main text appears at 1.25 s.
- The only Kannada an English visitor receives: the word ಕನ್ನಡ on the language button, and the loading screen's Kannada tagline in index.html (~150 bytes, so Kannada readers see Kannada before any script runs).
- Open Graph and canonical URLs still use the placeholder domain until the final one is known.

---

## Step 1 self-critique log
Screenshots: docs/screenshots/step1/ (360, 390, 768, 1280 × EN/KN). QA script: `node scripts/qa-step1.mjs` (needs `npm run preview -- --port 4173` and `npm run dev -- --port 5173` running). The report is in qa-report.json.

Round 1 issues, all fixed:
1. Horizontal scroll at 360 and 390px on every page. The header's segmented language toggle never hid on phones (its own `inline-flex` beat `hidden`). Wrapped each toggle in a breakpoint span.
2. Hero at 1280×800: Order now and Call to order sat below the fold. Lockup 60 → 54px from 1024px, tighter top padding and tagline gap.
3. Watermark looked muddy on desktop. Opacity 5.5% → 4.5%.
4. Tap targets under 48px: footer links "Shop" and "FAQ" (40×48) and legacy product title and category links. Added min sizes.
5. Footer screenshots overlapped the sticky header and bar (capture artefact). Now shot as the scrolled-to-bottom viewport, as users see it.
6. OG image: the watermark sat behind the wordmark and the tagline left "memories." orphaned. Moved the watermark and balanced the tagline wrap.
7. Contrast: input and chip borders were 2.1:1 on cream, and the Toggle off-track 2.3:1. Both now #8F7D66 (3.8:1).
8. Copy: the old sample text had claims Hema never made (no preservatives, eggless, FSSAI "yes", ₹50,000) and a Kannada brand name. Removed. Brand names now stay English.
9. Case bug: icons.jsx had silently replaced Icons.jsx on Windows, which would break the Linux (Netlify) build. Renamed in git.

Round 2 results: zero overflow at all widths and languages, zero sub-48px targets, focus ring on all 25 checked Tab stops, every tel: link is tel:+919535706956 and every WhatsApp link is wa.me/919535706956. Loader: ~1.86s, once per session, tap-skip works, reduced motion ~0.57s, and the hard cap held at 2.50s with the JS delayed by 4s. The sheet traps focus, Esc closes it and the bottom bar hides.

Known and accepted for now:
- Below 768px the menu button is icon-only (no room beside Call at 360px). Documented in DESIGN.md.
- Legacy pages (Shop, Product, Cart, Checkout, Track) still run on SAMPLE data and the old "more than 6 pieces" date rule. The checkout's earliest date can contradict the pre-booking strip until Step 3 replaces the rule.
- OG and canonical URLs are relative until the final domain is known (Step 5).
- All Kannada needs Hema's proofreading.
