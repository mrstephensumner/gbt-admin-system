# Great British Talent — Admin Design System

A dark, dense, back-office design system for **Great British Talent Ltd**, the parent of
**Great British Speakers** (greatbritishspeakers.co.uk) and its sister talent brands. This system
dresses the internal **back-end admin** — the tool the bookings team uses to manage speakers,
enquiries, bookings, clients and invoices — in the company's Union-Jack identity.

> **Brand source:** https://greatbritishspeakers.co.uk/ — public marketing site. Colours, the
> microphone-and-flag wordmark, and the red/navy/blue/white Union Jack palette were taken from
> there. The admin product itself is not public; screens here are a faithful **recreation of a
> conventional talent-agency back office** dressed in the brand, not a copy of a specific
> proprietary screen.

## Namespace
Components compile to `window.GreatBritishTalentAdminDesignSystem_7f945e`. In any card / kit HTML:
```js
const { Button, Table, Badge } = window.GreatBritishTalentAdminDesignSystem_7f945e;
```
Consumers link **one** file: `styles.css` (which `@import`s every token + font file).

---

## Index / manifest
- `styles.css` — global entry (import list only).
- `tokens/` — `fonts.css`, `colors.css`, `typography.css`, `spacing.css`, `effects.css`, `base.css`.
- `components/` — reusable primitives, grouped:
  - `buttons/` — **Button**, **IconButton**
  - `forms/` — **Input** (+ `FieldLabel`, `FieldMsg`), **Textarea**, **Select**, **Checkbox**, **Radio**, **Switch**
  - `display/` — **Badge**, **Tag**, **Avatar**, **Card**, **StatCard**
  - `navigation/` — **Tabs**, **NavItem**, **Pagination**
  - `feedback/` — **Dialog**, **Toast**, **Tooltip**
  - `data/` — **Table**
- `ui_kits/admin/` — full interactive admin recreation (Dashboard, Speakers, Speaker profile, Enquiries).
- `foundations/` — specimen cards for the Design System tab (Colors, Type, Spacing, Brand).
- `assets/` — logos (`GBS-LOGO.png`, `GBS-LOGO-dark.png`).
- `SKILL.md` — Agent-Skill wrapper.

---

## CONTENT FUNDAMENTALS
How copy reads across the admin.

- **Voice:** plain, professional British English. Calm and operational — this is a working tool,
  not marketing. Think "Bookings manager", not "Talent success hero".
- **Spelling & units:** UK spelling (*organise, colour, programme*). Currency in **GBP with the £
  symbol and thousands separators** — `£4,000`, `£412k`. Dates are **day-month-year**
  (`12 Aug 2026`). 24-hour or `2:30pm` time is fine; be consistent within a view.
- **Person:** address the operator as **you** implicitly ("Add speaker", "New booking"); refer to
  talent and clients in the **third person** ("Raj is on hold").
- **Casing:** **Sentence case** for everything — buttons, headings, menu items, table headers are
  the one exception (table column headers are **UPPERCASE micro-labels**, letter-spaced). Never
  Title Case UI strings.
- **Buttons / actions:** short verb-first imperatives — *Add speaker*, *New booking*, *Export*,
  *Send quote*, *Publish*. Destructive actions name the object — *Delete speaker*, not just *Delete*.
- **Status vocabulary (fixed set):** **Available · On hold · Booked · Confirmed · Cancelled** for
  talent/bookings; **New · Quoted · Confirmed · Lost** for the enquiry pipeline. Reuse these exact
  words — they map 1:1 to Badge tones.
- **Empty / helper text:** brief and factual — "Showing 8 of 1,284 speakers", "Add a day rate
  before publishing." No exclamation marks, no jokes.
- **IDs & references:** monospaced, prefixed, uppercase — `SPK-0481`, `ENQ-3092`. Always shown near
  the entity name as a dim secondary line.
- **Emoji:** **none.** The only playful mark in the whole brand is the Union Jack itself.
- **Numbers:** abbreviate large counts in KPIs (`1.2k`, `£412k`); show precise figures in tables.

---

## VISUAL FOUNDATIONS

**Overall vibe.** A dark, professional back office with a crisp patriotic accent. Near-black
chrome, generous data density, one confident red for action. Feels closer to a modern ops console
than a consumer app — restrained, legible, fast.

- **Colour.** Chrome is a ladder of cool near-blacks (`--ink-900 #0C0D10` app → `--ink-700 #1A1D23`
  cards → `--ink-600` raised/inputs). Brand accents are the Union Jack: **red `#C8102E`** leads all
  primary action and active states; **navy `#012169`** grounds (avatars, the `navy` button);
  **blue `#1E6FD9`** is interactive/informational (links, focus ring, selected rows). White and a
  grey text ladder (`#FFFFFF → #E7E9EC → #9AA0AA → #6D7480`) carry copy. Semantic: green
  available, blue booked, amber on-hold, red cancelled.
