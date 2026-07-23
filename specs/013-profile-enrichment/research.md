# Research: Profile Enrichment

Distilled from the verified deep-research report (task wb7er9ls1) + owner decisions. Integration
decisions below.

## R1 — Grounding is a hard guardrail (legal)
- **Decision**: The prompt supplies ONLY the talent's real facts (master bio, headline, topics,
  optional source material) and instructs the model to use nothing else ("if a fact is not in the
  source, do not state it"). The reviewer + talent approval are the backstop.
- **Rationale**: Under UK law the publisher of AI-generated bios is directly liable for defamatory
  output (no host immunity; human review makes GBT the primary publisher). Grounding + dual approval
  are the mitigation.

## R2 — Dual approval, talent as attestation (v1)
- **Decision**: State machine `draft → admin_approved → talent_approved → published`. Admin approval
  = an operator with admin rights. Talent approval (v1) = an admin-captured attestation (talent name
  + date + method/note). Fields are shaped so a future no-login tokenised talent link can set
  `talent_approved` directly.
- **Rationale**: Satisfies the legal review-right now without building external talent auth (deferred).

## R3 — Similarity is a reviewer flag, not a gate
- **Decision**: Compute word-**trigram Jaccard** similarity of the generated bio vs the master bio
  (0–1), stored and shown. No hard threshold blocks publish; a high score is a visible warning.
- **Rationale**: Research: no % makes a page "safe"; Google judges added value, not a ratio.
  Dependency-free (no embeddings/external API); good enough as a "too close to the master" signal.

## R4 — Banned words + British English
- **Decision**: Org-level banned-words/phrases list; a case-insensitive scan flags occurrences in
  the draft for the reviewer. British English is enforced in the system prompt; obvious US spellings
  can be flagged. Seed the banned list from published AI-cliché lists; owner maintains it.
- **Rationale**: Owner requirement; "AI tells" are the fastest quality signal.

## R5 — API key encryption
- **Decision**: Store the Anthropic key AES-GCM-encrypted in D1 (iv + ciphertext), using a
  Worker-held key-encryption key `ENRICHMENT_KEK` (a `wrangler secret`). Decrypt only in-Worker at
  call time. Reads return only a masked hint (last 4 chars) + "configured" boolean — never the key.
- **Rationale**: The key is UI-set (so it must live in D1), but must never be retrievable/logged/
  public. WebCrypto AES-GCM is native to Workers, no dependency. Recorded in ADR 0007.

## R6 — Anthropic call isolation + test stubbing
- **Decision**: A single `worker/lib/anthropic.ts` `generateBio(env, {model, system, user})` does one
  `fetch` to `https://api.anthropic.com/v1/messages` (headers `x-api-key`, `anthropic-version`),
  returns the text. Model default: a current Anthropic model (admin-selectable). In tests, stub the
  outbound fetch (vitest-pool-workers `fetchMock`) so no real call/cost occurs.
- **Rationale**: Isolating the only non-deterministic, external, paid dependency behind one function
  keeps the rest pure/testable and lets integration/e2e run offline. (Consult the claude-api
  reference for exact headers/version at implementation time.)

## R7 — Publish-safe first
- **Decision**: A `publishSafeBios(talentId)` read returns ONLY `published` per-site bios, keyed by
  site slug — the first publish-safe content. `serializeTalent` (admin) is unchanged and still omits
  enrichment internals. Settings, drafts, briefs and the key are never publish-safe. A guard test
  asserts drafts/keys never appear.
- **Rationale**: This is the content the future public engine (ADR 0004) will consume per brand;
  gating it correctly now is the point of the feature.

## R8 — Editorial brief on the site (brand)
- **Decision**: Add brief columns to `brand` (audience, tone, word-count min/max, include/exclude);
  edit them in the Network screen. Generation reads the brief for the target site; sensible defaults
  when unset.
- **Rationale**: The brief is what makes variants substantively different (research: differentiation
  must add real per-audience value, not reword). Lives on the site it configures (ADR 0004's per-site
  config direction).
