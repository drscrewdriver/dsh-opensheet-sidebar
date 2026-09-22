/**
 * The file viewer: this is what makes a `.csv` in the explorer open as a table
 * instead of as raw text. Registered with `betterSidebar.registerFileViewer`
 * under `fetchStrategy: 'fsRead'`, so the host reads the file (and owns the
 * workspace path fence) and hands us the text plus its own truncation flag.
 *
 * Parse is memoised on the text: re-rendering the tab never re-parses the
 * document.
 */
import { useMemo } from 'react'
import { CsvView } from './CsvView'
import { parseCsvText } from './csv'
import { basename } from './utils'
import type { T } from './locales'

interface CsvFileViewerProps {
  path: string
  title?: string
  content?: string
  truncated?: boolean
  t: T
}

export function CsvFileViewer({ path, title, content, truncated, t }: CsvFileViewerProps) {
  const result = useMemo(() => {
    if (content === undefined) return null
    return parseCsvText(content, {
      fileName: title !== undefined && title !== '' ? title : basename(path),
      truncated: truncated === true,
    })
  }, [content, truncated, path, title])

  if (result === null) {
    return (
      <div className="csv-root">
        <div className="csv-loading">
          <div className="csv-spinner" />
          <div>{t('state.loading')}</div>
        </div>
      </div>
    )
  }

  return <CsvView result={result} t={t} />
}
