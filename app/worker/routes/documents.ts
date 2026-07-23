import { Hono } from 'hono'
import { isAllowedDocumentType, MAX_DOCUMENT_BYTES } from '../../shared/documents'
import type { Env } from '../env'
import { ApiError } from '../middleware/errors'
import type { AuthzVariables } from '../middleware/authorize'
import { addVersion, deleteDocument, getVersionFile, listDocuments, uploadDocument, versionHistory } from '../services/documents'

async function readFile(c: { req: { formData: () => Promise<FormData> } }): Promise<{ bytes: ArrayBuffer; filename: string; contentType: string; size: number; form: FormData }> {
  const form = await c.req.formData().catch(() => {
    throw new ApiError(400, 'invalid_form', 'Send the document as multipart form data')
  })
  const file = form.get('file')
  if (!(file instanceof File)) throw new ApiError(400, 'missing_file', 'Attach a document file')
  if (!isAllowedDocumentType(file.type))
    throw new ApiError(400, 'unsupported_type', 'Documents must be a PDF, Word file, text file, or JPEG/PNG image')
  if (file.size > MAX_DOCUMENT_BYTES) throw new ApiError(400, 'too_large', 'Documents must be 25 MB or smaller')
  return { bytes: await file.arrayBuffer(), filename: file.name, contentType: file.type, size: file.size, form }
}

export const documentRoutes = new Hono<{ Bindings: Env; Variables: AuthzVariables }>()

documentRoutes.get('/talent/:reference/documents', async (c) => c.json(await listDocuments(c.env.DB, c.req.param('reference')!)))

documentRoutes.post('/talent/:reference/documents', async (c) => {
  const { form, ...file } = await readFile(c)
  const title = form.get('title')
  const stepKey = form.get('step_key')
  return c.json(
    await uploadDocument(
      c.env.DB,
      c.env.DOCUMENTS,
      c.req.param('reference')!,
      { ...file, title: typeof title === 'string' ? title : undefined, stepKey: typeof stepKey === 'string' && stepKey !== '' ? stepKey : null },
      c.get('operator'),
    ),
    201,
  )
})

documentRoutes.post('/talent/:reference/documents/:documentId/versions', async (c) => {
  const { bytes, filename, contentType, size } = await readFile(c)
  return c.json(
    await addVersion(c.env.DB, c.env.DOCUMENTS, c.req.param('reference')!, Number(c.req.param('documentId')), { bytes, filename, contentType, size }, c.get('operator')),
    201,
  )
})

documentRoutes.get('/talent/:reference/documents/:documentId/versions', async (c) =>
  c.json(await versionHistory(c.env.DB, c.req.param('reference')!, Number(c.req.param('documentId')))),
)

documentRoutes.get('/talent/:reference/documents/:versionId/file', async (c) => {
  const version = await getVersionFile(c.env.DB, c.req.param('reference')!, Number(c.req.param('versionId')))
  if (!version) throw new ApiError(404, 'not_found', 'No such document')
  const object = await c.env.DOCUMENTS.get(version.r2_key)
  if (!object) throw new ApiError(404, 'not_found', 'Document file is missing')
  return new Response(object.body, {
    headers: {
      'Content-Type': version.content_type,
      'Content-Disposition': `attachment; filename="${version.filename.replace(/"/g, '')}"`,
      'Cache-Control': 'private, no-store',
    },
  })
})

documentRoutes.delete('/talent/:reference/documents/:documentId', async (c) =>
  c.json(await deleteDocument(c.env.DB, c.env.DOCUMENTS, c.req.param('reference')!, Number(c.req.param('documentId')), c.get('operator'))),
)
