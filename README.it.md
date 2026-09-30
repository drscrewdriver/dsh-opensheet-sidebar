# dsh-opensheet-sidebar

[简体中文](README.md) | [Français](README.fr.md) | [Deutsch](README.de.md) | [Italiano](README.it.md) | [Русский](README.ru.md) | [Español](README.es.md)

> ⛔ **Questo progetto non è più mantenuto (2026-10-01).** Le versioni recenti dell’host DSH includono un’anteprima integrata nel pannello laterale per file office e di fogli di calcolo; il plugin cessa di essere mantenuto — nessuna pubblicazione futura, nessun adattamento alle future linee dell’host. Le versioni pubblicate restano installabili; per gli host 0.1.x usate le build dai rami congelati `compat/0.1.7` / `compat/0.1.5`.

Plugin di anteprima tabellare per la barra laterale destra (consumatore di [dsh-better-sidebar](https://github.com/omdsh-dev/DSH-better-sidebar)): i file `csv` / `tsv` / `psv` come `xlsx` / `xlsm` si aprono come tabelle strutturate, con **protezione a interruttore (circuit breaker)** — nessun input può bloccare la barra laterale.

> **Il nome è un gioco di parole, annotato qui perché non venga scambiato per un refuso**: `OpenSheet` si legge sia come «**aprire** il foglio» (open the sheet, verbo) sia come «foglio a **standard aperto**» (open-standard sheet — la famiglia dei formati tabellari open source legata a OpenDocument). Una parola sola dice le due cose che fa: aprire, e leggere in un modo che non dipende da librerie proprietarie.
>
> Confine: il gioco di parole vive solo nel **nome**. I campi funzionali restano rigorosamente letterali — `exts` contiene solo estensioni reali (`csv`/`tsv`/`psv`/`xlsx`/`xlsm`), e i campi di protocollo non portano marchi.

> **v0.2.0 è una riscrittura del modo di integrazione**: la metà client di v0.1.0 (all'epoca `dsh-csv-sidebar`) non rispettava il contratto dei moduli client di DSH (modulo ES + `activate()` + `ctx.sessionProjections`) e quindi **non si mostrava** una volta installata. La 0.2.0 rifà l'integrazione secondo lo standard plugin-framework, vedi sotto «Perché v0.1.0 non si mostra».

---

## 1. Che cosa fa

| Punto di aggancio | Contenuto registrato | Cosa vede l'utente |
|------|---------|-------------|
| **Anteprima file** `registerFileViewer` | `exts: ['csv','tsv','psv']`, `priority: 50`, `fetchStrategy: 'fsRead'` | Si apre un `.csv` nell'esploratore → direttamente una **tabella**, non testo grezzo; attivabile/disattivabile nelle impostazioni della card Side, alla disattivazione torna il visualizzatore di testo integrato |
| **Tab manuale** `registerTab` | `order: 70`, `single: true` | La pagina **CSV** del menu `+`: trascina/seleziona un file locale; a quel punto la **dimensione reale in byte è nota** e i file troppo grandi vengono rifiutati prima della lettura |

I due condividono lo stesso corpo di rendering (bandiera avvisi → barra statistiche → tabella → azioni in fondo); cambia solo da dove arriva il testo.

**Capacità interattive** (allineate a «i dati strutturati non vanno degradati a puro testo»): ordinamento con clic sull'intestazione (crescente → decrescente → annulla), filtro per sottostringa, allineamento a destra delle colonne numeriche (dedotto da un campione), riconoscimento del tipo di colonna (number / date / boolean / text), intestazione e colonna dei numeri di riga fissi (sticky), statistiche su valori vuoti e valori unici.

---

## 2. L'interruttore a quattro dimensioni

| Dimensione | Limite predefinito | Comportamento al superamento |
|------|---------|-------------|
| Dimensione del file | 5 MB | **BLOCKED** — per un file locale non viene nemmeno chiamato `file.text()`; il testo letto dall'host è rifiutato in partenza |
| Righe di dati | 10 000 | **TRUNCATED** — la lettura si ferma **al** limite, senza analisi completa |
| Numero di colonne | 100 | le colonne in eccesso sono scartate + avviso |
| Testo di una cella | 10 KB | la cella è abbreviata in `前200字符… (+N chars)` + avviso |

In più c'è `previewRows: 200`: la tabella reserva il proprio budget DOM alle prime 200 righe. All'arrivo della 201ª riga **non c'è silenzio** — l'evento viene promosso ad avviso `rows` e lo stato passa a `TRUNCATED`.

> Il risultato dell'interruttore è un cittadino di prima classe, non una pagina di errore: ogni banner indica **quale limite è scattato, qual è il valore misurato, qual è il limite**, e la tabella continua a rendersi normalmente (con BLOCKED compare una spiegazione chiara del blocco). I quattro stati `OK / TRUNCATED / BLOCKED` + `READING` sono tutti prodotti renderizzabili; mai un'eccezione lanciata, mai un caricamento infinito.

---

## 3. Confronto con il formato standard (plugin-framework)

| Requisito dello standard | Questo plugin |
|---------|--------|
| Struttura in due metà | `src/index.ts` (metà host, apply vuoto) + `src/client/index.tsx` (metà browser) |
| Contratto del modulo client | Il prodotto della build è una closure CJS `window.__ModuleLoader__.load({ id, factory })` che esporta `apply` + `inject`; **in build viene caricato davvero una volta tramite `node:vm` e gli export sono verificati con assert** |
| Iniezione dichiarativa `inject` | `export const inject = ['betterSidebar', 'locale']` — apply parte solo quando entrambi i servizi cordis sono pronti; l'ordine di registrazione è indifferente |
| Ciclo di vita | Ogni installazione passa da `ctx.effect(fn, label)`; a HMR/disattivazione il disposer restituito ripulisce |
| Posti impostazioni / registrazione comandi | Questo plugin non registra posti impostazioni né comandi `/` (quindi né seat-pin né contratto della funzione description) |
| Manifesto `dsh.bundle` | `package.json#dsh.bundle.patch` + `dsh.client.platform/inject` |
| `cordis.patch.yml` | Una pura riga insert, col commento che indica i due modi di installazione (CLI / manuale) |
| peerDependencies | `@deepseek-ai/*` a `>=0.2.0-rc.1 <0.2.1-0` (tetto `-0` per evitare la trappola semver delle prerelease); `dsh-better-sidebar` / `react` marcati optional — linea 0.2.0 |
| Struttura delle cartelle | `src/ lib/ assets/ tests/ scripts/` + `screenshots.json` + `dsh.plugin.json` + README/CHANGELOG |
| Zero dipendenze | **nessuna dipendenza a runtime**: il parser CSV e l'interruttore sono moduli locali; il bundle client externalizza solo React (43 KB) |
| Stili | Nessun ingresso CSS → `styles.css` viene inlinato come stringa dalla build; `apply` inserisce un `<style>` e registra un disposer; i colori usano solo i token semantici `--dsw-alias-*` |
| Multilingua | Namespace proprio `dsh-opensheet-sidebar`, dizionari zh/en registrati via `locale.register(NS, tag, dict)`; senza il servizio si ripiega sul dizionario inglese integrato, senza la chiave viene resa la chiave stessa (visibile, non vuota) |
| Disciplina delle dipendenze morbide | Nessun import di valori/tipi da `dsh-better-sidebar` (`seams.ts` fa solo dichiarazioni strutturali); se `betterSidebar` manca, **warn sonoro e inerzia** — nemmeno mezza registrazione di pannello |

---

## 4. Perché v0.1.0 non si mostrava (causa radice)

Dopo l'installazione di v0.1.0 in un profilo, `cordis.patch.yml` era registrato e `node_modules` c'era, ma la barra laterale non dava segni di vita, **e in console nessun errore** — il modulo veniva scartato già nella fase di caricamento dei moduli client:

| # | Scrittura di v0.1.0 | Contratto standard | Conseguenza |
|---|--------------|---------|------|
| 1 | `lib/client.js` è un **modulo ES** (`export function activate`) | closure CJS via `window.__ModuleLoader__.load({ id, factory })` | la tabella dei moduli non ottiene export → **l'intero pacchetto non si carica, in silenzio** |
| 2 | l'ingresso esporta `activate(ctx)` | esportare **`apply(ctx)`** | anche caricato, nessun punto d'ingresso trovato |
| 3 | niente `inject` | `export const inject = [...]` | cordis non attende `betterSidebar`; momento di registrazione casuale |
| 4 | registrazione via `ctx.sessionProjections.register({key,badge,component})` | `ctx.betterSidebar.registerTab / registerFileViewer` | **punto di aggancio sbagliato**: `sessionProjections` è il registro delle proiezioni lato host, non l'aggancio UI della barra laterale |
| 5 | niente `ctx.effect`; `package.json` senza `dsh.bundle` / `dsh.client` / `exports` / `files`; tetto peer scritto `>=0.1.5-rc.1` (senza tetto superiore) | vedi tabella sopra | nessun recupero HMR; metadati incompleti |

> In una frase: **non era «non attivo», era «mai caricato»**. Questo spiega anche perché nell'«anteprima file» di sistema non se ne vede alcuna voce — quell'elenco è proprio il registro di `registerFileViewer`.

---

## 5. Build e verifica

```bash
npm run build     # esbuild a doppio ingresso + dichiarazioni di tipo tsc; in build il bundle viene caricato davvero una volta e apply/inject sono verificati
npm test          # 25 asserzioni: 14 csv (parsing/virgolette/separatore/interruttore 4D/integrità dei placeholder/dedup degli avvisi) + 11 xlsx (zip/XML/fogli/due barriere del contenitore)
npm run verify    # build && test
```

Output reale di `npm test` (2026-09-22):

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

Il guardiano di build (`scripts/build.mjs`), dopo la scrittura dell'artefatto: esegue davvero il bundle con `node:vm` e uno stub `window.__ModuleLoader__`, verifica che `load()` sia chiamato, che `id` sia uguale al nome del pacchetto e che `factory()` restituisca un oggetto con `apply` e `inject`; e rifiuta ogni richiesta di moduli integrati di Node. **Un bundle non caricabile va in rosso già in fase di build e non arriva mai ammalato all'host.**

---

### 5.1 Fixture xlsx e autoverifica (`demo/xlsx/`)

Le fixture sono generate da script, nessun binario va in commit: seme casuale fisso, byte stabili, e **ogni file serve solo a innescare un solo percorso**.

```bash
python scripts/make-xlsx-fixtures.py --out ../demo/xlsx   # richiede openpyxl (solo dev)
node scripts/report-fixtures.mjs ../demo/xlsx             # gira con il lettore del plugin stesso e stampa ciò che vede
```

| File | Peso | Innesca |
|------|------|------|
| `basic-3sheets.xlsx` | 8 KB | 3 fogli (uno nascosto) · formati data reali · booleani · buchi di colonna · formule senza valore in cache |
| `wide-150cols.xlsx` | 15 KB | tetto colonne (150 > 100) → `cols` |
| `long-12000rows.xlsx` | 286 KB | tetto righe + budget anteprima → `rows` (**una sola**, con found/kept/limit) |
| `long-cell-20k.xlsx` | 5 KB | tetto cella (20 000 > 10 240) → `cell-length` |
| `deep-sheet-60k.xlsx` | 1.7 MB | **archivio piccolo, 56.7 MB decompressi** → `sheet-bytes` (rifiutato prima di ogni decompressione) |
| `big-archive.xlsx` | 8.5 MB | l'archivio stesso supera 5 MB → `file-size` (BLOCKED) |

L'output di `report-fixtures.mjs` è la prova che «ogni fixture fa il suo mestiere»; gira su file prodotti da un vero writer Excel (openpyxl) e copre quindi anche il percorso dei formati data personalizzati, che le fixture sintetiche non raggiungono (`2026-01-08` anziché il numero di serie `46030`).

## 6. Installazione

**Modo A (consigliato): CLI ufficiale** — tiene insieme dipendenze e `dsh.profile.bundles`

```bash
dsh plugin --profile <profile> add <path-to-plugin>
```

**Modo B: manuale (tre passaggi, tutti obbligatori)**

```bash
# 1) Copiare questo pacchetto
#    → ~/.dsh/profiles/<profile>/node_modules/dsh-opensheet-sidebar
# 2) Aggiungere "dsh-opensheet-sidebar" all'array dsh.profile.bundles del package.json del profilo
# 3) Accodare la riga insert del cordis.patch.yml di questo pacchetto al cordis.patch.yml del profilo
```

> ⚠️ **Il passaggio 2 è il più facile da dimenticare, e la sua assenza è del tutto silenziosa.** Il livello bundle viene sintetizzato solo se il
> `dsh.profile.bundles` del profilo cita questo pacchetto; fermandosi ai passaggi 1 e 3 il risultato è: pacchetto presente,
> `- id: dsh-opensheet-sidebar` in `cordis.patch.yml`, ma quella riga **non ha alcuna riga bersaglio su cui agire** —
> il plugin non si carica e la console non dice nulla. Il `disabled: false` del passaggio 3 si limita ad «attivare esplicitamente una riga già inserita»,
> da sé non inserisce alcuna riga.

**Dopo l'installazione, verificare prima di riavviare** (non avvia alcun servizio):

```bash
dsh --profile <profile> --dump-config | Select-String dsh-opensheet-sidebar
# Output atteso:
#   # == dsh-opensheet-sidebar, patched by ...\cordis.patch.yml
#   - id: dsh-opensheet-sidebar
#     name: dsh-opensheet-sidebar
#     disabled: false
```

Vedere queste tre righe = riga inserita + patch del profilo attiva; a quel punto basta **riavviare DSH** (il bundle del profilo e la tabella dei moduli client vengono sintetizzati all'avvio; il solo refresh della pagina non basta).
Non vedere nulla = il passaggio 2 non ha avuto effetto.

**Dipendenza**: `dsh-better-sidebar >= 0.18.1` (opzionale). In sua assenza il plugin si carica regolarmente, avvisa in console e non contribuisce alcuna voce.

---

## 7. Matrice di compatibilità delle versioni

| Versione del plugin | DSH | Note |
|---------|-----|------|
| 2.0.0 | `>=0.2.0-rc.1 <0.2.1-0` | Linea host 0.2.0 (`main`, promossa da `compat/0.2.0`). Adattamento solo di metadati: la superficie di consumo è composta da pure chiamate `ctx.get(...)`, 0.2.0-rc.1 mantiene intatta l'API plugin di 0.1.7; allinea al contempo la version derivante del manifest |
| 1.0.0 / 1.0.1 | `>=0.1.5-rc.1 <0.2.0-0` | Rinomina dell'identità del pacchetto (csv → opensheet) + deduplica dell'interruttore; servita dai rami congelati `compat/0.1.7` / `compat/0.1.5` |
| 0.3.0 | `>=0.1.5-rc.1 <0.2.0-0` | anteprima di cartelle di lavoro xlsx/xlsm (cambio foglio) + due barriere del contenitore zip + guardia di integrità dei placeholder |
| 0.2.0 | `>=0.1.5-rc.1 <0.2.0-0` | riscrittura nel formato standard: `__ModuleLoader__` + `apply/inject/effect` + doppio aggancio better-sidebar |
| 0.1.0 | — | modo di integrazione fuori contratto, **non si carica**, abbandonato |

## 8. Limiti noti

- Nessuno scorrimento virtuale per la tabella: il budget DOM è controllato rigidamente da `previewRows`; con più dati si arriva solo a «troncare prima», mai a rallentamenti.
- L'`fsRead` dell'host tronca da sé i file grandi; la barra statistiche mostra allora `≈` e l'etichetta «lettura troncata dall'host», con `state = TRUNCATED` — **non si finge mai un file completo**.
- Solo anteprima, nessuna riscrittura: né modifica né salvataggio.

## 9. Supporto xlsx (con cambio foglio)

`.xlsx` / `.xlsm` si aprono con lo stesso rendering tabellare; in alto una fila di **schede dei fogli** permette di cambiare; i fogli nascosti (`state="hidden"`) appaiono attenuati nelle schede e per default si apre automaticamente il primo foglio visibile. Zero dipendenze a runtime.

### 9.1 L'aggancio: perché serviva un altro percorso di lettura

Una cartella di lavoro è binaria, mentre `fetchStrategy: 'fsRead'` sul binario risponde solo `{kind:'binary', size, truncated, head}` — **senza content**, il parser non ha nulla da masticare. Per questo xlsx è un'anteprima **registrata separatamente**:

```
fetchStrategy: 'custom'
load: fetch(`/sidebar/file?sessionId=..&cwd=..&path=..`) → arrayBuffer → Uint8Array
```

Si passa per la rotta dei byte grezzi dell'host stesso; la recinzione dei percorsi dello workspace resta quindi lato host (non leggiamo i file da soli). Il percorso `fsRead` dei CSV resta intoccato.

### 9.2 Pipeline di analisi (`src/client/xlsx.ts`)

```
directory centrale dello zip → xl/workbook.xml (elenco fogli / ordine / nascosti)
             → xl/_rels/workbook.xml.rels (rId → part)
             → xl/sharedStrings.xml (concatenazione dei run di testo formattato)
             → xl/styles.xml (cellXfs → numFmtId → data o meno)
             → xl/worksheets/sheetN.xml (si decomprime solo il foglio richiesto)
```

Copertura delle celle: stringhe condivise / stringhe inline / valori in cache delle formule (`t="str"`) / booleani / errori / numeri; i **buchi di colonna** vengono ricostruiti tramite `r="C3"` (una colonna assente non sposta la successiva); i numeri di serie delle date sono convertiti in date leggibili secondo le ere 1900 e 1904.

La decompressione usa il `DecompressionStream('deflate-raw')` nativo del browser; l'XML è trattato con scansioni mirate — l'XML del xlsx è una struttura regolare generata da macchina, un parser universale sarebbe uno spreco.

### 9.3 Due barriere del contenitore (per uno zip, una barriera di sola dimensione equivale a nessuna protezione)

| Barriera | Momento | Predefinito | Ruolo |
|------|------|------|------|
| **Volume decompresso dichiarato** | **prima** di ogni operazione di decompressione, leggendo la directory centrale | 32 MB per part | l'header zip è falsificabile, ecco perché questo rifiuto deterministico a monte |
| **Budget di byte in flusso** | cumulato durante la decompressione | 64 MB in totale | rete di sicurezza quando l'header mente; al superamento, `cancel()` immediato |

Se un singolo foglio supera da solo il limite, **si blocca solo quel foglio**; i fogli fratelli si aprono normalmente. Contenitore illeggibile (non zip / part mancante) → `container-error`, reso come una scheda d'errore leggibile invece di un'eccezione.

### 9.4 Non ancora supportato

I `.xls` (Excel 97-2003 BIFF8) e i vecchi formati WPS `.et` / `.wps` / `.dps`: tutti documenti composti OLE2; lo zero-dipendenze richiederebbe di costruirsi da soli l'analisi CFB (FAT/directory) + BIFF, costoso e incline agli errori. Coprirli di solito vuol dire introdurre SheetJS (~1 MB, la versione npm non è più mantenuta e le nuove escono solo sul CDN ufficiale), in conflitto col principio dello zero-dipendenze — da valutare a parte quando serve.

> Da non confondere: **il `.xlsx` salvato per default da WPS Fogli elettronici è uno xlsx standard**, supportato direttamente da questo plugin; solo gli `.et` prodotti da «Salva con nome → vecchio formato WPS» rientrano tra i non supportati.

## 10. Pubblicazione e migrazione d'identità (esempi di script)

Due script, ognuno con la sua metà: la **pubblicazione** sulla macchina di sviluppo, la **migrazione** nel profilo che installa il plugin. Entrambi accettano `-DryRun` (l'unico modo rieseguibile a piacere) ed entrambi si fermano al primo fallimento — mai «pubblicare comunque».

```powershell
# ① Lato pubblicazione: build + test + guardie d'identità + manifesto del pacchetto, solo dopo la pubblicazione vera (--access public, registry ufficiale)
pwsh -File scripts/publish-npm.ps1 -DryRun                # prima guardare
pwsh -File scripts/publish-npm.ps1                        # poi pubblicare
pwsh -File scripts/publish-npm.ps1 -DeprecateOld dsh-csv-sidebar   # opzionale: deprecare il vecchio nome

# ② Lato consumo: installare la nuova identità → togliere la vecchia → cambiare l'id della riga di patch del profilo → verificare punto per punto
#    -NewSpec deve essere una spec «risolvibile davvero oggi» — lo script verifica in anticipo prima di toccare qualsiasi cosa.
#    Questo pacchetto per ora esiste solo su GitHub (su npm non c'è ancora), quindi si usa la forma github::
pwsh -File scripts/migrate-profile.ps1 -Profile web -NewSpec 'github:drscrewdriver/dsh-opensheet-sidebar#<sha>' -DryRun
pwsh -File scripts/migrate-profile.ps1 -Profile web -NewSpec 'github:drscrewdriver/dsh-opensheet-sidebar#<sha>'
#    Dopo la pubblicazione su npm si passa alla forma registry (prima di allora quella riga sarebbe bloccata dalla preverifica):
#    pwsh -File scripts/migrate-profile.ps1 -Profile web -NewSpec 'dsh-opensheet-sidebar@1.0.0'
```

**Preverifica (preflight)**: `-NewSpec` viene prima risolta e poi si agisce — forma npm via `npm view <name>[@range]`, forma `github:` via `git ls-remote` (uno SHA di 40 caratteri non si cerca per nome; si verifica quindi la raggiungibilità del repository, e lo SHA stesso è validato dal passaggio di installazione), forma locale leggendo il `package.json`. Se la risoluzione fallisce, si interrompe prima del backup, codice d'uscita 1 — per evitare che un esempio «che sembra funzionare» fallisca a metà strada.

Si può anche passare dagli alias npm script:

```powershell
npm run publish:npm -- -DryRun
npm run profile:migrate -- -Profile web -NewSpec 'dsh-opensheet-sidebar@1.0.0' -DryRun
```

### 10.1 Perché l'ordine è «prima installare il nuovo, poi togliere il vecchio»

La rinomina tocca quattro punti insieme, e **mancarne uno solo è un fallimento silenzioso** (non un errore): la spec di dipendenza del profilo, `dsh.profile.bundles` (tenuto dal reconcile della CLI, non editare a mano), il row id del `cordis.patch.yml` del profilo (una patch su un id inesistente è un no-op), la cartella dentro `node_modules`.

Installare prima il nuovo e togliere poi il vecchio fa sì che, fallendo qualsiasi passaggio, resti un **plugin ancora usabile**, non un profilo vuoto. Entrambe le chiamate pnpm vengono ritentate una volta automaticamente — con l'host in funzione `node_modules` è occupato e il primo tentativo può lanciare `ERR_PNPM_PACKAGE_MANAGER_REMOVE_MODULES_DIR`.

### 10.2 Tre trappole PowerShell 5.1 negli script (mezz'ora risparmiata al riutilizzo)

| Trappola | Sintomo | Rimedio |
|----|------|------|
| Comando nativo + redirezione `2>` + `$ErrorActionPreference='Stop'` | gli avvisi stderr di npm vengono promossi a **errori terminali** e lo script muore al passaggio 2 senza apparente motivo | allentare temporaneamente a `Continue` prima della chiamata, fondere i flussi con `2>&1 \| Out-String`, poi leggere `$LASTEXITCODE` |
| `$PSScriptRoot` come valore predefinito di `param()` | al momento della valutazione è ancora stringa vuota → la validazione dei parametri di `Split-Path` fallisce | mettere `''` come predefinito e risolvere nel corpo dello script |
| `.Count` su un risultato di `Where-Object` | 1 risultato è una stringa (senza `.Count`), 0 risultati sono `$null` — sotto `Set-StrictMode` subito `PropertyNotFound` | avvolgere sempre in `@(...)` prima di leggere `.Count` |

Lo script di pubblicazione porta con sé inoltre due **guardie che dovrebbero esserci tanto prima quanto dopo l'upload**: il nome deve essere «libero o proprio» (`npm view` + `maintainers` confrontati con `npm whoami`, per non finire su un nome occupato da altri), e senza sessione collegata si rifiuta subito (invece di aspettare un 401).

## 11. Note multilingue / Sprachen / Langues / Языки / Idiomas / Lingue

Questa README è scritta in italiano. Panoramica rapida di installazione e compatibilità (questa linea richiede DSH 0.2.0: `>=0.2.0-rc.1 <0.2.1-0`; installazione: `dsh plugin --profile <profile> add dsh-opensheet-sidebar@dsh-0.2.0`):

- **Deutsch** — benötigt DSH 0.2.0 (`>=0.2.0-rc.1 <0.2.1-0`), getestet gegen DSH 0.2.0-rc.1. Installation: `dsh plugin --profile <profile> add dsh-opensheet-sidebar@dsh-0.2.0`. Die 0.1.x-Wirtslinie wird von den eingefrorenen Zweigen `compat/0.1.7` / `compat/0.1.5` (npm-Tags `dsh-0.1.7` / `dsh-0.1.5`) versorgt.
- **Français** — nécessite DSH 0.2.0 (`>=0.2.0-rc.1 <0.2.1-0`), testé avec DSH 0.2.0-rc.1. Installation : `dsh plugin --profile <profile> add dsh-opensheet-sidebar@dsh-0.2.0`. La lignée d'hôtes 0.1.x est assurée par les branches figées `compat/0.1.7` / `compat/0.1.5` (tags npm `dsh-0.1.7` / `dsh-0.1.5`).
- **Русский** — требуется DSH 0.2.0 (`>=0.2.0-rc.1 <0.2.1-0`), протестировано на DSH 0.2.0-rc.1. Установка: `dsh plugin --profile <profile> add dsh-opensheet-sidebar@dsh-0.2.0`. Линия хостов 0.1.x обслуживается замороженными ветками `compat/0.1.7` / `compat/0.1.5` (npm-теги `dsh-0.1.7` / `dsh-0.1.5`).
- **Español** — requiere DSH 0.2.0 (`>=0.2.0-rc.1 <0.2.1-0`), probado con DSH 0.2.0-rc.1. Instalación: `dsh plugin --profile <profile> add dsh-opensheet-sidebar@dsh-0.2.0`. La línea de anfitriones 0.1.x la atienden las ramas congeladas `compat/0.1.7` / `compat/0.1.5` (etiquetas npm `dsh-0.1.7` / `dsh-0.1.5`).
- **Italiano** — richiede DSH 0.2.0 (`>=0.2.0-rc.1 <0.2.1-0`), testato su DSH 0.2.0-rc.1. Installazione: `dsh plugin --profile <profile> add dsh-opensheet-sidebar@dsh-0.2.0`. La linea di host 0.1.x è servita dai rami congelati `compat/0.1.7` / `compat/0.1.5` (tag npm `dsh-0.1.7` / `dsh-0.1.5`).
