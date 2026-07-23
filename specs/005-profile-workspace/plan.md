# Implementation Plan: Talent Profile Workspace

**Branch**: `005-profile-workspace` | **Date**: 2026-07-16 | **Spec**: [spec.md](spec.md)

## Summary
Restructure `talent-profile.tsx` into a tabbed workspace (existing Tabs component; tab in
a `?tab=` URL param for deep links) redistributing existing panels, plus one read-only
aggregation endpoint `GET /api/talent/:reference/stats` for the Statistics tab. No new
tables, permissions, or dependencies.

## Constitution Check
I spec-derived ✅ · II docs/changelog in-commit ✅ · III existing components/tokens,
mockup layout ✅ · IV brand-neutral ✅ · V completeness reuses the shared gate definition;
stats vocabulary from shared enums ✅ · VI regression suites + exact-figures integration
test + e2e tab journey ✅. *Complexity Tracking empty.*

## Design
- `GET /api/talent/:reference/stats` → `{ completeness: { publishable: bool, missing: [...], extended_missing: [...] }, activity: { total, last_30_days, by_action: {...} }, facts: { created_at/by, updated_at/by, status, status_since, topics, published_brands } }`
  (status_since = latest status_changed record, else created_at).
- Screen: header unchanged (status select + archive stay); tab strip: Profile (form) ·
  Photos · Site selector (publication panel; actions permission-gated as now) ·
  Statistics · History.
- Tests: integration stats-exactness; e2e updated locators (tab clicks) + new workspace
  journey; all suites re-run.
