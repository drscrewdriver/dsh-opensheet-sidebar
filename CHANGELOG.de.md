# Änderungsprotokoll — dsh-opensheet-sidebar

## 1.0.1 — 2026-09-25

Deduplizierung des Schutzschalters: Wird eine Dimension ausgelöst, kommt nur noch eine einzige Warnung heraus. Die Doppelwarnungen der 1.0.0 entstanden dadurch, dass Zeilenlimit und Vorschau-Budget jeweils eine eigene `rows`-Warnung ausgaben.

> **Veröffentlichungsprotokoll (2026-09-25)**: npm `dsh-opensheet-sidebar@1.0.1`, dist-tags `latest` + `dsh-0.1.5`; 49 files / 98.8 kB, Tarball-shasum `1862528750612980122ffc3d31f31eb05eb1bf7d`.

### Behoben

- **Dieselbe Dimension warnt nicht mehr doppelt**: Zeilenlimit und Vorschau-Budget teilen sich jetzt ein Flag, `finalize()` füllt `found` nach, sodass eine einzige Zeile gleichzeitig kept/limit/found trägt, statt zwei fast identische Banner zu rendern. Neue Assertion: **genau eine Warnung pro Ursache**.
- **Das Feld `repository` wird angegeben**, mit Verweis auf `drscrewdriver/dsh-opensheet-sidebar`. Verzeichnislisten verknüpfen ein npm-Paket nur dann mit seinem Repo, wenn das veröffentlichte Paket auf das Repo zurückverweist; der 1.0.0 fehlte dieses Feld, deshalb waren beide bisher nicht verknüpft.

### Hinzugefügt

- **Echte xlsx-Fixture-Sammlung** (`scripts/make-xlsx-fixtures.py`, fester Zufallsseed): openpyxl erzeugt sechs echte Arbeitsmappen, jede löst genau einen Schutzschalter-Pfad aus; `scripts/report-fixtures.mjs` läuft mit dem **eigenen Reader des Plugins** darüber und druckt, was er liest. Genau er hat die Doppelwarnung aufgedeckt, und er deckt auch den Pfad der benutzerdefinierten Datumsformate ab, den synthetische zip-Fixtures nicht erreichen (echte openpyxl-Ausgabe → 2026-01-08).

### Tests

- 25 Assertions (14 csv + 11 xlsx), Exit-Code 0; der Fixture-Bericht zeigt genau eine Warnung pro Datei.

## 1.0.0 — 2026-09-22

**Paketidentität umbenannt: `dsh-csv-sidebar` → `dsh-opensheet-sidebar`.** Funktional identisch mit 0.3.0, kein Verhaltenswechsel, nur Identität und Anzeigename wechseln.

> **Veröffentlichungsprotokoll (2026-09-22)**: npm `dsh-opensheet-sidebar@1.0.0`, dist-tags `latest` + `dsh-0.1.5`; 49 files / 97.2 kB, Tarball-shasum `88b7fed194c15cd6cd59c1d87e69ae9e8503b5aa`. Nach der Veröffentlichung wurde der Tarball aus der Registry zurückgezogen und nachgeprüft: `lib/client.js` ist byte-identisch mit dem Repo-Build (`43CF34FDCB65…`), die Modul-id im Bundle = `dsh-opensheet-sidebar`. Das Profil ist vom `github:`-Pin zu dieser npm-Version gewechselt (die spec liegt als exakter Wert `1.0.0` auf der Platte).

Der Name ist ein Wortspiel: **Open** (öffnen) ＋ **Open** (offener Standard) — ein Wort deckt „die Tabelle öffnen" und „die Tabelle lesen, ohne von proprietären Bibliotheken abzuhängen" ab. Das Wortspiel lebt nur im Namen; die Funktionsfelder bleiben strikt wörtlich (`exts` enthält nur echte Endungen).

