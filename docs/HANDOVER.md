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

## Changing a product's name or description (23 Oct 2026)

Admin → **Menu** → find the product. Under the prices are the buttons **Save**, **Mark sold out**,
**Edit name**, **Description** and **Hide from menu**.

- **Edit name**: type the English name (and the Kannada name if you like; empty = Kannada readers see
  the English) → **Save name** → green **"Name saved. It is on the website now."**
- **Description**: the short text customers see when they tap the product, above the choices. English,
  and Kannada if you like. At most **200 letters**: the counter under the box shows how many are used
  (it turns red when full) → **Save description**.
- The product keeps its place, price, photo and old orders. Old orders keep the name they were
  ordered under.
- **Back to original** (on products from the first menu) puts the old name, description and prices back.

## Adding a new product

1. Admin → **Menu** → scroll to the section (Brownie Tubs, Delight Boxes, Brownies or Chocolates) →
   at the bottom tap the big gold **+ Add new product**.
2. Fill in: the name (English; Kannada optional), a short description, **one price** or **different
   sizes, each with its price**, **ragi version** (No, or Yes and the extra price), the **courier
   charge** (small or medium parcel), and a photo if you have one (no photo = the gold drawing).
3. Tap **Add to menu** → **"Added. It is on the website menu now."**

The website checks every price again on the server for every order, so a customer can never pay a
wrong price. There is no Delete for products: **Hide from menu** takes one off the website and keeps
old orders whole.

## Photos on the Customize page

Admin → **Menu** → the **Customize page** section (last, or tap **Customize page** at the top). Three
photos, each with its own **Change photo** button:
- the **"Delight Box with a name or a drawing"** tile on the Customize page,
- the **"Drawing Chocolate Bar"** tile on the Customize page,
- the **Customize** tile and the hand-drawn chocolates card on the **Home** page.

Until you change one it shows the product photo it always had. **Use the product photo again** undoes
it. Same as product photos: two sizes, live at once, only your admin login can change them.

## Offers (new tab, 23 Oct 2026)

The bottom bar of the admin is now **Home · Orders · Offers · Classes · Menu · More**.

An offer is a black-and-gold banner at the **very top of the Home page** (and a slim strip at the top
of the Menu page). **Offers only show a banner. They do not change prices.** If an offer has a special
price, change the price yourself in **Menu** (and change it back when the offer ends).

**Add an offer**
1. Admin → **Offers** → **+ Add new offer**.
2. **Title** (English; Kannada optional), a **short message** (optional, up to 120 letters).
3. **Where the button goes**: a menu section (e.g. Delight Boxes), the Customize page, or one product.
   **Button text** is optional (empty = "See offer"). Choose **No button** for a message only.
4. **Start date** and **end date** (Indian time, both days included: from midnight at the start of the
   first day to midnight at the end of the last).
5. **Banner photo** (optional) and the **On** switch.
6. Look at **How it looks on the website**, then **Add offer**.

**The list** shows each offer with its state:
- **Live**: on the website now. **Scheduled**: it starts on its start date by itself.
- **Ended**: its end date has passed (it left the website by itself). **Off**: switched off.

**Edit** changes anything. **Turn off** takes it off the website at once (Turn on puts it back).
**Delete** asks "Are you sure?" first and cannot be undone.

On the website: with more than one live offer they take turns every 6 seconds, with dots to pick one;
tapping goes to the section or product. With no live offer, nothing shows.

**Try it first** in the practice admin (`/admin/demo` → **Offers**): it has sample offers in every state.

## One-time step for Jashwanth (23 Oct 2026): run the new database part

Offers and the Customize photos need two new tables. **Until this is done the website works as
before, just without offers** (and the admin's Offers page shows an error). Do it **before** the new
code goes live. There are two ways, depending on where the website runs:

**If the website runs on Cloudflare (Workers + D1, the new GitHub repo's `main`):** on the computer
with the code, in the project folder, run `npm run d1:migrate -- --remote` (log in to Cloudflare first
with `npx wrangler login` if it asks). It adds only the new part (`d1/migrations/0002_…`); orders and
Hema's prices stay. Check `/admin/setup`: the database row is green. Details:
`docs/CLOUDFLARE-D1-SETUP.md`, step 2.4b.

**If the website runs on Netlify + Supabase:**

1. Open **supabase.com** → log in → the **Dream Kitchen** project.
2. Left menu → **SQL Editor** → **New query**.
3. Open `supabase/setup-all.sql` (in the GitHub repository: the file → **Raw** → select all → copy).
   Paste **all** of it into the editor.
4. Tap **Run** (bottom right). It should say **Success. No rows returned**. It is safe to run again: it
   never deletes orders or undoes Hema's prices.
5. Check: open `/admin/setup`; every row should be green. Then admin → **Offers** opens without an error.

(The new part alone is `supabase/migrations/20261023000001_offers_and_page_photos.sql`; running the
whole `setup-all.sql` is simpler and does the same.)

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
- Prices, sold out, hide/show, photos, names and descriptions, **new products**, the Customize page photos
- **Offers**: banners on the website with start and end dates (they never change prices)
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
