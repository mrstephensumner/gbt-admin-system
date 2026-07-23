import { expect, test } from '@playwright/test'
import { apiCreateTalent, apiUploadPhoto, uniqueName } from './support'

const IDENTITY_HEADER = 'Cf-Access-Authenticated-User-Email'

test.describe('Talent onboarding (spec 010)', () => {
  test('checklist shows derived progress; an attestation step advances it; fee schedule saves', async ({ page, request }) => {
    const talent = await apiCreateTalent(request, { name: uniqueName('Onboarding Subject') })
    await apiUploadPhoto(request, talent.reference)

    await page.goto(`/talent/${talent.reference}?tab=onboarding`)
    const tab = page.getByTestId('onboarding-tab')

    // Three derived steps complete out of seven (headshots, biography, fee schedule)
    await expect(tab.getByText('3 of 7 complete')).toBeVisible()

    // Attest the representation agreement → progress advances to 4 of 7
    await tab.getByRole('button', { name: /Representation agreement/ }).click()
    await tab.getByRole('button', { name: /Mark verified/ }).click()
    await expect(page.getByText('Step completed').first()).toBeVisible()
    await expect(tab.getByText('4 of 7 complete')).toBeVisible()

    // Fee schedule step: edit the half-day rate and save
    await tab.getByRole('button', { name: /Fee schedule/ }).click()
    await page.getByLabel('Half-day rate').fill('2500')
    await tab.getByRole('button', { name: 'Save draft' }).click()
    await expect(page.getByText('Fee schedule saved').first()).toBeVisible()
  })

  test('the checklist flags what blocks publishing, and clears when the day rate is set', async ({ page, request }) => {
    const talent = await apiCreateTalent(request, { name: uniqueName('Blocked Subject'), day_rate_pence: null })
    await apiUploadPhoto(request, talent.reference)

    await page.goto(`/talent/${talent.reference}?tab=onboarding`)
    const tab = page.getByTestId('onboarding-tab')
    await expect(tab.getByText(/Blocking publication: Fee schedule/)).toBeVisible()

    // Set the day rate through the Fee schedule step → blocker clears
    await tab.getByRole('button', { name: /Fee schedule/ }).click()
    await page.getByLabel('Standard day rate').fill('4000')
    await tab.getByRole('button', { name: /Save . continue/ }).click()
    await expect(page.getByText('Fee schedule saved').first()).toBeVisible()
    await expect(tab.getByText(/Blocking publication/)).toHaveCount(0)
  })

  test('an operator without the day-rate grant sees fee fields read-only', async ({ browser, request }) => {
    const talent = await apiCreateTalent(request, { name: uniqueName('ReadOnly Subject') })
    const email = `no-rate-${Date.now()}@example.com`
    await request.post('/api/team/operators', { data: { email } })

    const context = await browser.newContext({ extraHTTPHeaders: { [IDENTITY_HEADER]: email } })
    const page = await context.newPage()
    await page.goto(`/talent/${talent.reference}?tab=onboarding`)
    const tab = page.getByTestId('onboarding-tab')
    await tab.getByRole('button', { name: /Fee schedule/ }).click()
    await expect(page.getByLabel('Standard day rate')).toBeDisabled()
    await expect(tab.getByText('ask the owner')).toBeVisible()
    await context.close()
  })
})
