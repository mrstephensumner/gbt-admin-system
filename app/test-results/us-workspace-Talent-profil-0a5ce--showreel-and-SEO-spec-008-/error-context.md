# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: us-workspace.spec.ts >> Talent profile workspace (spec 005) >> media manager: sections, showreel and SEO (spec 008)
- Location: tests/e2e/us-workspace.spec.ts:78:3

# Error details

```
Error: expect(locator).toBeVisible() failed

Locator: getByTestId('media-tab').getByText('Headshots')
Expected: visible
Error: strict mode violation: getByTestId('media-tab').getByText('Headshots') resolved to 2 elements:
    1) <div class="gb-card__title">Headshots</div> aka getByText('Headshots', { exact: true })
    2) <p class="gb-meta-row">No headshots yet — an initials avatar is shown in…</p> aka getByText('No headshots yet — an')

Call log:
  - Expect "toBeVisible" with timeout 5000ms
  - waiting for getByTestId('media-tab').getByText('Headshots')

```

# Page snapshot

```yaml
- generic [ref=e3]:
  - complementary [ref=e4]:
    - img "Great British Talent" [ref=e6]
    - navigation [ref=e7]:
      - button "Dashboard" [ref=e8] [cursor=pointer]:
        - img [ref=e10]
        - text: Dashboard
      - button "Speakers" [ref=e15] [cursor=pointer]:
        - img [ref=e17]
        - text: Speakers
      - button "Topics" [ref=e22] [cursor=pointer]:
        - img [ref=e24]
        - text: Topics
      - button "Enquiries Soon" [ref=e28] [cursor=pointer]:
        - img [ref=e30]
        - text: Enquiries
        - generic [ref=e33]: Soon
      - button "Bookings Soon" [ref=e34] [cursor=pointer]:
        - img [ref=e36]
        - text: Bookings
        - generic [ref=e39]: Soon
      - button "Clients Soon" [ref=e40] [cursor=pointer]:
        - img [ref=e42]
        - text: Clients
        - generic [ref=e46]: Soon
      - button "Invoices Soon" [ref=e47] [cursor=pointer]:
        - img [ref=e49]
        - text: Invoices
        - generic [ref=e52]: Soon
      - button "Import" [ref=e53] [cursor=pointer]:
        - img [ref=e55]
        - text: Import
      - button "Team" [ref=e59] [cursor=pointer]:
        - img [ref=e61]
        - text: Team
    - generic [ref=e64]: GBT Admin — internal
  - generic [ref=e65]:
    - banner [ref=e66]:
      - generic [ref=e67]: Talent management
      - generic [ref=e68]: dev@greatbritishtalent.online · owner
    - main [ref=e69]:
      - generic [ref=e70]:
        - generic [ref=e71]:
          - generic [ref=e72]:
            - button "Back to speakers" [ref=e73] [cursor=pointer]:
              - img [ref=e74]
            - generic [ref=e77]: MM
            - generic [ref=e78]:
              - heading "Media Subject mrnzimd57734 Available" [level=1] [ref=e79]:
                - text: Media Subject mrnzimd57734
                - generic [ref=e80]: Available
              - generic [ref=e82]: TAL-0011
          - generic [ref=e83]:
            - combobox "Status" [ref=e86]:
              - option "Available" [selected]
              - option "On hold"
              - option "Booked"
              - option "Confirmed"
              - option "Cancelled"
            - button "Archive speaker" [ref=e87] [cursor=pointer]
        - tablist [ref=e88]:
          - tab "Profile" [ref=e89] [cursor=pointer]
          - tab "Photos" [selected] [ref=e90] [cursor=pointer]
          - tab "Notes 0" [ref=e91] [cursor=pointer]:
            - text: Notes
            - generic [ref=e92]: "0"
          - tab "Onboarding" [ref=e93] [cursor=pointer]
          - tab "Availability" [ref=e94] [cursor=pointer]
          - tab "Social & News" [ref=e95] [cursor=pointer]
          - tab "Profile Enrichment" [ref=e96] [cursor=pointer]
          - tab "Statistics" [ref=e97] [cursor=pointer]
          - tab "Site selector" [ref=e98] [cursor=pointer]
          - tab "History" [ref=e99] [cursor=pointer]
        - generic [ref=e101]:
          - generic [ref=e102]:
            - generic [ref=e103]:
              - generic [ref=e104]:
                - generic [ref=e105]:
                  - generic [ref=e106]: Headshots
                  - generic [ref=e107]: Portrait shots — one is the profile avatar
                - button "Upload headshot" [ref=e108] [cursor=pointer]:
                  - img [ref=e109]
                  - text: Upload headshot
              - paragraph [ref=e113]: No headshots yet — an initials avatar is shown instead.
            - generic [ref=e114]:
              - generic [ref=e115]:
                - generic [ref=e116]:
                  - generic [ref=e117]: At events
                  - generic [ref=e118]: The speaker in action at events
                - button "Upload event photo" [ref=e119] [cursor=pointer]:
                  - img [ref=e120]
                  - text: Upload event photo
              - paragraph [ref=e124]: No event photos yet.
            - generic [ref=e125]:
              - generic [ref=e126]:
                - generic [ref=e127]:
                  - generic [ref=e128]: Showreels
                  - generic [ref=e129]: Video links (YouTube, Vimeo or elsewhere)
                - button "Add showreel" [ref=e130] [cursor=pointer]:
                  - img [ref=e131]
                  - text: Add showreel
              - paragraph [ref=e135]: No showreels yet.
          - generic [ref=e136]:
            - generic [ref=e138]:
              - generic [ref=e139]: SEO metadata
              - generic [ref=e140]: For the speaker’s public page
            - generic [ref=e142]:
              - generic [ref=e143]:
                - generic [ref=e144]:
                  - generic [ref=e145]: Meta title
                  - textbox "Meta title" [ref=e147]
                - generic [ref=e148]: 0/60 — good length
              - generic [ref=e149]:
                - generic [ref=e150]:
                  - generic [ref=e151]: Meta description
                  - textbox "Meta description" [ref=e152]
                - generic [ref=e153]: 0/160 — good length
              - generic [ref=e154]:
                - generic [ref=e155]: Focus keyword
                - textbox "Focus keyword" [ref=e157]
              - button "Save SEO" [disabled] [ref=e159]
```

