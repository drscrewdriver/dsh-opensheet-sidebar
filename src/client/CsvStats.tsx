/**
 * The stats bar: what file this is, how big it is, and how much of it the
 * table below actually holds.
 *
 * When the breaker truncated the run the row figure is written as a ratio
 * ("200 of at least 12 000 previewed") rather than a bare count, because a
 * bare count would read as the file's true size.
 */
import { formatNumber, formatSize } from './utils'
import type { T } from './locales'
import type { BreakerResult } from './types'

interface CsvStatsProps {
  result: BreakerResult
  t: T
}

/** Human label for the delimiter actually used. */
function delimiterLabel(delimiter: string, t: T): string {
  if (delimiter === '\t') return t('stats.tab')
  return delimiter
}

export function CsvStats({ result, t }: CsvStatsProps) {
  const { meta, state } = result
  const truncated = state === 'TRUNCATED' || state === 'BLOCKED'
  const approximate = meta.sizeIsApproximate ? '≈' : ''

  return (
    <div className="csv-stats">
      <div className="csv-stats__row">
        <span className="csv-stats__item csv-stats__name" title={meta.fileName}>
          📄 {meta.fileName}
        </span>
        <span className="csv-stats__item" title={t('stats.rows')}>
          {approximate}
          {formatSize(meta.fileSize)}
        </span>
      </div>
      <div className="csv-stats__row">
        <span className="csv-stats__item">
          {truncated && meta.totalRows > meta.rowCount
            ? t('stats.previewOf', { shown: formatNumber(meta.rowCount), total: formatNumber(meta.totalRows) })
            : `${formatNumber(meta.rowCount)} ${t('stats.rows')}`}
        </span>
        <span className="csv-stats__item">
          {meta.colCount} {t('stats.cols')}
        </span>
        {/* A workbook has sheets, not delimiters — show which one this is. */}
        {meta.sheetName !== undefined ? (
          <span className="csv-stats__item csv-stats__tag" title={t('stats.sheet')}>
            {meta.sheetName}
          </span>
        ) : (
          <span className="csv-stats__item csv-stats__tag" title={t('stats.delimiter')}>
            {delimiterLabel(meta.delimiter, t)}
          </span>
        )}
        {meta.sourceTruncated && (
          <span className="csv-stats__item csv-stats__tag">{t('stats.truncatedSource')}</span>
        )}
      </div>
    </div>
  )
}
