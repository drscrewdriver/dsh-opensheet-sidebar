/**
 * The breaker's visible face.
 *
 * A blocked or truncated run is a first-class outcome, not an error state: the
 * banner names exactly which ceiling fired, with the measured value and the
 * limit, so "why is my table short" is answerable from the screen alone.
 */
import { formatSize } from './utils'
import type { T } from './locales'
import type { BreakerResult, BreakerWarning } from './types'

interface CsvWarningProps {
  result: BreakerResult
  t: T
}

/** Render one warning's detail payload as interpolation variables. */
function varsOf(warning: BreakerWarning): Record<string, string | number> {
  const detail = warning.detail
  // Byte ceilings read as bytes; make them human before they reach the string.
  if (warning.reason === 'file-size') {
    return {
      ...detail,
      found: formatSize(Number(detail.found ?? 0)),
      limit: formatSize(Number(detail.limit ?? 0)),
    }
  }
  return detail
}

export function CsvWarning({ result, t }: CsvWarningProps) {
  if (result.warnings.length === 0) return null

  const blocked = result.state === 'BLOCKED'

  return (
    <div className={`csv-warning${blocked ? ' csv-warning--blocked' : ' csv-warning--truncated'}`} role="status">
      <div className="csv-warning__head">
        <span aria-hidden="true">{blocked ? '⛔' : '⚠️'}</span>
        <span>{t(blocked ? 'warning.blockedTitle' : 'warning.truncatedTitle')}</span>
      </div>
      <ul className="csv-warning__list">
        {result.warnings.map((warning, index) => (
          <li key={`${warning.reason}-${index}`}>
            • {t(`warning.${warning.reason}`, varsOf(warning))}
          </li>
        ))}
      </ul>
    </div>
  )
}
