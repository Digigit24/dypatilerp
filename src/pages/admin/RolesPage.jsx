import { Check, Loader, Shield } from 'lucide-react'
import { useEffect, useState } from 'react'
import { getAllPermissions, getRolePermissions, getRoles, updateRolePermissions } from '../../api/services/rolesService.js'
import PageHeader from '../../components/shared/PageHeader.jsx'
import SkeletonCard from '../../components/shared/SkeletonCard.jsx'
import { useUiStore } from '../../store/uiStore.js'

const PROTECTED_ROLES = ['admin'] // admin always has all perms — don't allow removing
const ACTION_COLORS = { create: 'text-emerald-600', read: 'text-blue-600', update: 'text-amber-600', delete: 'text-red-500' }
const ACTION_BG    = { create: 'bg-emerald-50', read: 'bg-blue-50', update: 'bg-amber-50', delete: 'bg-red-50' }

// Scope ladder: how far a granted permission reaches
const SCOPES = [
  { value: 'all',    label: 'All',    hint: 'Everything, everywhere' },
  { value: 'course', label: 'Course', hint: 'Only courses this user is assigned to' },
  { value: 'batch',  label: 'Batch',  hint: 'Only batches this user is assigned to' },
  { value: 'own',    label: 'Own',    hint: "Only the user's own records" },
]

