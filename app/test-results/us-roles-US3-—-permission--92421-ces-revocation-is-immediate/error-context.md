# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: us-roles.spec.ts >> US3 — permission limits in practice >> publish-only operator: UI hides ungranted controls, API enforces, revocation is immediate
- Location: tests/e2e/us-roles.spec.ts:66:3

# Error details

```
Error: expect(locator).toBeVisible() failed

Locator: getByRole('button', { name: 'Publish', exact: true }).first()
Expected: visible
Timeout: 5000ms
Error: element(s) not found

Call log:
  - Expect "toBeVisible" with timeout 5000ms
  - waiting for getByRole('button', { name: 'Publish', exact: true }).first()

```

```yaml
- complementary:
  - img "Great British Talent"
  - navigation:
    - button "Dashboard"
    - button "Speakers"
    - button "Topics"
    - button "Enquiries Soon"
    - button "Bookings Soon"
    - button "Clients Soon"
    - button "Invoices Soon"
  - text: GBT Admin — internal
- banner: Talent management limited-1784235103275@example.com
- main:
  - button "Back to speakers"
  - img "Gated Subject mrnzigqg3585"
  - heading "Gated Subject mrnzigqg3585 Available" [level=1]
  - text: TAL-0009
  - combobox "Status":
    - option "Available" [selected]
    - option "On hold"
    - option "Booked"
    - option "Confirmed"
    - option "Cancelled"
  - tablist:
    - tab "Profile"
    - tab "Photos"
    - tab "Notes 0"
    - tab "Onboarding"
    - tab "Availability"
    - tab "Social & News"
    - tab "Profile Enrichment"
    - tab "Statistics"
    - tab "Site selector" [selected]
    - tab "History"
```

# Test source

