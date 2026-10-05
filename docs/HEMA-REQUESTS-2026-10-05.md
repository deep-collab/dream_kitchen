STEP 6: Dream Kitchen rebuild from Hema's new requests: a simpler menu, an easier interface, courier charges, and orders + payment fully on the website.

Take as much time as you need. Quality matters more than speed. Work in phases, test after every phase, and do at least two full self-critique rounds at the end. Don't stop to ask me questions unless something is truly blocked. Use clearly marked placeholders for anything missing and list them in the final report.

=====================================================================
0. HOW TO WORK
=====================================================================
- Create a new branch: step6-hema-requests. Commit at the end of every phase with a clear message. Don't push.
- First, save this entire message as docs/HEMA-REQUESTS-2026-10-05.md and commit it.
- Re-read CLAUDE.md, docs/PROGRESS.md, docs/DESIGN.md and LAUNCH.md before changing anything.
- Phase 0 (no code): write docs/STEP6-PLAN.md with
  (a) a table of every current product -> keep / change / remove, with old and new price,
  (b) every page/section -> keep / simplify / move / remove,
  (c) the data model and file plan,
  (d) the risks.
  Then continue straight into building. Don't wait for me.
- Single source of truth: ONE menu/pricing config and ONE shared pricing module (prices, options, courier) imported by BOTH the website and the server functions, so the totals can never disagree.
- Never invent prices, ingredients, weights or claims. Anything Hema hasn't given gets a "TO CONFIRM" placeholder in config.
- Every new customer-facing text needs both English and Kannada. Add the new Kannada strings to docs/kannada-priority-for-hema.md for her proofreading.

=====================================================================
1. THE MENU (exactly this, nothing else)
=====================================================================
Source: Hema's diary pages, her 4 voice notes and her later confirmations. These prices are final unless marked TO CONFIRM.

1.1 BROWNIE TUBS: 5 products, each with a photo
   Ferrero Rocher Nutella Tub, Lotus Biscoff Tub, Red Velvet White Chocolate Tub, Oreo Overload Tub, Dream Cake Tub
   - Sizes and prices: NOT given yet (TO CONFIRM). If the current site has tub prices that came from Hema, keep them and flag them. Otherwise show "Price coming soon" and disable Add to cart for tubs only. Turning them on later must be a config change, not a code change.

