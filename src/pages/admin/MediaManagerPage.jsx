import {
  BarChart2, CheckCircle2, ChevronRight, Eye, File, FileText, Film,
  Folder, FolderPlus, Grid as GridIcon, Home, Image as ImageIcon, LayoutList,
  Loader, MoreVertical, Music, PenLine, Search, Trash2, Upload, UploadCloud, X, XCircle,
} from 'lucide-react'
import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  buildThumbnailUrl, createFolder, createVideo, deleteFolder, deleteVideo,
  getFolderPath, getFolders, getVideoAnalytics, getVideos, updateFolder, updateVideo,
} from '../../api/services/videoService.js'
import { getBatches } from '../../api/services/batchService.js'
import PageHeader from '../../components/shared/PageHeader.jsx'
import SkeletonCard from '../../components/shared/SkeletonCard.jsx'
import { useCourseStore } from '../../store/courseStore.js'
import { useUiStore } from '../../store/uiStore.js'
import useScrollLock from '../../hooks/useScrollLock.js'
import { formatDate } from '../../lib/formatters.js'

// ─── helpers ───────────────────────────────────────────────────────────────────
const fmtDuration = (sec) => sec ? `${Math.floor(sec / 60)}:${String(sec % 60).padStart(2, '0')}` : null
const fmtBytes = (b) => !b ? '—' : b >= 1e9 ? `${(b / 1e9).toFixed(1)} GB` : b >= 1e6 ? `${(b / 1e6).toFixed(1)} MB` : `${(b / 1e3).toFixed(0)} KB`

const detectType = (mime = '') => {
  if (mime.startsWith('video/')) return 'video'
  if (mime.startsWith('image/')) return 'image'
  if (mime.startsWith('audio/')) return 'audio'
  if (/pdf|msword|officedocument|text\/|csv|rtf|spreadsheet|presentation/.test(mime)) return 'document'
  return 'other'
}

const TYPE_META = {
  video:    { icon: Film,      label: 'Video',    tint: 'bg-indigo-50 text-indigo-600' },
  image:    { icon: ImageIcon, label: 'Image',    tint: 'bg-emerald-50 text-emerald-600' },
  audio:    { icon: Music,     label: 'Audio',    tint: 'bg-amber-50 text-amber-600' },
  document: { icon: FileText,  label: 'Document', tint: 'bg-sky-50 text-sky-600' },
  other:    { icon: File,      label: 'File',     tint: 'bg-slate-100 text-slate-500' },
}

const TYPE_FILTERS = [
  { key: 'all',      label: 'All' },
  { key: 'video',    label: 'Videos' },
  { key: 'image',    label: 'Images' },
  { key: 'audio',    label: 'Audio' },
  { key: 'document', label: 'Documents' },
  { key: 'other',    label: 'Other' },
]

const API_BASE = import.meta.env.VITE_API_URL || 'https://dypatilerp.celiyo.com/api'

const toQueueItem = (file) => ({
  key: `${file.name}_${file.size}_${Math.random().toString(36).slice(2)}`,
  file,
  title: file.name.replace(/\.[^.]+$/, ''),
  status: 'pending', // pending | uploading | done | error
  pct: 0,
  error: null,
})

