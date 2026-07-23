import { SELF } from 'cloudflare:test'
import { describe, expect, it } from 'vitest'
import { call, createTalent, history, OPERATOR } from './helpers'

type DocVersion = { versionId: number; version_no: number; filename: string; size_bytes: number; uploaded_by: string }
type Doc = { id: number; step_key: string | null; step_label: string | null; title: string; versionCount: number; current: DocVersion }

async function upload(
  reference: string,
  opts: { name?: string; type?: string; bytes?: number[]; title?: string; stepKey?: string; documentId?: number; operator?: string } = {},
) {
  const form = new FormData()
  form.set('file', new File([new Uint8Array(opts.bytes ?? [1, 2, 3, 4, 5])], opts.name ?? 'agreement.pdf', { type: opts.type ?? 'application/pdf' }))
  if (opts.title) form.set('title', opts.title)
  if (opts.stepKey) form.set('step_key', opts.stepKey)
  const path = opts.documentId
    ? `/api/talent/${reference}/documents/${opts.documentId}/versions`
    : `/api/talent/${reference}/documents`
  const res = await SELF.fetch(`http://admin.local${path}`, {
    method: 'POST',
    headers: { 'Cf-Access-Authenticated-User-Email': opts.operator ?? OPERATOR },
    body: form,
  })
  return { status: res.status, body: (await res.json().catch(() => ({}))) as { documents?: Doc[]; error?: { code: string; message: string } } }
}

async function list(reference: string): Promise<Doc[]> {
  const { body } = await call('GET', `/talent/${reference}/documents`)
  return (body as { documents: Doc[] }).documents
}

describe('document upload & retrieval (spec 011 US1)', () => {
  it('uploads a file, lists it with metadata, and downloads the bytes back', async () => {
    const t = await createTalent()
    const up = await upload(t.reference, { title: 'Representation agreement', bytes: [10, 20, 30, 40] })
    expect(up.status).toBe(201)

    const docs = await list(t.reference)
    expect(docs).toHaveLength(1)
    expect(docs[0]!.title).toBe('Representation agreement')
    expect(docs[0]!.current.filename).toBe('agreement.pdf')
    expect(docs[0]!.current.uploaded_by).toBe(OPERATOR)

    const dl = await SELF.fetch(`http://admin.local/api/talent/${t.reference}/documents/${docs[0]!.current.versionId}/file`, {
      headers: { 'Cf-Access-Authenticated-User-Email': OPERATOR },
    })
    expect(dl.status).toBe(200)
    expect(dl.headers.get('content-disposition')).toContain('agreement.pdf')
    expect(Array.from(new Uint8Array(await dl.arrayBuffer()))).toEqual([10, 20, 30, 40])
  })

  it('refuses an unsupported type and an oversized file, storing nothing', async () => {
    const t = await createTalent()
    const bad = await upload(t.reference, { name: 'malware.exe', type: 'application/x-msdownload' })
    expect(bad.status).toBe(400)
    expect(bad.body.error?.code).toBe('unsupported_type')
    expect(await list(t.reference)).toHaveLength(0)
  })
})

describe('step-linked documents (US2)', () => {
  it('links a document to an attestation step and labels it; rejects a derived step', async () => {
    const t = await createTalent()
    const up = await upload(t.reference, { stepKey: 'rep_agreement', title: 'Signed agreement' })
    expect(up.status).toBe(201)
    const docs = await list(t.reference)
    expect(docs[0]!.step_key).toBe('rep_agreement')
    expect(docs[0]!.step_label).toBe('Representation agreement')

    const derived = await upload(t.reference, { stepKey: 'fee_schedule' })
    expect(derived.status).toBe(400)
    expect(derived.body.error?.code).toBe('bad_step')
  })
})

describe('version history (US3)', () => {
  it('adds versions, keeps the prior one downloadable, newest is current', async () => {
    const t = await createTalent()
    await upload(t.reference, { title: 'Agreement', bytes: [1, 1, 1] })
    let docs = await list(t.reference)
    const id = docs[0]!.id
    const v1 = docs[0]!.current.versionId

    await upload(t.reference, { documentId: id, bytes: [2, 2, 2, 2] })
    docs = await list(t.reference)
    expect(docs[0]!.versionCount).toBe(2)
    expect(docs[0]!.current.version_no).toBe(2)

    // the prior version is still downloadable
    const old = await SELF.fetch(`http://admin.local/api/talent/${t.reference}/documents/${v1}/file`, {
      headers: { 'Cf-Access-Authenticated-User-Email': OPERATOR },
    })
    expect(Array.from(new Uint8Array(await old.arrayBuffer()))).toEqual([1, 1, 1])

    const { body } = await call('GET', `/talent/${t.reference}/documents/${id}/versions`)
    const versions = (body as { versions: DocVersion[] }).versions
    expect(versions.map((v) => v.version_no)).toEqual([2, 1]) // newest first
  })
})

describe('delete / erasure (US4)', () => {
  it('deletes the whole document, removes the files, and records it', async () => {
    const t = await createTalent()
    await upload(t.reference, { title: 'Rider' })
    const id = (await list(t.reference))[0]!.id
    const versionId = (await list(t.reference))[0]!.current.versionId

    const del = await call('DELETE', `/talent/${t.reference}/documents/${id}`)
    expect(del.status).toBe(200)
    expect(await list(t.reference)).toHaveLength(0)

    const gone = await SELF.fetch(`http://admin.local/api/talent/${t.reference}/documents/${versionId}/file`, {
      headers: { 'Cf-Access-Authenticated-User-Email': OPERATOR },
    })
    expect(gone.status).toBe(404)
    expect((await history(t.reference)).map((h) => h.action)).toContain('document_deleted')
  })
})

describe('boundary & attribution (US5)', () => {
  it('never exposes document data in the talent record shape', async () => {
    const t = await createTalent()
    await upload(t.reference, { title: 'Confidential' })
    const rec = await call('GET', `/talent/${t.reference}`)
    const serialised = JSON.stringify(rec.body)
    expect(serialised).not.toContain('Confidential')
    expect(Object.keys(rec.body)).not.toContain('documents')
  })

  it('records uploads and versions in history, attributed', async () => {
    const t = await createTalent()
    await upload(t.reference, { title: 'Agreement' })
    const id = (await list(t.reference))[0]!.id
    await upload(t.reference, { documentId: id })
    const actions = (await history(t.reference)).map((h) => h.action)
    expect(actions).toContain('document_uploaded')
    expect(actions).toContain('document_version_added')
  })
})
