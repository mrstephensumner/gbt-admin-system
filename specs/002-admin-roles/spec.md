# Feature Specification: Admin Roles & Operator Management

**Feature Branch**: `002-admin-roles`

**Created**: 2026-07-16

**Status**: Draft

**Input**: User description: "Admin roles and permissions (operator management). Stephen
(the business owner) must be the master admin ('Owner') of the GBT Admin System. He
administers who else gets access and what they can do: he can invite/add other operators
by email, assign them roles, and remove them. Non-owner admins have configurable
limitations on what they can access or do — e.g. restricting publishing/unpublishing,
archiving, day-rate editing, or operator management itself. Authentication remains
Cloudflare Access (the existing allow-list gate); this feature adds the in-app
authorization layer on top: an operator registry keyed by email, roles, permission
enforcement in the API (not just hidden UI), and a settings screen where the Owner
manages operators. Future modules (enquiries, bookings, invoices, website administration)
will slot into the same permission areas."

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Only registered operators can use the admin (Priority: P1)

Sign-in (Cloudflare Access) says who you are; the operator registry says whether — and
how — you may use the admin. The business owner is registered as the one **Owner** when
the feature arrives. Anyone who passes sign-in but is not in the registry sees a polite,
factual "You don't have access yet — ask the owner to add you" screen and can do nothing.

**Why this priority**: This is the security foundation — without a registry there is
nothing to attach permissions to, and today anyone added to the sign-in allow-list gets
full power implicitly. Even alone, this story converts "can sign in" and "may operate"
into two deliberate decisions.

**Independent Test**: Sign in as the Owner (full access works), then as an
Access-permitted but unregistered email (every screen and every request is refused with
the factual message) — no other story needed.

**Acceptance Scenarios**:

1. **Given** the feature is deployed, **When** the Owner signs in, **Then** they can use
   every function including operator management.
2. **Given** a person whose email passes sign-in but is not in the operator registry,
   **When** they open any page or call any function, **Then** nothing is served except a
   brief factual notice naming who to contact, and no data is readable or writable.
3. **Given** email addresses that differ only in letter case from a registered operator,
   **When** that person signs in, **Then** they are recognised as the registered operator
   (case-insensitive matching).

---

### User Story 2 - Owner manages the operator list (Priority: P2)

The Owner opens a Team settings screen, adds an operator by email address, sees the
current list (who they are, what they may do, when they were added and by whom), and
removes people who leave. Removal takes effect immediately; the departed operator's name
remains on all their historical changes.

**Why this priority**: This is the owner-administers-access promise. It needs Story 1's
registry to exist first.

**Independent Test**: As Owner, add an operator email, verify they can then sign in and
work; remove them, verify their next action is refused while their history remains
attributed.

**Acceptance Scenarios**:

1. **Given** the Team screen, **When** the Owner adds an email address, **Then** the new
   operator appears in the list and that person can use the admin on their next sign-in
   (subject to their permissions).
2. **Given** a registered operator, **When** the Owner removes them, **Then** their very
   next request is refused, they disappear from the active list, and every change record
   they ever made still shows their identity.
3. **Given** the Owner's own row, **When** they attempt to remove or restrict themselves,
   **Then** the system refuses with a factual message — the Owner cannot lock themselves
   out.
4. **Given** an email is added twice (any letter case), **When** the Owner saves, **Then**
   the existing operator is kept — no duplicate registrations exist.
5. **Given** any operator-management change (add, remove, permission change), **Then** a
   team audit trail records who did it, to whom, and when.

---

### User Story 3 - Per-operator permission limits, enforced everywhere (Priority: P3)

Each non-owner operator has a set of permission toggles the Owner controls. For the
current talent module these are: **edit day rates**, **publish/unpublish**,
**archive/restore**, and **manage topics** (rename/merge). Every operator can view the
roster and edit ordinary profile fields; the toggles gate the sensitive actions. Limits
are enforced by the system itself — a blocked action fails safely even if someone crafts
the request directly — and the interface hides or disables what an operator cannot do.

**Why this priority**: This is the "certain limitations" half of the request. It needs
Stories 1–2 in place.

**Independent Test**: Grant an operator only publishing; verify they can publish but
archiving, day-rate edits, and topic merges are refused both in the interface and when
requested directly; flip a toggle and verify the change applies to their next action.

**Acceptance Scenarios**:

1. **Given** an operator without "edit day rates", **When** they edit a profile, **Then**
   the day-rate field is read-only for them, and a direct attempt to change it is refused
   with a factual message and no change recorded.
2. **Given** an operator without "publish/unpublish", **When** they view a profile,
   **Then** publication controls are not offered, and a direct publish attempt is
   refused.
3. **Given** an operator granted a permission, **When** the Owner revokes it, **Then**
   the operator's next attempt at that action is refused — no sign-out/in required.
4. **Given** any refused action, **Then** the message states plainly what permission is
   missing (e.g. "You don't have permission to archive speakers — ask the owner") without
   exclamation marks.
5. **Given** the Owner, **Then** no toggle applies — the Owner always holds every
   permission, including areas added by future modules.

---

### Edge Cases

- Operator removed or restricted mid-session: enforcement is per-request, so the change
  bites on their very next action; anything already saved stays (and stays attributed).
- Someone is on the sign-in allow-list but never registered (or vice versa): sign-in and
  registry are separate lists; the registry is the authority for what happens inside the
  app. The Team screen reminds the Owner that sign-in access is managed separately.
