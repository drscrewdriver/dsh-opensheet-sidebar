# Journal des modifications — dsh-opensheet-sidebar

## 2.0.0 — 2026-09-29

### Modifié

- **Ligne d'hôte migrée vers DSH 0.2.0** (`main`, promue depuis `compat/0.2.0`) : `engines.dsh` et la dépendance pair `@deepseek-ai/dsh-client-locale` passent de `>=0.1.5-rc.1 <0.2.0-0` à `>=0.2.0-rc.1 <0.2.1-0` (verrouillage sur la fenêtre rc ; à réévaluer à partir de 0.2.1). Adaptation limitée aux métadonnées — la surface de consommation est constituée d'appels purs `ctx.get(...)` (avec définitions d'interfaces locales), 0.2.0-rc.1 est totalement compatible avec l'API plugin de 0.1.7, zéro modification de code. La ligne 0.1.x (0.1.5/0.1.7) reste servie par les branches figées `compat/0.1.7` / `compat/0.1.5` (≤1.0.1).
- Arbre de dépendances rafraîchi sur la nouvelle ligne, lockfile régénéré.
- **Alignement au passage de la dérive du manifest** : la version de `dsh.plugin.json` était restée bloquée à 1.0.0 (1.0.1 n'avait modifié que package.json) ; elle est alignée cette fois sur 2.0.0 avec `package.json`, même plage pour les deux engines.

### Documentation (2026-09-29 — sans republication)

- Remise en place de la structure de branches : `main` devient la ligne 0.2.0 (depuis `compat/0.2.0`) ; la ligne d'hôte 0.1.x est servie par les branches figées `compat/0.1.7` / `compat/0.1.5`. Mappage npm inchangé : `dsh-0.2.0` → cette ligne, `dsh-0.1.7` / `dsh-0.1.5` → ligne 0.1.x.
- Installation (cette ligne) : `dsh plugin --profile <profile> add dsh-opensheet-sidebar@dsh-0.2.0`.
- La README s'est dotée d'un aperçu d'installation et de compatibilité en cinq langues (de/fr/ru/es/it).

## 1.0.1 — 2026-09-25

Déduplication du disjoncteur : lorsqu'une dimension est déclenchée, une seule alerte sort. Les alertes dupliquées de la 1.0.0 venaient de ce que le plafond de lignes et le budget d'aperçu émettaient chacun un avertissement `rows`.

> **Trace de publication (2026-09-25)** : npm `dsh-opensheet-sidebar@1.0.1`, dist-tags `latest` + `dsh-0.1.5` ; 49 files / 98.8 kB, shasum du tarball `1862528750612980122ffc3d31f31eb05eb1bf7d`.

### Corrigé

- **Une même dimension ne déclenche plus d'alertes en double** : le plafond de lignes et le budget d'aperçu partagent désormais un même fanion, `finalize()` re-remplit `found`, si bien qu'une seule ligne porte à la fois kept/limit/found au lieu de rendre deux bandeaux quasi identiques. Nouvelle assertion : **exactement un avertissement par cause**.
- **Déclaration du champ `repository`**, pointant vers `drscrewdriver/dsh-opensheet-sidebar`. Les listes de référence ne relient un paquet npm à son dépôt que lorsque le paquet publié renvoie vers le dépôt ; la 1.0.0 n'avait pas ce champ, c'est pourquoi les deux n'étaient pas reliés auparavant.

### Ajouté

- **Jeu de fixtures xlsx réelles** (`scripts/make-xlsx-fixtures.py`, graine aléatoire fixée) : openpyxl produit six vrais classeurs, chacun ne déclenchant qu'un seul chemin du disjoncteur ; `scripts/report-fixtures.mjs` les exécute avec le **lecteur du plugin lui-même** et imprime ce qu'il lit. C'est précisément lui qui a exposé cette alerte dupliquée, et il couvre aussi le chemin des formats de date personnalisés, hors de portée des fixtures zip synthétiques (sortie réelle d'openpyxl → 2026-01-08).

### Tests

- 25 assertions (14 csv + 11 xlsx), code de sortie 0 ; le rapport des fixtures montre exactement un avertissement par fichier.

## 1.0.0 — 2026-09-22

**Changement d'identité du paquet : `dsh-csv-sidebar` → `dsh-opensheet-sidebar`.** Fonctionnellement identique à la 0.3.0, aucun changement de comportement, seule l'identité et le nom affiché changent.

> **Trace de publication (2026-09-22)** : npm `dsh-opensheet-sidebar@1.0.0`, dist-tags `latest` + `dsh-0.1.5` ; 49 files / 97.2 kB, shasum du tarball `88b7fed194c15cd6cd59c1d87e69ae9e8503b5aa`. Après publication, le tarball a été re-téléchargé depuis le registry pour contre-vérification : `lib/client.js` est identique octet par octet au build du dépôt (`43CF34FDCB65…`), l'id de module dans le bundle = `dsh-opensheet-sidebar`. Le profil a migré du pin `github:` vers cette version npm (la spec est posée sur le disque comme valeur exacte `1.0.0`).

Le nom est un jeu de mots : **Open** (ouvrir) ＋ **Open** (standard ouvert) — un seul mot couvre « ouvrir le tableau » et « lire le tableau sans dépendre d'une bibliothèque propriétaire ». Le jeu de mots ne vit que dans le nom ; les champs fonctionnels restent strictement littéraux (`exts` ne reçoit que de vraies extensions).

> Trace du processus de nommage : d'abord retenu le pluriel `opensheets`, corrigé en singulier `opensheet` moins d'une minute avant la publication (un nom propre au singulier fait plus marque, et renforce l'association à la famille OpenDocument). Cette entrée décrit l'identité finale.

### Modifié

- Nom du paquet / nom du dépôt / `dsh.plugin.json#id` / row id+name du `cordis.patch.yml` → `dsh-opensheet-sidebar`. **Ces endroits doivent rester synchronisés** : l'id du module client dérive de `package.json#name`, et le `name:` de la ligne sert au client-modules à repérer le manifeste du paquet ; en manquer un = la ligne hôte est là, la moitié client ne se charge pas en silence (le genre de panne de la 0.1.0).
- Les id à préfixe sont renommés eux aussi : `TAB_ID` / `VIEWER_ID` / `XLSX_VIEWER_ID` / id de la balise de styles / espace de noms locale.
- Nom affiché de l'onglet latéral : `CSV` → `Sheets` (zh : `表格`). Les titres des visionneuses restent descriptifs (`CSV table` / `Spreadsheet table`) — dire de quoi il s'agit selon le type de fichier, plutôt que plaquer un nom de produit.
- Passage en 1.0.0 : pour les consommateurs, c'est une rupture (l'identité du paquet change), pas une version mineure.

### Migration (ancienne identité → nouvelle identité)

1. `dsh plugin --profile <p> add github:drscrewdriver/dsh-opensheet-sidebar#<sha>`
2. `dsh plugin --profile <p> remove dsh-csv-sidebar` — `reconcilePlugins` retire automatiquement l'ancien nom du `dsh.profile.bundles`
3. Remplacer dans le `cordis.patch.yml` du profil la ligne `- id: dsh-csv-sidebar` par le nouvel id (un patch visant un id inexistant est un no-op silencieux ; le laisser n'induirait en erreur que ceux qui passeront après)
4. Redémarrer l'hôte une fois

> Effet de bord : l'interrupteur activer/désactiver de better-sidebar est indexé par `tabsEnabled[<id>]` ; l'id changeant, les interrupteurs antérieurs de l'utilisateur retournent aux valeurs par défaut. L'ancien dépôt `drscrewdriver/dsh-csv-sidebar` est conservé mais n'est plus référencé.

## 0.3.0 — 2026-09-22

Prise en charge xlsx (avec **changement de feuille**). Zéro dépendance : la décompression zip passe par le `DecompressionStream('deflate-raw')` natif du navigateur, et le XML est traité par balayage ciblé plutôt qu'un parseur universel.

### Ajouté

- **Visionneuse de classeurs** : les `.xlsx` / `.xlsm` s'ouvrent en tableau, une rangée d'onglets de feuilles en haut permet de naviguer ; les feuilles masquées (`state="hidden"`) sont estompées dans les onglets, la première feuille visible s'ouvre automatiquement par défaut.
- **Lecteur xlsx** (`src/client/xlsx.ts`) : analyse du répertoire central du zip (gestion correcte du cas data-descriptor, la taille n'est crue qu'au répertoire central) → liste des feuilles de `xl/workbook.xml` → `_rels` rId→part → `sharedStrings.xml` (concaténation des runs de texte enrichi) → `styles.xml` (`cellXfs` → numFmtId → reconnaissance des dates) → décompression à la demande d'un seul `worksheets/sheetN.xml`.
- **Traitement des cellules** : chaînes partagées / chaînes en ligne / valeurs en cache de formules (`t="str"`) / booléens / erreurs / nombres ; les **trous de colonnes** sont restitués via `r="C3"` (une colonne absente ne décale pas la suivante) ; numéros de série des dates convertis en dates lisibles selon les ères 1900/1904.
- **Deux barrières de conteneur** (la barrière de taille antérieure valait pour zip une absence de protection) :
  - le **volume décompressé déclaré** est vérifié avant toute opération de décompression (l'en-tête zip est falsifiable, d'où ce refus déterministe en amont) ;
  - le **budget d'octets de décompression en flux** sert de filet, compté en décompressant, `cancel()` dès le dépassement.
  Si une seule feuille dépasse la limite, elle seule est bloquée ; les feuilles sœurs restent lisibles.
- Nouveaux libellés d'avertissement `inflated-bytes` / `sheet-bytes` / `container-error` (zh/en).
- **Tests** : `tests/xlsx.test.mjs` construit sur place de vraies fixtures zip (avec CRC32 et un répertoire central correct) — liste des feuilles et marqueurs de masquage, chaînes partagées, cellules de date, trous de colonnes, changement de feuille, bombe zip à taille falsifiée, entrée non zip ; 11 assertions, code de sortie 0/1.

### Corrigé

- **Les placeholders des avertissements ne s'affichent plus à nu** : à l'épuisement du budget d'aperçu (ligne 201), l'avertissement était généré sans que `found` soit connu, et l'interface affichait directement `共至少 {found} 行`. Désormais `finalize()` re-remplit le nombre de lignes réellement comptées.
- Nouvelle **garde d'intégrité des placeholders** (une par suite de tests) : parcourt les avertissements réellement produits de chaque dimension et vérifie que chaque `{name}` des modèles zh/en se retrouve dans le detail, sinon rouge. Ce genre de bug ne se découvrira plus à l'œil nu.

### Modifié

- Deux seuils supplémentaires dans la configuration du disjoncteur : `maxInflatedBytes` (64 MB par défaut), `maxSheetBytes` (32 MB par défaut).
- Barre d'état : un classeur affiche l'étiquette du nom de feuille, sans plus se tromper en montrant « séparateur ».
- La visionneuse xlsx passe par `fetchStrategy: 'custom'` + la route `/sidebar/file` de l'hôte pour obtenir les octets bruts (`fsRead` ne renvoie que `head` pour du binaire, inutilisable pour l'analyse) ; la clôture de chemins de l'espace de travail reste côté hôte.

### Non pris en charge (pour l'instant)

- `.xls` (Excel 97-2003 BIFF8) et anciens formats WPS `.et` / `.wps` / `.dps` : tous des documents composés OLE2, coûteux à couvrir en zéro dépendance (il faudrait écrire soi-même l'analyse CFB + BIFF). Les couvrir revient à introduire SheetJS (~1 MB, dont la version npm n'est plus maintenue), en contradiction avec le principe du zéro dépendance — à évaluer séparément.

## 0.2.0 — 2026-09-22

Réécriture au format standard. La moitié client de la 0.1.0 ne respectait pas le contrat des modules client de DSH : une fois installée dans un profil, elle **n'était pas chargée** (aucune erreur, aucune entrée) ; cette version refait la couche d'intégration selon le standard plugin-framework.

### Corrigé (couche d'intégration — toutes les causes racines du « non affichage »)

- L'artefact client devient une closure CJS `window.__ModuleLoader__.load({ id, factory })` dont la fabrique exporte `apply` + `inject` (auparavant module ES + `activate()`, la table de modules jetait le tout).
- Le point d'extension d'enregistrement passe de `ctx.sessionProjections` à `ctx.betterSidebar.registerFileViewer / registerTab` (le premier est le registre de projections côté hôte, pas l'interface UI de la barre latérale).
- Ajout de l'`inject` déclaratif `['betterSidebar', 'locale']` : apply n'attend que la disponibilité des deux services cordis, l'ordre d'enregistrement n'influe plus sur le résultat.
- Toute installation passe par `ctx.effect(fn, label)` ; en HMR / désactivation, le disposer récupère (balise de styles, dictionnaires, deux descripteurs).
- Complément de métadonnées : `package.json#dsh.bundle.patch` + `dsh.client.platform/inject`, manifestes `exports` / `files`, `screenshots.json`, `assets/`, `tsconfig*.json`.
- Plafond peer unifié à `<0.2.0-0`, pour esquiver la trappe de comparaison semver des préreleases ; `dsh-better-sidebar` / `react` marqués optional.

### Ajouté

- **Point d'extension visionneuse de fichiers** : `.csv/.tsv/.psv` (priority 50, `fetchStrategy: 'fsRead'`) entrent dans la liste « aperçu de fichiers » du GUI, activables/désactivables dans les réglages de la carte Side ; l'hôte lit, la clôture de chemins reste côté hôte.
- **Garde de chargement au build** : charge réellement l'artefact via `node:vm` + stub `window.__ModuleLoader__`, vérifie `id`, les `apply`/`inject` de `factory()`, et refuse toute demande de module intégré Node.
- **12 assertions cœur** (`npm test`, code de sortie 0/1) : citations et échappements RFC 4180, détection du séparateur, disjoncteur à quatre dimensions, marque de troncature hôte, lignes vides et document vide.
- Espace de noms i18n propre `dsh-csv-sidebar` (zh/en), repli sur le dictionnaire anglais intégré si `locale` est absent.
- Styles à tokens sémantiques `--dsw-alias-*` (fini la dépendance à des variables inexistantes comme `--border-color`).

### Modifié

- **Zéro dépendance à l'exécution** : PapaParse retiré, remplacé par un scanner local conscient des guillemets (RFC 4180, champs multi-lignes pris en charge) ; le bundle n'externalise que React (43 KB).
- Build migré de Vite vers esbuild double entrée (`lib/index.mjs` + `lib/client.js`), avec déclarations de types tsc en plus.
- Sémantique du disjoncteur resserrée : à l'épuisement du budget `previewRows`, **élévation explicite en avertissement `rows`** (plus de silence sur les 200 premières lignes) ; les deux branches `OK` de `finalize()` fusionnées.
- Sources déplacées dans `src/client/` selon la structure standard ; la moitié hôte devient `src/index.ts`.

### Retiré

- `vite.config.ts`, la dépendance `papaparse`, les anciens composants à plat `src/*.tsx`, et la mauvaise écriture du champ `main` pointant vers `./lib/client.js`.

## 0.1.0 — 2026-09-22

Premier prototype : le `demo.html` de `npm run dev` a validé le rendu des interactions tabulaires et du disjoncteur à quatre dimensions, avant d'être emballé en plugin. **L'emballage plugin de cette version ne se charge pas dans DSH** (voir Corrigé de la 0.2.0).
