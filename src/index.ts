/**
 * Node half of `dsh-opensheet-sidebar`.
 *
 * The Cordis loader needs one entry point per profile row. This plugin's
 * behaviour lives entirely in the browser half — the file viewer and the tab
 * are registered through `dsh-better-sidebar`'s client service, and every byte
 * of CSV text is read over that plugin's own `/sidebar/api/fs.read` route
 * (which owns the workspace-root path fence). So this half installs nothing:
 * no HTTP route, no tool, no service, no state.
 */

/** Profile row identity; must match `cordis.patch.yml` and `package.json#name`. */
export const name = 'dsh-opensheet-sidebar'

/**
 * Host-side apply. Intentionally empty — see the module docblock.
 *
 * If this plugin ever needs a host service, inject it explicitly instead of
 * reaching for `ctx.get()`:
 *
 * ```ts
 * ctx.inject(['webServer'], (ctx) => {
 *   ctx.webServer.register({ kind: 'exact', path: '/api/csv-sidebar/x', handler })
 * })
 * ```
 */
export function apply(): void {}
