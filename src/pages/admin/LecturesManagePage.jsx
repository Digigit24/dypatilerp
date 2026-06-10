import { BarChart2, BookOpen, CheckCircle2, Eye, FolderPlus, Loader, PenLine, Plus, Trash2, Upload, XCircle } from 'lucide-react'
import { useEffect, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  createVideo, deleteVideo, getVideoAnalytics, getVideos, initCourseFolder,
  updateVideo,
} from '../../api/services/videoService.js'
import http from '../../api/http.js'
import { getCourses } from '../../api/services/courseService.js'
import { getBatches } from '../../api/services/batchService.js'
import PageHeader from '../../components/shared/PageHeader.jsx'
import SkeletonCard from '../../components/shared/SkeletonCard.jsx'
import StatusBadge from '../../components/shared/StatusBadge.jsx'
import { useCourseStore } from '../../store/courseStore.js'
import { useUiStore } from '../../store/uiStore.js'
import useScrollLock from '../../hooks/useScrollLock.js'
import { formatDate } from '../../lib/formatters.js'

const fmtDuration = (sec) => sec ? `${Math.floor(sec / 60)}:${String(sec % 60).padStart(2, '0')}` : '—'
const fmtBytes = (b) => b >= 1e9 ? `${(b / 1e9).toFixed(1)} GB` : b >= 1e6 ? `${(b / 1e6).toFixed(1)} MB` : `${(b / 1e3).toFixed(0)} KB`

const BLANK = {
  course_id: '', batch_id: '', title: '', description: '',
  duration_sec: 0, sort_order: 0, is_published: false,
}

