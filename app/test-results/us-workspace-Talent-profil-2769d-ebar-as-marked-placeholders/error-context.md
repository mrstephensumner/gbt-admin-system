# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: us-workspace.spec.ts >> Talent profile workspace (spec 005) >> roadmap modules appear in the sidebar as marked placeholders
- Location: tests/e2e/us-workspace.spec.ts:37:3

# Error details

```
Error: expect(locator).toBeVisible() failed

Locator: getByRole('heading', { name: 'Enquiries' })
Expected: visible
Error: strict mode violation: getByRole('heading', { name: 'Enquiries' }) resolved to 2 elements:
    1) <h1>Enquiries</h1> aka getByRole('heading', { name: 'Enquiries', exact: true })
    2) <h2>…</h2> aka getByRole('heading', { name: 'Enquiries In development' })

Call log:
  - Expect "toBeVisible" with timeout 5000ms
  - waiting for getByRole('heading', { name: 'Enquiries' })

```

# Page snapshot

```yaml
- generic [ref=e3]:
  - complementary [ref=e4]:
    - img "Great British Talent" [ref=e6]
    - navigation [ref=e7]:
      - button "Dashboard" [ref=e8] [cursor=pointer]:
        - img [ref=e10]
        - text: Dashboard
      - button "Speakers" [ref=e15] [cursor=pointer]:
        - img [ref=e17]
        - text: Speakers
      - button "Topics" [ref=e22] [cursor=pointer]:
        - img [ref=e24]
        - text: Topics
      - button "Enquiries Soon" [active] [ref=e28] [cursor=pointer]:
        - img [ref=e30]
        - text: Enquiries
        - generic [ref=e33]: Soon
      - button "Bookings Soon" [ref=e34] [cursor=pointer]:
        - img [ref=e36]
        - text: Bookings
        - generic [ref=e39]: Soon
      - button "Clients Soon" [ref=e40] [cursor=pointer]:
        - img [ref=e42]
        - text: Clients
        - generic [ref=e46]: Soon
      - button "Invoices Soon" [ref=e47] [cursor=pointer]:
        - img [ref=e49]
        - text: Invoices
        - generic [ref=e52]: Soon
      - button "Import" [ref=e53] [cursor=pointer]:
        - img [ref=e55]
        - text: Import
      - button "Team" [ref=e59] [cursor=pointer]:
        - img [ref=e61]
        - text: Team
    - generic [ref=e64]: GBT Admin — internal
  - generic [ref=e65]:
    - banner [ref=e66]:
      - generic [ref=e67]: Talent management
      - generic [ref=e68]: dev@greatbritishtalent.online · owner
    - main [ref=e69]:
      - generic [ref=e70]:
        - heading "Enquiries" [level=1] [ref=e72]
        - generic [ref=e75]:
          - img [ref=e77]
          - heading "Enquiries In development" [level=2] [ref=e80]:
            - text: Enquiries
            - generic [ref=e81]: In development
          - paragraph [ref=e82]: The client enquiry pipeline — every incoming request tracked from first contact to a confirmed booking or a recorded loss.
          - generic [ref=e83]:
            - generic [ref=e84]: Planned
            - generic [ref=e85]:
              - generic [ref=e86]: "— Pipeline stages: New · Quoted · Confirmed · Lost"
              - generic [ref=e87]: — Enquiries linked to speakers and clients
              - generic [ref=e88]: — Quote history and follow-up reminders
              - generic [ref=e89]: — Conversion figures on the dashboard
```

# Test source

```ts
  1  | import { expect, test } from '@playwright/test'
  2  | import { apiCreateTalent, apiUploadPhoto, uniqueName } from './support'
  3  | 
  4  | test.describe('Talent profile workspace (spec 005)', () => {
  5  |   test('tabs render, deep-link works, statistics are real', async ({ page, request }) => {
  6  |     const name = uniqueName('Workspace Subject')
  7  |     const talent = await apiCreateTalent(request, { name })
  8  |     await apiUploadPhoto(request, talent.reference)
  9  |     await request.post(`/api/talent/${talent.reference}/status`, { data: { status: 'on_hold', version: 1 } })
  10 | 
  11 |     // Default tab is Profile; five real tabs + four marked placeholders (FR-005 revised)
  12 |     await page.goto(`/talent/${talent.reference}`)
  13 |     const tabs = page.getByRole('tab')
  14 |     await expect(tabs).toHaveCount(9)
  15 |     await expect(page.getByLabel('Full name')).toBeVisible()
  16 | 
  17 |     // Placeholder tabs are unmistakably roadmap items, never dead controls
  18 |     await page.getByRole('tab', { name: 'Availability' }).click()
  19 |     const placeholder = page.getByTestId('coming-soon')
  20 |     await expect(placeholder.getByText('In development')).toBeVisible()
  21 |     await expect(placeholder.getByText('Planned')).toBeVisible()
  22 |     await expect(placeholder.getByRole('button')).toHaveCount(0)
  23 | 
  24 |     // Statistics tab: real figures (created + photo + status change = 3 events)
  25 |     await page.getByRole('tab', { name: 'Statistics' }).click()
  26 |     const stats = page.getByTestId('stats-tab')
  27 |     await expect(stats.getByText('3 changes all-time · 3 in the last 30 days')).toBeVisible()
  28 |     await expect(stats.getByText('Ready to publish')).toBeVisible()
  29 |     await expect(stats.locator('.gb-badge--warning', { hasText: 'On hold' })).toBeVisible()
  30 | 
  31 |     // Deep link straight to a tab
  32 |     await page.goto(`/talent/${talent.reference}?tab=site`)
  33 |     await expect(page.getByTestId('publication-panel')).toBeVisible()
  34 |     await expect(page.getByText('Not published').first()).toBeVisible()
  35 |   })
  36 | 
  37 |   test('roadmap modules appear in the sidebar as marked placeholders', async ({ page }) => {
  38 |     await page.goto('/')
  39 |     for (const label of ['Enquiries', 'Bookings', 'Clients', 'Invoices']) {
  40 |       await expect(page.locator('.gb-sidebar').getByText(label)).toBeVisible()
  41 |     }
  42 |     await page.locator('.gb-sidebar').getByText('Enquiries').click()
> 43 |     await expect(page.getByRole('heading', { name: 'Enquiries' })).toBeVisible()
     |                                                                    ^ Error: expect(locator).toBeVisible() failed
  44 |     await expect(page.getByTestId('coming-soon').getByText('In development')).toBeVisible()
  45 |     await expect(page.getByText('Pipeline stages: New · Quoted · Confirmed · Lost')).toBeVisible()
  46 |   })
  47 | })
  48 | 
```