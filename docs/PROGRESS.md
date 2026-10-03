# Build progress

Read this first in every session. Source of truth: CLAUDE.md (PART 1 of BUILD_BRIEF.md). Design rules: docs/DESIGN.md. Audit: docs/AUDIT.md.

## Step 1: Foundation
- [x] A. CLAUDE.md = PART 1 + build roadmap; this checklist
- [ ] B. docs/AUDIT.md; removed doodle theme, old palette, old logo (old product data kept temporarily)
- [x] C. docs/DESIGN.md (tokens, type, space, radius, shadows, wireframes, inventory, self-review)
- [ ] D. src/assets/symbol.svg (unaltered), Wordmark (horizontal + stacked), favicons, OG image, manifest
- [ ] E. Design system: tokens + CSS variables, global styles, fonts (Kannada on demand), icons, UI components, /styleguide (dev only)
- [ ] F. Layout shell: skip link, header, mobile menu, pre-booking strip, mobile bottom bar, footer
- [ ] G. Loading screen (inline in index.html)
- [ ] H. Hero
- [ ] I. en/kn strings for everything new; Kannada overflow checks
- [ ] QA: build, screenshots (360/390/768/1280 × EN/KN), self-critique + fixes, a11y/contrast/tap targets/no h-scroll, Call/WhatsApp links, loader behaviour
- [ ] Committed locally (not pushed)

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
(filled during QA)
