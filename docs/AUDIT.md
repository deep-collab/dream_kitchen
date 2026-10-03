# Code audit (Step 1, 3 Oct 2026)

Audit of the Phase 1 sample (commit `005f644`) before the permanent rebuild.

## What exists
- **Stack:** Vite 8, React 19, react-router 7, Tailwind 4 (CSS-first `@theme`, no JS config file).
- **Routes** (`src/App.jsx`, all inside `Layout`): `/`, `/shop`, `/product/:slug`, `/cart`, `/checkout`, `/order/:id`, `/track`, `/about`, `/gallery`, `/contact`, `/faq`, `*` (404).
- **Components:** Header (cream, sticky, slide-in menu), Footer (dark brown, scalloped edge), FloatingActions (mobile Cart + WhatsApp bar, desktop WhatsApp bubble), LogoBadge (old raster crop), LangToggle, PageHero, SectionHeading (all-caps eyebrow with ✦), Reveal (fade-in on scroll), ProductCard, ProductTags, QtyStepper, Field, Notice, OrderSummary, StatusTracker, Icons (hand-rolled SVG set), ScrollToTop.
- **Services:** `src/services/index.js` has getCategories, getProducts, getProduct, createOrder, getRecentOrder, getOrderStatus, createEnquiry, all async and backed by local data plus localStorage.
- **i18n:** `I18nProvider` with `t(key, vars)` (falls back to English, then the key), `pick({en,kn})`, choice stored in `localStorage` (`dk_lang`), sets `<html lang>`. `en.json` and `kn.json` have matching keys.
- **Cart:** `CartProvider`, items in `localStorage` (`dk_cart`), add/setQty/remove/clear, and derived pieces and subtotal. Lines are keyed by productId only, so there are no options.
- **Config:** `src/config/site.js` has placeholder WhatsApp `9XXXXXXXXX`, email, FSSAI, shelf life, the delivery charge, a pincode regex, and the old "more than 6 pieces needs 2 days" rule.
- **Lib:** format (₹ with Indian grouping, local ISO dates), validation (phone, pincode, order ID), orderRules, whatsapp (English order message).
- **Data:** `data/products.js` (14 invented SAMPLE products in 5 invented categories), `data/mockOrders.js`.
- **Public:** doodle wallpaper, hero art, 14 doodle product SVGs, raster logo crop, favicon.ico/png, og-image.jpg, robots, sitemap, `_redirects`.
- **Scripts:** `scripts/make-art.mjs`, the doodle generator.

## Keep
- Routing structure and the `Layout` + `<Outlet>` shell.
- Services layer pattern: async functions, components never touch data files.
- i18n provider and API (`t`, `pick`, localStorage key), plus the matching en/kn JSON approach.
- Cart provider pattern and localStorage persistence. Step 2 extends lines with options and a line key.
- `lib/format.js` (₹ formatting, local-date helpers) and `lib/validation.js` (phone and pincode normalisation).
- WhatsApp opening technique (open the tab inside the tap, then set the URL) and the clean English order message idea.
- `useAsync`, `useSeo`, `ScrollToTop`, `public/_redirects`, `robots.txt`.

## Remove
- Brown doodle theme: `public/doodles.svg`, `public/hero-art.svg`, `.doodle-bg*` classes, scalloped footer, `scripts/make-art.mjs`.
- Old palette (`#FBF6EE`, `#4A2C1D`, `#8B5E3C`, `#D4A93A`…) and old fonts (Playfair Display, Nunito).
- Old logo crop: `public/logo.png`, `logo-sm.png`, `LogoBadge`, old favicons and `og-image.jpg`. `logo-source.jpg` moves to `reference/logo-photo.jpg` as visual reference only.
- Template tells: all-caps `.eyebrow` labels with ✦, numbered 01–05 category badges, arrows appended to buttons, `Reveal` fade-in on every section, identical card grids, "4 trust badges" strip.
- Nel Bake House-style layout leftovers: Shop now + Explore menu hero, trust badges, numbered category cards.
- Hand-rolled `Icons.jsx`, replaced by lucide-react plus a custom WhatsApp glyph.
- Kannada translation of the brand name (`ಡ್ರೀಮ್ ಕಿಚನ್`). Brand names stay English.

## Done in Step 1
- Removed: doodles, hero art, old logo crop, old favicons and OG image, doodle product SVGs (all products temporarily point at one neutral placeholder tile), the old palette and fonts, eyebrows, Reveal, and the old Icons.
- **Kept temporarily so nothing crashes:** `data/products.js` and `data/mockOrders.js` (SAMPLE), the old cart line shape, the old "more than 6 pieces" date rule in `orderRules.js` and `site.order`, and the old Shop, Product, Cart, Checkout, Track, Gallery and FAQ pages (restyled to the new tokens only). Step 2 replaces the menu data, Shop, Product and Cart. Step 3 replaces the ordering rules, Checkout and Track.
