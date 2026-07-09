/**
 * Permission store — the frontend mirror of the scoped RBAC system.
 * Loaded once after login from GET /roles/my-permissions.
 *
 * Usage:
 *   const can = usePermStore((s) => s.can)
 *   if (can('fees', 'update')) ...
 *   scopeOf('students')  -> 'all' | 'course' | 'batch' | 'own' | null
 */
import { create } from 'zustand'
import http from '../api/http.js'

export const usePermStore = create((set, get) => ({
  permissions: [],   // [{ module, action, scope }]
  roles: [],
  loaded: false,     // a load attempt has fully resolved (success or permanent failure)
  loading: false,    // a load is currently in flight
  failed: false,     // the load permanently failed after retries -> fail CLOSED

  loadPermissions: async ({ force = false } = {}) => {
    const s = get()
    if (s.loading) return                 // de-dupe concurrent callers
    if (s.loaded && !force) return         // already resolved for this user
    set({ loading: true })

    // Retry transient failures a few times so a momentary network hiccup never
    // strands a real admin on the fail-closed UI. The backend remains the
    // authority; this only governs what the sidebar/dashboard advertise.
    let lastErr
    for (let attempt = 0; attempt < 3; attempt++) {
      try {
        const { data: res } = await http.get('/roles/my-permissions')
        set({
          permissions: res.data?.permissions || [],
          roles: res.data?.roles || [],
          loaded: true, loading: false, failed: false,
        })
        return
      } catch (err) {
        lastErr = err
        if (attempt < 2) await new Promise((r) => setTimeout(r, 300 * (attempt + 1)))
      }
    }

    // Permanent failure: fail CLOSED (no permissions granted in the UI) and flag
    // so the layout can offer a retry instead of silently exposing restricted UI.
    console.error('[permStore] permission load failed after retries', lastErr)
    set({ permissions: [], roles: [], loaded: true, loading: false, failed: true })
  },

  reload: async () => {
    set({ loaded: false, failed: false })
    await get().loadPermissions({ force: true })
  },

  /** Clear all permission state — call on logout so the next user loads fresh. */
  reset: () => set({ permissions: [], roles: [], loaded: false, loading: false, failed: false }),

  /**
   * Does the user hold (module, action) at any scope?
   * Fails CLOSED: until permissions are successfully loaded, nothing is granted.
   * The backend still enforces every API, so this only controls UI advertising.
   */
  can: (module, action = 'read') => {
    const { permissions, loaded, failed } = get()
    if (!loaded || failed) return false
    return permissions.some((p) => p.module === module && p.action === action)
  },

  /**
   * Does the user hold a given role (from /roles/my-permissions `roles`)?
   * Use this to gate UI for endpoints guarded by requireRole() that have no
   * permission module (e.g. the admin-only bulk credential email). Fails CLOSED:
   * `roles` is empty until a successful load, so this returns false until then.
   */
  hasRole: (roleName) => get().roles.includes(roleName),

  /** The strongest scope held for a module's action (default read). */
  scopeOf: (module, action = 'read') => {
    const rank = { all: 4, course: 3, batch: 2, own: 1 }
    const matches = get().permissions.filter((p) => p.module === module && p.action === action)
    if (!matches.length) return null
    return matches.reduce((a, b) => (rank[b.scope] > rank[a.scope] ? b : a)).scope
  },
}))
