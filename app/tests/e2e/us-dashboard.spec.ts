import { expect, test } from '@playwright/test'
import { apiCreateTalent, apiUploadPhoto, uniqueName } from './support'

test.describe('Operations dashboard (spec 004)', () => {
  test('landing screen shows live KPIs; tiles deep-link to filtered directory', async ({ page, request }) => {
    const name = uniqueName('Dash Held')
    const talent = await apiCreateTalent(request, { name })
    await request.post(`/api/talent/${talent.reference}/status`, { data: { status: 'on_hold', version: 1 } })

    await page.goto('/')
    await expect(page.getByRole('heading', { name: 'Dashboard' })).toBeVisible()
    const grid = page.getByTestId('kpi-grid')
    await expect(grid.getByText('Active speakers')).toBeVisible()
    await expect(grid.getByText('Published — Great British Speakers')).toBeVisible()

    // Tile → pre-filtered directory (FR-003)
    await grid.getByText('On hold').click()
    await expect(page).toHaveURL(/\/speakers\?status=on_hold/)
    await expect(page.getByLabel('Filter by status')).toHaveValue('on_hold')
    await page.getByLabel('Search speakers').fill(name)
    await expect(page.getByText(name)).toBeVisible()
  })

  test('attention lists route to the profile; activity feed shows attributed changes', async ({
    page,
    request,
  }) => {
    const blockedName = uniqueName('Dash Blocked')
    await apiCreateTalent(request, { name: blockedName, day_rate_pence: null })
    const readyName = uniqueName('Dash Ready')
    const ready = await apiCreateTalent(request, { name: readyName })
    await apiUploadPhoto(request, ready.reference)

    await page.goto('/')
    const blockedRow = page.getByTestId('blocked-list').getByText(blockedName)
    await expect(blockedRow).toBeVisible()
    await expect(
      page.getByTestId('blocked-list').locator('div', { hasText: blockedName }).getByText('No day rate').first(),
    ).toBeVisible()
    await expect(page.getByTestId('ready-list').getByText(readyName)).toBeVisible()

    // Activity feed records the photo upload, attributed to the dev operator
    await expect(page.getByTestId('activity-feed').getByText(readyName).first()).toBeVisible()
    await expect(page.getByTestId('activity-feed').getByText('dev@greatbritishtalent.online').first()).toBeVisible()

    // Attention row → profile (SC-004 path)
    await blockedRow.click()
    await expect(page.getByTestId('talent-reference')).toHaveText(/^TAL-/)
    await expect(page.getByRole('heading', { name: new RegExp(blockedName) })).toBeVisible()
  })
})
