import { expect, test } from '@playwright/test'
import { apiCreateTalent, apiUploadPhoto, uniqueName } from './support'

test.describe('Talent profile workspace (spec 005)', () => {
  test('tabs render, deep-link works, statistics are real', async ({ page, request }) => {
    const name = uniqueName('Workspace Subject')
    const talent = await apiCreateTalent(request, { name })
    await apiUploadPhoto(request, talent.reference)
    await request.post(`/api/talent/${talent.reference}/status`, { data: { status: 'on_hold', version: 1 } })

    // Default tab is Profile; exactly the five real tabs exist (FR-001/005)
    await page.goto(`/talent/${talent.reference}`)
    const tabs = page.getByRole('tab')
    await expect(tabs).toHaveCount(5)
    await expect(page.getByLabel('Full name')).toBeVisible()
    for (const absent of ['Onboarding', 'Availability', 'Social & News', 'Profile Enrichment']) {
      await expect(page.getByRole('tab', { name: absent })).toHaveCount(0)
    }

    // Statistics tab: real figures (created + photo + status change = 3 events)
    await page.getByRole('tab', { name: 'Statistics' }).click()
    const stats = page.getByTestId('stats-tab')
    await expect(stats.getByText('3 changes all-time · 3 in the last 30 days')).toBeVisible()
    await expect(stats.getByText('Ready to publish')).toBeVisible()
    await expect(stats.locator('.gb-badge--warning', { hasText: 'On hold' })).toBeVisible()

    // Deep link straight to a tab
    await page.goto(`/talent/${talent.reference}?tab=site`)
    await expect(page.getByTestId('publication-panel')).toBeVisible()
    await expect(page.getByText('Not published').first()).toBeVisible()
  })
})
