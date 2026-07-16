# Data Model: Admin Roles & Operator Management

Three new D1 tables (Drizzle migration `0001_operators`); no changes to spec-001 tables.
Conventions as before: ISO-8601 UTC `_at` strings, emails are the operator identifiers.

## Entities

### operator

| Column | Type | Constraints | Notes |
|---|---|---|---|
| id | integer | PK autoincrement | Internal key |
| email | text | UNIQUE COLLATE NOCASE, NOT NULL | Matches the authenticated identity, case-insensitively (FR-001/011) |
| role | text | NOT NULL, CHECK in ('owner','operator') | Exactly one `owner` row enforced in service layer (FR-002/005) |
| added_at / added_by | text | NOT NULL | Bootstrap rows record `system` as added_by |

Index: unique on `email COLLATE NOCASE`.

**Invariants (service layer, tested)**: exactly one owner exists after every mutation;
the owner row cannot be deleted or demoted; deleting an operator removes their grants
(same batch) but never touches `change_record` or `operator_audit` (FR-009).

### operator_grant

Row exists ⇔ permission granted (default-deny by absence — FR-008).

| Column | Type | Constraints | Notes |
|---|---|---|---|
| operator_id | integer | FK → operator, NOT NULL | |
| permission | text | NOT NULL | One of `shared/permissions.ts` ids: `edit_day_rates` · `publish` · `archive` · `manage_topics` |
| granted_at / granted_by | text | NOT NULL | |
| PK | (operator_id, permission) | | |

Owner holds no rows — `role = 'owner'` short-circuits every check (research R2). Unknown
permission ids are rejected at the API by the shared Zod schema.

### operator_audit (append-only — FR-010)

| Column | Type | Constraints | Notes |
|---|---|---|---|
| id | integer | PK autoincrement | |
| actor | text | NOT NULL | Operator email performing the change |
| subject_email | text | NOT NULL | Operator affected |
| action | text | NOT NULL | `operator_added` · `operator_removed` · `permission_granted` · `permission_revoked` · `owner_bootstrapped` |
| detail | text | nullable | e.g. the permission id |
| at | text | NOT NULL | |

Written in the same D1 batch as the management mutation (research R7). No update/delete
path exists anywhere in the codebase.

## Relationships

```text
operator 1─* operator_grant     (absence of row = denied)
operator —(email)— Access identity   (authn: Cloudflare Access; authz: this registry)
operator_audit                  (standalone append-only trail, keyed by emails)
```

## Authorization semantics

- **Registry gate**: every `/api/*` request resolves the authenticated email → operator
  row. No row → `403 not_registered` (FR-003). Applies to reads and writes alike.
- **can(operator, permission)**: `role === 'owner'` → true; else grant-row existence.
- **Owner bootstrap**: if no owner row exists, the middleware inserts
  `OWNER_EMAIL` (wrangler var) as owner with `added_by = 'system'` and audits
  `owner_bootstrapped` (research R4). Idempotent.
- **Baseline (no grants needed)**: viewing directory/profiles/history/topics, creating
  talent, editing ordinary profile fields, managing photos (FR-006).
- **Gated actions**: day-rate changes (`edit_day_rates`, field-level — research R5),
  publish/unpublish (`publish`), archive/restore (`archive`), topic rename/merge
  (`manage_topics`), and all `/api/team/*` (owner-only, not grantable).

## State transitions

```text
unregistered ──owner adds──▶ operator(no grants) ──grant/revoke──▶ operator(grants…)
operator ──owner removes──▶ unregistered            (history + audit rows remain)
(no path exists to a second owner, or to zero owners — FR-005)
```