1.2 DELIGHT BOXES: 4 products, each with a photo
   Red Velvet Delight Box, Chocolate Delight Box, Mango Delight Box, Pista Delight Box
   ("Butter" was crossed out in her diary, so it is NOT on the menu.)
   Red Velvet / Chocolate / Mango: 250 g Rs 650 | 500 g Rs 1,250 | 700 g Rs 1,900
   Pista:                          250 g Rs 750 | 500 g Rs 1,500 | 700 g Rs 2,250
   - Optional "Name on the box": free, included in the price. Text field, max 20 characters, English or Kannada letters allowed, with a live preview of how it reads.
   - Optional "Add a drawing": +Rs 450 (Hema's final price; she wants it high so drawing orders stay few). It opens a "Describe the drawing" text field (max 200 characters) and an optional reference image upload (see section 5 storage).
   - Show a small note under the drawing option: "Drawing orders need extra preparation time." Use Hema's lead time from config.

1.3 CUSTOMIZE: its own nav item, a small page or a sheet
   - Explains the 2 customizations in a few lines with one photo each: (1) Delight Box with name / drawing -> links into the Delight Box sheet with the options open; (2) Drawing Chocolate Bar.
   - DRAWING CHOCOLATE BAR Rs 950: listed ONLY here, not in the main menu (Hema: "show it, but not as a priority"). Same drawing description + optional reference image fields.

1.4 BROWNIES: all 5 pieces per box
   Plain Rs 350 | Nutty Rs 549 | Nutella Rs 549 | Walnut Rs 650 -> Ragi version +Rs 50 each
   Assorted Rs 700 -> Ragi version +Rs 80
   - "Make it Ragi" is a simple toggle in the sheet that updates the price live.
   - INGREDIENTS (Hema confirmed): maida (refined flour), dark chocolate, butter, cocoa powder, powdered sugar, eggs, essence, plus the topping for each (Nutty: mixed nuts, Nutella: Nutella, Walnut: walnuts, Assorted: a mix of the flavours). The ragi version uses ragi flour instead of maida. Show names only, never quantities, in a small collapsible "Ingredients" line. Add a "Contains: egg, dairy, gluten, nuts where used" line, and mark the ragi version's gluten status TO CONFIRM.

1.5 CHOCOLATES: only 2 products
   - Pista Bar Rs 450 (250 g)
   - Almond Bar Rs 150 (do NOT show a weight)
   Remove every other chocolate (including Name Bar), and remove the "pick any 3 bars for Rs 699" offer completely.

1.6 CLASSES: a separate page
   - Details aren't given yet. Build a clean, short info page with sections for what you'll learn, duration, fee, batch size, upcoming dates and what to bring, each showing "Details coming soon". The content comes from config, so filling it in later is a text change only.
   - An on-site enquiry form (name, phone, which class/interest, preferred dates, message). It saves to the database and alerts Hema. NOT WhatsApp.
   - The old class booking flow stays switched off.

1.7 REMOVE everything not listed above: products, offers, sample text, and every WhatsApp ORDER link and button. A plain "Chat on WhatsApp" link may stay only on the Contact page. Keep the Call button.

=====================================================================
2. A SIMPLER, EASIER INTERFACE (most important feedback)
=====================================================================
Feedback from the client side: the site copied too much of the reference theme. It feels complex and needs too much scrolling.
KEEP the look: black + gold, Hema's logo, the same fonts and colour tokens, the gold line-drawing style. Nel Bake House stays inspiration for a clean, photo-first product grid, not something to copy section by section.
MAKE IT SIMPLE:
- HOME = only 3 parts:
  (1) A compact hero: logo/tagline, one "Order now" button, max ~60% of a 390px phone screen.
  (2) A category grid of big photo tiles: Brownie Tubs, Delight Boxes, Brownies, Chocolates, Customize, Classes. 2 per row on phones, 3 on tablet, 3x2 on desktop. All tiles visible within about one scroll on a phone.
  (3) A short footer: Call, Track Order, Our Story, FAQ, Contact, language toggle.
  Move every other current home section to Our Story or delete it.
- NAVIGATION: max 5 items: Home, Menu, Customize, Classes, Contact. Cart icon with count. Track Order, Our Story and FAQ go in the footer.
- MENU PAGE: one page with a sticky row of category tabs (Tubs, Delight Boxes, Brownies, Chocolates). Tapping a tab scrolls to that section, and the active tab highlights while scrolling. Category tiles on Home deep-link to the right tab.
- PRODUCT CARDS: compact, 2 per row on phones: photo, name, "from Rs X", and a small "+" add button. Tapping opens the existing bottom sheet.
- PRODUCT SHEET: only the options that product needs (size / ragi / name / drawing), the live price, and a big "Add to cart" button. No long paragraphs.
- After Add to cart: a small toast with "View cart". Don't jump pages.
- CHECKOUT: max 3 short steps with a progress bar: 1 Details -> 2 Review & courier -> 3 Pay. The order total stays visible at every step (sticky bar on phones). Remember the customer's details on this device for next time (with a "not you? clear" link).
- LOADING ANIMATION: 1 second max, only on the very first visit, tap to skip, and none with reduced motion. If it still feels slow, remove it and say so.
- TARGETS (measure and report each):
  * From opening the site to "Add to cart" in 3 taps or fewer on a phone.
  * Home page height at 390px no more than about 2.5 screens.
  * Checkout finished in under 90 seconds by a first-time user (simulate it with your QA script and report the step count).
- Before/after screenshots at 390px for Home, Menu, a product sheet and Checkout, plus the page height of each in screens.

=====================================================================
3. COURIER CHARGES (customer pays; Hema's exact rates)
=====================================================================
Small tier: Rs 90 within Karnataka, Rs 100 outside Karnataka
Large tier: Rs 100 within Karnataka, Rs 150 outside Karnataka
- Tiers (from Hema's "250 g" and "500-700 g" rates): Delight Box 250 g = Small; Delight Box 500 g and 700 g = Large. EVERY other product = Small by default. Each product's tier is set in config.
- ONE courier charge per order = the highest tier in the cart, for the destination zone.
- Don't show product weights anywhere, except the Delight Box sizes and "Pista Bar 250 g" (Hema's choice).
- Ship ALL over India. Remove the Karnataka-only pincode limit and the old flat Rs 50 local delivery and its wording.
- Zone: Karnataka = pincodes starting 56, 57, 58 or 59. The customer also picks their State from a dropdown. If the pincode and the state disagree, show a friendly warning and use the pincode's zone.
- Show "+ courier from Rs 90" on product sheets, the exact courier charge in Cart and Checkout, and a one-line explanation ("Rs 90 within Karnataka, Rs 100 outside; Rs 100 / Rs 150 for 500 g+ Delight Boxes").
- Keep a "preferred dispatch date" (earliest = today + lead time; drawing orders get the extra lead time from config; IST dates). Say clearly: "Delivery time depends on the courier after dispatch."
- All rates, tiers and lead times live in ONE config file.

=====================================================================
4. ORDERING + PAYMENT FULLY ON THE WEBSITE
=====================================================================
4.1 Flow: Cart -> Details (name, phone, optional email, address line 1, line 2, city, pincode, state, landmark optional, order note optional) -> Review (items, options, courier, total, dispatch date) -> Pay -> Confirmation page.
4.2 The SERVER (Netlify Function create-order) recalculates every price, option, ragi extra, drawing extra and courier charge from the shared pricing module. It rejects totals that don't match, sold-out items and invalid pincodes. It never trusts the browser's numbers. Keep the existing price-changed / sold-out handling in the cart.
4.3 Order IDs keep the format DK-YYMMDD-XXXX (IST date). They are unique and unguessable enough.
4.4 PAYMENT, Phase 1 (default ON, free, no KYC): on-site UPI.
   - Show the amount, Hema's UPI QR (image from config) and a "Pay with UPI app" button using
     upi://pay?pa=<UPI_ID>&pn=Dream%20Kitchen&am=<amount>&cu=INR&tn=<ORDER_ID>
     (on desktop show the QR only).
   - After paying, the customer enters the 12-digit UPI reference / UTR (validate the format, allow a screenshot upload as an optional extra). The order is saved as "Payment submitted - awaiting check".
   - Clear text: "Hema will confirm your payment, usually within a few hours. You'll see the status on Track Order."
   - If UPI_ID isn't set yet: show nothing broken to customers. Keep "Pay" disabled with "Payments open soon", and show a red warning in admin only.
4.5 PAYMENT, Phase 2 (built but OFF via config/env): Razorpay Checkout. Create the order server-side, verify the signature in a Netlify Function, and mark the order "Paid" automatically. Add a webhook endpoint for reliability. It turns on only when RAZORPAY keys exist in Netlify env vars.
4.6 CONFIRMATION page: order ID (copy button), items, total, payment status, dispatch date, "Track your order" link, and Call button. It works after a reload.
4.7 TRACK ORDER: works on ANY device. Lookup by order ID + the phone number used (both must match). Shows a status timeline: Placed -> Payment confirmed -> Preparing -> Shipped (courier name + tracking number + link) -> Delivered. Cancelled is shown separately.
4.8 NOTIFICATIONS:
   - Hema gets an email for every new order and class enquiry (full details, a link to the admin order).
   - The customer gets a confirmation email if they gave an email, and again when the order is marked Shipped (with tracking).
   - Use a free-tier transactional email service (e.g. Resend or Brevo). The keys go only in Netlify env vars.
4.9 Spam/abuse protection: a honeypot field, basic rate limiting per IP/phone in the function, max order quantity per item (config), and sensible length limits on every text field.

=====================================================================
5. BACKEND (free tier)
=====================================================================
- Supabase: Postgres + Auth + Storage. Netlify Functions for all writes and anything secret.
- Tables (adjust if needed, document them in docs/DATA-MODEL.md):
  products (id, slug, category, name_en, name_kn, sizes/prices json, options, courier_tier, active, sold_out, sort, image)
  orders (id, order_code, created_at, customer name/phone/email, address fields, zone, items json (snapshot of names, options, prices), subtotal, courier, total, dispatch_date, payment_method, utr, payment_status, status, courier_name, tracking_no, notes, admin_notes)
  order_events (order_id, at, from_status, to_status, by)
  class_enquiries (...)
  settings (upi_id, lead times, courier rates, store open/closed, announcement)
- Row Level Security ON for every table. The public CANNOT read or list orders directly. Track Order goes through a function that needs order code + phone. Only Hema's admin account can read/write orders and products.
- Storage bucket for drawing references + payment screenshots: private, signed URLs only for admin, max 5 MB, images only, resized client-side to 1600px or less before upload.
- Migrations as SQL files in supabase/migrations. A seed script loads the menu from the config.
- .env.example lists every variable. NEVER commit real keys.
- When you reach the point where real accounts are needed, write docs/SETUP-BACKEND.md: step-by-step, phone-friendly, telling me exactly which free accounts to create (Supabase, email service), what to click, and which values to paste into Netlify -> Site settings -> Environment variables. Then continue building against local/mock values so nothing waits on me. Never ask me to paste secrets into the chat or into code.

=====================================================================
6. ADMIN FOR HEMA (phone-first, very simple)
=====================================================================
- /admin, a separate lazy-loaded chunk that adds 0 KB to customer pages. Login with Supabase Auth (email + password, no hard-coded passwords). Use noindex.
- Screens:
  6.1 Orders: big cards, newest first, filter tabs (New, Payment to check, Preparing, Shipped, Done). Each card shows the code, name, total, payment status and dispatch date.
  6.2 Order detail: all items with options (name text, drawing description, reference image), address with a copy button, Call / WhatsApp-the-customer buttons, the UTR to check, and one-tap actions: "Payment received", "Preparing", "Shipped" (asks for courier name + tracking no.), "Delivered", "Cancel" (asks for a reason). Every change is logged in order_events and is reflected on Track Order.
  6.3 Menu: change prices, toggle Sold out / Hidden, and edit tub prices when Hema sends them (this also turns on Add to cart for tubs).
  6.4 Settings: UPI ID + QR upload, lead times, courier rates, an optional announcement banner, and a store open/closed switch with a "back on" message.
  6.5 Class enquiries list.
- A clear "Saved" appears only after the server confirms the save. Errors are shown in plain words.
- Write docs/admin-guide-for-hema.md: short, simple English, with screenshots, written for her phone.

=====================================================================
7. PHOTOS
=====================================================================
Hema: realistic photos, AI-generated is fine. Pista must clearly differ from Mango (pista = pale green with crushed pistachios; mango = golden-yellow). Don't mix them up.
- Every product has its own slot: public/products/<slug>.webp (1200x1200) + <slug>-600.webp. Add a script that converts any JPG/PNG dropped into /photos-incoming into both sizes.
- Until real photos exist, keep the gold line drawings as fallbacks. There must never be a broken image.
- docs/photo-prompts.md: one detailed, realistic AI-image prompt per product, covering the subject and exact flavour colours, texture, a dark slate/black surface with subtle gold accents to match the brand, soft natural side light, a 45-degree or top-down angle, square 1:1, shallow depth of field, no text, no logos, no hands, no props that hide the product. Also add a short negative-prompt line.

=====================================================================
8. QUALITY BAR + TESTS
=====================================================================
Run all of these. Fix and re-run until they're clean:
- Layout: 360, 390, 768 and 1280px x English and Kannada, with no sideways scroll, no clipped or overlapping text, tap targets 48px or more and visible focus rings. Kannada text must fit buttons and tabs.
- Pricing unit tests (shared module) covering every product, size, ragi and drawing combination:
  * Red Velvet 500 g + name + drawing = Rs 1,700
  * Pista 700 g + drawing = Rs 2,700
  * Assorted ragi = Rs 780
  * Walnut ragi = Rs 700
  * Plain + Pista Bar = Rs 800
  * Drawing Chocolate Bar = Rs 950
- Courier tests:
  * Small-only cart -> Rs 90 for 560001, Rs 100 for 400001
  * Any 500 g / 700 g Delight Box -> Rs 100 for 560001, Rs 150 for 110001
  * Mixed small + large -> the large rate
  * Pincode/state mismatch -> warning + pincode zone wins
  * An invalid pincode is blocked
- Server tests: a tampered price is rejected; a sold-out item is rejected; a duplicate submit doesn't create 2 orders (idempotency key).
- End-to-end, against local Supabase or mocks:
  * Place an order -> UTR -> admin "Payment received" -> "Shipped" with tracking -> Track Order on a DIFFERENT browser shows each step -> emails generated (log them in dev).
  * Class enquiry -> it appears in admin.
- Security checks: an anonymous client can't select from orders; admin routes need login; no secrets in the built JS (grep the dist folder for key patterns).
- Performance: Lighthouse mobile on Home, Menu and Checkout, aiming for Performance 90+, Accessibility 100, Best Practices 95+ and SEO 100. Keep first-visit JS close to the Step 5 budget (45-66 KB), and the admin chunk must not load for customers. Report before/after numbers.
- No console errors. 404 page still works. Old URLs for removed products redirect to the right category (Netlify _redirects).

=====================================================================
9. SELF-CRITIQUE (at least 2 rounds)
=====================================================================
After it all works, review the site as (a) a first-time customer on a cheap Android phone with slow 4G, (b) Hema managing 10 orders on her phone, (c) a picky designer. List the problems, fix them, re-run the tests, and do the whole round again. Log both rounds in PROGRESS.md.

=====================================================================
10. FINAL REPORT (same format as before, plus these)
=====================================================================
- What changed, removed products, and the before/after page-height + tap-count table.
- Screenshots folder path, Lighthouse + bundle numbers, and the courier + pricing test results.
- Exactly what I must do next (accounts, env vars, Netlify settings), linking docs/SETUP-BACKEND.md.
- ONE list of every TO CONFIRM item for Hema (tub sizes/prices, UPI ID + QR, classes details, allergen line for the ragi version, and anything else you found).
- Update CLAUDE.md, PROGRESS.md, DESIGN.md and LAUNCH.md. Commit on step6-hema-requests. Don't push. Don't merge.
