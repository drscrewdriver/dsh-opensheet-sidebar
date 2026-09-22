/**
 * The manual tab: pick or drop a local file from disk. This is the surface the
 * verified prototype exercised, and the only one where the **real byte size**
 * is known before reading — which is where the size gate does its best work,
 * because a 400 MB export is refused without ever calling `file.text()`.
 */
import { useCallback, useState } from 'react'
import { CsvView } from './CsvView'
import { FilePicker } from './FilePicker'
import { readCsvFile } from './csv'
import type { T } from './locales'
import type { BreakerResult } from './types'

interface CsvLocalTabProps {
  t: T
}

export function CsvLocalTab({ t }: CsvLocalTabProps) {
  const [result, setResult] = useState<BreakerResult | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const load = useCallback(async (file: File) => {
    setLoading(true)
    setError(null)
    setResult(null)
    try {
      setResult(await readCsvFile(file))
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : String(cause))
    } finally {
      setLoading(false)
    }
  }, [])

  const reset = useCallback(() => {
    setResult(null)
    setError(null)
    setLoading(false)
  }, [])

  if (loading) {
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
          <button className="csv-button" type="button" onClick={reset}>
            {t('action.retry')}
          </button>
        </div>
      </div>
    )
  }

  if (result === null) {
    return (
      <div className="csv-root">
        <FilePicker onFileSelect={load} t={t} />
      </div>
    )
  }

  return (
    <CsvView
      result={result}
      t={t}
      actions={
        <button className="csv-button" type="button" onClick={reset}>
          📂 {t('action.openAnother')}
        </button>
      }
    />
  )
}
