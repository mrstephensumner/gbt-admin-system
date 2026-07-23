# 0007 — AI enrichment: secret storage & external-LLM integration

- **Date:** 23 Jul 2026
- **Status:** Accepted (enacted by spec 013)
- **Context:** Profile Enrichment (spec 013) generates per-site speaker biographies with the
  Anthropic API. Two decisions need recording: how the organisation's Anthropic API key is stored
  (it is set through the admin UI, so it must live in the database, yet must never be exposed), and
  how the external, paid, non-deterministic LLM call is integrated without making the rest of the
  system untestable. Verified research (task wb7er9ls1) also established that under UK law GBT is the
  primary publisher of these bios and is directly liable for their content.

## Decision

1. **The Anthropic key is stored AES-GCM-encrypted in D1**, never in plaintext. Encryption uses a
   Worker-held key-encryption key, `ENRICHMENT_KEK` (a `wrangler secret`, in `.dev.vars` locally).
   The key is decrypted only in-Worker at call time. Reads return only `{ configured, key_hint }`
   (last 4 chars) — the raw key is never returned by any endpoint, never logged, never in any
   publish-safe/public output. Settings changes are owner-only.
2. **The LLM call is isolated behind one function** (`worker/lib/anthropic.ts` `generateBio`) doing a
   single `fetch` to the Anthropic Messages API (`x-api-key`, `anthropic-version: 2023-06-01`,
   `thinking: disabled`, no sampling params). This is the only external, paid, non-deterministic
   dependency; isolating it keeps everything else pure and lets all automated tests **stub the
   outbound fetch** — integration tests via a miniflare `outboundService`, unit tests via a stubbed
   global `fetch` — so the suite runs offline and free. A direct `fetch` is used rather than the
   official SDK because the SDK's transitive `standardwebhooks` dependency does not resolve under the
   workerd (`vitest-pool-workers`) test runtime, and a single grounded non-streaming request needs
   nothing the SDK adds.
3. **Generation is grounded and human-gated.** The prompt supplies only the talent's real facts and
   instructs the model to invent nothing; a bio cannot be published without **both** an admin and a
   talent approval. This is the mitigation for UK publisher liability for AI-generated bios.
4. **Only published per-site bios are publish-safe.** Drafts, briefs, settings and the key are
   internal-only. The published bio is the first publish-safe content the system emits and is what
   the future multi-tenant public engine (ADR 0004) will consume per brand.

## Consequences

- A `wrangler secret put ENRICHMENT_KEK` must be set on the remote environment before the first
  spec-013 deploy; locally it lives in `.dev.vars` (gitignored). Rotating the KEK invalidates any
  stored ciphertext (the key must be re-entered) — acceptable for a single org key.
- The similarity score (trigram Jaccard vs the master bio) is a **reviewer flag**, not a compliance
  gate — research found no external percentage guarantees SEO safety.
- If broader secret storage is ever needed (other integrations), the same `crypto.ts` AES-GCM helper
  and KEK pattern generalise.
