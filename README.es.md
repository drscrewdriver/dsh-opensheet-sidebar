# dsh-opensheet-sidebar

[简体中文](README.md) | [Français](README.fr.md) | [Deutsch](README.de.md) | [Italiano](README.it.md) | [Русский](README.ru.md) | [Español](README.es.md)

Plugin de vista previa tabular para la barra lateral derecha (consumidor de [dsh-better-sidebar](https://github.com/omdsh-dev/DSH-better-sidebar)): los archivos `csv` / `tsv` / `psv` y también `xlsx` / `xlsm` se abren como tablas estructuradas, con **protección de interruptor (circuit breaker)** — ninguna entrada puede dejar atascada la barra lateral.

> **El nombre es un juego de palabras, anotado aquí para que no lo tomen por una errata**: `OpenSheet` se lee a la vez como «**abrir** la hoja» (open the sheet, verbo) y como «hoja de **estándar abierto**» (open-standard sheet — la familia de formatos tabulares de código abierto emparentada con OpenDocument). Una sola palabra dice las dos cosas que hace: abrir, y leer de una manera que no depende de bibliotecas propietarias.
>
> Límite: el juego de palabras vive solo en el **nombre**. Los campos funcionales se mantienen estrictamente literales — `exts` solo recibe extensiones reales (`csv`/`tsv`/`psv`/`xlsx`/`xlsm`), y los campos de protocolo no llevan marcas.

> **v0.2.0 es una reescritura del modo de integración**: la mitad cliente de v0.1.0 (entonces llamada `dsh-csv-sidebar`) no cumplía el contrato de módulos cliente de DSH (módulo ES + `activate()` + `ctx.sessionProjections`), y por eso **no se mostraba** una vez instalada. La 0.2.0 rehace la integración según el estándar plugin-framework; ver abajo «Por qué v0.1.0 no se mostraba».

---

## 1. Qué hace

| Punto de acople | Contenido registrado | Qué ve el usuario |
|------|---------|-------------|
| **Visor de archivos** `registerFileViewer` | `exts: ['csv','tsv','psv']`, `priority: 50`, `fetchStrategy: 'fsRead'` | Se abre un `.csv` en el explorador → directamente una **tabla**, no texto crudo; se activa/desactiva en los ajustes de la tarjeta Side, al desactivarlo vuelve el visor de texto integrado |
| **Pestaña manual** `registerTab` | `order: 70`, `single: true` | La página **CSV** del menú `+`: arrastrar o elegir un archivo local; en ese momento **se conocen los bytes reales** y los archivos demasiado grandes se rechazan antes de leerlos |

Ambos comparten el mismo cuerpo de renderizado (banda de avisos → barra de estadísticas → tabla → acciones al pie); la única diferencia es de dónde viene el texto.

**Capacidades interactivas** (alineadas con «los datos estructurados no deben degradarse a texto puro»): ordenar con clic en el encabezado (ascendente → descendente → cancelar), filtro por subcadena, alineación a la derecha de las columnas numéricas (inferida por muestreo), reconocimiento del tipo de columna (number / date / boolean / text), encabezado y columna de números de fila fijos (sticky), estadísticas de valores vacíos y valores únicos.

---

## 2. El interruptor de cuatro dimensiones

| Dimensión | Límite por defecto | Comportamiento al superarlo |
|------|---------|-------------|
| Tamaño del archivo | 5 MB | **BLOCKED** — en un archivo local ni siquiera se llama a `file.text()`; el texto leído por el host se rechaza de entrada |
| Filas de datos | 10 000 | **TRUNCATED** — la lectura se detiene **en** el tope, sin análisis completo |
| Número de columnas | 100 | las columnas sobrantes se descartan + aviso |
| Texto de una celda | 10 KB | la celda se abrevia a `前200字符… (+N chars)` + aviso |

Además está `previewRows: 200`: la tabla reserva su presupuesto DOM solo para las primeras 200 filas. Con la llegada de la fila 201 **no hay silencio** — se escala a aviso `rows` y se marca `TRUNCATED`.

> El resultado del interruptor es un ciudadano de primera clase, no una página de error: cada banda indica por separado **qué límite se disparó, cuánto dio la medición y cuál era el límite**, y la tabla sigue renderizándose con normalidad (con BLOCKED se muestra una explicación clara del bloqueo). Los cuatro estados `OK / TRUNCATED / BLOCKED` + `READING` son todos resultados renderizables; nunca se lanza una excepción, nunca hay un spinner infinito.

---

## 3. Cotejo con el formato estándar (plugin-framework)

| Exigencia del estándar | Este plugin |
|---------|--------|
| Estructura en dos mitades | `src/index.ts` (mitad anfitrión, apply vacío) + `src/client/index.tsx` (mitad navegador) |
| Contrato de módulo cliente | El producto de la build es una closure CJS `window.__ModuleLoader__.load({ id, factory })` que exporta `apply` + `inject`; **en la build se carga de verdad una vez con `node:vm` y los export se verifican con assert** |
| Inyección declarativa `inject` | `export const inject = ['betterSidebar', 'locale']` — apply solo se ejecuta cuando los dos servicios cordis están listos; el orden de registro es indiferente |
| Ciclo de vida | Toda instalación pasa por `ctx.effect(fn, label)`; en HMR/desactivación, el disposer devuelto hace la limpieza |
| Asientos de ajustes / registro de comandos | Este plugin no registra asientos de ajustes ni comandos `/` (con lo que no toca seat-pin ni el contrato de la función description) |
| Manifiesto `dsh.bundle` | `package.json#dsh.bundle.patch` + `dsh.client.platform/inject` |
| `cordis.patch.yml` | Una pura línea insert, con un comentario que indica las dos formas de instalación (CLI / manual) |
| peerDependencies | `@deepseek-ai/*` con `>=0.1.5-rc.1 <0.2.0-0` (techo `-0` para esquivar la trampa semver de las prereleases); `dsh-better-sidebar` / `react` marcados optional |
| Estructura de directorios | `src/ lib/ assets/ tests/ scripts/` + `screenshots.json` + `dsh.plugin.json` + README/CHANGELOG |
| Cero dependencias | **sin dependencias de ejecución**: el parser CSV y el interruptor son módulos locales; el bundle del cliente solo externaliza React (43 KB) |
| Estilos | Sin entrada CSS → `styles.css` se inlinea como cadena en la build; `apply` inserta un `<style>` y registra un disposer; el color usa exclusivamente los tokens semánticos `--dsw-alias-*` |
| Multilenguaje | Namespace propio `dsh-opensheet-sidebar`, diccionarios zh/en registrados vía `locale.register(NS, tag, dict)`; sin el servicio se recurre al diccionario inglés integrado; sin la clave se renderiza la propia clave (visible, no vacío) |
| Disciplina de dependencias blandas | Ningún import de valores/tipos de `dsh-better-sidebar` (`seams.ts` solo hace declaraciones estructurales); si `betterSidebar` no está, **warn ruidoso y quietud perezosa** — no se registra ni media pestaña |

---

## 4. Por qué v0.1.0 no se mostraba (causa raíz)

Tras instalar v0.1.0 en un perfil, `cordis.patch.yml` estaba registrado y `node_modules` presente, pero la barra lateral no daba señales de vida, **y la consola no mostraba errores** — el módulo era descartado ya en la fase de carga de los módulos cliente:

| # | Cómo lo escribía v0.1.0 | Contrato estándar | Consecuencia |
|---|--------------|---------|------|
| 1 | `lib/client.js` es un **módulo ES** (`export function activate`) | closure CJS vía `window.__ModuleLoader__.load({ id, factory })` | la tabla de módulos no recibe export → **el paquete entero no carga, en silencio** |
| 2 | La entrada exporta `activate(ctx)` | Exportar **`apply(ctx)`** | aun cargado, no se encuentra la entrada |
| 3 | Sin `inject` | `export const inject = [...]` | cordis no espera `betterSidebar`; momento de registro aleatorio |
| 4 | Registro vía `ctx.sessionProjections.register({key,badge,component})` | `ctx.betterSidebar.registerTab / registerFileViewer` | **punto de acople equivocado**: `sessionProjections` es el registro de proyecciones del anfitrión, no el acople de UI de la barra lateral |
| 5 | Sin `ctx.effect`; `package.json` sin `dsh.bundle` / `dsh.client` / `exports` / `files`; techo peer escrito `>=0.1.5-rc.1` (sin cota superior) | ver tabla anterior | sin recuperación en HMR; metadatos incompletos |

> En una frase: **no era que «no surtía efecto», es que «no se cargaba»**. Esto explica también por qué en la «vista previa de archivos» del sistema no aparece ninguna entrada suya — esa lista es justamente el registro de `registerFileViewer`.

---

## 5. Build y verificación

```bash
npm run build     # esbuild de doble entrada + declaraciones de tipos tsc; en la build el bundle se carga de verdad una vez y se verifican apply/inject
npm test          # 25 aserciones: 14 csv (parseo/comillas/separador/interruptor 4D/integridad de placeholders/deduplicación de avisos) + 11 xlsx (zip/XML/hojas/dos compuertas de contenedor)
npm run verify    # build && test
```

Salida real de `npm test` (2026-09-22):

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

La compuerta de build (`scripts/build.mjs`), tras escribir el artefacto: ejecuta de verdad el bundle con `node:vm` y un stub de `window.__ModuleLoader__`, comprueba que `load()` se llama, que `id` es igual al nombre del paquete y que `factory()` devuelve un objeto con `apply` e `inject`; además rechaza cualquier petición de módulos integrados de Node. **Un bundle que no se puede cargar se pone en rojo ya en la build y nunca llega enfermo al anfitrión.**

---

### 5.1 Fixtures xlsx y autochequeo (`demo/xlsx/`)

Las fixtures se generan por script, no se commitean binarios: semilla aleatoria fija, bytes estables, y **cada archivo solo se encarga de disparar un camino**.

```bash
python scripts/make-xlsx-fixtures.py --out ../demo/xlsx   # requiere openpyxl (solo dev)
node scripts/report-fixtures.mjs ../demo/xlsx             # corre con el propio lector del plugin e imprime lo que ve
```

| Archivo | Peso | Dispara |
|------|------|------|
| `basic-3sheets.xlsx` | 8 KB | 3 hojas (una oculta) · formatos de fecha reales · booleanos · huecos de columna · fórmulas sin valor en caché |
| `wide-150cols.xlsx` | 15 KB | tope de columnas (150 > 100) → `cols` |
| `long-12000rows.xlsx` | 286 KB | tope de filas + presupuesto de vista previa → `rows` (**una sola**, con found/kept/limit) |
| `long-cell-20k.xlsx` | 5 KB | tope de celda (20 000 > 10 240) → `cell-length` |
| `deep-sheet-60k.xlsx` | 1.7 MB | **archivo pequeño, 56.7 MB descomprimidos** → `sheet-bytes` (rechazado antes de cualquier descompresión) |
| `big-archive.xlsx` | 8.5 MB | el archivo en sí supera los 5 MB → `file-size` (BLOCKED) |

La salida de `report-fixtures.mjs` es la prueba de que «cada fixture cumple su cometido»; corre sobre archivos producidos por un escritor Excel real (openpyxl), así que cubre también el camino de los formatos de fecha personalizados, que las fixtures sintéticas no alcanzan (`2026-01-08` en lugar del número de serie `46030`).

## 6. Instalación

**Modo A (recomendado): CLI oficial** — él solo mantiene a raya las dependencias junto con `dsh.profile.bundles`

```bash
dsh plugin --profile <profile> add <path-to-plugin>
```

**Modo B: manual (tres pasos, ninguno sobra)**

```bash
# 1) Copiar este paquete
#    → ~/.dsh/profiles/<profile>/node_modules/dsh-opensheet-sidebar
# 2) Añadir "dsh-opensheet-sidebar" al array dsh.profile.bundles del package.json del perfil
# 3) Anexar la línea insert del cordis.patch.yml de este paquete al cordis.patch.yml del perfil
```

> ⚠️ **El paso 2 es el que más fácil se olvida, y olvidarlo es totalmente silencioso.** La capa de bundles solo se sintetiza si el
> `dsh.profile.bundles` del perfil menciona este paquete; quedarse en los pasos 1 y 3 da como resultado: paquete instalado,
> `- id: dsh-opensheet-sidebar` presente en `cordis.patch.yml`, pero esa línea **no tiene ninguna línea sobre la que actuar** —
> el plugin no carga y la consola no dice nada. El `disabled: false` del paso 3 solo «activa explícitamente una línea ya insertada»,
> por sí mismo no inserta ninguna línea.

**Tras instalar, verificar antes de reiniciar** (no arranca ningún servicio):

```bash
dsh --profile <profile> --dump-config | Select-String dsh-opensheet-sidebar
# Salida esperada:
#   # == dsh-opensheet-sidebar, patched by ...\cordis.patch.yml
#   - id: dsh-opensheet-sidebar
#     name: dsh-opensheet-sidebar
#     disabled: false
```

Ver esas tres líneas = línea insertada + parche del perfil activo; entonces basta con **reiniciar DSH** (el bundle del perfil y la tabla de módulos cliente se sintetizan al arrancar; refrescar la página no alcanza).
No ver nada = el paso 2 no surtió efecto.

**Dependencia**: `dsh-better-sidebar >= 0.18.1` (opcional). En su ausencia el plugin carga con normalidad, avisa en consola y no aporta ninguna entrada.

---

## 7. Matriz de compatibilidad de versiones

| Versión del plugin | DSH | Nota |
|---------|-----|------|
| 0.3.0 | `>=0.1.5-rc.1 <0.2.0-0` | vista previa de libros xlsx/xlsm (cambio de hoja) + dos compuertas de contenedor zip + compuerta de integridad de placeholders |
| 0.2.0 | `>=0.1.5-rc.1 <0.2.0-0` | reescritura al formato estándar: `__ModuleLoader__` + `apply/inject/effect` + doble acople better-sidebar |
| 0.1.0 | — | modo de integración fuera de contrato, **no carga**, retirado |

## 8. Límites conocidos

- La tabla no hace scroll virtual: el presupuesto DOM lo controla con severidad `previewRows`; a mayor volumen solo llega «el recorte antes», nunca la lentitud.
- El `fsRead` del anfitrión trunca por su cuenta los archivos grandes; en ese caso la barra de estadísticas muestra `≈` y la etiqueta «lectura truncada por el anfitrión», con `state = TRUNCATED` — **jamás se hace pasar por un archivo completo**.
- Solo vista previa, sin escritura de vuelta: ni edición ni guardado.

## 9. Soporte xlsx (con cambio de hoja)

`.xlsx` / `.xlsm` se abren con el mismo renderizado tabular; arriba, una fila de **pestañas de hojas** permite cambiar; las hojas ocultas (`state="hidden"`) se ven atenuadas en las pestañas y por defecto se abre automáticamente la primera hoja visible. Cero dependencias de ejecución.

### 9.1 El acople: por qué hacía falta otra ruta de lectura

Un libro es binario, y `fetchStrategy: 'fsRead'` para binario solo devuelve `{kind:'binary', size, truncated, head}` — **sin content**, no hay nada que darle al parser. Por eso xlsx es una vista previa **registrada por separado**:

```
fetchStrategy: 'custom'
load: fetch(`/sidebar/file?sessionId=..&cwd=..&path=..`) → arrayBuffer → Uint8Array
```

Se va por la ruta de bytes crudos del propio anfitrión, así que la valla de rutas del espacio de trabajo sigue del lado del anfitrión (nosotros no leemos archivos por nuestra cuenta). La ruta `fsRead` de los CSV queda intacta.

### 9.2 Tubería de análisis (`src/client/xlsx.ts`)

```
directorio central del zip → xl/workbook.xml (lista de hojas / orden / ocultas)
             → xl/_rels/workbook.xml.rels (rId → part)
             → xl/sharedStrings.xml (concatenación de runs de texto enriquecido)
             → xl/styles.xml (cellXfs → numFmtId → fecha o no)
             → xl/worksheets/sheetN.xml (solo se descomprime la hoja pedida)
```

Cobertura de celdas: cadenas compartidas / cadenas en línea / valores en caché de fórmulas (`t="str"`) / booleanos / errores / números; los **huecos de columna** se reconstruyen gracias a `r="C3"` (una columna ausente no desplaza a la siguiente); los números de serie de las fechas se convierten en fechas legibles según las eras 1900 y 1904.

La descompresión usa el `DecompressionStream('deflate-raw')` nativo del navegador; el XML se trata con escaneos dirigidos — el XML del xlsx es una estructura regular generada por máquina, un parser universal sería un desperdicio.

### 9.3 Dos compuertas de contenedor (para un zip, una compuerta de tamaño equivale a no tener protección)

| Compuerta | Momento | Por defecto | Papel |
|------|------|------|------|
| **Volumen descomprimido declarado** | **antes** de cualquier acción de descompresión, leyendo el directorio central | 32 MB por part | la cabecera zip es falsificable, de ahí este rechazo determinista de entrada |
| **Presupuesto de bytes en flujo** | acumulado durante la descompresión | 64 MB en total | red de seguridad cuando la cabecera miente; al pasarse, `cancel()` inmediato |

Si una sola hoja supera por sí sola el límite, **solo se bloquea esa hoja**; las hojas hermanas abren con normalidad. Contenedor ilegible en sí (no zip / falta un part) → `container-error`, se renderiza como una tarjeta de error legible en vez de lanzar una excepción.

### 9.4 Aún sin soporte

Los `.xls` (Excel 97-2003 BIFF8) y los formatos antiguos de WPS `.et` / `.wps` / `.dps`: todos son documentos compuestos OLE2; el cero dependencias exigiría construir uno mismo el análisis CFB (FAT/directorio) + BIFF, caro y proclive a errores. Cubrirlos suele significar meter SheetJS (~1 MB, cuya versión en npm ya no se mantiene y cuyas novedades solo salen en el CDN oficial), en conflicto con el principio de cero dependencias — a evaluar aparte cuando haga falta.

> No confundir: **el `.xlsx` que las hojas de cálculo de WPS guardan por defecto es un xlsx estándar**, y este plugin lo soporta directamente; solo los `.et` producidos por «Guardar como → formato antiguo de WPS» están entre lo no soportado.

## 10. Publicación y migración de identidad (ejemplos de scripts)

Dos scripts, cada uno con su mitad: la **publicación** en la máquina de desarrollo, la **migración** en el perfil donde se instala el plugin. Ambos aceptan `-DryRun` (el único modo que puede repetirse a discreción) y ambos se detienen al primer fallo, jamás «publican de todas formas».

```powershell
# ① Lado publicación: build + tests + compuertas de identidad + manifiesto de empaquetado, y solo entonces la publicación de verdad (--access public, registry oficial)
pwsh -File scripts/publish-npm.ps1 -DryRun                # primero mirar
pwsh -File scripts/publish-npm.ps1                        # luego publicar
pwsh -File scripts/publish-npm.ps1 -DeprecateOld dsh-csv-sidebar   # opcional: marcar deprecate el nombre viejo

# ② Lado consumo: instalar la identidad nueva → quitar la vieja → cambiar el id de la línea de parche del perfil → verificar punto por punto
#    -NewSpec debe ser una spec «resoluble de verdad hoy» — el script hace prechequeo antes de tocar nada.
#    Este paquete por ahora solo existe en GitHub (en npm aún no está), de ahí la forma github::
pwsh -File scripts/migrate-profile.ps1 -Profile web -NewSpec 'github:drscrewdriver/dsh-opensheet-sidebar#<sha>' -DryRun
pwsh -File scripts/migrate-profile.ps1 -Profile web -NewSpec 'github:drscrewdriver/dsh-opensheet-sidebar#<sha>'
#    Tras publicar en npm se pasa a la forma registry (hasta entonces esa línea la frenaría el prechequeo):
#    pwsh -File scripts/migrate-profile.ps1 -Profile web -NewSpec 'dsh-opensheet-sidebar@1.0.0'
```

**Prechequeo (preflight)**: `-NewSpec` se resuelve primero y se actúa después — forma npm vía `npm view <name>[@range]`, forma `github:` vía `git ls-remote` (un SHA de 40 caracteres no se busca por nombre; se verifica entonces la accesibilidad del repositorio, y el SHA en sí lo valida el paso de instalación), forma local mirando el `package.json`. Si no se resuelve, se aborta antes de la copia de seguridad, código de salida 1 — para que un ejemplo «que parece funcionar» no fracase a mitad de camino.

También se puede ir por los alias de npm script:

```powershell
npm run publish:npm -- -DryRun
npm run profile:migrate -- -Profile web -NewSpec 'dsh-opensheet-sidebar@1.0.0' -DryRun
```

### 10.1 Por qué el orden es «instalar primero el nuevo, quitar después el viejo»

Renombrar toca cuatro sitios a la vez, y **olvidar uno solo es un fallo silencioso** (no un error): la spec de dependencia del perfil, `dsh.profile.bundles` (la mantiene el reconcile de la CLI, no se edita a mano), el row id del `cordis.patch.yml` del perfil (un parche sobre un id inexistente es una no-operación) y la carpeta dentro de `node_modules`.

Instalar primero el nuevo y quitar después el viejo deja, tras el fallo de cualquier paso, un **plugin todavía utilizable**, y no un perfil vacío. Ambas llamadas a pnpm se reintentan una vez automáticamente — con el anfitrión corriendo, `node_modules` está ocupado y el primer intento puede lanzar `ERR_PNPM_PACKAGE_MANAGER_REMOVE_MODULES_DIR`.

### 10.2 Tres trampas de PowerShell 5.1 en los scripts (media hora ahorrada al reutilizarlos)

| Trampa | Síntoma | Remedio |
|----|------|------|
| Comando nativo + redirección `2>` + `$ErrorActionPreference='Stop'` | los avisos stderr de npm son promovidos a **errores terminales** y el script muere en el paso 2 sin motivo aparente | aflojar temporalmente a `Continue` antes de la llamada, fundir los flujos con `2>&1 \| Out-String` y luego leer `$LASTEXITCODE` |
| `$PSScriptRoot` como valor por defecto de `param()` | al evaluarse aún es cadena vacía → la validación de parámetros de `Split-Path` falla | poner `''` por defecto y resolverlo en el cuerpo del script |
| `.Count` sobre un resultado de `Where-Object` | 1 resultado es un string (sin `.Count`), 0 resultados son `$null` — con `Set-StrictMode`, `PropertyNotFound` al instante | envolver siempre en `@(...)` antes de leer `.Count` |

El script de publicación trae además dos **compuertas que deberían existir tanto antes como después de la subida**: el nombre debe estar «libre o ser propio» (`npm view` + `maintainers` cotejados con `npm whoami`, para no aterrizar en un nombre ocupado por otro), y sin sesión iniciada se rechaza en el acto (en vez de esperar un 401).
