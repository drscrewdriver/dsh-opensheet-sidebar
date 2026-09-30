# Registro de cambios — dsh-opensheet-sidebar

## 1.0.1 — 2026-09-25

Deduplicación del interruptor: cuando una dimensión se dispara, sale un solo aviso. Los avisos duplicados de la 1.0.0 venían de que el tope de filas y el presupuesto de vista previa emitían cada uno su propio aviso `rows`.

> **Constancia de publicación (2026-09-25)**: npm `dsh-opensheet-sidebar@1.0.1`, dist-tags `latest` + `dsh-0.1.5`; 49 files / 98.8 kB, shasum del tarball `1862528750612980122ffc3d31f31eb05eb1bf7d`.

### Corregido

- **La misma dimensión ya no avisa dos veces**: tope de filas y presupuesto de vista previa comparten ahora una misma banderita, `finalize()` rellena después `found`, de modo que una sola línea lleva a la vez kept/limit/found en vez de renderizar dos bandas casi idénticas. Nueva aserción: **exactamente un aviso por causa**.
- **Se declara el campo `repository`**, apuntando a `drscrewdriver/dsh-opensheet-sidebar`. Los listados solo asocian un paquete npm con su repositorio cuando el paquete publicado devuelve la mirada al repositorio; a la 1.0.0 le faltaba este campo, y por eso hasta ahora no estaban asociados.

### Añadido

- **Conjunto de fixtures xlsx reales** (`scripts/make-xlsx-fixtures.py`, semilla aleatoria fija): openpyxl produce seis libros reales, cada uno encargado de disparar un solo camino del interruptor; `scripts/report-fixtures.mjs` corre sobre ellos con el **propio lector del plugin** e imprime lo que lee. Es justamente él el que sacó a la luz este duplicado, y cubre además el camino de los formatos de fecha personalizados, inalcanzable para las fixtures zip sintéticas (salida real de openpyxl → 2026-01-08).

### Tests

- 25 aserciones (14 csv + 11 xlsx), código de salida 0; el informe de fixtures muestra exactamente un aviso por archivo.

## 1.0.0 — 2026-09-22

**Cambio de identidad del paquete: `dsh-csv-sidebar` → `dsh-opensheet-sidebar`.** Funcionalmente idéntico a la 0.3.0, sin cambio de comportamiento; solo cambian identidad y nombre mostrado.

> **Constancia de publicación (2026-09-22)**: npm `dsh-opensheet-sidebar@1.0.0`, dist-tags `latest` + `dsh-0.1.5`; 49 files / 97.2 kB, shasum del tarball `88b7fed194c15cd6cd59c1d87e69ae9e8503b5aa`. Tras publicar, el tarball se volvió a bajar del registry para contraverificación: `lib/client.js` coincide byte a byte con la build del repositorio (`43CF34FDCB65…`), el id de módulo dentro del bundle = `dsh-opensheet-sidebar`. El perfil migró del pin `github:` a esta versión npm (la spec queda depositada en disco como valor exacto `1.0.0`).

El nombre es un juego de palabras: **Open** (abrir) ＋ **Open** (estándar abierto) — una sola palabra cubre «abrir la tabla» y «leer la tabla sin depender de bibliotecas propietarias». El juego de palabras vive solo en el nombre; los campos funcionales siguen siendo estrictamente literales (`exts` solo recibe extensiones reales).

> Constancia del proceso de nombrado: primero cuajó el plural `opensheets`, corregido a singular `opensheet` menos de un minuto antes de publicar (un nombre propio en singular sabe más a marca y ata mejor con la familia OpenDocument). Esta entrada describe la identidad final.

### Cambiado

- Nombre del paquete / nombre del repositorio / `dsh.plugin.json#id` / row id+name del `cordis.patch.yml` → `dsh-opensheet-sidebar`. **Estos sitios tienen que ir sincronizados**: el id del módulo cliente se deriva de `package.json#name`, y el `name:` de la línea es lo que usa client-modules para localizar el manifiesto del paquete; perder uno = la línea del anfitrión está y la mitad cliente no carga, en silencio (el tipo de avería de la 0.1.0).
- Renombrados también los id con prefijo: `TAB_ID` / `VIEWER_ID` / `XLSX_VIEWER_ID` / id de la etiqueta de estilos / namespace de locale.
- Nombre mostrado de la pestaña lateral: `CSV` → `Sheets` (zh: `表格`). Los títulos de los visores se mantienen descriptivos (`CSV table` / `Spreadsheet table`) — decir qué es según el tipo de archivo, en vez de calcar un nombre de producto.
- Salto a la 1.0.0: para los consumidores es un cambio que rompe (cambia la identidad del paquete), no una minor.

