import { expect, test } from '@playwright/test'
import { apiCreateTalent, apiUploadPhoto, uniqueName } from './support'

const PDF = { name: 'agreement.pdf', mimeType: 'application/pdf', buffer: Buffer.from([1, 2, 3, 4, 5]) }

test.describe('Talent documents (spec 011)', () => {
  test('upload a document on the Documents tab, see it listed, then delete it', async ({ page, request }) => {
    const talent = await apiCreateTalent(request, { name: uniqueName('Docs Subject') })

    await page.goto(`/talent/${talent.reference}?tab=documents`)
    const panel = page.getByTestId('documents-panel')
    await expect(page.getByText('No documents yet.')).toBeVisible()

    await page.getByPlaceholder('Title (optional)').fill('Representation agreement')
    await page.locator('input[type="file"]').setInputFiles(PDF)
    await expect(page.getByText('Document uploaded').first()).toBeVisible()
    await expect(panel.getByText('Representation agreement')).toBeVisible()
    await expect(panel.getByText(/agreement\.pdf/)).toBeVisible()

    // Delete it (confirming dialog names the document)
    await panel.getByRole('button', { name: 'Delete document' }).click()
    await page.locator('.gb-dialog').getByRole('button', { name: 'Delete document' }).click()
    await expect(page.getByText('Document deleted').first()).toBeVisible()
    await expect(page.getByText('No documents yet.')).toBeVisible()
  })

  test('a document uploaded on the Representation agreement step appears in the Documents tab, labelled', async ({ page, request }) => {
    const talent = await apiCreateTalent(request, { name: uniqueName('Step Docs Subject') })
    await apiUploadPhoto(request, talent.reference)

    // Upload from the onboarding step (Representation agreement is the first, default-selected step)
    await page.goto(`/talent/${talent.reference}?tab=onboarding`)
    const stepPanel = page.getByTestId('documents-panel')
    await stepPanel.scrollIntoViewIfNeeded()
    await page.locator('input[type="file"]').setInputFiles(PDF)
    await expect(page.getByText('Document uploaded').first()).toBeVisible()
    await expect(stepPanel.getByText(/agreement\.pdf/).first()).toBeVisible()

    // The same document shows in the Documents tab, labelled with its step
    await page.goto(`/talent/${talent.reference}?tab=documents`)
    const docsPanel = page.getByTestId('documents-panel')
    await expect(docsPanel.getByText(/Representation agreement/)).toBeVisible()
  })
})
