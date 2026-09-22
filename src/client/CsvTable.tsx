/**
 * The table: sticky header, click-to-sort (asc → desc → off), a substring
 * filter, and numeric right-alignment inferred from a sample of the rows.
 *
 * All of it runs over the previewed rows only — the breaker has already capped
 * how much there is, so there is no virtualisation layer and no windowing
 * machinery to go wrong.
 */
import { useMemo, useState } from 'react'
import { formatNumber, getColumnAlign, sortRows } from './utils'
import type { T } from './locales'
import type { BreakerResult, SortState } from './types'

interface CsvTableProps {
  result: BreakerResult
  t: T
}

export function CsvTable({ result, t }: CsvTableProps) {
  const { headers, rows, state } = result
  const [sort, setSort] = useState<SortState | null>(null)
  const [filter, setFilter] = useState('')

  const filtered = useMemo(() => {
    const needle = filter.trim().toLowerCase()
    if (needle === '') return rows
    return rows.filter(row => row.some(cell => (cell ?? '').toLowerCase().includes(needle)))
  }, [rows, filter])

  const display = useMemo(() => sortRows(filtered, sort), [filtered, sort])

  const aligns = useMemo(() => headers.map((_, index) => getColumnAlign(rows, index)), [headers, rows])

  /** asc → desc → off, matching what the header glyph promises. */
  const cycleSort = (columnIndex: number) => {
    setSort(previous => {
      if (previous === null || previous.columnIndex !== columnIndex) return { columnIndex, direction: 'asc' }
      if (previous.direction === 'asc') return { columnIndex, direction: 'desc' }
      return null
    })
  }

  const sortGlyph = (columnIndex: number) => {
    if (sort === null || sort.columnIndex !== columnIndex) return '↕'
    return sort.direction === 'asc' ? '↑' : '↓'
  }

  if (state === 'BLOCKED') {
    return (
      <div className="csv-empty">
        <div className="csv-empty__title">⛔ {t('table.blocked')}</div>
        <div className="csv-empty__hint">{t('table.blockedHint')}</div>
      </div>
    )
  }

  if (rows.length === 0) {
    return (
      <div className="csv-empty">
        <div className="csv-empty__title">{t('table.empty')}</div>
        <div className="csv-empty__hint">{t('table.emptyHint')}</div>
      </div>
    )
  }

  return (
    <div className="csv-table">
      <div className="csv-table__filter">
        <input
          className="csv-table__input"
          type="search"
          value={filter}
          placeholder={`🔍 ${t('table.filter')}`}
          aria-label={t('table.filter')}
          onChange={event => setFilter(event.target.value)}
        />
        {filter !== '' && (
          <span className="csv-table__count">
            {t('table.filtered', { shown: formatNumber(display.length), total: formatNumber(rows.length) })}
          </span>
        )}
      </div>

      <div className="csv-table__scroll">
        <table className="csv-table__grid">
          <thead>
            <tr>
              <th className="csv-table__th csv-table__th--index" scope="col">
                {t('table.index')}
              </th>
              {headers.map((header, index) => (
                <th
                  key={`${header}-${index}`}
                  scope="col"
                  className={`csv-table__th csv-table__th--${aligns[index]}`}
                  onClick={() => cycleSort(index)}
                  title={`${t('table.sortHint')} · ${t('table.column', { n: index + 1 })}`}
                >
                  <span className="csv-table__th-inner">
                    {header === '' ? `(${t('table.column', { n: index + 1 })})` : header}
                    <span className="csv-table__sort" aria-hidden="true">
                      {sortGlyph(index)}
                    </span>
                  </span>
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {display.map((row, rowIndex) => (
              <tr className="csv-table__tr" key={rowIndex}>
                <td className="csv-table__td csv-table__td--index">{rowIndex + 1}</td>
                {row.map((cell, cellIndex) => (
                  <td
                    key={cellIndex}
                    className={`csv-table__td csv-table__td--${aligns[cellIndex] ?? 'left'}`}
                    title={cell !== '' && cell.length > 24 ? cell : undefined}
                  >
                    {cell}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="csv-table__footer">
        {sort !== null && (
          <button className="csv-table__link" type="button" onClick={() => setSort(null)}>
            ✕ {t('table.clearSort')}
          </button>
        )}
        <span className="csv-table__spacer">{t('table.rows', { n: formatNumber(display.length) })}</span>
      </div>
    </div>
  )
}
