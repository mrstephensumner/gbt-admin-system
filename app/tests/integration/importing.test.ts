import { describe, expect, it } from 'vitest'
import { call, createTalent, seedBrand } from './helpers'

const COLLEAGUE = 'colleague@example.com'

const ROWS = [
  {
    source_id: 'SPK-0481',
    name: 'Dr Jane Smith',
    headline: 'Leadership & change speaker',
    biography: 'Dr Smith has advised FTSE boards for two decades.',
    topics: ['Leadership & Change', 'After-Dinner'],
    day_rate_raw: '£4,000',
    location: 'Manchester, UK',
    email: 'jane@example.com',
    phone: '+44 7700 900100',
    photo_url: null,
  },
  {
    source_id: 'SPK-0203',
    name: 'Tom Okafor',
    biography: 'Tom has led four polar expeditions.',
    topics: ['Adventure'],
    day_rate_raw: 'POA', // unreadable → gap, not a guess (FR-015)
  },
  {
    source_id: 'SPK-0506',
    name: 'No Topics Provided',
    biography: 'Approval must demand a topic.',
    topics: [],
    day_rate_raw: '£950',
  },
]

async function stage(rows: unknown[] = ROWS, dryRun = false, fileName = 'export.csv') {
  return call('POST', '/import/runs', { file_name: fileName, dry_run: dryRun, rows })
}

describe('upload & validate (US1, FR-001/003/004)', () => {
  it('dry run reports reconciling counts and writes nothing', async () => {
    const bad = { source_id: '', name: 'No Id' }
    const { status, body } = await stage([...ROWS, bad], true)
    expect(status).toBe(200)
    expect(body.rows_found).toBe(4)
    expect(body.rows_clean).toBe(3)
    expect(body.rows_problem).toBe(1)
    expect((body.problems as { reason: string }[])[0]!.reason).toBe('Row has no talent identifier')
    expect(body.staged_new).toBe(0)

    const candidates = await call('GET', '/import/candidates')
    expect(candidates.body.total).toBe(0)
    const runs = await call('GET', '/import/runs')
    expect((runs.body.items as { dry_run: number }[])[0]!.dry_run).toBe(1)
  })

  it('stages clean rows with gaps recorded; problems do not abort the run', async () => {
    const dupe = { ...ROWS[0] } // duplicate source_id within the file
    const { body } = await stage([...ROWS, dupe])
    expect(body.staged_new).toBe(3)
    expect(body.rows_problem).toBe(1)
    expect((body.problems as { reason: string }[])[0]!.reason).toContain('Duplicate talent identifier')

    const { body: list } = await call('GET', '/import/candidates')
    const tom = (list.items as { name: string; gaps: string[]; day_rate_pence: number | null }[]).find(
      (c) => c.name === 'Tom Okafor',
    )!
    expect(tom.day_rate_pence).toBeNull()
    expect(tom.gaps).toContain('Day rate unreadable: "POA"')
    const jane = (list.items as { name: string; day_rate_pence: number | null }[]).find(
      (c) => c.name === 'Dr Jane Smith',
    )!
    expect(jane.day_rate_pence).toBe(400_000)
  })

  it('flags possible duplicates against the active roster (FR-012)', async () => {
    await createTalent({ name: 'Dr Jane Smith' })
    const { body } = await stage()
    expect(body.staged_new).toBe(3)
    const { body: list } = await call('GET', '/import/candidates')
    const jane = (list.items as { name: string; duplicate_of: string | null }[]).find(
      (c) => c.name === 'Dr Jane Smith',
    )!
    expect(jane.duplicate_of).toMatch(/^TAL-/)
  })

  it('rejects oversized payloads factually', async () => {
    const { status, body } = await stage(Array.from({ length: 10_001 }, (_, i) => ({ source_id: `S${i}`, name: 'X' })))
    expect(status).toBe(400)
    expect((body.error as { code: string }).code).toBe('too_many_rows')
  })
})