> Spur des Benennungsprozesses: Zuerst stand der Plural `opensheets`, innerhalb einer Minute vor der Veröffentlichung korrigiert zum Singular `opensheet` (Eigenname im Singular wirkt mehr wie eine Marke und weckt die stärkere OpenDocument-Assoziation). Dieser Eintrag beschreibt die finale Identität.

### Geändert

- Paketname / Repo-Name / `dsh.plugin.json#id` / row id+name des `cordis.patch.yml` → `dsh-opensheet-sidebar`. **Diese Stellen müssen synchron bleiben**: Die Client-Modul-id leitet sich aus `package.json#name` ab, und das `name:` der Zeile ist das Erkennungsmerkmal, mit dem client-modules das Paketmanifest findet; eine Stelle vergessen = Host-Zeile vorhanden, Client-Hälfte lädt lautlos nicht (der Ausfalltyp der 0.1.0).
- Auch die Präfix-ids wurden umbenannt: `TAB_ID` / `VIEWER_ID` / `XLSX_VIEWER_ID` / Stil-Tag-id / locale-Namespace.
- Anzeigename des Seitenleisten-Tabs `CSV` → `Sheets` (zh: `表格`). Die Betrachter-Titel bleiben beschreibend (`CSV table` / `Spreadsheet table`) — nach Dateityp sagen, was es ist, statt einen Produktnamen überstülpen.
- Sprung auf 1.0.0: Für Konsumenten ist das ein Breaking Change (die Paketidentität ändert sich), keine Minor-Version.

### Migration (alte Identität → neue Identität)

1. `dsh plugin --profile <p> add github:drscrewdriver/dsh-opensheet-sidebar#<sha>`
2. `dsh plugin --profile <p> remove dsh-csv-sidebar` — `reconcilePlugins` nimmt den alten Namen automatisch aus `dsh.profile.bundles` heraus
3. In der `cordis.patch.yml` des Profils die Zeile `- id: dsh-csv-sidebar` auf die neue id ändern (ein Patch auf eine nicht existierende id ist ein stiller No-op; ihn stehen zu lassen führt nur spätere Leser irre)
4. Host einmal neu starten

> Nebeneffekt: Der Aktivieren/Deaktivieren-Schalter von better-sidebar ist über `tabsEnabled[<id>]` als Schlüssel angebunden; die id ändert sich → die früheren Schalter des Nutzers fallen auf die Standardwerte zurück. Das alte Repo `drscrewdriver/dsh-csv-sidebar` bleibt bestehen, wird aber nicht mehr referenziert.

## 0.3.0 — 2026-09-22

xlsx-Unterstützung (mit **Blattwechsel**). Null-Abhängigkeiten: zip-Entpacken über das native `DecompressionStream('deflate-raw')` des Browsers, XML per gezieltem Scannen statt universellem Parser.

### Hinzugefügt

- **Arbeitsmappen-Betrachter**: `.xlsx` / `.xlsm` öffnen sich als Tabelle, oben erlaubt eine Reihe von Sheet-Tabs den Wechsel; versteckte Blätter (`state="hidden"`) erscheinen abgeschwächt, standardmäßig öffnet sich automatisch das erste sichtbare Blatt.
- **xlsx-Reader** (`src/client/xlsx.ts`): Parsen des Zip-Central-Directory (data-descriptor-Fall korrekt behandelt, die Größe wird nur dem Central Directory geglaubt) → Blattliste aus `xl/workbook.xml` → `_rels` rId→part → `sharedStrings.xml` (Verkettung der Rich-Text-Runs) → `styles.xml` (`cellXfs` → numFmtId → Datumserkennung) → bei Bedarf genau ein `worksheets/sheetN.xml` entpacken.
- **Zellbehandlung**: Shared Strings / Inline-Strings / Formel-Cache-Werte (`t="str"`) / Booleans / Fehlerwerte / Zahlen; **Spaltenlöcher** werden über `r="C3"` rekonstruiert (eine fehlende Spalte verschiebt die folgende nicht); Datumsseriennummern werden nach den Epochen 1900/1904 in lesbare Daten umgerechnet.
- **Zwei Container-Schranken** (die bisherige Größenschranke bedeutete bei zip so viel wie kein Schutz):
  - das **deklarierte Entpackvolumen** wird vor jeder Entpackaktion geprüft (der zip-Header ist fälschbar, deshalb diese deterministische Vorab-Ablehnung);
  - das **streamende Entpack-Byte-Budget** als Rückfallebene, mitzählend beim Entpacken, bei Überschreitung sofort `cancel()`.
  Überschreitet ein einziges Blatt allein das Limit, wird nur dieses Blatt blockiert; Geschwisterblätter bleiben lesbar.