### Migración (identidad antigua → identidad nueva)

1. `dsh plugin --profile <p> add github:drscrewdriver/dsh-opensheet-sidebar#<sha>`
2. `dsh plugin --profile <p> remove dsh-csv-sidebar` — `reconcilePlugins` quitará solo el nombre viejo de `dsh.profile.bundles`
3. En el `cordis.patch.yml` del perfil, cambiar la línea `- id: dsh-csv-sidebar` por el nuevo id (un parche sobre un id inexistente es una no-operación silenciosa; dejarla solo despista a quien venga después)
4. Reiniciar el anfitrión una vez

> Efecto secundario: el interruptor de activar/desactivar de better-sidebar se guía por la clave `tabsEnabled[<id>]`; el id cambia → los interruptores previos del usuario vuelven a los valores por defecto. El repositorio antiguo `drscrewdriver/dsh-csv-sidebar` se conserva pero ya no se referencia.

## 0.3.0 — 2026-09-22

Soporte xlsx (con **cambio de hoja**). Cero dependencias: la descompresión zip va por el `DecompressionStream('deflate-raw')` nativo del navegador, y el XML se trata con escaneos dirigidos en lugar de un parser universal.

### Añadido

- **Visor de libros**: `.xlsx` / `.xlsm` se abren como tabla, arriba una fila de pestañas de hojas permite cambiar; las hojas ocultas (`state="hidden"`) se ven atenuadas en las pestañas y por defecto se abre automáticamente la primera hoja visible.
- **Lector xlsx** (`src/client/xlsx.ts`): análisis del directorio central del zip (el caso data-descriptor se trata correctamente, del tamaño solo se fía el que declara el directorio central) → lista de hojas de `xl/workbook.xml` → `_rels` rId→part → `sharedStrings.xml` (concatenación de runs de texto enriquecido) → `styles.xml` (`cellXfs` → numFmtId → reconocimiento de fechas) → descompresión a demanda de un solo `worksheets/sheetN.xml`.
- **Tratamiento de celdas**: cadenas compartidas / cadenas en línea / valores en caché de fórmulas (`t="str"`) / booleanos / errores / números; los **huecos de columna** se reconstruyen vía `r="C3"` (una columna ausente no desplaza a la siguiente); los números de serie de las fechas se convierten en fechas legibles según las eras 1900/1904.
- **Dos compuertas de contenedor** (la compuerta de tamaño anterior, para un zip, equivalía a no tener protección):
  - el **volumen descomprimido declarado** se coteja antes de cualquier acción de descompresión (la cabecera zip es falsificable, de ahí este rechazo determinista de entrada);
  - el **presupuesto de bytes de descompresión en flujo** hace de red de seguridad, contando mientras descomprime, con `cancel()` en cuanto se pasa.
  Si una sola hoja supera ella sola el límite, solo esa hoja queda bloqueada; las hojas hermanas siguen siendo legibles.
- Nuevos textos de aviso `inflated-bytes` / `sheet-bytes` / `container-error` (zh/en).
- **Tests**: `tests/xlsx.test.mjs` construye en el sitio fixtures zip reales (con CRC32 y directorio central correcto) — lista de hojas y marcas de oculto, cadenas compartidas, celdas de fecha, huecos de columna, cambio entre hojas, zip bomb con volumen falsificado, entrada que no es zip; 11 aserciones, código de salida 0/1.

### Corregido

- **Los placeholders de los avisos ya no quedan desnudos**: al agotarse el presupuesto de vista previa (fila 201), el aviso se generaba sin que `found` fuera conocido, y la interfaz mostraba directamente `共至少 {found} 行`. Ahora `finalize()` rellena el número de filas realmente contadas.
- Nueva **compuerta de integridad de placeholders** (una por cada suite de tests): recorre los avisos que cada dimensión produce de verdad y exige que cada `{name}` de las plantillas zh/en aparezca en el detail, si no, luz roja. Estos bugs ya no se descubrirán a ojo.

### Cambiado

- Dos umbrales más en la configuración del interruptor: `maxInflatedBytes` (64 MB por defecto), `maxSheetBytes` (32 MB por defecto).
- Barra de estado: un libro muestra la etiqueta con el nombre de la hoja, y ya no se equivoca mostrando «separador».
- El visor xlsx va por `fetchStrategy: 'custom'` + la ruta `/sidebar/file` del anfitrión para traer los bytes crudos (`fsRead` ante binario solo devuelve `head`, inservible para el análisis); la valla de rutas del espacio de trabajo sigue del lado del anfitrión.

