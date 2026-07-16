import { createContext, useCallback, useContext, useMemo, useRef, useState } from 'react'
import type { ReactNode } from 'react'
import { X } from 'lucide-react'
import { IconButton } from './Button'

export interface DialogProps {
  open?: boolean
  title?: string
  subtitle?: string
  onClose?: () => void
  footer?: ReactNode
  width?: number
  children?: ReactNode
}

export function Dialog({ open, title, subtitle, onClose, footer, width = 480, children }: DialogProps) {
  if (!open) return null
  return (
    <div
      className="gb-dialog__scrim"
      onMouseDown={(e) => {
        if (e.target === e.currentTarget) onClose?.()
      }}
    >
      <div className="gb-dialog" style={{ maxWidth: width }} role="dialog" aria-modal="true" aria-label={title}>
        <header className="gb-dialog__header">
          <div>
            {title && <div className="gb-dialog__title">{title}</div>}
            {subtitle && <div className="gb-dialog__subtitle">{subtitle}</div>}
          </div>
          {onClose && (
            <IconButton label="Close" size="sm" onClick={onClose}>
              <X size={16} />
            </IconButton>
          )}
        </header>
        <div className="gb-dialog__body">{children}</div>
        {footer && <footer className="gb-dialog__footer">{footer}</footer>}
      </div>
    </div>
  )
}

export interface TooltipProps {
  label: string
  placement?: 'top' | 'bottom' | 'left' | 'right'
  children?: ReactNode
}

export function Tooltip({ label, placement = 'top', children }: TooltipProps) {
  const [show, setShow] = useState(false)
  return (
    <span
      className="gb-tooltip"
      onMouseEnter={() => setShow(true)}
      onMouseLeave={() => setShow(false)}
      onFocus={() => setShow(true)}
      onBlur={() => setShow(false)}
    >
      {children}
      {show && <span className={`gb-tooltip__bubble gb-tooltip__bubble--${placement}`}>{label}</span>}
    </span>
  )
}

/* --- Toasts: region + context ---------------------------------- */

export interface ToastData {
  id: number
  tone?: 'info' | 'success' | 'warning' | 'danger'
  title?: string
  message?: string
}

const ToastContext = createContext<(t: Omit<ToastData, 'id'>) => void>(() => {})

export function useToast() {
  return useContext(ToastContext)
}

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<ToastData[]>([])
  const nextId = useRef(1)

  const push = useCallback((t: Omit<ToastData, 'id'>) => {
    const id = nextId.current++
    setToasts((prev) => [...prev, { ...t, id }])
    setTimeout(() => setToasts((prev) => prev.filter((x) => x.id !== id)), 5000)
  }, [])

  const value = useMemo(() => push, [push])

  return (
    <ToastContext.Provider value={value}>
      {children}
      <div className="gb-toast-region">
        {toasts.map((t) => (
          <Toast
            key={t.id}
            tone={t.tone}
            title={t.title}
            message={t.message}
            onClose={() => setToasts((prev) => prev.filter((x) => x.id !== t.id))}
          />
        ))}
      </div>
    </ToastContext.Provider>
  )
}

export interface ToastProps {
  tone?: 'info' | 'success' | 'warning' | 'danger'
  title?: string
  message?: string
  onClose?: () => void
}

export function Toast({ tone = 'info', title, message, onClose }: ToastProps) {
  return (
    <div className={`gb-toast gb-toast--${tone}`} role="status">
      <div>
        {title && <div className="gb-toast__title">{title}</div>}
        {message && <div className="gb-toast__message">{message}</div>}
      </div>
      {onClose && (
        <button type="button" className="gb-toast__close" aria-label="Dismiss" onClick={onClose}>
          <X size={14} />
        </button>
      )}
    </div>
  )
}
