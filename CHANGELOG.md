# Changelog

All notable changes to the GBT Admin System are documented here, newest first.
Format loosely follows [Keep a Changelog](https://keepachangelog.com/); dates are day-month-year.

## [Unreleased]

### Added
- Task breakdown for spec 001 (`specs/001-talent-management/tasks.md`): 47 tasks across
  8 phases (setup, foundational shared-domain/schema/shell, one phase per user story,
  polish incl. topic management and deploy preview), with dependency graph, parallel
  tracks, and MVP cut at Phase 3 (US1).
- Implementation plan for spec 001 (`specs/001-talent-management/plan.md`) with Phase 0
  research (R1–R12), data model (8 tables incl. append-only change history and
  publication join), JSON API contract, and quickstart validation guide. Constitution
  Check passes all six gates, pre- and post-design.
- ADR 0002 (`docs/decisions/0002-tech-stack.md`): Cloudflare-native TypeScript stack —
  React 19 + Vite SPA and Hono API on one Worker, D1 + Drizzle, R2 photos, Cloudflare
  Access as interim auth, Vitest + Playwright, GitHub Actions CI/CD. `docs/vision.md`
  open questions updated accordingly.
- Hosting decision input recorded in `docs/vision.md`: the admin will be served from
  **greatbritishtalent.online**, already configured in Cloudflare (16 Jul 2026).
- Spec 001 — Talent Management Module (`specs/001-talent-management/spec.md`): five
  prioritised user stories (add/maintain records, directory search at 5,000-record scale,
  fixed-vocabulary status tracking, per-brand publication with completeness gating,
  archive-not-delete), 19 functional requirements, key entities, measurable success
  criteria, and assumptions. Quality checklist passes in full
  (`specs/001-talent-management/checklists/requirements.md`).
- Spec 001 clarifications (session 16 Jul 2026): neutral `TAL-NNNN` references for all
  talent (supersedes the mockups' `SPK-`), hybrid topic governance (inline creation +
  central rename/merge, FR-018), and fee bands derived from day rate via fixed thresholds
  (FR-019).

## 16 Jul 2026 — Constitution v1.0.0 ratified

### Added
- Project constitution (`.specify/memory/constitution.md`) v1.0.0 with six core principles:
  spec-driven development, repository as documentation of record, design-system conformance,
  one source of truth / multi-brand from the start, operational-not-promotional, and
  verified-before-merged — plus Brand & Content Standards, Development Workflow & Quality
  Gates, and Governance (semantic versioning, amendment procedure, compliance review).

## 16 Jul 2026 — Project foundation

### Added
- Repository initialised from the new GitHub repo `mrstephensumner/gbt-admin-system`.
- **GitHub spec-kit** initialised (`specify init --here --integration claude`) — adds
  `.specify/` (templates, constitution scaffold, workflow scripts) and `.claude/skills/`
  (`/speckit-*` skills for spec-driven development in Claude Code).
- **Design system imported** to `design-system/` from the Claude Design handoff
  ("Great British Talent — Admin Design System"): CSS tokens, 22 React component
  references, interactive admin UI kit (Dashboard, Speakers, Speaker profile, Enquiries),
  Talent Management Module screen, brand logo assets, and full content/visual guidelines.
- `README.md` — project overview, repository layout, spec-driven workflow.
- `docs/` — documentation home with architecture notes and decision records
  (`docs/decisions/0001` records the spec-kit adoption).
- `CLAUDE.md` — working agreements for Claude Code sessions (changelog + docs discipline,
  spec-kit workflow, design-system conformance).
- `.gitignore` for a Node/JS project.
