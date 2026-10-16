# Going live: every step, in plain words (for Jashwanth)

Do the steps **in this order**. Each one ends with **✅ Check**: don't go on until it is true.
All free except the domain (already bought) and Razorpay's small fee per payment.
A laptop is easiest. Plan about **3 hours**, plus waiting time for the email check (up to a day).

**The website's address for now: `https://dreamkitcheno1.netlify.app`** (the Netlify project
**dreamkitcheno1**). Every step below uses it. Connecting your own domain to the website is
**step 1, and it can wait**: steps 2–11 work without it.

**`YOUR-DOMAIN`** means the domain you bought, without `https://` or `www`, for example
`dreamkitchenblr.in`. Before step 1 it is used only for the email sender (step 7: emails come from
`orders@YOUR-DOMAIN`). Type yours wherever you see `YOUR-DOMAIN`.

**Four rules for every step:**
1. **Never paste a key into a chat, an email or the code.** Keys go only into Netlify (step 5).
   If a key is ever shared by mistake, make a new one and delete the old one.
2. When a step says **copy**, copy the whole thing: no spaces before or after.
3. After you change anything in Netlify's environment variables, **redeploy** (step 5.5). The
   website only reads new values after a redeploy.
4. **Your helper: the Setup check page**, `https://dreamkitcheno1.netlify.app/admin/setup`. It shows
   a green tick or a red cross for each part, and which step fixes each red one. **At the end, every row is green.**

**What you're setting up:**
- **Netlify**: hosts the website (we stay on Netlify: Vercel's free plan doesn't allow shops)
- **Your domain**: the web address customers type
- **Supabase**: the database (orders, class bookings, messages), Hema's login, photos
- **Resend**: the emails (new orders to Hema, confirmations to customers, "Forgot password")
- **Razorpay**: online payments (UPI, cards, net banking), confirmed automatically

---

## Step 0. Netlify: make sure new versions go live, and switch off the badge (10 minutes)

The website updates itself when new code is saved on GitHub, but **only if Netlify's automatic
publishing is working**. On 16 Oct 2026 the live site was still an older version (11 Oct) than
GitHub, so check this first.

1. Go to **app.netlify.com** and log in. Open the project **dreamkitcheno1**.
   - **Is it linked to GitHub?** Left menu **Project configuration** → **Build & deploy** →
     **Continuous deployment** → **Repository**. It must say
     `github.com/dreamkitchenweb01-sudo/dream-kitchen`, branch **main**. If it says "no repository"
     (the site was uploaded by hand): **Link repository** → **GitHub** → allow access →
     **dreamkitchenweb01-sudo/dream-kitchen** → Branch to deploy **main** → leave the build command
     and publish directory empty (they come from `netlify.toml` in the code) → **Deploy**.
   - Only **dreamkitcheno1** is used. The older project **luminous-salmiakki-fa7e70** is not; you
     can delete it (Project configuration → General → **Delete project**) so nobody lands on an old
     copy.
