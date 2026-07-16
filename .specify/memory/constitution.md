<!--
Sync Impact Report
- Version change: (template) → 1.0.0
- Modified principles: n/a (initial ratification)
- Added sections:
  - Core Principles (I–VI)
  - Brand & Content Standards
  - Development Workflow & Quality Gates
  - Governance
- Removed sections: none (all template placeholders filled)
- Templates requiring updates:
  - ✅ .specify/templates/plan-template.md — generic "Constitution Check" gate; compatible as-is,
    gates are derived from this file per plan
  - ✅ .specify/templates/spec-template.md — no constitution-specific sections; compatible
  - ✅ .specify/templates/tasks-template.md — no constitution-specific sections; compatible
  - ✅ CLAUDE.md — working agreements already mirror Principles I–III
- Follow-up TODOs: none
-->

# GBT Admin System Constitution

## Core Principles

### I. Spec-Driven Development (NON-NEGOTIABLE)

No feature is implemented without a specification in `specs/`, and no specification is
implemented without a plan and task breakdown. The workflow is: specify → (clarify) → plan →
tasks → implement → (analyze). Specs describe user-visible behaviour and acceptance criteria;
plans record technical choices; both are versioned in git alongside the code they produced.

Rationale: this system will grow from a back office into the administration hub for multiple
brands and websites, built incrementally by humans and agents. Reviewable intent before code
is the only way that scale stays coherent.

### II. The Repository Is the Documentation of Record

Everything needed to understand the project MUST be reconstructible from the GitHub
repository alone. Concretely:

- `CHANGELOG.md` MUST be updated in the same commit as any meaningful change.
- `docs/` MUST be kept in sync: a change that makes a doc stale updates that doc in the
  same commit.
- Significant technical choices MUST be recorded as numbered decision records in
  `docs/decisions/` before or with the commit that enacts them.
- Work MUST be pushed to `origin` after each coherent unit — unpushed local state is not
  documentation.

Rationale: the team (and future agents) must never depend on chat history, memory, or any
single machine to know why the system is the way it is.

### III. Design-System Conformance

`design-system/` is the single source of truth for all UI. New screens and components MUST
use its tokens (colour, type, spacing, effects) rather than invented values; missing values
are added to the token files, never hard-coded inline. Reference components
(`.jsx.txt`/`.d.ts.txt`) define expected props and behaviour and MUST be rebuilt, not
imported. A built screen is accepted when it is visually indistinguishable from the
corresponding screen in `design-system/ui_kits/admin/`.

Rationale: one design language across every brand and module is the product's core promise;
drift begins with the first ad-hoc hex value.

### IV. One Source of Truth, Multi-Brand From the Start

Operational data — talent, enquiries, bookings, clients, invoices — lives in this system;
websites are presentation layers that consume it. No feature may hard-code a single brand,
site, or market: entities that can belong to a brand MUST carry that relationship explicitly
even while only one brand exists. Duplicating operational data into a consuming site is
prohibited; expose it via a defined interface instead.

Rationale: Horizons 2 and 3 (administering existing, rebuilt, and new-market sites) are the
point of the project; retrofitting multi-tenancy is far costlier than carrying it from day one.

### V. Operational, Not Promotional

This is a working tool for the bookings team: calm, dense, fast, and predictable. Features
MUST optimise for operator efficiency (keyboard-friendly, few clicks, precise data) over
visual novelty. Fixed vocabularies are enforced in code, not just copy: statuses
(Available · On hold · Booked · Confirmed · Cancelled; New · Quoted · Confirmed · Lost),
prefixed uppercase IDs (`SPK-0481`, `ENQ-3092`), GBP formatting with `£` and thousands
separators, and day-month-year dates MUST be implemented as shared enums and formatters.

Rationale: back-office trust is built on consistency; every synonym or format variant is a
future data-quality bug.

### VI. Verified Before Merged

Every change MUST be verified before it lands on `main`: automated tests appropriate to the
risk of the change (business logic and data operations always get tests; shared formatters
and enums get exhaustive ones), plus a real run-through of the affected flow for anything
user-facing. A failing check blocks the merge — no "fix it in the next commit". Test
expectations are defined in each feature's spec and plan.

Rationale: this system will hold live booking and invoicing data for a real business;
regressions here cost money and client trust directly.

## Brand & Content Standards

- Copy is plain, professional British English in sentence case; table column headers are
  UPPERCASE micro-labels. No emoji anywhere in the product. No exclamation marks in helper
  or empty-state text.
- The Union Jack palette is fixed: red `#C8102E` leads primary action and active states,
  navy `#012169` grounds, blue `#1E6FD9` is interactive/informational. Semantic colours map
  1:1 to the fixed status vocabulary.
- Icons are Lucide only. Brand marks come from `design-system/assets/` — the flag is never
  redrawn.
- Fonts are Archivo (display), Public Sans (UI), IBM Plex Mono (IDs, money, dates); current
  Google Fonts stand-ins are replaced with licensed binaries when available, as a token-file
  change only.
- Secrets, credentials, and client personal data MUST never be committed to the repository;
  configuration is via environment variables with a committed `.env.example`.

## Development Workflow & Quality Gates

- Feature work happens on spec-kit branches (`NNN-feature-name`); `main` stays releasable.
- Every plan MUST pass the Constitution Check gate against this document before
  implementation begins; violations require a written justification in the plan's
  Complexity Tracking section or a constitution amendment.
- Commits are imperative, sentence case, and scoped to one logical change, each carrying its
  `CHANGELOG.md` entry (Principle II).
- The first plan that selects the application tech stack MUST record the decision in
  `docs/decisions/` with alternatives considered.
- Agent sessions follow `CLAUDE.md`, which mirrors this constitution's operational rules and
  MUST be updated in the same commit as any amendment that affects it.

## Governance

This constitution supersedes all other practices in this repository. Where CLAUDE.md,
README.md, or any doc conflicts with it, the constitution wins and the conflicting doc is
corrected.

- **Amendments**: proposed as a commit that updates this file, states the rationale in the
  commit message, updates the Sync Impact Report comment, and propagates changes to
  dependent artifacts (templates, CLAUDE.md, docs) in the same commit.
- **Versioning**: semantic. MAJOR for removed or redefined principles, MINOR for new or
  materially expanded principles/sections, PATCH for clarifications and wording.
- **Compliance review**: every `/speckit-plan` run evaluates its Constitution Check gate
  against the current version; `/speckit-analyze` flags cross-artifact drift. Any discovered
  violation on `main` is logged as a decision record or fixed immediately.

**Version**: 1.0.0 | **Ratified**: 2026-07-16 | **Last Amended**: 2026-07-16
