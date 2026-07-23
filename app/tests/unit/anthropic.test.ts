import { afterEach, describe, expect, it, vi } from 'vitest'
import { generateBio } from '../../worker/lib/anthropic'

afterEach(() => vi.unstubAllGlobals())

function stubFetch(impl: () => Promise<Response> | Response) {
  vi.stubGlobal('fetch', vi.fn(impl))
}

describe('generateBio (spec 013) — the isolated model call', () => {
  it('returns the joined text of the model response', async () => {
    stubFetch(() =>
      new Response(JSON.stringify({ content: [{ type: 'text', text: 'A tailored bio.' }] }), {
        headers: { 'content-type': 'application/json' },
      }),
    )
    expect(await generateBio('k', 'claude-sonnet-5', 'sys', 'user')).toBe('A tailored bio.')
  })

  it('throws generation_failed on a non-2xx response (nothing to store)', async () => {
    stubFetch(() => new Response('bad', { status: 400 }))
    await expect(generateBio('k', 'claude-sonnet-5', 's', 'u')).rejects.toMatchObject({ status: 502, code: 'generation_failed' })
  })

  it('throws generation_failed when the model returns no text', async () => {
    stubFetch(() => new Response(JSON.stringify({ content: [] }), { headers: { 'content-type': 'application/json' } }))
    await expect(generateBio('k', 'claude-sonnet-5', 's', 'u')).rejects.toMatchObject({ code: 'generation_failed' })
  })

  it('throws generation_failed when the network call fails', async () => {
    stubFetch(() => Promise.reject(new Error('network down')))
    await expect(generateBio('k', 'claude-sonnet-5', 's', 'u')).rejects.toMatchObject({ code: 'generation_failed' })
  })

  it('sends the correct endpoint, version header, and disables thinking', async () => {
    const fetchSpy = vi.fn(() =>
      Promise.resolve(new Response(JSON.stringify({ content: [{ type: 'text', text: 'ok' }] }), { headers: { 'content-type': 'application/json' } })),
    )
    vi.stubGlobal('fetch', fetchSpy)
    await generateBio('my-key', 'claude-sonnet-5', 'sys', 'user')
    const [url, init] = fetchSpy.mock.calls[0] as unknown as [string, RequestInit]
    expect(url).toBe('https://api.anthropic.com/v1/messages')
    const headers = init.headers as Record<string, string>
    expect(headers['x-api-key']).toBe('my-key')
    expect(headers['anthropic-version']).toBe('2023-06-01')
    const payload = JSON.parse(init.body as string)
    expect(payload.thinking).toEqual({ type: 'disabled' })
    expect(payload.model).toBe('claude-sonnet-5')
    expect(payload.temperature).toBeUndefined()
  })
})