2. Left menu: **Deploys**. Look at the list:
   - The top line should say **Published** and mention the newest change (for example "Admin: add
     new products…"). ✅ Then go to point 4.
   - If you see a yellow banner **"Auto publishing is locked"** (or "Stop auto publishing" is on):
     tap **Start auto publishing** (or **Unlock**).
   - If the top lines say **Failed**: tap the failed line, scroll to the red text at the end of the
     log, copy it, and send it to your developer (or Claude). Nothing on the live site breaks
     meanwhile; it just stays on the last good version.
   - If Netlify says your **credits / build minutes are used up**: the free plan pauses publishing
     until next month. Wait, or upgrade the plan for one month.
3. To publish the newest version by hand: **Deploys** → **Trigger deploy** → **Deploy site**. Wait
   about 2 minutes for **Published**.
4. **Switch off the "Powered by Netlify" badge** (a small card Netlify adds at the bottom of every
   page; it is not part of our website). Left menu: **Project configuration** → **General** →
   **Powered by Netlify badge** → turn it **off** → **Save**. It takes effect at once; no redeploy.
   (The website also hides it by itself as a backup, but switch it off here anyway.)

✅ **Check:** open `https://dreamkitcheno1.netlify.app/faq` and scroll down: it says
**"Online on the website, through Razorpay"** under "How do I pay?". No "Powered by Netlify" card
at the bottom of the page.

---

## Step 1. Connect your domain (later, whenever you're ready: 20 minutes, then up to a day of waiting)

**You can skip this step for now** and do steps 2–11 on `https://dreamkitcheno1.netlify.app`.
When you do it, finish with 1.5 (four addresses that must change with it).

### 1.1 Tell Netlify about the domain
1. Netlify → your site → left menu **Domain management** → **Add a domain** (or **Add domain**).
2. Type `YOUR-DOMAIN` (without `www`) → **Verify** → **Add domain**.
   - If Netlify asks "Add the www subdomain too?" or adds `www.YOUR-DOMAIN` by itself: good, keep it.
3. In the list of domains, next to `YOUR-DOMAIN` tap **Options** → **Set as primary domain** (if it
   doesn't already say **Primary domain**). Now `www.YOUR-DOMAIN` and the old `netlify.app` address
   both **redirect to `https://YOUR-DOMAIN`** automatically.
4. Netlify shows **"Awaiting External DNS"** / **"Pending DNS verification"**. That's expected: next
   you tell your domain company where the website lives.

### 1.2 At the company where you bought the domain (GoDaddy, Hostinger, BigRock, Namecheap, …)
1. Log in there → **My domains** / **Domain portfolio** → `YOUR-DOMAIN` → **DNS** / **Manage DNS** /
   **DNS records**.
2. **Delete** any existing record of type **A** with Host/Name **@**, and any **CNAME** with Host
   **www** (they point to the company's "parked" page). Leave **MX**, **TXT** and **NS** records alone.
3. **Add** these two records (tap **Add record** for each):

   | Type | Host / Name | Value / Points to | TTL |
   |---|---|---|---|
   | **A** | `@` | `75.2.60.5` | default (or 1 hour) |
   | **CNAME** | `www` | `dreamkitcheno1.netlify.app` | default |

   (If your company offers a record type **ALIAS** or **ANAME** for `@`, you may use that instead
   of the A record, with the value `apex-loadbalancer.netlify.com`. Either works.)
4. **Save**.

### 1.3 HTTPS (the padlock)
Netlify makes the padlock certificate by itself once it sees the records (minutes to a few hours,
sometimes up to a day).
1. Netlify → **Domain management** → scroll to **HTTPS**. When it says **"Your site has HTTPS
   enabled"**, it's done. If it says **"Waiting on DNS propagation"**, come back later and tap
   **Verify DNS configuration**.
2. Nothing to switch on: Netlify always sends visitors to the `https://` address.

### 1.4 Put the address in the website's code (one line)
The website's code has the address in **one** place (it is used for Google, the sitemap and links
people share). Either ask Claude ("set site.url to https://YOUR-DOMAIN, update CLAUDE.md, commit and
push"), or do it on GitHub yourself:
1. Open **github.com/dreamkitchenweb01-sudo/dream-kitchen** → folder **src** → **config** →
   **site.js** → the **pencil** (Edit) button.
2. Find the line starting with `url: 'https://dreamkitcheno1.netlify.app'`. Change only
   the address inside the quotes to `https://YOUR-DOMAIN` (no `/` at the end). Keep the quotes and
   the comma.
3. **Commit changes…** → **Commit changes**. Netlify publishes it in about 2 minutes (step 0).
4. Optional, for the developer notes: the same in **CLAUDE.md**, the line starting
   `- **Live site:`.

✅ **Check:**
- `https://YOUR-DOMAIN` opens the website with the padlock. `https://www.YOUR-DOMAIN` and
  `http://YOUR-DOMAIN` land on `https://YOUR-DOMAIN`.
- `https://YOUR-DOMAIN/sitemap.xml` lists addresses starting with `https://YOUR-DOMAIN`.
- Setup check: **Website address: OK** and it shows `https://YOUR-DOMAIN`.

### 1.5 Four addresses that must change with the domain
Once the domain is the primary one, the old `dreamkitcheno1.netlify.app` address only **redirects**.
Browsers follow that, but Supabase's links and Razorpay's webhook should point at the new address
directly. Change these (only those you have already set up):
1. Supabase → **Authentication** → **URL Configuration**: **Site URL** `https://YOUR-DOMAIN`, and add
   the Redirect URL `https://YOUR-DOMAIN/admin/reset` (step 6.4). Remove the netlify.app one a week later.
2. Razorpay → **Business website detail**: `https://YOUR-DOMAIN` (step 9.1).
3. Razorpay → **Webhooks**, in **Test Mode** and in **Live Mode**: edit the URL to
   `https://YOUR-DOMAIN/api/razorpay-webhook` (steps 9.3 and 9.5). Keep the same secret.
4. Then do step 7's **Forgot password** check once more.

---

## Step 2. Make the Supabase project (10 minutes)

1. Go to **supabase.com** → **Start your project**. Sign up with **dreamkitchen.web01@gmail.com**
   (the business email: the account belongs to the business).
2. Tap **New project**.
   - **Organization**: the one Supabase made for you (any name).
   - **Project name**: `dream-kitchen`
   - **Database password**: tap **Generate a password**, then save it in your password manager.
     You won't need it day to day.
   - **Region**: **South Asia (Mumbai)** (`ap-south-1`). Closest to Hema's customers.
   - **Plan / Instance size**: **Free** (Nano).
3. Tap **Create new project** and wait about 2 minutes until the project page opens.

✅ **Check:** you see your project's page with "dream-kitchen" at the top.

## Step 3. Copy three values from Supabase (5 minutes)

Keep these three in your password manager until step 5.

1. Tap **Connect** at the top of the project page (or left menu: **Project Settings** → **Data
   API**). Copy the **Project URL**, like `https://abcdefghij.supabase.co`. → this is **SUPABASE_URL**.
2. Left menu: **Project Settings** (gear icon) → **API Keys**.
   - Copy the **Publishable key** (starts with `sb_publishable_`). → **SUPABASE_ANON_KEY**.
   - Under **Secret keys**, tap **Reveal** (the eye), then copy it (starts with `sb_secret_`).
     → **SUPABASE_SERVICE_ROLE_KEY**. **This key opens the whole database: Netlify only.**
   - If you only see the tab **Legacy API keys**: copy `anon public` instead of the publishable key,
     and `service_role secret` instead of the secret key. Both kinds work.

✅ **Check:** you have three values: one starting `https://`, one `sb_publishable_` (or `eyJ`), one
`sb_secret_` (or `eyJ`).

## Step 4. Set up the database (5 minutes)

The whole database setup is one file: `supabase/setup-all.sql`.

1. Open it on GitHub: **github.com/dreamkitchenweb01-sudo/dream-kitchen** → **supabase** →
   **setup-all.sql**.
2. Tap **Copy raw file** (two overlapping squares, top right of the file).
3. Supabase, left menu: **SQL Editor** → **+** / **New query**. Paste everything. Tap **Run**
   (bottom right). If Supabase warns about "destructive operations", tap **Run this query**: the file
   never deletes orders.

✅ **Check:** it says **"Success. No rows returned"**. Left menu **Table Editor** lists tables such as
`orders`, `class_bookings`, `products` and `heartbeat`. A red error? Copy the whole file again and
run it again: it is safe to run as many times as you like. (Run it again, too, whenever the
developer says the database changed.)

## Step 5. Put the values into Netlify (10 minutes)

1. **app.netlify.com** → your site → **Project configuration** (or **Site configuration**) →
   **Environment variables**.
2. **Add a variable** → **Add a single variable**. Type the **Key** exactly as below, paste the
   **Value**, keep "Same value for all deploy contexts", and **Create variable**. For the ones marked
   **secret**, tick **Contains secret values** first.

   | Key | Value | Secret? |
   |---|---|---|
   | `SUPABASE_URL` | the Project URL (step 3.1) | no |
   | `SUPABASE_ANON_KEY` | the publishable key (step 3.2) | no |
   | `SUPABASE_SERVICE_ROLE_KEY` | the secret key (step 3.2) | **yes** |
   | `HEMA_EMAIL` | `dreamkitchen.web01@gmail.com` (where order alerts go) | no |

3. Check every **Key** for typos: one wrong letter and the website can't find it.
4. (The Resend and Razorpay keys come in steps 7 and 9, the same way.)
5. **Redeploy:** left menu **Deploys** → **Trigger deploy** → **Deploy site**. Wait for
   **Published** (about 2 minutes).

✅ **Check:**
- `https://dreamkitcheno1.netlify.app/api/menu` shows text starting with `{"ready":true`. (`{"ready":false}` =
  Netlify can't see the Supabase keys: check the Keys' spelling, then redeploy.)
- Setup check: **Supabase** is red with **"No admin login yet"**. That's right: next step.

## Step 6. The admin login, and nobody else (10 minutes)

Hema and you both use **one login: dreamkitchen.web01@gmail.com** (you chose the same email for
both). Supabase allows one login per email address. If you ever want your own separate login, it
needs a different email: repeat 6.2 and 6.3 with it.

1. **Stop strangers signing up.** Supabase → **Authentication** → **Sign In / Providers** (older
   screens: **Providers** → **Email**). Turn **off** **"Allow new users to sign up"**. **Save**.
2. **Make the login.** **Authentication** → **Users** → **Add user** → **Create new user**:
   - **Email**: `dreamkitchen.web01@gmail.com`
   - **Password**: one you and Hema choose (at least 8 letters and numbers; you type it yourselves,
     never send it in a chat). Tick **Auto Confirm User** → **Create user**.
3. **Tell the database this login is an admin.** **SQL Editor** → **New query**, paste this line
   exactly, tap **Run**:
   ```sql
   insert into public.admin_users (user_id, email) select id, email from auth.users where email = 'dreamkitchen.web01@gmail.com' on conflict (user_id) do nothing;
   ```
   It says **"Success. 1 row"**. ("0 rows" = the email in step 6.2 is spelled differently.)
4. **Where "Forgot password" emails send people.** **Authentication** → **URL Configuration**:
   - **Site URL**: `https://dreamkitcheno1.netlify.app`
   - **Redirect URLs** → **Add URL**: `https://dreamkitcheno1.netlify.app/admin/reset` → **Save URLs**.
     (When the domain is connected, step 1.5 changes both to `https://YOUR-DOMAIN`.)

✅ **Check:** `https://dreamkitcheno1.netlify.app/admin` → log in with the email and password → the **Home** screen
opens. Setup check: **Supabase: OK**.

## Step 7. Resend: the emails (30 minutes, plus waiting for the domain check)

### 7.1 Account and domain
1. **resend.com** → **Sign up** with **dreamkitchen.web01@gmail.com**.
2. Left menu **Domains** → **Add domain** → type `YOUR-DOMAIN` → Region: **Tokyo (ap-northeast-1)**
   (the closest to India; any region works) → **Add**.
3. Resend shows **3 or 4 records** (types **MX**, **TXT**, and maybe a **DMARC** TXT). At your domain
   company's **DNS** page (log in where you bought the domain → **My domains** → `YOUR-DOMAIN` →
   **DNS** / **Manage DNS**; this works even before step 1), **add each one exactly as Resend shows it**: same Type, same
   Host/Name (for example `send` or `resend._domainkey`; some companies add `.YOUR-DOMAIN` by
   themselves, so type only the part Resend shows before your domain), same Value, and for the MX
   the same Priority (usually 10). Use Resend's copy buttons.
   These records are only for sending email; they don't touch the website records from step 1.
4. Back in Resend → **Verify DNS records**. It can take a few minutes to a few hours. Each line turns
   **Verified**.

### 7.2 The key
1. Resend → **API Keys** → **Create API Key** → Name `dream-kitchen`, Permission **Sending access**,
   Domain `YOUR-DOMAIN` → **Add**. Copy the key (starts with `re_`). **It is shown only once.**
2. Netlify (step 5.2), add:

   | Key | Value | Secret? |
   |---|---|---|
   | `RESEND_API_KEY` | the `re_…` key | **yes** |
   | `EMAIL_FROM` | `Dream Kitchen <orders@YOUR-DOMAIN>` | no |

3. Redeploy (step 5.5).

### 7.3 "Forgot password" emails through Resend
Supabase's own email service only writes to its team members, so Hema's reset emails must go
through Resend:
1. Supabase → **Authentication** → **Emails** → **SMTP Settings** → turn on **Enable custom SMTP**:
   - **Sender email**: `orders@YOUR-DOMAIN` · **Sender name**: `Dream Kitchen`
   - **Host**: `smtp.resend.com` · **Port**: `465` · **Username**: `resend`
   - **Password**: the same `re_…` key from 7.2
   - **Save changes**.
2. Same page, **Rate limits** (if shown): leave the default.
3. **The words in the email** (optional, but friendlier than Supabase's): **Authentication** →
   **Emails** → **Templates** → **Reset Password**:
   - **Subject**: `Reset your Dream Kitchen password`
   - **Body** (replace everything, keep `{{ .ConfirmationURL }}` exactly as it is: Supabase fills in
     the link):
     ```html
     <h2>Dream Kitchen admin</h2>
     <p>Someone asked to reset the admin password. If it was you, tap the button and choose a new password.</p>
     <p><a href="{{ .ConfirmationURL }}" style="background:#C9A227;color:#0F0F0F;padding:12px 20px;border-radius:8px;text-decoration:none;font-weight:bold">Choose a new password</a></p>
     <p>The link works once, for one hour. If you didn't ask, ignore this email: nothing changes.</p>
     ```
   - **Save changes**.

**If the reset email doesn't come:** look in **Spam**. In Resend → **Emails** you see every email
Supabase sent through it: no line there = the SMTP settings in 7.3.1 are wrong (most often the
password is not the `re_…` key, or the sender is not `@YOUR-DOMAIN`, or the domain is not
**Verified** yet in 7.1). If the email comes from **"Supabase Auth"** instead of Dream Kitchen,
custom SMTP is not switched on. If the link opens a page that says the link has expired, ask for a
new one: each link works once, for one hour.

✅ **Check (all three):**
- Setup check: **Resend (emails): OK** (red "test sender" means `EMAIL_FROM` is missing).
- On the website, **Contact** → send a message with your own number. Hema's inbox
  (dreamkitchen.web01@gmail.com) gets **"Message: …"** within a minute. First time: check **Spam**
  and tap **Not spam**.
- **Forgot password, all the way:** open `https://dreamkitcheno1.netlify.app/admin` in a private window → **Forgot
  password?** → `dreamkitchen.web01@gmail.com` → **Send me the link**. The email arrives from
  `orders@YOUR-DOMAIN`. Tap the link: it opens `https://dreamkitcheno1.netlify.app/admin/reset`. Type a new password
  twice → **Save new password** → **Log in with the new password** works. (Then tell Hema the new password in person, or let her do this herself.)

## Step 8. The daily keep-alive (2 minutes)

Free Supabase projects **pause after a week with no visits**. The website now wakes the database
every morning at 9:00 by itself (a "scheduled function" called **keep-alive**), so it never pauses.
To start it now instead of tomorrow morning:
1. Netlify → your site → **Logs** (or **Logs & metrics**) → **Functions** → **keep-alive**.
   (It shows the label **Scheduled**.)
2. Tap **Run now**. The log shows `keep-alive: ok, run 1`. (If the log looks empty, change the time
   filter from "Real-time" to "Last hour".)

✅ **Check:** Setup check: **Daily keep-alive: OK**, "Last run: today". From now on it updates every
day by itself. If it is ever red ("hasn't run for over 2 days"), tap **Run now** again and look at
its log.

## Step 9. Razorpay: online payments (1 hour)

Hema's Razorpay account is approved. Log in to **dashboard.razorpay.com** with her login (she may
need to read you an OTP).

### 9.1 The website address in Razorpay
1. **Account & Settings** → **Business website detail** (under "Website and app settings").
2. **Add / Edit website** (the pencil) → type `https://dreamkitcheno1.netlify.app` → **Proceed** / **Submit**.
   Razorpay checks the website and its policy pages by itself: Contact, Terms, Privacy, Refund &
   Cancellation, Shipping are all on the site, readable without JavaScript, and linked in every
   page's footer. If it asks for the pages' addresses:
   `https://dreamkitcheno1.netlify.app/contact`, `/terms`, `/privacy`, `/refund`, `/shipping`, prices on `/menu`.
3. A changed website can take Razorpay 1–2 days to approve. Test mode (9.2 to 9.4) works meanwhile.

### 9.2 Test keys (no real money)
1. Top of the dashboard: switch to **Test Mode**.
2. **Account & Settings** → **API Keys** → **Generate Key** (or **Regenerate**). Copy the **Key Id**
   (starts `rzp_test_`) and the **Key Secret** (shown once: download or copy it now).
3. Netlify (step 5.2):

   | Key | Value | Secret? |
   |---|---|---|
   | `RAZORPAY_KEY_ID` | `rzp_test_…` | no |
   | `RAZORPAY_KEY_SECRET` | the Key Secret | **yes** |

### 9.3 Test webhook (confirms payments even if the customer closes the page)
1. Still in **Test Mode**: **Account & Settings** → **Webhooks** → **+ Add New Webhook**.
2. **Webhook URL**: `https://dreamkitcheno1.netlify.app/api/razorpay-webhook`
3. **Secret**: make up a long password (30 random letters and numbers from your password manager).
4. **Alert email**: `dreamkitchen.web01@gmail.com`.
5. **Active events**: tick **payment.captured** and **order.paid** (nothing else needed).
6. **Create Webhook**.
7. Netlify: `RAZORPAY_WEBHOOK_SECRET` = the same made-up secret (**secret**). **Redeploy** (5.5).

### 9.4 Test payments
✅ **Check:**
- Setup check: **Razorpay: OK**, with "TEST keys".
- **Test order:** on the website order one **Almond Bar** with your own name, number and email →
  **Pay**. In the Razorpay window choose **UPI**, type `success@razorpay`, pay. You land on **"Thank
  you! Your order is placed"** with **Payment received**.
  - Hema's inbox: **"New paid order DK-… – ₹…"**. Your inbox: **"Your Dream Kitchen order DK-…"**.
  - Admin → **Orders** → **Paid**: the order is there.
- **Closed window:** order again, tap **Pay**, close the Razorpay window: the page says nothing was
  charged and **Pay** works again.
- **Test class booking:** **Classes** → **Book now** → pick a class, weekend, slot → pay with
  `success@razorpay` → **"Your seat is booked!"**. Admin → **Classes** shows it.
- In Razorpay (Test Mode) → **Webhooks** → your webhook → recent deliveries show **200 / success**.

### 9.5 Live keys (real money)
1. Switch the dashboard to **Live Mode** → **API Keys** → **Generate Key** (`rzp_live_…`).
2. Live Mode → **Webhooks** → **+ Add New Webhook**: same URL, same two events, a **new** made-up
   secret.
3. Netlify: **edit** the three values (tap the variable → **Edit**): `RAZORPAY_KEY_ID` = `rzp_live_…`,
   `RAZORPAY_KEY_SECRET` = the live secret, `RAZORPAY_WEBHOOK_SECRET` = the new webhook secret.
   **Redeploy**.

✅ **Check:** Setup check: **Razorpay: OK**, "Live". Place one small **real** order (₹150 Almond Bar,
pay with your own UPI). It arrives as **Paid**. Then in the admin: open it → **Cancel order**
(reason "test"), and in Razorpay **Live Mode** → **Transactions** → **Payments** → that payment →
**Issue Refund** (full). Write "refunded, test order" in the order's **Refund note**.

## Step 10. The full journey, once (20 minutes, test keys are best: do it before 9.5)

1. Phone A (customer): order something → pay (`success@razorpay` in test mode).
2. Hema's inbox: **New paid order**. Customer's inbox: **confirmation**.
3. Admin (phone B): **Orders** → **Paid** → open it → tap **Preparing**, then **Shipped** (type the
   courier name and tracking number) and confirm.
4. Phone A: **Track Order** → order ID + phone → shows **Shipped** with the tracking number.
5. Customer's inbox: **"Your order DK-… is on its way"**.
6. Admin: tap **Delivered**.

## Step 11. Setup check: all green

Open `https://dreamkitcheno1.netlify.app/admin/setup`. Every row green: Supabase, Resend, Razorpay (Live), Order
alert email, UPI (shows "Not needed: Razorpay is on"), Daily keep-alive, Website address.

---

## All the Netlify variables, in one place

| Key | What | Secret? | Step |
|---|---|---|---|
| `SUPABASE_URL` | Supabase Project URL | no | 3 |
| `SUPABASE_ANON_KEY` | Supabase publishable key (or legacy `anon`) | no | 3 |
| `SUPABASE_SERVICE_ROLE_KEY` | Supabase secret key (or legacy `service_role`) | **yes** | 3 |
| `HEMA_EMAIL` | where order alerts go (Hema can change it in Settings) | no | 5 |
| `RESEND_API_KEY` | Resend key, `re_…` | **yes** | 7 |
| `EMAIL_FROM` | `Dream Kitchen <orders@YOUR-DOMAIN>` | no | 7 |
| `RAZORPAY_KEY_ID` | `rzp_test_…`, later `rzp_live_…` | no | 9 |
| `RAZORPAY_KEY_SECRET` | Razorpay Key Secret | **yes** | 9 |
| `RAZORPAY_WEBHOOK_SECRET` | the secret you made up for the webhook | **yes** | 9 |
| `UPI_ID` | optional backup while Razorpay is off; easier in admin Settings | no | – |

None of these reach a customer's browser: only the server functions read them, and
`node scripts/check-secrets.mjs` checks every build for keys and even for these names.

## Good to know

- **UPI as a backup** (only while Razorpay is off): admin → **More** → **Settings** → **UPI** → Hema's
  UPI ID and QR. Customers then pay by UPI and type the 12-digit reference; Hema confirms it. Once
  Razorpay is on, UPI is hidden by itself.
- **Backups:** once a month, admin → **More** → **Reports** → download the orders and class bookings
  (CSV) and keep the files.
- **If the login is forgotten and the reset email doesn't come:** Supabase → **Authentication** →
  **Users** → the user → **⋮** → **Send password recovery**, or set a new one in **SQL Editor**
  (change both values, then Run):
  ```sql
  update auth.users set encrypted_password = crypt('NEW-PASSWORD-HERE', gen_salt('bf')) where email = 'dreamkitchen.web01@gmail.com';
  ```
- **After 30 days without using the admin**, it asks to log in again (safety if a phone is lost).
- **New products:** Hema adds them herself (admin → Menu → **Add a new product**). Only a new kind of
  *option* (like "name on the box" for another category) needs the developer.
- **Trying things on your own computer** needs no accounts: `npm run dev` uses a practice database
  in `.dev-data/`. Put `DK_DEV_ADMIN_EMAIL` and `DK_DEV_ADMIN_PASSWORD` (your choice) in a local
  `.env` file to log in to the practice admin.
