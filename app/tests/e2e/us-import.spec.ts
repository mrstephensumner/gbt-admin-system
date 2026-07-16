import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { expect, test } from '@playwright/test'

const __dirname = path.dirname(fileURLToPath(import.meta.url))

/**
 * Spec 003 journey: upload the fixture export through the real UI →
 * validation report → stage → review → edit → bulk approve → roster
 * populated → re-upload → no duplicates. Dev identity is the owner
 * (holds import_roster automatically).
 */
const IDENTITY_HEADER = 'Cf-Access-Authenticated-User-Email'

/**
 * The dev D1 persists across runs and imported/skipped memory is permanent by
 * design (FR-009/010) — so each run gets unique source ids to stay
 * self-contained. Content mirrors tests/fixtures/roster-sample.csv.
 */
function fixtureCsv(prefix: string): { name: string; mimeType: string; buffer: Buffer } {
  const rows = [
    'Talent ID,Full Name,Headline,Bio,Topics,Day Rate (GBP),Location,Email,Phone,Photo URL',
    `${prefix}-0481,Dr Jane Smith ${prefix},Leadership & change speaker,"Dr Smith has advised FTSE boards.",Leadership & Change; After-Dinner,"£4,000","Manchester, UK",jane@example.com,+44 7700 900100,`,
    `${prefix}-0102,Renée Dubois-O'Connor ${prefix},Économiste,"Renée — accents and a £ sign.",Finance; Broadcasting,4000,"London, UK",renee@example.com,,`,
    `${prefix}-0203,Tom Okafor ${prefix},Polar expedition leader,"Four polar expeditions.",Adventure,POA,"Bristol, UK",,,`,
    `${prefix}-0304,Amelia Clarke ${prefix},AI researcher,"University AI lab.","AI, Technology","4,000.00","Cambridge, UK",amelia@example.com,,`,
    `,Missing Idson,No talent id,"Problem row.",Testing,£500,"Leeds, UK",,,`,
    `${prefix}-0506,No Topics Provided ${prefix},Awkward row,"No topics — approval must demand one.",,£950,"York, UK",,,`,
    `${prefix}-0481,Duplicate Idson,Second use of the id,"Duplicate in file.",Testing,£800,"Hull, UK",,,`,
    `${prefix}-0707,Marcus Webb ${prefix},Olympic rower,"Teamwork.",Sport; Leadership & Change,"£9,500","Henley, UK",,,`,
  ]
  return { name: 'roster-sample.csv', mimeType: 'text/csv', buffer: Buffer.from(rows.join('\n'), 'utf-8') }
}

test.describe('US1–US3 — roster import end to end', () => {
  test.beforeEach(async ({ request }) => {
    // Clean slate: clear staging (skip memory irrelevant here — fresh ids per fixture)
    await request.delete('/api/import/candidates')
  })

  test('upload → validate → stage → review → approve → idempotent re-upload', async ({ page }) => {
    const prefix = `E2E${Date.now().toString(36).toUpperCase()}`
    const file = fixtureCsv(prefix)
    await page.goto('/import')
    await expect(page.getByRole('heading', { name: 'Import roster' })).toBeVisible()

    // Upload the fixture (validation runs automatically)
    await page.locator('input[type="file"]').setInputFiles(file)
    const report = page.getByTestId('validation-report')
    await expect(report.getByText('8 rows found')).toBeVisible()
    await expect(report.getByText('6 clean')).toBeVisible()
    await expect(report.getByText('2 problems')).toBeVisible()
    await expect(report.getByText(/Row 5: Row has no talent identifier/)).toBeVisible()
    await expect(report.getByText(/Row 7: Duplicate talent identifier/)).toBeVisible()

    // Stage
    await page.getByRole('button', { name: /Stage 6 candidates/ }).click()
    await expect(page.getByText('Candidates staged')).toBeVisible()
    await expect(page.getByTestId('candidate-count')).toContainText('Showing 6 of 6 candidates')

    // Gaps and money conservatism visible: POA row has no rate
    const tomRow = page.locator('.gb-table tr', { hasText: `Tom Okafor ${prefix}` })
    await expect(tomRow.getByText('No day rate')).toBeVisible()
    // Fidelity: accents survive
    await expect(page.getByText(`Renée Dubois-O'Connor ${prefix}`)).toBeVisible()

    // Edit the topic-less candidate so it can be approved
    const noTopics = page.locator('.gb-table tr', { hasText: `No Topics Provided ${prefix}` })
    await noTopics.getByRole('button', { name: 'Edit' }).click()
    await page.getByRole('textbox', { name: 'Topics' }).fill('Testing')
    await page.locator('.gb-dialog').getByRole('button', { name: 'Save candidate' }).click()
    await expect(page.getByText('Candidate updated')).toBeVisible()

    // Skip one
    await page
      .locator('.gb-table tr', { hasText: `Marcus Webb ${prefix}` })
      .getByRole('button', { name: 'Skip' })
      .click()
    await expect(page.getByText('Candidate skipped')).toBeVisible()
    await expect(page.getByTestId('candidate-count')).toContainText('Showing 5 of 5 candidates')

    // Select all remaining and bulk approve
    for (const name of [`Dr Jane Smith ${prefix}`, `Renée Dubois-O'Connor ${prefix}`, `Tom Okafor ${prefix}`, `Amelia Clarke ${prefix}`, `No Topics Provided ${prefix}`]) {
      await page.locator('.gb-table tr', { hasText: name }).locator('.gb-check').click()
    }
    await page.getByRole('button', { name: /Approve selected \(5\)/ }).click()
    await expect(page.getByText('5 approved')).toBeVisible()

    // Roster populated with fidelity: Jane's £4,000 carried over, unpublished by default
    await page.goto('/')
    await page.getByLabel('Search speakers').fill(`Dr Jane Smith ${prefix}`)
    await expect(page.getByText(`Dr Jane Smith ${prefix}`)).toBeVisible()
    await expect(page.getByText('£4,000').first()).toBeVisible()

    // Re-upload the same file: nothing re-staged (US3)
    await page.goto('/import')
    await page.locator('input[type="file"]').setInputFiles(file)
    const second = page.getByTestId('validation-report')
    await expect(second.getByText('5 already imported')).toBeVisible()
    await expect(second.getByText('1 skipped previously')).toBeVisible()

    // Recent transfers logs every run
    await expect(page.getByTestId('recent-transfers').getByText('roster-sample.csv').first()).toBeVisible()
  })

  test('operators without the import grant see no Import nav and are refused by the API', async ({
    browser,
    request,
  }) => {
    const email = `no-import-${Date.now()}@example.com`
    await request.post('/api/team/operators', { data: { email } })

    const context = await browser.newContext({ extraHTTPHeaders: { [IDENTITY_HEADER]: email } })
    const page = await context.newPage()
    await page.goto('/')
    await expect(page.locator('.gb-sidebar').getByText('Import')).toHaveCount(0)

    const denied = await context.request.post('/api/import/runs', {
      data: { file_name: 'x.csv', dry_run: true, rows: [] },
    })
    expect(denied.status()).toBe(403)
    const body = (await denied.json()) as { error: { message: string } }
    expect(body.error.message).toBe("You don't have permission to import roster files — ask the owner")
    await context.close()
  })
})
