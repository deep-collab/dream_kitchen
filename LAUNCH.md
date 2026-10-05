# Before going live

Tick each line once it is true. Lines already ticked were checked in Step 6 (see `docs/PROGRESS.md`).

## Accounts and settings (`docs/SETUP-BACKEND.md`)
- [ ] Supabase project created (Mumbai), `supabase/migrations/…_init.sql` and `supabase/seed.sql` run
- [ ] Sign-ups switched off in Supabase Auth; Hema's admin user created and added to `admin_users`
- [ ] Resend account (signed up with Hema's email), API key made
- [ ] Netlify environment variables: `SUPABASE_URL`, `SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY` (secret), `RESEND_API_KEY` (secret), `HEMA_EMAIL`; redeployed
- [ ] `https://<site>/api/menu` shows `"ready":true` (also proves Netlify sends /api to the functions, not the app)
- [ ] Hema logs in at `/admin`, adds her UPI ID and QR in Settings; the red warning is gone
- [ ] Optional: own email domain verified in Resend + `EMAIL_FROM`, so customers get emails too

## Hema confirms (TO CONFIRM in `src/config/shop.js`, or set in /admin)
- [ ] Brownie Tub sizes and prices (the four old tubs show her first-menu prices and weights; Dream Cake Tub shows "Price coming soon")
- [ ] Dream Cake Tub description (none yet)
- [ ] Extra preparation days for drawings (placeholder: 2 business days, `leadTimes.drawingExtraBusinessDays` or /admin Settings)
- [ ] Ragi brownies: gluten-free or not (`brownieInfo.ragiGlutenFree`; the site says "not confirmed")
- [ ] Class details: what you'll learn, duration, fee, batch size, dates, what to bring (`src/data/classInfo.js`)
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
