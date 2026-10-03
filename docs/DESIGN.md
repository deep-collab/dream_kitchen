# Dream Kitchen design plan

The source of truth is PART 1 of BUILD_BRIEF.md, mirrored in CLAUDE.md. This file turns it into tokens, rules and layouts. Tokens are implemented in `src/index.css` (`@theme`, Tailwind 4), which also exposes every token as a CSS variable.

The design idea is **a box of chocolates from a careful home kitchen**. Black and gold appear where the brand speaks: header, hero, footer, loading screen. Warm cream and champagne paper appear where customers read and choose. Gold is rare, so it means something.

---

## 1. Colour tokens

| Token | Hex | Use |
|---|---|---|
| `ink` | `#0F0F0F` | Hero, header, footer, mobile bar, primary buttons on light |
| `gold` | `#C9A227` | Accents, icons on dark, prices on dark, focus ring, hairlines |
| gold gradient | `#EBD27A → #D4AF37 → #B8901E` | Symbol, wordmark, large display text on black |
| `champagne` | `#F3E7CF` | Alternate sections, selected states on light |
| `cream` | `#FFF9EF` | Main page background, cards on champagne |
| `brown` | `#2A1D16` | Body text and headings on light |
| `muted` (muted gold) | `#CDBF9E` | Secondary text on black |

Derived tokens. These are not new brand colours, only tints needed for UI states:

| Token | Hex | Why |
|---|---|---|
| `brown-2` | `#5C4A3F` | Secondary text on light (brown mixed toward cream). 8.0:1 on cream, 6.8:1 on champagne |
| `line` | `#E6D7BA` | Neutral 1px borders on light (champagne, one step darker) |
| `ink-2` | `#1C1A17` | Raised surface on black (menu rows, sheet header on dark) |
| `whatsapp` | `#1A7A43` | WhatsApp button only. Kept for recognition by older customers; white text is 5.5:1 |
| `error` | `#A1281E` | Error text and borders. 6.6:1 on cream |

### Contrast, checked against WCAG AA
| Pair | Ratio | Verdict |
|---|---|---|
| brown on cream | 15.6 | AA/AAA body |
| brown on champagne | 13.3 | AA/AAA body |
| brown-2 on cream | 8.0 | AA body |
| gold on ink | 7.9 | AA body, so gold text on black is fine at any size |
| muted on ink | 10.5 | AA body |
| ink on gold (gold button) | 7.9 | AA |
| gold on ink (black button, gold label) | 7.9 | AA |
| cream on ink | 18.4 | AA |
| **gold on cream** | **2.3** | **Fails. Never gold text on cream or champagne** |

### Gold rules: where gold may and may not appear
**Gold may appear in:**
- the symbol and wordmark (gradient)
- text and icons on black
- large display text on black (tagline)
- prices on black
- 1px hairline rules on any surface (decorative, not text)
- the focus ring
- the count badge on black surfaces
- the selected-state border of radio cards and chips (always paired with a non-colour cue: tick and weight)

**Gold never appears in:**
- text, labels or icons on cream or champagne
- large filled areas on light pages (no gold section backgrounds)
- error or status messaging
- more than one gold-filled button per screen

**On light surfaces:** text is brown and buttons are black with gold or cream labels.

---

## 2. Typography

Families, each with a real fallback stack:
- **Wordmark:** `Cinzel` 600 → `"Trajan Pro", "Times New Roman", Georgia, serif`. Logo lockup only.
- **Headings:** `Cormorant Garamond` 600, sentence case → `Garamond, "Times New Roman", Georgia, serif`
- **Body:** `Lato` 400/700 → `system-ui, -apple-system, "Segoe UI", Roboto, sans-serif`
- **Kannada headings:** `Noto Serif Kannada` 600 (listed after Cormorant, so Latin stays Cormorant and Kannada glyphs fall through)
- **Kannada body:** `Noto Sans Kannada` 400/700 (after Lato)
- Kannada fonts are requested only when the language is Kannada. The link is injected on switch, or early in `<head>` if the stored language is Kannada.

