import type { ReactNode } from 'react'
import { initials as toInitials } from '@shared/format'
import type { BadgeTone } from '@shared/enums'

export interface BadgeProps {
  /** Semantic tones from @shared/enums plus brand tones. */
  tone?: BadgeTone | 'red' | 'navy'
  size?: 'sm' | 'md'
  dot?: boolean
  children?: ReactNode
}

export function Badge({ tone = 'neutral', size = 'md', dot, children }: BadgeProps) {
  const classes = ['gb-badge', `gb-badge--${tone}`, size === 'sm' && 'gb-badge--sm'].filter(Boolean).join(' ')
  return (
    <span className={classes}>
      {dot && <span className="gb-badge__dot" />}
      {children}
    </span>
  )
}

export interface TagProps {
  children?: ReactNode
  onRemove?: () => void
}

export function Tag({ children, onRemove }: TagProps) {
  return (
    <span className="gb-tag">
      {children}
      {onRemove && (
        <button type="button" className="gb-tag__remove" aria-label="Remove" onClick={onRemove}>
          ×
        </button>
      )}
    </span>
  )
}

export interface AvatarProps {
  src?: string
  name?: string
  size?: number
  status?: 'available' | 'booked' | 'hold' | 'offline'
}

export function Avatar({ src, name = '', size = 32, status }: AvatarProps) {
  return (
    <span className="gb-avatar" style={{ width: size, height: size }}>
      {src ? (
        <img className="gb-avatar__img" src={src} alt={name} />
      ) : (
        <span className="gb-avatar__initials" style={{ fontSize: Math.max(10, size * 0.38) }}>
          {toInitials(name)}
        </span>
      )}
      {status && <span className={`gb-avatar__dot gb-avatar__dot--${status}`} />}
    </span>
  )
}

export interface CardProps {
  title?: string
  subtitle?: string
  actions?: ReactNode
  padded?: boolean
  children?: ReactNode
}

export function Card({ title, subtitle, actions, padded = true, children }: CardProps) {
  return (
    <section className="gb-card">
      {(title || actions) && (
        <header className="gb-card__header">
          <div>
            {title && <div className="gb-card__title">{title}</div>}
            {subtitle && <div className="gb-card__subtitle">{subtitle}</div>}
          </div>
          {actions}
        </header>
      )}
      <div className={padded ? 'gb-card__body--padded' : undefined}>{children}</div>
    </section>
  )
}

export interface StatCardProps {
  label: string
  value: string | number
  delta?: string
  deltaTone?: 'up' | 'down' | 'flat'
  icon?: ReactNode
  accent?: 'red' | 'navy' | 'blue' | 'success'
}

export function StatCard({ label, value, delta, deltaTone = 'flat', icon, accent = 'red' }: StatCardProps) {
  return (
    <div className={`gb-statcard gb-statcard--${accent}`}>
      <div>
        <div className="gb-statcard__label">{label}</div>
        <div className="gb-statcard__value">{value}</div>
        {delta && <div className={`gb-statcard__delta gb-statcard__delta--${deltaTone}`}>{delta}</div>}
      </div>
      {icon && <div className="gb-statcard__icon">{icon}</div>}
    </div>
  )
}
