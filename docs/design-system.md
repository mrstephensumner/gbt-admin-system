# Consuming the design system

`design-system/` is the verbatim handoff from Claude Design ("Great British Talent — Admin
Design System") and is the **source of truth for all UI** in this project. This page explains
how to use it; the full guidelines are in
[design-system/readme.md](../design-system/readme.md).

## What's in the handoff

| Path | Contents |
|---|---|
| `design-system/styles.css` | Single CSS entry point — `@import`s every token file. |
| `design-system/tokens/` | `fonts.css`, `colors.css`, `typography.css`, `spacing.css`, `effects.css`, `base.css`. |
| `design-system/components/` | 22 reference components as `.jsx.txt` + `.d.ts.txt` pairs, grouped: buttons, forms, display, navigation, feedback, data. Some include `.prompt.md` design-intent notes and `.card.html.txt` specimen cards. |
| `design-system/ui_kits/admin/index.html` | Full interactive admin recreation — Dashboard, Speakers, Speaker profile, Enquiries. Open in a browser to see the target experience. |
| `design-system/Talent Management Module.html` | Standalone talent-management screen. |
| `design-system/assets/` | `GBS-LOGO.png` (transparent) and `GBS-LOGO-dark.png` (dark chrome). |

## How to use it during implementation

1. **Tokens first.** When we scaffold the real app, port `design-system/tokens/` into the
   app's styling layer (CSS variables carry over directly). Do not invent new colour,
   spacing or type values — extend the token files if something is genuinely missing.
2. **Components are specs, not imports.** The `.jsx.txt` files compile to a
   `window.GreatBritishTalentAdminDesignSystem_7f945e` namespace for the design tool — they
   are references. Rebuild each as a first-class component in the app's stack, matching
   props (`.d.ts.txt`) and behaviour.
3. **UI kit is the acceptance bar.** A built screen should be visually indistinguishable
   from the corresponding screen in `ui_kits/admin/index.html`.
4. **Content rules are code rules.** Status vocabulary, ID formats (`SPK-0481`), currency
   and date formats from the handoff readme should be enforced in code (formatters,
   enums), not just in copy.

## Known substitutions (from the handoff)

- Fonts are Google Fonts stand-ins (Archivo / Public Sans / IBM Plex Mono) loaded via
  `@import` — swap for licensed binaries as `@font-face` if/when provided.
- Icons are Lucide from CDN, substituted for an unknown source set.
- Only the two Great British Speakers logos were retrievable; sister-brand logos
  (Presenters / Voices) and a favicon are still needed.
