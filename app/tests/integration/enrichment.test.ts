import { env } from 'cloudflare:test'
import { describe, expect, it } from 'vitest'
import { call, createTalent, history, seedBrand } from './helpers'
import { publishSafeBios } from '../../worker/services/enrichment'

const COLLEAGUE = 'colleague@example.com'
// The outbound Anthropic call is stubbed in vitest.workers.config.ts with this text.
const STUB_BIO = 'A distinct, audience-tailored biography grounded in the speaker facts for this site.'

async function brandId(slug: string): Promise<number> {
  const row = await env.DB.prepare('SELECT id FROM brand WHERE slug = ?').bind(slug).first<{ id: number }>()
  return row!.id
}
async function talentId(reference: string): Promise<number> {
  const row = await env.DB.prepare('SELECT id FROM talent WHERE reference = ?').bind(reference).first<{ id: number }>()
  return row!.id
}
type Site = { brand_id: number; bio: { state: string; word_count: number; similarity: number } | null }
const site = (body: Record<string, unknown>, bid: number) => (body.sites as Site[]).find((s) => s.brand_id === bid)!

describe('enrichment settings & key secrecy (spec 013 US1, SC-001)', () => {
  it('stores the key encrypted and never returns it', async () => {
    const put = await call('PUT', '/enrichment/settings', { api_key: 'sk-ant-topsecret-1234', banned_words: ['delve', 'tapestry'] })
    expect(put.status).toBe(200)
    expect(JSON.stringify(put.body)).not.toContain('sk-ant-topsecret')

    const { body } = await call('GET', '/enrichment/settings')
    expect(body.configured).toBe(true)
    expect(body.key_hint).toBe('1234')
    expect(body.banned_words).toEqual(['delve', 'tapestry'])
    expect(JSON.stringify(body)).not.toContain('sk-ant-topsecret')

    const row = await env.DB.prepare('SELECT key_ciphertext FROM enrichment_settings WHERE id = 1').first<{ key_ciphertext: string }>()
    expect(row!.key_ciphertext).not.toContain('topsecret')
  })

  it('is owner-only', async () => {
    await call('POST', '/team/operators', { email: COLLEAGUE })
    expect((await call('PUT', '/enrichment/settings', { model: 'claude-opus-4-8' }, COLLEAGUE)).status).toBe(403)
    expect((await call('GET', '/enrichment/settings', undefined, COLLEAGUE)).status).toBe(403)
  })
})

describe('generation (US3)', () => {
  it('refuses without a configured key', async () => {
    await seedBrand()
    const t = await createTalent()
    const gen = await call('POST', `/talent/${t.reference}/enrichment/${await brandId('great-british-speakers')}/generate`, {})
    expect(gen.status).toBe(409)
    expect((gen.body.error as { code: string }).code).toBe('not_configured')
  })

  it('generates a grounded draft with word count + similarity', async () => {
    await seedBrand()
    await call('PUT', '/enrichment/settings', { api_key: 'sk-ant-key-9999' })
    const t = await createTalent()
    const bid = await brandId('great-british-speakers')
    const gen = await call('POST', `/talent/${t.reference}/enrichment/${bid}/generate`, {})
    expect(gen.status).toBe(200)
    const s = site(gen.body, bid)
    expect(s.bio!.state).toBe('draft')
    expect(s.bio!.word_count).toBeGreaterThan(5)
    expect(typeof s.bio!.similarity).toBe('number')
  })
})

describe('dual approval & publish (US4, SC-003)', () => {
  it('gates publish on both approvals and runs the full flow', async () => {
    await seedBrand()
    await call('PUT', '/enrichment/settings', { api_key: 'sk-ant-key-9999' })
    const t = await createTalent()
    const bid = await brandId('great-british-speakers')
    await call('POST', `/talent/${t.reference}/enrichment/${bid}/generate`, {})

    const early = await call('POST', `/talent/${t.reference}/enrichment/${bid}/publish`, {})
    expect(early.status).toBe(422)
    expect((early.body.error as { message: string }).message).toMatch(/admin and talent approval/)

    await call('POST', `/talent/${t.reference}/enrichment/${bid}/approve`, { by: 'admin' })
    expect((await call('POST', `/talent/${t.reference}/enrichment/${bid}/publish`, {})).status).toBe(422)

    await call('POST', `/talent/${t.reference}/enrichment/${bid}/approve`, { by: 'talent', talent_name: 'Raj Patel' })
    const ok = await call('POST', `/talent/${t.reference}/enrichment/${bid}/publish`, {})
    expect(ok.status).toBe(200)
    expect(site(ok.body, bid).bio!.state).toBe('published')
  })

  it('editing an approved bio drops it back to draft', async () => {
    await seedBrand()
    await call('PUT', '/enrichment/settings', { api_key: 'sk-ant-key-9999' })
    const t = await createTalent()
    const bid = await brandId('great-british-speakers')
    await call('POST', `/talent/${t.reference}/enrichment/${bid}/generate`, {})
    await call('POST', `/talent/${t.reference}/enrichment/${bid}/approve`, { by: 'admin' })
    const edited = await call('PATCH', `/talent/${t.reference}/enrichment/${bid}`, { body: 'An edited biography that resets approvals.' })
    expect(site(edited.body, bid).bio!.state).toBe('draft')
  })
})

describe('publish-safe boundary (SC-004/005)', () => {
  it('only published bios are publish-safe; key/drafts never in the talent shape', async () => {
    await seedBrand()
    await call('POST', '/network', { name: 'Great Business Speakers', slug: 'great-business-speakers' })
    await call('PUT', '/enrichment/settings', { api_key: 'sk-ant-key-secret' })
    const t = await createTalent()
    const speakers = await brandId('great-british-speakers')
    const business = await brandId('great-business-speakers')

    await call('POST', `/talent/${t.reference}/enrichment/${speakers}/generate`, {})
    await call('POST', `/talent/${t.reference}/enrichment/${speakers}/approve`, { by: 'admin' })
    await call('POST', `/talent/${t.reference}/enrichment/${speakers}/approve`, { by: 'talent', talent_name: 'Raj' })
    await call('POST', `/talent/${t.reference}/enrichment/${speakers}/publish`, {})
    await call('POST', `/talent/${t.reference}/enrichment/${business}/generate`, {}) // stays a draft

    const safe = await publishSafeBios(env.DB, await talentId(t.reference))
    expect(safe.map((s) => s.brand_slug)).toEqual(['great-british-speakers'])
    expect(safe[0]!.body).toBe(STUB_BIO)

    const rec = await call('GET', `/talent/${t.reference}`)
    const keys = Object.keys(rec.body)
    for (const leaked of ['source_material', 'site_bios', 'api_key', 'key_ciphertext']) expect(keys).not.toContain(leaked)
    expect(JSON.stringify(rec.body)).not.toContain('sk-ant-key-secret')
  })
})

describe('attribution (SC-005)', () => {
  it('records generate/approve in history', async () => {
    await seedBrand()
    await call('PUT', '/enrichment/settings', { api_key: 'sk-ant-key-9999' })
    const t = await createTalent()
    const bid = await brandId('great-british-speakers')
    await call('POST', `/talent/${t.reference}/enrichment/${bid}/generate`, {})
    await call('POST', `/talent/${t.reference}/enrichment/${bid}/approve`, { by: 'admin' })
    const actions = (await history(t.reference)).map((h) => h.action)
    expect(actions).toContain('enrichment_generated')
    expect(actions).toContain('enrichment_admin_approved')
  })
})
