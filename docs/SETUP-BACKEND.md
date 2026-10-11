# Making the website live: setup guide for the site owner

About **1 hour**, all free (Razorpay is free to set up and takes a small fee per payment).
You can do every step on a phone, but steps 1 to 4 are easier on a laptop.

**What you're setting up:**
- **Supabase**: the database (orders, class bookings, messages), Hema's login and the photos
- **Resend**: the emails (new orders to Hema, confirmations to customers)
- **Razorpay**: online payments (card, UPI, net banking), confirmed automatically. This one
  needs Hema's documents, so it can come last. Until it is ready the website still works: it
  uses your UPI ID if you add one, or says "Online ordering opens soon – WhatsApp us".

**Three rules for every step:**
1. **Never paste a key into a chat, an email or the code.** Keys go only into Netlify (step 4).
   If a key is ever shared by mistake, make a new one and delete the old one.
2. When a step says **copy**, copy the whole thing: no spaces before or after.
3. After you change anything in Netlify, **redeploy** (step 4.5). The website only reads new
   values after a redeploy.

**Your helper: the Setup check page.** Open `https://YOUR-SITE/admin/setup` at any time. It
shows a green tick or a red cross for Supabase, Resend, Razorpay, the alert email and UPI, and
tells you which step below fixes each red one. (Replace `YOUR-SITE` with your website's address,
today `luminous-salmiakki-fa7e70.netlify.app`.)

**Want to show Hema first?** `https://YOUR-SITE/admin/demo` is the whole admin with made-up sample
orders. It needs no setup, no login, and can't touch real data.

---

## Step 1. Make the Supabase project (10 minutes)

1. Go to **supabase.com** and tap **Start your project**. Sign up with GitHub or with an email you
   will keep (the business email is best).
2. Tap **New project**.
   - **Name**: `dream-kitchen`
   - **Database password**: tap **Generate a password**, then save it in your password manager.
     You won't need it day to day.
   - **Region**: **South Asia (Mumbai)**.
   - **Plan**: **Free**.
3. Tap **Create new project** and wait about 2 minutes until the project page opens.

✅ **How to check it worked:** you see your project's page with "dream-kitchen" at the top.

## Step 2. Copy three values from Supabase (5 minutes)

Keep these three in a safe note (your password manager is best) until step 4.

1. Left menu: **Project Settings** (the gear icon) → **Data API** (or tap **Connect** at the top of
   the project page). Copy the **Project URL**. It looks like `https://abcdefghij.supabase.co`.
   → this is **SUPABASE_URL**.
2. Left menu: **Project Settings** → **API Keys**.
   - Copy the **Publishable key** (it starts with `sb_publishable_`).
     → this is **SUPABASE_ANON_KEY**.
   - Under **Secret keys**, tap the eye or **Reveal**, then copy the secret key (it starts with
     `sb_secret_`). → this is **SUPABASE_SERVICE_ROLE_KEY**.
     **This key opens the whole database. It goes only into Netlify, nowhere else.**
   - If you only see the tab **Legacy API keys**: copy `anon public` instead of the publishable
     key, and `service_role secret` instead of the secret key. Both kinds work.

✅ **How to check it worked:** you have three values: one starting `https://`, one starting
`sb_publishable_` (or `eyJ`), one starting `sb_secret_` (or `eyJ`).

## Step 3. Set up the database (5 minutes)

The project has a file with the whole database setup in it: `supabase/setup-all.sql`.

1. Open the file on GitHub: your repository → folder **supabase** → **setup-all.sql**.
2. Tap the **Copy raw file** button (two overlapping squares, top right of the file). On a phone:
   tap **Raw**, then select all and copy.
3. In Supabase, left menu: **SQL Editor** → **New query**. Paste everything. Tap **Run**
   (bottom right).

✅ **How to check it worked:** it says **"Success. No rows returned"** (or "Success"). In the left
menu, **Table Editor** now lists tables such as `orders`, `class_bookings` and `products`.
If you see a red error instead: copy the file again (all of it) and run it again. It is safe to
run as many times as you like; it never deletes orders or Hema's prices.

## Step 4. Paste the values into Netlify (10 minutes)

1. Go to **app.netlify.com** → your site → **Site configuration** → **Environment variables**.
2. Tap **Add a variable** → **Add a single variable**. Type the **Key** exactly as written below,
   paste the **Value**, leave "Same value for all deploy contexts", and tap **Create variable**.
   For the ones marked **secret**, tick **Contains secret values** first.
