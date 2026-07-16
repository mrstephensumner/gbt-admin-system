import { expect, test } from '@playwright/test'
import type { APIRequestContext } from '@playwright/test'
import { apiCreateTalent, apiUploadPhoto, uniqueName } from './support'

/**
 * Spec 002 journeys. The local dev identity (dev@greatbritishtalent.online)
 * is the bootstrapped owner (.dev.vars OWNER_EMAIL). Other identities are
 * impersonated via the dev identity header.
 */
const IDENTITY_HEADER = 'Cf-Access-Authenticated-User-Email'

async function ensureColleague(request: APIRequestContext, email: string, grants: string[] = []) {
  const res = await request.post('/api/team/operators', { data: { email } })
  const body = (await res.json()) as { id: number }
  await request.put(`/api/team/operators/${body.id}/grants`, { data: { grants } })
  return body.id
}

test.describe('US1 — registry gate', () => {
  test('unregistered identity sees the notice screen and no data', async ({ browser }) => {
    const context = await browser.newContext({
      extraHTTPHeaders: { [IDENTITY_HEADER]: `stranger-${Date.now()}@example.com` },
    })
    const page = await context.newPage()
    await page.goto('/speakers')
    await expect(page.getByText("You don't have access yet")).toBeVisible()
    await expect(page.getByText('ask the owner', { exact: false }).first()).toBeVisible()
    // No sidebar, no roster
    await expect(page.getByText('Speakers')).toHaveCount(0)
    await context.close()
  })
})

test.describe('US2 — owner manages the team', () => {
  test('owner adds an operator, sees the audit, and removes them', async ({ page }) => {
    const email = `${uniqueName('colleague').replace(/\s+/g, '.').toLowerCase()}@example.com`

    await page.goto('/team')
    await expect(page.getByRole('heading', { name: 'Team' })).toBeVisible()
    await expect(page.getByText('· owner')).toBeVisible()

    await page.getByRole('button', { name: 'Add operator' }).click()
    await page.getByLabel('Email address').fill(email)
    await page.locator('.gb-dialog').getByRole('button', { name: 'Add operator' }).click()
    await expect(page.getByText('Operator added').first()).toBeVisible()
    await expect(page.locator('.gb-table').getByText(email, { exact: true })).toBeVisible()

    // Audit trail records the addition, attributed to the owner
    await expect(
      page.getByTestId('team-audit').getByText('Operator added — ' + email, { exact: false }),
    ).toBeVisible()

    // Remove them: confirmation names the person
    await page
      .locator('.gb-table tr', { hasText: email })
      .getByRole('button', { name: 'Remove', exact: true })
      .click()
    await expect(page.locator('.gb-dialog').getByText(`Remove ${email}`)).toBeVisible()
    await page.locator('.gb-dialog').getByRole('button', { name: 'Remove operator' }).click()
    await expect(page.getByText('Operator removed').first()).toBeVisible()
    await expect(page.locator('.gb-table').getByText(email)).toHaveCount(0)
  })
})

test.describe('US3 — permission limits in practice', () => {
  test('publish-only operator: UI hides ungranted controls, API enforces, revocation is immediate', async ({
    browser,
    request,
  }) => {
    const email = `limited-${Date.now()}@example.com`
    const operatorId = await ensureColleague(request, email, ['publish'])
    const talent = await apiCreateTalent(request, { name: uniqueName('Gated Subject') })
    await apiUploadPhoto(request, talent.reference)

    const context = await browser.newContext({ extraHTTPHeaders: { [IDENTITY_HEADER]: email } })
    const limitedPage = await context.newPage()

    // Team nav hidden for non-owners
    await limitedPage.goto('/speakers')
    await expect(limitedPage.getByText('Speakers').first()).toBeVisible()
    await expect(limitedPage.locator('.gb-sidebar').getByText('Team')).toHaveCount(0)

    // Profile: publish offered; archive hidden; day rate read-only
    await limitedPage.goto(`/talent/${talent.reference}`)
    await expect(limitedPage.getByRole('button', { name: 'Archive speaker' })).toHaveCount(0)
    await expect(limitedPage.getByLabel('Day rate (GBP)')).toBeDisabled()
    await limitedPage.getByRole('tab', { name: 'Site selector' }).click()
    await expect(limitedPage.getByRole('button', { name: 'Publish', exact: true }).first()).toBeVisible()

    // Publishing works with the grant
    await limitedPage.getByRole('button', { name: 'Publish', exact: true }).first().click()
    await expect(limitedPage.getByTestId('publication-panel').getByText(/^Published/).first()).toBeVisible()

    // Direct API attempts without grants are refused (SC-001)
    const archiveAttempt = await context.request.post(`/api/talent/${talent.reference}/archive`, {
      data: { version: 2 },
    })
    expect(archiveAttempt.status()).toBe(403)

    // Owner revokes publish → next attempt refused without re-login (SC-003)
    await request.put(`/api/team/operators/${operatorId}/grants`, { data: { grants: [] } })
    const unpublishAttempt = await context.request.post(`/api/talent/${talent.reference}/unpublish`, {
      data: { brand: 'great-british-speakers', version: 2 },
    })
    expect(unpublishAttempt.status()).toBe(403)

    await context.close()
  })
})
