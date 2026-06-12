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
  loaded: false,
  failed: false,     // endpoint unreachable (e.g. older backend) -> fail OPEN

  loadPermissions: async () => {
    if (get().loaded) return
    try {
      const { data: res } = await http.get('/roles/my-permissions')
      set({ permissions: res.data?.permissions || [], roles: res.data?.roles || [], loaded: true, failed: false })
    } catch {
      // Fail OPEN in the UI: show everything and let the backend's own
      // permission checks be the authority. Never lock an admin out of
      // the sidebar because of a fetch hiccup or an un-deployed backend.
      set({ loaded: true, failed: true })
    }
  },

  reload: async () => {
    set({ loaded: false, failed: false })
    await get().loadPermissions()
  },

  /** Does the user hold (module, action) at any scope? */
  can: (module, action = 'read') => {
    const { permissions, loaded, failed } = get()
    if (!loaded || failed) return true // optimistic; backend is the authority
    return permissions.some((p) => p.module === module && p.action === action)
  },

  /** The strongest scope held for a module's action (default read). */
  scopeOf: (module, action = 'read') => {
    const rank = { all: 4, course: 3, batch: 2, own: 1 }
    const matches = get().permissions.filter((p) => p.module === module && p.action === action)
    if (!matches.length) return null
    return matches.reduce((a, b) => (rank[b.scope] > rank[a.scope] ? b : a)).scope
  },
}))
