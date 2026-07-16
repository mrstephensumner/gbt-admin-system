import { expect, test } from '@playwright/test'
import { apiCreateTalent, uniqueName } from './support'

test.describe('US2 — find talent quickly', () => {
  test('search narrows results and updates the count (US2-S1)', async ({ page, request }) => {
    const needle = uniqueName('Zelda Quixote')
    await apiCreateTalent(request, { name: needle, topics: ['Search test'] })

    await page.goto('/')
    await page.getByLabel('Search speakers').fill(needle)
    await expect(page.getByText(needle)).toBeVisible()
    await expect(page.getByTestId('result-count')).toContainText('Showing 1 of 1 speakers')
  })

  test('combined filters and preserved context while paging (US2-S2/S3)', async ({ page, request }) => {
    const prefix = uniqueName('Bulk')
    for (let i = 1; i <= 27; i++) {
      await apiCreateTalent(request, { name: `${prefix} ${String(i).padStart(2, '0')}`, topics: ['Bulk topic'] })
    }
    await page.goto('/')
    await page.getByLabel('Search speakers').fill(prefix)
    await expect(page.getByTestId('result-count')).toContainText('Showing 25 of 27 speakers')

    // Page forward: search context preserved (US2-S3)
    await page.getByRole('button', { name: 'Next page' }).click()
    await expect(page.getByTestId('result-count')).toContainText('Showing 2 of 27 speakers')
    await expect(page.getByLabel('Search speakers')).toHaveValue(prefix)

    // Add a status filter on top: nothing on hold in this set
    await page.getByLabel('Filter by status').selectOption('on_hold')
    await expect(page.getByTestId('result-count')).toContainText('Showing 0 of 0 speakers')
  })

  test('empty state offers Clear filters (US2-S4)', async ({ page }) => {
    await page.goto('/')
    await page.getByLabel('Search speakers').fill('zzz-nobody-has-this-name')
    await expect(page.getByText('No speakers match your search.')).toBeVisible()
    await page.getByRole('button', { name: 'Clear filters' }).click()
    await expect(page.getByLabel('Search speakers')).toHaveValue('')
  })
})
