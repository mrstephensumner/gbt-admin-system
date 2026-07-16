/**
 * Typed API client. All requests go same-origin to /api (contracts/api.md).
 * 409 responses surface the server's current record so screens can offer the
 * reload-and-reapply flow (FR-016).
 */
export class ApiClientError extends Error {
  constructor(
    public status: number,
    public code: string,
    message: string,
    public body: Record<string, unknown> = {},
  ) {
    super(message)
  }
}

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(`/api${path}`, init)
  if (res.status === 204) return undefined as T
  const body = (await res.json().catch(() => ({}))) as Record<string, unknown>
  if (!res.ok) {
    const error = (body.error ?? {}) as { code?: string; message?: string }
    throw new ApiClientError(res.status, error.code ?? 'unknown', error.message ?? 'Something went wrong', body)
  }
  return body as T
}

function jsonInit(method: string, payload: unknown): RequestInit {
  return {
    method,
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  }
}

export const api = {
  get: <T>(path: string) => request<T>(path),
  post: <T>(path: string, payload: unknown) => request<T>(path, jsonInit('POST', payload)),
  patch: <T>(path: string, payload: unknown) => request<T>(path, jsonInit('PATCH', payload)),
  put: <T>(path: string, payload: unknown) => request<T>(path, jsonInit('PUT', payload)),
  delete: <T>(path: string) => request<T>(path, { method: 'DELETE' }),
  upload: <T>(path: string, form: FormData) => request<T>(path, { method: 'POST', body: form }),
}
