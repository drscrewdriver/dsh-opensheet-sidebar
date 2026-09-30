# Registro delle modifiche — dsh-opensheet-sidebar

## 2.0.0 — 2026-09-29

### Modificato

- **Linea host migrata a DSH 0.2.0** (`main`, promossa da `compat/0.2.0`): `engines.dsh` e la peer dependency `@deepseek-ai/dsh-client-locale` passano da `>=0.1.5-rc.1 <0.2.0-0` a `>=0.2.0-rc.1 <0.2.1-0` (aggancio alla finestra rc; da 0.2.1 rivalutazione). Adattamento solo di metadati — la superficie di consumo è composta da pure chiamate `ctx.get(...)` (con definizioni di interfacce locali), 0.2.0-rc.1 è totalmente compatibile con l'API plugin di 0.1.7, zero modifiche al codice. La linea 0.1.x (0.1.5/0.1.7) resta servita dai rami congelati `compat/0.1.7` / `compat/0.1.5` (≤1.0.1).
- Albero delle dipendenze rinfrescato sulla nuova linea, lockfile rigenerato.
- **Azzerato al contempo la deriva del manifest**: la version di `dsh.plugin.json` era rimasta a 1.0.0 (1.0.1 aveva modificato solo package.json); questa volta viene allineata a 2.0.0 insieme a `package.json`, stesso intervallo per entrambi gli engines.

### Documentazione (2026-09-29 — nessuna ripubblicazione)

- Struttura dei rami rimessa a posto: `main` diventa la linea 0.2.0 (da `compat/0.2.0`); la linea host 0.1.x è servita dai rami congelati `compat/0.1.7` / `compat/0.1.5`. Mappatura npm invariata: `dsh-0.2.0` → questa linea, `dsh-0.1.7` / `dsh-0.1.5` → linea 0.1.x.
- Installazione (questa linea): `dsh plugin --profile <profile> add dsh-opensheet-sidebar@dsh-0.2.0`.
- La README ha guadagnato una panoramica di installazione e compatibilità in cinque lingue (de/fr/ru/es/it).

## 1.0.1 — 2026-09-25

Deduplicazione dell'interruttore: quando una dimensione scatta, esce un solo avviso. I doppioni della 1.0.0 nascevano dal fatto che il tetto delle righe e il budget di anteprima emettevano ciascuno il proprio avviso `rows`.

> **Traccia di pubblicazione (2026-09-25)**: npm `dsh-opensheet-sidebar@1.0.1`, dist-tags `latest` + `dsh-0.1.5`; 49 files / 98.8 kB, shasum del tarball `1862528750612980122ffc3d31f31eb05eb1bf7d`.

### Corretto

- **La stessa dimensione non avvisa più due volte**: tetto righe e budget anteprima condividono ora una stessa bandierina, `finalize()` riempie retroattivamente `found`, così una sola riga porta insieme kept/limit/found invece di renderizzare due banner quasi identici. Nuova asserzione: **esattamente un avviso per causa**.
- **Dichiarato il campo `repository`**, che punta a `drscrewdriver/dsh-opensheet-sidebar`. Gli elenchi di raccolta associano un pacchetto npm al suo repository solo quando il pacchetto pubblicato rimanda al repository; alla 1.0.0 mancava questo campo, per questo finora i due non erano associati.

### Aggiunto

- **Set di fixture xlsx reali** (`scripts/make-xlsx-fixtures.py`, seme casuale fisso): openpyxl produce sei vere cartelle di lavoro, ognuna delle quali innesca un solo percorso dell'interruttore; `scripts/report-fixtures.mjs` ci gira sopra con il **lettore del plugin stesso** e stampa ciò che legge. È proprio lui a mettere in luce il doppione, e copre anche il percorso dei formati data personalizzati, irraggiungibile per le fixture zip sintetiche (output reale di openpyxl → 2026-01-08).

### Test