export default function RolesPage() {
  const [roles, setRoles] = useState(null)
  const [allPerms, setAllPerms] = useState({}) // { module: [{id, module, action}] }
  const [selected, setSelected] = useState(null) // current role being edited
  const [granted, setGranted] = useState(new Map()) // permission ID -> scope
  const [saving, setSaving] = useState(false)
  const [dirty, setDirty] = useState(false)
  const addToast = useUiStore((s) => s.addToast)

  useEffect(() => {
    Promise.all([getRoles(), getAllPermissions()]).then(([r, p]) => {
      setRoles(r.data || [])
      setAllPerms(p.data || {})
    })
  }, [])

  const selectRole = async (role) => {
    setSelected(role)
    setDirty(false)
    const r = await getRolePermissions(role.id)
    setGranted(new Map((r.data || []).map((p) => [p.id, p.scope || 'all'])))
  }

  const toggle = (permId) => {
    if (PROTECTED_ROLES.includes(selected?.name)) return
    setGranted((prev) => {
      const next = new Map(prev)
      next.has(permId) ? next.delete(permId) : next.set(permId, 'all')
      return next
    })
    setDirty(true)
  }

  const setScope = (permId, scope) => {
    if (PROTECTED_ROLES.includes(selected?.name)) return
    setGranted((prev) => {
      const next = new Map(prev)
      next.set(permId, scope)
      return next
    })
    setDirty(true)
  }

  const toggleModule = (modulePerms) => {
    if (PROTECTED_ROLES.includes(selected?.name)) return
    const ids = modulePerms.map((p) => p.id)
    const allGranted = ids.every((id) => granted.has(id))
    setGranted((prev) => {
      const next = new Map(prev)
      allGranted ? ids.forEach((id) => next.delete(id)) : ids.forEach((id) => { if (!next.has(id)) next.set(id, 'all') })
      return next
    })
    setDirty(true)
  }

  const handleSave = async () => {
    if (!selected) return
    setSaving(true)
    try {
      const grants = [...granted.entries()].map(([permission_id, scope]) => ({ permission_id, scope }))
      await updateRolePermissions(selected.id, grants)
      addToast({ type: 'success', title: `Permissions saved for ${selected.display_name}.` })
      setDirty(false)
    } catch (err) {
      addToast({ type: 'error', title: 'Save failed', message: err.response?.data?.message || 'Something went wrong' })
    } finally { setSaving(false) }
  }

  if (!roles) return <SkeletonCard rows={8} />

  const modules = Object.entries(allPerms)
  const totalPerms = modules.reduce((s, [, ps]) => s + ps.length, 0)

  return (
    <div className="fade-page">
      <PageHeader title="Roles & Permissions" subtitle="Define what each role can do across all modules." />

      <div className="grid gap-6 lg:grid-cols-[240px_1fr]">
        {/* Role list */}
        <div className="card p-4">
          <p className="mb-3 px-2 text-xs font-bold uppercase tracking-[0.14em] text-[color:var(--muted)]">Roles</p>
          <div className="space-y-1">
            {roles.map((role) => {
              const isProtected = PROTECTED_ROLES.includes(role.name)
              return (
                <button
                  key={role.id}
                  className={`flex w-full items-center gap-3 rounded-2xl px-3 py-3 text-left text-sm transition ${selected?.id === role.id ? 'bg-[color:var(--accent-tint)] text-[color:var(--accent)]' : 'text-[color:var(--secondary)] hover:bg-[color:var(--surface)]'}`}
                  onClick={() => selectRole(role)}
                >
                  <Shield size={15} className="shrink-0" />
                  <span className="flex-1 font-semibold">{role.display_name}</span>
                  {isProtected && <span className="rounded-full bg-amber-100 px-2 py-0.5 text-[10px] font-bold text-amber-700">PROTECTED</span>}
                </button>
              )
            })}
          </div>
        </div>

        {/* Permission matrix */}
        {selected ? (
          <div className="card overflow-hidden">
            <div className="flex items-center justify-between border-b border-[color:var(--border)] px-6 py-4">
              <div>
                <h2 className="font-semibold text-[color:var(--text)]">{selected.display_name}</h2>
                <p className="text-sm text-[color:var(--secondary)]">
                  {granted.size} / {totalPerms} permissions granted
                  {PROTECTED_ROLES.includes(selected.name) && <span className="ml-2 text-amber-600 font-semibold">(read-only)</span>}
                </p>
              </div>
              {dirty && !PROTECTED_ROLES.includes(selected.name) && (
                <button className="btn-primary inline-flex items-center gap-2 text-sm" onClick={handleSave} disabled={saving}>
                  {saving ? <Loader size={14} className="animate-spin" /> : <Check size={14} />}
                  {saving ? 'Saving…' : 'Save Changes'}
                </button>
              )}
            </div>

            <div className="divide-y divide-[color:var(--border)]">
              {modules.map(([moduleName, perms]) => {
                const allGranted = perms.every((p) => granted.has(p.id))
                const someGranted = perms.some((p) => granted.has(p.id))
                return (
                  <div key={moduleName} className="px-6 py-4">
                    <div className="flex items-center gap-3">
                      <button
                        className={`flex items-center gap-2 rounded-xl px-3 py-1.5 text-xs font-bold uppercase tracking-wide transition ${
                          allGranted ? 'bg-[color:var(--accent-tint)] text-[color:var(--accent)]' :
                          someGranted ? 'bg-[color:var(--surface)] text-[color:var(--secondary)]' :
                          'bg-[color:var(--surface)] text-[color:var(--muted)]'
                        }`}
                        onClick={() => toggleModule(perms)}
                        disabled={PROTECTED_ROLES.includes(selected.name)}
                      >
                        {allGranted && <Check size={11} />}
                        {moduleName.replace('_', ' ')}
                      </button>
                      <div className="flex flex-wrap gap-2">
                        {perms.map((perm) => {
                          const isGranted = granted.has(perm.id)
                          const scope = granted.get(perm.id) || 'all'
                          const locked = PROTECTED_ROLES.includes(selected.name)
                          return (
                            <span key={perm.id} className={`flex items-center overflow-hidden rounded-full text-xs font-semibold transition ${
                              isGranted
                                ? `${ACTION_BG[perm.action]} ${ACTION_COLORS[perm.action]}`
                                : 'bg-[color:var(--surface)] text-[color:var(--muted)] opacity-50'
                            }`}>
                              <button
                                onClick={() => toggle(perm.id)}
                                disabled={locked}
                                className="flex items-center gap-1.5 px-3 py-1"
                              >
                                {isGranted && <Check size={10} />}
                                {perm.action}
                              </button>
                              {isGranted && !locked && (
                                <select
                                  value={scope}
                                  onChange={(e) => setScope(perm.id, e.target.value)}
                                  title={SCOPES.find((s) => s.value === scope)?.hint}
                                  className="cursor-pointer border-l border-black/10 bg-transparent py-1 pl-1.5 pr-1 text-[10px] font-bold uppercase outline-none"
                                >
                                  {SCOPES.map((s) => <option key={s.value} value={s.value}>{s.label}</option>)}
                                </select>
                              )}
                              {isGranted && locked && (
                                <span className="border-l border-black/10 py-1 pl-1.5 pr-2 text-[10px] font-bold uppercase">{scope}</span>
                              )}
                            </span>
                          )
                        })}
                      </div>
                    </div>
                  </div>
                )
              })}
            </div>
          </div>
        ) : (
          <div className="card flex items-center justify-center p-16 text-center">
            <div>
              <Shield size={40} className="mx-auto text-[color:var(--accent)] opacity-30" />
              <p className="mt-4 font-semibold text-[color:var(--text)]">Select a role</p>
              <p className="mt-1 text-sm text-[color:var(--secondary)]">Choose a role from the left to view and edit its permissions.</p>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
