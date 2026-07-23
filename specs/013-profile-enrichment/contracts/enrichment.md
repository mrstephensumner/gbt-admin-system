# API Contracts: Profile Enrichment

Access-gated admin API. Error envelope `{ error: { code, message } }`. Settings are owner-only.

## GET `/api/enrichment/settings`  · PUT `/api/enrichment/settings` (owner)

- **GET 200**: `{ configured: boolean, key_hint: string|null, model, banned_words: string[],
  house_style: string|null }` — the raw key is NEVER returned.
- **PUT** body: `{ api_key?: string, model?, banned_words?: string[], house_style?: string|null }`.
  Sending `api_key` re-encrypts + stores it and updates `key_hint`; omit it to leave the key
  unchanged. `403` for non-owners. Writes an `enrichment_settings_changed` change record (no key
  material in the record).

## PATCH `/api/network/:id/brief` (manage_network)

Body: `{ audience?, tone?, word_min?, word_max?, include?, exclude? }` → updates the site brief.
(Alternatively folded into the existing `PATCH /network/:id`.) **200** the updated site.

## GET `/api/talent/:reference/enrichment`

Per-site enrichment overview for a talent.

**200**:
```json
{
  "master_bio_present": true,
  "source_material": "…",
  "settings_ready": true,
  "sites": [
    { "brand_id": 6, "brand_slug": "great-business-speakers", "brand_name": "Great Business Speakers",
      "published_here": true, "bio": {
        "id": 4, "state": "published", "word_count": 152, "similarity": 38,
        "banned_hits": [], "model": "…", "updated_at": "…",
        "admin_approved_by": "jo@…", "talent_approved_by": "Dr Jane Smith", "published_at": "…" },
      "incomplete": false }
  ]
}
```
`incomplete = published_here && bio.state !== 'published'`. `bio` is null if none yet.

## PUT `/api/talent/:reference/source-material`

Body `{ source_material: string|null }` → saves the optional grounding material. **200**.

## POST `/api/talent/:reference/enrichment/:brandId/generate`

Generate (or regenerate) a draft for the site. Requires a configured key + a master bio.
- Builds the grounded prompt, calls the model, stores a **draft** (body, word_count, similarity,
  banned scan, model). Replaces any existing draft; resets state to `draft`.
- **200**: the site's bio object. Errors: `409 not_configured` (no key), `422 no_master_bio`,
  `502 generation_failed` (model/network error — nothing stored). Writes `enrichment_generated`.

## PATCH `/api/talent/:reference/enrichment/:brandId`

Edit the draft body: `{ body }`. Recomputes word_count/similarity/banned; resets to `draft` (clears
approvals). **200** the bio. Writes `enrichment_edited`.

## POST `/api/talent/:reference/enrichment/:brandId/approve`

Record an approval: `{ by: 'admin' }` (requires admin) or `{ by: 'talent', talent_name }` (records
the talent attestation). Advances state accordingly; out-of-order approval is refused. **200** the
bio. Writes `enrichment_admin_approved` / `enrichment_talent_approved`.

## POST `/api/talent/:reference/enrichment/:brandId/publish`

Publish the bio to its site. Refused unless state is `talent_approved` (`422 not_approved` naming the
missing approval). Sets `state='published'`, `published_at`. **200** the bio. Writes
`enrichment_published`. The body is now the site's publish-safe biography.

## Publish-safe contract (FR-010 / SC-001/004)

`publishSafeBios(talentId)` (internal read used by the future public engine) returns only
`{ brand_slug, body }` for `state='published'`. The Anthropic key, drafts, unapproved bios, briefs
and settings NEVER appear in any publish-safe/public output. Enforced by integration guard tests.