export default function LecturesManagePage() {
  const [videos, setVideos]         = useState(null)
  const [courses, setCourses]       = useState([])
  const [batches, setBatches]       = useState([])
  const [courseFilter, setCourseF]  = useState('all')
  const [drawerOpen, setDrawer]     = useState(false)
  const [analyticsId, setAnalytics] = useState(null)
  const [analytics, setAnalyticsData] = useState(null)
  const [editing, setEditing]       = useState(null)
  const [form, setForm]             = useState(BLANK)
  const [file, setFile]             = useState(null)
  const [uploading, setUploading]   = useState(false)
  const [uploadProgress, setUploadPct] = useState(0)
  const [saving, setSaving]         = useState(false)
  const fileRef = useRef(null)
  const { currentCourse } = useCourseStore()
  const addToast = useUiStore((s) => s.addToast)
  const navigate = useNavigate()
  useScrollLock(drawerOpen || !!analyticsId)

  const load = async () => {
    const params = {}
    if (courseFilter !== 'all') params.course_id = courseFilter
    else if (currentCourse?.id) params.course_id = currentCourse.id
    const [vr, cr] = await Promise.all([getVideos(params), getCourses()])
    setVideos(vr.data || [])
    setCourses(cr.data || [])
  }

  useEffect(() => { load() }, [courseFilter, currentCourse?.id])

  useEffect(() => {
    if (form.course_id) getBatches({ course_id: form.course_id }).then((r) => setBatches(r.data || []))
    else setBatches([])
  }, [form.course_id])

  const openAdd = () => {
    setEditing(null)
    setForm({ ...BLANK, course_id: currentCourse?.id || '' })
    setFile(null)
    setDrawer(true)
  }
  const openEdit = (v) => {
    setEditing(v)
    setForm({ course_id: v.course_id, batch_id: v.batch_id || '', title: v.title, description: v.description || '', duration_sec: v.duration_sec, sort_order: v.sort_order || 0, is_published: v.is_published })
    setFile(null)
    setDrawer(true)
  }

  // ── Upload + save ─────────────────────────────────────────────────────────
  const handleSave = async (e) => {
    e.preventDefault()
    if (!editing && !file) { addToast({ type: 'error', title: 'Please select a video file.' }); return }
    setSaving(true)
    try {
      let objectKey = editing?.object_key || ''
      let fileSize  = editing?.file_size || 0

      if (file) {
        const videoId = editing?.id || crypto.randomUUID()
        const course = courses.find((c) => c.id === form.course_id)
        if (!course) { addToast({ type: 'error', title: 'Select a course.' }); return }

        // Proxy upload: POST multipart to our backend, which streams to Zata
        setUploading(true)
        const formData = new FormData()
        formData.append('file', file)
        formData.append('filename', file.name)
        formData.append('course_code', course.code)
        formData.append('video_id', videoId)
        formData.append('content_type', file.type || 'video/mp4')

        const uploadRes = await new Promise((resolve, reject) => {
          const xhr = new XMLHttpRequest()
          xhr.upload.onprogress = (e) => { if (e.lengthComputable) setUploadPct(Math.round(e.loaded / e.total * 100)) }
          xhr.onload = () => {
            if (xhr.status < 300) {
              try { resolve(JSON.parse(xhr.responseText)) }
              catch { resolve({}) }
            } else {
              reject(new Error(`Upload failed: ${xhr.status} ${xhr.responseText}`))
            }
          }
          xhr.onerror = () => reject(new Error('Upload network error'))
          xhr.open('POST', `${import.meta.env.VITE_API_URL || 'https://dypatilerp.celiyo.com/api'}/videos/upload`)
          const token = localStorage.getItem('access_token')
          if (token) xhr.setRequestHeader('Authorization', `Bearer ${token}`)
          xhr.send(formData)
        })

        objectKey = uploadRes?.data?.object_key || ''
        fileSize  = uploadRes?.data?.file_size  || file.size
        setUploading(false)
        setUploadPct(0)
      }

      const payload = { ...form, object_key: objectKey, file_size: fileSize }
      if (editing) {
        await updateVideo(editing.id, payload)
        addToast({ type: 'success', title: 'Video updated.' })
      } else {
        await createVideo(payload)
        addToast({ type: 'success', title: 'Video uploaded and registered.' })
      }
      setDrawer(false)
      load()
    } catch (err) {
      addToast({ type: 'error', title: 'Save failed', message: err.message || err.response?.data?.message })
    } finally { setSaving(false); setUploading(false) }
  }

  const handleDelete = async (v) => {
    if (!confirm(`Delete "${v.title}"? This cannot be undone.`)) return
    try {
      await deleteVideo(v.id)
      addToast({ type: 'success', title: 'Video deleted.' })
      load()
    } catch (err) {
      addToast({ type: 'error', title: 'Delete failed', message: err.response?.data?.message })
    }
  }

  const handleInitFolder = async (courseId) => {
    try {
      const r = await initCourseFolder(courseId)
      addToast({ type: 'success', title: `Folder created: ${r.data.folder_key}` })
    } catch (err) {
      addToast({ type: 'error', title: 'Failed', message: err.response?.data?.message || err.message })
    }
  }

  const openAnalytics = async (id) => {
    setAnalytics(null)
    setAnalytics('loading')
    setAnalyticsId(id)
    const r = await getVideoAnalytics(id)
    setAnalyticsData(r.data)
  }

  const togglePublish = async (v) => {
    await updateVideo(v.id, { is_published: !v.is_published })
    setVideos((vs) => vs.map((x) => x.id === v.id ? { ...x, is_published: !v.is_published } : x))
  }

  const ff = (key) => ({
    value: key === 'is_published' ? undefined : form[key],
    checked: key === 'is_published' ? form[key] : undefined,
    onChange: (e) => setForm((p) => ({ ...p, [key]: key === 'is_published' ? e.target.checked : key === 'duration_sec' || key === 'sort_order' ? Number(e.target.value) : e.target.value })),
  })

  if (!videos) return <SkeletonCard rows={6} />

  return (
    <div className="fade-page">
      <PageHeader
        title="Lectures Manager"
        subtitle="Upload videos, manage lecture metadata, and view student watch analytics."
        action={
          <div className="flex gap-2">
            {courses.map((c) => (
              <button key={c.id}
                className="flex items-center gap-1.5 rounded-2xl border border-[color:var(--border)] bg-[color:var(--card)] px-3 py-2 text-xs font-semibold text-[color:var(--secondary)] hover:border-[color:var(--accent)] hover:text-[color:var(--accent)] transition"
                onClick={() => handleInitFolder(c.id)} title={`Init ${c.code} folder in Zata`}
              >
                <FolderPlus size={13} /> {c.code}
              </button>
            ))}
            <button className="btn-primary inline-flex items-center gap-2" onClick={openAdd}>
              <Plus size={17} /> Add Video
            </button>
          </div>
        }
      />

      {/* Course filter */}
      <div className="mb-5 flex gap-2 flex-wrap">
        <button onClick={() => setCourseF('all')}
          className={`rounded-full px-4 py-2 text-xs font-semibold transition ${courseFilter === 'all' ? 'bg-[color:var(--accent-tint)] text-[color:var(--accent)]' : 'bg-[color:var(--surface)] text-[color:var(--secondary)]'}`}>
          All Courses
        </button>
        {courses.map((c) => (
          <button key={c.id} onClick={() => setCourseF(c.id)}
            className={`rounded-full px-4 py-2 text-xs font-semibold transition ${courseFilter === c.id ? 'bg-[color:var(--accent-tint)] text-[color:var(--accent)]' : 'bg-[color:var(--surface)] text-[color:var(--secondary)]'}`}>
            {c.code}
          </button>
        ))}
      </div>

      {/* Video table */}
      <div className="card overflow-hidden">
        <div className="overflow-x-auto">
          <table className="min-w-[820px] w-full text-left text-sm">
            <thead className="text-xs font-semibold uppercase tracking-wide text-[color:var(--muted)]">
              <tr>{['Title', 'Course', 'Duration', 'Size', 'Status', 'Uploaded', 'Actions'].map((h) => <th key={h} className="px-5 py-4">{h}</th>)}</tr>
            </thead>
            <tbody>
              {videos.length === 0 && (
                <tr><td colSpan={7} className="px-5 py-16 text-center text-[color:var(--secondary)]">No videos yet. Upload the first one.</td></tr>
              )}
              {videos.map((v) => (
                <tr
                  key={v.id}
                  className="table-row border-b border-[color:var(--border)] cursor-pointer hover:bg-[color:var(--surface)] transition"
                  onClick={() => navigate(`/admin/lectures/${v.id}`)}
                >
                  <td className="px-5 py-4">
                    <div className="flex items-center gap-3">
                      <div className="grid h-9 w-9 shrink-0 place-items-center rounded-xl bg-[color:var(--accent-tint)] text-[color:var(--accent)]">
                        <BookOpen size={15} />
                      </div>
                      <p className="font-semibold text-[color:var(--text)] line-clamp-1">{v.title}</p>
                    </div>
                  </td>
                  <td className="px-5 text-xs font-bold text-[color:var(--accent)]">{v.course_code}</td>
                  <td className="px-5 text-[color:var(--secondary)]">{fmtDuration(v.duration_sec)}</td>
                  <td className="px-5 text-[color:var(--secondary)]">{fmtBytes(v.file_size)}</td>
                  <td className="px-5" onClick={(e) => e.stopPropagation()}>
                    <button
                      onClick={() => togglePublish(v)}
                      className={`rounded-full px-3 py-1 text-xs font-semibold transition ${v.is_published ? 'bg-emerald-100 text-emerald-700 hover:bg-emerald-200' : 'bg-[color:var(--surface)] text-[color:var(--muted)] hover:bg-[color:var(--surface-strong)]'}`}
                    >
                      {v.is_published ? '✓ Published' : 'Draft'}
                    </button>
                  </td>
                  <td className="px-5 text-[color:var(--secondary)]">{formatDate(v.created_at)}</td>
                  <td className="px-5" onClick={(e) => e.stopPropagation()}>
                    <div className="flex items-center gap-1">
                      <button className="grid h-8 w-8 place-items-center rounded-full hover:bg-[color:var(--accent-tint)] text-[color:var(--secondary)] hover:text-[color:var(--accent)] transition" onClick={() => openAnalytics(v.id)} title="Analytics"><BarChart2 size={14} /></button>
                      <button className="grid h-8 w-8 place-items-center rounded-full hover:bg-[color:var(--surface)] text-[color:var(--secondary)] transition" onClick={() => openEdit(v)} title="Edit"><PenLine size={14} /></button>
                      <button className="grid h-8 w-8 place-items-center rounded-full hover:bg-red-50 text-[color:var(--muted)] hover:text-red-500 transition" onClick={() => handleDelete(v)} title="Delete"><Trash2 size={14} /></button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* ── Add/Edit Drawer ── */}
      {drawerOpen && (
        <div className="fixed inset-0 z-50 bg-black/25 backdrop-blur-sm" onClick={() => setDrawer(false)}>
          <div className="drawer-panel lg:!w-[min(560px,calc(100vw-32px))]" onClick={(e) => e.stopPropagation()}>
            <div className="shrink-0 flex items-center justify-between border-b border-[color:var(--border)] p-5 sm:p-7">
              <div>
                <p className="text-xs font-bold uppercase tracking-[0.16em] text-[color:var(--muted)]">{editing ? 'Edit Video' : 'Upload Video'}</p>
                <h2 className="mt-1 text-xl font-semibold text-[color:var(--text)]">{editing ? editing.title : 'Add New Lecture'}</h2>
              </div>
              <button className="grid h-10 w-10 place-items-center rounded-full bg-[color:var(--surface)]" onClick={() => setDrawer(false)}><XCircle size={18} /></button>
            </div>
            <form onSubmit={handleSave} className="flex flex-1 flex-col overflow-hidden">
              <div className="flex-1 overflow-auto overscroll-contain p-5 sm:p-7 space-y-4">

                {/* File picker */}
                {!editing && (
                  <div
                    className="flex cursor-pointer flex-col items-center justify-center gap-3 rounded-3xl border-2 border-dashed border-[color:var(--border)] p-8 hover:border-[color:var(--accent)] hover:bg-[color:var(--accent-tint)] transition"
                    onClick={() => fileRef.current?.click()}
                  >
                    <Upload size={28} className={file ? 'text-emerald-600' : 'text-[color:var(--muted)]'} />
                    <p className="text-sm font-semibold text-[color:var(--text)]">
                      {file ? file.name : 'Click to select video file'}
                    </p>
                    {file && <p className="text-xs text-[color:var(--secondary)]">{fmtBytes(file.size)}</p>}
                    <p className="text-xs text-[color:var(--muted)]">MP4, WebM, MOV supported</p>
                    <input ref={fileRef} type="file" accept="video/*" className="hidden" onChange={(e) => setFile(e.target.files[0] || null)} />
                  </div>
                )}
                {editing && (
                  <div className="flex items-center gap-3 rounded-3xl border border-[color:var(--border)] bg-[color:var(--surface)] p-4">
                    <Upload size={16} className="text-[color:var(--accent)]" />
                    <div className="flex-1">
                      <p className="text-sm font-semibold text-[color:var(--text)]">Replace video file (optional)</p>
                      <p className="text-xs text-[color:var(--secondary)]">Leave empty to keep current file</p>
                    </div>
                    <button type="button" className="text-xs text-[color:var(--accent)]" onClick={() => fileRef.current?.click()}>
                      {file ? file.name : 'Browse'}
                    </button>
                    <input ref={fileRef} type="file" accept="video/*" className="hidden" onChange={(e) => setFile(e.target.files[0] || null)} />
                  </div>
                )}

                {/* Upload progress */}
                {uploading && (
                  <div>
                    <div className="flex items-center justify-between text-xs mb-1">
                      <span className="text-[color:var(--secondary)]">Uploading video…</span>
                      <span className="font-semibold">{uploadProgress}%</span>
                    </div>
                    <div className="h-2 overflow-hidden rounded-full bg-[color:var(--surface-strong)]">
                      <div className="h-full rounded-full bg-[color:var(--accent)] transition-all" style={{ width: `${uploadProgress}%` }} />
                    </div>
                  </div>
                )}

                <F label="Title" required><input className="input w-full" required placeholder="Introduction to Research Methodology" {...ff('title')} /></F>
                <F label="Description"><textarea className="input w-full resize-none" rows={3} placeholder="Brief description…" {...ff('description')} /></F>
                <div className="grid gap-4 sm:grid-cols-2">
                  <F label="Course" required>
                    <select className="input w-full" required {...ff('course_id')}>
                      <option value="">Select course</option>
                      {courses.map((c) => <option key={c.id} value={c.id}>{c.code} — {c.name}</option>)}
                    </select>
                  </F>
                  <F label="Batch (optional)">
                    <select className="input w-full" {...ff('batch_id')}>
                      <option value="">All batches</option>
                      {batches.map((b) => <option key={b.id} value={b.id}>{b.name}</option>)}
                    </select>
                  </F>
                </div>
                <div className="grid gap-4 sm:grid-cols-2">
                  <F label="Duration (seconds)"><input className="input w-full" type="number" min={0} placeholder="0" {...ff('duration_sec')} /></F>
                  <F label="Sort Order"><input className="input w-full" type="number" min={0} placeholder="0" {...ff('sort_order')} /></F>
                </div>
                <div className="flex items-center justify-between rounded-3xl border border-[color:var(--border)] bg-[color:var(--surface)] px-5 py-4">
                  <div>
                    <p className="text-sm font-semibold text-[color:var(--text)]">Published</p>
                    <p className="text-xs text-[color:var(--secondary)]">Students can see and play this video</p>
                  </div>
                  <button type="button" onClick={() => setForm((p) => ({ ...p, is_published: !p.is_published }))}
                    className={`relative h-6 w-11 shrink-0 rounded-full transition-colors ${form.is_published ? 'bg-[color:var(--accent)]' : 'bg-[color:var(--border)]'}`}>
                    <span className={`absolute top-0.5 h-5 w-5 rounded-full bg-white shadow-sm transition-transform ${form.is_published ? 'translate-x-5' : 'translate-x-0.5'}`} />
                  </button>
                </div>
              </div>
              <div className="shrink-0 flex gap-3 border-t border-[color:var(--border)] bg-[color:var(--card)] p-4 sm:p-5">
                <button type="button" className="h-11 flex-1 rounded-[14px] bg-[color:var(--surface)] font-semibold text-[color:var(--secondary)]" onClick={() => setDrawer(false)}>Cancel</button>
                <button type="submit" className="btn-primary flex-1 flex items-center justify-center gap-2" disabled={saving || uploading}>
                  {(saving || uploading) && <Loader size={14} className="animate-spin" />}
                  {uploading ? `Uploading ${uploadProgress}%` : saving ? 'Saving…' : editing ? 'Save Changes' : 'Upload Video'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ── Analytics Drawer ── */}
      {analyticsId && (
        <div className="fixed inset-0 z-50 bg-black/25 backdrop-blur-sm" onClick={() => setAnalyticsId(null)}>
          <div className="drawer-panel lg:!w-[min(620px,calc(100vw-32px))]" onClick={(e) => e.stopPropagation()}>
            <div className="shrink-0 flex items-center justify-between border-b border-[color:var(--border)] p-5 sm:p-7">
              <div>
                <p className="text-xs font-bold uppercase tracking-[0.16em] text-[color:var(--muted)]">Watch Analytics</p>
                <h2 className="mt-1 text-xl font-semibold text-[color:var(--text)]">{videos.find((v) => v.id === analyticsId)?.title}</h2>
              </div>
              <button className="grid h-10 w-10 place-items-center rounded-full bg-[color:var(--surface)]" onClick={() => setAnalyticsId(null)}><XCircle size={18} /></button>
            </div>
            <div className="flex-1 overflow-auto overscroll-contain p-5 sm:p-7">
              {!analytics || analytics === 'loading' ? (
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
                        const dur = videos.find((v) => v.id === analyticsId)?.duration_sec || 0
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
      )}
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
