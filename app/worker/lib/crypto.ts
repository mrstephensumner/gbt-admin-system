import type { Env } from '../env'

/**
 * AES-GCM secret encryption (spec 013 / ADR 0007). The org Anthropic key is
 * stored encrypted in D1 using a Worker-held key-encryption key
 * (`env.ENRICHMENT_KEK`, base64 32 bytes). Plaintext never touches storage.
 */

function b64ToBytes(b64: string): Uint8Array<ArrayBuffer> {
  const bin = atob(b64)
  const out = new Uint8Array(new ArrayBuffer(bin.length))
  for (let i = 0; i < bin.length; i++) out[i] = bin.charCodeAt(i)
  return out
}

function bytesToB64(bytes: Uint8Array): string {
  let bin = ''
  for (const b of bytes) bin += String.fromCharCode(b)
  return btoa(bin)
}

async function importKek(env: Env): Promise<CryptoKey> {
  if (!env.ENRICHMENT_KEK) throw new Error('ENRICHMENT_KEK is not configured')
  const raw = b64ToBytes(env.ENRICHMENT_KEK)
  return crypto.subtle.importKey('raw', raw, { name: 'AES-GCM' }, false, ['encrypt', 'decrypt'])
}

export async function encryptSecret(env: Env, plaintext: string): Promise<{ iv: string; ciphertext: string }> {
  const key = await importKek(env)
  const iv = crypto.getRandomValues(new Uint8Array(12))
  const ct = await crypto.subtle.encrypt({ name: 'AES-GCM', iv }, key, new TextEncoder().encode(plaintext))
  return { iv: bytesToB64(iv), ciphertext: bytesToB64(new Uint8Array(ct)) }
}

export async function decryptSecret(env: Env, iv: string, ciphertext: string): Promise<string> {
  const key = await importKek(env)
  const pt = await crypto.subtle.decrypt({ name: 'AES-GCM', iv: b64ToBytes(iv) }, key, b64ToBytes(ciphertext))
  return new TextDecoder().decode(pt)
}