### Scale (px). Mobile is below 768, desktop is 1024 and up. Tablet uses mobile sizes up to `md`, then desktop.
| Role | Font | Mobile size / line height | Desktop size / line height | Weight | Notes |
|---|---|---|---|---|---|
| Wordmark (stacked, hero/loader) | Cinzel | 40 / 1.0 | 60 / 1.0 | 600 | 0.04em tracking, two lines "DREAM / KITCHEN" like the printed logo |
| Wordmark subline | Cinzel | 14 / 1.3 | 18 / 1.3 | 600 | 0.24em tracking, flanking hairlines, "Handmade / Chocolates" |
| Wordmark (header) | Cinzel | 15 / 1.05 (two lines) | 20 / 1.1 (one line) + 11px subline | 600 | Logotype, exempt from the minimum-size rule |
| Tagline (display) | Cormorant italic | 24 / 1.25 | 32 / 1.2 | 600 | Gold gradient text, only on black |
| h1 | Cormorant | 40 / 1.08 | 56 / 1.05 | 600 | Kannada ×0.8 size, 1.35 line height |
| h2 | Cormorant | 32 / 1.12 | 44 / 1.1 | 600 | Kannada ×0.8 |
| h3 | Cormorant | 24 / 1.2 | 28 / 1.2 | 600 | Kannada ×0.85 |
| Lead | Lato | 20 / 1.55 | 22 / 1.55 | 400 | |
| **Body (base)** | Lato | **18 / 1.65** | **18 / 1.65** | 400 | Kannada line height 1.8 |
| Small (minimum UI text) | Lato | 16 / 1.5 | 16 / 1.5 | 400/700 | Nothing smaller in the UI |
| Button md | Lato | 18 / 1.2 | 18 / 1.2 | 700 | |
| Button lg | Lato | 20 / 1.2 | 20 / 1.2 | 700 | |
| Price | Lato | 20 / 1.2 | 22 / 1.2 | 700 | `tabular-nums`. Cormorant's old-style figures are too fussy for prices |
| Label | Lato | 18 / 1.4 | 18 / 1.4 | 700 | |

---

## 3. Space, radius, shadow, rules

**Spacing.** The Tailwind 4px base unit is kept. Rhythm tokens:
- gutter: 16 (below 640), 24 (640 and up), 32 (1024 and up)
- section padding: 64 mobile, 96 desktop
- container: 1200 max, reading measure 40rem
- stack gaps: 8 / 12 / 16 / 24 / 32 / 48

**Radius follows hierarchy, not one value everywhere:**
| Level | Radius | Used for |
|---|---|---|
| Inline | 6px | Badges, count pills inside text |
| Control | 12px | Buttons, inputs, radio cards, icon buttons, notice strip items |
| Container | 20px | Cards, tiles, notices, desktop menu panels |
| Overlay | 28px | Sheet top corners (mobile). The desktop side panel is flush with square corners |
| Pill | 9999px | Chips, quantity stepper, language toggle, cart count |

Rule: a child's radius is never larger than its parent's.

**Shadows are minimal.** There are only two:
- `shadow-overlay`, for the sheet and mobile menu: `0 -12px 48px -12px rgb(0 0 0 / .45)`
- `shadow-press`, for gold buttons on black: `inset 0 1px 0 rgb(255 255 255 / .25)`, a highlight rather than a drop shadow

Cards on light surfaces use a 1px `line` border and no shadow.

**Gold hairline rules:**
- Section divider: 1px tall, `linear-gradient(90deg, transparent, gold 18%, gold 82%, transparent)` at 70% opacity, centred, max 1200px wide
- Header and footer edge: solid 1px `gold / 45%`
- Wordmark flanking rules: 1px solid gradient gold, 28–40px long

**Focus ring:** a 3px gold outline, 3px offset, with a 3px ink inner halo (`box-shadow`). It is visible on cream (ink halo, 18:1) and on black (gold, 7.9:1).

