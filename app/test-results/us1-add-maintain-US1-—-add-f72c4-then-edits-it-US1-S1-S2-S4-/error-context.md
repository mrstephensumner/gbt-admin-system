# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: us1-add-maintain.spec.ts >> US1 — add and maintain a talent record >> creates a record with a TAL- reference and initials avatar, then edits it (US1-S1/S2/S4)
- Location: tests/e2e/us1-add-maintain.spec.ts:12:3

# Error details

```
Error: expect(locator).toBeVisible() failed

Locator: getByText('£4,000')
Expected: visible
Timeout: 5000ms
Error: element(s) not found

Call log:
  - Expect "toBeVisible" with timeout 5000ms
  - waiting for getByText('£4,000')

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
  - text: PM
  - heading "Priya Vaughan mrnzin2o958 Available" [level=1]
  - text: TAL-0012
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
- status:
  - text: Changes saved
  - button "Dismiss"
```

# Test source

```ts
  1  | import { expect, test } from '@playwright/test'
  2  | import { uniqueName } from './support'
  3  | 
  4  | test.describe('US1 — add and maintain a talent record', () => {
  5  |   test('blocks saving without required fields, with factual messages (US1-S3)', async ({ page }) => {
  6  |     await page.goto('/talent/new')
  7  |     await page.getByRole('button', { name: 'Add speaker' }).click()
  8  |     await expect(page.getByText('Add a name')).toBeVisible()
  9  |     await expect(page.getByText('Add at least one topic')).toBeVisible()
  10 |   })
  11 | 
  12 |   test('creates a record with a TAL- reference and initials avatar, then edits it (US1-S1/S2/S4)', async ({
  13 |     page,
  14 |   }) => {
  15 |     const name = uniqueName('Priya Vaughan')
  16 |     await page.goto('/talent/new')
  17 |     await page.getByLabel('Full name').fill(name)
  18 |     await page.getByLabel('Add a topic').fill('Leadership')
  19 |     await page.getByLabel('Add a topic').press('Enter')
  20 |     await page.getByRole('button', { name: 'Add speaker' }).click()
  21 | 
  22 |     // Lands on the profile with an assigned reference
  23 |     await expect(page.getByTestId('talent-reference')).toHaveText(/^TAL-\d{4,}$/)
  24 |     // No photo yet → initials placeholder (US1-S4)
  25 |     await expect(page.locator('.gb-avatar__initials').first()).toBeVisible()
  26 | 
  27 |     // Edit the day rate and save (US1-S2)
  28 |     await page.getByLabel('Day rate (GBP)').fill('4000')
  29 |     await page.getByRole('button', { name: 'Save changes' }).click()
  30 |     await expect(page.getByText('Changes saved')).toBeVisible()
  31 | 
  32 |     // History shows the attributed change (FR-004) — History tab
  33 |     await page.getByRole('tab', { name: 'History' }).click()
  34 |     await expect(page.getByTestId('history').getByText('Day rate changed')).toBeVisible()
  35 |     await expect(page.getByTestId('history').getByText('dev@greatbritishtalent.online').first()).toBeVisible()
  36 | 
  37 |     // Money renders in UK format on the profile (FR-013) — Site selector tab
  38 |     await page.getByRole('tab', { name: 'Site selector' }).click()
> 39 |     await expect(page.getByText('£4,000')).toBeVisible()
     |                                            ^ Error: expect(locator).toBeVisible() failed
  40 |   })
  41 | 
  42 |   test('two-tab concurrent edit: later saver is told, nothing silently overwritten (FR-016)', async ({
  43 |     browser,
  44 |   }) => {
  45 |     const context = await browser.newContext()
  46 |     const pageA = await context.newPage()
  47 |     const pageB = await context.newPage()
  48 | 
  49 |     const name = uniqueName('Conflict Case')
  50 |     await pageA.goto('/talent/new')
  51 |     await pageA.getByLabel('Full name').fill(name)
  52 |     await pageA.getByLabel('Add a topic').fill('Testing')
  53 |     await pageA.getByLabel('Add a topic').press('Enter')
  54 |     await pageA.getByRole('button', { name: 'Add speaker' }).click()
  55 |     await expect(pageA.getByTestId('talent-reference')).toHaveText(/^TAL-/)
  56 |     const url = pageA.url()
  57 | 
  58 |     await pageB.goto(url)
  59 |     await expect(pageB.getByTestId('talent-reference')).toHaveText(/^TAL-/)
  60 | 
  61 |     await pageA.getByLabel('Headline').fill('First edit wins')
  62 |     await pageA.getByRole('button', { name: 'Save changes' }).click()
  63 |     await expect(pageA.getByText('Changes saved')).toBeVisible()
  64 | 
  65 |     await pageB.getByLabel('Headline').fill('Second edit must not overwrite')
  66 |     await pageB.getByRole('button', { name: 'Save changes' }).click()
  67 |     await expect(pageB.getByText('This record changed while you were editing')).toBeVisible()
  68 |     await pageB.getByRole('button', { name: 'Reload latest version' }).click()
  69 |     await expect(pageB.getByLabel('Headline')).toHaveValue('First edit wins')
  70 | 
  71 |     await context.close()
  72 |   })
  73 | })
  74 | 
```