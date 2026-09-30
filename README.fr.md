# dsh-opensheet-sidebar

[简体中文](README.md) | [Français](README.fr.md) | [Deutsch](README.de.md) | [Italiano](README.it.md) | [Русский](README.ru.md) | [Español](README.es.md)

Plugin d'aperçu tabulaire pour la barre latérale droite (consommateur de [dsh-better-sidebar](https://github.com/omdsh-dev/DSH-better-sidebar)) : les fichiers `csv` / `tsv` / `psv` comme `xlsx` / `xlsm` s'ouvrent sous forme de tableaux structurés, avec une **protection par disjoncteur** — aucun fichier d'entrée ne peut bloquer la barre latérale.

> **Le nom est un jeu de mots, consigné ici pour éviter qu'on le prenne pour une coquille** : `OpenSheet` se lit à la fois « **ouvrir** la feuille » (open the sheet, verbe) et « feuille au **standard ouvert** » (open-standard sheet — la famille des formats de tableaux open source issue d'OpenDocument). Un seul mot résume ses deux fonctions : ouvrir, et lire d'une manière qui ne dépend d'aucune bibliothèque propriétaire.
>
> Limite : le jeu de mots ne vit que dans le **nom**. Les champs fonctionnels restent strictement littéraux — `exts` ne reçoit que de vraies extensions (`csv`/`tsv`/`psv`/`xlsx`/`xlsm`), et les champs de protocole n'embarquent aucun nom de marque.

> **v0.2.0 est une réécriture du mode d'intégration** : la moitié client de v0.1.0 (alors nommée `dsh-csv-sidebar`) ne respectait pas le contrat de module client de DSH (module ES + `activate()` + `ctx.sessionProjections`) et **ne s'affichait donc pas** une fois installée. La 0.2.0 refait l'intégration selon le standard plugin-framework — voir ci-dessous « Pourquoi v0.1.0 ne s'affiche pas ».

---

## 1. Ce que fait le plugin

| Point d'extension | Contenu enregistré | Ce que voit l'utilisateur |
|------|---------|-------------|
| **Aperçu de fichiers** `registerFileViewer` | `exts: ['csv','tsv','psv']`, `priority: 50`, `fetchStrategy: 'fsRead'` | On ouvre un `.csv` dans l'explorateur → directement un **tableau**, pas du texte brut ; activable/désactivable dans les réglages de la carte Side, la désactivation ramène à la visionneuse de texte intégrée |
| **Onglet manuel** `registerTab` | `order: 70`, `single: true` | La page **CSV** du menu `+` : glisser-déposer ou sélection d'un fichier local ; la **taille réelle en octets est alors connue**, et les fichiers trop volumineux sont refusés avant toute lecture |

Les deux partagent le même corps de rendu (bandeau d'avertissements → barre de statistiques → tableau → actions en bas de page) ; seule l'origine du texte diffère.

**Interactions** (alignées sur « les données structurées ne doivent pas être dégradées en texte pur ») : tri par clic sur l'en-tête (croissant → décroissant → annulation), filtrage par sous-chaîne, alignement à droite des colonnes numériques (déduit d'un échantillon), détection du type de colonne (number / date / boolean / text), en-tête et colonne de numéros de ligne figés (sticky), statistiques des valeurs vides et des valeurs uniques.

---

## 2. Le disjoncteur à quatre dimensions

| Dimension | Limite par défaut | Comportement en cas de dépassement |
|------|---------|-------------|
| Taille du fichier | 5 MB | **BLOCKED** — pour un fichier local, `file.text()` n'est même pas appelé ; le texte lu par l'hôte est refusé d'emblée |
| Nombre de lignes de données | 10 000 | **TRUNCATED** — la lecture s'arrête **au** plafond, sans analyse complète |
| Nombre de colonnes | 100 | les colonnes excédentaires sont abandonnées + avertissement |
| Texte d'une cellule | 10 KB | la cellule est abrégée en `前200字符… (+N chars)` + avertissement |

