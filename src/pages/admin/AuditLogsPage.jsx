import { ChevronDown, ChevronRight, Filter, Mail, RefreshCw, Search, Shield } from 'lucide-react'
import { useEffect, useState } from 'react'
import { getAuditActions, getAuditLogs, getAuditResourceTypes } from '../../api/services/auditService.js'
import { getEmailLogKinds, getEmailLogs } from '../../api/services/emailLogsService.js'
import { getUsers } from '../../api/services/userService.js'
import DatePicker from '../../components/shared/DatePicker.jsx'
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

const EMAIL_STATUS_COLORS = {
  sent: 'bg-emerald-100 text-emerald-700',
  failed: 'bg-red-100 text-red-600',
  mock: 'bg-slate-100 text-slate-600',
}

const formatTs = (ts) => new Date(ts).toLocaleString('en-IN', { timeZone: 'Asia/Kolkata', hour12: false, day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit', second: '2-digit' })

export default function AuditLogsPage() {
  const [tab, setTab] = useState('actions') // 'actions' | 'emails'
  const addToast = useUiStore((s) => s.addToast)

  // ── Actions tab state ───────────────────────────────────────────────────
  const [logs, setLogs]       = useState(null)
  const [total, setTotal]     = useState(0)
  const [page, setPage]       = useState(1)
  const [users, setUsers]     = useState([])
  const [actions, setActions] = useState([])
  const [resTypes, setResTypes] = useState([])
  const [expanded, setExpanded] = useState(null) // log id with open detail

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

  // ── Emails tab state ────────────────────────────────────────────────────
  const [emailLogs, setEmailLogs] = useState(null)
  const [emailTotal, setEmailTotal] = useState(0)
  const [emailPage, setEmailPage] = useState(1)
  const [emailKinds, setEmailKinds] = useState([])
  const [emailExpanded, setEmailExpanded] = useState(null)
  const [emailFilters, setEmailFilters] = useState({ status: '', kind: '', recipient: '', from: '', to: '' })
  const [emailFilterOpen, setEmailFilterOpen] = useState(false)

  const loadEmails = async (p = 1) => {
    setEmailLogs(null)
    try {
      const params = { page: p, limit: LIMIT }
      if (emailFilters.status)    params.status = emailFilters.status
      if (emailFilters.kind)      params.kind = emailFilters.kind
      if (emailFilters.recipient) params.recipient = emailFilters.recipient
      if (emailFilters.from)      params.from = emailFilters.from
      if (emailFilters.to)        params.to = emailFilters.to
      const r = await getEmailLogs(params)
      setEmailLogs(r.data || [])
      setEmailTotal(r.total || 0)
      setEmailPage(p)
    } catch (err) {
      addToast({ type: 'error', title: 'Failed to load email logs', message: err.response?.data?.message })
      setEmailLogs([])
    }
  }

  // Lazy-load — the emails tab's data isn't fetched until it's first opened.
  useEffect(() => {
    if (tab === 'emails' && emailLogs === null) {
      loadEmails(1)
      getEmailLogKinds().then((r) => setEmailKinds(r.data || [])).catch(() => setEmailKinds([]))
    }
  }, [tab])

  const eff = (key) => ({
    value: emailFilters[key],
    onChange: (e) => setEmailFilters((p) => ({ ...p, [key]: e.target.value })),
  })

  const emailTotalPages = Math.ceil(emailTotal / LIMIT)

  return (
    <div className="fade-page">
      <PageHeader
        title="Audit Logs"
        subtitle="Read-only trail of all system actions, logins, mutations, and outbound emails."
        action={
          <button className="inline-flex items-center gap-2 rounded-lg border border-[color:var(--border)] bg-[color:var(--card)] px-4 py-2.5 text-sm font-semibold text-[color:var(--secondary)] hover:text-[color:var(--accent)]"
            onClick={() => (tab === 'actions' ? load(1) : loadEmails(emailPage))}>
            <RefreshCw size={15} /> Refresh
          </button>
        }
      />

      {/* Tab switcher */}
      <div className="mb-5 flex gap-2">
        <button
          onClick={() => setTab('actions')}
          className={`flex items-center gap-2 rounded-lg px-4 py-2.5 text-sm font-semibold transition ${tab === 'actions' ? 'bg-[color:var(--accent)] text-white' : 'bg-[color:var(--card)] text-[color:var(--secondary)] border border-[color:var(--border)]'}`}
        >
          <Shield size={15} /> Actions
        </button>
        <button
          onClick={() => setTab('emails')}
          className={`flex items-center gap-2 rounded-lg px-4 py-2.5 text-sm font-semibold transition ${tab === 'emails' ? 'bg-[color:var(--accent)] text-white' : 'bg-[color:var(--card)] text-[color:var(--secondary)] border border-[color:var(--border)]'}`}
        >
          <Mail size={15} /> Emails
        </button>
      </div>

      {tab === 'actions' && (
        <>
          {/* Filter bar */}
          <div className="mb-5 card p-4 space-y-3">
            <div className="flex items-center gap-3 flex-wrap">
              <button
                className={`flex items-center gap-2 rounded-lg px-4 py-2 text-sm font-semibold transition ${filterOpen ? 'bg-[color:var(--accent-tint)] text-[color:var(--accent)]' : 'bg-[color:var(--surface)] text-[color:var(--secondary)]'}`}
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
                  <DatePicker className="mt-1" value={filters.from} onChange={(v) => setFilters((p) => ({ ...p, from: v }))} />
                </label>
                <label className="block">
                  <span className="text-xs font-semibold text-[color:var(--muted)]">To</span>
                  <DatePicker className="mt-1" value={filters.to} onChange={(v) => setFilters((p) => ({ ...p, to: v }))} />
                </label>
              </div>
            )}
          </div>

          {!logs ? <SkeletonCard rows={10} /> : (
            <>
              <div className="card overflow-hidden">
                <div className="table-wrap">
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
                                <pre className="overflow-auto rounded-lg bg-[color:var(--card)] p-4 text-xs leading-5 text-[color:var(--text)] font-mono max-h-60">
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
                    <button className="rounded-lg border border-[color:var(--border)] px-4 py-2 font-semibold text-[color:var(--secondary)] disabled:opacity-40"
                      disabled={page <= 1} onClick={() => load(page - 1)}>← Prev</button>
                    <button className="rounded-lg border border-[color:var(--border)] px-4 py-2 font-semibold text-[color:var(--secondary)] disabled:opacity-40"
                      disabled={page >= totalPages} onClick={() => load(page + 1)}>Next →</button>
                  </div>
                </div>
              )}
            </>
          )}
        </>
      )}

      {tab === 'emails' && (
        <>
          {/* Filter bar */}
          <div className="mb-5 card p-4 space-y-3">
            <div className="flex items-center gap-3 flex-wrap">
              <button
                className={`flex items-center gap-2 rounded-lg px-4 py-2 text-sm font-semibold transition ${emailFilterOpen ? 'bg-[color:var(--accent-tint)] text-[color:var(--accent)]' : 'bg-[color:var(--surface)] text-[color:var(--secondary)]'}`}
                onClick={() => setEmailFilterOpen((v) => !v)}
              >
                <Filter size={14} /> Filters {emailFilterOpen ? <ChevronDown size={13} /> : <ChevronRight size={13} />}
              </button>
              <span className="text-sm text-[color:var(--secondary)]">{emailTotal.toLocaleString()} entries</span>
              {Object.values(emailFilters).some(Boolean) && (
                <button className="text-xs font-semibold text-[color:var(--accent)]"
                  onClick={() => { setEmailFilters({ status:'',kind:'',recipient:'',from:'',to:'' }); loadEmails(1) }}>
                  Clear filters
                </button>
              )}
              <button className="ml-auto btn-primary text-sm px-4 py-2" onClick={() => loadEmails(1)}>Apply</button>
            </div>

            {emailFilterOpen && (
              <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-5">
                <label className="block">
                  <span className="text-xs font-semibold text-[color:var(--muted)]">Status</span>
                  <select className="input mt-1 w-full text-sm" {...eff('status')}>
                    <option value="">All statuses</option>
                    <option value="sent">Sent</option>
                    <option value="failed">Failed</option>
                    <option value="mock">Mock (no provider configured)</option>
                  </select>
                </label>
                <label className="block">
                  <span className="text-xs font-semibold text-[color:var(--muted)]">Kind</span>
                  <select className="input mt-1 w-full text-sm" {...eff('kind')}>
                    <option value="">All kinds</option>
                    {emailKinds.map((k) => <option key={k} value={k}>{k}</option>)}
                  </select>
                </label>
                <label className="block sm:col-span-2 xl:col-span-1">
                  <span className="text-xs font-semibold text-[color:var(--muted)]">Recipient</span>
                  <div className="relative mt-1">
                    <Search size={14} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-[color:var(--muted)]" />
                    <input className="input w-full pl-9 text-sm" placeholder="name@example.com" {...eff('recipient')} />
                  </div>
                </label>
                <label className="block">
                  <span className="text-xs font-semibold text-[color:var(--muted)]">From</span>
                  <DatePicker className="mt-1" value={emailFilters.from} onChange={(v) => setEmailFilters((p) => ({ ...p, from: v }))} />
                </label>
                <label className="block">
                  <span className="text-xs font-semibold text-[color:var(--muted)]">To</span>
                  <DatePicker className="mt-1" value={emailFilters.to} onChange={(v) => setEmailFilters((p) => ({ ...p, to: v }))} />
                </label>
              </div>
            )}
          </div>

          {!emailLogs ? <SkeletonCard rows={10} /> : (
            <>
              <div className="card overflow-hidden">
                <div className="table-wrap">
                  <table className="min-w-[860px] w-full text-left text-sm">
                    <thead className="text-xs font-semibold uppercase tracking-wide text-[color:var(--muted)]">
                      <tr>{['Sent At', 'Recipient', 'Subject', 'Kind', 'Status', 'Via', ''].map((h) => <th key={h} className="px-5 py-4">{h}</th>)}</tr>
                    </thead>
                    <tbody>
                      {emailLogs.length === 0 && (
                        <tr><td colSpan={7} className="px-5 py-16 text-center text-[color:var(--secondary)]">
                          No email history found yet.
                        </td></tr>
                      )}
                      {emailLogs.map((log) => (
                        <>
                          <tr
                            key={log.id}
                            className={`border-b border-[color:var(--border)] cursor-pointer transition ${emailExpanded === log.id ? 'bg-[color:var(--accent-tint)]' : 'hover:bg-[color:var(--surface)]'}`}
                            onClick={() => setEmailExpanded(emailExpanded === log.id ? null : log.id)}
                          >
                            <td className="px-5 py-4 font-mono text-xs text-[color:var(--secondary)] whitespace-nowrap">
                              {formatTs(log.created_at)}
                            </td>
                            <td className="px-5">
                              <p className="text-[color:var(--text)]">{log.to_email}</p>
                              {log.cc && <p className="text-xs text-[color:var(--secondary)]">cc: {log.cc}</p>}
                            </td>
                            <td className="px-5 max-w-[280px] truncate text-[color:var(--secondary)]" title={log.subject}>{log.subject || '—'}</td>
                            <td className="px-5">
                              {log.kind && (
                                <span className="rounded-full bg-[color:var(--surface)] px-2.5 py-1 text-xs font-semibold text-[color:var(--secondary)]">
                                  {log.kind}
                                </span>
                              )}
                            </td>
                            <td className="px-5">
                              <span className={`rounded-full px-2.5 py-1 text-xs font-semibold ${EMAIL_STATUS_COLORS[log.status] || 'bg-[color:var(--surface)] text-[color:var(--secondary)]'}`}>
                                {log.status}
                              </span>
                            </td>
                            <td className="px-5 font-mono text-xs text-[color:var(--muted)] uppercase">{log.via || '—'}</td>
                            <td className="px-5">
                              {(log.error || log.provider_message_id) && (
                                <ChevronDown size={14} className={`text-[color:var(--muted)] transition-transform ${emailExpanded === log.id ? 'rotate-180' : ''}`} />
                              )}
                            </td>
                          </tr>
                          {emailExpanded === log.id && (log.error || log.provider_message_id) && (
                            <tr key={`${log.id}-detail`} className="bg-[color:var(--accent-tint)] border-b border-[color:var(--border)]">
                              <td colSpan={7} className="px-5 py-4 text-sm">
                                {log.provider_message_id && (
                                  <p><span className="font-semibold text-[color:var(--text)]">Message ID:</span> <span className="font-mono text-xs">{log.provider_message_id}</span></p>
                                )}
                                {log.error && (
                                  <p className="mt-1 text-red-600"><span className="font-semibold">Error:</span> {log.error}</p>
                                )}
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
              {emailTotalPages > 1 && (
                <div className="mt-5 flex items-center justify-between text-sm">
                  <span className="text-[color:var(--secondary)]">
                    Page {emailPage} of {emailTotalPages} · {emailTotal.toLocaleString()} entries
                  </span>
                  <div className="flex gap-2">
                    <button className="rounded-lg border border-[color:var(--border)] px-4 py-2 font-semibold text-[color:var(--secondary)] disabled:opacity-40"
                      disabled={emailPage <= 1} onClick={() => loadEmails(emailPage - 1)}>← Prev</button>
                    <button className="rounded-lg border border-[color:var(--border)] px-4 py-2 font-semibold text-[color:var(--secondary)] disabled:opacity-40"
                      disabled={emailPage >= emailTotalPages} onClick={() => loadEmails(emailPage + 1)}>Next →</button>
                  </div>
                </div>
              )}
            </>
          )}
        </>
      )}
    </div>
  )
}
