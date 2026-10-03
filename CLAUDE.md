# Dream Kitchen — website (sample that becomes the permanent site)

## Client
Dream Kitchen: home-based handmade chocolates and brownies, pure ingredients. Founder Hema started as a student with Rs 2,500 and has scaled to Rs 50,000. Karnataka. Instagram: @dreamkitchen_01_homemade.
Audience: Instagram customers of all ages, mostly on phones. Must feel premium, warm and friendly on phone, tablet and laptop.

## Stack
Vite + React + react-router + Tailwind CSS. Supabase (database, auth, storage) from Phase 2. Hosting: Netlify via GitHub (public/_redirects for SPA routing). Secrets only in .env (gitignored). Never commit keys. Commit after each phase.
GitHub remote: https://github.com/dreamkitchenweb01-sudo/dream-kitchen.git (branch: main)

## Design
- Warm, cute, aesthetic. Tints of brown + off-white/cream, gold accent from the logo used sparingly.
- Palette: cream #FBF6EE, off-white #FFFDF9, light tint #EBDCCB, mid #C9A98A, brown #8B5E3C, dark #4A2C1D, deep #2E1A12, gold #D4A93A.
- Fonts (Google Fonts with fallbacks): Playfair Display for headings, Nunito for body, Noto Sans Kannada for Kannada.
- Background: ORIGINAL hand-drawn-style SVG doodles (chocolate bars, truffles, brownies, gift boxes, cocoa pods, hearts, small daisies) in soft watercolour tones on cream. Faint in heroes and between sections; text always sits on solid cream cards. Do not copy any reference image, and do not copy Nel Bake House text, images or branding.
- Layout inspired by nelbakehouse.in: hero with "Shop Now" and "Explore Menu", 4 trust badges, best sellers with quick Add, numbered category cards, story section, rich footer. It must feel like Dream Kitchen, not a clone.
- Mobile-first. Big tap targets (min 44px), readable 16px+ body text, subtle smooth animations (respect prefers-reduced-motion), lazy-loaded images, sticky mobile bottom bar with Cart + WhatsApp, floating WhatsApp button on desktop.

## Logo
Source: logo-source.jpg (phone photo of black-and-gold stickers). Crop the centre sticker cleanly, straighten it, remove neighbouring stickers and edges, lightly reduce glare, and save as public/logo.png (plus a smaller logo-sm.png). Display it on a dark brown rounded badge in the header, hero and footer. Make a favicon from the cocoa-pod icon. Do not redraw or alter the design. Tell me if the quality is poor.

## Languages
English + Kannada toggle (EN / ಕನ್ನಡ) in the header corner, choice remembered in localStorage. All UI text in i18n files (en.json, kn.json), nothing hard-coded. Product names/descriptions support both languages. Write natural Kannada and note in README that it needs Hema's proofreading.

## Pages
Home, Shop (category filter + search + sort), Product detail, Cart/Checkout, Track Order, About, Gallery, Contact/Enquiry, FAQ, 404. Admin (login + dashboard) in Phase 2.

## Ordering rules
- Cart stored in the browser. Minimum order: 1 piece.
- More than 6 pieces in total: delivery date must be at least 2 days ahead; show a friendly notice in cart and checkout.
- Delivery: all over Karnataka, flat Rs 50 (sample value). Validate Karnataka pincodes (start with 56, 57, 58 or 59).
- Checkout form: name, phone (10-digit Indian), address, pincode, delivery date, optional note (e.g. message on the gift box). Clear inline validation.
- On submit: create an order ID like DK-0001, then open a wa.me link (https://wa.me/91<number>?text=...) with the full order pre-filled: ID, items, quantities, prices, delivery, total, customer details, date, note. Show a success page with the order ID and a "Track your order" button.
- Hema replies manually and shares UPI on WhatsApp. No online payment. No WhatsApp bot (separate paid add-on later); keep order data clean so a bot can plug in.
- Prices in Rs with Indian number formatting.

## Placeholders (all in one config file src/config/site.js)
WhatsApp 9XXXXXXXXX, email, FSSAI XXXXXXXXXXXXXX, shelf life "XX days", delivery charge, advance-notice rule, social links.

## Track Order
Customer enters order ID + phone and sees status: Received, Confirmed, Preparing, Out for delivery, Delivered, as a cute progress tracker. Phase 1 uses mock data; Phase 2 uses a Supabase RPC so nobody can list other people's orders.

## Admin (Phase 2, Hema uses it on her phone)
Supabase Auth email/password with Row Level Security (only the admin can write). Add/edit/delete products, upload photos (Supabase Storage), change prices and categories, toggle sold out and best seller, view orders and enquiries, update order status.

## Sample data
About 14 invented products across: Handmade Chocolates, Brownies, Gift Hampers, Truffles, Custom Boxes. Realistic names, weights, prices (Rs 99 to Rs 1,499), short descriptions in EN + KN, tags (bestseller, eggless, new). Use cute illustrated SVG placeholder images matching the doodle style, not stock photos. All in one file src/data/products.js, clearly marked SAMPLE.

## Data layer
All data access goes through src/services (getProducts, getProduct, createOrder, getOrderStatus, createEnquiry). Phase 1 uses local data; Phase 2 swaps to Supabase without changing components.

## Extras
SEO: per-page titles and meta descriptions, Open Graph tags, sitemap.xml, robots.txt, LocalBusiness JSON-LD. Accessibility: alt text, colour contrast, keyboard focus states, labelled forms. Instagram section linking to the profile. Enquiry form sends via WhatsApp in Phase 1.

## Phases
1. Front-end: all pages, design, doodle background, logo, language toggle, cart, checkout to WhatsApp, mock Track Order, sample data. Run locally.
2. Supabase: tables, RLS, auth, storage, admin dashboard, real orders and Track Order. Give exact click-by-click steps for creating the project and putting keys in .env.
3. Deploy: Netlify connected to GitHub, env vars set, phone testing checklist.

## Working rules
Ask only if truly blocked. Keep chat replies short. Explain any manual step in plain simple words. Never put keys in code or chat. Keep code clean and componentised so the sample grows into the permanent site.
