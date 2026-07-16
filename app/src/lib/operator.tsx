import { createContext, useContext } from 'react'
import type { ReactNode } from 'react'
import { useQuery } from '@tanstack/react-query'
import { can, type OperatorView, type Permission } from '@shared/permissions'
import { api, ApiClientError } from './api'

/**
 * Operator context (spec 002 research R8): the /api/me operator view drives
 * UI gating. UX only — the API is the enforcer.
 */
interface OperatorState {
  operator: OperatorView | null
  notRegistered: boolean
  loading: boolean
}

const OperatorContext = createContext<OperatorState>({ operator: null, notRegistered: false, loading: true })

export function OperatorProvider({ children }: { children: ReactNode }) {
  const me = useQuery({
    queryKey: ['me'],
    queryFn: () => api.get<OperatorView>('/me'),
    retry: (count, err) => !(err instanceof ApiClientError && err.status === 403) && count < 2,
  })
  const notRegistered = me.error instanceof ApiClientError && me.error.code === 'not_registered'
  return (
    <OperatorContext.Provider
      value={{ operator: me.data ?? null, notRegistered, loading: me.isLoading }}
    >
      {children}
    </OperatorContext.Provider>
  )
}

export function useOperator(): OperatorState {
  return useContext(OperatorContext)
}

/** Convenience: permission check against the current operator (false while loading). */
export function useCan(permission: Permission): boolean {
  const { operator } = useOperator()
  return operator ? can(operator, permission) : false
}
