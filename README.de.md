# dsh-opensheet-sidebar

[简体中文](README.md) | [Français](README.fr.md) | [Deutsch](README.de.md) | [Italiano](README.it.md) | [Русский](README.ru.md) | [Español](README.es.md)

> ⛔ **Dieses Projekt wird nicht mehr gepflegt (2026-10-01).** Neuere DSH-Hosts bringen eine eingebaute Seitenleisten-Vorschau für Office- und Tabellendateien mit; dieses Plugin wird nicht weiter gepflegt — keine weiteren Veröffentlichungen, keine Anpassung an künftige Host-Versionen. Veröffentlichte Versionen bleiben installierbar; für 0.1.x-Hosts die Builds aus den eingefrorenen Zweigen `compat/0.1.7` / `compat/0.1.5` verwenden.

Tabellen-Vorschau-Plugin für die rechte Seitenleiste (Konsument von [dsh-better-sidebar](https://github.com/omdsh-dev/DSH-better-sidebar)): `csv` / `tsv` / `psv` ebenso wie `xlsx` / `xlsm` werden als strukturierte Tabelle geöffnet, mit **Schutzschalter (Circuit Breaker)** — keine Eingabe kann die Seitenleiste einfrieren.

> **Der Name ist ein Wortspiel, hier vermerkt, damit es nicht als Tippfehler durchgeht**: `OpenSheet` liest sich sowohl als „das Sheet **öffnen**" (open the sheet, Verb) als auch als „Sheet nach **offenem Standard**" (open-standard sheet — die Familie der Open-Source-Tabellenformate rund um OpenDocument). Ein Wort sagt beide Aufgaben: öffnen, und lesen auf eine Weise, die von keiner proprietären Bibliothek abhängt.
>
> Grenze: Das Wortspiel lebt nur im **Namen**. Funktionsfelder bleiben strikt wörtlich — `exts` enthält nur echte Endungen (`csv`/`tsv`/`psv`/`xlsx`/`xlsm`), und Protokollfelder tragen keine Markennamen.

> **v0.2.0 ist eine Neufassung der Integrationsart**: Die Client-Hälfte von v0.1.0 (damals `dsh-csv-sidebar`) entsprach nicht dem Client-Modul-Vertrag von DSH (ES module + `activate()` + `ctx.sessionProjections`) und **wurde deshalb nach der Installation nicht angezeigt**. 0.2.0 setzt die Integration nach dem plugin-framework-Standard neu um, siehe unten „Warum v0.1.0 nicht angezeigt wird".

---

## 1. Was das Plugin tut

| Nahtstelle | Registrierter Inhalt | Was der Nutzer sieht |
|------|---------|-------------|
| **Datei-Betrachter** `registerFileViewer` | `exts: ['csv','tsv','psv']`, `priority: 50`, `fetchStrategy: 'fsRead'` | Klick auf eine `.csv` im Dateimanager → direkt eine **Tabelle**, kein Rohtext; in den Einstellungen der Side-Card ein-/ausschaltbar, beim Ausschalten kehrt der eingebaute Text-Viewer zurück |
| **Manueller Tab** `registerTab` | `order: 70`, `single: true` | Die **CSV**-Seite im `+`-Menü: lokale Datei per Drag-and-drop oder Auswählen; dabei ist die **wahre Bytegröße bekannt**, übergroße Dateien werden vor dem Lesen abgelehnt |

Beide teilen denselben Rendering-Körper (Warnbanner → Statistikleiste → Tabelle → Aktionen unten); der einzige Unterschied ist, woher der Text stammt.

**Interaktionsfähigkeit** (ausgerichtet an „strukturierte Daten dürfen nicht zu reinem Text degradiert werden"): Sortieren per Klick auf den Spaltenkopf (aufsteigend → absteigend → aufheben), Teilstring-Filter, Rechtsbündigkeit numerischer Spalten (aus Stichproben erschlossen), Spaltentyp-Erkennung (number / date / boolean / text), sticky Kopfzeile und Zeilennummern-Spalte, Statistik zu Leerwerten und eindeutigen Werten.

---

## 2. Der vierdimensionale Schutzschalter

| Dimension | Standardlimit | Verhalten bei Überschreitung |
|------|---------|-------------|
| Dateigröße | 5 MB | **BLOCKED** — bei lokalen Dateien wird nicht einmal `file.text()` aufgerufen; vom Host gelesener Text wird direkt abgelehnt |
| Datenzeilen | 10 000 | **TRUNCATED** — das Lesen stoppt **am** Limit, keine vollständige Analyse |
| Spaltenzahl | 100 | überzählige Spalten werden verworfen + Warnung |
| Zelltext | 10 KB | die Zelle wird zu `前200字符… (+N chars)` verkürzt + Warnung |

Dazu kommt `previewRows: 200`: Die Tabelle reserviert ihr DOM-Budget nur für die ersten 200 Zeilen. Mit der 201. Zeile wird es **nicht still** — es eskaliert zur `rows`-Warnung und setzt `TRUNCATED`.

> Das Ergebnis des Schutzschalters ist ein Bürger erster Klasse, keine Fehlerseite: Jedes Banner hält einzeln fest, **welches Limit ausgelöst hat, wie der Messwert lautet, wie das Limit ist**, und die Tabelle rendert ganz normal weiter (bei BLOCKED erscheint eine klare Sperr-Erklärung). Die vier Zustände `OK / TRUNCATED / BLOCKED` + `READING` sind sämtlich renderbare Ergebnisse; es wird nie eine Exception geworfen und nie endlos geladen.

---

## 3. Abgleich mit dem Standardformat (plugin-framework)

| Standardanforderung | Dieses Plugin |
|---------|--------|
| Zwei-Hälften-Struktur | `src/index.ts` (Host-Hälfte, leeres apply) + `src/client/index.tsx` (Browser-Hälfte) |
| Client-Modul-Vertrag | Das Build-Produkt ist eine CJS-Closure `window.__ModuleLoader__.load({ id, factory })` mit den Exporten `apply` + `inject`; **beim Build wird es einmal per `node:vm` wirklich geladen und die Exporte werden per assert geprüft** |
| Deklarative `inject`-Injektion | `export const inject = ['betterSidebar', 'locale']` — apply läuft erst, wenn beide cordis-Dienste bereit sind; die Registrierungsreihenfolge ist egal |
| Lebenszyklus | Alle Installationen laufen über `ctx.effect(fn, label)`; bei HMR/Deaktivierung räumt der zurückgegebene Disposer auf |
| Settings-Seat / Befehlsregistrierung | Dieses Plugin registriert weder Settings-Seat noch `/`-Befehle (berührt also weder seat-pin noch den description-Funktionsvertrag) |
| `dsh.bundle`-Manifest | `package.json#dsh.bundle.patch` + `dsh.client.platform/inject` |
| `cordis.patch.yml` | Reine insert-Zeile, der Kommentar nennt beide Installationswege (CLI / manuell) |
| peerDependencies | `@deepseek-ai/*` mit `>=0.2.0-rc.1 <0.2.1-0` (`-0`-Obergrenze, um die Semver-Prerelease-Falle zu vermeiden); `dsh-better-sidebar` / `react` als optional markiert — 0.2.0-Linie |
| Verzeichnisstruktur | `src/ lib/ assets/ tests/ scripts/` + `screenshots.json` + `dsh.plugin.json` + README/CHANGELOG |
| Null-Abhängigkeiten | **keine Laufzeit-Abhängigkeiten**: CSV-Parser und Schutzschalter sind lokale Module; der Client-Bundle externalisiert nur React (43 KB) |
| Styling | Kein CSS-Eingang → `styles.css` wird vom Build als String inlined; `apply` fügt ein `<style>` ein und registriert einen Disposer; die Farben nutzen ausschließlich die semantischen Tokens `--dsw-alias-*` |
| Mehrsprachigkeit | Eigener Namespace `dsh-opensheet-sidebar`, zh/en-Wörterbücher werden über `locale.register(NS, tag, dict)` registriert; fehlt der Dienst, greift das eingebaute englische Wörterbuch; fehlt ein key, wird der key selbst gerendert (sichtbar statt leer) |
| Weiche Abhängigkeiten | Kein Import irgendeines Werts/Typs aus `dsh-better-sidebar` (`seams.ts` macht nur Strukturdeklarationen); fehlt `betterSidebar`, erfolgt eine **laute warn-Warnung und träge Untätigkeit** — keine halbe Panel-Registrierung |

---

## 4. Warum v0.1.0 nicht angezeigt wurde (Grundursache)

Nach der Installation von v0.1.0 in ein Profil war `cordis.patch.yml` eingetragen und `node_modules` vorhanden, aber die Seitenleiste regte sich nicht, **und die Konsole blieb fehlerfrei** — das Modul wurde schon in der Ladephase der Client-Module verworfen:

| # | Schreibweise von v0.1.0 | Standardvertrag | Folge |
|---|--------------|---------|------|
| 1 | `lib/client.js` ist ein **ES module** (`export function activate`) | CJS-Closure via `window.__ModuleLoader__.load({ id, factory })` | Die Modultabelle bekommt keine Exporte → **das ganze Paket lädt lautlos nicht** |
| 2 | Einstieg exportiert `activate(ctx)` | Export von **`apply(ctx)`** | Selbst geladen, findet sich kein Einstiegspunkt |
| 3 | Kein `inject` | `export const inject = [...]` | cordis wartet nicht auf `betterSidebar`; Registrierungszeitpunkt zufällig |
| 4 | Registrierung über `ctx.sessionProjections.register({key,badge,component})` | `ctx.betterSidebar.registerTab / registerFileViewer` | **falsche Nahtstelle**: `sessionProjections` ist das Host-seitige Projektionsregister, nicht die UI-Nahtstelle der Seitenleiste |
| 5 | Kein `ctx.effect`; `package.json` ohne `dsh.bundle` / `dsh.client` / `exports` / `files`; peer-Obergrenze `>=0.1.5-rc.1` (ohne obere Schranke) | siehe Tabelle oben | keine HMR-Rückholung; unvollständige Metadaten |

> In einem Satz: **es war nicht „inaktiv", es war „nie geladen"**. Das erklärt auch, warum im System der „Datei-Vorschau" kein Eintrag auftaucht — diese Liste ist genau das Register von `registerFileViewer`.

---

## 5. Build und Verifikation

```bash
npm run build     # esbuild mit doppeltem Einstieg + tsc-Typdeklarationen; beim Build wird das Bundle einmal echt geladen und apply/inject werden geprüft
npm test          # 25 Assertions: 14 csv (Parsen/Quotes/Trenner/4D-Schutzschalter/Placeholder-Integrität/Warn-Dedup) + 11 xlsx (zip/XML/Arbeitsblätter/zwei Container-Schranken)
npm run verify    # build && test
```

Tatsächliche Ausgabe von `npm test` (2026-09-22):

```
dsh-opensheet-sidebar :: csv core
  ok  plain CSV parses to headers + rows
  ok  quoted delimiter, doubled quote and embedded newline survive
  ok  semicolon and tab files are sniffed, not assumed
  ok  oversized text is BLOCKED before parsing
  ok  oversized local File is BLOCKED without file.text()
  ok  row ceiling truncates and stops the reader early
  ok  the reader really stops: rows past the ceiling are never visited
  ok  column ceiling drops extra columns and warns
  ok  an oversized cell is elided, not dropped silently
  ok  a host-capped read is reported as truncated
  ok  blank lines and a trailing newline never mint rows
  ok  an empty document is OK with zero rows (never a throw)

dsh-opensheet-sidebar :: 12 checks passed, 0 failed
```

Die Build-Zeitschranke (`scripts/build.mjs`) nach dem Schreiben des Artefakts: Sie führt das Bundle mit `node:vm` und einem Stub `window.__ModuleLoader__` wirklich einmal aus, stellt sicher, dass `load()` aufgerufen wird, `id` dem Paketnamen entspricht und `factory()` ein Objekt mit `apply` und `inject` zurückgibt; außerdem weist sie jede Anfrage nach Node-Builtin-Modulen zurück. **Ein nicht ladbares Bundle zeigt schon in der Build-Phase Rot und gelangt nie krank zum Host.**

---

### 5.1 xlsx-Fixtures und Selbstprüfung (`demo/xlsx/`)

Die Fixtures werden per Skript erzeugt, Binärdateien werden nicht committet: feste Zufallsseeds, byte-stabil, und **jede Datei ist nur für das Auslösen eines einzigen Pfads zuständig**.

```bash
python scripts/make-xlsx-fixtures.py --out ../demo/xlsx   # benötigt openpyxl (nur dev)
node scripts/report-fixtures.mjs ../demo/xlsx             # läuft mit dem eigenen Reader des Plugins und druckt, was er sieht
```

| Datei | Größe | Löst aus |
|------|------|------|
| `basic-3sheets.xlsx` | 8 KB | 3 Arbeitsblätter (eines versteckt) · echte Datumsformate · Booleans · Spaltenlöcher · Formeln ohne Cache-Wert |
| `wide-150cols.xlsx` | 15 KB | Spaltenlimit (150 > 100) → `cols` |
| `long-12000rows.xlsx` | 286 KB | Zeilenlimit + Vorschau-Budget → `rows` (**eine einzige**, mit found/kept/limit) |
| `long-cell-20k.xlsx` | 5 KB | Zellenlimit (20 000 > 10 240) → `cell-length` |
| `deep-sheet-60k.xlsx` | 1.7 MB | **Archiv klein, entpackt 56.7 MB** → `sheet-bytes` (Ablehnung vor jedem Entpacken) |
| `big-archive.xlsx` | 8.5 MB | das Archiv selbst übersteigt 5 MB → `file-size` (BLOCKED) |

Die Ausgabe von `report-fixtures.mjs` ist der Beweis, dass „jede Fixture ihren Posten versieht"; sie läuft auf Dateien eines echten Excel-Schreibers (openpyxl) und deckt damit auch den Pfad der benutzerdefinierten Datumsformate ab, den synthetische Fixtures nicht erreichen (`2026-01-08` statt der Seriennummer `46030`).

## 6. Installation

**Weg A (empfohlen): offizielle CLI** — sie pflegt Abhängigkeiten und `dsh.profile.bundles` gemeinsam

```bash
dsh plugin --profile <profile> add <path-to-plugin>
```

**Weg B: manuell (drei Schritte, keiner darf fehlen)**

```bash
# 1) Dieses Paket kopieren
#    → ~/.dsh/profiles/<profile>/node_modules/dsh-opensheet-sidebar
# 2) "dsh-opensheet-sidebar" in das dsh.profile.bundles-Array des profile-package.json aufnehmen
# 3) Die insert-Zeile aus dem cordis.patch.yml dieses Pakets an das cordis.patch.yml des Profils anhängen
```

> ⚠️ **Schritt 2 ist der am leichtesten vergessene, und sein Fehlen ist vollkommen still.** Die Bundle-Ebene wird nur synthetisiert, wenn das
> `dsh.profile.bundles` des Profils dieses Paket aufführt; nur die Schritte 1 und 3 ergeben: Paket liegt vor,
> `- id: dsh-opensheet-sidebar` steht im `cordis.patch.yml`, aber die Zeile hat **keine Zielzeile, auf die sie wirken kann** —
> das Plugin lädt nicht, und die Konsole schweigt. Das `disabled: false` aus Schritt 3 bedeutet nur „eine bereits eingefügte Zeile explizit aktivieren",
> es fügt selbst keine Zeile ein.

**Nach der Installation erst prüfen, dann neu starten** (startet keinerlei Dienste):

```bash
dsh --profile <profile> --dump-config | Select-String dsh-opensheet-sidebar
# Erwartete Ausgabe:
#   # == dsh-opensheet-sidebar, patched by ...\cordis.patch.yml
#   - id: dsh-opensheet-sidebar
#     name: dsh-opensheet-sidebar
#     disabled: false
```

Diese drei Zeilen sehen = Zeile eingefügt + Profil-Patch wirksam; jetzt genügt ein **Neustart von DSH** (Profil-Bundle und Client-Modultabelle werden erst beim Start synthetisiert; ein Seiten-Refresh reicht nicht).
Nichts sehen = Schritt 2 ist nicht wirksam.

**Abhängigkeit**: `dsh-better-sidebar >= 0.18.1` (optional). Fehlt sie, lädt das Plugin normal, warnt in der Konsole und steuert keinen einzigen Eintrag bei.

---

## 7. Versions-Kompatibilitätsmatrix

| Plugin-Version | DSH | Anmerkung |
|---------|-----|------|
| 2.0.0 | `>=0.2.0-rc.1 <0.2.1-0` | 0.2.0-Hostlinie (`main`, befördert aus `compat/0.2.0`). Reine Metadaten-Anpassung: Die Konsumfläche besteht aus reinen `ctx.get(...)`-Aufrufen, 0.2.0-rc.1 hält die Plugin-API von 0.1.7 intakt; gleicht nebenbei die abweichende Manifest-Version an |
| 1.0.0 / 1.0.1 | `>=0.1.5-rc.1 <0.2.0-0` | Umbenennung der Paket-Identität (csv → opensheet) + Disjunktor-Deduplizierung; versorgt durch die eingefrorenen Zweige `compat/0.1.7` / `compat/0.1.5` |
| 0.3.0 | `>=0.1.5-rc.1 <0.2.0-0` | Arbeitsmappen-Vorschau für xlsx/xlsm (Blattwechsel) + zwei zip-Container-Schranken + Placeholder-Integritätssperre |
| 0.2.0 | `>=0.1.5-rc.1 <0.2.0-0` | Neufassung im Standardformat: `__ModuleLoader__` + `apply/inject/effect` + doppelte better-sidebar-Nahtstelle |
| 0.1.0 | — | Integrationsart verletzt den Vertrag, **lädt nicht**, eingestellt |

## 8. Bekannte Grenzen

- Kein virtuelles Scrollen für die Tabelle: Das DOM-Budget wird hart über `previewRows` gesteuert; bei größerer Datenmenge kommt es nur zu „früherem Abbruch", nie zu Verlangsamung.
- Das Host-`fsRead` schneidet große Dateien selbst ab; die Statistikleiste zeigt dann `≈` und das Etikett „vom Host gekürzte Lesung", mit `state = TRUNCATED` — **es wird sich nie als vollständige Datei ausgegeben**.
- Nur Vorschau, kein Zurückschreiben: weder Bearbeiten noch Speichern.

## 9. xlsx-Unterstützung (mit Blattwechsel)

`.xlsx` / `.xlsm` öffnen sich mit demselben Tabellen-Rendering; oben lässt eine Reihe von **Sheet-Tabs** das Blatt wechseln; versteckte Blätter (`state="hidden"`) erscheinen abgeschwächt, standardmäßig öffnet sich automatisch das erste sichtbare Blatt. Keine Laufzeit-Abhängigkeiten.

### 9.1 Die Nahtstelle: warum ein anderer Lesepfad nötig war

Eine Arbeitsmappe ist binär, doch `fetchStrategy: 'fsRead'` antwortet auf Binärdaten nur mit `{kind:'binary', size, truncated, head}` — **ohne content**, der Parser bekommt nichts zu fressen. Deshalb ist xlsx ein **separat registrierter** Betrachter:

```
fetchStrategy: 'custom'
load: fetch(`/sidebar/file?sessionId=..&cwd=..&path=..`) → arrayBuffer → Uint8Array
```

Der Weg führt über die Rohbyte-Route des Hosts selbst; der Arbeitsbereichs-Pfadzaun bleibt daher auf Host-Seite (wir lesen Dateien nicht selbst). Der `fsRead`-Pfad für CSV bleibt unangetastet.

### 9.2 Analyse-Pipeline (`src/client/xlsx.ts`)

```
Zip-Central-Directory → xl/workbook.xml (Blattliste / Reihenfolge / Versteckt)
             → xl/_rels/workbook.xml.rels (rId → part)
             → xl/sharedStrings.xml (Verkettung der Rich-Text-Runs)
             → xl/styles.xml (cellXfs → numFmtId → Datum ja/nein)
             → xl/worksheets/sheetN.xml (entpackt wird nur das angefragte Blatt)
```

Zellabdeckung: Shared Strings / Inline-Strings / Formel-Cache-Werte (`t="str"`) / Booleans / Fehlerwerte / Zahlen; **Spaltenlöcher** werden über `r="C3"` rekonstruiert (eine fehlende Spalte verschiebt die Folgespalte nicht); Datumsseriennummern werden nach den Epochen 1900 und 1904 in lesbare Daten umgerechnet.

Entpackt wird mit dem nativen `DecompressionStream('deflate-raw')` des Browsers; das XML wird gezielt gescannt — das xlsx-XML ist eine maschinengenerierte, regelmäßige Struktur, ein universeller Parser wäre Verschwendung.

### 9.3 Zwei Container-Schranken (bei zip ist eine reine Größenschranke gleichbedeutend mit keinem Schutz)

| Schranke | Zeitpunkt | Standard | Wirkung |
|------|------|------|------|
| **Deklariertes Entpackvolumen** | **vor** jeder Entpackaktion, aus dem Central Directory | 32 MB pro part | Der zip-Header ist fälschbar, deshalb diese deterministische Vorab-Ablehnung |
| **Streamendes Byte-Budget** | kumuliert während des Entpackens | insgesamt 64 MB | Rückfallebene, wenn der Header lügt; bei Überschreitung sofort `cancel()` |

Überschreitet ein einzelnes Blatt sein Limit, wird **nur dieses Blatt blockiert**, die Geschwisterblätter öffnen sich normal. Ist der Container selbst unlesbar (kein zip / part fehlt) → `container-error`, gerendert als lesbare Fehlerkarte statt einer Exception.

### 9.4 Noch nicht unterstützt

`.xls` (Excel 97-2003 BIFF8) und die WPS-Aliformate `.et` / `.wps` / `.dps`: alles OLE2-Compound-Dokumente; Null-Abhängigkeiten hieße, die CFB-Analyse (FAT/Directory) + BIFF selbst zu bauen — teuer und fehleranfällig. Abdecken liefe meist auf SheetJS hinaus (~1 MB, deren npm-Version nicht mehr gepflegt wird, neue Versionen erscheinen nur auf dem offiziellen CDN), im Widerspruch zum Null-Abhängigkeitsprinzip — bei Bedarf gesondert bewerten.

> Nicht verwechseln: **Die von WPS Tabellen standardmäßig gespeicherte `.xlsx` ist ein Standard-xlsx** und wird von diesem Plugin direkt unterstützt; nur die `.et` aus „Speichern unter WPS-Aliformat" fällt unter „nicht unterstützt".

## 10. Veröffentlichung und Identitätsmigration (Skriptbeispiele)

Zwei Skripte, jedes zuständig für die halbe Miete: die **Veröffentlichung** auf dem Entwicklungsrechner, die **Migration** im Profil, das das Plugin installiert. Beide unterstützen `-DryRun` (der einzige beliebig oft wiederholbare Modus), beide stoppen beim ersten Fehlschlag — niemals wird „trotzdem veröffentlicht".

```powershell
# ① Veröffentlichungsseite: Build + Tests + Identitätsschranken + Packmanifest, erst dann die echte Veröffentlichung (--access public, offizielle Registry)
pwsh -File scripts/publish-npm.ps1 -DryRun                # erst schauen
pwsh -File scripts/publish-npm.ps1                        # dann veröffentlichen
pwsh -File scripts/publish-npm.ps1 -DeprecateOld dsh-csv-sidebar   # optional: den alten Namen deprecaten

# ② Konsumseite: neue Identität installieren → alte entfernen → die id der Profil-Patchzeile tauschen → Punkt für Punkt prüfen
#    -NewSpec muss eine spec sein, die „sich heute wirklich auflösen lässt" — das Skript prüft vor, bevor es irgendetwas ändert.
#    Dieses Paket existiert derzeit nur auf GitHub (auf npm noch nicht), daher die github:-Form:
pwsh -File scripts/migrate-profile.ps1 -Profile web -NewSpec 'github:drscrewdriver/dsh-opensheet-sidebar#<sha>' -DryRun
pwsh -File scripts/migrate-profile.ps1 -Profile web -NewSpec 'github:drscrewdriver/dsh-opensheet-sidebar#<sha>'
#    Nach der npm-Veröffentlichung auf die registry-Form umstellen (bis dahin würde diese Zeile an der Vorprüfung scheitern):
#    pwsh -File scripts/migrate-profile.ps1 -Profile web -NewSpec 'dsh-opensheet-sidebar@1.0.0'
```

**Vorprüfung (preflight)**: `-NewSpec` wird erst aufgelöst, dann gehandelt — npm-Form über `npm view <name>[@range]`, `github:`-Form über `git ls-remote` (ein 40-stelliger SHA ist nicht namentlich auffindbar; geprüft wird daher die Erreichbarkeit des Repos, der SHA selbst wird vom Installationsschritt validiert), lokale Form über die `package.json`. Löst die spec nicht auf, bricht alles vor dem Backup ab, Exit-Code 1 — damit kein „offenbar funktionierendes" Beispiel auf halbem Weg scheitert.

Alternativ über die npm-script-Aliasse:

```powershell
npm run publish:npm -- -DryRun
npm run profile:migrate -- -Profile web -NewSpec 'dsh-opensheet-sidebar@1.0.0' -DryRun
```

### 10.1 Warum die Reihenfolge „erst neu installieren, dann alt entfernen" lautet

Die Umbenennung betrifft vier Stellen gleichzeitig, und **eine einzige zu vergessen ist ein stiller Fehlschlag** (keine Fehlermeldung): die Abhängigkeits-spec des Profils, `dsh.profile.bundles` (vom reconcile der CLI gepflegt, nicht von Hand ändern), die row id des `cordis.patch.yml` des Profils (ein Patch auf eine nicht existierende id ist ein No-op) und das Verzeichnis in `node_modules`.

Erst das Neue installieren, dann das Alte entfernen: Scheitert irgendein Schritt, bleibt ein **noch benutzbares Plugin** übrig, kein leeres Profil. Beide pnpm-Aufrufe werden einmal automatisch wiederholt — läuft der Host, ist `node_modules` belegt, und der erste Versuch kann `ERR_PNPM_PACKAGE_MANAGER_REMOVE_MODULES_DIR` werfen.

### 10.2 Drei PowerShell-5.1-Fallen in den Skripten (bei Wiederverwendung eine halbe Stunde gespart)

| Falle | Symptom | Lösung |
|----|------|------|
| Nativer Befehl + `2>`-Umleitung + `$ErrorActionPreference='Stop'` | npm-stderr-Warnungen werden zu **terminierenden Fehlern** hochgestuft, das Skript stirbt in Schritt 2 auf unerklärliche Weise | vor dem Aufruf vorübergehend auf `Continue` lockern, Ströme mit `2>&1 \| Out-String` zusammenführen, dann `$LASTEXITCODE` lesen |
| `$PSScriptRoot` als `param()`-Standardwert | beim Auswerten noch leerer String → Parameterprüfung von `Split-Path` schlägt fehl | Standardwert `''` setzen und im Skriptkörper auflösen |
| `.Count` auf einem `Where-Object`-Ergebnis | 1 Treffer ist ein string (ohne `.Count`), 0 Treffer sind `$null` — unter `Set-StrictMode` sofort `PropertyNotFound` | konsequent in `@(...)` einwickeln, erst dann `.Count` lesen |

Das Veröffentlichungsskript bringt zusätzlich zwei **Schranken mit, die vor wie nach dem Upload gehören sollten**: Der Name muss „frei oder eigener" sein (`npm view` + `maintainers` gegen `npm whoami` verglichen, damit man nicht auf einen fremdbelegten Namen gerät), und ohne Login-Sitzung wird direkt abgelehnt (statt auf einen 401 zu warten).

## 11. Mehrsprachige Hinweise / Sprachen / Langues / Языки / Idiomas / Lingue

Diese README ist auf Deutsch geschrieben. Schnellübersicht für Installation und Kompatibilität (diese Linie benötigt DSH 0.2.0: `>=0.2.0-rc.1 <0.2.1-0`; Installation: `dsh plugin --profile <profile> add dsh-opensheet-sidebar@dsh-0.2.0`):

- **Deutsch** — benötigt DSH 0.2.0 (`>=0.2.0-rc.1 <0.2.1-0`), getestet gegen DSH 0.2.0-rc.1. Installation: `dsh plugin --profile <profile> add dsh-opensheet-sidebar@dsh-0.2.0`. Die 0.1.x-Wirtslinie wird von den eingefrorenen Zweigen `compat/0.1.7` / `compat/0.1.5` (npm-Tags `dsh-0.1.7` / `dsh-0.1.5`) versorgt.
- **Français** — nécessite DSH 0.2.0 (`>=0.2.0-rc.1 <0.2.1-0`), testé avec DSH 0.2.0-rc.1. Installation : `dsh plugin --profile <profile> add dsh-opensheet-sidebar@dsh-0.2.0`. La lignée d'hôtes 0.1.x est assurée par les branches figées `compat/0.1.7` / `compat/0.1.5` (tags npm `dsh-0.1.7` / `dsh-0.1.5`).
- **Русский** — требуется DSH 0.2.0 (`>=0.2.0-rc.1 <0.2.1-0`), протестировано на DSH 0.2.0-rc.1. Установка: `dsh plugin --profile <profile> add dsh-opensheet-sidebar@dsh-0.2.0`. Линия хостов 0.1.x обслуживается замороженными ветками `compat/0.1.7` / `compat/0.1.5` (npm-теги `dsh-0.1.7` / `dsh-0.1.5`).
- **Español** — requiere DSH 0.2.0 (`>=0.2.0-rc.1 <0.2.1-0`), probado con DSH 0.2.0-rc.1. Instalación: `dsh plugin --profile <profile> add dsh-opensheet-sidebar@dsh-0.2.0`. La línea de anfitriones 0.1.x la atienden las ramas congeladas `compat/0.1.7` / `compat/0.1.5` (etiquetas npm `dsh-0.1.7` / `dsh-0.1.5`).
- **Italiano** — richiede DSH 0.2.0 (`>=0.2.0-rc.1 <0.2.1-0`), testato su DSH 0.2.0-rc.1. Installazione: `dsh plugin --profile <profile> add dsh-opensheet-sidebar@dsh-0.2.0`. La linea di host 0.1.x è servita dai rami congelati `compat/0.1.7` / `compat/0.1.5` (tag npm `dsh-0.1.7` / `dsh-0.1.5`).
