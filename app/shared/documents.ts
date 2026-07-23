/**
 * Document vocabulary (spec 011). Allowed types and size cap for talent
 * documents, plus the current-version rule. Kept in shared/ so the worker and
 * the client agree on what may be uploaded.
 */

export const ALLOWED_DOCUMENT_TYPES = [
  'application/pdf',
  'application/msword',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'text/plain',
  'image/jpeg',
  'image/png',
] as const

/** 25 MB — matches the roster-import ceiling. */
export const MAX_DOCUMENT_BYTES = 25 * 1024 * 1024

export function isAllowedDocumentType(type: string): boolean {
  return (ALLOWED_DOCUMENT_TYPES as readonly string[]).includes(type)
}

/** The current version of a document is the one with the highest version number. */
export function currentVersion<T extends { version_no: number }>(versions: T[]): T | undefined {
  return versions.reduce<T | undefined>((best, v) => (best === undefined || v.version_no > best.version_no ? v : best), undefined)
}

/** A short, human size label (e.g. "180 KB", "2.4 MB"). */
export function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${Math.round(bytes / 1024)} KB`
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
}
