import { describe, expect, it } from 'vitest'
import { decryptSecret, encryptSecret } from '../../worker/lib/crypto'
import type { Env } from '../../worker/env'

// A deterministic 32-byte base64 key-encryption key for the test.
const KEK = btoa(String.fromCharCode(...Array.from({ length: 32 }, (_, i) => (i * 7 + 3) & 0xff)))
const env = { ENRICHMENT_KEK: KEK } as unknown as Env

describe('AES-GCM secret storage (spec 013 / ADR 0007)', () => {
  it('round-trips: decrypt(encrypt(x)) === x, and ciphertext is not the plaintext', async () => {
    const secret = 'sk-ant-super-secret-key-value'
    const { iv, ciphertext } = await encryptSecret(env, secret)
    expect(ciphertext).not.toContain('super-secret')
    expect(ciphertext).not.toBe(secret)
    expect(await decryptSecret(env, iv, ciphertext)).toBe(secret)
  })

  it('produces a different IV/ciphertext each time (random IV)', async () => {
    const a = await encryptSecret(env, 'same-input')
    const b = await encryptSecret(env, 'same-input')
    expect(a.iv).not.toBe(b.iv)
    expect(a.ciphertext).not.toBe(b.ciphertext)
    expect(await decryptSecret(env, a.iv, a.ciphertext)).toBe('same-input')
  })

  it('fails cleanly with no KEK configured', async () => {
    await expect(encryptSecret({} as Env, 'x')).rejects.toThrow(/ENRICHMENT_KEK/)
  })

  it('fails to decrypt under a wrong KEK', async () => {
    const { iv, ciphertext } = await encryptSecret(env, 'secret')
    const wrong = { ENRICHMENT_KEK: btoa(String.fromCharCode(...Array.from({ length: 32 }, () => 1))) } as unknown as Env
    await expect(decryptSecret(wrong, iv, ciphertext)).rejects.toThrow()
  })
})