S'y ajoute `previewRows: 200` : le tableau réserve son budget DOM aux 200 premières lignes seulement. À l'arrivée de la 201ᵉ ligne, **pas de silence** — élévation en avertissement `rows` et passage à `TRUNCATED`.

> Le résultat du disjoncteur est un citoyen de première classe, pas une page d'erreur : chaque bandeau indique **quelle limite a été déclenchée, quelle est la valeur mesurée, quelle est la limite**, et le tableau continue de s'afficher normalement (en cas de BLOCKED, une explication claire du blocage est présentée). Les quatre états `OK / TRUNCATED / BLOCKED` + `READING` sont tous des résultats affichables ; jamais d'exception levée, jamais de roulette infinie.

---

## 3. Conformité au format standard (plugin-framework)

| Exigence du standard | Ce plugin |
|---------|--------|
| Structure en deux moitiés | `src/index.ts` (moitié hôte, apply vide) + `src/client/index.tsx` (moitié navigateur) |
| Contrat de module client | le bundle produit est une closure CJS `window.__ModuleLoader__.load({ id, factory })` exportant `apply` + `inject` ; **au build, un vrai chargement via `node:vm` vérifie les exports** |
| Injection déclarative `inject` | `export const inject = ['betterSidebar', 'locale']` — apply ne s'exécute qu'une fois les deux services cordis prêts ; l'ordre d'enregistrement est indifférent |
| Cycle de vie | toute installation passe par `ctx.effect(fn, label)` ; en HMR ou à la désactivation, le disposer renvoyé fait le ménage |
| Sièges de réglages / commandes | ce plugin n'enregistre ni siège de réglages ni commande `/` (donc ni seat-pin ni contrat de fonction description) |
| Manifeste `dsh.bundle` | `package.json#dsh.bundle.patch` + `dsh.client.platform/inject` |
| `cordis.patch.yml` | une pure ligne insert, avec un commentaire décrivant l'installation par CLI / manuelle |
| peerDependencies | `@deepseek-ai/*` en `>=0.2.0-rc.1 <0.2.1-0` (plafond `-0` pour éviter le piège semver des préreleases) ; `dsh-better-sidebar` / `react` marqués optional — ligne 0.2.0 |
| Arborescence | `src/ lib/ assets/ tests/ scripts/` + `screenshots.json` + `dsh.plugin.json` + README/CHANGELOG |
| Zéro dépendance | **aucune dépendance à l'exécution** : l'analyseur CSV et le disjoncteur sont des modules locaux ; le bundle client n'externalise que React (43 KB) |
| Styles | pas de point d'entrée CSS → `styles.css` est inliné en chaîne par le build ; `apply` insère une balise `<style>` et enregistre un disposer ; les couleurs utilisent exclusivement les tokens sémantiques `--dsw-alias-*` |
| Multilingue | espace de noms propre `dsh-opensheet-sidebar`, dictionnaires zh/en enregistrés via `locale.register(NS, tag, dict)` ; service absent → repli sur le dictionnaire anglais intégré ; clé absente → c'est la clé elle-même qui est rendue (visible plutôt que vide) |
| Discipline des dépendances souples | aucun import de valeur/type de `dsh-better-sidebar` (`seams.ts` ne fait que des déclarations structurelles) ; si `betterSidebar` est absent, **warn bruyant et maintien en veilleuse** — pas un demi-panneau enregistré |

---

## 4. Pourquoi v0.1.0 ne s'affichait pas (cause racine)

Après installation de v0.1.0 dans un profil, `cordis.patch.yml` était bien enregistré et `node_modules` était là, mais la barre latérale restait inerte, **sans aucune erreur en console** — car le module était écarté dès la phase de chargement des modules clients :

