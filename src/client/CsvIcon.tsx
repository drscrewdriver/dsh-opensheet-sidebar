/**
 * The plugin's glyph: a table grid drawn with `currentColor`, so it follows
 * the tab strip's colour in every skin.
 */
import type { ReactNode } from 'react'

/** Grid glyph at `size` px. */
export function CsvIcon(size = 14): ReactNode {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 16 16"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.4"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      focusable="false"
    >
      <rect x="1.75" y="2.75" width="12.5" height="10.5" rx="1.5" />
      <path d="M1.75 6.25h12.5M6.25 6.25v7M10.25 6.25v7" />
    </svg>
  )
}
