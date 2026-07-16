# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: us4-publication.spec.ts >> US4 — per-brand publication >> gates incomplete records with the factual message (US4-S1/S2)
- Location: tests/e2e/us4-publication.spec.ts:5:3

# Error details

```
Error: expect(locator).toBeVisible() failed

Locator: getByTestId('publication-panel').getByText('Not published').first()
Expected: visible
Timeout: 5000ms
Error: element(s) not found

Call log:
  - Expect "toBeVisible" with timeout 5000ms
  - waiting for getByTestId('publication-panel').getByText('Not published').first()

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
    - button "Import"
    - button "Team"
  - text: GBT Admin — internal
- banner: Talent management dev@greatbritishtalent.online · owner
- main:
  - button "Back to speakers"
  - text: UM
  - heading "Unpublishable mrnziu9s7345 Available" [level=1]
  - text: TAL-0043
  - combobox "Status":
    - option "Available" [selected]
    - option "On hold"
    - option "Booked"
    - option "Confirmed"
    - option "Cancelled"
  - button "Archive speaker"
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
  1  | import { expect, test } from '@playwright/test'
  2  | import { apiCreateTalent, apiUploadPhoto, uniqueName } from './support'
  3  | 
  4  | test.describe('US4 — per-brand publication', () => {
  5  |   test('gates incomplete records with the factual message (US4-S1/S2)', async ({ page, request }) => {
  6  |     const talent = await apiCreateTalent(request, {
  7  |       name: uniqueName('Unpublishable'),
  8  |       day_rate_pence: null,
  9  |     })
  10 |     await page.goto(`/talent/${talent.reference}?tab=site`)
> 11 |     await expect(page.getByTestId('publication-panel').getByText('Not published').first()).toBeVisible()
     |                                                                                            ^ Error: expect(locator).toBeVisible() failed
  12 |     await page.getByRole('button', { name: 'Publish', exact: true }).first().click()
  13 |     await expect(page.getByText('Add a day rate before publishing')).toBeVisible()
  14 |   })
  15 | 
  16 |   test('publishes a complete record with who/when, then unpublishes (US4-S3/S4)', async ({ page, request }) => {
  17 |     const talent = await apiCreateTalent(request, { name: uniqueName('Publishable') })
  18 |     await apiUploadPhoto(request, talent.reference)
  19 | 
  20 |     await page.goto(`/talent/${talent.reference}?tab=site`)
  21 |     await page.getByRole('button', { name: 'Publish', exact: true }).first().click()
  22 |     await expect(page.getByText('Published', { exact: false }).first()).toBeVisible()
  23 |     await expect(
  24 |       page.getByTestId('publication-panel').getByText('by dev@greatbritishtalent.online'),
  25 |     ).toBeVisible()
  26 | 
  27 |     await page.getByRole('button', { name: 'Unpublish' }).click()
  28 |     await expect(page.getByTestId('publication-panel').getByText('Not published').first()).toBeVisible()
  29 |   })
  30 | })
  31 | 
```