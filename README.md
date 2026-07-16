# GBT Admin System

The central admin platform for **Great British Talent Ltd** — the parent company of
**Great British Speakers** (greatbritishspeakers.co.uk) and its sister talent brands.

This tool is the day-to-day operations centre for the business: managing speakers and other
talent, enquiries, bookings, clients and invoices. Over time it will also become the
administration hub for:

- The **existing brand websites** (Great British Speakers and sister brands)
- **Rebuilt versions** of those sites (to be developed in this ecosystem)
- **New websites for new markets** as the business expands

## Project status

🏗️ **Foundation stage.** The design system has been produced (in Claude Design) and imported;
specification work is underway using [GitHub spec-kit](https://github.com/github/spec-kit).

## Repository layout

| Path | What it is |
|---|---|
| `design-system/` | The complete admin design system handed off from Claude Design — tokens, React component references, a full interactive admin UI kit, and brand assets. See [design-system/readme.md](design-system/readme.md). |
| `docs/` | Project documentation — architecture, decisions, guides. Start at [docs/README.md](docs/README.md). |
| `specs/` | Spec-kit feature specifications, plans and task lists (created per feature as work begins). |
| `.specify/` | Spec-kit configuration, templates and the project constitution (`.specify/memory/constitution.md`). |
| `.claude/` | Claude Code skills for the spec-kit workflow (`/speckit-*`). |
| `CHANGELOG.md` | Every meaningful change to the project, newest first. |

## Development workflow

This project follows **spec-driven development** with GitHub spec-kit. No feature is built
without a spec; no spec is implemented without a plan and tasks.

1. `/speckit-constitution` — project principles (once, then amend as needed)
2. `/speckit-specify` — write the feature specification
3. `/speckit-clarify` — resolve ambiguities (optional but encouraged)
4. `/speckit-plan` — technical implementation plan
5. `/speckit-tasks` — actionable task breakdown
6. `/speckit-implement` — build it
7. `/speckit-analyze` — cross-artifact consistency check

## Documentation discipline

Everything is documented in this repository:

- **`CHANGELOG.md` is updated before every commit** — no exceptions.
- **`docs/` is kept in sync with the code** — if a change makes a doc stale, the doc is
  updated in the same commit.
- Significant technical choices are recorded as decision records in `docs/decisions/`.

## Design system quick reference

Dark, dense back-office UI in the Union Jack identity: red `#C8102E` for primary action,
navy `#012169`, blue `#1E6FD9` interactive, near-black ink surfaces. Archivo for display,
Public Sans for UI, IBM Plex Mono for IDs/money/dates. UK English, sentence case, no emoji.
Full guidelines in [design-system/readme.md](design-system/readme.md).