- 25 asserzioni (14 csv + 11 xlsx), codice d'uscita 0; il rapporto delle fixture mostra esattamente un avviso per file.

## 1.0.0 — 2026-09-22

**Identità del pacchetto rinominata: `dsh-csv-sidebar` → `dsh-opensheet-sidebar`.** Funzionalmente identica alla 0.3.0, nessun cambio di comportamento, cambiano solo identità e nome mostrato.

> **Traccia di pubblicazione (2026-09-22)**: npm `dsh-opensheet-sidebar@1.0.0`, dist-tags `latest` + `dsh-0.1.5`; 49 files / 97.2 kB, shasum del tarball `88b7fed194c15cd6cd59c1d87e69ae9e8503b5aa`. Dopo la pubblicazione il tarball è stato ritirato dal registry per una controverifica: `lib/client.js` è identico byte per byte alla build del repository (`43CF34FDCB65…`), l'id del modulo nel bundle = `dsh-opensheet-sidebar`. Il profilo è migrato dal pin `github:` a questa versione npm (la spec è depositata su disco come valore esatto `1.0.0`).

Il nome è un gioco di parole: **Open** (aprire) ＋ **Open** (standard aperto) — una parola sola copre «aprire la tabella» e «leggere la tabella senza dipendere da librerie proprietarie». Il gioco di parole vive solo nel nome; i campi funzionali restano rigorosamente letterali (`exts` riceve solo estensioni reali).

> Traccia del processo di denominazione: prima era caduto il plurale `opensheets`, corretto in singolare `opensheet` meno di un minuto prima della pubblicazione (un nome proprio al singolare fa più marca e rafforza il legame con la famiglia OpenDocument). Questa voce descrive l'identità finale.

### Modificato

