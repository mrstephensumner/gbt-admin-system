import { expect, test } from '@playwright/test'
import { apiCreateTalent, apiUploadPhoto, uniqueName } from './support'

const IDENTITY_HEADER = 'Cf-Access-Authenticated-User-Email'

test.describe('Publishing network (spec 009)', () => {
  test('owner adds a site, then publishes a talent to it via the Network tab', async ({ page, request }) => {
    const slug = `test-site-${Date.now().toString(36)}`
    const siteName = `Test Presenters ${slug}`
    const talent = await apiCreateTalent(request, { name: uniqueName('Network Subject') })
    await apiUploadPhoto(request, talent.reference)

    // Add a network site
    await page.goto('/network')
    await expect(page.getByRole('heading', { name: 'Network' })).toBeVisible()
    await page.getByRole('button', { name: 'Add site' }).click()
    await page.getByLabel('Site name').fill(siteName)
    await page.getByLabel('Slug (permanent key)').fill(slug)
    await page.locator('.gb-dialog').getByRole('button', { name: 'Add site' }).click()
    await expect(page.getByText('Site added').first()).toBeVisible()
    await expect(page.locator('.gb-table').getByText(siteName)).toBeVisible()

    // The talent's Network tab now lists the new site; publish to it
    await page.goto(`/talent/${talent.reference}?tab=site`)
    const panel = page.getByTestId('publication-panel')
    await expect(panel.getByText(siteName)).toBeVisible()
    await panel.locator('div', { hasText: siteName }).getByRole('button', { name: 'Publish' }).first().click()
    await expect(page.getByText('Published').first()).toBeVisible()
  })

  test('operators without the network permission cannot manage sites', async ({ browser, request }) => {
    const email = `no-net-${Date.now()}@example.com`
    await request.post('/api/team/operators', { data: { email } })
    const context = await browser.newContext({ extraHTTPHeaders: { [IDENTITY_HEADER]: email } })
    const page = await context.newPage()
    await page.goto('/')
    await expect(page.locator('.gb-sidebar').getByText('Network')).toHaveCount(0)
    const denied = await context.request.post('/api/network', { data: { name: 'X', slug: 'x-nope' } })
    expect(denied.status()).toBe(403)
    await context.close()
  })
})
