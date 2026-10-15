# Before going live

## Final launch (15 Oct 2026): what is done, what is waiting

Done in the code (tested):
- [x] Every landing page pre-rendered as real HTML (/, menu, classes, customize, contact, faq, our-story, terms, refund, shipping, privacy); `scripts/qa-prerender.mjs`
- [x] One site address (`site.url`) for canonical, share links, sitemap, robots; emails use Netlify's main domain
- [x] Netlify badge: backup CSS (the real switch is in Netlify, step 0)
- [x] Refund policy: no "Hampers" anywhere in the code or on the live page (nothing to remove)
- [x] Admin: Add a new product, Edit name and description, no delete (Hide)
- [x] Daily keep-alive + last run on /admin/setup; setup check also checks EMAIL_FROM and the site address
- [x] Tests 307/307, strings, secrets, layout 4 widths × EN/KN, admin, policies, payments (test mode, stand-ins) all pass
- [ ] Lighthouse home 88–89 on this laptop (target 90): to re-measure on the live site

Waiting on Jashwanth (`docs/SETUP-BACKEND.md`, in order):
- [ ] Step 0: Netlify is NOT publishing new pushes (live site older than 12 Oct). Fix, then badge off
- [ ] Step 1: buy/connect the domain, DNS, HTTPS; set `site.url` + CLAUDE.md
- [ ] Steps 2–6: Supabase (Mumbai), keys in Netlify, setup-all.sql, the one admin login, sign-ups off, URL config
- [ ] Step 7: Resend domain, key, EMAIL_FROM, Supabase SMTP; test Forgot password
- [ ] Step 8: keep-alive Run now
- [ ] Step 9: Razorpay website, test keys + webhook, test order + class, then live keys + live webhook
- [ ] Steps 10–11: one full real journey; setup check all green

---

Tick each line once it is true. Lines already ticked were checked in Step 6 (see `docs/PROGRESS.md`).

## Accounts and settings (`docs/SETUP-BACKEND.md`, steps 1–9; `/admin/setup` shows what's left)
- [ ] Supabase project (Mumbai); `supabase/setup-all.sql` run once (step 3)
- [ ] Netlify variables `SUPABASE_URL`, `SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY` (secret), `HEMA_EMAIL`; redeployed; `/api/menu` shows `"ready":true`
- [ ] Sign-ups off; logins for Hema and the owner; both in `admin_users`; Auth URL Configuration (Site URL + `/admin/reset`)
- [ ] Resend (signed up with the alert email), `RESEND_API_KEY` (secret); Supabase custom SMTP via Resend (Forgot password for Hema)
- [ ] Razorpay test keys + webhook (`/api/razorpay-webhook`, payment.captured + order.paid) + `RAZORPAY_WEBHOOK_SECRET`; a test order and a test class booking paid with `success@razorpay`
- [ ] Razorpay live keys + live webhook after approval (policy pages first, see below)
- [ ] Optional meanwhile: Hema's UPI ID and QR in admin Settings
- [ ] Optional: own email domain verified in Resend + `EMAIL_FROM`, so customers get emails too
- [ ] Setup check all green

## Hema confirms (TO CONFIRM in `src/config/shop.js`, or set in /admin)
- [ ] 750 g courier rate (admin Settings; until then it is the 500–700 g rate)
- [ ] Seats per class slot (admin Classes → Fees & times; empty = no limit)
- [x] Policy pages /terms, /refund, /shipping, /privacy (text: `src/data/policies.js`; Hema reads them once before Razorpay)
- [x] Business email (dreamkitchen.web01@gmail.com, also the default order-alert address) and address (Bengaluru, Karnataka: city only) in `src/config/site.js`
- [ ] Court city and courier delivery time: the TODO lines in `src/config/site.js` (empty = neutral wording)
- [ ] Brownie Tub sizes and prices (the four old tubs show her first-menu prices and weights; the Dream Cake Tub stays off the menu until she prices it in admin → Menu)
- [ ] Dream Cake Tub description (none yet)
- [ ] Extra preparation days for drawings (placeholder: 2 business days, `leadTimes.drawingExtraBusinessDays` or /admin Settings)
- [ ] Ragi brownies: gluten-free or not (`brownieInfo.ragiGlutenFree`; the site says "not confirmed")
- [ ] Her UPI ID and QR (in /admin)
- [ ] Call hours, email, FSSAI number (`src/config/site.js`; hidden until filled)
- [ ] Final web address (`site.url`) for Google and the sitemap
- [ ] She reads the Kannada list `docs/kannada-priority-for-hema.md` (Part 1 first)
- [ ] Real product photos (or AI ones from `docs/photo-prompts.md`; check Pista is green and Mango is yellow), then `node scripts/photos.mjs`

## Netlify
- [x] `netlify.toml`: build, publish, Node 22, functions directory, caching, security headers, admin noindex
- [x] `_redirects` written at build: old product and page addresses 301 to the new menu; `/admin/*` to the admin page; everything else to the app (404 page is noindex)
- [ ] Site connected to the GitHub repository; first deploy succeeds; functions listed under Logs → Functions
- [ ] Custom domain (if any) added and HTTPS on

## Test on the live site, from a phone (after the accounts are set up)
- [x] Locally with the practice database: the whole journey (order → UPI reference → admin → Shipped → Track Order on another phone → emails) passes `scripts/qa-step6.mjs`
- [ ] One real small order, paid by UPI: Hema gets both emails, confirms it in /admin, Track Order shows each step on another phone; then cancel it
- [ ] Old link check: `/shop` and `/product/coconut-bar` land on the menu
- [ ] Switch to ಕನ್ನಡ and back once: everything changes and the cart stays

## Quality (Step 6)
- [x] 251 unit tests (pricing, courier, cart, server functions, database security in real Postgres, Supabase adapter), string checks clean, build clean, no secrets in `dist/`
- [x] 4 widths × English and Kannada × 17 screens: no sideways scroll, no clipped text, every tap target 48px or more, focus rings, no English left on Kannada pages
- [x] First visit downloads 44–53 KB of JavaScript in English, 54–62 KB in Kannada; the admin's code never reaches customers
- [x] Lighthouse mobile (English): Performance 91–93, Accessibility / Best Practices / SEO 100