describe('review & approve (US2, FR-005..009, FR-011)', () => {
  it('approves through the standard creation rules, carrying day rate and marking import', async () => {
    await seedBrand()
    await stage()
    const { body: list } = await call('GET', '/import/candidates')
    const jane = (list.items as { id: number; name: string }[]).find((c) => c.name === 'Dr Jane Smith')!

    const { status, body } = await call('POST', '/import/approve', { ids: [jane.id] })
    expect(status).toBe(200)
    const result = (body.results as { ok: boolean; talent_reference: string }[])[0]!
    expect(result.ok).toBe(true)
    expect(result.talent_reference).toMatch(/^TAL-\d{4,}$/)

    const record = await call('GET', `/talent/${result.talent_reference}`)
    expect(record.body.day_rate_pence).toBe(400_000)
    expect(record.body.status).toBe('available')
    expect((record.body.publications as { published: boolean }[]).every((p) => !p.published)).toBe(true)
    const history = await call('GET', `/talent/${result.talent_reference}/history`)
    expect((history.body.items as { new_value: string | null }[]).some((h) => h.new_value === 'Imported from SPK-0481')).toBe(true)

    const after = await call('GET', '/import/candidates?status=imported')
    expect((after.body.items as { talent_reference: string }[])[0]!.talent_reference).toBe(result.talent_reference)
  })

  it('bulk approval reports per-candidate failures without blocking the rest (FR-008)', async () => {
    await stage()
    const { body: list } = await call('GET', '/import/candidates')
    const ids = (list.items as { id: number }[]).map((c) => c.id)
    const { body } = await call('POST', '/import/approve', { ids })
    const results = body.results as { ok: boolean; reason?: string }[]
    expect(results.filter((r) => r.ok)).toHaveLength(2)
    expect(results.find((r) => !r.ok)!.reason).toBe('Add at least one topic')
  })

  it('edit-then-approve creates with corrected values; only new candidates editable', async () => {
    await stage()
    const { body: list } = await call('GET', '/import/candidates')
    const noTopics = (list.items as { id: number; name: string }[]).find((c) => c.name === 'No Topics Provided')!
    await call('PATCH', `/import/candidates/${noTopics.id}`, { topics: ['Testing'], name: 'Now Has Topics' })
    const { body } = await call('POST', '/import/approve', { ids: [noTopics.id] })
    expect((body.results as { ok: boolean }[])[0]!.ok).toBe(true)

    const editAfter = await call('PATCH', `/import/candidates/${noTopics.id}`, { name: 'Too late' })
    expect(editAfter.status).toBe(422)
  })

  it('skip is permanent and survives clearing the staging area (FR-009/014)', async () => {
    await stage()
    const { body: list } = await call('GET', '/import/candidates')
    const tom = (list.items as { id: number; name: string }[]).find((c) => c.name === 'Tom Okafor')!
    await call('POST', `/import/candidates/${tom.id}/skip`)

    const cleared = await call('DELETE', '/import/candidates')
    expect(cleared.body.deleted).toBe(2) // the two remaining news

    const skipped = await call('GET', '/import/candidates?status=skipped')
    expect(skipped.body.total).toBe(1)

    const again = await stage()
    expect(again.body.untouched_skipped).toBe(1)
    expect(again.body.staged_new).toBe(2)
  })

  it('caps approval chunks at 25 ids', async () => {
    const { status } = await call('POST', '/import/approve', { ids: Array.from({ length: 26 }, (_, i) => i + 1) })
    expect(status).toBe(400)
  })
})

describe('idempotence (US3, FR-010/011, SC-003/005)', () => {
  it('double upload: zero duplicates; news refreshed; imported/skipped untouched', async () => {
    await stage()
    const { body: list } = await call('GET', '/import/candidates')
    const jane = (list.items as { id: number; name: string }[]).find((c) => c.name === 'Dr Jane Smith')!
    await call('POST', '/import/approve', { ids: [jane.id] })

    const updatedRows = ROWS.map((r) =>
      r.source_id === 'SPK-0203' ? { ...r, headline: 'Refreshed headline' } : r,
    )
    const second = await stage(updatedRows)
    expect(second.body.staged_new).toBe(0)
    expect(second.body.refreshed).toBe(2)
    expect(second.body.untouched_imported).toBe(1)

    const after = await call('GET', '/import/candidates')
    expect(after.body.total).toBe(2)
    const tom = (after.body.items as { name: string; headline: string | null }[]).find((c) => c.name === 'Tom Okafor')!
    expect(tom.headline).toBe('Refreshed headline')
  })

  it('imports never modify existing talent — admin edits survive re-uploads (FR-011, SC-005)', async () => {
    await stage()
    const { body: list } = await call('GET', '/import/candidates')
    const jane = (list.items as { id: number; name: string }[]).find((c) => c.name === 'Dr Jane Smith')!
    const approved = await call('POST', '/import/approve', { ids: [jane.id] })
    const reference = (approved.body.results as { talent_reference: string }[])[0]!.talent_reference

    await call('PATCH', `/talent/${reference}`, { version: 1, headline: 'Edited in the admin' })
    const before = await call('GET', `/talent/${reference}`)

    await stage()
    const after = await call('GET', `/talent/${reference}`)
    expect(after.body.headline).toBe('Edited in the admin')
    expect(after.body.version).toBe(before.body.version)
    expect(after.body.updated_at).toBe(before.body.updated_at)
  })
})

describe('permissions (FR-013, SC-006)', () => {
  it('every import endpoint refuses operators without import_roster', async () => {
    await call('POST', '/team/operators', { email: COLLEAGUE })
    for (const [method, path, payload] of [
      ['POST', '/import/runs', { file_name: 'x.csv', rows: [] }],
      ['GET', '/import/runs', undefined],
      ['GET', '/import/candidates', undefined],
      ['PATCH', '/import/candidates/1', { name: 'X' }],
      ['POST', '/import/candidates/1/skip', {}],
      ['POST', '/import/approve', { ids: [1] }],
      ['DELETE', '/import/candidates', undefined],
    ] as const) {
      const { status, body } = await call(method, path, payload, COLLEAGUE)
      expect(status).toBe(403)
      expect((body.error as { message: string }).message).toBe(
        "You don't have permission to import roster files — ask the owner",
      )
    }
  })

  it('works once the grant is given', async () => {
    const added = await call('POST', '/team/operators', { email: COLLEAGUE })
    await call('PUT', `/team/operators/${(added.body as { id: number }).id}/grants`, { grants: ['import_roster'] })
    const { status } = await stage(ROWS, true)
    expect(status).toBe(200)
    const asColleague = await call('POST', '/import/runs', { file_name: 'x.csv', dry_run: true, rows: ROWS }, COLLEAGUE)
    expect(asColleague.status).toBe(200)
  })
})
