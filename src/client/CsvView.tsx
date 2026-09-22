/**
 * The shared body both surfaces render: the manual tab and the file viewer
 * differ only in how they obtain the text, never in what they show.
 */
import type { ReactNode } from 'react'
import { CsvStats } from './CsvStats'
import { CsvTable } from './CsvTable'
import { CsvWarning } from './CsvWarning'
import type { T } from './locales'
import type { BreakerResult } from './types'

interface CsvViewProps {
  result: BreakerResult
  t: T
  /** Optional footer controls (the tab's "open another file"). */
  actions?: ReactNode
}

export function CsvView({ result, t, actions }: CsvViewProps) {
  return (
    <div className="csv-root">
      <CsvWarning result={result} t={t} />
      <CsvStats result={result} t={t} />
      <CsvTable result={result} t={t} />
      {actions !== undefined && <div className="csv-actions">{actions}</div>}
    </div>
  )
}
