import { expect, test } from '@playwright/test'
import { apiCreateTalent, uniqueName } from './support'

/**
 * Spec 013. The dev identity is the owner (OWNER_EMAIL), so it can reach AI
 * settings. Generation itself calls the live Anthropic API, so it is covered by
 * integration tests (stubbed); the e2e proves the UI wiring: key secrecy, the
 * editorial brief, and the enrichment tab rendering.
 */
test.describe('Profile enrichment (spec 013)', () => {
  test('owner saves the API key; it is only ever shown masked', async ({ page }) => {
    await page.goto('/settings/enrichment')
    await expect(page.getByRole('heading', { name: 'AI enrichment settings' })).toBeVisible()

    await page.getByLabel('API key').fill('sk-ant-e2e-secret-7788')
    await page.getByLabel('Banned words & phrases (one per line)').fill('delve\ntapestry')
    await page.getByRole('button', { name: 'Save settings' }).click()
    await expect(page.getByText('Settings saved').first()).toBeVisible()

    // Re-open: the key is shown only as a masked hint, never in full
    await page.reload()
    await expect(page.getByText(/A key is configured \(ends …7788\)/)).toBeVisible()
    await expect(page.getByLabel('API key')).toHaveValue('')
  })

  test('a network site carries an editorial brief', async ({ page }) => {
    const slug = `brief-site-${Date.now().toString(36)}`
    await page.goto('/network')
    await page.getByRole('button', { name: 'Add site' }).click()
    await page.getByLabel('Site name').fill(`Brief Site ${slug}`)
    await page.getByLabel('Slug (permanent key)').fill(slug)
    await page.locator('.gb-dialog').getByRole('button', { name: 'Add site' }).click()
    await expect(page.getByText('Site added').first()).toBeVisible()

    await page.locator('.gb-table tr', { hasText: `Brief Site ${slug}` }).getByRole('button', { name: 'Edit' }).click()
    await expect(page.getByText('Editorial brief')).toBeVisible()
    await page.getByLabel('Audience / positioning').fill('Corporate bookers seeking commercial keynotes')
    await page.getByLabel('Tone').fill('Commercial, ROI-focused')
    await page.getByLabel('Min words').fill('120')
    await page.getByLabel('Max words').fill('180')
    await page.locator('.gb-dialog').getByRole('button', { name: 'Save site' }).click()
    await expect(page.getByText('Site updated').first()).toBeVisible()
  })

  test('the Profile Enrichment tab lists sites with a generate control', async ({ page, request }) => {
    const talent = await apiCreateTalent(request, { name: uniqueName('Enrichment Subject') })
    await page.goto(`/talent/${talent.reference}?tab=enrichment`)
    await expect(page.getByText('Grounding source')).toBeVisible()
    // The seeded network brand appears as a per-site card with a Generate/Regenerate control
    await expect(page.getByRole('button', { name: /Generate|Regenerate/ }).first()).toBeVisible()
  })
})
