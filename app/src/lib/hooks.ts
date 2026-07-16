import { useEffect, useState } from 'react'

export function useDebounced<T>(value: T, delay = 250): T {
  const [debounced, setDebounced] = useState(value)
  useEffect(() => {
    const t = setTimeout(() => setDebounced(value), delay)
    return () => clearTimeout(t)
  }, [value, delay])
  return debounced
}

/** Pounds text input ⇄ pence. Empty string means "no day rate" (null). */
export function poundsToPence(input: string): number | null {
  const trimmed = input.replace(/[£,\s]/g, '')
  if (trimmed === '') return null
  const pounds = Number(trimmed)
  if (Number.isNaN(pounds)) return null
  return Math.round(pounds * 100)
}

export function penceToPounds(pence: number | null | undefined): string {
  if (pence == null || pence === 0) return ''
  return String(pence / 100)
}
