/**
 * Drag-and-drop / click file picker for the manual tab.
 *
 * The extension check happens here so an obviously wrong drop is refused with
 * a visible message instead of being parsed into an empty table.
 */
import { useRef, useState } from 'react'
import type { ChangeEvent, DragEvent } from 'react'
import { CSV_EXTS } from './csv'
import type { T } from './locales'

interface FilePickerProps {
  onFileSelect: (file: File) => void
  t: T
  disabled?: boolean
}

/** True when the picker claims this filename. */
export function isCsvName(name: string): boolean {
  const ext = name.split('.').pop()?.toLowerCase() ?? ''
  return (CSV_EXTS as readonly string[]).includes(ext)
}

export function FilePicker({ onFileSelect, t, disabled = false }: FilePickerProps) {
  const [dragging, setDragging] = useState(false)
  const [invalid, setInvalid] = useState(false)
  const input = useRef<HTMLInputElement>(null)

  const onDragOver = (event: DragEvent<HTMLDivElement>) => {
    event.preventDefault()
    event.stopPropagation()
    if (!disabled) setDragging(true)
  }

  const onDragLeave = (event: DragEvent<HTMLDivElement>) => {
    event.preventDefault()
    event.stopPropagation()
    setDragging(false)
  }

  const onDrop = (event: DragEvent<HTMLDivElement>) => {
    event.preventDefault()
    event.stopPropagation()
    setDragging(false)
    if (disabled) return

    const file = event.dataTransfer.files[0]
    if (file === undefined) return
    if (!isCsvName(file.name)) {
      setInvalid(true)
      return
    }
    setInvalid(false)
    onFileSelect(file)
  }

  const onPicked = (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    // Reset first so picking the same file twice still fires.
    event.target.value = ''
    if (file === undefined) return
    if (!isCsvName(file.name)) {
      setInvalid(true)
      return
    }
    setInvalid(false)
    onFileSelect(file)
  }

  const classes = ['csv-picker']
  if (dragging) classes.push('csv-picker--active')
  if (invalid) classes.push('csv-picker--invalid')

  return (
    <div
      className={classes.join(' ')}
      onDragOver={onDragOver}
      onDragLeave={onDragLeave}
      onDrop={onDrop}
      onClick={() => {
        if (!disabled) input.current?.click()
      }}
      role="button"
      tabIndex={0}
      onKeyDown={event => {
        if (event.key === 'Enter' || event.key === ' ') input.current?.click()
      }}
    >
      <input
        ref={input}
        type="file"
        accept={CSV_EXTS.map(ext => `.${ext}`).join(',')}
        onChange={onPicked}
        style={{ display: 'none' }}
      />
      <div className="csv-picker__icon" aria-hidden="true">
        📊
      </div>
      <div className="csv-picker__title">{dragging ? t('picker.active') : t('picker.title')}</div>
      <div className="csv-picker__hint">{invalid ? t('picker.invalid') : t('picker.hint')}</div>
    </div>
  )
}
