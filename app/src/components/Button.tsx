import type { MouseEvent, ReactNode } from 'react'

export interface ButtonProps {
  variant?: 'primary' | 'secondary' | 'ghost' | 'danger' | 'navy' | 'link'
  size?: 'sm' | 'md' | 'lg'
  iconLeft?: ReactNode
  iconRight?: ReactNode
  block?: boolean
  disabled?: boolean
  type?: 'button' | 'submit' | 'reset'
  children?: ReactNode
  onClick?: (e: MouseEvent) => void
}

export function Button({
  variant = 'primary',
  size = 'md',
  iconLeft,
  iconRight,
  block,
  disabled,
  type = 'button',
  children,
  onClick,
}: ButtonProps) {
  const classes = [
    'gb-btn',
    `gb-btn--${variant}`,
    size !== 'md' && `gb-btn--${size}`,
    block && 'gb-btn--block',
  ]
    .filter(Boolean)
    .join(' ')
  return (
    <button type={type} className={classes} disabled={disabled} onClick={onClick}>
      {iconLeft}
      {children}
      {iconRight}
    </button>
  )
}

export interface IconButtonProps {
  variant?: 'ghost' | 'secondary' | 'primary' | 'danger'
  size?: 'sm' | 'md' | 'lg'
  /** Accessible label (also the tooltip title). */
  label: string
  disabled?: boolean
  children?: ReactNode
  onClick?: (e: MouseEvent) => void
}

export function IconButton({ variant = 'ghost', size = 'md', label, disabled, children, onClick }: IconButtonProps) {
  const classes = ['gb-btn', 'gb-iconbtn', `gb-btn--${variant}`, size !== 'md' && `gb-btn--${size}`]
    .filter(Boolean)
    .join(' ')
  return (
    <button type="button" className={classes} aria-label={label} title={label} disabled={disabled} onClick={onClick}>
      {children}
    </button>
  )
}
