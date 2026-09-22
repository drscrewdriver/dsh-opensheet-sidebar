/**
 * Browser half of `dsh-csv-sidebar` — the Cordis client entry.
 *
 * This file is the whole integration contract, so it is worth stating plainly:
 *
 * 1. **The module-loader shape.** DSH's client module system evaluates a
 *    script that calls `window.__ModuleLoader__.load({ id, factory })`; the
 *    factory returns an object exposing `apply` (and optionally `inject`).
 *    `scripts/build.mjs` synthesises that wrapper — this source stays ordinary
 *    ESM and never mentions the loader.
 *
 * 2. **`inject` before `apply`.** `betterSidebar` and `locale` are declared,
 *    so Cordis activates this plugin only once both are published. Registration
 *    order therefore never matters. (`betterSidebar` is a *hard* declaration but
 *    a *soft* dependency: when dsh-better-sidebar is absent the runtime guard
 *    below warns loudly and leaves the plugin inert rather than half-installed.)
 *
 * 3. **Two seams, one plugin.**
 *    - `registerFileViewer` claims `.csv` / `.tsv` / `.psv` in the file-preview
 *      registry, which is what makes clicking a CSV in the explorer render a
 *      table instead of raw text. The host does the reading (`fsRead`) and owns
 *      the workspace path fence.
 *    - `registerTab` adds the manual surface (drag-and-drop a local file), where
 *      the real byte size is known before reading.
 *
 * 4. **Everything rides `ctx.effect`.** The returned disposer is what cordis
 *    invokes on HMR / disable, so nothing leaks a style tag or a stale
 *    descriptor.
 */
import { createElement } from 'react'
import { CsvFileViewer } from './CsvFileViewer'
import { CsvIcon } from './CsvIcon'
import { CsvLocalTab } from './CsvLocalTab'
import { NS, dictionaries, interpolate, translatorFrom } from './locales'
import { clientContextOf } from './seams'
import css from './styles.css'
import type { T } from './locales'
import type { ClientContext } from './seams'

/** Tab type id — package-prefixed so it cannot collide with a built-in type. */
export const TAB_ID = 'dsh-csv-sidebar:tab'

/** File-viewer id, as it appears in the Side card's preview inventory. */
export const VIEWER_ID = 'dsh-csv-sidebar:viewer'

/** Services that must be published before `apply` runs. */
export const inject = ['betterSidebar', 'locale'] as const

/** Id of the injected <style> tag, so a re-apply can detect its own work. */
const STYLE_ID = 'dsh-csv-sidebar-styles'

/** Order in the `+` menu: after the built-ins (editor 10 … terminal 40, browser 50). */
const TAB_ORDER = 70

/**
 * Append the stylesheet once. Returns the disposer that removes it — a plugin
 * has no CSS entry point of its own, so this is the only way to ship styles.
 */
function injectStyles(): () => void {
  if (document.getElementById(STYLE_ID) !== null) return () => {}
  const tag = document.createElement('style')
  tag.id = STYLE_ID
  tag.textContent = css
  document.head.appendChild(tag)
  return () => tag.remove()
}

/**
 * Bind a translator to our namespace. Falls back to the built-in English
 * dictionary (and then to the key itself) so a missing locale service degrades
 * to readable text rather than blank labels.
 */
function translatorOf(ctx: ClientContext): T {
  const locale = ctx.locale
  if (locale === undefined) return translatorFrom(dictionaries.en)

  return (key, vars) => {
    try {
      const bound = locale.bind(NS)(key)
      return interpolate(bound === '' ? key : bound, vars)
    } catch {
      return interpolate(key, vars)
    }
  }
}

/**
 * Browser-face apply.
 *
 * @param rawCtx - the client root context, narrowed structurally in `seams.ts`.
 */
export function apply(rawCtx: unknown): void {
  const ctx = clientContextOf(rawCtx)

  ctx.effect(injectStyles, 'dsh-csv-sidebar: stylesheet')

  if (ctx.locale !== undefined) {
    for (const [tag, dict] of Object.entries(dictionaries)) {
      ctx.effect(() => ctx.locale!.register(NS, tag, dict), `dsh-csv-sidebar: dictionary ${tag}`)
    }
  }

  const t = translatorOf(ctx)
  const bar = ctx.betterSidebar

  if (bar === undefined) {
    // Loud, not fatal: the plugin stays loadable and simply contributes nothing.
    console.warn(
      '[dsh-csv-sidebar] ctx.betterSidebar 未发布：dsh-better-sidebar 未安装或已禁用，CSV 预览保持惰性。',
    )
    return
  }

  // ── File previewer: `.csv` / `.tsv` / `.psv` open as a table ──────────────
  ctx.effect(
    () =>
      bar.registerFileViewer({
        id: VIEWER_ID,
        title: () => t('viewer.title'),
        icon: (size: number) => CsvIcon(size),
        exts: ['csv', 'tsv', 'psv'],
        priority: 50, // above the default 0; the built-in `code` viewer sits at -100
        fetchStrategy: 'fsRead', // the host reads it, under its own path fence
        component: props =>
          createElement(CsvFileViewer, {
            path: props.path,
            title: props.title,
            content: props.content,
            truncated: props.truncated,
            t,
          }),
      }),
    'dsh-csv-sidebar: file viewer',
  )

  // ── Manual tab: drop a local file, real byte size known up front ──────────
  ctx.effect(
    () =>
      bar.registerTab({
        id: TAB_ID,
        title: () => t('tab.title'),
        description: () => t('tab.desc'),
        icon: (size: number) => CsvIcon(size),
        order: TAB_ORDER,
        single: true, // ≡ dedupeKey: () => id — reopening focuses the existing tab
        component: () => createElement(CsvLocalTab, { t }),
      }),
    'dsh-csv-sidebar: tab',
  )

  console.log('[dsh-csv-sidebar] 已注册：文件预览器 (.csv/.tsv/.psv) + 手动 tab')
}
