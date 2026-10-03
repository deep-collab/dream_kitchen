# Build progress

Read this first in every session. Source of truth: CLAUDE.md (PART 1 of BUILD_BRIEF.md). Design rules: docs/DESIGN.md. Audit: docs/AUDIT.md.

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
- Cart lines snapshot price and labels when added. If Hema changes a price, carts already open keep the old price until re-added. Stage B re-prices on the server when an order is placed.
- The old checkout (Step 3 rebuilds it) still uses the old date rule; it now reads the v2 cart and sends each line's choices in English.
- All Kannada (menu names, descriptions, UI) needs Hema's proofreading.

## Step 3: Checkout and ordering
- [ ] 2-business-day dispatch rule (Mon–Sat), date picker with disabled dates + explanation
- [ ] Karnataka pincode validation, checkout fields, payment note
- [ ] Order ID DK-0001, itemised English WhatsApp message to 919535706956, success page
- [ ] "Don't want to type?" call card, call-back form, voice message button
- [ ] Track Order (Received → Confirmed → Preparing → Dispatched → Delivered)
- [ ] Remove old bulk-order rule from site.js / orderRules.js
- [ ] Re-validate cart line prices against the menu at checkout

## Step 4: Classes, home, other pages, Kannada
- [ ] Classes page + booking (CL-0001) + success + certification note
- [ ] Home sections: category tiles, best sellers, tub spotlight, combo teaser, classes teaser, story, call/WhatsApp/voice band, Instagram, reviews (hidden while empty)
- [ ] Our Story, Gallery, Contact, FAQ, 404
- [ ] Full Kannada pass; README with "Needs Hema's confirmation"

## Step 5: QA, performance, SEO, polish
- [ ] Lighthouse mobile targets (Perf 90+, A11y 100, BP 95+, SEO 100)
- [ ] Per-page meta, OG (absolute URLs once domain is known), sitemap, robots, LocalBusiness JSON-LD
- [ ] Full PART 3 checklist, leftover-code search

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
