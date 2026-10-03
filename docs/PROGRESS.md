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
- [ ] Data files shaped like Supabase tables (categories, products with option groups + per-size prices, combos, settings); her full menu with Kannada
- [ ] Remove old SAMPLE products, mockOrders kept until Step 3
- [ ] Shop page: sticky category tabs, subsections, search
- [ ] Product detail (deep link) using the same customise UI
- [ ] Customise sheet: sizes, flavours, name customisation (+₹100, per-product flag), occasions, note, quantity, live total, call line
- [ ] Bars combo builder (3 slots, ₹699, savings/cheaper-individually hint)
- [ ] Cart with editable option lines
- [ ] Gold line-art placeholder tiles per product type

## Step 3: Checkout and ordering
- [ ] 2-business-day dispatch rule (Mon–Sat), date picker with disabled dates + explanation
- [ ] Karnataka pincode validation, checkout fields, payment note
- [ ] Order ID DK-0001, itemised English WhatsApp message to 919535706956, success page
- [ ] "Don't want to type?" call card, call-back form, voice message button
- [ ] Track Order (Received → Confirmed → Preparing → Dispatched → Delivered)
- [ ] Remove old bulk-order rule from site.js / orderRules.js

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