**Motion:**
- The only signature moment is the loading screen handing over to the hero.
- Taps get feedback: button press scale 0.98, count badge pop, sheet slide (260ms, `cubic-bezier(.2,.8,.2,1)`).
- No scroll-triggered fade-ins.
- `prefers-reduced-motion` removes the watermark drift, sparkle twinkle, sheet slide (it switches to a fade) and smooth scroll.

---

## 4. Wireframes

### Loading screen (all sizes, about 1.8s)
```
┌──────────────────────────────┐
│                              │   0.00–0.80  symbol outline draws (gold stroke)
│            ╭╮ ✿              │   0.60–1.00  gradient fill rises, stroke fades
│          (pod)(cup)          │   0.90–1.30  one diagonal shimmer passes
│                              │   0.75–1.10  wordmark fades up
│            DREAM             │   0.95–1.30  tagline fades up
│           KITCHEN            │   1.35–1.80  exit:
│     ── HANDMADE ──           │      on "/" the lockup glides into the hero
│         CHOCOLATES           │      lockup and black dissolves into the hero
│                              │      elsewhere the black curtain lifts up
│  Turning your cravings into  │   hard cap 2.5s · tap/any key = skip
│      sweet memories.         │   reduced motion: static symbol 0.5s
└──────────────────────────────┘
```

### Header
```
Mobile (<768), 64px, black, 1px gold rule below
┌─────────────────────────────────────────────┐
│ [sym] DREAM     [ಕನ್ನಡ] [📞 Call] [≡ Menu]  │
│       KITCHEN                               │
└─────────────────────────────────────────────┘
 Cart lives in the bottom bar on mobile.

Tablet (768–1279), 72px
┌──────────────────────────────────────────────────────────────┐
│ [sym] DREAM KITCHEN       [EN|ಕನ್ನಡ] [📞 Call] [🛒 2] [≡ Menu] │
│       Handmade Chocolates                                    │
└──────────────────────────────────────────────────────────────┘

Desktop (≥1280), 80px
┌───────────────────────────────────────────────────────────────────────────────┐
│ [sym] DREAM KITCHEN   Shop  Classes  Our Story  Track Order  Contact          │
│       Handmade Choc.                        [EN|ಕನ್ನಡ] [📞 Call] [🛒 Cart 2]  │
└───────────────────────────────────────────────────────────────────────────────┘
```
### Pre-booking strip (below the header, all pages)
```
┌─────────────────────────────────────────────┐ black, muted-gold text, 16px
│ 🗓 Pre-booking only. Orders are dispatched   │ not dismissible, not sticky
│    after 2 business days.                   │
└─────────────────────────────────────────────┘
```

### Mobile menu (full screen, black)
```
┌─────────────────────────────────┐
│ [sym] DREAM KITCHEN      [✕ Close] │
│─────────────────────────────────│
│ 🛍  Shop                          │  56px rows, 22px labels, gold icons
│ 🎓  Classes                       │  gold hairlines between rows
│ 📖  Our Story                     │
│ 🚚  Track Order                   │
│ ✉   Contact                       │
│ ─ Gallery · FAQ (smaller row) ─   │
│                                 │
│ Language   [ English | ಕನ್ನಡ ]   │
│                                 │
│ [ 📞  Call Dream Kitchen      ]  │  gold button, lg
│ [ 🟢  Chat on WhatsApp        ]  │  green button, lg
│ Call hours: 10 am – 8 pm, Mon–Sat │
└─────────────────────────────────┘
```

