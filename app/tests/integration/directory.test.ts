import { beforeEach, describe, expect, it } from 'vitest'
import { call, createTalent } from './helpers'

async function seedRoster() {
  await createTalent({ name: 'Raj Patel', topics: ['Leadership', 'Sport'], day_rate_pence: 450_000 })
  await createTalent({ name: 'Amelia Clarke', topics: ['AI'], day_rate_pence: 800_000 })
  await createTalent({ name: 'Tom Okafor', topics: ['Adventure'], day_rate_pence: 90_000 })
  await createTalent({ name: 'Grace Adeyemi', topics: ['Wellbeing'], day_rate_pence: null })
  const onHold = await createTalent({ name: 'Sophie Nguyen', topics: ['AI', 'Leadership'], day_rate_pence: 1_200_000 })
  await call('POST', `/talent/${onHold.reference}/status`, { status: 'on_hold', version: 1 })
  const archived = await createTalent({ name: 'Fatima Begum', topics: ['Wellbeing'] })
  await call('POST', `/talent/${archived.reference}/archive`, { version: 1 })
}

describe('directory (US2, FR-006/007/008)', () => {
  beforeEach(seedRoster)

  it('lists active records with a total for "Showing X of Y"', async () => {
    const { status, body } = await call('GET', '/talent')
    expect(status).toBe(200)
    expect(body.total).toBe(5) // archived record excluded by default
    const items = body.items as { reference: string; topics: unknown[]; status: string }[]
    expect(items).toHaveLength(5)
    expect(items[0]).toHaveProperty('topics')
  })

  it('searches by name fragment, case-insensitively', async () => {
    const { body } = await call('GET', '/talent?q=amel')
    const items = body.items as { name: string }[]
    expect(items).toHaveLength(1)
    expect(items[0]!.name).toBe('Amelia Clarke')
  })

  it('searches by reference, normalising case', async () => {
    const { body } = await call('GET', '/talent?q=tal-0001')
    const items = body.items as { reference: string }[]
    expect(items).toHaveLength(1)
    expect(items[0]!.reference).toBe('TAL-0001')
  })

  it('combines topic and status filters (US2-S2)', async () => {
    const topics = await call('GET', '/topics')
    const ai = (topics.body.items as { id: number; name: string }[]).find((t) => t.name === 'AI')!
    const { body } = await call('GET', `/talent?topic=${ai.id}&status=on_hold`)
    const items = body.items as { name: string }[]
    expect(items).toHaveLength(1)
    expect(items[0]!.name).toBe('Sophie Nguyen')
  })

  it('filters by derived fee band including no_rate (FR-019)', async () => {
    const under1k = await call('GET', '/talent?band=under_1k')
    expect((under1k.body.items as { name: string }[]).map((i) => i.name)).toEqual(['Tom Okafor'])
    const noRate = await call('GET', '/talent?band=no_rate')
    expect((noRate.body.items as { name: string }[]).map((i) => i.name)).toEqual(['Grace Adeyemi'])
    const over10k = await call('GET', '/talent?band=over_10k')
    expect((over10k.body.items as { name: string }[]).map((i) => i.name)).toEqual(['Sophie Nguyen'])
  })

  it('shows archived records only via the archived filter (FR-012)', async () => {
    const { body } = await call('GET', '/talent?archived=true')
    const items = body.items as { name: string; archived: boolean }[]
    expect(items).toHaveLength(1)
    expect(items[0]!.name).toBe('Fatima Begum')
    expect(items[0]!.archived).toBe(true)
  })

  it('paginates with a stable total', async () => {
    const page1 = await call('GET', '/talent?per_page=2&page=1')
    const page2 = await call('GET', '/talent?per_page=2&page=2')
    expect(page1.body.total).toBe(5)
    expect(page2.body.total).toBe(5)
    expect(page1.body.items as unknown[]).toHaveLength(2)
    const refs1 = (page1.body.items as { reference: string }[]).map((i) => i.reference)
    const refs2 = (page2.body.items as { reference: string }[]).map((i) => i.reference)
    expect(refs1.some((r) => refs2.includes(r))).toBe(false)
  })

  it('sorts by day rate with missing rates last', async () => {
    const { body } = await call('GET', '/talent?sort=day_rate')
    const rates = (body.items as { day_rate_pence: number | null }[]).map((i) => i.day_rate_pence)
    expect(rates[0]).toBe(90_000)
    expect(rates[rates.length - 1]).toBeNull()
  })

  it('returns an empty result set (not an error) for a hopeless search', async () => {
    const { status, body } = await call('GET', '/talent?q=zzzznobody')
    expect(status).toBe(200)
    expect(body.total).toBe(0)
    expect(body.items as unknown[]).toHaveLength(0)
  })
})
