import { useId } from 'react'
import type { InputHTMLAttributes, ReactNode, SelectHTMLAttributes, TextareaHTMLAttributes } from 'react'

export function FieldLabel({ children, htmlFor }: { children?: ReactNode; htmlFor?: string }) {
  return (
    <label className="gb-field__label" htmlFor={htmlFor}>
      {children}
    </label>
  )
}

export function FieldMsg({ children, tone }: { children?: ReactNode; tone?: 'danger' }) {
  return <div className={`gb-field__msg${tone === 'danger' ? ' gb-field__msg--danger' : ''}`}>{children}</div>
}

export interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  label?: string
  hint?: string
  error?: string
  iconLeft?: ReactNode
  iconRight?: ReactNode
  fieldSize?: 'sm' | 'md' | 'lg'
}

export function Input({ label, hint, error, iconLeft, iconRight, fieldSize = 'md', id, className, ...rest }: InputProps) {
  const autoId = useId()
  const inputId = id ?? autoId
  const classes = [
    'gb-input',
    fieldSize !== 'md' && `gb-input--${fieldSize}`,
    error && 'gb-input--error',
    iconLeft && 'gb-input--icon-left',
    iconRight && 'gb-input--icon-right',
    className,
  ]
    .filter(Boolean)
    .join(' ')
  return (
    <div className="gb-field">
      {label && <FieldLabel htmlFor={inputId}>{label}</FieldLabel>}
      <div className="gb-input-wrap">
        {iconLeft && <span className="gb-input-wrap__icon gb-input-wrap__icon--left">{iconLeft}</span>}
        <input id={inputId} className={classes} aria-invalid={!!error} {...rest} />
        {iconRight && <span className="gb-input-wrap__icon gb-input-wrap__icon--right">{iconRight}</span>}
      </div>
      {error ? <FieldMsg tone="danger">{error}</FieldMsg> : hint ? <FieldMsg>{hint}</FieldMsg> : null}
    </div>
  )
}

export interface TextareaProps extends TextareaHTMLAttributes<HTMLTextAreaElement> {
  label?: string
  hint?: string
  error?: string
}

export function Textarea({ label, hint, error, id, rows = 4, className, ...rest }: TextareaProps) {
  const autoId = useId()
  const areaId = id ?? autoId
  const classes = ['gb-textarea', error && 'gb-textarea--error', className].filter(Boolean).join(' ')
  return (
    <div className="gb-field">
      {label && <FieldLabel htmlFor={areaId}>{label}</FieldLabel>}
      <textarea id={areaId} className={classes} rows={rows} aria-invalid={!!error} {...rest} />
      {error ? <FieldMsg tone="danger">{error}</FieldMsg> : hint ? <FieldMsg>{hint}</FieldMsg> : null}
    </div>
  )
}

export interface SelectOption {
  value: string
  label: string
}

export interface SelectProps extends SelectHTMLAttributes<HTMLSelectElement> {
  label?: string
  hint?: string
  error?: string
  options?: (string | SelectOption)[]
}

export function Select({ label, hint, error, options = [], id, className, children, ...rest }: SelectProps) {
  const autoId = useId()
  const selectId = id ?? autoId
  const classes = ['gb-select', error && 'gb-select--error', className].filter(Boolean).join(' ')
  return (
    <div className="gb-field">
      {label && <FieldLabel htmlFor={selectId}>{label}</FieldLabel>}
      <select id={selectId} className={classes} aria-invalid={!!error} {...rest}>
        {options.map((o) => {
          const opt = typeof o === 'string' ? { value: o, label: o } : o
          return (
            <option key={opt.value} value={opt.value}>
              {opt.label}
            </option>
          )
        })}
        {children}
      </select>
      {error ? <FieldMsg tone="danger">{error}</FieldMsg> : hint ? <FieldMsg>{hint}</FieldMsg> : null}
    </div>
  )
}

export interface CheckboxProps {
  checked?: boolean
  label?: string
  disabled?: boolean
  onChange?: (checked: boolean) => void
}

export function Checkbox({ checked, label, disabled, onChange }: CheckboxProps) {
  return (
    <label className={`gb-check${disabled ? ' gb-check--disabled' : ''}`}>
      <input
        type="checkbox"
        checked={checked ?? false}
        disabled={disabled}
        onChange={(e) => onChange?.(e.target.checked)}
      />
      <span className="gb-check__box">{checked ? '✓' : ''}</span>
      {label}
    </label>
  )
}

export interface RadioProps {
  checked?: boolean
  label?: string
  name?: string
  value?: string
  disabled?: boolean
  onChange?: (value: string) => void
}

export function Radio({ checked, label, name, value, disabled, onChange }: RadioProps) {
  return (
    <label className={`gb-check${disabled ? ' gb-check--disabled' : ''}`}>
      <input
        type="radio"
        checked={checked ?? false}
        name={name}
        value={value}
        disabled={disabled}
        onChange={() => onChange?.(value ?? '')}
      />
      <span className="gb-check__box gb-check__box--radio">{checked ? '•' : ''}</span>
      {label}
    </label>
  )
}

export interface SwitchProps {
  checked?: boolean
  label?: string
  disabled?: boolean
  onChange?: (checked: boolean) => void
}

export function Switch({ checked, label, disabled, onChange }: SwitchProps) {
  return (
    <label className={`gb-check${disabled ? ' gb-check--disabled' : ''}`}>
      <input
        type="checkbox"
        role="switch"
        checked={checked ?? false}
        disabled={disabled}
        onChange={(e) => onChange?.(e.target.checked)}
      />
      <span className="gb-switch__track">
        <span className="gb-switch__knob" />
      </span>
      {label}
    </label>
  )
}
