import { ApiError } from '../middleware/errors'

/**
 * The single external LLM call (spec 013 / ADR 0007). Isolated here so the rest
 * of the system stays pure and every test can stub the outbound fetch. Uses a
 * direct call to the Anthropic Messages API rather than the SDK — the SDK's
 * transitive webhook dependency does not resolve under the workerd test runtime,
 * and a single grounded, non-streaming request needs nothing the SDK adds.
 * Thinking is disabled (a grounded rewrite needs no reasoning trace) and no
 * sampling params are sent (removed on current models). British English is
 * enforced by the prompt, not a parameter.
 */
export async function generateBio(apiKey: string, model: string, system: string, user: string): Promise<string> {
  let resp: Response
  try {
    resp = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'x-api-key': apiKey,
        'anthropic-version': '2023-06-01',
        'content-type': 'application/json',
      },
      body: JSON.stringify({
        model,
        max_tokens: 1024,
        thinking: { type: 'disabled' },
        system,
        messages: [{ role: 'user', content: user }],
      }),
    })
  } catch {
    throw new ApiError(502, 'generation_failed', 'Could not reach the model')
  }
  if (!resp.ok) throw new ApiError(502, 'generation_failed', `Generation failed (${resp.status})`)
  const data = (await resp.json().catch(() => ({}))) as { content?: { type: string; text?: string }[] }
  const text = (data.content ?? [])
    .filter((b) => b.type === 'text')
    .map((b) => b.text ?? '')
    .join('')
    .trim()
  if (!text) throw new ApiError(502, 'generation_failed', 'The model returned no text')
  return text
}
