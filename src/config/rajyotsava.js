/*
  Kannada Rajyotsava, DISPLAY ONLY (28 Oct 2026). The one place that decides it.

  Hema lowered her menu prices by hand for November, so the website takes nothing off: customers
  pay exactly the menu prices (src/lib/offers.js ignores the old Rajyotsava offer row in the
  database, on the website and on the server). Between these dates (Indian time, both days
  included: 1 Nov 12:00 AM to 30 Nov 11:59 PM IST) the website only SHOWS the festival:
    - a "50% OFF" badge on every product card and product sheet (the price stays the real price),
    - the Rajyotsava banner on Home, the Offer Zone (/menu?offer=zone) and its button in the header,
    - the popup once per visit (src/components/festival/),
    - the faint, softly waving Karnataka flag behind the page (still with "reduce motion").
  Before and after these dates, or with enabled: false, none of it shows.
*/
export const rajyotsava = {
  enabled: true,
  startsOn: '2026-11-01',
  endsOn: '2026-11-30',
  // The number on the badges, banner and popup. It never changes a price.
  percent: 50,
  // How strong the flag behind the page is, in percent (6 to 8 keeps every text easy to read)
  flagOpacity: 7,
}
