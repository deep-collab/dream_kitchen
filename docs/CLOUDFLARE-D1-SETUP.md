# Cloudflare Workers & Cloudflare D1 Setup Guide

This guide walks you through setting up and running Dream Kitchen on **Cloudflare Workers** with **Cloudflare D1** (serverless SQLite database) and static asset hosting.

---

## 1. Quick Start (Local Development)

### 1.1 Apply Migrations & Seed Menu Locally
```bash
npm run d1:migrate:local
npx wrangler d1 execute DB --local --file=d1/seed.sql
```
*(Or in one step: `npm run d1:setup`)*

### 1.2 Create an Admin Account
```bash
node scripts/d1-admin.mjs hema@dreamkitchen.in YourSecurePassword123 --local
```

### 1.3 Start the Worker Locally
```bash
npm run dev:worker
```
Your local storefront, admin dashboard, and `/api/*` endpoints will run at `http://localhost:8787`.

---

## 2. Production Deployment

### 2.1 Create the Production D1 Database
Create a D1 database on your Cloudflare account:
```bash
npx wrangler d1 create dream-kitchen-db
```
Wrangler will output the `database_id`. Update `wrangler.toml` with this ID:
```toml
[[d1_databases]]
binding = "DB"
database_name = "dream-kitchen-db"
database_id = "<YOUR_DATABASE_ID>"
migrations_dir = "d1/migrations"
```

### 2.2 Run Migrations & Seed Data on Remote D1
```bash
npm run d1:setup -- --remote
```

### 2.3 Create Hema's Production Admin Account
```bash
node scripts/d1-admin.mjs hema@dreamkitchen.in <SECURE_PASSWORD> --remote
```

### 2.4 Configure Production Secrets in Cloudflare
Run these commands to securely store your API keys and secrets in Cloudflare Workers:
```bash
# Order alert and contact email notifications
npx wrangler secret put RESEND_API_KEY
npx wrangler secret put EMAIL_FROM       # e.g., "Dream Kitchen <orders@dreamkitchen.in>"
npx wrangler secret put HEMA_EMAIL       # e.g., hema@dreamkitchen.in

# Fallback UPI payment ID (before Razorpay is active)
npx wrangler secret put UPI_ID           # e.g., dreamkitchen@okaxis

# Razorpay payments (when activated)
npx wrangler secret put RAZORPAY_KEY_ID
npx wrangler secret put RAZORPAY_KEY_SECRET
npx wrangler secret put RAZORPAY_WEBHOOK_SECRET
```

### 2.4b Updating a database that is already in use (e.g. 23 Oct 2026: offers)
When a new file appears in `d1/migrations/` (23 Oct 2026: `0002_products_text_offers_page_photos.sql`,
for Hema's own products, names and descriptions, offers and the Customize photos), run it on the live
database **before** deploying the new code:
```bash
npm run d1:migrate -- --remote
```
Wrangler runs only the files that haven't run yet, so orders and Hema's prices stay as they are.
(`npm run d1:setup -- --remote` does the same plus the menu seed, which is also safe.) Never
run `d1/setup-all.sql` itself on a database that is in use: it is for a new, empty database and stops
at "duplicate column". Check afterwards: `/admin/setup` → the database row is green.

### 2.5 Deploy Front-End and Worker
```bash
npm run deploy
```
This builds the client assets with Vite into `dist/` and deploys both static assets and edge workers to Cloudflare.

---

## 3. Architecture & Edge Features

- **Worker Entrypoint (`src/worker/index.mjs`)**:
  - Directs `/api/*` to zero-cold-start edge handlers with `cf-connecting-ip` rate limiting.
  - Serves static assets (`/assets/*`, `/products/*`) via `env.ASSETS` with immutable caching.
  - Handles legacy 301 redirects (`/shop` → `/menu`, `/about` → `/our-story`, legacy products).
  - Admin dashboard `/admin` served with `x-robots-tag: noindex, nofollow`, `x-frame-options: DENY`, and `cache-control: no-store`.
  - Client-side SPA routing fallback to `/index.html`.

- **Cloudflare D1 Store (`netlify/lib/store/d1.mjs`)**:
  - Pure SQLite queries and transactions (`d1.batch(...)`).
  - WebCrypto PBKDF2 with SHA-256 for admin password hashing and secure token-based session management.
  - Atomic seat reservations for weekend baking classes with capacity limit enforcement.
  - Idempotent order placement and UPI/Razorpay payment verification.
