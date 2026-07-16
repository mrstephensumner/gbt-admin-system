# Changelog

All notable changes to the GBT Admin System are documented here, newest first.
Format loosely follows [Keep a Changelog](https://keepachangelog.com/); dates are day-month-year.

## [Unreleased]

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
