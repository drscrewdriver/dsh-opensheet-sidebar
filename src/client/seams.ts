/**
 * Structural mirrors of the two client services this plugin consumes.
 *
 * Why not `import type { BetterSidebarService } from 'dsh-better-sidebar/client/service'`?
 * Because that subpath's types live in the sidebar's own declaration graph,
 * and a value import would inline a second copy of the sidebar into our
 * bundle. We are a SOFT dependency: the plugin must stay inert (and stay
 * loadable) when better-sidebar is not installed, so nothing here is imported
 * from it — only the handful of members we actually call are declared.
 *
 * This is the discipline the plugin-framework guidance calls for: no
 * cross-package value coupling, no assumption that a peer resolves, a loud
 * warn instead of a half-registered panel.
 */
import type { ReactNode } from 'react'

/** The session scope every sidebar request carries. */
export interface SessionScopeLike {
  readonly sessionId: string
  readonly cwd?: string
  readonly repoRoot?: string
}

/** Props a tab component receives (the subset we use). */
export interface TabComponentPropsLike {
  scope: SessionScopeLike
  tab: { id: string; type: string; title?: string; path?: string }
  visible: boolean
}

/** A sidebar tab registration. */
export interface TabDescriptorLike {
  id: string
  title: string | (() => string)
  description?: string | (() => string)
  icon?: ReactNode | ((size: number) => ReactNode)
  order?: number
  single?: boolean
  component: (props: TabComponentPropsLike) => ReactNode
}

/** Props a file viewer receives (the subset we use). */
export interface FileViewerPropsLike {
  scope: SessionScopeLike
  /** Workspace-relative or absolute path of the opened file. */
  path: string
  title: string
  viewerId: string
  /** Populated by the host when `fetchStrategy` is `fsRead`. */
  content?: string
  /** The host capped the file it returned. */
  truncated?: boolean
  /** The registered loader's return value, when `fetchStrategy` is `custom`. */
  customData?: unknown
}

/** How the host loads a file's bytes for one viewer. */
export type FileFetchStrategy = 'none' | 'fsRead' | 'mediaUrl' | 'custom' | 'binary-download'

/** A file-previewer registration — this is what the GUI's "文件预览" list shows. */
export interface FileViewerDescriptorLike {
  id: string
  title?: string | (() => string)
  icon?: ReactNode | ((size: number) => ReactNode)
  exts: readonly string[]
  priority?: number
  fetchStrategy: FileFetchStrategy
  /**
   * `fetchStrategy='custom'` loader. The host calls it with the path and the
   * session scope and hands the return value to the component as `customData`;
   * `signal` aborts on viewer teardown or re-match.
   */
  load?: (path: string, scope: SessionScopeLike, signal?: AbortSignal) => Promise<unknown>
  component: (props: FileViewerPropsLike) => ReactNode
}

/** The registry published as `ctx.betterSidebar`. */
export interface BetterSidebarLike {
  registerTab(descriptor: TabDescriptorLike): () => void
  registerFileViewer(descriptor: FileViewerDescriptorLike): () => void
}

/** The locale service (shell-resident; declared service). */
export interface LocaleLike {
  register(ns: string, locale: string, dict: Record<string, string>): () => void
  bind(ns: string): (key: string) => string
}

/** The client root context, narrowed to what this plugin touches. */
export interface ClientContext {
  /**
   * Register a side-effect and its disposer. Everything this plugin installs
   * rides an effect so HMR / disable revokes it — the documented contract.
   */
  effect(factory: () => void | (() => void), label: string): void
  betterSidebar?: BetterSidebarLike
  locale?: LocaleLike
}

/** True when `value` looks like the sidebar registry. */
function isBetterSidebar(value: unknown): value is BetterSidebarLike {
  if (typeof value !== 'object' || value === null) return false
  const candidate = value as Partial<BetterSidebarLike>
  return typeof candidate.registerTab === 'function' && typeof candidate.registerFileViewer === 'function'
}

/** True when `value` looks like the locale service. */
function isLocale(value: unknown): value is LocaleLike {
  if (typeof value !== 'object' || value === null) return false
  const candidate = value as Partial<LocaleLike>
  return typeof candidate.register === 'function' && typeof candidate.bind === 'function'
}

/** Narrow an untyped cordis context into the shape we use. */
export function clientContextOf(raw: unknown): ClientContext {
  const ctx = (raw ?? {}) as ClientContext
  return {
    effect: typeof ctx.effect === 'function' ? ctx.effect.bind(raw) : () => {},
    ...(isBetterSidebar(ctx.betterSidebar) ? { betterSidebar: ctx.betterSidebar } : {}),
    ...(isLocale(ctx.locale) ? { locale: ctx.locale } : {}),
  }
}

/**
 * Absolute URL of better-sidebar's raw-bytes route for one path.
 *
 * Mirrored from the sidebar's own `mediaUrl` (`src/client/api.ts`). A workbook
 * is binary and `fsRead` answers a binary file with a head-only result, so the
 * xlsx viewer declares `fetchStrategy: 'custom'` and pulls bytes from here.
 * Going through this route rather than reading the file ourselves is what
 * keeps the workspace-root path fence on the host side.
 */
export function sidebarFileUrl(scope: SessionScopeLike, path: string): string {
  const params = new URLSearchParams({ sessionId: scope.sessionId, path })
  if (scope.cwd !== undefined && scope.cwd !== '') params.set('cwd', scope.cwd)
  return `/sidebar/file?${params.toString()}`
}