// ─── Main page ──────────────────────────────────────────────────────────────────
export default function MediaManagerPage() {
  const { currentCourse } = useCourseStore()
  const addToast = useUiStore((s) => s.addToast)
  const navigate = useNavigate()

  const [items, setItems]           = useState(null)
  const [folders, setFolders]       = useState([])
  const [allFolders, setAllFolders] = useState([])
  const [path, setPath]             = useState([])           // breadcrumb [{id,name}]
  const [folderId, setFolderId]     = useState(null)         // null = root
  const [search, setSearch]         = useState('')
  const [typeFilter, setTypeFilter] = useState('all')
  const [view, setView]             = useState('grid')

  const [uploadOpen, setUploadOpen] = useState(false)
  const [dropFiles, setDropFiles]   = useState(null)
  const [editItem, setEditItem]     = useState(null)
  const [analyticsFor, setAnalyticsFor] = useState(null)
  const [folderModal, setFolderModal]   = useState(null)     // {mode:'create'|'rename', folder?}
  const [menuFor, setMenuFor]       = useState(null)
  const [dragging, setDragging]     = useState(false)

  useScrollLock(uploadOpen || !!editItem || !!analyticsFor || !!folderModal)

  const load = useCallback(async () => {
    if (!currentCourse?.id) { setItems([]); setFolders([]); return }
    const searching = search.trim().length > 0
    const mediaParams = { course_id: currentCourse.id, limit: 500 }
    if (!searching) mediaParams.folder_id = folderId || 'root'
    const [mr, fr, af] = await Promise.all([
      getVideos(mediaParams),
      searching ? Promise.resolve({ data: [] }) : getFolders({ course_id: currentCourse.id, parent_id: folderId || 'root' }),
      getFolders({ course_id: currentCourse.id }),
    ])
    setItems(mr.data || [])
    setFolders(fr.data || [])
    setAllFolders(af.data || [])
  }, [currentCourse?.id, folderId, search])

  useEffect(() => { load() }, [load])

  useEffect(() => {
    if (!folderId) { setPath([]); return }
    getFolderPath(folderId).then((r) => setPath(r.data || [])).catch(() => setPath([]))
  }, [folderId])

  // close context menus on outside click
  useEffect(() => {
    const close = () => setMenuFor(null)
    if (menuFor) { window.addEventListener('click', close); return () => window.removeEventListener('click', close) }
  }, [menuFor])

  const visible = useMemo(() => {
    let list = items || []
    const q = search.trim().toLowerCase()
    if (q) list = list.filter((m) => (m.title || '').toLowerCase().includes(q))
    if (typeFilter !== 'all') list = list.filter((m) => (m.media_type || 'video') === typeFilter)
    return list
  }, [items, search, typeFilter])

  // ── actions ──────────────────────────────────────────────────────────────
  const openFolder = (f) => { setSearch(''); setFolderId(f?.id || null) }

  const handleDeleteMedia = async (m) => {
    if (!confirm(`Delete "${m.title}"? This cannot be undone.`)) return
    try {
      await deleteVideo(m.id)
      addToast({ type: 'success', title: 'Deleted.' })
      load()
    } catch (err) {
      addToast({ type: 'error', title: 'Delete failed', message: err.response?.data?.message })
    }
  }

  const handleDeleteFolder = async (f) => {
    if (!confirm(`Delete folder "${f.name}"? Files inside move up one level.`)) return
    try {
      await deleteFolder(f.id)
      addToast({ type: 'success', title: 'Folder deleted.' })
      load()
    } catch (err) {
      addToast({ type: 'error', title: 'Delete failed', message: err.response?.data?.message })
    }
  }

  const togglePublish = async (m) => {
    await updateVideo(m.id, { is_published: !m.is_published })
    setItems((xs) => xs.map((x) => x.id === m.id ? { ...x, is_published: !m.is_published } : x))
  }

  const onDrop = (e) => {
    e.preventDefault()
    setDragging(false)
    const files = [...(e.dataTransfer?.files || [])]
    if (files.length) { setDropFiles(files); setUploadOpen(true) }
  }

  if (!currentCourse?.id) {
    return (
      <div className="fade-page">
        <PageHeader title="Media Manager" subtitle="Upload and organize videos, documents, images, and other files." />
        <div className="card flex flex-col items-center justify-center gap-3 p-16 text-center">
          <Folder size={32} className="text-[color:var(--muted)]" />
          <p className="font-semibold text-[color:var(--text)]">Select a course first</p>
          <p className="max-w-sm text-sm text-[color:var(--secondary)]">
            Media is organized per course. Pick a course from the dropdown in the header to manage its files.
          </p>
        </div>
      </div>
    )
  }

  if (!items) return <SkeletonCard rows={6} />

  return (
    <div className="fade-page">
      <PageHeader
        title="Media Manager"
        subtitle="Upload videos, documents, images and any files. Organize them in folders."
        action={
          <div className="flex gap-2">
            <button
              className="inline-flex items-center gap-2 rounded-2xl border border-[color:var(--border)] bg-[color:var(--card)] px-4 py-2 text-sm font-semibold text-[color:var(--secondary)] hover:border-[color:var(--accent)] hover:text-[color:var(--accent)] transition"
              onClick={() => setFolderModal({ mode: 'create' })}
            >
              <FolderPlus size={15} /> New Folder
            </button>
            <button className="btn-primary inline-flex items-center gap-2" onClick={() => { setDropFiles(null); setUploadOpen(true) }}>
              <UploadCloud size={16} /> Upload
            </button>
          </div>
        }
      />

      {/* ── Toolbar: breadcrumb + search + filters + view toggle ── */}
      <div className="mb-4 flex flex-wrap items-center gap-3">
        <nav className="flex min-w-0 items-center gap-1 text-sm">
          <button
            onClick={() => openFolder(null)}
            className={`inline-flex items-center gap-1.5 rounded-lg px-2 py-1 font-semibold transition ${!folderId ? 'text-[color:var(--text)]' : 'text-[color:var(--secondary)] hover:text-[color:var(--accent)]'}`}
          >
            <Home size={14} /> {currentCourse.code}
          </button>
          {path.map((p, i) => (
            <span key={p.id} className="flex min-w-0 items-center gap-1">
              <ChevronRight size={13} className="shrink-0 text-[color:var(--muted)]" />
              <button
                onClick={() => openFolder(p)}
                className={`truncate rounded-lg px-2 py-1 font-semibold transition ${i === path.length - 1 ? 'text-[color:var(--text)]' : 'text-[color:var(--secondary)] hover:text-[color:var(--accent)]'}`}
              >
                {p.name}
              </button>
            </span>
          ))}
        </nav>

        <div className="ml-auto flex flex-wrap items-center gap-2">
          <div className="relative">
            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-[color:var(--muted)]" />
            <input
              className="input h-9 w-48 pl-8 text-sm"
              placeholder="Search all media…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
            {search && (
              <button onClick={() => setSearch('')} className="absolute right-2.5 top-1/2 -translate-y-1/2 text-[color:var(--muted)] hover:text-[color:var(--text)]">
                <X size={13} />
              </button>
            )}
          </div>
          <div className="flex rounded-xl border border-[color:var(--border)] p-0.5">
            <button onClick={() => setView('grid')} title="Grid view"
              className={`grid h-8 w-8 place-items-center rounded-[10px] transition ${view === 'grid' ? 'bg-[color:var(--accent-tint)] text-[color:var(--accent)]' : 'text-[color:var(--muted)]'}`}>
              <GridIcon size={14} />
            </button>
            <button onClick={() => setView('list')} title="List view"
              className={`grid h-8 w-8 place-items-center rounded-[10px] transition ${view === 'list' ? 'bg-[color:var(--accent-tint)] text-[color:var(--accent)]' : 'text-[color:var(--muted)]'}`}>
              <LayoutList size={14} />
            </button>
          </div>
        </div>
      </div>

      {/* Type filter chips */}
      <div className="mb-4 flex flex-wrap gap-1.5">
        {TYPE_FILTERS.map(({ key, label }) => {
          const count = key === 'all' ? (items || []).length : (items || []).filter((m) => (m.media_type || 'video') === key).length
          if (key !== 'all' && count === 0) return null
          return (
            <button key={key} onClick={() => setTypeFilter(key)}
              className={`rounded-full px-3.5 py-1.5 text-xs font-semibold transition ${typeFilter === key ? 'bg-[color:var(--accent-tint)] text-[color:var(--accent)]' : 'bg-[color:var(--surface)] text-[color:var(--secondary)] hover:text-[color:var(--text)]'}`}>
              {label} <span className="opacity-60">{count}</span>
            </button>
          )
        })}
      </div>

      {/* ── Content area (drop zone) ── */}
      <div
        onDragOver={(e) => { e.preventDefault(); setDragging(true) }}
        onDragLeave={(e) => { if (e.currentTarget === e.target) setDragging(false) }}
        onDrop={onDrop}
        className={`relative rounded-3xl transition ${dragging ? 'ring-2 ring-[color:var(--accent)] ring-offset-2' : ''}`}
      >
        {dragging && (
          <div className="pointer-events-none absolute inset-0 z-10 grid place-items-center rounded-3xl bg-[color:var(--accent-tint)]/80 backdrop-blur-sm">
            <div className="flex items-center gap-2 rounded-2xl bg-[color:var(--card)] px-5 py-3 shadow-lg">
              <UploadCloud size={18} className="text-[color:var(--accent)]" />
              <span className="text-sm font-semibold text-[color:var(--text)]">Drop files to upload here</span>
            </div>
          </div>
        )}

        {/* Folders */}
        {!search && folders.length > 0 && (
          <div className="mb-5">
            <p className="mb-2 text-[11px] font-bold uppercase tracking-[0.14em] text-[color:var(--muted)]">Folders</p>
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5">
              {folders.map((f) => (
                <div key={f.id} className="group relative">
                  <button
                    onClick={() => openFolder(f)}
                    className="card flex w-full items-center gap-3 p-3.5 text-left transition hover:border-[color:var(--accent)] hover:shadow-md"
                  >
                    <div className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-amber-50 text-amber-500">
                      <Folder size={18} fill="currentColor" fillOpacity={0.25} />
                    </div>
                    <div className="min-w-0 flex-1 pr-5">
                      <p className="truncate text-sm font-semibold text-[color:var(--text)]">{f.name}</p>
                      <p className="text-[11px] text-[color:var(--secondary)]">
                        {Number(f.item_count) || 0} file{Number(f.item_count) === 1 ? '' : 's'}
                        {Number(f.subfolder_count) > 0 && ` · ${f.subfolder_count} folder${Number(f.subfolder_count) === 1 ? '' : 's'}`}
                      </p>
                    </div>
                  </button>
                  <button
                    onClick={(e) => { e.stopPropagation(); setMenuFor(menuFor === `f_${f.id}` ? null : `f_${f.id}`) }}
                    className="absolute right-2 top-2 grid h-7 w-7 place-items-center rounded-full text-[color:var(--muted)] opacity-0 transition hover:bg-[color:var(--surface)] group-hover:opacity-100"
                  >
                    <MoreVertical size={14} />
                  </button>
                  {menuFor === `f_${f.id}` && (
                    <div className="absolute right-2 top-9 z-20 w-36 overflow-hidden rounded-xl border border-[color:var(--border)] bg-[color:var(--card)] py-1 shadow-xl">
                      <button onClick={() => { setMenuFor(null); setFolderModal({ mode: 'rename', folder: f }) }}
                        className="flex w-full items-center gap-2 px-3 py-2 text-xs font-semibold text-[color:var(--text)] hover:bg-[color:var(--surface)]">
                        <PenLine size={12} /> Rename
                      </button>
                      <button onClick={() => { setMenuFor(null); handleDeleteFolder(f) }}
                        className="flex w-full items-center gap-2 px-3 py-2 text-xs font-semibold text-red-500 hover:bg-red-50">
                        <Trash2 size={12} /> Delete
                      </button>
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Files */}
        {(!search && folders.length > 0) && (
          <p className="mb-2 text-[11px] font-bold uppercase tracking-[0.14em] text-[color:var(--muted)]">Files</p>
        )}

        {visible.length === 0 ? (
          <div className="card flex flex-col items-center justify-center gap-3 p-14 text-center">
            <UploadCloud size={28} className="text-[color:var(--muted)]" />
            <p className="text-sm font-semibold text-[color:var(--text)]">
              {search ? 'No media matches your search.' : 'This folder is empty.'}
            </p>
            {!search && (
              <p className="text-xs text-[color:var(--secondary)]">Drag &amp; drop files here, or click Upload above.</p>
            )}
          </div>
        ) : view === 'grid' ? (
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            {visible.map((m) => (
              <MediaCard
                key={m.id}
                media={m}
                onOpen={() => (m.media_type || 'video') === 'video' && navigate(`/admin/lectures/${m.id}`)}
                onEdit={() => setEditItem(m)}
                onDelete={() => handleDeleteMedia(m)}
                onAnalytics={() => setAnalyticsFor(m)}
                onTogglePublish={() => togglePublish(m)}
              />
            ))}
          </div>
        ) : (
          <div className="card overflow-hidden">
            <div className="overflow-x-auto">
              <table className="min-w-[760px] w-full text-left text-sm">
                <thead className="text-xs font-semibold uppercase tracking-wide text-[color:var(--muted)]">
                  <tr>{['Name', 'Type', 'Size', 'Status', 'Added', ''].map((h, i) => <th key={i} className="px-5 py-3.5">{h}</th>)}</tr>
                </thead>
                <tbody>
                  {visible.map((m) => {
                    const type = m.media_type || 'video'
                    const meta = TYPE_META[type] || TYPE_META.other
                    const Icon = meta.icon
                    return (
                      <tr key={m.id}
                        className={`border-b border-[color:var(--border)] last:border-0 transition hover:bg-[color:var(--surface)] ${type === 'video' ? 'cursor-pointer' : ''}`}
                        onClick={() => type === 'video' && navigate(`/admin/lectures/${m.id}`)}
                      >
                        <td className="px-5 py-3">
                          <div className="flex items-center gap-3">
                            <div className={`grid h-8 w-8 shrink-0 place-items-center rounded-lg ${meta.tint}`}><Icon size={14} /></div>
                            <p className="font-semibold text-[color:var(--text)] line-clamp-1">{m.title}</p>
                          </div>
                        </td>
                        <td className="px-5 text-xs text-[color:var(--secondary)]">{meta.label}</td>
                        <td className="px-5 text-xs text-[color:var(--secondary)]">{fmtBytes(m.file_size)}</td>
                        <td className="px-5" onClick={(e) => e.stopPropagation()}>
                          <button onClick={() => togglePublish(m)}
                            className={`rounded-full px-2.5 py-1 text-[11px] font-semibold transition ${m.is_published ? 'bg-emerald-100 text-emerald-700' : 'bg-[color:var(--surface)] text-[color:var(--muted)]'}`}>
                            {m.is_published ? 'Published' : 'Draft'}
                          </button>
                        </td>
                        <td className="px-5 text-xs text-[color:var(--secondary)]">{formatDate(m.created_at)}</td>
                        <td className="px-5" onClick={(e) => e.stopPropagation()}>
                          <div className="flex items-center justify-end gap-1">
                            {type === 'video' && (
                              <button className="grid h-7 w-7 place-items-center rounded-full text-[color:var(--secondary)] hover:bg-[color:var(--accent-tint)] hover:text-[color:var(--accent)]" onClick={() => setAnalyticsFor(m)} title="Analytics"><BarChart2 size={13} /></button>
                            )}
                            <button className="grid h-7 w-7 place-items-center rounded-full text-[color:var(--secondary)] hover:bg-[color:var(--surface-strong)]" onClick={() => setEditItem(m)} title="Edit"><PenLine size={13} /></button>
                            <button className="grid h-7 w-7 place-items-center rounded-full text-[color:var(--muted)] hover:bg-red-50 hover:text-red-500" onClick={() => handleDeleteMedia(m)} title="Delete"><Trash2 size={13} /></button>
                          </div>
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>

      {/* ── Modals & drawers ── */}
      {folderModal && (
        <FolderModal
          modal={folderModal}
          onClose={() => setFolderModal(null)}
          onSubmit={async (name) => {
            try {
              if (folderModal.mode === 'create') {
                await createFolder({ course_id: currentCourse.id, parent_id: folderId || null, name })
                addToast({ type: 'success', title: 'Folder created.' })
              } else {
                await updateFolder(folderModal.folder.id, { name })
                addToast({ type: 'success', title: 'Folder renamed.' })
              }
              setFolderModal(null)
              load()
            } catch (err) {
              addToast({ type: 'error', title: 'Failed', message: err.response?.data?.message || err.message })
            }
          }}
        />
      )}

      {uploadOpen && (
        <UploadDrawer
          course={currentCourse}
          folderId={folderId}
          folderName={path[path.length - 1]?.name}
          initialFiles={dropFiles}
          onClose={(didUpload) => { setUploadOpen(false); setDropFiles(null); if (didUpload) load() }}
          addToast={addToast}
        />
      )}

      {editItem && (
        <EditDrawer
          media={editItem}
          allFolders={allFolders}
          onClose={(changed) => { setEditItem(null); if (changed) load() }}
          addToast={addToast}
        />
      )}

      {analyticsFor && (
        <AnalyticsDrawer media={analyticsFor} onClose={() => setAnalyticsFor(null)} />
      )}
    </div>
  )
}

// ─── Media card (grid view) ──────────────────────────────────────────────────────
function MediaCard({ media: m, onOpen, onEdit, onDelete, onAnalytics, onTogglePublish }) {
  const type = m.media_type || 'video'
  const meta = TYPE_META[type] || TYPE_META.other
  const Icon = meta.icon
  const dur = fmtDuration(m.duration_sec)

  return (
    <div className="card group overflow-hidden p-0 transition hover:shadow-md">
      {/* Preview */}
      <button onClick={onOpen} className={`relative block aspect-video w-full overflow-hidden bg-[color:var(--surface)] ${type === 'video' ? 'cursor-pointer' : 'cursor-default'}`}>
        {type === 'video' ? (
          <>
            <img
              src={buildThumbnailUrl(m.id)}
              alt={m.title}
              loading="lazy"
              className="h-full w-full object-cover transition duration-300 group-hover:scale-[1.03]"
            />
            {dur && (
              <span className="absolute bottom-2 right-2 rounded-md bg-black/70 px-1.5 py-0.5 text-[10px] font-semibold text-white">{dur}</span>
            )}
          </>
        ) : (
          <span className={`grid h-full w-full place-items-center ${meta.tint}`}>
            <Icon size={34} strokeWidth={1.5} />
          </span>
        )}
        <span className="absolute left-2 top-2 rounded-md bg-black/55 px-1.5 py-0.5 text-[10px] font-semibold text-white backdrop-blur-sm">
          {meta.label}
        </span>
      </button>

      {/* Meta + actions */}
      <div className="p-3">
        <p className="truncate text-sm font-semibold text-[color:var(--text)]" title={m.title}>{m.title}</p>
        <p className="mt-0.5 text-[11px] text-[color:var(--secondary)]">{fmtBytes(m.file_size)} · {formatDate(m.created_at)}</p>
        <div className="mt-2.5 flex items-center justify-between">
          <button onClick={onTogglePublish}
            className={`rounded-full px-2.5 py-1 text-[11px] font-semibold transition ${m.is_published ? 'bg-emerald-100 text-emerald-700 hover:bg-emerald-200' : 'bg-[color:var(--surface)] text-[color:var(--muted)] hover:bg-[color:var(--surface-strong)]'}`}>
            {m.is_published ? '✓ Published' : 'Draft'}
          </button>
          <div className="flex items-center gap-0.5 opacity-0 transition group-hover:opacity-100">
            {type === 'video' && (
              <button className="grid h-7 w-7 place-items-center rounded-full text-[color:var(--secondary)] hover:bg-[color:var(--accent-tint)] hover:text-[color:var(--accent)]" onClick={onAnalytics} title="Analytics"><BarChart2 size={13} /></button>
            )}
            <button className="grid h-7 w-7 place-items-center rounded-full text-[color:var(--secondary)] hover:bg-[color:var(--surface)]" onClick={onEdit} title="Edit"><PenLine size={13} /></button>
            <button className="grid h-7 w-7 place-items-center rounded-full text-[color:var(--muted)] hover:bg-red-50 hover:text-red-500" onClick={onDelete} title="Delete"><Trash2 size={13} /></button>
          </div>
        </div>
      </div>
    </div>
  )
}

// ─── Folder create / rename modal ─────────────────────────────────────────────────
function FolderModal({ modal, onClose, onSubmit }) {
  const [name, setName] = useState(modal.folder?.name || '')
  const [busy, setBusy] = useState(false)
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/35 p-4 backdrop-blur-sm" onClick={onClose}>
      <form
        onClick={(e) => e.stopPropagation()}
        onSubmit={async (e) => { e.preventDefault(); if (!name.trim()) return; setBusy(true); await onSubmit(name.trim()); setBusy(false) }}
        className="w-full max-w-sm rounded-[24px] bg-[color:var(--card)] p-6 shadow-2xl"
      >
        <div className="flex items-center gap-3">
          <div className="grid h-10 w-10 place-items-center rounded-xl bg-amber-50 text-amber-500">
            <FolderPlus size={18} />
          </div>
          <h2 className="text-base font-semibold text-[color:var(--text)]">
            {modal.mode === 'create' ? 'New Folder' : 'Rename Folder'}
          </h2>
        </div>
        <input
          autoFocus
          className="input mt-4 w-full"
          placeholder="Folder name"
          value={name}
          onChange={(e) => setName(e.target.value)}
        />
        <div className="mt-4 flex justify-end gap-2">
          <button type="button" className="rounded-xl px-4 py-2 text-sm font-semibold text-[color:var(--secondary)] hover:bg-[color:var(--surface)]" onClick={onClose}>Cancel</button>
          <button type="submit" disabled={!name.trim() || busy} className="btn-primary inline-flex items-center gap-2 text-sm">
            {busy && <Loader size={13} className="animate-spin" />}
            {modal.mode === 'create' ? 'Create' : 'Rename'}
          </button>
        </div>
      </form>
    </div>
  )
}

// ─── Upload drawer (multi-file queue) ─────────────────────────────────────────────
function UploadDrawer({ course, folderId, folderName, initialFiles, onClose, addToast }) {
  const [queue, setQueue]     = useState(() => (initialFiles || []).map(toQueueItem))
  const [batches, setBatches] = useState([])
  const [batchId, setBatchId] = useState('')
  const [publish, setPublish] = useState(false)
  const [busy, setBusy]       = useState(false)
  const [didUpload, setDidUpload] = useState(false)
  const fileRef = useRef(null)

  useEffect(() => {
    getBatches({ course_id: course.id }).then((r) => setBatches(r.data || [])).catch(() => {})
  }, [course.id])

  const addFiles = (files) => setQueue((q) => [...q, ...[...files].map(toQueueItem)])
  const removeItem = (key) => setQueue((q) => q.filter((x) => x.key !== key))
  const patchItem = (key, patch) => setQueue((q) => q.map((x) => x.key === key ? { ...x, ...patch } : x))

  const uploadOne = (item) => new Promise((resolve, reject) => {
    const mediaId = crypto.randomUUID()
    const mime = item.file.type || 'application/octet-stream'
    const formData = new FormData()
    formData.append('file', item.file)
    formData.append('filename', item.file.name)
    formData.append('course_code', course.code)
    formData.append('video_id', mediaId)
    formData.append('content_type', mime)

    const xhr = new XMLHttpRequest()
    xhr.upload.onprogress = (e) => { if (e.lengthComputable) patchItem(item.key, { pct: Math.round(e.loaded / e.total * 100) }) }
    xhr.onload = () => {
      if (xhr.status < 300) {
        let body = {}
        try { body = JSON.parse(xhr.responseText) } catch { /* noop */ }
        resolve({ mediaId, mime, objectKey: body?.data?.object_key || '', fileSize: body?.data?.file_size || item.file.size })
      } else reject(new Error(`Upload failed: ${xhr.status}`))
    }
    xhr.onerror = () => reject(new Error('Network error during upload'))
    xhr.open('POST', `${API_BASE}/videos/upload`)
    const token = localStorage.getItem('access_token')
    if (token) xhr.setRequestHeader('Authorization', `Bearer ${token}`)
    xhr.send(formData)
  })

  const startUpload = async () => {
    setBusy(true)
    let okCount = 0
    for (const item of queue) {
      if (item.status === 'done') continue
      patchItem(item.key, { status: 'uploading', pct: 0, error: null })
      try {
        const { mime, objectKey, fileSize } = await uploadOne(item)
        await createVideo({
          course_id: course.id,
          batch_id: batchId || null,
          folder_id: folderId || null,
          title: item.title || item.file.name,
          description: '',
          media_type: detectType(mime),
          mime_type: mime,
          object_key: objectKey,
          file_size: fileSize,
          duration_sec: 0,
          sort_order: 0,
          is_published: publish,
        })
        patchItem(item.key, { status: 'done', pct: 100 })
        okCount += 1
        setDidUpload(true)
      } catch (err) {
        patchItem(item.key, { status: 'error', error: err.message })
      }
    }
    setBusy(false)
    if (okCount > 0) addToast({ type: 'success', title: `${okCount} file${okCount > 1 ? 's' : ''} uploaded.` })
  }

  const allDone = queue.length > 0 && queue.every((x) => x.status === 'done')
  const pendingCount = queue.filter((x) => x.status !== 'done').length

  return (
    <div className="fixed inset-0 z-50 bg-black/25 backdrop-blur-sm" onClick={() => !busy && onClose(didUpload)}>
      <div className="drawer-panel lg:!w-[min(560px,calc(100vw-32px))]" onClick={(e) => e.stopPropagation()}>
        <div className="shrink-0 flex items-center justify-between border-b border-[color:var(--border)] p-5 sm:p-7">
          <div>
            <p className="text-xs font-bold uppercase tracking-[0.16em] text-[color:var(--muted)]">Upload Media</p>
            <h2 className="mt-1 text-xl font-semibold text-[color:var(--text)]">
              {folderName ? `Into "${folderName}"` : `${course.code} · Home`}
            </h2>
          </div>
          <button className="grid h-10 w-10 place-items-center rounded-full bg-[color:var(--surface)]" disabled={busy} onClick={() => onClose(didUpload)}><XCircle size={18} /></button>
        </div>

        <div className="flex-1 overflow-auto overscroll-contain p-5 sm:p-7 space-y-4">
          {/* Dropzone / picker */}
          <div
            className="flex cursor-pointer flex-col items-center justify-center gap-2.5 rounded-3xl border-2 border-dashed border-[color:var(--border)] p-7 transition hover:border-[color:var(--accent)] hover:bg-[color:var(--accent-tint)]"
            onClick={() => fileRef.current?.click()}
            onDragOver={(e) => e.preventDefault()}
            onDrop={(e) => { e.preventDefault(); addFiles(e.dataTransfer?.files || []) }}
          >
            <Upload size={26} className="text-[color:var(--muted)]" />
            <p className="text-sm font-semibold text-[color:var(--text)]">Click to choose files or drag &amp; drop</p>
            <p className="text-xs text-[color:var(--muted)]">Videos, images, audio, PDFs, documents — any file type</p>
            <input ref={fileRef} type="file" multiple className="hidden" onChange={(e) => { addFiles(e.target.files || []); e.target.value = '' }} />
          </div>

          {/* Queue */}
          {queue.length > 0 && (
            <div className="space-y-2">
              {queue.map((item) => {
                const type = detectType(item.file.type || '')
                const meta = TYPE_META[type] || TYPE_META.other
                const Icon = meta.icon
                return (
                  <div key={item.key} className="rounded-2xl border border-[color:var(--border)] bg-[color:var(--surface)] p-3">
                    <div className="flex items-center gap-3">
                      <div className={`grid h-9 w-9 shrink-0 place-items-center rounded-xl ${meta.tint}`}><Icon size={15} /></div>
                      <div className="min-w-0 flex-1">
                        {item.status === 'pending' ? (
                          <input
                            className="input h-8 w-full text-sm"
                            value={item.title}
                            onChange={(e) => patchItem(item.key, { title: e.target.value })}
                            placeholder="Title"
                          />
                        ) : (
                          <p className="truncate text-sm font-semibold text-[color:var(--text)]">{item.title}</p>
                        )}
                        <p className="mt-0.5 text-[11px] text-[color:var(--secondary)]">
                          {item.file.name} · {fmtBytes(item.file.size)}
                          {item.status === 'error' && <span className="ml-1 text-red-500">— {item.error}</span>}
                        </p>
                      </div>
                      <div className="shrink-0">
                        {item.status === 'pending' && (
                          <button onClick={() => removeItem(item.key)} className="grid h-7 w-7 place-items-center rounded-full text-[color:var(--muted)] hover:bg-red-50 hover:text-red-500"><X size={13} /></button>
                        )}
                        {item.status === 'uploading' && <span className="text-xs font-semibold text-[color:var(--accent)]">{item.pct}%</span>}
                        {item.status === 'done' && <CheckCircle2 size={16} className="text-emerald-500" />}
                        {item.status === 'error' && (
                          <button onClick={() => patchItem(item.key, { status: 'pending', error: null })} className="text-[11px] font-semibold text-[color:var(--accent)]">Retry</button>
                        )}
                      </div>
                    </div>
                    {item.status === 'uploading' && (
                      <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-[color:var(--surface-strong)]">
                        <div className="h-full rounded-full bg-[color:var(--accent)] transition-all" style={{ width: `${item.pct}%` }} />
                      </div>
                    )}
                  </div>
                )
              })}
            </div>
          )}

          {/* Options */}
          <div className="grid gap-4 sm:grid-cols-2">
            <label className="block">
              <span className="text-sm font-semibold text-[color:var(--text)]">Batch (optional)</span>
              <select className="input mt-1.5 w-full" value={batchId} onChange={(e) => setBatchId(e.target.value)} disabled={busy}>
                <option value="">All batches</option>
                {batches.map((b) => <option key={b.id} value={b.id}>{b.name}</option>)}
              </select>
            </label>
            <div className="flex items-end pb-1">
              <label className="flex cursor-pointer items-center gap-2.5">
                <button type="button" disabled={busy} onClick={() => setPublish((v) => !v)}
                  className={`relative h-6 w-11 shrink-0 rounded-full transition-colors ${publish ? 'bg-[color:var(--accent)]' : 'bg-[color:var(--border)]'}`}>
                  <span className={`absolute top-0.5 h-5 w-5 rounded-full bg-white shadow-sm transition-transform ${publish ? 'translate-x-5' : 'translate-x-0.5'}`} />
                </button>
                <span className="text-sm font-semibold text-[color:var(--text)]">Publish immediately</span>
              </label>
            </div>
          </div>
        </div>

        <div className="shrink-0 flex gap-3 border-t border-[color:var(--border)] bg-[color:var(--card)] p-4 sm:p-5">
          <button type="button" className="h-11 flex-1 rounded-[14px] bg-[color:var(--surface)] font-semibold text-[color:var(--secondary)]" disabled={busy} onClick={() => onClose(didUpload)}>
            {allDone ? 'Close' : 'Cancel'}
          </button>
          {!allDone && (
            <button onClick={startUpload} disabled={busy || pendingCount === 0} className="btn-primary flex-1 flex items-center justify-center gap-2">
              {busy && <Loader size={14} className="animate-spin" />}
              {busy ? 'Uploading…' : `Upload ${pendingCount > 0 ? `${pendingCount} file${pendingCount > 1 ? 's' : ''}` : ''}`}
            </button>
          )}
        </div>
      </div>
    </div>
  )
}

// ─── Edit drawer ─────────────────────────────────────────────────────────────────
function EditDrawer({ media, allFolders, onClose, addToast }) {
  const [form, setForm] = useState({
    title: media.title || '',
    description: media.description || '',
    folder_id: media.folder_id || '',
    batch_id: media.batch_id || '',
    sort_order: media.sort_order || 0,
    is_published: !!media.is_published,
  })
  const [saving, setSaving] = useState(false)

  const save = async (e) => {
    e.preventDefault()
    setSaving(true)
    try {
      await updateVideo(media.id, {
        title: form.title,
        description: form.description,
        folder_id: form.folder_id || null,
        sort_order: Number(form.sort_order) || 0,
        is_published: form.is_published,
      })
      addToast({ type: 'success', title: 'Saved.' })
      onClose(true)
    } catch (err) {
      addToast({ type: 'error', title: 'Save failed', message: err.response?.data?.message || err.message })
    } finally { setSaving(false) }
  }

  const type = media.media_type || 'video'
  const meta = TYPE_META[type] || TYPE_META.other
  const Icon = meta.icon

  return (
    <div className="fixed inset-0 z-50 bg-black/25 backdrop-blur-sm" onClick={() => onClose(false)}>
      <div className="drawer-panel lg:!w-[min(520px,calc(100vw-32px))]" onClick={(e) => e.stopPropagation()}>
        <div className="shrink-0 flex items-center justify-between border-b border-[color:var(--border)] p-5 sm:p-7">
          <div className="flex min-w-0 items-center gap-3">
            <div className={`grid h-10 w-10 shrink-0 place-items-center rounded-xl ${meta.tint}`}><Icon size={17} /></div>
            <div className="min-w-0">
              <p className="text-xs font-bold uppercase tracking-[0.16em] text-[color:var(--muted)]">Edit {meta.label}</p>
              <h2 className="mt-0.5 truncate text-lg font-semibold text-[color:var(--text)]">{media.title}</h2>
            </div>
          </div>
          <button className="grid h-10 w-10 shrink-0 place-items-center rounded-full bg-[color:var(--surface)]" onClick={() => onClose(false)}><XCircle size={18} /></button>
        </div>

        <form onSubmit={save} className="flex flex-1 flex-col overflow-hidden">
          <div className="flex-1 overflow-auto overscroll-contain p-5 sm:p-7 space-y-4">
            <F label="Title" required><input className="input w-full" required value={form.title} onChange={(e) => setForm((p) => ({ ...p, title: e.target.value }))} /></F>
            <F label="Description"><textarea className="input w-full resize-none" rows={3} value={form.description} onChange={(e) => setForm((p) => ({ ...p, description: e.target.value }))} /></F>
            <div className="grid gap-4 sm:grid-cols-2">
              <F label="Folder">
                <select className="input w-full" value={form.folder_id} onChange={(e) => setForm((p) => ({ ...p, folder_id: e.target.value }))}>
                  <option value="">Home (no folder)</option>
                  {allFolders.map((f) => <option key={f.id} value={f.id}>{f.name}</option>)}
                </select>
              </F>
              <F label="Sort Order"><input className="input w-full" type="number" min={0} value={form.sort_order} onChange={(e) => setForm((p) => ({ ...p, sort_order: e.target.value }))} /></F>
            </div>
            <div className="flex items-center justify-between rounded-3xl border border-[color:var(--border)] bg-[color:var(--surface)] px-5 py-4">
              <div>
                <p className="text-sm font-semibold text-[color:var(--text)]">Published</p>
                <p className="text-xs text-[color:var(--secondary)]">Students can see this {meta.label.toLowerCase()}</p>
              </div>
              <button type="button" onClick={() => setForm((p) => ({ ...p, is_published: !p.is_published }))}
                className={`relative h-6 w-11 shrink-0 rounded-full transition-colors ${form.is_published ? 'bg-[color:var(--accent)]' : 'bg-[color:var(--border)]'}`}>
                <span className={`absolute top-0.5 h-5 w-5 rounded-full bg-white shadow-sm transition-transform ${form.is_published ? 'translate-x-5' : 'translate-x-0.5'}`} />
              </button>
            </div>
            <div className="rounded-2xl bg-[color:var(--surface)] px-4 py-3 text-xs text-[color:var(--secondary)]">
              <p>File: <span className="font-mono">{media.object_key?.split('/').pop()}</span></p>
              <p className="mt-1">Size: {fmtBytes(media.file_size)} · Added {formatDate(media.created_at)}</p>
            </div>
          </div>
          <div className="shrink-0 flex gap-3 border-t border-[color:var(--border)] bg-[color:var(--card)] p-4 sm:p-5">
            <button type="button" className="h-11 flex-1 rounded-[14px] bg-[color:var(--surface)] font-semibold text-[color:var(--secondary)]" onClick={() => onClose(false)}>Cancel</button>
            <button type="submit" className="btn-primary flex-1 flex items-center justify-center gap-2" disabled={saving}>
              {saving && <Loader size={14} className="animate-spin" />}
              Save Changes
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

// ─── Analytics drawer (videos) ───────────────────────────────────────────────────
function AnalyticsDrawer({ media, onClose }) {
  const [analytics, setAnalytics] = useState(null)

  useEffect(() => {
    getVideoAnalytics(media.id).then((r) => setAnalytics(r.data))
  }, [media.id])

  return (
    <div className="fixed inset-0 z-50 bg-black/25 backdrop-blur-sm" onClick={onClose}>
      <div className="drawer-panel lg:!w-[min(620px,calc(100vw-32px))]" onClick={(e) => e.stopPropagation()}>
        <div className="shrink-0 flex items-center justify-between border-b border-[color:var(--border)] p-5 sm:p-7">
          <div>
            <p className="text-xs font-bold uppercase tracking-[0.16em] text-[color:var(--muted)]">Watch Analytics</p>
            <h2 className="mt-1 text-xl font-semibold text-[color:var(--text)]">{media.title}</h2>
          </div>
          <button className="grid h-10 w-10 place-items-center rounded-full bg-[color:var(--surface)]" onClick={onClose}><XCircle size={18} /></button>
        </div>
        <div className="flex-1 overflow-auto overscroll-contain p-5 sm:p-7">
          {!analytics ? (
            <div className="flex items-center justify-center py-20"><Loader size={24} className="animate-spin text-[color:var(--accent)]" /></div>
          ) : (
            <>
              <div className="grid grid-cols-3 gap-4 mb-6">
                {[
                  ['Total Viewers', analytics.total_viewers, Eye],
                  ['Completions',   analytics.completions, CheckCircle2],
                  ['Avg Position',  `${analytics.avg_position}s`, BarChart2],
                ].map(([label, val, Icon]) => (
                  <div key={label} className="card p-4 text-center">
                    <Icon size={18} className="mx-auto text-[color:var(--accent)]" />
                    <p className="mt-2 text-2xl font-semibold text-[color:var(--text)]">{val}</p>
                    <p className="text-xs text-[color:var(--secondary)]">{label}</p>
                  </div>
                ))}
              </div>

              <h3 className="mb-3 text-sm font-semibold text-[color:var(--text)]">Student Watch Logs</h3>
              {analytics.watch_logs?.length === 0 ? (
                <p className="text-sm text-[color:var(--secondary)]">No watch activity yet.</p>
              ) : (
                <div className="space-y-3">
                  {(analytics.watch_logs || []).map((log) => {
                    const dur = media.duration_sec || 0
                    const pct = dur > 0 ? Math.min(100, Math.round((log.last_position / dur) * 100)) : 0
                    return (
                      <div key={log.id} className="rounded-3xl border border-[color:var(--border)] bg-[color:var(--surface)] p-4">
                        <div className="flex items-center justify-between">
                          <div>
                            <p className="font-semibold text-[color:var(--text)]">{log.student_name}</p>
                            <p className="text-xs text-[color:var(--secondary)]">{log.email}</p>
                          </div>
                          {log.completed
                            ? <span className="rounded-full bg-emerald-100 px-2.5 py-0.5 text-xs font-semibold text-emerald-700">Completed</span>
                            : <span className="text-xs text-[color:var(--muted)]">{pct}% watched</span>
                          }
                        </div>
                        <div className="mt-3 h-1.5 overflow-hidden rounded-full bg-[color:var(--border)]">
                          <div className={`h-full rounded-full ${log.completed ? 'bg-emerald-500' : 'bg-[color:var(--accent)]'}`} style={{ width: `${pct}%` }} />
                        </div>
                        <p className="mt-1 text-right text-xs text-[color:var(--muted)]">
                          {log.total_watch_sec}s watched · last at {log.last_position}s
                        </p>
                      </div>
                    )
                  })}
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  )
}

function F({ label, required, children }) {
  return (
    <label className="block">
      <span className="text-sm font-semibold text-[color:var(--text)]">{label}{required && <span className="ml-1 text-red-500">*</span>}</span>
      <span className="mt-1.5 block">{children}</span>
    </label>
  )
}
