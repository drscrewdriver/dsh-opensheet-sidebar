/**
 * Presentation-side helpers: formatting, sorting, and column inference.
 * Pure functions only — no DOM, no React, so the table's behaviour is testable
 * under plain Node.
 */
import type { ColumnStats, ColumnType, SortState } from './types'

export { formatFileSize as formatSize } from './circuit-breaker'

/** Group-separated integer. */
export function formatNumber(n: number): string {
  return n.toLocaleString('en-US')
}

/** Basename of a path, tolerating both separators. */
export function basename(path: string): string {
  const parts = path.split(/[\\/]/)
  return parts[parts.length - 1] || path
}

/** True when the plugin claims this path's extension. */
export function isCsvPath(path: string): boolean {
  const ext = path.split('.').pop()?.toLowerCase() ?? ''
  return (['csv', 'tsv', 'psv'] as readonly string[]).includes(ext)
}

/** True when a value parses as a finite number and is not blank. */
export function isNumeric(value: string): boolean {
  if (value === '') return false
  const n = Number(value)
  return Number.isFinite(n)
}

/**
 * Sort rows by one column. Numeric columns compare numerically, everything
 * else compares with `localeCompare`; blanks always sink to the bottom so a
 * mostly-empty column stays readable in both directions.
 */
export function sortRows(rows: string[][], sort: SortState | null): string[][] {
  if (sort === null) return rows
  const { columnIndex, direction } = sort
  const multiplier = direction === 'asc' ? 1 : -1

  return [...rows].sort((a, b) => {
    const va = a[columnIndex] ?? ''
    const vb = b[columnIndex] ?? ''
    if (va === '' && vb === '') return 0
    if (va === '') return 1
    if (vb === '') return -1

    const na = Number(va)
    const nb = Number(vb)
    if (Number.isFinite(na) && Number.isFinite(nb)) return (na - nb) * multiplier
    return va.localeCompare(vb) * multiplier
  })
}

/** Right-align a column when most of its sampled values are numeric. */
export function getColumnAlign(rows: string[][], colIndex: number): 'left' | 'right' {
  const sample = rows.slice(0, 20).map(row => row[colIndex] ?? '')
  if (sample.length === 0) return 'left'
  const numeric = sample.filter(isNumeric).length
  return numeric > sample.length * 0.6 ? 'right' : 'left'
}

/** Column type from a sample: number / date / boolean, else text. */
export function inferColumnType(values: string[]): ColumnType {
  const nonEmpty = values.filter(v => v !== '')
  if (nonEmpty.length === 0) return 'text'
  const ratio = (test: (v: string) => boolean) => nonEmpty.filter(test).length / nonEmpty.length
  if (ratio(isNumeric) > 0.8) return 'number'
  if (ratio(v => /^\d{4}-\d{2}-\d{2}/.test(v)) > 0.8) return 'date'
  if (ratio(v => /^(true|false|yes|no|0|1)$/i.test(v)) > 0.8) return 'boolean'
  return 'text'
}

/** Per-column stats for the header tooltip; one pass over the previewed rows. */
export function analyzeColumns(headers: string[], rows: string[][]): ColumnStats[] {
  return headers.map((name, index) => {
    const values = rows.map(row => row[index] ?? '')
    const nonEmpty = values.filter(v => v !== '')
    return {
      name,
      index,
      type: inferColumnType(values),
      emptyCount: values.length - nonEmpty.length,
      uniqueCount: new Set(nonEmpty).size,
    }
  })
}
