import { expect, test } from '@playwright/test'
import { apiCreateTalent, uniqueName } from './support'

test.describe('US3 — track availability status', () => {
  test('offers exactly the five fixed statuses and shows the badge everywhere (US3-S1/S2/S3)', async ({
    page,
    request,
  }) => {
    const name = uniqueName('Status Subject')
    const talent = await apiCreateTalent(request, { name })

    await page.goto(`/talent/${talent.reference}`)
    const select = page.getByLabel('Status')
    await expect(select).toBeVisible()
    const options = await select.locator('option').allTextContents()
    expect(options).toEqual(['Available', 'On hold', 'Booked', 'Confirmed', 'Cancelled'])

    await select.selectOption('on_hold')
    await expect(page.getByText('Status updated')).toBeVisible()
    await expect(page.locator('.gb-badge--warning', { hasText: 'On hold' })).toBeVisible()

    // History attributes the change (US3-S2)
    await expect(page.getByTestId('history').getByText('Status: Available → On hold')).toBeVisible()

    // Directory row shows the same badge and the status filter finds it (US3-S3)
    await page.goto('/speakers')
    await page.getByLabel('Search speakers').fill(name)
    await expect(page.locator('.gb-badge--warning', { hasText: 'On hold' })).toBeVisible()
    await page.getByLabel('Filter by status').selectOption('on_hold')
    await expect(page.getByText(name)).toBeVisible()
    await page.getByLabel('Filter by status').selectOption('available')
    await expect(page.getByText('No speakers match your search.')).toBeVisible()
  })
})
