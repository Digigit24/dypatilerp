/**
 * Formats (student view) — download templates shared by the coordinators.
 */
import { Download, FileText, Loader2 } from 'lucide-react'
import { useEffect, useState } from 'react'
import { getFormats } from '../../api/services/formatService.js'
import { createSession, buildDownloadUrl } from '../../api/services/videoService.js'
import PageHeader from '../../components/shared/PageHeader.jsx'
import SkeletonCard from '../../components/shared/SkeletonCard.jsx'
import { useAuthStore } from '../../store/authStore.js'
import { useUiStore } from '../../store/uiStore.js'
import { formatDate } from '../../lib/formatters.js'

const fmtBytes = (b) => !b ? '—' : b >= 1e6 ? `${(b / 1e6).toFixed(1)} MB` : `${(b / 1e3).toFixed(0)} KB`

export default function StudentFormatsPage() {
  const currentUser = useAuthStore((s) => s.currentUser)
  const addToast = useUiStore((s) => s.addToast)
  const [items, setItems] = useState(null)
  const [downloading, setDownloading] = useState(null)

  useEffect(() => {
    const params = {}
    if (currentUser?.course_id) params.course_id = currentUser.course_id
    if (currentUser?.batch_id)  params.batch_id  = currentUser.batch_id
    getFormats(params).then((r) => setItems(r.data || [])).catch(() => setItems([]))
  }, [currentUser?.batch_id])

  const handleDownload = async (f) => {
    if (!f.media_id) return
    setDownloading(f.id)
    try {
      const r = await createSession(f.media_id)
      window.open(buildDownloadUrl(f.media_id, r.data.token), '_blank')
    } catch (err) {
      addToast({ type: 'error', title: 'Download failed', message: err.response?.data?.message })
    } finally { setDownloading(null) }
  }

  if (!items) return <SkeletonCard rows={5} />

  return (
    <div className="fade-page">
      <PageHeader
        title="Formats"
        subtitle="Download official templates for assignments, submissions, and reports."
      />
      {items.length === 0 ? (
        <div className="card flex flex-col items-center gap-3 p-14 text-center">
          <FileText size={30} className="text-[color:var(--muted)]" />
          <p className="text-sm font-semibold text-[color:var(--text)]">No formats available yet</p>
          <p className="text-xs text-[color:var(--secondary)]">Your coordinator will upload templates here.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-3">
          {items.map((f) => (
            <div key={f.id} className="card p-4">
              <div className="flex items-start gap-3">
                <div className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-sky-50 text-sky-600">
                  <FileText size={17} />
                </div>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-semibold text-[color:var(--text)]" title={f.title}>{f.title}</p>
                  <p className="text-[11px] text-[color:var(--secondary)]">{fmtBytes(f.file_size)} · {formatDate(f.created_at)}</p>
                </div>
              </div>
              {f.description && <p className="mt-2 line-clamp-3 text-xs text-[color:var(--secondary)]">{f.description}</p>}
              <button
                onClick={() => handleDownload(f)}
                disabled={downloading === f.id}
                className="mt-3 inline-flex items-center gap-1.5 rounded-xl bg-[color:var(--accent-tint)] px-3 py-1.5 text-xs font-semibold text-[color:var(--accent)] hover:opacity-80 disabled:opacity-50"
              >
                {downloading === f.id ? <Loader2 size={12} className="animate-spin" /> : <Download size={12} />}
                Download
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
