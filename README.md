# Dream Kitchen

Website for Dream Kitchen, Hema's home brand of brownie tubs, delight boxes, brownies and
chocolates, made fresh to order and sent all over India. Customers order and pay (UPI) on the
website; Hema runs everything from `/admin` on her phone. English and ಕನ್ನಡ.

## Run it on this computer

```
npm install
npm run dev        # http://localhost:5173 (shop) and http://localhost:5173/admin
```
No accounts needed: without Supabase keys the dev server uses a practice database in `.dev-data/`
and writes emails to `.dev-data/outbox/`. To log in to the practice admin and try payments, create
a `.env` (see `.env.example`) with `DK_DEV_ADMIN_EMAIL`, `DK_DEV_ADMIN_PASSWORD` and `UPI_ID=test@upi`.

## Checks
```
npm test                          # 251 tests: prices, courier, cart, server, database security
node scripts/check-i18n.mjs       # English/Kannada strings
node scripts/qa-step6.mjs         # browser QA (dev server running; see the top of the file)
npm run build && node scripts/check-secrets.mjs
node scripts/bundle-report.mjs after    # with `npx vite preview --port 4173` running
```

## Where things are
| What | Where |
|---|---|
| Menu, prices, courier rates, lead times (one file) | `src/config/shop.js` |
| Pricing (shared by website and server) | `src/lib/pricing.js` |
| Phone, Instagram, hours, email, FSSAI | `src/config/site.js` |
| Words on the site | `src/i18n/en.json`, `src/i18n/kn.json` |
| Server (orders, payment, uploads, admin) | `netlify/functions`, `netlify/lib` |
| Database | `supabase/migrations`, `supabase/seed.sql`, `docs/DATA-MODEL.md` |
| Hema's admin | `admin/index.html`, `src/admin` |
| Product photos | drop into `photos-incoming/`, run `node scripts/photos.mjs`; prompts in `docs/photo-prompts.md` |

## Going live
1. Accounts and Netlify settings: `docs/SETUP-BACKEND.md` (about 30 minutes, free).
2. The checklist, including what Hema still has to confirm: `LAUNCH.md`.
3. Hema's guide to the admin: `docs/admin-guide-for-hema.md`.

History and decisions: `docs/PROGRESS.md`. Design: `docs/DESIGN.md`. Working rules: `CLAUDE.md`.