- Neue Warntexte `inflated-bytes` / `sheet-bytes` / `container-error` (zh/en).
- **Tests**: `tests/xlsx.test.mjs` baut vor Ort echte zip-Fixtures (mit CRC32 und korrektem Central Directory) — Blattliste und Versteckt-Markierungen, Shared Strings, Datumszellen, Spaltenlöcher, blattübergreifender Wechsel, zip-Bombe mit gefälschter Größe, Nicht-zip-Eingabe; 11 Assertions, Exit-Code 0/1.

### Behoben

- **Warn-Placeholders bleiben nicht mehr nackt stehen**: Bei erschöpftem Vorschau-Budget (Zeile 201) wurde die Warnung erzeugt, ohne dass `found` bekannt war, und die Oberfläche zeigte direkt `共至少 {found} 行`. Jetzt füllt `finalize()` die tatsächlich gezählte Zeilenzahl nach.
- Neue **Placeholder-Integritätssperre** (je eine pro Testsuite): geht die von jeder Dimension wirklich erzeugten Warnungen durch und stellt sicher, dass jedes `{name}` der zh/en-Vorlagen sich im detail findet, sonst Rot. Solche Bugs werden nicht mehr mit bloßem Auge entdeckt.

### Geändert

- Zwei Schwellenwerte neu in der Schutzschalter-Konfiguration: `maxInflatedBytes` (Standard 64 MB), `maxSheetBytes` (Standard 32 MB).
- Statusleiste: Eine Arbeitsmappe zeigt das Etikett des Blattnamens, statt fälschlich „Trennzeichen" anzuzeigen.
- Der xlsx-Betrachter geht über `fetchStrategy: 'custom'` + die Host-Route `/sidebar/file`, um Rohbytes zu holen (`fsRead` antwortet auf Binäres nur mit `head`, fürs Parsen unbrauchbar); der Arbeitsbereichs-Pfadzaun bleibt auf Host-Seite.

### Noch nicht unterstützt

- `.xls` (Excel 97-2003 BIFF8) und die WPS-Aliformate `.et` / `.wps` / `.dps`: allesamt OLE2-Compound-Dokumente, mit Null-Abhängigkeiten teuer umzusetzen (CFB- + BIFF-Parsing müsste man selbst bauen). Abdecken hieße SheetJS einzuführen (~1 MB, deren npm-Version nicht mehr gepflegt wird), im Widerspruch zum Null-Abhängigkeitsprinzip — gesondert zu bewerten.

## 0.2.0 — 2026-09-22

Neufassung im Standardformat. Die Client-Hälfte der 0.1.0 entsprach nicht dem DSH-Client-Modulvertrag: ins Profil installiert, wurde sie **nicht geladen** (keine Fehlermeldung, kein Eintrag); diese Version baut die Integrationsschicht nach plugin-framework-Standard neu.

### Behoben (Integrationsschicht — alles Wurzelursachen des „Nicht-Anzeigens")