| # | Écriture de v0.1.0 | Contrat standard | Conséquence |
|---|--------------|---------|------|
| 1 | `lib/client.js` est un **module ES** (`export function activate`) | closure CJS via `window.__ModuleLoader__.load({ id, factory })` | la table de modules n'obtient aucun export → **paquet entier non chargé, en silence** |
| 2 | le point d'entrée exporte `activate(ctx)` | exporter **`apply(ctx)`** | même chargé, aucun point d'entrée retrouvé |
| 3 | pas de `inject` | `export const inject = [...]` | cordis n'attend pas `betterSidebar` ; moment d'enregistrement aléatoire |
| 4 | enregistrement via `ctx.sessionProjections.register({key,badge,component})` | `ctx.betterSidebar.registerTab / registerFileViewer` | **mauvais point d'extension** : `sessionProjections` est le registre de projections côté hôte, pas l'interface UI de la barre latérale |
| 5 | pas de `ctx.effect` ; `package.json` sans `dsh.bundle` / `dsh.client` / `exports` / `files` ; plafond peer écrit `>=0.1.5-rc.1` (sans borne haute) | voir tableau ci-dessus | pas de récupération HMR ; métadonnées incomplètes |

> En une phrase : **ce n'est pas « inactif », c'est « jamais chargé »**. Cela explique aussi pourquoi aucune entrée n'apparaît dans le système d'« aperçu de fichiers » — cette liste est précisément le registre de `registerFileViewer`.

---

## 5. Build et vérification

```bash
npm run build     # esbuild double entrée + déclarations de types tsc ; au build, le bundle est réellement chargé une fois et ses apply/inject sont vérifiés
npm test          # 25 assertions : 14 csv (analyse/guillemets/séparateur/disjoncteur 4D/intégrité des placeholders/déduplication des avertissements) + 11 xlsx (zip/XML/feuilles/deux barrières de conteneur)
npm run verify    # build && test
```

Sortie réelle de `npm test` (2026-09-22) :

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

Le garde-fou de build (`scripts/build.mjs`), après écriture de l'artefact : il exécute réellement le bundle avec `node:vm` et un stub `window.__ModuleLoader__`, vérifie que `load()` est appelé, que `id` vaut le nom du paquet et que `factory()` renvoie un objet doté de `apply` et `inject` ; il refuse en outre toute demande de module intégré Node. **Un bundle non chargeable passe au rouge dès le build et n'entre jamais malade chez l'hôte.**

---

### 5.1 Fixtures xlsx et autocontrôle (`demo/xlsx/`)

Les fixtures sont générées par script, aucun binaire n'est committé : graine aléatoire fixée, octets stables, et **chaque fichier ne sert qu'à déclencher un seul chemin**.

```bash
python scripts/make-xlsx-fixtures.py --out ../demo/xlsx   # requiert openpyxl (dev uniquement)
node scripts/report-fixtures.mjs ../demo/xlsx             # exécute le lecteur du plugin lui-même et imprime ce qu'il voit
```

| Fichier | Taille | Déclenche |
|------|------|------|
| `basic-3sheets.xlsx` | 8 KB | 3 feuilles (dont une masquée) · vrais formats de date · booléens · trous de colonnes · formules sans valeur en cache |
| `wide-150cols.xlsx` | 15 KB | plafond de colonnes (150 > 100) → `cols` |
| `long-12000rows.xlsx` | 286 KB | plafond de lignes + budget d'aperçu → `rows` (**une seule**, avec found/kept/limit) |
| `long-cell-20k.xlsx` | 5 KB | plafond de cellule (20 000 > 10 240) → `cell-length` |
| `deep-sheet-60k.xlsx` | 1.7 MB | **archive petite, 56.7 MB une fois décompressés** → `sheet-bytes` (refusé avant toute décompression) |
| `big-archive.xlsx` | 8.5 MB | l'archive elle-même dépasse 5 MB → `file-size` (BLOCKED) |

La sortie de `report-fixtures.mjs` est la preuve que « chaque fixture joue bien son rôle » ; elle s'exécute sur des fichiers produits par un vrai générateur Excel (openpyxl) et couvre donc aussi le chemin des formats de date personnalisés, inaccessible aux fixtures synthétiques (`2026-01-08` plutôt que le numéro de série `46030`).

