import type { ReactNode } from 'react'
import { ChevronDown } from 'lucide-react'

export interface TabItem {
  value: string
  label: string
  count?: number
}

export interface TabsProps {
  tabs: (string | TabItem)[]
  value?: string
  onChange?: (value: string) => void
}

export function Tabs({ tabs, value, onChange }: TabsProps) {
  return (
    <div className="gb-tabs" role="tablist">
      {tabs.map((t) => {
        const tab = typeof t === 'string' ? { value: t, label: t } : t
        const active = tab.value === value
        return (
          <button
            key={tab.value}
            type="button"
            role="tab"
            aria-selected={active}
            className={`gb-tab${active ? ' gb-tab--active' : ''}`}
            onClick={() => onChange?.(tab.value)}
          >
            {tab.label}
            {tab.count != null && <span className="gb-tab__count">{tab.count}</span>}
          </button>
        )
      })}
    </div>
  )
}

export interface NavItemProps {
  icon?: ReactNode
  label: string
  active?: boolean
  badge?: string | number
  collapsed?: boolean
  onClick?: () => void
}

export function NavItem({ icon, label, active, badge, collapsed, onClick }: NavItemProps) {
  return (
    <button
      type="button"
      className={['gb-navitem', active && 'gb-navitem--active', collapsed && 'gb-navitem--collapsed']
        .filter(Boolean)
        .join(' ')}
      onClick={onClick}
      title={collapsed ? label : undefined}
    >
      {icon && <span className="gb-navitem__icon">{icon}</span>}
      {!collapsed && label}
      {!collapsed && badge != null && <span className="gb-navitem__badge">{badge}</span>}
    </button>
  )
}

export interface NavGroupProps {
  icon?: ReactNode
  label: string
  /** Expanded state — children render only when open. */
  open?: boolean
  onToggle?: () => void
  children: ReactNode
}

/** An expandable sidebar section: a parent row that toggles a set of nested NavItems. */
export function NavGroup({ icon, label, open, onToggle, children }: NavGroupProps) {
  return (
    <div className="gb-navgroup">
      <button
        type="button"
        className="gb-navitem gb-navgroup__parent"
        onClick={onToggle}
        aria-expanded={open}
      >
        {icon && <span className="gb-navitem__icon">{icon}</span>}
        {label}
        <ChevronDown
          size={16}
          className={`gb-navgroup__chevron${open ? ' gb-navgroup__chevron--open' : ''}`}
          aria-hidden
        />
      </button>
      {open && (
        <div className="gb-navgroup__children" role="group" aria-label={label}>
          {children}
        </div>
      )}
    </div>
  )
}

export interface PaginationProps {
  page?: number
  pageCount?: number
  onChange?: (page: number) => void
}

function pageWindow(page: number, pageCount: number): (number | '…')[] {
  if (pageCount <= 7) return Array.from({ length: pageCount }, (_, i) => i + 1)
  const pages = new Set<number>([1, 2, page - 1, page, page + 1, pageCount - 1, pageCount])
  const sorted = [...pages].filter((p) => p >= 1 && p <= pageCount).sort((a, b) => a - b)
  const out: (number | '…')[] = []
  let prev = 0
  for (const p of sorted) {
    if (p - prev > 1) out.push('…')
    out.push(p)
    prev = p
  }
  return out
}

export function Pagination({ page = 1, pageCount = 1, onChange }: PaginationProps) {
  if (pageCount <= 1) return null
  return (
    <nav className="gb-pagination" aria-label="Pagination">
      <button
        type="button"
        className="gb-pagination__btn"
        disabled={page <= 1}
        onClick={() => onChange?.(page - 1)}
        aria-label="Previous page"
      >
        ‹
      </button>
      {pageWindow(page, pageCount).map((p, i) =>
        p === '…' ? (
          <span key={`e${i}`} className="gb-pagination__ellipsis">
            …
          </span>
        ) : (
          <button
            key={p}
            type="button"
            className={`gb-pagination__btn${p === page ? ' gb-pagination__btn--current' : ''}`}
            aria-current={p === page ? 'page' : undefined}
            onClick={() => onChange?.(p)}
          >
            {p}
          </button>
        ),
      )}
      <button
        type="button"
        className="gb-pagination__btn"
        disabled={page >= pageCount}
        onClick={() => onChange?.(page + 1)}
        aria-label="Next page"
      >
        ›
      </button>
    </nav>
  )
}
