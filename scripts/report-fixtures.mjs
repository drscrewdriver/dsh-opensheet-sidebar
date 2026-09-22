/**
 * Read a directory of `.xlsx` fixtures through the plugin's OWN reader and
 * print what it sees for each: sheet list, breaker state, warnings, headers and
 * the first data row.
 *
 * This is the honest way to check a fixture set: not "the file exists", but
 * "this file trips the dimension it claims to trip". It also exercises the
 * reader against genuine Excel-authored files (openpyxl output), which the
 * synthetic in-test zip fixture cannot cover — notably the custom date format.
 *
 * Usage:
 *   node scripts/report-fixtures.mjs <dir>
 */
import { build } from 'esbuild'
import { mkdtempSync, readdirSync, readFileSync, rmSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { dirname, join } from 'node:path'
import { fileURLToPath, pathToFileURL } from 'node:url'

const root = dirname(dirname(fileURLToPath(import.meta.url)))
const target = process.argv[2]
if (target === undefined || target === '') {
  console.error('usage: node scripts/report-fixtures.mjs <dir>')
  process.exit(2)
}

const outDir = mkdtempSync(join(tmpdir(), 'opensheet-report-'))
await build({
  absWorkingDir: root,
  entryPoints: ['src/client/xlsx.ts'],
  outdir: outDir,
  outExtension: { '.js': '.mjs' },
  bundle: true,
  format: 'esm',
  platform: 'node',
  target: 'node20',
  logLevel: 'warning',
})

const { openWorkbook } = await import(pathToFileURL(join(outDir, 'xlsx.mjs')).href)
const number = value => value.toLocaleString('en-US')
const clip = value => (value.length > 26 ? `${value.slice(0, 26)}…` : value)

const files = readdirSync(target)
  .filter(name => name.toLowerCase().endsWith('.xlsx'))
  .sort()

if (files.length === 0) {
  console.log(`no .xlsx in ${target}`)
  rmSync(outDir, { recursive: true, force: true })
  process.exit(0)
}

for (const name of files) {
  const bytes = new Uint8Array(readFileSync(join(target, name)))
  const handle = await openWorkbook({ fileName: name, bytes })

  console.log(`\n=== ${name}  [${number(bytes.byteLength)} B]`)
  console.log(
    `  sheets    : ${handle.sheets.length === 0 ? '(none)' : handle.sheets.map(s => (s.hidden ? `${s.name} (hidden)` : s.name)).join(' | ')}`,
  )
  for (const warning of handle.warnings) {
    console.log(`  container : ${warning.reason} ${JSON.stringify(warning.detail)}`)
  }

  if (handle.sheets.length === 0) {
    const blocked = await handle.read('(blocked)')
    console.log(`  state     : ${blocked.sheet.state}`)
    continue
  }

  const first = handle.sheets.find(sheet => !sheet.hidden) ?? handle.sheets[0]
  const { sheet } = await handle.read(first.name)
  console.log(`  reading   : ${first.name}`)
  console.log(`  state     : ${sheet.state}`)
  console.log(
    `  shape     : ${sheet.meta.colCount} cols declared, ${sheet.headers.length} shown, ${number(sheet.meta.rowCount)} rows previewed of ${number(sheet.meta.totalRows)}`,
  )
  console.log(
    `  headers   : ${sheet.headers.slice(0, 8).map(clip).join(' | ')}${sheet.headers.length > 8 ? ` … (+${sheet.headers.length - 8})` : ''}`,
  )
  // Three rows, not one: fixtures that leave cells empty on purpose (a column
  // gap, a date every third row) would otherwise look like parse failures.
  for (const [index, row] of sheet.rows.slice(0, 3).entries()) {
    console.log(`  row ${index + 1}     : ${row.slice(0, 8).map(clip).join(' | ')}${row.length > 8 ? ' …' : ''}`)
  }
  for (const warning of sheet.warnings) {
    console.log(`  warning   : ${warning.reason} ${JSON.stringify(warning.detail)}`)
  }
}

rmSync(outDir, { recursive: true, force: true })
