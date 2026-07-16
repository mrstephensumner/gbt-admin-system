import type { ReactNode } from 'react'

export interface Column<Row> {
  key: string
  header: string
  width?: number | string
  align?: 'left' | 'center' | 'right'
  render?: (row: Row) => ReactNode
}

export interface TableProps<Row extends Record<string, unknown>> {
  columns: Column<Row>[]
  rows: Row[]
  rowKey?: string
  onRowClick?: (row: Row) => void
  empty?: ReactNode
}

export function Table<Row extends Record<string, unknown>>({
  columns,
  rows,
  rowKey = 'id',
  onRowClick,
  empty,
}: TableProps<Row>) {
  return (
    <div className="gb-table-wrap">
      <table className={`gb-table${onRowClick ? ' gb-table--clickable' : ''}`}>
        <thead>
          <tr>
            {columns.map((c) => (
              <th key={c.key} style={{ width: c.width }} className={c.align ? `gb-table__align--${c.align}` : undefined}>
                {c.header}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.length === 0 && empty ? (
            <tr>
              <td colSpan={columns.length}>{empty}</td>
            </tr>
          ) : (
            rows.map((row) => (
              <tr key={String(row[rowKey])} onClick={onRowClick ? () => onRowClick(row) : undefined}>
                {columns.map((c) => (
                  <td key={c.key} className={c.align ? `gb-table__align--${c.align}` : undefined}>
                    {c.render ? c.render(row) : (row[c.key] as ReactNode)}
                  </td>
                ))}
              </tr>
            ))
          )}
        </tbody>
      </table>
    </div>
  )
}