## 6. Installation

**Méthode A (recommandée) : CLI officielle** — elle maintient proprement les dépendances et `dsh.profile.bundles` ensemble

```bash
dsh plugin --profile <profile> add <path-to-plugin>
```

**Méthode B : manuelle (trois étapes, toutes indispensables)**

```bash
# 1) Copier ce paquet
#    → ~/.dsh/profiles/<profile>/node_modules/dsh-opensheet-sidebar
# 2) Ajouter "dsh-opensheet-sidebar" au tableau dsh.profile.bundles du package.json du profil
# 3) Ajouter la ligne insert du cordis.patch.yml de ce paquet au cordis.patch.yml du profil
```

> ⚠️ **L'étape 2 est la plus facile à oublier, et son oubli est totalement silencieux.** La couche bundle n'est synthétisée que si le
> `dsh.profile.bundles` du profil mentionne ce paquet ; se limiter aux étapes 1 et 3 donne : le paquet est en place,
> `- id: dsh-opensheet-sidebar` figure bien dans `cordis.patch.yml`, mais cette ligne **n'a aucune ligne cible sur laquelle agir** —
> le plugin ne se charge pas et la console ne dit rien. Le `disabled: false` de l'étape 3 se contente d'« activer explicitement une ligne déjà insérée »,
> il n'insère lui-même aucune ligne.

**Après l'installation, vérifier avant de redémarrer** (aucun service n'est démarré) :

```bash
dsh --profile <profile> --dump-config | Select-String dsh-opensheet-sidebar
# Sortie attendue :
#   # == dsh-opensheet-sidebar, patched by ...\cordis.patch.yml
#   - id: dsh-opensheet-sidebar
#     name: dsh-opensheet-sidebar
#     disabled: false
```

Voir ces trois lignes = ligne insérée + patch de profil actif ; il suffit alors de **redémarrer DSH** (le bundle de profil et la table de modules clients sont synthétisés au démarrage ; rafraîchir la page ne suffit pas).
Ne rien voir = l'étape 2 n'a pas pris effet.

**Dépendance** : `dsh-better-sidebar >= 0.18.1` (optionnelle). En son absence, le plugin se charge normalement, émet un warn en console et ne contribue aucune entrée.

---

## 7. Matrice de compatibilité des versions

| Version du plugin | DSH | Notes |
|---------|-----|------|
| 2.0.0 | `>=0.2.0-rc.1 <0.2.1-0` | Ligne d'hôte 0.2.0 (`main`, promue depuis `compat/0.2.0`). Adaptation limitée aux métadonnées : la surface de consommation est constituée d'appels purs `ctx.get(...)`, 0.2.0-rc.1 préserve l'API plugin de 0.1.7 ; aligne au passage la version dérivante du manifest |
| 1.0.0 / 1.0.1 | `>=0.1.5-rc.1 <0.2.0-0` | Renommage de l'identité du paquet (csv → opensheet) + déduplication du disjoncteur ; assurée par les branches figées `compat/0.1.7` / `compat/0.1.5` |
| 0.3.0 | `>=0.1.5-rc.1 <0.2.0-0` | aperçu des classeurs xlsx/xlsm (changement de feuille) + deux barrières de conteneur zip + garde d'intégrité des placeholders |
| 0.2.0 | `>=0.1.5-rc.1 <0.2.0-0` | réécriture au format standard : `__ModuleLoader__` + `apply/inject/effect` + double point d'extension better-sidebar |
| 0.1.0 | — | mode d'intégration hors contrat, **ne se charge pas**, abandonné |

## 8. Limites connues

- Pas de défilement virtuel pour le tableau : le budget DOM est strictement contrôlé par `previewRows` ; si le volume grandit, cela se traduit seulement par « une troncature plus précoce », jamais par un ralentissement.
- Le `fsRead` de l'hôte tronque de lui-même les gros fichiers ; la barre de statistiques affiche alors `≈` et l'étiquette « lecture tronquée par l'hôte », avec `state = TRUNCATED` — **jamais présenté à tort comme un fichier complet**.
- Aperçu seul, aucune écriture en retour : ni édition ni enregistrement.

