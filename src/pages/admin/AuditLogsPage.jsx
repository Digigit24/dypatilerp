import { ChevronDown, ChevronRight, Filter, RefreshCw, Search, Shield } from 'lucide-react'
import { useEffect, useState } from 'react'
import { getAuditActions, getAuditLogs, getAuditResourceTypes } from '../../api/services/auditService.js'
import { getUsers } from '../../api/services/userService.js'
import PageHeader from '../../components/shared/PageHeader.jsx'
import SkeletonCard from '../../components/shared/SkeletonCard.jsx'
import { useUiStore } from '../../store/uiStore.js'

const ACTION_COLORS = {
  LOGIN: 'bg-blue-100 text-blue-700',
  LOGOUT: 'bg-slate-100 text-slate-600',
  CREATE: 'bg-emerald-100 text-emerald-700',
  UPDATE: 'bg-amber-100 text-amber-700',
  DELETE: 'bg-red-100 text-red-600',
  APPROVE: 'bg-emerald-100 text-emerald-700',
  APPROVAL: 'bg-violet-100 text-violet-700',
  SUBMIT: 'bg-blue-100 text-blue-700',
}
// Verb-based colors for the global audit trail (module.verb format)
const VERB_COLORS = {
  create: 'bg-emerald-100 text-emerald-700',
  upload: 'bg-emerald-100 text-emerald-700',
  import: 'bg-emerald-100 text-emerald-700',
  update: 'bg-amber-100 text-amber-700',
  status_change: 'bg-amber-100 text-amber-700',
  reorder: 'bg-amber-100 text-amber-700',
  permissions_change: 'bg-violet-100 text-violet-700',
  delete: 'bg-red-100 text-red-600',
  publish: 'bg-blue-100 text-blue-700',
  assign: 'bg-indigo-100 text-indigo-700',
  reset_test_link: 'bg-indigo-100 text-indigo-700',
  convert: 'bg-violet-100 text-violet-700',
  bulk_convert: 'bg-violet-100 text-violet-700',
  submit: 'bg-blue-100 text-blue-700',
}

const actionColor = (action) => {
  for (const [prefix, cls] of Object.entries(ACTION_COLORS)) {
    if (action?.startsWith(prefix)) return cls
  }
  const verb = action?.split('.').pop()
  if (verb && VERB_COLORS[verb]) return VERB_COLORS[verb]
  return 'bg-[color:var(--surface)] text-[color:var(--secondary)]'
}

