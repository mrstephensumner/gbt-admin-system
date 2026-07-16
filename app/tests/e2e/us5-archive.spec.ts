import { expect, test } from '@playwright/test'
import { apiCreateTalent, apiUploadPhoto, uniqueName } from './support'

test.describe('US5 — archive without losing history', () => {
  test('archive names the talent, discloses auto-unpublish, and is reversible (US5-S1/S2/S3)', async ({
    page,
    request,
  }) => {
    const name = uniqueName('Archie Vable')
    const talent = await apiCreateTalent(request, { name })
    await apiUploadPhoto(request, talent.reference)

    // Publish first so archiving must disclose auto-unpublication
    await page.goto(`/talent/${talent.reference}`)
    await page.getByRole('button', { name: 'Publish', exact: true }).first().click()
    await expect(page.getByTestId('publication-panel').getByText(/^Published/).first()).toBeVisible()

    // Archive: confirmation names the talent and discloses unpublish (US5-S1)
    await page.getByRole('button', { name: 'Archive speaker' }).first().click()
    await expect(page.getByText(`Archive ${name}`)).toBeVisible()
    await expect(page.getByText('unpublish them from every brand website', { exact: false })).toBeVisible()
    await page.locator('.gb-dialog').getByRole('button', { name: 'Archive speaker' }).click()
    await expect(page.getByText('Speaker archived')).toBeVisible()

    // Gone from the active directory, present under Archived (US5-S2)
    await page.goto('/')
    await page.getByLabel('Search speakers').fill(name)
    await expect(page.getByText('No speakers match your search.')).toBeVisible()
    await page.getByRole('tab', { name: 'Archived' }).click()
    await expect(page.getByText(name)).toBeVisible()

    // Open the archived record: history intact, no publish actions, then restore (US5-S3)
    await page.getByText(name).click()
    await expect(page.getByTestId('history').getByText('Archived').first()).toBeVisible()
    await expect(page.getByRole('button', { name: 'Publish', exact: true })).toHaveCount(0)
    await page.getByRole('button', { name: 'Restore speaker' }).click()
    await expect(page.getByText('Speaker restored')).toBeVisible()
    await expect(page.locator('.gb-badge--success', { hasText: 'Available' })).toBeVisible()
  })
})