## 9. Prise en charge xlsx (avec changement de feuille)

Les `.xlsx` / `.xlsm` s'ouvrent avec le même rendu tabulaire ; une rangée d'**onglets de feuilles** en haut permet de naviguer ; les feuilles masquées (`state="hidden"`) sont estompées dans les onglets, et la première feuille visible s'ouvre automatiquement par défaut. Zéro dépendance à l'exécution.

### 9.1 Le point d'extension : pourquoi un autre chemin de lecture s'imposait

Un classeur est binaire, alors que `fetchStrategy: 'fsRead'` ne renvoie pour du binaire que `{kind:'binary', size, truncated, head}` — **pas de content**, donc rien à donner à l'analyseur. C'est pourquoi xlsx est un aperçu **enregistré séparément** :

```
fetchStrategy: 'custom'
load: fetch(`/sidebar/file?sessionId=..&cwd=..&path=..`) → arrayBuffer → Uint8Array
```

On passe par la route des octets bruts de l'hôte lui-même ; la clôture de chemins de l'espace de travail reste donc côté hôte (nous ne lisons pas les fichiers nous-mêmes). Le chemin `fsRead` des CSV reste inchangé.

### 9.2 Pipeline d'analyse (`src/client/xlsx.ts`)

```
répertoire central du zip → xl/workbook.xml (liste des feuilles / ordre / masquage)
             → xl/_rels/workbook.xml.rels (rId → part)
             → xl/sharedStrings.xml (concaténation des runs de texte enrichi)
             → xl/styles.xml (cellXfs → numFmtId → date ou non)
             → xl/worksheets/sheetN.xml (on ne décompresse que la feuille demandée)
```

Couverture des cellules : chaînes partagées / chaînes en ligne / valeurs en cache de formules (`t="str"`) / booléens / erreurs / nombres ; les **trous de colonnes** sont restitués grâce à `r="C3"` (une colonne absente ne décale pas la suivante) ; les numéros de série des dates sont convertis en dates lisibles selon les ères 1900 et 1904.

La décompression utilise le `DecompressionStream('deflate-raw')` natif du navigateur ; le XML est traité par balayage ciblé — le XML du xlsx est une structure régulière générée par machine, un parseur universel serait du gaspillage.

### 9.3 Deux barrières de conteneur (pour un zip, une simple barrière de taille ne protège de rien)

| Barrière | Moment | Défaut | Rôle |
|------|------|------|------|
| **Volume décompressé déclaré** | **avant** toute opération de décompression, en lisant le répertoire central | 32 MB par part | l'en-tête zip est falsifiable, d'où ce refus déterministe en amont |
| **Budget d'octets en flux** | cumulé pendant la décompression | 64 MB au total | filet de sécurité quand l'en-tête a menti ; au dépassement, `cancel()` immédiat |

Si une feuille dépasse seule la limite, **elle seule est bloquée** ; les feuilles sœurs s'ouvrent normalement. Conteneur illisible (non zip / part manquante) → `container-error`, rendu sous forme de carte d'erreur lisible plutôt qu'une exception levée.

### 9.4 Pas encore pris en charge

Les `.xls` (Excel 97-2003 BIFF8) et les anciens formats WPS `.et` / `.wps` / `.dps` : tous des documents composés OLE2 ; le zéro dépendance exigerait d'écrire soi-même l'analyse CFB (FAT/répertoire) + BIFF, ce qui coûte cher et est source d'erreurs. Couvrir ces formats revient généralement à introduire SheetJS (~1 MB, dont la version npm n'est plus maintenue et dont les nouvelles versions ne sortent que sur le CDN officiel), en contradiction avec le principe du zéro dépendance — à évaluer séparément le moment venu.

