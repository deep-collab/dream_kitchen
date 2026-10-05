# Setting up orders and payment (about 30 minutes, all free)

The website takes orders and UPI payments itself. For that it needs two free accounts:
**Supabase** (the database, Hema's login, private photo storage) and **Resend** (the emails).
Everything else is already built. Until this is done, the live site shows the menu but says
"Payments open soon" and takes no orders: nothing breaks, and no order is ever lost.

**Never paste a key into a chat, an email or the code.** Keys go only into Netlify's
"Environment variables" page (step 4). If a key is ever shared by mistake, make a new one.

You can do every step on a phone browser, but a laptop is easier for steps 1–2.

---

## 1. Supabase: the database (15 minutes)

1. Go to **supabase.com** → **Start your project** → sign up (GitHub or email). Use an email you
   will keep (Hema's or the business email).
2. **New project**
   - Name: `dream-kitchen`
   - Database password: tap **Generate a password** and save it in your password manager
     (you won't need it day to day).
   - Region: **South Asia (Mumbai)**, closest to customers.
   - Plan: **Free**. Tap **Create new project** and wait about 2 minutes.
3. **Create the tables.** Left menu → **SQL Editor** → **New query**. Open
   `supabase/migrations/20261005000001_init.sql` from this project, copy **all** of it, paste it,
   tap **Run**. It should say "Success. No rows returned".
4. **Load the menu.** New query again, paste all of `supabase/seed.sql`, tap **Run**
   ("Success", 17 products). It is safe to run again later; it never undoes Hema's prices.
5. **Stop strangers signing up.** Left menu → **Authentication** → **Sign In / Providers**
   (or **Settings**) → turn **off** "Allow new users to sign up". Hema's account is made by you
   in the next step; nobody else needs one.
6. **Make Hema's admin login.** **Authentication** → **Users** → **Add user** → **Create new user**:
   - Email: Hema's email
   - Password: a strong one Hema chooses (she types it on her phone to log in)
   - Tick **Auto confirm user**, then **Create user**.
7. **Tell the database she is the admin.** **SQL Editor** → **New query**, paste this with her
   email, tap **Run**:
   ```sql
   insert into public.admin_users (user_id, email)
   select id, email from auth.users where email = 'HEMA@EXAMPLE.COM';
   ```
   It should say "Success. 1 row". (Use the exact email from step 6.)
8. **Copy three values** (you paste them into Netlify in step 4). **Project Settings** (gear icon)
   → **API** / **API Keys**:
   - **Project URL**, like `https://abcdefgh.supabase.co` → this is `SUPABASE_URL`
   - Open the **Legacy API keys** tab (the `anon` and `service_role` keys):
     - `anon` `public` → this is `SUPABASE_ANON_KEY`
     - `service_role` `secret` → tap **Reveal** → this is `SUPABASE_SERVICE_ROLE_KEY`.
       **This one is the master key to the database. It goes only into Netlify.**

## 2. Resend: the emails (5 minutes)

1. Go to **resend.com** → **Sign up** (free: 100 emails a day, 3,000 a month).
   **Sign up with Hema's email address.** Until a domain is added (below), Resend can send only
   to the address you signed up with, which is exactly where Hema's order emails go.
2. **API Keys** → **Create API Key** → name `dream-kitchen`, permission **Sending access** →
   **Add**. Copy the key (it starts with `re_`); it is shown only once. → this is `RESEND_API_KEY`.
3. **Customer emails** (order confirmation and "shipped") need your own sending domain:
   **Domains** → **Add domain** → your website's domain → add the DNS records it shows at the
   place you bought the domain → **Verify**. Then set `EMAIL_FROM` to e.g.
   `Dream Kitchen <orders@yourdomain.in>`. Until then, customer emails are skipped and Hema's still
   arrive (the order itself is never affected by email).

## 3. Hema's UPI

Either now in Netlify (`UPI_ID`, step 4), or later by Hema in **/admin → Settings** (easier: she
can also upload her QR picture there). Until a UPI ID is set, customers see "Payments open soon"
and the admin shows a red warning.

## 4. Netlify: paste the values (5 minutes)

Netlify → your site → **Site configuration** → **Environment variables** → **Add a variable** →
**Add a single variable**, one at a time. Leave "Same value for all deploy contexts" as it is.

| Key | Value | Secret? |
|---|---|---|
| `SUPABASE_URL` | Project URL from 1.8 | no |
| `SUPABASE_ANON_KEY` | `anon` key from 1.8 | no (still, keep it here only) |
| `SUPABASE_SERVICE_ROLE_KEY` | `service_role` key from 1.8 | **yes**: tick "Contains secret values" |
| `RESEND_API_KEY` | from 2.2 | **yes** |
| `HEMA_EMAIL` | Hema's email (where order emails go) | no |
| `EMAIL_FROM` | only after step 2.3, e.g. `Dream Kitchen <orders@yourdomain.in>` | no |
| `UPI_ID` | optional, e.g. `dreamkitchen@okaxis` (or set it in /admin) | no |

Then **Deploys** → **Trigger deploy** → **Deploy site** (the functions only read new values after
a deploy).

None of these values ever reach the browser: they are read only by the Netlify Functions, and
`node scripts/check-secrets.mjs` checks every build for key-shaped text.

## 5. Check it works (5 minutes, on a phone)

1. Open `https://<your-site>/api/menu`: it should show `"ready":true`.
2. Open `https://<your-site>/admin`, log in as Hema. The orders list opens (empty). If it says
   "not allowed", redo step 1.7 with the exact email.
3. In **Settings**: enter the UPI ID (and the QR photo), **Save settings**. The red warning goes.
4. Place a real small order on the site (e.g. one Almond Bar) with your own phone number.
   Hema gets the "New order" email. Pay ₹ to the UPI ID, enter the 12-digit reference.
5. In the admin, the order is under **Payment to check**. Tap **Payment received**, then
   **Shipped** (any courier name / number for the test), then check **Track Order** on another
   phone with the order ID and your number.
6. Cancel the test order in the admin ("Cancel order", reason "test").

## Good to know

- **Free Supabase projects pause after a week with no activity.** Normal orders keep it awake. If
  it pauses, Supabase emails you; open the project and tap **Restore** (the site shows "Online
  orders open very soon" meanwhile; nothing is lost).
- **Backups**: the free plan has no point-in-time restore. Once a month, Table Editor →
  `orders` → **Export to CSV** keeps a copy.
- **Changing the menu**: Hema changes prices, sold out and tub sizes in /admin. New products or
  new options need a change in `src/config/shop.js`, then re-run `supabase/seed.sql`.
- **Local testing** needs no accounts: `npm run dev` uses a practice database in `.dev-data/`.
  Put `DK_DEV_ADMIN_EMAIL` / `DK_DEV_ADMIN_PASSWORD` (your choice) in a local `.env` to log in to
  the practice admin, and `UPI_ID=test@upi` to try payments.

## Later: Razorpay (cards, UPI and net banking, confirmed automatically)

Built and switched off. It needs a Razorpay account with KYC (business documents).
1. Razorpay Dashboard → **Settings → API Keys** → generate keys (start with **Test mode**).
2. **Settings → Webhooks** → **Add new webhook**: URL `https://<your-site>/api/razorpay-webhook`,
   events `payment.captured` and `order.paid`, a secret of your choice.
3. Netlify variables: `RAZORPAY_KEY_ID`, `RAZORPAY_KEY_SECRET` (secret),
   `RAZORPAY_WEBHOOK_SECRET` (secret). Redeploy.
The Pay page then shows "Pay by card, UPI or net banking" next to UPI, and paid orders go straight
to "Payment confirmed".
