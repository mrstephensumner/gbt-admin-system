import { expect, test } from '@playwright/test'
import { apiCreateTalent, uniqueName } from './support'

test.describe('Social & News visibility (spec 014)', () => {
  test('notable post added on the tab shows on the tab and in the Dashboard feed', async ({ page, request }) => {
    const name = uniqueName('Viral Speaker')
    const talent = await apiCreateTalent(request, { name })
    // A social profile — the deferred follower-sync "connect" stub lives on profile rows.
    await request.post(`/api/talent/${talent.reference}/social/links`, {
      data: { platform: 'instagram', url: 'https://instagram.com/viral', handle: 'viral', followers: 52000 },
    })

    await page.goto(`/talent/${talent.reference}?tab=social`)
    const tab = page.getByTestId('social-tab')

    // Add a notable post through the UI (US1) — unique caption (the e2e DB accumulates rows)
    const caption = uniqueName('Clip broke TikTok')
    await tab.getByRole('button', { name: 'Add post' }).click()
    const dialog = page.locator('.gb-dialog')
    await dialog.getByLabel('Link (https)').fill('https://tiktok.com/@viral/1')
    await dialog.getByLabel('Caption (optional)').fill(caption)
    await dialog.getByLabel('Interactions').fill('128000')
    await dialog.getByLabel('Posted on').fill('2026-07-20')
    await dialog.getByRole('button', { name: 'Add post' }).click()

    await expect(page.getByText('Post added').first()).toBeVisible()
    const posts = page.getByTestId('notable-posts')
    await expect(posts.getByText(caption)).toBeVisible()
    await expect(posts.getByText('128k interactions')).toBeVisible()

    // The follower-sync connect control is present but inert (US3)
    await expect(tab.getByText('Connect · coming soon').first()).toBeVisible()

    // The post surfaces in the Dashboard "Roster in the news" feed (US2)
    await page.goto('/')
    const feed = page.getByTestId('coverage-feed')
    await expect(feed.getByText(caption)).toBeVisible()
    // The speaker name deep-links to their Social & News tab (the caption links out to the post)
    await feed.getByRole('link', { name }).click()
    await expect(page).toHaveURL(new RegExp(`/talent/${talent.reference}\\?tab=social`))
  })

  test('an item can be hidden from public sites via its toggle', async ({ page, request }) => {
    const talent = await apiCreateTalent(request, { name: uniqueName('Boundary Speaker') })
    await request.post(`/api/talent/${talent.reference}/social/mentions`, {
      data: { title: 'On the record', outlet: 'The Paper', url: 'https://paper.example.com/a', published_on: '2026-07-05' },
    })

    await page.goto(`/talent/${talent.reference}?tab=social`)
    const mentions = page.getByTestId('press-mentions')
    const toggle = mentions.getByRole('switch', { name: 'Show on public sites' })
    await expect(toggle).toBeChecked()
    // The <input> is visually hidden behind the styled track — click the label.
    await mentions.locator('label.gb-check', { hasText: 'Show on public sites' }).click()
    await expect(page.getByText('Hidden from public sites').first()).toBeVisible()
    await expect(toggle).not.toBeChecked()
  })
})