const formatTs = (ts) => new Date(ts).toLocaleString('en-IN', { timeZone: 'Asia/Kolkata', hour12: false, day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit', second: '2-digit' })

export default function AuditLogsPage() {
  const [logs, setLogs]       = useState(null)
  const [total, setTotal]     = useState(0)
  const [page, setPage]       = useState(1)
  const [users, setUsers]     = useState([])
  const [actions, setActions] = useState([])
  const [resTypes, setResTypes] = useState([])
  const [expanded, setExpanded] = useState(null) // log id with open detail
  const addToast = useUiStore((s) => s.addToast)

  // Filters
  const [filters, setFilters] = useState({ action: '', user_id: '', resource_type: '', from: '', to: '' })
  const [filterOpen, setFilterOpen] = useState(false)

  const LIMIT = 50

  const load = async (p = 1) => {
    setLogs(null)
    try {
      const params = { page: p, limit: LIMIT }
      if (filters.action)        params.action = filters.action
      if (filters.user_id)       params.user_id = filters.user_id
      if (filters.resource_type) params.resource_type = filters.resource_type
      if (filters.from)          params.from = filters.from
      if (filters.to)            params.to = filters.to
      const r = await getAuditLogs(params)
      setLogs(r.data || [])
      setTotal(r.total || 0)
      setPage(p)
    } catch (err) {
      addToast({ type: 'error', title: 'Failed to load audit logs', message: err.response?.data?.message })
      setLogs([])
    }
  }

  useEffect(() => {
    load(1)
    Promise.all([getUsers(), getAuditActions(), getAuditResourceTypes()]).then(([u, a, rt]) => {
      setUsers(u.data || [])
      setActions(a.data || [])
      setResTypes(rt.data || [])
    })
  }, [])

  const ff = (key) => ({
    value: filters[key],
    onChange: (e) => setFilters((p) => ({ ...p, [key]: e.target.value })),
  })

  const totalPages = Math.ceil(total / LIMIT)

  return (
    <div className="fade-page">
      <PageHeader
        title="Audit Logs"
        subtitle="Read-only trail of all system actions, logins, and mutations."
        action={
          <button className="inline-flex items-center gap-2 rounded-2xl border border-[color:var(--border)] bg-[color:var(--card)] px-4 py-2.5 text-sm font-semibold text-[color:var(--secondary)] hover:text-[color:var(--accent)]"
            onClick={() => load(1)}>
            <RefreshCw size={15} /> Refresh
          </button>
        }
      />

      {/* Filter bar */}
      <div className="mb-5 card p-4 space-y-3">
        <div className="flex items-center gap-3 flex-wrap">
          <button
            className={`flex items-center gap-2 rounded-2xl px-4 py-2 text-sm font-semibold transition ${filterOpen ? 'bg-[color:var(--accent-tint)] text-[color:var(--accent)]' : 'bg-[color:var(--surface)] text-[color:var(--secondary)]'}`}
            onClick={() => setFilterOpen((v) => !v)}
          >
            <Filter size={14} /> Filters {filterOpen ? <ChevronDown size={13} /> : <ChevronRight size={13} />}
          </button>
          <span className="text-sm text-[color:var(--secondary)]">{total.toLocaleString()} entries</span>
          {Object.values(filters).some(Boolean) && (
            <button className="text-xs font-semibold text-[color:var(--accent)]"
              onClick={() => { setFilters({ action:'',user_id:'',resource_type:'',from:'',to:'' }); load(1) }}>
              Clear filters
            </button>
          )}
          <button className="ml-auto btn-primary text-sm px-4 py-2" onClick={() => load(1)}>Apply</button>
        </div>

        {filterOpen && (
          <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-5">
            <label className="block">
              <span className="text-xs font-semibold text-[color:var(--muted)]">Action</span>
              <select className="input mt-1 w-full text-sm" {...ff('action')}>
                <option value="">All actions</option>
                {actions.map((a) => <option key={a} value={a}>{a}</option>)}
              </select>
            </label>
            <label className="block">
              <span className="text-xs font-semibold text-[color:var(--muted)]">User</span>
              <select className="input mt-1 w-full text-sm" {...ff('user_id')}>
                <option value="">All users</option>
                {users.map((u) => <option key={u.id} value={u.id}>{u.first_name} {u.last_name}</option>)}
              </select>
            </label>
            <label className="block">
              <span className="text-xs font-semibold text-[color:var(--muted)]">Resource Type</span>
              <select className="input mt-1 w-full text-sm" {...ff('resource_type')}>
                <option value="">All types</option>
                {resTypes.map((r) => <option key={r} value={r}>{r}</option>)}
              </select>
            </label>
            <label className="block">
              <span className="text-xs font-semibold text-[color:var(--muted)]">From</span>
              <input className="input mt-1 w-full text-sm" type="date" {...ff('from')} />
            </label>
            <label className="block">
              <span className="text-xs font-semibold text-[color:var(--muted)]">To</span>
              <input className="input mt-1 w-full text-sm" type="date" {...ff('to')} />
            </label>
          </div>
        )}
      </div>

      {!logs ? <SkeletonCard rows={10} /> : (
        <>
          <div className="card overflow-hidden">
            <div className="overflow-x-auto">
              <table className="min-w-[820px] w-full text-left text-sm">
                <thead className="text-xs font-semibold uppercase tracking-wide text-[color:var(--muted)]">
                  <tr>{['Timestamp', 'User', 'Action', 'Resource', 'IP Address', ''].map((h) => <th key={h} className="px-5 py-4">{h}</th>)}</tr>
                </thead>
                <tbody>
                  {logs.length === 0 && (
                    <tr><td colSpan={6} className="px-5 py-16 text-center text-[color:var(--secondary)]">
                      No audit entries found. Log in and perform an action to generate entries.
                    </td></tr>
                  )}
                  {logs.map((log) => (
                    <>
                      <tr
                        key={log.id}
                        className={`border-b border-[color:var(--border)] cursor-pointer transition ${expanded === log.id ? 'bg-[color:var(--accent-tint)]' : 'hover:bg-[color:var(--surface)]'}`}
                        onClick={() => setExpanded(expanded === log.id ? null : log.id)}
                      >
                        <td className="px-5 py-4 font-mono text-xs text-[color:var(--secondary)] whitespace-nowrap">
                          {formatTs(log.created_at)}
                        </td>
                        <td className="px-5">
                          <p className="font-semibold text-[color:var(--text)]">{log.actor_name || '—'}</p>
                          <p className="text-xs text-[color:var(--secondary)]">{log.actor_email || 'System'}</p>
                        </td>
                        <td className="px-5">
                          <span className={`rounded-full px-2.5 py-1 text-xs font-semibold ${actionColor(log.action)}`}>
                            {log.action}
                          </span>
                        </td>
                        <td className="px-5 text-[color:var(--secondary)]">
                          {log.resource_type && (
                            <span>{log.resource_type}</span>
                          )}
                          {log.resource_id && (
                            <p className="font-mono text-[10px] text-[color:var(--muted)] mt-0.5">{log.resource_id.slice(0, 8)}…</p>
                          )}
                        </td>
                        <td className="px-5 font-mono text-xs text-[color:var(--muted)]">{log.ip_address || '—'}</td>
                        <td className="px-5">
                          {log.changes && (
                            <ChevronDown size={14} className={`text-[color:var(--muted)] transition-transform ${expanded === log.id ? 'rotate-180' : ''}`} />
                          )}
                        </td>
                      </tr>
                      {expanded === log.id && log.changes && (
                        <tr key={`${log.id}-detail`} className="bg-[color:var(--accent-tint)] border-b border-[color:var(--border)]">
                          <td colSpan={6} className="px-5 py-4">
                            <p className="mb-2 text-xs font-bold uppercase tracking-wide text-[color:var(--accent)]">Change Payload</p>
                            <pre className="overflow-auto rounded-2xl bg-[color:var(--card)] p-4 text-xs leading-5 text-[color:var(--text)] font-mono max-h-60">
                              {JSON.stringify(log.changes, null, 2)}
                            </pre>
                          </td>
                        </tr>
                      )}
                    </>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="mt-5 flex items-center justify-between text-sm">
              <span className="text-[color:var(--secondary)]">
                Page {page} of {totalPages} · {total.toLocaleString()} entries
              </span>
              <div className="flex gap-2">
                <button className="rounded-2xl border border-[color:var(--border)] px-4 py-2 font-semibold text-[color:var(--secondary)] disabled:opacity-40"
                  disabled={page <= 1} onClick={() => load(page - 1)}>← Prev</button>
                <button className="rounded-2xl border border-[color:var(--border)] px-4 py-2 font-semibold text-[color:var(--secondary)] disabled:opacity-40"
                  disabled={page >= totalPages} onClick={() => load(page + 1)}>Next →</button>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  )
}
