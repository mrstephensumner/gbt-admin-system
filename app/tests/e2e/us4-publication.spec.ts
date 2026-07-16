import { expect, test } from '@playwright/test'
import { apiCreateTalent, apiUploadPhoto, uniqueName } from './support'

test.describe('US4 — per-brand publication', () => {
  test('gates incomplete records with the factual message (US4-S1/S2)', async ({ page, request }) => {
    const talent = await apiCreateTalent(request, {
      name: uniqueName('Unpublishable'),
      day_rate_pence: null,
    })
    await page.goto(`/talent/${talent.reference}`)
    await expect(page.getByTestId('publication-panel').getByText('Not published').first()).toBeVisible()
    await page.getByRole('button', { name: 'Publish', exact: true }).first().click()
    await expect(page.getByText('Add a day rate before publishing')).toBeVisible()
  })

  test('publishes a complete record with who/when, then unpublishes (US4-S3/S4)', async ({ page, request }) => {
    const talent = await apiCreateTalent(request, { name: uniqueName('Publishable') })
    await apiUploadPhoto(request, talent.reference)

    await page.goto(`/talent/${talent.reference}`)
    await page.getByRole('button', { name: 'Publish', exact: true }).first().click()
    await expect(page.getByText('Published', { exact: false }).first()).toBeVisible()
    await expect(
      page.getByTestId('publication-panel').getByText('by dev@greatbritishtalent.online'),
    ).toBeVisible()

    await page.getByRole('button', { name: 'Unpublish' }).click()
    await expect(page.getByTestId('publication-panel').getByText('Not published').first()).toBeVisible()
  })
})