- The Owner's email must always be both signed-in-allowed and registered; the system
  refuses any operation that would leave the registry with no Owner.
- A future module adds new permission areas: existing non-owner operators get **no**
  access to a new area until the Owner grants it (default-deny); the Owner has it
  automatically.
- Two operators manage the team simultaneously: last write wins per operator row, but
  every step is captured in the team audit trail.
- An operator's email changes at their identity provider: their old registration no
  longer matches; the Owner registers the new address (history under the old address is
  preserved as-is).

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: The system MUST keep an operator registry, keyed by email address
  (case-insensitive, stored once), recording each operator's role, permissions, who added
  them, and when.
- **FR-002**: The system MUST recognise exactly one **Owner**, seeded with the business
  owner's email at rollout; the Owner holds every permission (including future ones) and
  is the only role that can manage operators.
- **FR-003**: The system MUST refuse every read and write to any signed-in person whose
  email is not in the active operator registry, showing only a brief factual notice that
  access must be granted by the owner.
- **FR-004**: The Owner MUST be able to add an operator by email, remove an operator,
  and change an operator's permissions from a Team settings screen; changes take effect
  on the affected person's next request.
- **FR-005**: The system MUST prevent any action that would remove, restrict, or demote
  the Owner, or otherwise leave the registry without exactly one Owner.
- **FR-006**: Non-owner operators MUST carry an explicit grant set over named permission
  areas; for this feature the areas are: `edit_day_rates`, `publish`, `archive`, and
  `manage_topics`. All other talent-module actions (viewing the roster and profiles,
  creating and editing ordinary profile fields, managing photos) are available to every
  registered operator.
- **FR-007**: Permission checks MUST be enforced by the system on every request — a
  denied action fails safely with a factual message naming the missing permission, even
  when the request bypasses the interface; the interface additionally hides or disables
  controls the operator cannot use.
- **FR-008**: New permission areas introduced by future modules MUST default to denied
  for existing non-owner operators and granted for the Owner, with no changes required to
  existing operator records.
- **FR-009**: Removing an operator MUST NOT alter or anonymise their historical change
  records; attribution is permanent.
- **FR-010**: The system MUST keep an append-only team audit trail of operator-management
  events (operator added, removed, permission granted/revoked) recording actor, subject,
  detail, and time, visible to the Owner on the Team screen.
- **FR-011**: Duplicate registration of the same email (any letter case) MUST be
  impossible; re-adding an existing email surfaces the existing operator instead.
- **FR-012**: All refusal and management messaging MUST follow the established content
  rules: brief, factual, sentence case, no exclamation marks.

### Key Entities

- **Operator**: A registered user of the admin. Attributes: email (unique,
  case-insensitive), role (Owner or Operator), permission grants (empty set for a new
  operator), added-by/added-at. The registry is the authorisation source of truth;
  sign-in (Cloudflare Access) remains the authentication gate in front of it.
- **Permission area**: A named capability the system enforces (initially
  `edit_day_rates`, `publish`, `archive`, `manage_topics`). Future modules add areas;
  they are definitions in the product, not operator data, so adding one never rewrites
  operator records (default-deny, FR-008).
- **Team audit event**: An append-only record of an operator-management action — actor,
  subject operator, what changed, when. Read-only once written; sibling in spirit to the
  talent change record ([spec 001](../001-talent-management/spec.md)).

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: 100% of sensitive actions (day-rate edits, publish/unpublish,
  archive/restore, topic rename/merge, operator management) are refused for operators
  lacking the grant — verified by attempting each directly, bypassing the interface.
- **SC-002**: A signed-in but unregistered person can read or change exactly nothing —
  zero records exposed across every function of the system.
- **SC-003**: A permission change (grant, revoke, removal) is effective on the affected
  operator's next request — zero grace window beyond the in-flight request.
- **SC-004**: The Owner can add a new operator and set their permissions in under
  2 minutes, without leaving the admin.
- **SC-005**: It is impossible to reach a state with zero Owners — verified by attempting
  owner removal/demotion through every exposed path.
- **SC-006**: 100% of operator-management events appear in the team audit trail with
  actor and timestamp.

## Assumptions

- **Two-list reality is accepted for now**: Cloudflare Access (who can sign in) and the
  operator registry (what they may do) are maintained separately; the Owner updates both
  when onboarding. Automating the sign-in allow-list from the registry is a possible
  future enhancement, out of scope here.
- **Roles are Owner + Operator-with-grants**: no custom role builder or named role
  presets in this feature; grants are per-operator toggles. Presets can come later if
  the team grows.
- **Operator management is Owner-only**: it is not a grantable permission in this
  feature (matching "I can administer who else gets admin").
- **Ownership transfer is out of scope**: the Owner is fixed at rollout; transferring
  ownership would be a deliberate future change.
- **Visibility is not restricted in this feature**: all registered operators can see the
  full roster including day rates; the grants control *actions*. Field-level hiding
  (e.g. concealing day rates from some operators) is a noted future option.
- **No self-service**: operators cannot request access in-app; onboarding is
  owner-initiated (appropriate for a small trusted team).
- **Existing behaviour until rollout**: spec 001's "all operators equal" model remains
  in force until this feature ships; at rollout every already-active email must be
  registered by the Owner (a one-time task, minutes).