3. Add these now:

   | Key | Value | Secret? |
   |---|---|---|
   | `SUPABASE_URL` | from step 2.1 | no |
   | `SUPABASE_ANON_KEY` | the publishable key, from step 2.2 | no |
   | `SUPABASE_SERVICE_ROLE_KEY` | the secret key, from step 2.2 | **yes** |
   | `HEMA_EMAIL` | the email where Hema wants order alerts | no |

   (You add the Resend and Razorpay keys in steps 6 and 8, the same way.)
4. Check each **Key** for typos: one wrong letter and the website can't find it.
5. **Redeploy:** left menu **Deploys** → **Trigger deploy** → **Deploy site**. Wait until it says
   **Published** (about 2 minutes).

✅ **How to check it worked:**
- Open `https://YOUR-SITE/api/menu`. You see text starting with `{"ready":true`.
  (`{"ready":false}` means Netlify can't see the Supabase keys: check the Keys' spelling, then
  redeploy.)
- Open `https://YOUR-SITE/admin/setup`. **Supabase** shows a red cross that says **"No admin login
  yet"**. That is right: you make the logins next.

## Step 5. Make the admin logins: Hema's and yours (10 minutes)

Only people listed as admins can open the admin. Make one login for Hema and one for you.

1. **Stop strangers signing up.** Supabase, left menu: **Authentication** → **Sign In / Providers**
   (on older screens: **Providers** → **Email**). Turn **off** **"Allow new users to sign up"**
   (it may be called "Enable sign ups"). Tap **Save**.
2. **Make Hema's login.** **Authentication** → **Users** → **Add user** → **Create new user**:
   - **Email**: Hema's email
   - **Password**: one Hema chooses (at least 8 letters or numbers). She types it on her phone.
   - Tick **Auto Confirm User**, then **Create user**.
3. **Make your login** the same way, with your email.
4. **Tell the database these two are admins.** **SQL Editor** → **New query**, paste this, change
   the two emails to the exact ones from 5.2 and 5.3, and tap **Run**:
   ```sql
   insert into public.admin_users (user_id, email)
   select id, email from auth.users where email in ('HEMA@EXAMPLE.COM', 'YOU@EXAMPLE.COM')
   on conflict (user_id) do nothing;
   ```
   It should say **"Success. 2 rows"**. ("0 rows": an email doesn't match exactly. Check it.)
5. **Make "Forgot password" emails open the admin.** **Authentication** → **URL Configuration**:
   - **Site URL**: `https://YOUR-SITE`
   - **Redirect URLs** → **Add URL**: `https://YOUR-SITE/admin/reset` → **Save**.

✅ **How to check it worked:** open `https://YOUR-SITE/admin` and log in with Hema's email and
password. The **Home** screen opens ("Today", with cards). Log out (More → Log out) and log in with
yours too. Setup check now shows **Supabase: OK**.

## Step 6. Resend: the emails (10 minutes)

1. Go to **resend.com** → **Sign up**. **Sign up with the same email as `HEMA_EMAIL`** (the order
   alert email). Until you add your own domain (below), Resend can only send to the address you
   signed up with, which is exactly where Hema's alerts go.
2. Left menu **API Keys** → **Create API Key** → Name: `dream-kitchen`, Permission: **Sending
   access** → **Add**. Copy the key (it starts with `re_`). It is shown **only once**.
3. In Netlify (step 4.2), add `RESEND_API_KEY` = that key, **secret**. Redeploy (step 4.5).
4. **So Hema can use "Forgot password"** (recommended): Supabase → **Authentication** →
   **Emails** → **SMTP Settings** → turn on **Enable custom SMTP** and fill in:
   - Host: `smtp.resend.com` · Port: `465` · Username: `resend`
   - Password: the same `re_` key from 6.2
   - Sender email: `onboarding@resend.dev` (later: your own address, see 6.5) · Sender name:
     `Dream Kitchen`
   - **Save**.
   Without this, Supabase's own email service only sends reset links to people on your Supabase
   team (you), not to Hema.
5. **Later, so customers get emails too** (order confirmation, "Shipped" with tracking, class
   booking): Resend → **Domains** → **Add domain** → your website's own domain (for example
   `dreamkitchen.in`) → add the records it shows where you bought the domain → **Verify**. Then add
   the Netlify variable `EMAIL_FROM` = `Dream Kitchen <orders@yourdomain.in>` (not secret), change
   the SMTP sender in 6.4 to the same address, and redeploy. Until then, customers' emails are
   skipped; Hema's still arrive, and nothing else is affected.

