import { describe, expect, it } from 'vitest'
import { ALLOWED_DOCUMENT_TYPES, MAX_DOCUMENT_BYTES, currentVersion, formatFileSize, isAllowedDocumentType } from '@shared/documents'

describe('document types & size (spec 011)', () => {
  it('allows PDF, Word, text and JPEG/PNG', () => {
    for (const t of ALLOWED_DOCUMENT_TYPES) expect(isAllowedDocumentType(t)).toBe(true)
    expect(isAllowedDocumentType('application/pdf')).toBe(true)
  })
  it('blocks executables and unknown types', () => {
    expect(isAllowedDocumentType('application/x-msdownload')).toBe(false)
    expect(isAllowedDocumentType('application/zip')).toBe(false)
    expect(isAllowedDocumentType('')).toBe(false)
  })
  it('caps size at 25 MB', () => {
    expect(MAX_DOCUMENT_BYTES).toBe(25 * 1024 * 1024)
  })
})

describe('currentVersion', () => {
  it('picks the highest version number', () => {
    const vs = [{ version_no: 1 }, { version_no: 3 }, { version_no: 2 }]
    expect(currentVersion(vs)?.version_no).toBe(3)
  })
  it('handles a single version and empty list', () => {
    expect(currentVersion([{ version_no: 1 }])?.version_no).toBe(1)
    expect(currentVersion([])).toBeUndefined()
  })
})

describe('formatFileSize', () => {
  it('formats bytes, KB and MB', () => {
    expect(formatFileSize(512)).toBe('512 B')
    expect(formatFileSize(2048)).toBe('2 KB')
    expect(formatFileSize(2_517_000)).toBe('2.4 MB')
  })
})
