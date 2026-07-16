/**
 * Talent references: `TAL-NNNN` — unique, immutable, never reused (FR-002).
 * Zero-padded to 4 digits, widening naturally past 9999 (TAL-10000).
 * This module is the only place the format is defined.
 */
const REFERENCE_PATTERN = /^TAL-\d{4,}$/

export const REFERENCE_PREFIX = 'TAL-'

export function formatReference(n: number): string {
  if (!Number.isInteger(n) || n < 1) {
    throw new Error(`Reference number must be a positive integer, got ${n}`)
  }
  return `${REFERENCE_PREFIX}${String(n).padStart(4, '0')}`
}

export function isReference(value: unknown): value is string {
  return typeof value === 'string' && REFERENCE_PATTERN.test(value)
}

/** Parse a reference back to its number; returns null for anything malformed. */
export function parseReference(value: string): number | null {
  if (!REFERENCE_PATTERN.test(value)) return null
  return Number.parseInt(value.slice(REFERENCE_PREFIX.length), 10)
}

/** Case-normalise operator-typed input (`tal-0481` → `TAL-0481`) for search. */
export function normaliseReferenceInput(value: string): string {
  return value.trim().toUpperCase()
}