> À ne pas confondre : **le `.xlsx` enregistré par défaut par WPS tableur est un xlsx standard**, directement pris en charge par ce plugin ; seuls les `.et` issus d'un « Enregistrer sous → ancien format WPS » relèvent du non pris en charge.

## 10. Publication et migration d'identité (exemples de scripts)

Deux scripts, chacun sa moitié : la **publication** sur la machine de développement, la **migration** sur le profil où le plugin est installé. Tous deux acceptent `-DryRun` (le seul mode ré-exécutable à volonté), et tous deux s'arrêtent au premier échec — jamais de « publication forcée ».

```powershell
# ① Côté publication : build + tests + gardes d'identité + manifeste d'empaquetage, et seulement ensuite la vraie publication (--access public, registry officiel)
pwsh -File scripts/publish-npm.ps1 -DryRun                # d'abord regarder
pwsh -File scripts/publish-npm.ps1                        # ensuite publier
pwsh -File scripts/publish-npm.ps1 -DeprecateOld dsh-csv-sidebar   # optionnel : déprécier l'ancien nom

# ② Côté consommation : installer la nouvelle identité → retirer l'ancienne → changer l'id de la ligne de patch du profil → vérifier point par point
#    -NewSpec doit être une spec « réellement résoluble aujourd'hui » — le script prévérifie avant de modifier quoi que ce soit.
#    Ce paquet n'existe pour l'instant que sur GitHub (pas encore sur npm), d'où la forme github: :
pwsh -File scripts/migrate-profile.ps1 -Profile web -NewSpec 'github:drscrewdriver/dsh-opensheet-sidebar#<sha>' -DryRun
pwsh -File scripts/migrate-profile.ps1 -Profile web -NewSpec 'github:drscrewdriver/dsh-opensheet-sidebar#<sha>'
#    Une fois la publication sur npm effectuée, basculer vers la forme registry (d'ici là, cette ligne serait bloquée par la prévérification) :
#    pwsh -File scripts/migrate-profile.ps1 -Profile web -NewSpec 'dsh-opensheet-sidebar@1.0.0'
```

**Prévérification (preflight)** : `-NewSpec` est d'abord résolue avant toute action — forme npm via `npm view <name>[@range]`, forme `github:` via `git ls-remote` (un SHA de 40 caractères ne se recherche pas par nom ; on vérifie donc l'accessibilité du dépôt, le SHA lui-même étant validé par l'étape d'installation), forme locale en lisant le `package.json`. Si la résolution échoue, arrêt immédiat avant la sauvegarde, code de sortie 1 — pour éviter qu'un exemple « qui a l'air de marcher » n'échoue à mi-parcours.

On peut aussi passer par les alias npm script :

```powershell
npm run publish:npm -- -DryRun
npm run profile:migrate -- -Profile web -NewSpec 'dsh-opensheet-sidebar@1.0.0' -DryRun
```

### 10.1 Pourquoi l'ordre est « installer le nouveau d'abord, retirer l'ancien ensuite »

Le renommage touche quatre endroits à la fois, et **en manquer un seul est un échec silencieux** (pas une erreur) : la spec de dépendance du profil, `dsh.profile.bundles` (tenu à jour par le reconcile du CLI, à ne pas éditer à la main), le row id du `cordis.patch.yml` du profil (un patch visant un id inexistant est un no-op), et le répertoire dans `node_modules`.

Installer le nouveau puis retirer l'ancien fait qu'après l'échec de n'importe quelle étape, il reste un **plugin utilisable**, pas un profil vide. Les deux appels pnpm sont automatiquement retentés une fois — quand l'hôte tourne, `node_modules` est occupé et le premier essai peut lever `ERR_PNPM_PACKAGE_MANAGER_REMOVE_MODULES_DIR`.

### 10.2 Trois pièges PowerShell 5.1 dans les scripts (une demi-heure gagnée à la réutilisation)

