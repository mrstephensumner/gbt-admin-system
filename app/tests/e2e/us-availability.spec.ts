import { expect, test } from '@playwright/test'
import { apiCreateTalent, uniqueName } from './support'

test.describe('Talent availability (spec 012)', () => {
  test('calendar renders; Block dates adds an entry; working week persists', async ({ page, request }) => {
    const talent = await apiCreateTalent(request, { name: uniqueName('Availability Subject') })

    await page.goto(`/talent/${talent.reference}?tab=availability`)
    await expect(page.getByTestId('availability-calendar')).toBeVisible()
    // Legend present (Pencilled appears only in the legend before any dialog opens)
    await expect(page.getByText('Pencilled')).toBeVisible()

    // Block dates → dialog defaults to Blocked; fill a title and save (dates prefilled to the month)
    await page.getByRole('button', { name: 'Block dates' }).click()
    await page.getByLabel('Title').fill('Annual leave')
    await page.locator('.gb-dialog').getByRole('button', { name: 'Add entry' }).click()
    await expect(page.getByText('Entry added').first()).toBeVisible()

    // It appears in the This-month list
    const list = page.getByTestId('availability-list')
    await expect(list.getByText('Annual leave')).toBeVisible()

    // Set the working week
    await page.getByLabel('Default working week').selectOption('mon_sat')
    await expect(page.getByText('Working week updated').first()).toBeVisible()
  })
})