```ts
  1   | import { expect, test } from '@playwright/test'
  2   | import type { APIRequestContext } from '@playwright/test'
  3   | import { apiCreateTalent, apiUploadPhoto, uniqueName } from './support'
  4   | 
  5   | /**
  6   |  * Spec 002 journeys. The local dev identity (dev@greatbritishtalent.online)
  7   |  * is the bootstrapped owner (.dev.vars OWNER_EMAIL). Other identities are
  8   |  * impersonated via the dev identity header.
  9   |  */
  10  | const IDENTITY_HEADER = 'Cf-Access-Authenticated-User-Email'
  11  | 
  12  | async function ensureColleague(request: APIRequestContext, email: string, grants: string[] = []) {
  13  |   const res = await request.post('/api/team/operators', { data: { email } })
  14  |   const body = (await res.json()) as { id: number }
  15  |   await request.put(`/api/team/operators/${body.id}/grants`, { data: { grants } })
  16  |   return body.id
  17  | }
  18  | 
  19  | test.describe('US1 — registry gate', () => {
  20  |   test('unregistered identity sees the notice screen and no data', async ({ browser }) => {
  21  |     const context = await browser.newContext({
  22  |       extraHTTPHeaders: { [IDENTITY_HEADER]: `stranger-${Date.now()}@example.com` },
  23  |     })
  24  |     const page = await context.newPage()
  25  |     await page.goto('/speakers')
  26  |     await expect(page.getByText("You don't have access yet")).toBeVisible()
  27  |     await expect(page.getByText('ask the owner', { exact: false }).first()).toBeVisible()
  28  |     // No sidebar, no roster
  29  |     await expect(page.getByText('Speakers')).toHaveCount(0)
  30  |     await context.close()
  31  |   })
  32  | })
  33  | 
  34  | test.describe('US2 — owner manages the team', () => {
  35  |   test('owner adds an operator, sees the audit, and removes them', async ({ page }) => {
  36  |     const email = `${uniqueName('colleague').replace(/\s+/g, '.').toLowerCase()}@example.com`
  37  | 
  38  |     await page.goto('/team')
  39  |     await expect(page.getByRole('heading', { name: 'Team' })).toBeVisible()
  40  |     await expect(page.getByText('· owner')).toBeVisible()
  41  | 
  42  |     await page.getByRole('button', { name: 'Add operator' }).click()
  43  |     await page.getByLabel('Email address').fill(email)
  44  |     await page.locator('.gb-dialog').getByRole('button', { name: 'Add operator' }).click()
  45  |     await expect(page.getByText('Operator added').first()).toBeVisible()
  46  |     await expect(page.locator('.gb-table').getByText(email, { exact: true })).toBeVisible()
  47  | 
  48  |     // Audit trail records the addition, attributed to the owner
  49  |     await expect(
  50  |       page.getByTestId('team-audit').getByText('Operator added — ' + email, { exact: false }),
  51  |     ).toBeVisible()
  52  | 
  53  |     // Remove them: confirmation names the person
  54  |     await page
  55  |       .locator('.gb-table tr', { hasText: email })
  56  |       .getByRole('button', { name: 'Remove', exact: true })
  57  |       .click()
  58  |     await expect(page.locator('.gb-dialog').getByText(`Remove ${email}`)).toBeVisible()
  59  |     await page.locator('.gb-dialog').getByRole('button', { name: 'Remove operator' }).click()
  60  |     await expect(page.getByText('Operator removed').first()).toBeVisible()
  61  |     await expect(page.locator('.gb-table').getByText(email)).toHaveCount(0)
  62  |   })
  63  | })
  64  | 
  65  | test.describe('US3 — permission limits in practice', () => {
  66  |   test('publish-only operator: UI hides ungranted controls, API enforces, revocation is immediate', async ({
  67  |     browser,
  68  |     request,
  69  |   }) => {
  70  |     const email = `limited-${Date.now()}@example.com`
  71  |     const operatorId = await ensureColleague(request, email, ['publish'])
  72  |     const talent = await apiCreateTalent(request, { name: uniqueName('Gated Subject') })
  73  |     await apiUploadPhoto(request, talent.reference)
  74  | 
  75  |     const context = await browser.newContext({ extraHTTPHeaders: { [IDENTITY_HEADER]: email } })
  76  |     const limitedPage = await context.newPage()
  77  | 
  78  |     // Team nav hidden for non-owners
  79  |     await limitedPage.goto('/speakers')
  80  |     await expect(limitedPage.getByText('Speakers').first()).toBeVisible()
  81  |     await expect(limitedPage.locator('.gb-sidebar').getByText('Team')).toHaveCount(0)
  82  | 
  83  |     // Profile: publish offered; archive hidden; day rate read-only
  84  |     await limitedPage.goto(`/talent/${talent.reference}`)
  85  |     await expect(limitedPage.getByRole('button', { name: 'Archive speaker' })).toHaveCount(0)
  86  |     await expect(limitedPage.getByLabel('Day rate (GBP)')).toBeDisabled()
  87  |     await limitedPage.getByRole('tab', { name: 'Site selector' }).click()
> 88  |     await expect(limitedPage.getByRole('button', { name: 'Publish', exact: true }).first()).toBeVisible()
      |                                                                                             ^ Error: expect(locator).toBeVisible() failed
  89  | 
  90  |     // Publishing works with the grant
  91  |     await limitedPage.getByRole('button', { name: 'Publish', exact: true }).first().click()
  92  |     await expect(limitedPage.getByTestId('publication-panel').getByText(/^Published/).first()).toBeVisible()
  93  | 
  94  |     // Direct API attempts without grants are refused (SC-001)
  95  |     const archiveAttempt = await context.request.post(`/api/talent/${talent.reference}/archive`, {
  96  |       data: { version: 2 },
  97  |     })
  98  |     expect(archiveAttempt.status()).toBe(403)
  99  | 
  100 |     // Owner revokes publish → next attempt refused without re-login (SC-003)
  101 |     await request.put(`/api/team/operators/${operatorId}/grants`, { data: { grants: [] } })
  102 |     const unpublishAttempt = await context.request.post(`/api/talent/${talent.reference}/unpublish`, {
  103 |       data: { brand: 'great-british-speakers', version: 2 },
  104 |     })
  105 |     expect(unpublishAttempt.status()).toBe(403)
  106 | 
  107 |     await context.close()
  108 |   })
  109 | })
  110 | 
```