### Hero
```
Mobile (360)                          Desktop (1280)
┌──────────────────────────┐   ┌─────────────────────────────────────────────┐
│  ·        ✦     (watermark│   │ ✦            [symbol 132px]      ░░░░░░░░░░░ │
│      [symbol 104px]   ░░░ │   │                  DREAM           ░ water-  ░ │
│         DREAM         ░░░ │   │                 KITCHEN          ░ mark    ░ │
│        KITCHEN        ░░  │   │          ── HANDMADE ──          ░ drifts  ░ │
│    ── HANDMADE ──         │   │             CHOCOLATES      ✦    ░░░░░░░░░░░ │
│       CHOCOLATES       ✦  │   │                                              │
│ Turning your cravings     │   │   Turning your cravings into sweet memories. │
│ into sweet memories.      │   │  Handmade chocolates, loaded brownie tubs   │
│ Handmade chocolates,      │   │  and delight boxes, made fresh to order.    │
│ loaded brownie tubs and…  │   │                                              │
│ [ Order now            ]  │   │      [ Order now ]  [ 📞 Call to order ]     │
│ [ 📞 Call to order     ]  │   │                                              │
└──────────────────────────┘   └─────────────────────────────────────────────┘
 1px gold rule ── then cream body
```

### Mobile bottom bar (<768, every page)
```
┌───────────┬───────────┬───────────┐ black, 1px gold rule on top
│    📞     │    🟢     │   🛒 (2)  │ 64px + safe-area inset
│   Call    │ WhatsApp  │   Cart    │ icon above label, 16px labels
└───────────┴───────────┴───────────┘ hidden while a Sheet/menu is open
```

### Footer
```
┌────────────────────────────────────────────────────────────┐ black
│ [stacked lockup, small]     Talk to us        Explore         │
│ Turning your cravings…      📞 +91 95357 06956  Shop           │
│                             🟢 WhatsApp         Classes        │
│                             ◎ @dreamkitchen_…  Our Story      │
│                             Call hours …       Track Order    │
│                                                Contact · FAQ  │
│────────────────────────────────────────────────────────────│ gold rule
│ © 2026 Dream Kitchen    FSSAI … (only if filled)            │
└────────────────────────────────────────────────────────────┘
 Mobile: single column, lockup centred, link groups in 2 columns.
```

### Shop page (Step 2, rough)
```
┌──────────────────────────────┐
│ h1 Our menu   [search……]     │ champagne header band
├──────────────────────────────┤
│ Brownie Tubs | Delight Boxes │ sticky category tabs (scroll-x, 48px)
├──────────────────────────────┤
│ intro + highlights           │
│ ┌────────┐ ┌────────┐        │ product rows on mobile: tile left,
│ │ tile   │ │ name   │ ₹549   │ name, short line and "from" price right,
│ └────────┘ └────────┘        │ the whole row opens the customise sheet
│ subsection "Our best sellers"│ (not identical cards everywhere)
└──────────────────────────────┘
```

### Customise sheet (Step 2, rough)
```
┌──────────────────────────────┐  bottom sheet (mobile) / right panel 480px (desktop)
│ ─── (grab handle)       [✕]  │
│ [ image tile ]               │
│ Ferrero Rocher Nutella       │
│ description…                 │
│ Size                         │
│ (•) 250g  ₹549  ( ) 500g ₹999│  RadioCards
│ Flavour  [Choc][Mango]…      │  Chips
│ Name on box (+₹100)   [ o—]  │  Toggle → TextField + live preview
│ Occasion [Birthday]…         │  Chips
│ Note to Hema [……………]          │
│ Quantity  [ – 1 + ]          │
├──────────────────────────────┤
│ [ Add to cart ₹549         ] │  sticky footer
│ Prefer to talk? Call 95357 06956 │
└──────────────────────────────┘
```

---

## 5. Component inventory

**Brand:** `Symbol` (uses the inline sprite), `Wordmark` (`horizontal` | `stacked`, tone dark), `GoldRule`

**Layout:** `Layout`, `SkipLink`, `Header`, `MobileMenu`, `NoticeStrip`, `MobileBar`, `Footer`, `Container`, `SectionHeading`, `PageHero` (page title band)

