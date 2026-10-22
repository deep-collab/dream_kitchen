# Dream Kitchen website: handover

For Hema (the owner of Dream Kitchen) and Jashwanth (who looks after the website).
Plain words; nothing here needs any coding.

## The links

| What | Address |
|---|---|
| **The website** | `https://dreamkitcheno1.netlify.app` |
| **Hema's admin** (orders, classes, menu, settings) | `https://dreamkitcheno1.netlify.app/admin` |
| **Practice admin** (made-up orders, nothing is real) | `https://dreamkitcheno1.netlify.app/admin/demo` |
| **Setup check** (is everything working?) | `https://dreamkitcheno1.netlify.app/admin/setup` |
| Hema's guide to the admin, with pictures | `docs/admin-guide-for-hema.md` |
| Jashwanth's step-by-step setup guide | `docs/SETUP-BACKEND.md` |

**Your own domain** (bought, not connected yet): once Jashwanth connects it (step 1 of
`docs/SETUP-BACKEND.md`), every link above starts with your domain instead, for example
`https://dreamkitchenblr.in/admin`. The old links keep working: they move you to the new address.
`YOUR-DOMAIN` below means that domain.

## How Hema logs in

1. Open `https://dreamkitcheno1.netlify.app/admin` on her phone. (Tip: in Chrome, **⋮** → **Add to Home screen**,
   then it opens like an app.)
2. Email: **dreamkitchen.web01@gmail.com**. Password: the one she and Jashwanth chose (never sent in a
   chat or email).
3. Tap **Log in**. She stays logged in. After 30 days without opening the admin it asks again.

## Changing a product photo

Hema can put a new photo on any product herself, from her phone. No developer, no redeploy.

1. Admin → **Menu** → find the product → tap the big black **Change photo** button.
2. The phone asks: pick a photo from the **gallery** (or take one with the camera).
3. Wait a few seconds ("Uploading photo…") until the green **"Photo saved. It is on the website now."**
4. Open the website: the new photo is there. (If an open page still shows the old one, pull down to
   refresh.)

Good to know:
- **Square photos look best**, with the product in the middle: the admin cuts the middle square.
- The phone makes the photo ready by itself: two sizes, **1200 × 1200** (product pages, computers)
  and **600 × 600** (the menu on phones), as WebP. A big 5 MB phone photo becomes about 100–200 KB, so
  the website stays fast.
- **If it fails** (no signal, a file that isn't a photo), it says so in red, and **nothing changes**:
  the website keeps showing the current photo. Just tap **Change photo** again.
- **Use the old photo** puts the built-in photo back (on products Hema added: **Remove photo**,
  then the gold drawing shows).
- If a photo ever fails to load on the website, the site quietly shows the previous photo (or the
  gold drawing) instead of a broken image.
- Only Hema's admin login can change photos. The photos live in Supabase → **Storage** →
  **product-photos** (public, because they are on the menu); the address of each product's photo is
  in the **products** table, column **photo_url**. Old photos stay in storage; they cost nothing
  that matters on the free plan.

**One-time step for Jashwanth (22 Oct 2026):** run `supabase/setup-all.sql` again (Step 4 of
`docs/SETUP-BACKEND.md`). It adds the "only Hema's admin login may change product photos" rules to
the photo storage. Changing photos already works before this; this writes the rule into the
database itself as well.

## Forgot password

1. On the log in page tap **Forgot password?**
2. Type **dreamkitchen.web01@gmail.com** → **Send me the link**.
3. Open the email (from `orders@YOUR-DOMAIN`; look in Spam the first time) → tap the link.
4. Type a new password two times → **Save new password** → **Log in with the new password**.
5. The link works once, for one hour. If it says "This link has expired or was already used", go back
   to step 1 and ask for a new one.

If no email comes within 10 minutes: Jashwanth can send a new link from Supabase (→ **Authentication**
→ **Users** → the user → **Send password recovery**), or set a password there (see "Good to know" in
`docs/SETUP-BACKEND.md`).

## What happens when a customer orders

1. The customer pays on the website (Razorpay: UPI, card or net banking).
2. Hema gets an email: **"New paid order DK-… – ₹…"**. The customer gets a confirmation (if they gave
   an email).
3. In the admin, **Orders** → **Paid** shows it. Hema taps **Preparing**, then **Shipped** (courier
   name and tracking number), then **Delivered**. The customer gets an email at each step and can
   follow it on **Track Order**.
4. The money goes to Hema's bank account from Razorpay (Razorpay's usual settlement, about 2 working
   days).

Class bookings work the same way (admin → **Classes**).

## If something breaks

Start with the **Setup check** page (`/admin/setup`): each red row says what is wrong and which step
of `docs/SETUP-BACKEND.md` fixes it.

| What you see | What to do |
|---|---|
| The website says **"Online ordering opens soon – WhatsApp us"** | The database or Razorpay isn't reachable. Open the Setup check. If Supabase is red and says "paused", open supabase.com → the project → **Restore** (the daily keep-alive should stop this from ever happening). |
| Hema gets **no order emails** | Look in Spam first. Setup check → Resend. In Resend → **Emails** you can see every email sent and whether it arrived. |
| A customer paid but the order says **"Not paid yet"** | Wait 5 minutes (the webhook confirms it). Still not paid: check in Razorpay → **Transactions** → **Payments**. If the money is there, open the order in the admin → **Payment received**. |
| The website shows an **old version** after a change | Netlify → **Deploys**: the top line must say **Published**. If it says Failed, or "Auto publishing is locked", see Step 0 of `docs/SETUP-BACKEND.md`. |
| **"Powered by Netlify"** card appears | Netlify → **Project configuration** → **General** → **Powered by Netlify badge** → off. |
| The website is **down** completely | Check `https://www.netlifystatus.com`. If Netlify is fine, check the domain hasn't expired at the company you bought it from. |
| Hema can't log in | **Forgot password** (above). |

Nothing breaks the orders already saved: they are in the database, and Hema can always download them
(admin → **More** → **Reports** → CSV).

## Who looks after what

**Hema does, in the admin (no developer needed):**
- Orders and class bookings: every step, emails go out by themselves
- Prices, sold out, hide/show, photos, names and descriptions, **new products**
- Courier charges, preparation days, class fees, times, seats and closed weekends
- The order-alert email, a short notice on the website, closing the shop for a holiday

**Jashwanth maintains:**
- **The accounts**, all under dreamkitchen.web01@gmail.com where possible: Netlify (hosting),
  Supabase (database), Resend (emails), the domain company, GitHub (the code). Razorpay is Hema's own.
- **Renewing the domain every year** (turn on auto-renew at the domain company).
- **The Netlify environment variables** (keys) and redeploying after a change.
- **Once a month:** open the Setup check (all green?), and download the month's orders and bookings
  CSV from Reports as a backup.
- **Changes to the website itself** (new pages, new kinds of options, new text): with a developer or
  Claude, in the GitHub repository. Every saved change goes live by itself in about 2 minutes.
- **If a key leaks:** make a new one in that service, put it in Netlify, redeploy, delete the old one.

## What it costs

- Netlify, Supabase, Resend: free plans (Supabase free stays awake thanks to the daily keep-alive;
  Resend free sends up to 3,000 emails a month).
- The domain: yearly renewal at the domain company.
- Razorpay: a small fee per payment (taken from each payment), nothing monthly.
