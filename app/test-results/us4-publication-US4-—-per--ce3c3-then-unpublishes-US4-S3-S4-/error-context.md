# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: us4-publication.spec.ts >> US4 — per-brand publication >> publishes a complete record with who/when, then unpublishes (US4-S3/S4)
- Location: tests/e2e/us4-publication.spec.ts:16:3

# Error details

```
Error: locator.click: Target page, context or browser has been closed
Call log:
  - waiting for getByRole('button', { name: 'Publish', exact: true }).first()

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
  11 |     await expect(page.getByTestId('publication-panel').getByText('Not published').first()).toBeVisible()
  12 |     await page.getByRole('button', { name: 'Publish', exact: true }).first().click()
  13 |     await expect(page.getByText('Add a day rate before publishing')).toBeVisible()
  14 |   })
  15 | 
  16 |   test('publishes a complete record with who/when, then unpublishes (US4-S3/S4)', async ({ page, request }) => {
  17 |     const talent = await apiCreateTalent(request, { name: uniqueName('Publishable') })
  18 |     await apiUploadPhoto(request, talent.reference)
  19 | 
  20 |     await page.goto(`/talent/${talent.reference}?tab=site`)
> 21 |     await page.getByRole('button', { name: 'Publish', exact: true }).first().click()
     |                                                                              ^ Error: locator.click: Target page, context or browser has been closed
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