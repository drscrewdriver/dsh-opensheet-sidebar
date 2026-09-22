/**
 * Core tests for the CSV reader + circuit breaker.
 *
 * The logic modules are pure TypeScript with no browser or React imports, so
 * this harness bundles them for Node with the same esbuild the real build uses
 * and asserts on the result. That keeps the test honest about the shipped
 * code — no re-implementation, no mocks.
 *
 * Run: `npm test`  (exits non-zero on any failed assertion)
 */
import { build } from 'esbuild'
import { mkdtempSync, rmSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { dirname, join } from 'node:path'
import { fileURLToPath, pathToFileURL } from 'node:url'
import assert from 'node:assert/strict'

const root = dirname(dirname(fileURLToPath(import.meta.url)))
const outDir = mkdtempSync(join(tmpdir(), 'dsh-csv-test-'))

await build({
  absWorkingDir: root,
  entryPoints: ['src/client/csv.ts', 'src/client/locales.ts'],
  outdir: outDir,
  outExtension: { '.js': '.mjs' },
  bundle: true,
  format: 'esm',
  platform: 'node',
  target: 'node20',
  logLevel: 'warning',
})

const { parseCsvText, sniffDelimiter, scanRows, readCsvFile } = await import(
  pathToFileURL(join(outDir, 'csv.mjs')).href
)
const { dictionaries, interpolate } = await import(pathToFileURL(join(outDir, 'locales.mjs')).href)

/** Tiny assertion counter so the run prints measured numbers, not a claim. */
let checks = 0
const check = (label, fn) => {
  fn()
  checks++
  console.log(`  ok  ${label}`)
}

console.log('dsh-opensheet-sidebar :: csv core')

// ── 1. Happy path ────────────────────────────────────────────────────────────
check('plain CSV parses to headers + rows', () => {
  const result = parseCsvText('a,b,c\n1,2,3\n4,5,6\n', { fileName: 'x.csv', fileSize: 22 })
  assert.equal(result.state, 'OK')
  assert.deepEqual(result.headers, ['a', 'b', 'c'])
  assert.equal(result.rows.length, 2)
  assert.equal(result.meta.colCount, 3)
})

// ── 2. RFC 4180 quoting ──────────────────────────────────────────────────────
check('quoted delimiter, doubled quote and embedded newline survive', () => {
  const text = 'name,note\n"Smith, John","line1\nline2"\n"He said ""hi""",ok\n'
  const result = parseCsvText(text, { fileName: 'q.csv', fileSize: text.length })
  assert.equal(result.rows.length, 2)
  assert.equal(result.rows[0][0], 'Smith, John')
  assert.equal(result.rows[0][1], 'line1\nline2')
  assert.equal(result.rows[1][0], 'He said "hi"')
})

// ── 3. Delimiter sniffing ────────────────────────────────────────────────────
check('semicolon and tab files are sniffed, not assumed', () => {
  assert.equal(sniffDelimiter('a;b;c\n1;2;3\n1;2;3\n'), ';')
  assert.equal(sniffDelimiter('a\tb\tc\n1\t2\t3\n1\t2\t3\n'), '\t')
})

// ── 4. Dimension 1 — size gate, no read at all ───────────────────────────────
check('oversized text is BLOCKED before parsing', () => {
  const result = parseCsvText('a,b\n1,2\n', { fileName: 'big.csv', fileSize: 900 * 1024 * 1024 })
  assert.equal(result.state, 'BLOCKED')
  assert.equal(result.warnings[0].reason, 'file-size')
  assert.equal(result.rows.length, 0)
})

check('oversized local File is BLOCKED without file.text()', async () => {
  // A File-like object whose text() throws: reaching it would be the bug.
  const fake = {
    name: 'huge.csv',
    size: 50 * 1024 * 1024,
    text() {
      throw new Error('file.text() must not be called for an oversized file')
    },
  }
  const result = await readCsvFile(fake)
  assert.equal(result.state, 'BLOCKED')
  assert.equal(result.warnings[0].reason, 'file-size')
})

// ── 5. Dimension 2 — row ceiling stops the scan early ────────────────────────
check('row ceiling truncates and stops the reader early', () => {
  const lines = ['h1,h2']
  for (let i = 0; i < 1000; i++) lines.push(`${i},x`)
  const text = lines.join('\n')

  const result = parseCsvText(text, { fileName: 'many.csv', fileSize: text.length, config: { maxRows: 100, previewRows: 50 } })
  assert.equal(result.state, 'TRUNCATED')
  assert.equal(result.rows.length, 50)
  assert.ok(result.warnings.some(w => w.reason === 'rows'))
})

check('the reader really stops: rows past the ceiling are never visited', () => {
  let visited = 0
  scanRows('a\nb\nc\nd\ne\n', '\n', () => {
    visited++
    return visited < 3
  })
  assert.equal(visited, 3)
})

// ── 6. Dimension 3 — column ceiling ─────────────────────────────────────────
check('column ceiling drops extra columns and warns', () => {
  const header = Array.from({ length: 12 }, (_, i) => `c${i}`).join(',')
  const row = Array.from({ length: 12 }, (_, i) => `${i}`).join(',')
  const result = parseCsvText(`${header}\n${row}\n`, { fileName: 'wide.csv', fileSize: 100, config: { maxCols: 5 } })
  assert.equal(result.headers.length, 5)
  assert.equal(result.rows[0].length, 5)
  assert.ok(result.warnings.some(w => w.reason === 'cols'))
})

// ── 7. Dimension 4 — cell ceiling ───────────────────────────────────────────
check('an oversized cell is elided, not dropped silently', () => {
  const cell = 'x'.repeat(5000)
  const result = parseCsvText(`h\n${cell}\n`, { fileName: 'cell.csv', fileSize: cell.length, config: { maxCellLength: 100 } })
  assert.ok(result.rows[0][0].startsWith('x'.repeat(200)))
  assert.ok(result.rows[0][0].includes('+'))
  assert.ok(result.warnings.some(w => w.reason === 'cell-length'))
})

// ── 8. Host-capped reads are labelled ───────────────────────────────────────
check('a host-capped read is reported as truncated', () => {
  const result = parseCsvText('a,b\n1,2\n', { fileName: 'capped.csv', fileSize: 8, truncated: true })
  assert.equal(result.state, 'TRUNCATED')
  assert.equal(result.meta.sourceTruncated, true)
  assert.ok(result.warnings.some(w => w.reason === 'source-truncated'))
})

// ── 9. Blank lines never mint phantom rows ──────────────────────────────────
check('blank lines and a trailing newline are ignored', () => {
  const result = parseCsvText('a,b\n\n1,2\n\n', { fileName: 'blank.csv', fileSize: 12 })
  assert.equal(result.rows.length, 1)
})

// ── 10. Empty input is a normal, renderable outcome ─────────────────────────
check('an empty document is OK with zero rows (never a throw)', () => {
  const result = parseCsvText('', { fileName: 'empty.csv', fileSize: 0 })
  assert.equal(result.state, 'OK')
  assert.equal(result.headers.length, 0)
  assert.equal(result.rows.length, 0)
})

// ── 11. Every emitted warning must render with no leftover placeholder ──────
// Regression gate: the preview-budget path used to trip before `found` was
// known, so the banner literally read "共至少 {found} 行".
check('every warning template interpolates completely (no literal {found})', () => {
  const many = ['h1,h2']
  for (let i = 0; i < 500; i++) many.push(`${i},x`)
  const wide = `${Array.from({ length: 12 }, (_, i) => `c${i}`).join(',')}\n${Array.from({ length: 12 }, (_, i) => i).join(',')}\n`

  const cases = [
    // dimension 1 — file size
    parseCsvText('a,b\n1,2\n', { fileName: 'big.csv', fileSize: 900 * 1024 * 1024 }),
    // dimension 2 — the hard row ceiling
    parseCsvText(many.join('\n'), { fileName: 'many.csv', fileSize: 10, config: { maxRows: 100, previewRows: 50 } }),
    // dimension 2 — the preview budget, which trips *before* the ceiling exists
    parseCsvText(many.join('\n'), { fileName: 'prev.csv', fileSize: 10, config: { maxRows: 100_000, previewRows: 5 } }),
    // dimension 3 — columns
    parseCsvText(wide, { fileName: 'wide.csv', fileSize: 10, config: { maxCols: 5 } }),
    // dimension 4 — one cell
    parseCsvText(`h\n${'x'.repeat(5000)}\n`, { fileName: 'cell.csv', fileSize: 10, config: { maxCellLength: 100 } }),
    // the host capped its own read
    parseCsvText('a,b\n1,2\n', { fileName: 'capped.csv', fileSize: 8, truncated: true }),
  ]

  const seen = new Set()
  for (const result of cases) {
    for (const warning of result.warnings) {
      seen.add(warning.reason)
      for (const [lang, dict] of Object.entries(dictionaries)) {
        const template = dict[`warning.${warning.reason}`]
        assert.ok(template !== undefined, `${lang} has no template for warning.${warning.reason}`)
        const rendered = interpolate(template, warning.detail)
        assert.ok(!rendered.includes('{'), `${lang} ${warning.reason} left a placeholder: ${rendered}`)
      }
    }
  }

  for (const required of ['file-size', 'rows', 'cols', 'cell-length', 'source-truncated']) {
    assert.ok(seen.has(required), `no warning of reason ${required} was produced`)
  }
})

rmSync(outDir, { recursive: true, force: true })
console.log(`\ndsh-opensheet-sidebar :: ${checks} checks passed, 0 failed`)