# Test source

```ts
  1   | import { expect, test } from '@playwright/test'
  2   | import { apiCreateTalent, apiUploadPhoto, uniqueName } from './support'
  3   | 
  4   | test.describe('Talent profile workspace (spec 005)', () => {
  5   |   test('tabs render, deep-link works, statistics are real', async ({ page, request }) => {
  6   |     const name = uniqueName('Workspace Subject')
  7   |     const talent = await apiCreateTalent(request, { name })
  8   |     await apiUploadPhoto(request, talent.reference)
  9   |     await request.post(`/api/talent/${talent.reference}/status`, { data: { status: 'on_hold', version: 1 } })
  10  | 
  11  |     // Default tab is Profile; six real tabs + four marked placeholders (FR-005 revised)
  12  |     await page.goto(`/talent/${talent.reference}`)
  13  |     const tabs = page.getByRole('tab')
  14  |     await expect(tabs).toHaveCount(10)
  15  |     await expect(page.getByLabel('Full name')).toBeVisible()
  16  | 
  17  |     // Notes: add one, see attribution + count on the tab (spec 006)
  18  |     await page.getByRole('tab', { name: 'Notes' }).click()
  19  |     await page.getByLabel('Add a note').fill('Prefers morning sessions')
  20  |     await page.getByRole('button', { name: 'Add note' }).click()
  21  |     await expect(page.getByText('Note added').first()).toBeVisible()
  22  |     const notesList = page.getByTestId('notes-list')
  23  |     await expect(notesList.getByText('Prefers morning sessions')).toBeVisible()
  24  |     await expect(notesList.getByText('dev@greatbritishtalent.online')).toBeVisible()
  25  |     await expect(page.getByRole('tab', { name: /Notes/ }).locator('.gb-tab__count')).toHaveText('1')
  26  | 
  27  |     // Placeholder tabs are unmistakably roadmap items, never dead controls
  28  |     await page.getByRole('tab', { name: 'Availability' }).click()
  29  |     const placeholder = page.getByTestId('coming-soon')
  30  |     await expect(placeholder.getByText('In development')).toBeVisible()
  31  |     await expect(placeholder.getByText('Planned')).toBeVisible()
  32  |     await expect(placeholder.getByRole('button')).toHaveCount(0)
  33  | 
  34  |     // Social & News: add a profile with reach and a press mention (spec 007)
  35  |     await page.getByRole('tab', { name: 'Social & News' }).click()
  36  |     const social = page.getByTestId('social-tab')
  37  |     await page.getByRole('button', { name: 'Add profile' }).click()
  38  |     await page.getByLabel('Link (https)').fill('https://linkedin.com/in/workspace-subject')
  39  |     await page.getByLabel('Followers (optional)').fill('12500')
  40  |     await page.locator('.gb-dialog').getByRole('button', { name: 'Add profile' }).click()
  41  |     await expect(page.getByText('Profile added').first()).toBeVisible()
  42  |     await expect(social.getByText('Total recorded reach: 12.5k')).toBeVisible()
  43  |     await expect(social.getByTestId('social-links').getByText('LinkedIn')).toBeVisible()
  44  | 
  45  |     await page.getByRole('button', { name: 'Add mention' }).click()
  46  |     await page.getByLabel('Headline').fill('Speaker of the year')
  47  |     await page.getByLabel('Outlet').fill('BBC News')
  48  |     await page.getByLabel('Link (https)').fill('https://bbc.co.uk/story')
  49  |     await page.getByLabel('Published on').fill('2026-07-10')
  50  |     await page.locator('.gb-dialog').getByRole('button', { name: 'Add mention' }).click()
  51  |     await expect(page.getByText('Mention added').first()).toBeVisible()
  52  |     await expect(social.getByTestId('press-mentions').getByText('Speaker of the year')).toBeVisible()
  53  | 
  54  |     // Statistics tab: real figures (created + photo + status change + note = 4 events)
  55  |     await page.getByRole('tab', { name: 'Statistics' }).click()
  56  |     const stats = page.getByTestId('stats-tab')
  57  |     await expect(stats.getByText('6 changes all-time · 6 in the last 30 days')).toBeVisible()
  58  |     await expect(stats.getByText('Ready to publish')).toBeVisible()
  59  |     await expect(stats.locator('.gb-badge--warning', { hasText: 'On hold' })).toBeVisible()
  60  | 
  61  |     // Deep link straight to a tab
  62  |     await page.goto(`/talent/${talent.reference}?tab=site`)
  63  |     await expect(page.getByTestId('publication-panel')).toBeVisible()
  64  |     await expect(page.getByText('Not published').first()).toBeVisible()
  65  |   })
  66  | 
  67  |   test('roadmap modules appear in the sidebar as marked placeholders', async ({ page }) => {
  68  |     await page.goto('/')
  69  |     for (const label of ['Enquiries', 'Bookings', 'Clients', 'Invoices']) {
  70  |       await expect(page.locator('.gb-sidebar').getByText(label)).toBeVisible()
  71  |     }
  72  |     await page.locator('.gb-sidebar').getByText('Enquiries').click()
  73  |     await expect(page.getByRole('heading', { name: 'Enquiries', exact: true })).toBeVisible()
  74  |     await expect(page.getByTestId('coming-soon').getByText('In development')).toBeVisible()
  75  |     await expect(page.getByText('Pipeline stages: New · Quoted · Confirmed · Lost')).toBeVisible()
  76  |   })
  77  | 
  78  |   test('media manager: sections, showreel and SEO (spec 008)', async ({ page, request }) => {
  79  |     const talent = await apiCreateTalent(request, { name: uniqueName('Media Subject') })
  80  |     await page.goto(`/talent/${talent.reference}?tab=photos`)
  81  |     const media = page.getByTestId('media-tab')
> 82  |     await expect(media.getByText('Headshots')).toBeVisible()
      |                                                ^ Error: expect(locator).toBeVisible() failed
  83  |     await expect(media.getByText('At events')).toBeVisible()
  84  |     await expect(media.getByText('Showreels')).toBeVisible()
  85  | 
  86  |     // Add a showreel via the UI — provider + thumbnail derived
  87  |     await page.getByRole('button', { name: 'Add showreel' }).click()
  88  |     await page.getByLabel('Video link (https)').fill('https://youtu.be/demo123')
  89  |     await page.getByLabel('Title (optional)').fill('Keynote reel')
  90  |     await page.locator('.gb-dialog').getByRole('button', { name: 'Add showreel' }).click()
  91  |     await expect(page.getByText('Showreel added').first()).toBeVisible()
  92  |     await expect(page.getByTestId('showreels').getByText('Keynote reel')).toBeVisible()
  93  |     await expect(page.getByTestId('showreels').getByText('youtube')).toBeVisible()
  94  | 
  95  |     // Save SEO metadata via the sidebar
  96  |     await page.getByLabel('Meta title').fill('Media Subject | Keynote Speaker')
  97  |     await page.getByLabel('Focus keyword').fill('keynote speaker')
  98  |     await page.getByRole('button', { name: 'Save SEO' }).click()
  99  |     await expect(page.getByText('SEO saved').first()).toBeVisible()
  100 |     await expect(page.getByText(/Updated .* by dev@greatbritishtalent.online/)).toBeVisible()
  101 |   })
  102 | })
  103 | 
```