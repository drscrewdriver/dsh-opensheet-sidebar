/**
 * Workbook tests: the zip reader, the XML scanners, sheet selection, and the
 * two workbook-specific breaker gates.
 *
 * The fixture is a **real xlsx-shaped zip built here**, not a checked-in binary:
 * deflate entries with proper CRC32s and a correct central directory, so the
 * reader is exercised against the actual container format. One fixture lies
 * about its uncompressed size, which is exactly the zip-bomb case the gates
 * exist for.
 *
 * Run: `npm test`
 */
import { build } from 'esbuild'
import { mkdtempSync, rmSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { dirname, join } from 'node:path'
import { fileURLToPath, pathToFileURL } from 'node:url'
import assert from 'node:assert/strict'
import { deflateRawSync } from 'node:zlib'

const root = dirname(dirname(fileURLToPath(import.meta.url)))
const outDir = mkdtempSync(join(tmpdir(), 'dsh-xlsx-test-'))

await build({
  absWorkingDir: root,
  entryPoints: ['src/client/xlsx.ts', 'src/client/locales.ts'],
  outdir: outDir,
  outExtension: { '.js': '.mjs' },
  bundle: true,
  format: 'esm',
  platform: 'node',
  target: 'node20',
  logLevel: 'warning',
})

const xlsx = await import(pathToFileURL(join(outDir, 'xlsx.mjs')).href)
const { dictionaries, interpolate } = await import(pathToFileURL(join(outDir, 'locales.mjs')).href)

// ── a minimal, correct zip writer (fixture only) ─────────────────────────────

const CRC_TABLE = (() => {
  const table = new Int32Array(256)
  for (let i = 0; i < 256; i++) {
    let c = i
    for (let k = 0; k < 8; k++) c = (c & 1) !== 0 ? 0xedb88320 ^ (c >>> 1) : c >>> 1
    table[i] = c
  }
  return table
})()

/** Standard CRC32, as the zip central directory records it. */
function crc32(buffer) {
  let c = -1
  for (let i = 0; i < buffer.length; i++) c = CRC_TABLE[(c ^ buffer[i]) & 0xff] ^ (c >>> 8)
  return (c ^ -1) >>> 0
}

/**
 * Build a zip from `{ name, data, store?, declaredSize? }` entries.
 * `declaredSize` overrides the central directory's uncompressed size — the
 * lying-header case the declared-size gate must catch without inflating.
 */
function zip(entries) {
  const locals = []
  const central = []
  let offset = 0

  for (const entry of entries) {
    const name = Buffer.from(entry.name, 'utf8')
    const raw = Buffer.isBuffer(entry.data) ? entry.data : Buffer.from(entry.data, 'utf8')
    const stored = entry.store === true
    const payload = stored ? raw : deflateRawSync(raw)
    const method = stored ? 0 : 8
    const crc = crc32(raw)
    const declared = entry.declaredSize ?? raw.length

    const local = Buffer.alloc(30)
    local.writeUInt32LE(0x04034b50, 0)
    local.writeUInt16LE(20, 4)
    local.writeUInt16LE(method, 8)
    local.writeUInt32LE(crc, 14)
    local.writeUInt32LE(payload.length, 18)
    local.writeUInt32LE(declared, 22)
    local.writeUInt16LE(name.length, 26)
    locals.push(local, name, payload)

    const cen = Buffer.alloc(46)
    cen.writeUInt32LE(0x02014b50, 0)
    cen.writeUInt16LE(20, 4)
    cen.writeUInt16LE(20, 6)
    cen.writeUInt16LE(method, 10)
    cen.writeUInt32LE(crc, 16)
    cen.writeUInt32LE(payload.length, 20)
    cen.writeUInt32LE(declared, 24)
    cen.writeUInt16LE(name.length, 28)
    cen.writeUInt32LE(offset, 42)
    central.push(cen, name)

    offset += local.length + name.length + payload.length
  }

  const directory = Buffer.concat(central)
  const eocd = Buffer.alloc(22)
  eocd.writeUInt32LE(0x06054b50, 0)
  eocd.writeUInt16LE(entries.length, 8)
  eocd.writeUInt16LE(entries.length, 10)
  eocd.writeUInt32LE(directory.length, 12)
  eocd.writeUInt32LE(offset, 16)

  return new Uint8Array(Buffer.concat([...locals, directory, eocd]))
}

// ── the fixture workbook ─────────────────────────────────────────────────────

const WORKBOOK = '<workbook><sheets>'
  + '<sheet name="Data" sheetId="1" r:id="rId1"/>'
  + '<sheet name="Notes" sheetId="2" r:id="rId2"/>'
  + '<sheet name="Secret" sheetId="3" state="hidden" r:id="rId3"/>'
  + '</sheets></workbook>'

const RELS = '<Relationships>'
  + '<Relationship Id="rId1" Target="worksheets/sheet1.xml"/>'
  + '<Relationship Id="rId2" Target="worksheets/sheet2.xml"/>'
  + '<Relationship Id="rId3" Target="worksheets/sheet3.xml"/>'
  + '</Relationships>'

const SHARED = '<sst><si><t>Name</t></si><si><t>Qty</t></si>'
  + '<si><r><t>Ac</t></r><r><t>me</t></r></si><si><t>a &amp; b</t></si></sst>'

const STYLES = '<styleSheet><numFmts><numFmt numFmtId="164" formatCode="yyyy\\-mm\\-dd"/></numFmts>'
  + '<cellXfs count="3"><xf numFmtId="0"/><xf numFmtId="0"/><xf numFmtId="164"/></cellXfs></styleSheet>'

const SHEET_DATA = '<worksheet><sheetData>'
  + '<row r="1"><c r="A1" t="s"><v>0</v></c><c r="B1" t="s"><v>1</v></c>'
  + '<c r="C1" t="inlineStr"><is><t>When</t></is></c></row>'
  + '<row r="2"><c r="A2" t="s"><v>2</v></c><c r="B2"><v>3</v></c><c r="C2" s="2"><v>45000</v></c></row>'
  + '<row r="3"><c r="A3" t="str"><v>gap</v></c><c r="C3"><v>7</v></c></row>'
  + '</sheetData></worksheet>'

const NOTES_DATA = '<worksheet><sheetData>'
  + '<row r="1"><c r="A1" t="inlineStr"><is><t>Notes</t></is></c></row>'
  + '<row r="2"><c r="A1" t="s"><v>3</v></c></row>'
  + '</sheetData></worksheet>'

const EMPTY_SHEET = '<worksheet><sheetData/></worksheet>'

/** The normal fixture: three sheets, shared strings, one date-formatted cell. */
function fixture(overrides = {}) {
  const parts = {
    'xl/workbook.xml': WORKBOOK,
    'xl/_rels/workbook.xml.rels': RELS,
    'xl/sharedStrings.xml': SHARED,
    'xl/styles.xml': STYLES,
    'xl/worksheets/sheet1.xml': SHEET_DATA,
    'xl/worksheets/sheet2.xml': NOTES_DATA,
    'xl/worksheets/sheet3.xml': EMPTY_SHEET,
    ...overrides,
  }
  return zip(Object.entries(parts).map(([name, data]) => ({ name, data })))
}

// ── assertions ───────────────────────────────────────────────────────────────

let checks = 0
const check = async (label, fn) => {
  await fn()
  checks++
  console.log(`  ok  ${label}`)
}

console.log('dsh-opensheet-sidebar :: xlsx core')

await check('the zip reader finds every part and its sizes', () => {
  const entries = xlsx.listZipEntries(fixture())
  const names = entries.map(entry => entry.name)
  assert.deepEqual(names, [
    'xl/workbook.xml',
    'xl/_rels/workbook.xml.rels',
    'xl/sharedStrings.xml',
    'xl/styles.xml',
    'xl/worksheets/sheet1.xml',
    'xl/worksheets/sheet2.xml',
    'xl/worksheets/sheet3.xml',
  ])
  for (const entry of entries) assert.equal(entry.method, 8)
})

await check('XML helpers: entities, references, serial dates', () => {
  assert.equal(xlsx.decodeXml('a &lt;b&gt; &amp; &#65;'), 'a <b> & A')
  assert.equal(xlsx.columnOfReference('A1'), 0)
  assert.equal(xlsx.columnOfReference('C7'), 2)
  assert.equal(xlsx.columnOfReference('AA1'), 26)
  assert.ok(xlsx.serialToDateString(45000, false).startsWith('2023-03-15'))
  // 45000.5 is noon on that day.
  assert.ok(xlsx.serialToDateString(45000.5, false).endsWith('12:00:00'))
})

await check('shared strings concatenate rich-text runs', () => {
  const table = xlsx.parseSharedStrings(SHARED)
  assert.deepEqual(table, ['Name', 'Qty', 'Acme', 'a & b'])
})

await check('the sheet list keeps workbook order and flags hidden sheets', async () => {
  const handle = await xlsx.openWorkbook({ fileName: 'book.xlsx', bytes: fixture() })
  assert.deepEqual(
    handle.sheets.map(sheet => sheet.name),
    ['Data', 'Notes', 'Secret'],
  )
  assert.equal(handle.sheets[2].hidden, true)
  assert.equal(handle.sheets[0].hidden, false)
  assert.equal(handle.sheets[1].path, 'xl/worksheets/sheet2.xml')
})

await check('a sheet parses: shared strings, numbers, inline strings, gaps, a date cell', async () => {
  const handle = await xlsx.openWorkbook({ fileName: 'book.xlsx', bytes: fixture() })
  const { sheet } = await handle.read('Data')

  assert.equal(sheet.state, 'OK')
  assert.deepEqual(sheet.headers, ['Name', 'Qty', 'When'])
  assert.deepEqual(sheet.rows[0], ['Acme', '3', '2023-03-15'])
  // B3 is absent from the XML: the gap must stay a gap, not shift C3 left.
  assert.deepEqual(sheet.rows[1], ['gap', '', '7'])
  assert.equal(sheet.meta.sheetName, 'Data')
})

await check('switching sheets reads a different worksheet, not a cached one', async () => {
  const handle = await xlsx.openWorkbook({ fileName: 'book.xlsx', bytes: fixture() })
  const first = await handle.read('Data')
  const second = await handle.read('Notes')

  assert.equal(first.activeSheet, 'Data')
  assert.equal(second.activeSheet, 'Notes')
  assert.deepEqual(second.sheet.headers, ['Notes'])
  assert.deepEqual(second.sheet.rows, [['a & b']])
  // The empty hidden sheet still opens, as an empty table — never a crash.
  const third = await handle.read('Secret')
  assert.deepEqual(third.sheet.headers, [])
  assert.equal(third.sheet.rows.length, 0)
})

await check('an unknown sheet name falls back to the first visible sheet', async () => {
  const handle = await xlsx.openWorkbook({ fileName: 'book.xlsx', bytes: fixture() })
  const { activeSheet } = await handle.read('does-not-exist')
  assert.equal(activeSheet, 'Data')
})

await check('GATE: a part that declares a huge inflated size is refused without unpacking', async () => {
  // The string table claims 900 MB while its payload is a few dozen bytes: a
  // zip bomb is exactly this lie, so the declared size must be what is refused.
  const lying = zip([
    { name: 'xl/workbook.xml', data: WORKBOOK },
    { name: 'xl/_rels/workbook.xml.rels', data: RELS },
    { name: 'xl/sharedStrings.xml', data: SHARED, declaredSize: 900 * 1024 * 1024 },
    { name: 'xl/styles.xml', data: STYLES },
    { name: 'xl/worksheets/sheet1.xml', data: SHEET_DATA },
  ])

  const handle = await xlsx.openWorkbook({ fileName: 'bomb.xlsx', bytes: lying })
  assert.equal(handle.sheets.length, 0)
  assert.equal(handle.warnings[0].reason, 'inflated-bytes')
  // The refused workbook still renders: read() answers a BLOCKED result.
  const { sheet } = await handle.read('Data')
  assert.equal(sheet.state, 'BLOCKED')
})

await check('GATE: one worksheet declaring a huge size blocks only that sheet', async () => {
  const bytes = zip([
    { name: 'xl/workbook.xml', data: WORKBOOK },
    { name: 'xl/_rels/workbook.xml.rels', data: RELS },
    { name: 'xl/sharedStrings.xml', data: SHARED },
    { name: 'xl/styles.xml', data: STYLES },
    { name: 'xl/worksheets/sheet1.xml', data: SHEET_DATA, declaredSize: 400 * 1024 * 1024 },
    { name: 'xl/worksheets/sheet2.xml', data: NOTES_DATA },
  ])

  const handle = await xlsx.openWorkbook({ fileName: 'big-sheet.xlsx', bytes })
  // The workbook opens (its small parts are fine) …
  assert.deepEqual(
    handle.sheets.map(sheet => sheet.name),
    ['Data', 'Notes', 'Secret'],
  )
  // … the oversized sheet is refused …
  const blocked = await handle.read('Data')
  assert.equal(blocked.sheet.state, 'BLOCKED')
  assert.equal(blocked.sheet.warnings[0].reason, 'sheet-bytes')
  // … and its sibling still opens.
  const fine = await handle.read('Notes')
  assert.equal(fine.sheet.state, 'OK')
  assert.deepEqual(fine.sheet.rows, [['a & b']])
})

await check('GATE: a non-zip file is a readable error, never a throw', async () => {
  const handle = await xlsx.openWorkbook({ fileName: 'notes.txt', bytes: new TextEncoder().encode('hello, world') })
  assert.equal(handle.sheets.length, 0)
  assert.equal(handle.warnings[0].reason, 'container-error')
  const { sheet } = await handle.read('Sheet1')
  assert.equal(sheet.state, 'BLOCKED')
})

await check('GATE: every workbook warning renders with no leftover placeholder', async () => {
  const cases = [
    await xlsx.openWorkbook({ fileName: 'bomb.xlsx', bytes: zip([{ name: 'xl/sharedStrings.xml', data: SHARED, declaredSize: 900 * 1024 * 1024 }, { name: 'xl/workbook.xml', data: WORKBOOK }]) }),
    await xlsx.openWorkbook({ fileName: 'notes.txt', bytes: new TextEncoder().encode('hello') }),
    await xlsx.openWorkbook({ fileName: 'big.xlsx', bytes: zip([{ name: 'xl/workbook.xml', data: WORKBOOK }, { name: 'xl/_rels/workbook.xml.rels', data: RELS }, { name: 'xl/worksheets/sheet1.xml', data: SHEET_DATA, declaredSize: 400 * 1024 * 1024 }]) }),
  ]

  const warnings = []
  for (const handle of cases) {
    warnings.push(...handle.warnings)
    const { sheet } = await handle.read('Data')
    warnings.push(...sheet.warnings)
  }

  const reasons = new Set(warnings.map(warning => warning.reason))
  assert.ok(reasons.has('container-error'), 'expected a container-error case')
  assert.ok(reasons.has('inflated-bytes') || reasons.has('sheet-bytes'), 'expected a budget case')

  for (const warning of warnings) {
    for (const [lang, dict] of Object.entries(dictionaries)) {
      const template = dict[`warning.${warning.reason}`]
      assert.ok(template !== undefined, `${lang} has no template for warning.${warning.reason}`)
      const rendered = interpolate(template, warning.detail)
      assert.ok(!rendered.includes('{'), `${lang} ${warning.reason} left a placeholder: ${rendered}`)
    }
  }
})

rmSync(outDir, { recursive: true, force: true })
console.log(`\ndsh-opensheet-sidebar :: ${checks} checks passed, 0 failed`)