| Piège | Symptôme | Parade |
|----|------|------|
| Commande native + redirection `2>` + `$ErrorActionPreference='Stop'` | les avertissements stderr de npm sont promus **erreurs terminales**, et le script meurt sans raison apparente à l'étape 2 | assouplir temporairement en `Continue` avant l'appel, fusionner les flux avec `2>&1 \| Out-String`, puis lire `$LASTEXITCODE` |
| `$PSScriptRoot` en valeur par défaut de `param()` | encore une chaîne vide au moment de l'évaluation → échec de validation de paramètre dans `Split-Path` | mettre `''` par défaut et résoudre dans le corps du script |
| `.Count` sur un résultat de `Where-Object` | 1 résultat est une string (sans `.Count`), 0 résultat est `$null` — sous `Set-StrictMode`, `PropertyNotFound` immédiat | envelopper systématiquement dans `@(...)` avant de lire `.Count` |

Le script de publication embarque en outre deux **gardes qui devraient exister avant comme après l'upload** : le nom doit être « libre ou à soi » (`npm view` + `maintainers` comparés à `npm whoami`, pour ne pas retomber sur un nom occupé par autrui), et sans session connectée, refus immédiat (plutôt que d'attendre un 401).

## 11. Notes multilingues / Sprachen / Langues / Языки / Idiomas / Lingue

Cette README est rédigée en français. Aperçu rapide d'installation et de compatibilité (cette ligne requiert DSH 0.2.0 : `>=0.2.0-rc.1 <0.2.1-0` ; installation : `dsh plugin --profile <profile> add dsh-opensheet-sidebar@dsh-0.2.0`) :

- **Deutsch** — benötigt DSH 0.2.0 (`>=0.2.0-rc.1 <0.2.1-0`), getestet gegen DSH 0.2.0-rc.1. Installation: `dsh plugin --profile <profile> add dsh-opensheet-sidebar@dsh-0.2.0`. Die 0.1.x-Wirtslinie wird von den eingefrorenen Zweigen `compat/0.1.7` / `compat/0.1.5` (npm-Tags `dsh-0.1.7` / `dsh-0.1.5`) versorgt.
- **Français** — nécessite DSH 0.2.0 (`>=0.2.0-rc.1 <0.2.1-0`), testé avec DSH 0.2.0-rc.1. Installation : `dsh plugin --profile <profile> add dsh-opensheet-sidebar@dsh-0.2.0`. La lignée d'hôtes 0.1.x est assurée par les branches figées `compat/0.1.7` / `compat/0.1.5` (tags npm `dsh-0.1.7` / `dsh-0.1.5`).
- **Русский** — требуется DSH 0.2.0 (`>=0.2.0-rc.1 <0.2.1-0`), протестировано на DSH 0.2.0-rc.1. Установка: `dsh plugin --profile <profile> add dsh-opensheet-sidebar@dsh-0.2.0`. Линия хостов 0.1.x обслуживается замороженными ветками `compat/0.1.7` / `compat/0.1.5` (npm-теги `dsh-0.1.7` / `dsh-0.1.5`).
- **Español** — requiere DSH 0.2.0 (`>=0.2.0-rc.1 <0.2.1-0`), probado con DSH 0.2.0-rc.1. Instalación: `dsh plugin --profile <profile> add dsh-opensheet-sidebar@dsh-0.2.0`. La línea de anfitriones 0.1.x la atienden las ramas congeladas `compat/0.1.7` / `compat/0.1.5` (etiquetas npm `dsh-0.1.7` / `dsh-0.1.5`).
- **Italiano** — richiede DSH 0.2.0 (`>=0.2.0-rc.1 <0.2.1-0`), testato su DSH 0.2.0-rc.1. Installazione: `dsh plugin --profile <profile> add dsh-opensheet-sidebar@dsh-0.2.0`. La linea di host 0.1.x è servita dai rami congelati `compat/0.1.7` / `compat/0.1.5` (tag npm `dsh-0.1.7` / `dsh-0.1.5`).