- Das Client-Produkt wird zur CJS-Closure `window.__ModuleLoader__.load({ id, factory })`, deren Fabrik `apply` + `inject` exportiert (zuvor ES module + `activate()`, die Modultabelle warf alles weg).
- Die Registrierungsnahtstelle wechselt von `ctx.sessionProjections` zu `ctx.betterSidebar.registerFileViewer / registerTab` (erstere ist das Host-seitige Projektionsregister, nicht die UI-Nahtstelle der Seitenleiste).
- Neues deklaratives `inject = ['betterSidebar', 'locale']`: apply wartet nur, bis beide cordis-Dienste bereit sind; die Registrierungsreihenfolge beeinflusst das Ergebnis nicht mehr.
- Alle Installationen laufen über `ctx.effect(fn, label)`; bei HMR / Deaktivierung räumt der Disposer ab (Stil-Tag, Wörterbücher, zwei Deskriptoren).
- Metadaten vervollständigt: `package.json#dsh.bundle.patch` + `dsh.client.platform/inject`, `exports` / `files`-Listen, `screenshots.json`, `assets/`, `tsconfig*.json`.
- Peer-Obergrenze vereinheitlicht auf `<0.2.0-0`, um die Semver-Prerelease-Vergleichsfalle zu umgehen; `dsh-better-sidebar` / `react` als optional markiert.

### Hinzugefügt

- **Datei-Betrachter-Nahtstelle**: `.csv/.tsv/.psv` (priority 50, `fetchStrategy: 'fsRead'`) kommen in die „Datei-Vorschau"-Liste der GUI, in den Side-Card-Einstellungen ein-/ausschaltbar; der Host liest, der Pfadzaun bleibt auf Host-Seite.
- **Ladeguard beim Build**: lädt das Produkt wirklich via `node:vm` + Stub `window.__ModuleLoader__`, prüft `id`, die `apply`/`inject` von `factory()` und weist Node-Builtin-Anfragen zurück.
- **12 Kern-Assertions** (`npm test`, Exit-Code 0/1): RFC-4180-Quotes und Escapes, Trenner-Erkennung, vierdimensionaler Schutzschalter, Host-Truncation-Markierung, Leerzeilen und leeres Dokument.
- Eigener i18n-Namespace `dsh-csv-sidebar` (zh/en), Rückfall auf das eingebaute englische Wörterbuch, wenn `locale` fehlt.
- Semantische Token-Styles `--dsw-alias-*` (keine Abhängigkeit mehr von nicht existierenden Variablen wie `--border-color`).

### Geändert

- **Null Laufzeit-Abhängigkeiten**: PapaParse entfernt, ersetzt durch einen lokalen quote-bewussten Scanner (RFC 4180, Felder über Zeilenenden hinweg unterstützt); das Bundle externalisiert nur React (43 KB).
- Build von Vite auf esbuild mit doppeltem Einstieg umgestellt (`lib/index.mjs` + `lib/client.js`), dazu tsc-Typdeklarationen.
- Schutzschalter-Semantik verschärft: Bei erschöpftem `previewRows`-Budget **explizite Eskalation zur `rows`-Warnung** (kein stilles Anzeigen nur der ersten 200 Zeilen mehr); die beiden `OK`-Zweige von `finalize()` zusammengelegt.
- Quellen nach Standardstruktur in `src/client/` verschoben; die Host-Hälfte wird eigenständig als `src/index.ts`.

### Entfernt

- `vite.config.ts`, die `papaparse`-Abhängigkeit, die alten flachen `src/*.tsx`-Komponenten und die falsche `main`-Feld-Schreibweise, die auf `./lib/client.js` zeigte.

## 0.1.0 — 2026-09-22

Erster Prototyp: Das `demo.html` von `npm run dev` validierte das Look-and-Feel der Tabellen-Interaktion und des vierdimensionalen Schutzschalters, danach als Plugin verpackt. **Die Plugin-Verpackung dieser Version lädt nicht in DSH** (siehe Behoben der 0.2.0).
