# GBT Admin System — working agreements for Claude Code

## What this project is

The central admin platform for Great British Talent Ltd (parent of Great British Speakers,
greatbritishspeakers.co.uk, and sister talent brands). It runs the business day to day —
talent, enquiries, bookings, clients, invoices — and will grow into the administration hub
for the existing brand websites, their rebuilt successors, and new-market sites.

## Non-negotiable discipline

1. **CHANGELOG.md before every commit.** Every commit that changes anything meaningful gets
   a `CHANGELOG.md` entry in the same commit. Dates are day-month-year (`16 Jul 2026`).
2. **docs/ stays in sync.** If a change makes any file in `docs/` stale, update it in the
   same commit. New subsystems get a doc; significant technical choices get a decision
   record in `docs/decisions/` (numbered, e.g. `0002-some-choice.md`).
3. **Spec-driven development.** Features go through the spec-kit flow — `/speckit-specify` →
   `/speckit-plan` → `/speckit-tasks` → `/speckit-implement` — and specs live in `specs/`.
   Don't implement features that have no spec. The project constitution lives at
   `.specify/memory/constitution.md`.

## Design system conformance

`design-system/` is the source of truth for all UI. Read `design-system/readme.md` before
building any screen or component. Key rules:

- Dark ink surfaces (`#0C0D10` app → `#1A1D23` cards), hairline `#3A4049` borders do the
  structural work — no gradients, textures, or decorative shadows.
- Union Jack accents: red `#C8102E` = primary action/active; navy `#012169` grounds;
  blue `#1E6FD9` = links/focus/selection. Rails (left border/underline), not fills, signal state.
- Type: Archivo (display/KPIs), Public Sans (UI, 14px default), IBM Plex Mono (IDs, money, dates).
- Copy: plain professional **British English**, sentence case (table headers are UPPERCASE
  micro-labels), GBP with `£` and thousands separators, day-month-year dates, **no emoji**.
- Fixed status vocabulary: Available · On hold · Booked · Confirmed · Cancelled (talent/bookings);
  New · Quoted · Confirmed · Lost (enquiries).
- IDs are monospaced, prefixed, uppercase: `SPK-0481`, `ENQ-3092`.
- Icons: Lucide only. Logos: use `design-system/assets/` — never redraw the flag.

The reference components in `design-system/components/` are `.jsx.txt`/`.d.ts.txt` handoff
artifacts from Claude Design — treat them as the behavioural/visual spec when building the
real implementation; don't import them directly.

## Git conventions

- Default branch: `main`. Feature work on branches named by spec-kit (`NNN-feature-name`).
- Commit messages: imperative, sentence case, scoped to one logical change.
- Push to `origin` (github.com/mrstephensumner/gbt-admin-system) after each coherent unit of
  work — the repo on GitHub is the documentation of record.
