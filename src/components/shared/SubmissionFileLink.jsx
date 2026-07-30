import { useEffect, useState } from 'react'
import { Download } from 'lucide-react'
import { getSubmissionFileUrl } from '../../api/services/videoService.js'

/**
 * Renders an "Open" link for a stored submission attachment descriptor
 * ({ name, media_id, url }). For media_id-based files it resolves a
 * time-limited authorized download URL via the existing session helper
 * (owner + admin + assigned reviewer are the only ones the backend will serve).
 */
export default function SubmissionFileLink({ file, label = 'Open' }) {
  const [fetchedUrl, setFetchedUrl] = useState(null)
  useEffect(() => {
    let alive = true
    if (file?.media_id) getSubmissionFileUrl(file.media_id).then((r) => { if (alive) setFetchedUrl(r.data.url) }).catch(() => {})
    return () => { alive = false }
  }, [file?.media_id])
  const url = file?.media_id ? fetchedUrl : (file?.url || null)
  if (!file) return null
  return (
    <a
      href={url || undefined}
      target="_blank"
      rel="noreferrer"
      className={`inline-flex h-10 items-center gap-2 rounded-2xl bg-[color:var(--accent-tint)] px-4 text-sm font-semibold text-[color:var(--accent)] ${url ? '' : 'pointer-events-none opacity-50'}`}
    >
      <Download size={14} /> {label}
    </a>
  )
}