**Controls:**
- `Button`: variants `primary` | `secondary` | `call` | `whatsapp`; `tone` light | dark; sizes md | lg; `fullWidth`; renders `<button>`, `<a>` or `<Link>`
- `IconButton` (always has a visible or aria label), `Chip`, `RadioCard` (label plus price), `Toggle` (switch), `QuantityStepper`, `TextField`, `PhoneField`, `LanguageToggle` (segmented and compact)

**Display:** `Badge`, `Notice`

**Overlay:** `Sheet` (bottom sheet below 768, side panel at 768 and up). Includes `role="dialog"`, `aria-modal`, focus trap, Esc to close, focus return, scroll lock, swipe-down to close, and hides the mobile bar. The `useModal` hook is shared with `MobileMenu`.

**Icons:** lucide-react at 1.75 stroke through `components/icons.jsx`, plus custom `WhatsAppIcon` and `InstagramIcon` glyphs. No emoji.

**Dev:** the `/styleguide` route (dev builds only, `noindex`, not in the sitemap)

---

## 6. Self-review

### Against the brief
| Brief requirement | Plan | OK |
|---|---|---|
| Call visible in header on every page and size | Header Call button at every breakpoint. Mobile label shortened to "Call" / "ಕರೆ" to fit 360px | ✔ |
| Icons always paired with words | Header Call has the word. Cart shows its count plus "Cart" on desktop. Mobile menu button reads "Menu" | ✔ (changed, see below) |
| 18px base, 48px targets, no tiny text | 16px minimum UI size. Every control is at least 48×48 | ✔ |
| Gold text only on black | Contrast table plus "never" list. Focus ring halo solves gold on cream | ✔ |
| Cinzel for the wordmark only | Cinzel never used for headings, nav or buttons | ✔ |
| No all-caps outside the lockup | Removed `.eyebrow`. Nav and buttons in sentence case | ✔ |
| One signature motion | Loader to hero only. No scroll fades | ✔ |
| Loader paints before JS | Inline HTML, CSS and script, font CSS non-blocking | ✔ |
| Sections alternate cream and champagne with fine gold rules | `GoldRule` between sections, `bg-champagne` alternate | ✔ |

### Against generic AI-template tells, and what changed
1. **All-caps eyebrow labels with sparkles (✦) above headings.** These were in the old SectionHeading and PageHero. Removed. A heading stands alone. Where context helps, a plain sentence-case lead line sits *below* it.
2. **Numbered 01/02/03 markers.** Old category tiles had them on a non-sequence. Removed. Numbers stay only where order is real (Track Order steps, Step 3).
3. **Middle-dot strings** ("Handmade · Fresh · Karnataka"). Not used anywhere. The footer's first draft had "Contact · FAQ" in one cell; changed to separate list links. In the hero the support line is a real sentence, not a dot list.
4. **Arrows appended to buttons** ("Order now →"). Removed everywhere. Buttons say exactly what happens. Icons only where they carry meaning (phone, WhatsApp, cart).
5. **Identical cards everywhere.** The first draft of the shop sketch used a 2-column grid of identical cards. Changed to list rows on mobile (easier for older users, longer names fit), with the best-seller group and the bars combo given their own shapes. The home sections in Step 4 will each get a distinct form: tiles, a spotlight, a band and a story.
6. **Fade-in on every section.** Deleted the `Reveal` component.
7. **Extra tell found in review: centred everything.** The hero is centred because it echoes the printed stacked logo, but body sections will use left-aligned reading layouts on desktop.
8. **Extra tell found in review: an icon-only "hamburger".** The mobile menu button shows the word "Menu" beside the icon, per "icons always paired with words". The desktop cart shows "Cart". The mobile header cart is not needed because the bottom bar has a labelled Cart.
9. **Extra tell found in review: gradient gold everywhere.** The first draft had gold-gradient section headings on cream. That fails contrast and cheapens the gold. Now the gradient lives only in the symbol, wordmark, tagline and the primary button on black.
10. **The hero's "trust badge" row was dropped.** Four icon badges under the hero is a template staple and none of the claims were hers.
