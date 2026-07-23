# Implementation Plan: Internal Talent Notes

**Branch**: `006-talent-notes` | **Date**: 2026-07-16 | **Spec**: [spec.md](spec.md)

## Summary
One table (`talent_note`, migration 0003), two endpoints (list paged / create), a
`note_added` change-history action (flows into History, dashboard feed, Statistics
automatically), and a Notes workspace tab with count. No new permissions (baseline).

## Constitution Check
I ✅ spec-derived · II ✅ changelog/docs in-commit · III ✅ existing components (Card,
Textarea, Button) · IV ✅ brand-neutral · V ✅ action added to the shared CHANGE_ACTIONS
vocabulary once · VI ✅ integration tests (attribution, validation, history/stats
coupling, archived-allowed) + e2e in the workspace journey. Complexity: none.

## Design
- `talent_note`: id PK, talent_id FK (indexed), author, body, created_at.
- `GET /api/talent/:reference/notes?page=&per_page=` → `{ items, total, page, per_page }`.
- `POST /api/talent/:reference/notes { body }` → 201 note; change_record `note_added`
  written in the same batch.
- Workspace tab order: Profile · Photos · Notes(count) · …placeholders… · Statistics ·
  Site selector · History.
