# Implementation Plan: Publishing Network

**Branch**: `009-publishing-network` | **Date**: 2026-07-17 | **Spec**: [spec.md](spec.md)

## Summary
Extend `brand` (= site) with url/active/sort_order (migration 0007). New `network`
permission. Site management service + routes (list/create/edit/activate, deactivate-not-
delete). Serialize a talent's publications from ACTIVE sites plus any site it's already
published to, ordered. A Network admin screen (permission-gated nav item) to manage
sites; rename the profile "Site selector" tab to "Network". Publishing itself is
unchanged (spec 001). Realises ADR 0003's multi-site backbone.

## Constitution Check
I ✅ · II ✅ · III ✅ existing components (Table/Dialog/Switch/Input) · IV ✅ this IS the
multi-brand realisation · V ✅ network permission in shared permissions module · VI ✅
integration (site CRUD, slug uniqueness, deactivate-preserves-publications, permission
gating, multi-site publish) + e2e. Migration only; no new deps. Complexity: none.

## Design
- Migration 0007: brand + `url TEXT`, `active INTEGER NOT NULL DEFAULT 1`, `sort_order INTEGER NOT NULL DEFAULT 0`.
- Permission `network` (owner auto) in shared/permissions.
- `GET /api/network` → all sites (name, slug, url, active, published_count).
- `POST /api/network` {name, slug, url?} · `PATCH /api/network/:id` {name?, url?, active?} — permission `network`; slug immutable; unique.
- serialize: talent.publications = sites WHERE active=1 OR talent-published, ordered by sort_order.
- Deactivate guard: cannot delete (no delete endpoint); deactivate always allowed.
- UI: `src/routes/network.tsx` (nav item, permission-gated) — sites table, add/edit dialogs, active toggle. Rename profile tab label 'Site selector' → 'Network'.
