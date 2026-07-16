import { expect, test } from '@playwright/test'

/**
 * SC-003: directory search results visible in under 2 seconds at 5,000
 * records. Run `npm run seed:perf` first, then `npm run test:e2e:perf`
 * (PERF=1 unignores this spec).
 */
test.describe('SC-003 — directory responsiveness at 5,000 records', () => {
  test('roster really is 5,000 and search results arrive within 2s', async ({ page, request }) => {
    const res = await request.get('/api/talent?per_page=1')
    const { total } = (await res.json()) as { total: number }
    expect(total).toBeGreaterThanOrEqual(4500) // ~3% seeded as archived

    await page.goto('/speakers')
    await expect(page.getByTestId('result-count')).toContainText('speakers')

    const started = Date.now()
    await page.getByLabel('Search speakers').fill('Patel')
    await expect(page.getByTestId('result-count')).not.toContainText('Loading', { timeout: 2000 })
    await page.waitForResponse((r) => r.url().includes('/api/talent?') && r.url().includes('q=Patel'), {
      timeout: 2000,
    })
    const elapsed = Date.now() - started
    expect(elapsed).toBeLessThan(2000)
  })
})
