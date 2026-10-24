# Dream Kitchen — Permanent Website Build Brief (Stage A)

You are the design lead and senior front-end engineer at a studio known for building the best small-business websites in India: beautiful, fast, and easy for everyone, including people who rarely use websites. Dream Kitchen is now a PAYING client. This is the PERMANENT website, not a demo. Quality matters far more than speed. Take your time.

## How to work (follow in order)

1. Read this entire file before doing anything.
2. Replace CLAUDE.md with everything in PART 1 below, exactly as written. It is the permanent project brief.
3. Write a short design plan (palette tokens, type scale, ASCII wireframes for: loading screen, home on mobile, shop on mobile, customise sheet, checkout, mobile bottom bar). Review the plan against PART 1. If anything looks like a generic template, revise it and note what you changed. Then build. Do not wait for my approval unless truly blocked.
4. Build everything in PART 2 (Stage A).
5. QA: follow the checklist in PART 3. Take screenshots (use Playwright if available) at 360, 390, 768 and 1280px in English and Kannada. Critique your own screenshots like a strict client and fix what looks off. Repeat until it is genuinely excellent.
6. Commit locally with clear messages. DO NOT PUSH. Netlify charges credits per deploy; I will review locally first and say "push" when ready.
7. Report back in the format in PART 4.

---

# PART 1 — CLAUDE.md (copy everything below this line until "END OF PART 1")

# Dream Kitchen — Permanent Website

## Client
Dream Kitchen, home-based handmade chocolates, loaded brownie tubs, delight boxes and cookies, made fresh to order. Founder: Hema. She started as a student with ₹2,500 and grew it into a loved home brand. She also teaches chocolate classes and will soon be certified.
- WhatsApp and phone: 9535706956 (use +91 9535706956 / wa.me/919535706956 / tel:+919535706956)
- Instagram: @dreamkitchen_01_homemade (address: `instagramUrl` in src/config/site.js)
- Tagline: "Turning your cravings into sweet memories."
- Customers: Instagram followers of all ages across Karnataka, mostly on phones, including older and rural customers who are not comfortable typing or using websites.

## Stack and project rules
- Vite + React + react-router + Tailwind CSS (existing project at C:\Users\kille\dream-kitchen). Refactor or rewrite any part freely; remove everything from the old sample (sample products, brown doodle theme, old logo crop).
- All data access through src/services (getCategories, getProducts, getProduct, createOrder, getOrderStatus, getClasses, createClassBooking, createCallback, getSettings). Stage A uses local data files shaped exactly like the future Supabase tables. Stage B swaps services to Supabase without changing components.
- All UI text in src/i18n/en.json and src/i18n/kn.json. Nothing hard-coded.
- All business settings in src/config/site.js (phone, WhatsApp, Instagram, hours, delivery charge, delivery rules, business days, FSSAI, shelf life).
- Secrets only in .env (gitignored). Never put keys in code or chat.
- Git: commit locally as needed. Push to main ONLY when the user says "push".
- Hosting: Netlify (public/_redirects for SPA routing). Backend in Stage B: Supabase.