### Aún sin soporte

- `.xls` (Excel 97-2003 BIFF8) y los formatos antiguos de WPS `.et` / `.wps` / `.dps`: todos son documentos compuestos OLE2, caros de implementar a cero dependencias (habría que construir uno mismo el análisis CFB + BIFF). Cubrirlos pasa por meter SheetJS (~1 MB, cuya versión en npm ya no se mantiene), en choque con el principio de cero dependencias — a evaluar por separado.

## 0.2.0 — 2026-09-22

Reescritura al formato estándar. La mitad cliente de la 0.1.0 no cumplía el contrato de módulos cliente de DSH: instalada en un perfil, **no se cargaba** (sin error, sin entrada); esta versión rehace la capa de integración según el estándar plugin-framework.

### Corregido (capa de integración — todas ellas causa raíz del «no se muestra»)

- El artefacto cliente pasa a ser una closure CJS `window.__ModuleLoader__.load({ id, factory })` cuya fábrica exporta `apply` + `inject` (antes módulo ES + `activate()`, la tabla de módulos lo descartaba todo).
- El acople de registro cambia de `ctx.sessionProjections` a `ctx.betterSidebar.registerFileViewer / registerTab` (el primero es el registro de proyecciones del anfitrión, no el acople de UI de la barra lateral).
- Nuevo `inject` declarativo `['betterSidebar', 'locale']`: apply solo espera a que los dos servicios cordis estén listos; el orden de registro ya no influye en el resultado.
- Toda instalación pasa por `ctx.effect(fn, label)`; en HMR / desactivación recoge el disposer (etiqueta de estilos, diccionarios, dos descriptores).
- Metadatos completados: `package.json#dsh.bundle.patch` + `dsh.client.platform/inject`, listados `exports` / `files`, `screenshots.json`, `assets/`, `tsconfig*.json`.
- Techo peer unificado en `<0.2.0-0`, para esquivar la trampa de comparación semver de las prereleases; `dsh-better-sidebar` / `react` marcados optional.

### Añadido

- **Acople de visor de archivos**: `.csv/.tsv/.psv` (priority 50, `fetchStrategy: 'fsRead'`) entran en el listado «vista previa de archivos» de la GUI, activables/desactivables en los ajustes de la tarjeta Side; lee el anfitrión, la valla de rutas queda de su lado.
- **Compuerta de carga en build**: carga de verdad el artefacto vía `node:vm` + stub `window.__ModuleLoader__`, comprueba `id`, los `apply`/`inject` de `factory()` y rechaza las peticiones de módulos integrados de Node.
- **12 aserciones núcleo** (`npm test`, código de salida 0/1): comillas y escapes RFC 4180, olfateo del separador, interruptor de cuatro dimensiones, marca de truncado por el anfitrión, líneas en blanco y documento vacío.
- Namespace i18n propio `dsh-csv-sidebar` (zh/en), recurso al diccionario inglés integrado si falta `locale`.
- Estilos con tokens semánticos `--dsw-alias-*` (se acaba la dependencia de variables inexistentes como `--border-color`).

### Cambiado

- **Cero dependencias de ejecución**: fuera PapaParse, sustituido por un escáner local que entiende de comillas (RFC 4180, campos que cruzan fin de línea soportados); el bundle solo externaliza React (43 KB).
- La build pasa de Vite a esbuild de doble entrada (`lib/index.mjs` + `lib/client.js`), con declaraciones de tipos tsc añadidas.
- Semántica del interruptor endurecida: al agotarse el presupuesto `previewRows`, **escalado explícito a aviso `rows`** (ya no se muestran en silencio solo las primeras 200 filas); las dos ramas `OK` de `finalize()` se funden.
- Las fuentes se mudan a `src/client/` según la estructura estándar; la mitad anfitrión se independiza como `src/index.ts`.

### Eliminado

- `vite.config.ts`, la dependencia `papaparse`, los viejos componentes planos `src/*.tsx` y la escritura errónea del campo `main` que apuntaba a `./lib/client.js`.

## 0.1.0 — 2026-09-22

Primer prototipo: el `demo.html` de `npm run dev` validó el aspecto de las interacciones tabulares y del interruptor de cuatro dimensiones; después se empaquetó como plugin. **El empaquetado de plugin de esta versión no carga en DSH** (ver Corregido de la 0.2.0).