- Nome del pacchetto / nome del repository / `dsh.plugin.json#id` / row id+name del `cordis.patch.yml` → `dsh-opensheet-sidebar`. **Questi punti vanno tenuti sincronizzati**: l'id del modulo client deriva da `package.json#name`, e il `name:` della riga è ciò con cui client-modules individua il manifesto del pacchetto; perderne uno = la riga host c'è, la metà client non si carica in silenzio (il guasto tipico della 0.1.0).
- Rinominati anche gli id con prefisso: `TAB_ID` / `VIEWER_ID` / `XLSX_VIEWER_ID` / id del tag di stile / namespace locale.
- Nome mostrato della tab laterale `CSV` → `Sheets` (zh: `表格`). I titoli dei visualizzatori restano descrittivi (`CSV table` / `Spreadsheet table`) — dire cosa è in base al tipo di file, invece di metterci sopra un nome di prodotto.
- Salto alla 1.0.0: per i consumatori è una modifica ostativa (cambia l'identità del pacchetto), non una minor.

### Migrazione (identità vecchia → identità nuova)

1. `dsh plugin --profile <p> add github:drscrewdriver/dsh-opensheet-sidebar#<sha>`
2. `dsh plugin --profile <p> remove dsh-csv-sidebar` — `reconcilePlugins` toglie automaticamente il vecchio nome dal `dsh.profile.bundles`
3. Sostituire nel `cordis.patch.yml` del profilo la riga `- id: dsh-csv-sidebar` con il nuovo id (una patch su un id inesistente è un no-op silenzioso; lasciarla non inganna che chi viene dopo)
4. Riavviare l'host una volta

> Effetto collaterale: l'interruttore attiva/disattiva di better-sidebar è ancorato alla chiave `tabsEnabled[<id>]`; l'id cambia → gli interruttori precedenti dell'utente tornano ai valori predefiniti. Il vecchio repository `drscrewdriver/dsh-csv-sidebar` resta ma non è più referenziato.

## 0.3.0 — 2026-09-22

Supporto xlsx (con **cambio foglio**). Zero dipendenze: la decompressione zip passa dal `DecompressionStream('deflate-raw')` nativo del browser, l'XML è trattato con scansioni mirate invece che con un parser universale.

### Aggiunto

- **Visualizzatore di cartelle di lavoro**: `.xlsx` / `.xlsm` si aprono come tabella, in alto una fila di schede per i fogli permette il cambio; i fogli nascosti (`state="hidden"`) appaiono attenuati nelle schede, per default si apre automaticamente il primo foglio visibile.
- **Lettore xlsx** (`src/client/xlsx.ts`): analisi della directory centrale dello zip (gestione corretta del caso data-descriptor, della dimensione ci si fida solo se dichiarata dalla directory centrale) → elenco fogli da `xl/workbook.xml` → `_rels` rId→part → `sharedStrings.xml` (concatenazione dei run di testo formattato) → `styles.xml` (`cellXfs` → numFmtId → riconoscimento date) → decompressione su richiesta di un solo `worksheets/sheetN.xml`.
- **Trattamento delle celle**: stringhe condivise / stringhe inline / valori in cache delle formule (`t="str"`) / booleani / errori / numeri; i **buchi di colonna** sono ricostruiti via `r="C3"` (una colonna assente non sposta la successiva); i numeri di serie delle date sono convertiti in date leggibili secondo le ere 1900/1904.
- **Due barriere del contenitore** (la barriera di sola dimensione di prima, per uno zip, equivaleva a nessuna protezione):
  - il **volume decompresso dichiarato** è verificato prima di ogni azione di decompressione (l'header zip è falsificabile, da qui il rifiuto deterministico a monte);
  - il **budget di byte della decompressione in flusso** fa da rete, contato mentre si decomprime, con `cancel()` appena si supera.
  Se un solo foglio supera da solo il limite, si blocca solo quel foglio; i fogli fratelli restano leggibili.
- Nuovi testi d'avviso `inflated-bytes` / `sheet-bytes` / `container-error` (zh/en).
- **Test**: `tests/xlsx.test.mjs` costruisce sul posto vere fixture zip (con CRC32 e directory centrale corretta) — elenco fogli e marcatori di nascosto, stringhe condivise, celle data, buchi di colonna, cambio tra fogli, zip bomb con volume falsificato, input non zip; 11 asserzioni, codice d'uscita 0/1.

### Corretto

- **I placeholder degli avvisi non restano più a nudo**: all'esaurimento del budget anteprima (riga 201) l'avviso veniva generato senza che `found` fosse noto, e l'interfaccia mostrava direttamente `共至少 {found} 行`. Ora `finalize()` riporta il numero di righe davvero contate.
- Nuova **guardia di integrità dei placeholder** (una per suite di test): percorre gli avvisi realmente prodotti da ciascuna dimensione e assicura che ogni `{name}` dei template zh/en si ritrovi nel detail, altrimenti rosso. Questi bug non si scopriranno più a occhio nudo.

### Modificato

- Due soglie in più nella configurazione dell'interruttore: `maxInflatedBytes` (64 MB predefiniti), `maxSheetBytes` (32 MB predefiniti).
- Barra di stato: una cartella di lavoro mostra l'etichetta col nome del foglio, senza più sbagliare mostrando «separatore».
- Il visualizzatore xlsx passa per `fetchStrategy: 'custom'` + la rotta `/sidebar/file` dell'host per prendere i byte grezzi (`fsRead` sul binario risponde solo `head`, inutilizzabile per l'analisi); la recinzione dei percorsi dello workspace resta lato host.

### Non ancora supportato

- `.xls` (Excel 97-2003 BIFF8) e vecchi formati WPS `.et` / `.wps` / `.dps`: tutti documenti composti OLE2, costosi da realizzare a zero dipendenze (bisognerebbe costruirsi da soli il parsing CFB + BIFF). Coprirli vuol dire introdurre SheetJS (~1 MB, la cui versione npm non è più mantenuta), in conflitto col principio dello zero-dipendenze — da valutare separatamente.

## 0.2.0 — 2026-09-22

Riscrittura nel formato standard. La metà client della 0.1.0 non rispettava il contratto dei moduli client di DSH: installata in un profilo, **non veniva caricata** (nessun errore, nessuna voce); questa versione rifà il livello di integrazione secondo lo standard plugin-framework.

### Corretto (livello di integrazione — tutte cause radici del «non si mostra»)

- L'artefatto client diventa una closure CJS `window.__ModuleLoader__.load({ id, factory })` la cui fabbrica esporta `apply` + `inject` (prima modulo ES + `activate()`, la tabella dei moduli scartava tutto).
- L'aggancio di registrazione passa da `ctx.sessionProjections` a `ctx.betterSidebar.registerFileViewer / registerTab` (il primo è il registro delle proiezioni lato host, non l'aggancio UI della barra laterale).
- Nuovo `inject` dichiarativo `['betterSidebar', 'locale']`: apply attende solo che i due servizi cordis siano pronti; l'ordine di registrazione non influenza più il risultato.
- Ogni installazione passa da `ctx.effect(fn, label)`; a HMR / disattivazione ripulisce il disposer (tag di stile, dizionari, due descrittori).
- Metadati completati: `package.json#dsh.bundle.patch` + `dsh.client.platform/inject`, elenchi `exports` / `files`, `screenshots.json`, `assets/`, `tsconfig*.json`.
- Tetto peer unificato a `<0.2.0-0`, per schivare la trappola di confronto semver delle prerelease; `dsh-better-sidebar` / `react` marcati optional.

