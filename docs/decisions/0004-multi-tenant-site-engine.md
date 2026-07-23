# 0004 — Multi-tenant public site engine: one system renders every brand site

- **Date:** 23 Jul 2026
- **Status:** Accepted (architecture locked by the owner; delivery is a sequence of
  future specs starting with the Great British Influencers pilot)
- **Context:** [ADR 0003](0003-multi-site-content-delivery.md) established that the admin
  is the system of record for 7+ brand websites but deliberately left the *delivery
  mechanism* open ("a future feature"). The owner has now confirmed the bigger-picture
  plan and made the shaping decisions, so the mechanism is settled here. All network
  sites currently run on ageing WordPress; they will be **rebuilt natively inside this
  project** and connected directly to this system. Before rebuilding an existing site, a
  brand-new site — **Great British Influencers** (greatbritishinfluencers.co.uk) — is
  built greenfield as the pilot that proves the engine end to end.

## Decision

1. **One engine, many sites (multi-tenant).** This same Cloudflare Worker also renders
   the public brand sites, routed by **hostname**. `greatbritishinfluencers.co.uk`,
   `greatbritishspeakers.co.uk`, etc. all resolve to the same Worker, which looks up the
   matching `brand` row and renders that site. Adding a domain + a `brand` row makes a
   site live — **no separate per-site deploy**. This is what "power new sites instantly"
   means in practice, and it extends ADR 0003's "served by the same Cloudflare Worker."
   The Access-gated admin and the public sites are the **same deployment** but strictly
   separated surfaces (see §5).

2. **Bespoke templates per site, shared content tooling from the admin.** Each site gets
   its own hand-built template/theme (design freedom equal to the current WordPress
   sites) — selected by site slug at request time as a template module within the one
   codebase, so "bespoke" costs a new module, not a new deploy. What is **shared and
   admin-managed**, not hard-coded, is the content that feeds those templates:
   - **Per-site category/topic manager** — manage which talent topics/categories each
     site organises its roster by, administered per site in the admin.
   - **Per-site SEO inputs** — SEO metadata entered in the admin (per site, and per
     category), not edited in code.
   - **Per-site mini-blog** — each site has its own blog, authored and administered from
     the admin, rendered by that site's templates.
   - **Extensible "site modules"** — further admin-managed capabilities added later, each
     declaring whether it applies to **all** sites or **some** (a per-site opt-in model),
     so the shared engine grows without every site inheriting every feature.

3. **Talent → site is manual curation.** Which talent appears on a site is decided
   explicitly by staff via the existing per-brand **publish** action (spec 001/009); no
   automatic category-based placement. The publication table remains the single source of
   "who appears where." (If auto-placement is ever wanted, it becomes a defaulting layer
   on top — the manual record stays authoritative.)

4. **Great British Influencers is the greenfield pilot.** A full public site — homepage,
   talent listing, profile pages, and an enquiry form — populated with **net-new
   influencer talent** added to the roster. It is the vehicle to build the engine
   (hostname routing, site config, publish-safe rendering, templates, enquiry capture)
   end to end before generalising it and rebuilding the WordPress sites onto it.

5. **The publish-safe boundary is now load-bearing.** Because the Worker now serves
   unauthenticated public traffic from the same database as the admin, every rendered
   field must be provably publish-safe. Public rendering reads a **publish-safe
   serialization** (never day rates, private contacts, internal notes, operator
   identities, or unpublished/archived records) — the per-brand publication gate from
   spec 001 is the enforcement point. This hardens ADR 0003's field-safety requirement
   from a guideline into a request-path invariant.

## Consequences

- **Spec roadmap** (each its own spec-kit cycle, in order):
  1. **Public site engine + Great British Influencers pilot** — hostname→site routing;
     a per-site config/theme/domain model (the `brand` row grows site settings);
     publish-safe public serialization; bespoke Influencers templates (home, listing,
     profile, enquiry); enquiry capture landing in the admin.
  2. **Per-site category / topic manager + SEO inputs** (admin tool feeding the engine).
  3. **Per-site mini-blog** (admin authoring + public rendering).
  4. **Enquiries module** — the public enquiry form's admin home (promotes the existing
     "Enquiries" roadmap placeholder to a real feature).
  5. **WordPress rebuilds** — migrate the eight existing sites onto the engine one at a
     time, each as its own template module, retiring the WordPress instance per site.
- **Infra per site:** each domain must be bound to the Worker in Cloudflare (custom
  hostname routing) and its DNS pointed in. `greatbritishinfluencers.co.uk` is first.
  All nine domains are already in the owner's Cloudflare account, so binding a site is a
  routing-config step per hostname — not an external dependency or blocker.
- **Per-site design comes as a handoff, rebuilt not imported.** Each site's bespoke
  template module is built from a design handoff (Claude Design or Manus) the owner
  uploads when that site is ready to build — following the existing `design-system/`
  convention: the handoff is the verbatim UI source of truth, rebuilt into the engine's
  stack (React in the Worker), not imported as-is. So a new/rebuilt site's build begins
  when its handoff files land; the engine work (routing, config, publish-safe rendering,
  enquiries) is handoff-independent and can proceed first.
- **Site config lives on the `brand` row / adjacent tables**, not in code: domain(s),
  theme tokens, navigation, homepage composition, contact details, SEO defaults. New
  sites are configured, not coded (templates aside).
- **Two audiences, one Worker:** routing must cleanly split the Access-gated admin
  surface from public hostnames; a request's host determines which it is. Public routes
  never require Access; admin routes always do.
- **Reaffirms the Cloudflare stack at rendering scale** (extends ADR 0002/0003): edge
  rendering close to visitors, D1 read replicas for read-heavy public traffic, R2
  zero-egress media shared across all sites, and Cloudflare Stream if raw video is added.
- **Constitution alignment:** directly realises Principle IV ("one source of truth,
  multi-brand from the start"); the multi-tenant engine is that principle made executable.
