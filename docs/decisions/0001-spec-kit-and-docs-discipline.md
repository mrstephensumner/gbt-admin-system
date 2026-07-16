# 0001 — Adopt GitHub spec-kit and repo-first documentation

- **Date:** 16 Jul 2026
- **Status:** Accepted

## Context

The GBT Admin System will grow from a back-office tool into the administration hub for
multiple websites and brands, built incrementally in Claude Code. Without discipline, a
project of this scope accumulates undocumented decisions and unspecified features.

## Decision

1. **GitHub spec-kit** drives all feature work (`specify init --here --integration claude`).
   Every feature follows: constitution → specify → (clarify) → plan → tasks → implement →
   (analyze). Specs live in `specs/`, versioned in git.
2. **The GitHub repository is the documentation of record.** `CHANGELOG.md` is updated
   before every commit; `docs/` is kept in sync with code in the same commit; significant
   technical choices are recorded as numbered decision records in `docs/decisions/`.

## Consequences

- Slightly slower starts on each feature, in exchange for reviewable intent before code.
- New collaborators (human or agent) can reconstruct the project's state from the repo alone.
- The constitution (`.specify/memory/constitution.md`) must be written early and amended
  deliberately — it constrains every later plan.
