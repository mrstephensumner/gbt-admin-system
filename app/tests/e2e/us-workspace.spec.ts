import { expect, test } from '@playwright/test'
import { apiCreateTalent, apiUploadPhoto, uniqueName } from './support'

test.describe('Talent profile workspace (spec 005)', () => {
  test('tabs render, deep-link works, statistics are real', async ({ page, request }) => {
    const name = uniqueName('Workspace Subject')
    const talent = await apiCreateTalent(request, { name })
    await apiUploadPhoto(request, talent.reference)
    await request.post(`/api/talent/${talent.reference}/status`, { data: { status: 'on_hold', version: 1 } })

    // Default tab is Profile; six real tabs + four marked placeholders (FR-005 revised)
    await page.goto(`/talent/${talent.reference}`)
    const tabs = page.getByRole('tab')
    await expect(tabs).toHaveCount(10)
    await expect(page.getByLabel('Full name')).toBeVisible()

    // Notes: add one, see attribution + count on the tab (spec 006)
    await page.getByRole('tab', { name: 'Notes' }).click()
    await page.getByLabel('Add a note').fill('Prefers morning sessions')
    await page.getByRole('button', { name: 'Add note' }).click()
    await expect(page.getByText('Note added').first()).toBeVisible()
    const notesList = page.getByTestId('notes-list')
    await expect(notesList.getByText('Prefers morning sessions')).toBeVisible()
    await expect(notesList.getByText('dev@greatbritishtalent.online')).toBeVisible()
    await expect(page.getByRole('tab', { name: /Notes/ }).locator('.gb-tab__count')).toHaveText('1')

    // Placeholder tabs are unmistakably roadmap items, never dead controls
    await page.getByRole('tab', { name: 'Availability' }).click()
    const placeholder = page.getByTestId('coming-soon')
    await expect(placeholder.getByText('In development')).toBeVisible()
    await expect(placeholder.getByText('Planned')).toBeVisible()
    await expect(placeholder.getByRole('button')).toHaveCount(0)

    // Social & News: add a profile with reach and a press mention (spec 007)
    await page.getByRole('tab', { name: 'Social & News' }).click()
    const social = page.getByTestId('social-tab')
    await page.getByRole('button', { name: 'Add profile' }).click()
    await page.getByLabel('Link (https)').fill('https://linkedin.com/in/workspace-subject')
    await page.getByLabel('Followers (optional)').fill('12500')
    await page.locator('.gb-dialog').getByRole('button', { name: 'Add profile' }).click()
    await expect(page.getByText('Profile added').first()).toBeVisible()
    await expect(social.getByText('Total recorded reach: 12.5k')).toBeVisible()
    await expect(social.getByTestId('social-links').getByText('LinkedIn', { exact: true })).toBeVisible()

    await page.getByRole('button', { name: 'Add mention' }).click()
    await page.getByLabel('Headline').fill('Speaker of the year')
    await page.getByLabel('Outlet').fill('BBC News')
    await page.getByLabel('Link (https)').fill('https://bbc.co.uk/story')
    await page.getByLabel('Published on').fill('2026-07-10')
    await page.locator('.gb-dialog').getByRole('button', { name: 'Add mention' }).click()
    await expect(page.getByText('Mention added').first()).toBeVisible()
    await expect(social.getByTestId('press-mentions').getByText('Speaker of the year')).toBeVisible()

    // Statistics tab: real figures (created + photo + status change + note = 4 events)
    await page.getByRole('tab', { name: 'Statistics' }).click()
    const stats = page.getByTestId('stats-tab')
    await expect(stats.getByText('6 changes all-time · 6 in the last 30 days')).toBeVisible()
    await expect(stats.getByText('Ready to publish')).toBeVisible()
    await expect(stats.locator('.gb-badge--warning', { hasText: 'On hold' })).toBeVisible()

    // Deep link straight to a tab
    await page.goto(`/talent/${talent.reference}?tab=site`)
    await expect(page.getByTestId('publication-panel')).toBeVisible()
    await expect(page.getByText('Not published').first()).toBeVisible()
  })

  test('roadmap modules appear in the sidebar as marked placeholders', async ({ page }) => {
    await page.goto('/')
    for (const label of ['Enquiries', 'Bookings', 'Clients', 'Invoices']) {
      await expect(page.locator('.gb-sidebar').getByText(label)).toBeVisible()
    }
    await page.locator('.gb-sidebar').getByText('Enquiries').click()
    await expect(page.getByRole('heading', { name: 'Enquiries', exact: true })).toBeVisible()
    await expect(page.getByTestId('coming-soon').getByText('In development')).toBeVisible()
    await expect(page.getByText('Pipeline stages: New · Quoted · Confirmed · Lost')).toBeVisible()
  })

  test('media manager: sections, showreel and SEO (spec 008)', async ({ page, request }) => {
    const talent = await apiCreateTalent(request, { name: uniqueName('Media Subject') })
    await page.goto(`/talent/${talent.reference}?tab=photos`)
    const media = page.getByTestId('media-tab')
    await expect(media.getByText('Headshots', { exact: true })).toBeVisible()
    await expect(media.getByText('At events', { exact: true })).toBeVisible()
    await expect(media.getByText('Showreels', { exact: true })).toBeVisible()

    // Add a showreel via the UI — provider + thumbnail derived
    await page.getByRole('button', { name: 'Add showreel' }).click()
    await page.getByLabel('Video link (https)').fill('https://youtu.be/demo123')
    await page.getByLabel('Title (optional)').fill('Keynote reel')
    await page.locator('.gb-dialog').getByRole('button', { name: 'Add showreel' }).click()
    await expect(page.getByText('Showreel added').first()).toBeVisible()
    await expect(page.getByTestId('showreels').getByText('Keynote reel')).toBeVisible()
    await expect(page.getByTestId('showreels').getByText('youtube')).toBeVisible()

    // Save SEO metadata via the sidebar
    await page.getByLabel('Meta title').fill('Media Subject | Keynote Speaker')
    await page.getByLabel('Focus keyword').fill('keynote speaker')
    await page.getByRole('button', { name: 'Save SEO' }).click()
    await expect(page.getByText('SEO saved').first()).toBeVisible()
    await expect(page.getByText(/Updated .* by dev@greatbritishtalent.online/)).toBeVisible()
  })
})
