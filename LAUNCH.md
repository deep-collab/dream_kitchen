# Before going live

Tick each line once it is true. Lines already ticked were checked in Step 5 (see `docs/PROGRESS.md`).

## Hema's details (`src/config/site.js`)
- [x] Phone and WhatsApp number defined in one place (`PHONE`, +91 95357 06956); a test fails if it is typed anywhere else
- [ ] Hema confirms that number is the one customers should call and WhatsApp
- [ ] Call hours confirmed and filled in (`hours`; hidden everywhere until then)
- [ ] Delivery charge confirmed and filled in (`delivery.charge`; until then cart, checkout and the WhatsApp order say Hema confirms it)
- [ ] FSSAI licence number filled in, if she has one (`fssai`; shown in the footer and on Contact once filled)
- [ ] Email (`email`) and shelf life (`shelfLife`): filled in or left empty on purpose
- [ ] Final web address in `url` (used by the sitemap, robots.txt and Google)
- [x] Her menu: 35 items, prices and words as she gave them (Step 2)
- [ ] Hema looks through the live menu once and confirms every price

## Classes
- [x] Switched off (`classes.enabled: false`): no page, link, home section, FAQ answer or sitemap entry
- [ ] Decision: keep them off, or replace the SAMPLE classes in `src/data/classes.js` with her real ones (dates, times, prices, seats), confirm payment and booking rules, then set `classes.enabled: true`

## Kannada
- [ ] Hema checks the first table in `docs/kannada-priority-for-hema.md` (54 lines: ordering, booking, errors) and corrections are made
- [ ] The rest ("Later, if you have time"), whenever she can

## Netlify
- [x] `netlify.toml`: build `npm run build`, publish `dist`, Node 22, long caching for hashed files
- [x] `public/_redirects`: every page address opens the site (refreshing /shop or /product/… works)
- [x] Unknown addresses show the "page melted away" page in both languages, with Call and WhatsApp, and tell Google not to list it
- [ ] Site connected to the GitHub repository; first deploy succeeds
- [ ] Custom domain (if any) added and HTTPS on
- [ ] On the live site: open `/shop`, refresh, and open `/no-such-page` (shows the 404 page)

## Test on the live site, from a phone
- [x] Checked with WhatsApp stubbed: every Call link is `tel:+919535706956`, every WhatsApp link goes to 919535706956 (1,112 links, 0 wrong)
- [ ] Place one real test order: it arrives in Hema's WhatsApp, complete and readable
- [ ] Send one call-back request and one voice message: both arrive
- [ ] Tap Call on a phone: it rings Hema
- [ ] Switch to ಕನ್ನಡ and back once: everything changes and the cart stays

## Quality (Step 5)
- [x] 241 unit tests pass, string checks clean, build clean
- [x] 4 widths × English and Kannada: no sideways scroll, no clipped text, every tap target 48px or more, no English left on Kannada pages
- [x] First visit downloads 45–66 KB of JavaScript in English (was 149 KB), 59–79 KB in Kannada; English visitors never download Kannada
- [x] Lighthouse mobile, before and after: see `docs/PROGRESS.md`
