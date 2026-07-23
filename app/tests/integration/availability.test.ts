import { describe, expect, it } from 'vitest'
import { call, createTalent, history } from './helpers'

type Entry = { id: number; state: string; title: string; start_date: string; end_date: string; detail: string | null; location: string | null }

async function listMonth(reference: string, month: string) {
  const { body } = await call('GET', `/talent/${reference}/availability?month=${month}`)
  return body as { entries: Entry[]; working_week: string }
}

async function add(reference: string, data: Partial<Entry> & { state: string; title: string; start_date: string; end_date: string }) {
  return call('POST', `/talent/${reference}/availability`, data)
}

describe('availability month view (spec 012 US1)', () => {
  it('returns entries overlapping the month, plus the working week', async () => {
    const t = await createTalent()
    await add(t.reference, { state: 'confirmed', title: 'Barclays Events', detail: 'Keynote', location: 'London', start_date: '2026-08-12', end_date: '2026-08-12' })
    const aug = await listMonth(t.reference, '2026-08')
    expect(aug.entries).toHaveLength(1)
    expect(aug.entries[0]!.title).toBe('Barclays Events')
    expect(aug.working_week).toBe('mon_fri')
    // not in a different month
    const sep = await listMonth(t.reference, '2026-09')
    expect(sep.entries).toHaveLength(0)
  })

  it('shows a month-spanning entry in both months', async () => {
    const t = await createTalent()
    await add(t.reference, { state: 'blocked', title: 'Sabbatical', start_date: '2026-07-30', end_date: '2026-08-03' })
    expect((await listMonth(t.reference, '2026-07')).entries).toHaveLength(1)
    expect((await listMonth(t.reference, '2026-08')).entries).toHaveLength(1)
  })
})

describe('availability CRUD & validation (US2)', () => {
  it('creates, edits and removes an entry', async () => {
    const t = await createTalent()
    const created = await add(t.reference, { state: 'pencilled', title: 'NHS Academy', start_date: '2026-08-25', end_date: '2026-08-25' })
    expect(created.status).toBe(201)
    const id = (created.body as { id: number }).id

    const edited = await call('PATCH', `/talent/${t.reference}/availability/${id}`, { state: 'confirmed', title: 'NHS Academy', detail: 'Workshop', location: 'Leeds', start_date: '2026-08-25', end_date: '2026-08-25' })
    expect(edited.status).toBe(200)
    expect((await listMonth(t.reference, '2026-08')).entries[0]!.state).toBe('confirmed')

    const del = await call('DELETE', `/talent/${t.reference}/availability/${id}`)
    expect(del.status).toBe(200)
    expect((await listMonth(t.reference, '2026-08')).entries).toHaveLength(0)
  })

  it('refuses an end before start, a missing title, and a bad state', async () => {
    const t = await createTalent()
    const badRange = await add(t.reference, { state: 'blocked', title: 'X', start_date: '2026-08-10', end_date: '2026-08-09' })
    expect(badRange.status).toBe(422)
    expect((badRange.body.error as { code: string }).code).toBe('bad_range')

    const noTitle = await add(t.reference, { state: 'blocked', title: '', start_date: '2026-08-10', end_date: '2026-08-10' })
    expect(noTitle.status).toBe(400)

    const badState = await add(t.reference, { state: 'nope', title: 'X', start_date: '2026-08-10', end_date: '2026-08-10' })
    expect(badState.status).toBe(400)
  })
})

describe('working week (US4)', () => {
  it('persists a valid working week and refuses an invalid one', async () => {
    const t = await createTalent()
    const ok = await call('PATCH', `/talent/${t.reference}/availability/settings`, { working_week: 'mon_sat' })
    expect(ok.status).toBe(200)
    expect((await listMonth(t.reference, '2026-08')).working_week).toBe('mon_sat')

    const bad = await call('PATCH', `/talent/${t.reference}/availability/settings`, { working_week: 'weekends' })
    expect(bad.status).toBe(400)
  })
})

describe('boundary & attribution (US5)', () => {
  it('never exposes availability or working week in the talent record shape', async () => {
    const t = await createTalent()
    await add(t.reference, { state: 'blocked', title: 'Confidential leave', start_date: '2026-08-18', end_date: '2026-08-19' })
    await call('PATCH', `/talent/${t.reference}/availability/settings`, { working_week: 'all' })
    const rec = await call('GET', `/talent/${t.reference}`)
    expect(JSON.stringify(rec.body)).not.toContain('Confidential leave')
    expect(Object.keys(rec.body)).not.toContain('working_week')
    expect(Object.keys(rec.body)).not.toContain('availability')
  })

  it('records availability changes in history, attributed', async () => {
    const t = await createTalent()
    const created = await add(t.reference, { state: 'pencilled', title: 'Hold', start_date: '2026-08-11', end_date: '2026-08-11' })
    await call('DELETE', `/talent/${t.reference}/availability/${(created.body as { id: number }).id}`)
    const actions = (await history(t.reference)).map((h) => h.action)
    expect(actions).toContain('availability_added')
    expect(actions).toContain('availability_removed')
  })
})