## Brand and theme (from reference/old-theme.html — take ONLY the look, not its buttons, layout or features)
- Logo symbol: extract the gold vector symbol from reference/old-theme.html. It is the base64 SVG in the CSS variable --emb (viewBox 0 0 220.3 213.0, cocoa pod with leaves and a chocolate cup, gold gradient #EBD27A → #D4AF37 → #B8901E). Save as src/assets/symbol.svg. Do not redraw or alter it. If reference/old-theme.html is missing, look for the same file in C:\Users\kille\dream-kitchen-old-static.
- Wordmark: "DREAM KITCHEN" with "Handmade Chocolates" beneath, matching her logo (classic serif capitals in gold). The capitals belong to the logo lockup only; do not use all-caps labels anywhere else.
- Favicon and Open Graph image generated from the symbol.
- Palette:
  - Black #0F0F0F (hero, header, footer, primary buttons)
  - Gold #C9A227 plus the gold gradient above (symbol, accents, highlights, prices on dark)
  - Champagne #F3E7CF (alternate sections)
  - Cream #FFF9EF (main page background)
  - Brown #2A1D16 (body text on light backgrounds)
  - Muted gold #CDBF9E (secondary text on black)
- Contrast rule: gold text only on black or as large display text. On cream and champagne, body text is brown and buttons are black with gold or cream text. Meet WCAG AA everywhere.
- Background: black hero with the gold symbol as a very faint, large watermark that drifts slowly, plus a few tiny gold sparkles. Body sections alternate cream and champagne, separated by fine gold rules. Black footer.
- Type: Cinzel for the wordmark only. Cormorant Garamond for headings (600 weight, sentence case). Lato for body at 18px base with comfortable line height. Kannada: Noto Serif Kannada for headings, Noto Sans Kannada for body. Load from Google Fonts with display=swap and preconnect, with real fallback stacks.
- Motion: one signature moment, the loading screen and hero. No fade-in on every section. Motion responding to taps (sheet opening, item added to cart) is welcome. Respect prefers-reduced-motion.

## Loading screen (point 1)
On first open in a session, a black screen shows the gold symbol drawing or revealing itself (outline draw, then gold fill with a soft shimmer), then the wordmark and tagline fade in, then the screen lifts away to reveal the site. Total about 1.8 seconds, never more than 2.5 seconds even on a slow phone. Tap anywhere to skip. Show once per session (sessionStorage); later page visits load instantly. Reduced motion: show the static symbol for 0.5 seconds, then reveal.

## User-friendly for everyone (top priority)
- Phone-first. Base text 18px. Every tap target at least 48px. Icons always paired with words.
- Ordering takes three taps: product → customise → add to cart.
- Simple, plain words. Sentence case. Buttons say exactly what happens ("Add to cart ₹549", "Send order on WhatsApp", "Call Dream Kitchen").
- No hover-only interactions. No tiny text. No hidden key actions.
- Forms ask only what is needed. Phone and pincode fields open the number keypad (inputmode="numeric"). Autofill enabled. Errors say what is wrong and how to fix it, in both languages.
- English and ಕನ್ನಡ toggle in the header, remembered in localStorage, applied everywhere including the customise sheet, cart, checkout, errors and WhatsApp prompts. Brand names (Ferrero Rocher, Lotus Biscoff, Oreo, Nutella) stay in English.

## Call option for people who cannot type (point 4)
- Header: a "Call" button with a phone icon, always visible on every page and screen size.
- Mobile sticky bottom bar on every page, three large labelled buttons: Call | WhatsApp | Cart (with item count).
- Hero: "Order now" (primary) and "Call to order" (secondary).
- Customise sheet: a line beneath the main button: "Prefer to talk? Call 95357 06956".
- Checkout: a card "Don't want to type? Call us and we'll take your order", with a call button and a call-back option.
- Request a call back: phone number only (plus optional name and a time chip: Morning / Afternoon / Evening). Stage A: opens WhatsApp with "Please call me back on <number> (<time>)". Stage B: also saved to Supabase and listed in the admin panel.
- "Send a voice message" button that opens the WhatsApp chat with "Hi Dream Kitchen", so customers can record a voice note instead of typing.
- Show call hours from config (placeholder until Hema confirms).

## Menu (point 2): her exact menu, prices and words. Fix spelling only.

Category 1: Brownie Tubs
Intro: "A tub filled with delicious fudgy brownies, creamy spreads, premium toppings & pure happiness in every bite!" Highlights: Rich, Fudgy, Loaded, Made Fresh.
Sizes and prices (250g / 500g / 750g):
- Ferrero Rocher Nutella (badge: Signature): "Our signature indulgence! Rich fudgy brownies layered with creamy Nutella & topped with luxurious Ferrero Rocher." ₹549 / ₹999 / ₹1,499
- Lotus Biscoff Bliss: "Fudgy chocolate brownies layered with smooth Biscoff spread & crunchy Lotus Biscoff biscuits." ₹449 / ₹799 / ₹1,149
- Red Velvet White Chocolate: "Soft red velvet brownies paired with silky white chocolate ganache for a rich & elegant treat." ₹449 / ₹799 / ₹1,149
- Oreo Overload: "Rich fudgy brownies loaded with Oreo chunks, chocolate drizzle & creamy goodness in every spoonful." ₹399 / ₹699 / ₹999
- Nutty Caramel Crunch: "Decadent fudgy brownies topped with buttery caramel & crunchy roasted nuts — the perfect sweet & nutty combination!" ₹429 / ₹749 / ₹1,049
What you get: Freshly baked, Made to order, Premium ingredients, Rich & fudgy brownies, Premium reusable tub, Carefully packed, Perfect for gifting & celebrations, Perfect for midnight cravings.
Slogan: "One Spoon. One Bite. And You'll Want More!"
Occasions: Birthday, Anniversary, Celebration, Gifting, Self-love, Midnight cravings.

Category 2: Delight Boxes
- Dreamy Biscoff Delight, 250g ₹550. Flavours: Chocolate, Strawberry, Mango, Butterscotch. "Perfect for personal cravings & gifting!"
- Premium Delight Box, 250g: Red Velvet Delight ₹950 ("Rich, creamy & indulgent!"), Pista Delight ₹950 ("Nutty, smooth & luxurious!").
- Our best sellers (500g / 700g):
  - Chocolate Delight: "Fudgy brownie layers with Lotus Biscoff, a rich dark chocolate layer, topped with pista & white chocolate." ₹950 / ₹1,100
  - Strawberry Red Velvet Delight ₹950 / ₹1,100
  - Mango Delight ₹950 / ₹1,100
  - Butterscotch Delight ₹950 / ₹1,100
  - Red Velvet Premium Delight ₹1,800 / ₹2,100
  - Pista Premium Delight ₹1,800 / ₹2,400
Note: "Made Fresh, Made to Order, Made With Love".

Category 3: Cookies
- Assorted Cookie Dip Box: "A delightful mix of handcrafted cookies paired with rich chocolate and Nutella dips." Includes chocolate cookies, red velvet cookies, pista cookies, chocolate chip cookies, chocolate dip, Nutella dip. Packed in a premium reusable tin box. 250g ₹349 / 500g ₹599 / 750g ₹849. "Perfect for gifting, celebrations, tea-time treats, and chocolate lovers."
- Cookie Pie Tin: "A rich assortment of freshly baked, soft, gooey cookie pie." 500g ₹950 / 750g ₹1,100
- Cookie Pie Box, single serving (1 box) ₹250

Category 4: Chocolates
- Colour Blast Bars, ₹150 each, 9 flavours: Marble Chocolate, Almond, Dates, Roasted Almonds, Waffle, Raisin, Coffee, Ferrero Rocher, Coconut.
- Chocolate Bars:
  Dark Chocolate ₹150, Milk Chocolate ₹150, White Chocolate ₹200, Strawberry Dark Chocolate ₹200, Orange Milk Chocolate ₹200, Cranberry White Chocolate ₹250, Hazelnut Dark Chocolate ₹250, Almond Milk Chocolate ₹250, Walnut White Chocolate ₹300, Coconut Bar ₹280.
  Combo: pick any 3 bars for ₹699.
- Classic Favourites (sold by weight: 250g / 500g / 1kg, priced from her per-kg rate):
  - Dark Chocolate ₹1,100/kg → ₹275 / ₹550 / ₹1,100
  - Milk Chocolate ₹1,100/kg → ₹275 / ₹550 / ₹1,100
  - White Chocolate ₹1,400/kg → ₹350 / ₹700 / ₹1,400
  - Caramel Delight ₹1,000/kg → ₹250 / ₹500 / ₹1,000
  - Classic Favourite Assortment (92 pcs per kg) ₹1,400/kg → ₹350 / ₹700 / ₹1,400
  - Dry Fruits ₹1,300/kg → ₹325 / ₹650 / ₹1,300
  - Triple Layer Chocolate (badge: Top selling) ₹1,300/kg → ₹325 / ₹650 / ₹1,300

Only use badges she stated (Signature, Top selling, Our best sellers group). Do not invent claims such as "no preservatives".

## Customise sheet (point 2)
Tapping any product opens a customise sheet (bottom sheet on mobile, side panel on desktop), like ordering at McDonald's:
- Product image, name, description.
- Size or weight: large radio cards showing each price; first option preselected; the price updates live.
- Flavour (where offered): chips, no extra cost.
- Name customisation (+₹100): a toggle that reveals a text field (max 20 characters, live preview text "Name on box: ___"). Available on Brownie Tubs, all Delight Boxes, Assorted Cookie Dip Box and Cookie Pie Tin. Not on bars, Colour Blast Bars, Classic Favourites or the single-serving Cookie Pie Box. Controlled per product by a data flag so Hema can change it in admin later.
- Occasion chips (optional), from her occasions list.
- Note to Hema (optional, short).
- Quantity stepper.
- Sticky button: "Add to cart ₹<live total>", plus the "Prefer to talk? Call" line.
- Bars combo builder: pick exactly 3 bars (any mix, repeats allowed) for ₹699 with a visual 3-slot tray. Show "You save ₹X" when the bars would cost more individually. If they would cost less individually, show a gentle hint with a button to add them individually instead. Do not change her ₹699 price.
- Cart lines show every choice (size, flavour, name text, occasion, note) and can be edited or removed.

## Ordering rules
- Pre-booking only. No urgent orders. Every product is dispatched after 2 business days. Business days: Monday to Saturday (config).
- Show this clearly: a slim notice under the header ("Pre-booking only. Orders are dispatched after 2 business days.") and again in cart and checkout.
- Date picker: earliest selectable date = 2 business days after today. Earlier dates disabled, with an explanation.
- Minimum order: 1 item.
- Delivery: across Karnataka (validate pincodes starting 56, 57, 58 or 59), flat delivery charge from config (placeholder ₹50 until Hema confirms).
- Checkout fields: name, phone (10-digit Indian), address, pincode, preferred date, note (optional).
- On submit: create order ID DK-0001 (Stage A: local counter; Stage B: database), then open wa.me/919535706956 with a clean itemised message in English: order ID, each item with size, flavour, name text, occasion, note, quantity and price, subtotal, delivery, total, customer details, date. Then show the success page with the order ID, "Track order" and "Call Dream Kitchen" buttons.
- Payment: Hema confirms on WhatsApp and shares UPI. Say this clearly at checkout. No online payment.

## Track Order
Enter order ID and phone; show status as a simple progress tracker: Received → Confirmed → Preparing → Dispatched → Delivered. Stage A uses mock data; Stage B uses a Supabase RPC so nobody can list other people's orders.

## Classes (point 3)
Separate Classes page in the main menu plus a section on the home page. Sample classes (clearly marked SAMPLE in data; Hema edits after the demo):
- Chocolate Making for Beginners: in-person, 3 hours, ₹1,499, up to 8 people
- Loaded Brownie Tub Masterclass: in-person, 3 hours, ₹1,999, up to 8 people
- Kids' Chocolate Fun Class (ages 8–14): in-person, 2 hours, ₹799, up to 10 people
- Online Chocolate Basics: live online, 2 hours, ₹999, up to 15 people
Each class card: title, what you'll learn (3–4 points), upcoming batch dates (next 4 weekends, generated), duration, mode, price, seats left.
"Book a seat" form: name, phone, batch, number of people. Creates booking ID CL-0001 and opens WhatsApp with the booking details. Success page with "Call Dream Kitchen" button. Location line: "Address shared after booking."
Certification note: "Hema is completing her chocolatier certification. Certificate coming soon." Designed so a certificate photo can replace it later.

## Pages
Home, Shop (sticky category tabs: Brownie Tubs, Delight Boxes, Cookies, Chocolates, with subsections and search), Product detail (deep-linkable, with the same customise UI), Cart, Checkout, Order success, Track Order, Classes, Class booking success, Our Story, Gallery, Contact (call, WhatsApp, voice message, call-back form, Instagram, hours), FAQ (pre-booking, dispatch, delivery, payment, name customisation, classes), 404. Admin comes in Stage B.

Home order: loading screen → hero (symbol, wordmark, tagline, Order now, Call to order) → pre-booking notice → four category tiles → best sellers (the "Our best sellers" Delights, Ferrero Rocher Nutella tub, Triple Layer Chocolate) → Brownie Tub spotlight with her "What you get" list and slogan → bars combo teaser → classes teaser → Hema's story → call / WhatsApp / voice band → Instagram → footer.

Reviews: build the section, but render it only when real reviews exist in data (none yet). Never show invented reviews.

## Images
No real product photos yet. Create elegant gold line-art placeholder illustrations on black tiles per product type (tub, delight box, cookie tin, bar, chocolate assortment, class), consistent with the theme. Hema uploads real photos through the admin panel in Stage B. Lazy-load all images.

## Placeholders (in config; show only when filled)
FSSAI number, shelf life, call hours (placeholder "10 am – 8 pm, Monday to Saturday"), delivery charge (₹50), email.

## SEO and quality
Per-page titles and meta descriptions, Open Graph tags and image, sitemap.xml, robots.txt, LocalBusiness JSON-LD (name, telephone +91 9535706956, areaServed Karnataka, sameAs Instagram). Lighthouse mobile targets: Performance 90+, Accessibility 100, Best Practices 95+, SEO 100. Visible keyboard focus, alt text, labelled inputs.

## Stage B (later, not now)
Supabase: tables categories, products (with option groups, prices, flags like nameCustomisation, soldOut, active, badges, sort), combos, orders and order_items (with selected options), classes, class_batches, class_bookings, callbacks, reviews, settings. Row Level Security: public read for menu, classes and settings; customers can only create orders, bookings and callbacks; only the admin can read lists and edit anything. Admin panel (mobile-friendly, Hema uses it on her phone): manage products, prices, sizes, flavours, name customisation toggle, photos (Supabase Storage), sold out, classes, batches and seats, orders and status, bookings, call-backs, reviews, the offer banner and settings. Track Order via RPC. Stage C: WhatsApp automation.

## Working rules
Ask only if truly blocked. Keep chat replies short. Explain manual steps in plain words. Never put keys in code or chat. Never push without the user saying "push".

END OF PART 1

---

# PART 2 — Stage A tasks (build all of these now)

1. Extract the symbol SVG from reference/old-theme.html; create the wordmark, favicon and OG image.
2. Replace the whole theme with the Dream Kitchen black, gold, champagne and cream system and the fonts above. Remove the old brown doodle theme, sample products and old logo crop completely.
3. Loading screen exactly as specified.
4. Restructure the data layer: local data files shaped like the Stage B Supabase tables (categories, products with option groups and per-size prices, combos, classes, settings). Enter her full menu exactly as listed, with Kannada descriptions (brand names stay English).
5. Customise sheet, bars combo builder, cart with editable lines.
6. Checkout with the 2-business-day date rule, Karnataka pincode validation, WhatsApp order message, success page.
7. Call option everywhere: header Call button, mobile bottom bar (Call | WhatsApp | Cart), hero, customise sheet, checkout card, call-back form, voice message button.
8. Classes page, home teaser, booking flow, certification note.
9. All other pages and home sections listed in PART 1. Reviews section hidden while empty.
10. Full English and Kannada coverage with proper Kannada fonts.
11. SEO files and tags.
12. README: how to run, where to edit the menu and settings, and a "Needs Hema's confirmation" list.

---

# PART 3 — QA checklist (must all pass before reporting)

- npm run build completes with zero errors.
- Loading screen: plays once per session, under 2.5 seconds, tap to skip works, reduced motion works, later page loads are instant.
- Every product opens the customise sheet; the first size is preselected; the price updates live; name customisation adds ₹100 only where allowed and only when the toggle is on; choices appear in the cart and can be edited.
- Spot-check at least 12 prices against the menu in PART 1, including all three Classic Favourites weights for White Chocolate, Pista Premium Delight 700g (₹2,400) and Ferrero Rocher Nutella 750g (₹1,499). List the checked prices in your report.
- Bars combo: exactly 3 bars, ₹699, correct savings message and correct "cheaper individually" hint.
- Date picker blocks dates earlier than 2 business days (test on a Friday and a Saturday as well).
- Non-Karnataka pincode is rejected with a clear message.
- WhatsApp order message is complete and correct and goes to 919535706956.
- Every Call button uses tel:+919535706956; the bottom bar shows on mobile on every page; call-back and voice message flows work.
- Class booking flow works end to end.
- Language switch works on every page, sheet, error and message; Kannada renders in Noto fonts.
- No horizontal scroll at 360, 390, 768 and 1280px; tap targets at least 48px; visible keyboard focus; AA contrast.
- Screenshots reviewed and self-critiqued; issues fixed.
- Search the code: no leftover sample products, "SAMPLE" outside classes, brown doodle assets, Nel Bake House references, or the old Phase 1 palette.

---

# PART 4 — Report format (under 25 lines)

- What was built (short).
- How to run: npm run dev and the local URL; how to open it on a phone on the same Wi-Fi (npm run dev -- --host).
- The prices you spot-checked.
- Anything you could not do or are unsure about.
- "Needs Hema's confirmation" list (delivery charge and areas, call hours, FSSAI number, shelf life, whether to show the ₹2,500 story detail, Kannada proofreading, class details, real photos).
- Confirm: committed locally, NOT pushed. Stage B not started.
