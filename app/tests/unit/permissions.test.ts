import { describe, expect, it } from 'vitest'
import {
  PERMISSIONS,
  PERMISSION_LABELS,
  PERMISSION_REFUSALS,
  can,
  isPermission,
} from '@shared/permissions'

describe('permission areas (spec 002 FR-006/007/008)', () => {
  it('defines exactly the four v1 areas in canonical order', () => {
    expect(PERMISSIONS).toEqual(['edit_day_rates', 'publish', 'archive', 'manage_topics'])
  })

  it.each(PERMISSIONS)('accepts area id %s', (p) => {
    expect(isPermission(p)).toBe(true)
  })

  it.each(['delete', 'PUBLISH', '', null, 4])('rejects non-area value %s', (v) => {
    expect(isPermission(v)).toBe(false)
  })

  it('every area has a sentence-case label and a factual refusal without exclamation marks', () => {
    for (const p of PERMISSIONS) {
      expect(PERMISSION_LABELS[p]).toBeTruthy()
      expect(PERMISSION_REFUSALS[p]).toMatch(/^You don't have permission/)
      expect(PERMISSION_REFUSALS[p]).not.toContain('!')
      expect(PERMISSION_REFUSALS[p]).toContain('ask the owner')
    }
  })

  it('owner passes every check regardless of grants (FR-002)', () => {
    for (const p of PERMISSIONS) {
      expect(can({ role: 'owner', grants: [] }, p)).toBe(true)
    }
  })

  it('operators are default-denied and pass only granted areas (FR-008)', () => {
    const op = { role: 'operator' as const, grants: ['publish' as const] }
    expect(can(op, 'publish')).toBe(true)
    expect(can(op, 'archive')).toBe(false)
    expect(can(op, 'edit_day_rates')).toBe(false)
    expect(can(op, 'manage_topics')).toBe(false)
    expect(can({ role: 'operator', grants: [] }, 'publish')).toBe(false)
  })
})
