/**
 * The workbook viewer: `.xlsx` / `.xlsm` open as a table, with one tab per
 * worksheet.
 *
 * Unlike the CSV viewer this one does **not** use `fetchStrategy: 'fsRead'` —
 * a workbook is binary and `FsBinaryResult` deliberately carries no content
 * (only a `head` for sniffing). It registers a `custom` loader instead, which
 * pulls raw bytes off better-sidebar's `/sidebar/file` route and hands them
 * here as `customData`.
 *
 * Sheet switching re-reads one worksheet part out of the already-open archive:
 * the string table and styles are parsed once, and only the sheet the user
 * asked for is inflated.
 */
import { useEffect, useMemo, useState } from 'react'
import { CsvView } from './CsvView'
import { openWorkbook } from './xlsx'
import { basename } from './utils'
import type { T } from './locales'
import type { BreakerResult } from './types'
import type { WorkbookHandle } from './xlsx'

interface XlsxFileViewerProps {
  path: string
  title?: string
  /** Raw archive bytes, from the registered `custom` loader. */
  customData?: unknown
  t: T
}

/** True when the loader handed us something we can actually read. */
function isBytes(value: unknown): value is Uint8Array {
  return value instanceof Uint8Array
}

export function XlsxFileViewer({ path, title, customData, t }: XlsxFileViewerProps) {
  const bytes = useMemo(() => (isBytes(customData) ? customData : undefined), [customData])
  const fileName = title !== undefined && title !== '' ? title : basename(path)

  const [handle, setHandle] = useState<WorkbookHandle | null>(null)
  const [active, setActive] = useState('')
  const [sheet, setSheet] = useState<BreakerResult | null>(null)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (bytes === undefined) return
    let cancelled = false

    void (async () => {
      try {
        const opened = await openWorkbook({ fileName, bytes })
        if (cancelled) return
        setHandle(opened)

        const first = opened.sheets.find(candidate => !candidate.hidden) ?? opened.sheets[0]
        if (first === undefined) return

        const result = await opened.read(first.name)
        if (cancelled) return
        setActive(first.name)
        setSheet(result.sheet)
      } catch (cause) {
        if (!cancelled) setError(cause instanceof Error ? cause.message : String(cause))
      }
    })()

    return () => {
      cancelled = true
    }
  }, [bytes, fileName])

  /** Re-read one worksheet out of the open archive. */
  const switchTo = async (name: string) => {
    if (handle === null || name === active) return
    setActive(name)
    const result = await handle.read(name)
    setSheet(result.sheet)
  }

  if (bytes === undefined) {
    return (
      <div className="csv-root">
        <div className="csv-loading">
          <div className="csv-spinner" />
          <div>{t('state.loading')}</div>
        </div>
      </div>
    )
  }

  if (error !== null) {
    return (
      <div className="csv-root">
        <div className="csv-error">
          <div className="csv-error__title">❌ {t('state.error')}</div>
          <div className="csv-error__hint">{error}</div>
        </div>
      </div>
    )
  }

  if (handle === null || sheet === null) {
    return (
      <div className="csv-root">
        <div className="csv-loading">
          <div className="csv-spinner" />
          <div>{t('state.loading')}</div>
        </div>
      </div>
    )
  }

  // Container-level findings (a zip-bomb refusal, a malformed workbook) belong
  // on the same banner as the sheet's own warnings — one place to look.
  const merged: BreakerResult =
    handle.warnings.length === 0 ? sheet : { ...sheet, warnings: [...handle.warnings, ...sheet.warnings] }

  const tabs =
    handle.sheets.length > 1 ? (
      <div className="csv-sheets" role="tablist" aria-label={t('sheet.list')}>
        {handle.sheets.map(candidate => (
          <button
            key={candidate.name}
            type="button"
            role="tab"
            aria-selected={candidate.name === active}
            title={candidate.hidden ? t('sheet.hidden') : candidate.name}
            className={`csv-sheet${candidate.name === active ? ' csv-sheet--active' : ''}${
              candidate.hidden ? ' csv-sheet--hidden' : ''
            }`}
            onClick={() => void switchTo(candidate.name)}
          >
            {candidate.name}
          </button>
        ))}
      </div>
    ) : undefined

  return <CsvView result={merged} t={t} header={tabs} />
}
