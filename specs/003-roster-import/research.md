# Phase 0 Research: Roster Import from File

No stack decisions — ADR 0002 stands. Import-specific decisions:

## R1 — Parse files in the browser, not the Worker

- **Decision**: The SPA parses CSV/XLSX/JSON locally (two small parsing libraries,
  loaded lazily on the Import screen) and POSTs **normalised rows** to the API. The
  Worker never sees the raw file; it re-validates every row against the shared Zod
  schema.
- **Rationale**: A 25 MB spreadsheet parsed inside a Worker fights memory/CPU limits for
  zero benefit; browsers do this comfortably. The server stays the trust boundary — rows
  are validated server-side regardless of what the client claims.
- **Alternatives considered**: Worker-side parsing (memory-limit risk, heavier deploy);
  R2 upload + background parse (adds infrastructure for a screen the operator is
  actively watching).

## R2 — Validation is a dry-run of the staging endpoint

- **Decision**: `POST /api/import/runs` accepts `dry_run: true` — identical
  normalisation, mapping and checks, zero writes, returns the reconciling report
  (found = clean + problems). The Validate button calls it; Confirm calls the same
  endpoint without the flag.
- **Rationale**: One code path means the validate report can never disagree with what
  staging actually does (spec US1's promise).
- **Alternatives considered**: separate validate endpoint (drift risk); client-only
  validation (not a trust boundary).

## R3 — Candidates as a table with JSON detail columns

- **Decision**: `import_candidate` is a first-class D1 table keyed by `source_id`
  (unique). Multi-value detail (topics, gaps) lives in JSON text columns.
- **Rationale**: Staging data is ephemeral and reviewed row-by-row — it needs status
  filtering and paging (SQL), not relational integrity with the live roster. JSON detail
  keeps the migration small; on approval the JSON is exploded through the real creation
  path where actual relations are built.
- **Alternatives considered**: fully relational staging (schema weight for throwaway
  data); KV/R2 blob per run (no queryable review states).

## R4 — Photos fetched server-side at approval time

- **Decision**: A candidate stores its photo URL. On approval the Worker fetches it,
  applies the existing type/size rules, and stores original into R2 through the existing
  photo pipeline (display rendition falls back to the original, as spec 001 allows).
  Failure → record created without photo + gap noted on the candidate.
- **Rationale**: Only approved candidates cost fetches (skipped junk costs nothing);
  reuse of the photo pipeline keeps auth-gated serving and change-history behaviour.
- **Alternatives considered**: fetch at staging (wasted work for skipped rows);
  client-side fetch and re-upload (CORS lottery against the old site's CDN).

## R5 — New permission area `import_roster`

- **Decision**: Add `import_roster` to `shared/permissions.ts`. Every import endpoint
  requires it; the Team screen gains its toggle automatically (the screen renders from
  the shared PERMISSIONS array).
- **Rationale**: Spec FR-013 — and it exercises spec 002's FR-008 exactly as designed:
  existing operators are default-denied with zero data migration; the Owner holds it
  automatically.
- **Alternatives considered**: owner-only hard-coding (blocks delegating the review
  grind, which is the likeliest delegation of all).

## R6 — Tolerant column mapping with a synonym table

- **Decision**: `shared/importing.ts` maps header names to fields case/whitespace-
  insensitively via a synonym table (e.g. talent id ← "Talent ID" / "ID" / "Ref";
  day rate ← "Day Rate" / "Fee" / "Rate (GBP)"; name ← "Name" / "Full Name" /
  "Speaker"). Unmapped columns are reported (not fatal); unmapped **required** fields
  make rows problems. The validation report lists the mapping it used.
- **Rationale**: The real export's layout is unknown until a sample arrives (spec
  assumption). A visible, tolerant mapping means the real file most likely just works —
  and if it doesn't, the validate report says precisely why, and the synonym table is a
  one-line fix.
- **Alternatives considered**: strict fixed layout (guaranteed to fight the real file);
  interactive column-mapping UI (real feature, not needed until a second source format
  exists — noted as future).

## R7 — Conservative money parsing

- **Decision**: A dedicated parser accepts recognised GBP shapes only ("£4,000",
  "4000", "4,000.00", "£1,250.50"); anything else (ranges, "POA", "from £2k", other
  currencies) becomes a **gap**, never a guessed number. Unit-tested exhaustively.
- **Rationale**: FR-015 / SC-007 — a silently wrong day rate is worse than a blank one,
  because blank blocks publication (spec 001 FR-010) while wrong publishes.
- **Alternatives considered**: permissive numeric extraction (exactly the silent-wrong
  failure mode).

## R8 — Bulk approval chunked at ≤ 25 per request

- **Decision**: `POST /api/import/approve` accepts at most 25 candidate ids; the UI
  chunks larger selections and streams progress. Each approval is its own atomic D1
  batch (spec-001 create path); per-candidate failures are reported in the response
  without aborting the chunk.
- **Rationale**: Each creation is several D1 statements plus a possible photo fetch;
  chunking keeps requests far inside Worker subrequest/time limits while the UI still
  offers "approve 100" ergonomics (SC-002).
- **Alternatives considered**: unbounded bulk endpoint (limit roulette at exactly the
  moment the whole roster goes through); background queue (infrastructure the watched
  screen doesn't need).