### Aggiunto

- **Aggancio visualizzatore di file**: `.csv/.tsv/.psv` (priority 50, `fetchStrategy: 'fsRead'`) entrano nell'elenco «anteprima file» della GUI, attivabili/disattivabili nelle impostazioni della card Side; legge l'host, la recinzione dei percorsi resta lato host.
- **Guardia di caricamento in build**: carica davvero l'artefatto via `node:vm` + stub `window.__ModuleLoader__`, verifica `id`, i `apply`/`inject` di `factory()` e rifiuta le richieste di moduli integrati di Node.
- **12 asserzioni di base** (`npm test`, codice d'uscita 0/1): virgolette ed escape RFC 4180, sniffing del separatore, interruttore a quattro dimensioni, marcatore di troncamento dell'host, righe vuote e documento vuoto.
- Namespace i18n proprio `dsh-csv-sidebar` (zh/en), ripiego sul dizionario inglese integrato se `locale` manca.
- Stili a token semantici `--dsw-alias-*` (niente più dipendenza da variabili inesistenti come `--border-color`).

### Modificato

- **Zero dipendenze a runtime**: rimosso PapaParse, sostituito da uno scanner locale sensibile alle virgolette (RFC 4180, campi a cavallo di più righe supportati); il bundle externalizza solo React (43 KB).
- Build spostata da Vite a esbuild a doppio ingresso (`lib/index.mjs` + `lib/client.js`), con in più le dichiarazioni di tipo tsc.
- Semantica dell'interruttore inasprita: all'esaurimento del budget `previewRows` **promozione esplicita ad avviso `rows`** (niente più silenzio sulle prime 200 righe); i due rami `OK` di `finalize()` fusi.
- Sorgenti spostate in `src/client/` secondo la struttura standard; la metà host diventa autonoma in `src/index.ts`.

### Rimosso

- `vite.config.ts`, la dipendenza `papaparse`, i vecchi componenti piatti `src/*.tsx` e la scorretta scrittura del campo `main` che puntava a `./lib/client.js`.

## 0.1.0 — 2026-09-22

Primo prototipo: il `demo.html` di `npm run dev` ha validato la resa delle interazioni tabellari e dell'interruttore a quattro dimensioni, poi incapsulato come plugin. **L'incapsulamento plugin di questa versione non si carica in DSH** (vedi Corretto della 0.2.0).
