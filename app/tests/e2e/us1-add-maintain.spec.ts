import { expect, test } from '@playwright/test'
import { uniqueName } from './support'

test.describe('US1 — add and maintain a talent record', () => {
  test('blocks saving without required fields, with factual messages (US1-S3)', async ({ page }) => {
    await page.goto('/talent/new')
    await page.getByRole('button', { name: 'Add speaker' }).click()
    await expect(page.getByText('Add a name')).toBeVisible()
    await expect(page.getByText('Add at least one topic')).toBeVisible()
  })

  test('creates a record with a TAL- reference and initials avatar, then edits it (US1-S1/S2/S4)', async ({
    page,
  }) => {
    const name = uniqueName('Priya Vaughan')
    await page.goto('/talent/new')
    await page.getByLabel('Full name').fill(name)
    await page.getByLabel('Add a topic').fill('Leadership')
    await page.getByLabel('Add a topic').press('Enter')
    await page.getByRole('button', { name: 'Add speaker' }).click()

    // Lands on the profile with an assigned reference
    await expect(page.getByTestId('talent-reference')).toHaveText(/^TAL-\d{4,}$/)
    // No photo yet → initials placeholder (US1-S4)
    await expect(page.locator('.gb-avatar__initials').first()).toBeVisible()

    // Edit the day rate and save (US1-S2)
    await page.getByLabel('Day rate (GBP)').fill('4000')
    await page.getByRole('button', { name: 'Save changes' }).click()
    await expect(page.getByText('Changes saved')).toBeVisible()

    // History shows the attributed change (FR-004)
    await expect(page.getByTestId('history').getByText('Day rate changed')).toBeVisible()
    await expect(page.getByTestId('history').getByText('dev@greatbritishtalent.online').first()).toBeVisible()

    // Money renders in UK format on the profile (FR-013)
    await expect(page.getByText('£4,000')).toBeVisible()
  })

  test('two-tab concurrent edit: later saver is told, nothing silently overwritten (FR-016)', async ({
    browser,
  }) => {
    const context = await browser.newContext()
    const pageA = await context.newPage()
    const pageB = await context.newPage()

    const name = uniqueName('Conflict Case')
    await pageA.goto('/talent/new')
    await pageA.getByLabel('Full name').fill(name)
    await pageA.getByLabel('Add a topic').fill('Testing')
    await pageA.getByLabel('Add a topic').press('Enter')
    await pageA.getByRole('button', { name: 'Add speaker' }).click()
    await expect(pageA.getByTestId('talent-reference')).toHaveText(/^TAL-/)
    const url = pageA.url()

    await pageB.goto(url)
    await expect(pageB.getByTestId('talent-reference')).toHaveText(/^TAL-/)

    await pageA.getByLabel('Headline').fill('First edit wins')
    await pageA.getByRole('button', { name: 'Save changes' }).click()
    await expect(pageA.getByText('Changes saved')).toBeVisible()

    await pageB.getByLabel('Headline').fill('Second edit must not overwrite')
    await pageB.getByRole('button', { name: 'Save changes' }).click()
    await expect(pageB.getByText('This record changed while you were editing')).toBeVisible()
    await pageB.getByRole('button', { name: 'Reload latest version' }).click()
    await expect(pageB.getByLabel('Headline')).toHaveValue('First edit wins')

    await context.close()
  })
})