✅ **How to check it worked:** Setup check shows **Resend (emails): OK**. Then, on the website, send
a message from the **Contact** page with your own number: Hema's inbox gets **"Message: …"** within
a minute (check spam the first time and mark it "Not spam"). For Forgot password: on the admin log
in page tap **Forgot password?**, type Hema's email; the reset email arrives.

## Step 7. Check everything so far (5 minutes)

1. Setup check (`/admin/setup`): Supabase, Resend and Order alert email are **green**. Razorpay is
   red until step 8, and that is fine.
2. Log in as Hema → **More** → **Settings**:
   - **Order alert emails**: shows where alerts go. Change it here if Hema wants another address
     (it must be the one Resend was signed up with, until a domain is added in 6.5).
   - Optional, while you wait for Razorpay: add Hema's **UPI ID** and **QR** (step 9).
3. **Menu**: the prices are Hema's. Change one, tap **Save**, see **Saved**, change it back.

✅ The website now takes class questions and messages, and shows the admin. Orders and class
bookings open as soon as there is a way to pay (step 8, or step 9 meanwhile).

## Step 8. Razorpay: online payments (Hema's documents; about 1–3 days for approval)

### 8.1 What Hema needs
A Razorpay account in Hema's (or the business's) name: **razorpay.com** → **Sign up** with her
mobile number and email. Razorpay asks for (have these ready):
- **PAN** (her own, or the business's)
- **Bank account** for the money: account number, IFSC, and the name on the account
- **Business details**: business name (Dream Kitchen), type (individual / proprietor is fine),
  address, what she sells ("homemade chocolates and baking classes")
- **Website**: `https://YOUR-SITE`. Razorpay checks the website before approving. It usually wants
  to see a **Contact** page (there is one), plus **Terms**, **Privacy**, **Refund / Cancellation**
  and **Shipping** policy pages. Those need Hema's own rules, so they are not on the site yet:
  ask the developer to add them once Hema has written them (it is a short job).
- GST number only if she has one (it isn't required to start).

### 8.2 Test keys first (works before approval)
1. Razorpay dashboard: switch to **Test Mode** (toggle at the top).
2. **Account & Settings** → **API Keys** (under "Website and app settings") → **Generate Key**.
   Copy the **Key Id** (starts with `rzp_test_`) and the **Key Secret** (shown once; download or
   copy it now).
3. Netlify (step 4.2): `RAZORPAY_KEY_ID` = the Key Id (not secret), `RAZORPAY_KEY_SECRET` = the
   Key Secret (**secret**).

### 8.3 The webhook (so payments are confirmed even if the customer closes the page)
1. Razorpay, still in Test Mode: **Account & Settings** → **Webhooks** → **Add New Webhook**.
2. **Webhook URL**: `https://YOUR-SITE/api/razorpay-webhook`
3. **Secret**: make up a long password (for example 30 random letters and numbers from your
   password manager) and type it here.
4. **Active events**: tick **payment.captured** and **order.paid**. (payment.failed may be ticked
   too; the website ignores it, which is fine.)
5. **Create Webhook**.
6. Netlify: `RAZORPAY_WEBHOOK_SECRET` = the same made-up secret (**secret**). Redeploy.

✅ **How to check it worked (test mode, no real money):**
- Setup check: **Razorpay: OK**, with the note "TEST keys".
- On the website, order one Almond Bar with your own number and tap **Pay**. In the Razorpay
  window choose **UPI** and type `success@razorpay` (Razorpay's test UPI ID), or a test card from
  Razorpay's "Test card details" page. You land on "Thank you! Your order is placed" with **Payment
  received**. Hema gets **"New paid order"** by email, and the order is under **Orders → Paid**.
- Try it once more but **close the Razorpay window**: the page says nothing was charged, and
  **Pay** works again.
- Book a class the same way (Classes → Book now): the booking page says **"Your seat is booked!"**
  and it shows under **Classes** in the admin.
- Cancel the test orders in the admin (open the order → **Cancel order**, reason "test").

### 8.4 Going live (after Razorpay approves the account)
1. Razorpay: switch to **Live Mode** → **API Keys** → **Generate Key** (live keys start with
   `rzp_live_`).
2. Live Mode → **Webhooks** → add the same webhook again (8.3: same URL, same events; you can use a
   new secret).
3. Netlify: replace the values of `RAZORPAY_KEY_ID`, `RAZORPAY_KEY_SECRET` and
   `RAZORPAY_WEBHOOK_SECRET` with the live ones. Redeploy.

✅ Setup check: **Razorpay: OK**, "Live". Place one small real order (₹150 Almond Bar), see it
arrive as **Paid**, then cancel it and refund it in the Razorpay dashboard (**Transactions** →
**Payments** → the payment → **Issue Refund**). Write what you did in the order's **Refund note**.

## Step 9. UPI: the backup while Razorpay isn't ready (optional, 2 minutes)

If Razorpay isn't set up yet, the website can take payments straight to Hema's UPI: the customer
pays with any UPI app and types the 12-digit UPI reference; Hema checks it in her bank app and taps
**Payment received** in the admin.

Log in as Hema → **More** → **Settings** → **UPI** → type her **UPI ID** (like
`dreamkitchen@okaxis`), add her **QR** picture (a screenshot of her QR from her UPI app) → **Save
settings**.

Once Razorpay is on (step 8), UPI is hidden automatically and every payment goes through Razorpay.

✅ Setup check: **UPI: OK**. On the website the cart shows **Checkout** instead of "Online
ordering opens soon – WhatsApp us".

---

## All the Netlify variables, in one place

| Key | What | Secret? | Step |
|---|---|---|---|
| `SUPABASE_URL` | Supabase Project URL | no | 2 |
| `SUPABASE_ANON_KEY` | Supabase publishable key (or legacy `anon`) | no | 2 |
| `SUPABASE_SERVICE_ROLE_KEY` | Supabase secret key (or legacy `service_role`) | **yes** | 2 |
| `HEMA_EMAIL` | where order alerts go (Hema can change it in Settings) | no | 4 |
| `RESEND_API_KEY` | Resend key, `re_…` | **yes** | 6 |
| `EMAIL_FROM` | only after a domain is verified in Resend | no | 6.5 |
| `RAZORPAY_KEY_ID` | `rzp_test_…`, later `rzp_live_…` | no | 8 |
| `RAZORPAY_KEY_SECRET` | Razorpay Key Secret | **yes** | 8 |
| `RAZORPAY_WEBHOOK_SECRET` | the secret you made up for the webhook | **yes** | 8.3 |
| `UPI_ID` | optional; easier to set in admin Settings | no | 9 |

None of these ever reach a customer's browser: only the server functions read them, and
`node scripts/check-secrets.mjs` checks every build for keys and even for these names.

## Good to know

- **Free Supabase projects pause after a week with no visits.** Normal orders keep it awake. If it
  pauses, Supabase emails you: open the project and tap **Restore**. Nothing is lost; meanwhile the
  website says "Online ordering opens soon – WhatsApp us".
- **Backups:** once a month, admin → **More** → **Reports** → download orders and class bookings
  (CSV) for the month, and keep the files.
- **Another admin login later** (a helper): repeat steps 5.2 and 5.4 with their email. To remove
  one: Supabase → Authentication → Users → the user → **Delete user**.
- **If Hema can't log in and the reset email doesn't come:** you can set a new password for her in
  Supabase → **SQL Editor** (change both values, then Run):
  ```sql
  update auth.users set encrypted_password = crypt('NEW-PASSWORD-HERE', gen_salt('bf'))
  where email = 'HEMA@EXAMPLE.COM';
  ```
- **After 30 days without using the admin**, Hema is asked to log in again (for safety, if her
  phone is lost).
- **New products or new options** (not just prices) need a change in `src/config/shop.js` by the
  developer, then run `supabase/setup-all.sql` again (step 3). Prices, sold out, hidden, tub sizes,
  photos, courier charges, class fees and times: Hema changes those herself in the admin.
- **Trying things on your own computer** needs no accounts: `npm run dev` uses a practice database
  in `.dev-data/`. Put `DK_DEV_ADMIN_EMAIL` and `DK_DEV_ADMIN_PASSWORD` (your choice) in a local
  `.env` file to log in to the practice admin.