- **Type.** Display = **Archivo** (heavy 800 grotesque, echoes the bold wordmark) for headings and
  KPI values. UI/body = **Public Sans** at a 14px default. Mono = **IBM Plex Mono** for IDs, money,
  dates. Headings are tightly tracked (`-0.01em`); micro-labels are UPPERCASE at `0.08em`.
- **Spacing.** 4px base grid; component padding clusters at 12–20px; page gutter 24px. Dense but
  never cramped — table rows ~46px tall.
- **Backgrounds.** Flat solid dark fills — **no gradients, no images, no textures, no blur** in the
  chrome. The one full-bleed image moment is the login/brand splash. Overlays (dialog scrim) use a
  translucent near-black with a *slight* 2px backdrop blur only.
- **Corners.** Small on controls (buttons/inputs **6px**), medium on cards (**12px**), large on
  dialogs (**16px**), pills fully round (badges, toggles, pagination-none). Nothing sharp-cornered;
  nothing bubbly.
- **Borders.** Hairline **1px** `--border #3A4049` separates every surface from the dark behind it —
  borders do the structural work that shadow does on light themes. Dividers are the same hairline.
- **Shadows.** Used sparingly and only for true elevation (dialogs, toasts, dropdowns): soft, dark,
  low-spread (`0 12px 32px rgba(0,0,0,.55)`). Cards rely on border + surface-lift, not shadow.
- **Accents as rails.** The signature device is a **colored left rail / underline**: active nav item
  = 2px red left border; active tab = 2px red underline; StatCard = 3px accent rail; Toast = 4px
  tone rail. Rails, not fills, signal state.
- **Focus.** Blue ring `0 0 0 3px rgba(30,111,217,.45)` on inputs; danger fields swap to a red ring.
- **Hover.** Surfaces lighten one ink step (`--surface-hover`); primary buttons lighten to
  `--accent-hover`; ghost items gain a subtle fill. Links underline.
- **Press.** Buttons nudge **`translateY(1px)`** — a small physical tap, no scale/shrink.
- **Motion.** Quick and functional: 120ms (`--dur-fast`) for hovers, 200ms for toggles, ease-out
  `cubic-bezier(.22,1,.36,1)`. **No bounces, no looping/decorative animation.** Toggles and switch
  knobs slide; overlays fade.
- **Transparency & blur.** Only the dialog scrim and selected-row tint use alpha; blur is reserved
  for the scrim. Everything else is opaque for legibility on dark.
- **Cards.** `--surface-card` fill, 1px border, 12px radius, optional hairline-bordered header with
  a display-font title + faint subtitle and right-aligned actions. Flat by default.
- **Imagery vibe.** Talent headshots are the only photography — full-colour, neutral, shown as
  circular avatars with a presence dot. No duotone, no grain, no filters.

---

## ICONOGRAPHY
- **System:** [**Lucide**](https://lucide.dev) — clean 1.5–2px stroke, rounded caps, outline style.
  Loaded from CDN (`unpkg.com/lucide`) and rendered via `<i data-lucide="name">` +
  `lucide.createIcons()`. This is a **substitution**: the source brand ships no icon font, and
  Lucide's neutral outline set matches an operational admin. *Flag to the user if a licensed set
  exists.*
- **Sizing:** 16px inside buttons/rows, 18px in the sidebar/topbar, 40px for empty-state marks.
  Icons inherit `currentColor`; active/brand icons turn red.
- **Common glyphs:** `layout-dashboard, users, inbox, calendar-check, building-2, receipt,
  bar-chart-3, settings, search, bell, plus, filter, sliders-horizontal, star, more-horizontal,
  pencil, trash-2, mail, arrow-left/right, chevron-right, pound-sterling, log-out`.
- **Emoji / unicode:** not used as UI icons. The select caret (`▼`) and badge dots are the only
  non-Lucide marks, and those are simple CSS shapes.
- **Brand mark:** the microphone-and-Union-Jack wordmark (`assets/GBS-LOGO-dark.png` for dark
  chrome; `assets/GBS-LOGO.png` transparent). Never redraw the flag — use the supplied asset.

---

## Caveats / substitutions
- **Fonts** are Google Fonts stand-ins (Archivo / Public Sans / IBM Plex Mono) loaded via `@import`
  in `tokens/fonts.css` — no brand font files were provided. Swap for licensed binaries when
  available and convert to `@font-face` rules.
- **Icons** are Lucide (CDN), substituted for an unknown source set.
- Only two logo assets were reachable from the public CDN (`GBS-LOGO.png`, `GBS-LOGO-dark.png`);
  sister-brand logos (Presenters / Voices) and a favicon could not be downloaded.
