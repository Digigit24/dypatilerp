/**
 * StudentOnboardingPanel — personal-info form + document/upload grid.
 *
 * Shared between two places:
 *  1. The dedicated onboarding gate flow (pages/student/OnboardingPage.jsx)
 *  2. The "Profile" tab in StudentProfileView.jsx (both admin and student view)
 *
 * `editable` mirrors the `!isAdminView` split used everywhere else in
 * StudentProfileView — admins see the same data read-only.
 */
import { FileText, Upload } from 'lucide-react'
import { useEffect, useState } from 'react'
import {
  getDocuments, getOnboardingStatus, getProfileDetails, saveProfileDetails, uploadDocument,
} from '../../api/services/studentProfileService.js'
import { useUiStore } from '../../store/uiStore.js'

const INFO_FIELDS = [
  { key: 'first_name',     label: 'First Name',      required: true },
  { key: 'last_name',      label: 'Last Name',       required: true },
  { key: 'phone',          label: 'Mobile Number',   required: true },
  { key: 'father_name',    label: "Father's Name",   required: true },
  { key: 'mother_name',    label: "Mother's Name",   required: true },
  { key: 'date_of_birth',  label: 'Date of Birth',   required: true, type: 'date' },
  { key: 'blood_group',    label: 'Blood Group',     required: true, placeholder: 'e.g. O+' },
  { key: 'postal_address', label: 'Postal Address',  required: true, type: 'textarea', wide: true },
]

const SLOT_LABELS = {
  cv: 'CV / Resume',
  research_proposal: 'Research Proposal',
  publications_list: 'List of Publications',
  research_statement: 'Research Statement',
  passport: 'Passport',
  aadhar_card: 'Aadhaar Card',
  pan_card: 'PAN Card',
  marksheet_graduation: 'Graduation Marksheet',
  marksheet_postgraduation: 'Post-Graduation Marksheet',
  phd_result: 'PhD Result',
  photo: 'Passport Photo',
}

const acceptFor = (doc) => (doc.slot === 'photo'
  ? 'image/png,image/jpeg,image/webp'
  : doc.kind === 'upload' ? '.pdf,.doc,.docx' : '.pdf,image/png,image/jpeg,image/webp')

export default function StudentOnboardingPanel({ userId, editable = true, onStatusChange }) {
  const [details, setDetails]   = useState(null)
  const [draft, setDraft]       = useState({})
  const [documents, setDocuments] = useState([])
  const [saving, setSaving]     = useState(false)
  const [uploadingSlot, setUploadingSlot] = useState(null)
  const addToast = useUiStore((s) => s.addToast)

  const loadDetails = () => {
    if (!userId) return
    getProfileDetails(userId).then((r) => { setDetails(r.data); setDraft(r.data) }).catch(() => {})
  }
  const loadDocuments = () => {
    if (!userId) return
    getDocuments(userId).then((r) => setDocuments(r.data || [])).catch(() => {})
  }
  const refreshStatus = () => {
    if (!userId) return
    getOnboardingStatus(userId).then((r) => onStatusChange?.(r.data)).catch(() => {})
  }

  useEffect(() => { loadDetails(); loadDocuments(); refreshStatus() }, [userId])

  const saveDetails = async () => {
    setSaving(true)
    try {
      const res = await saveProfileDetails(userId, draft)
      setDetails(res.data)
      onStatusChange?.(res.data.onboarding)
      addToast({ type: 'success', title: 'Profile details saved.' })
    } catch (e) {
      addToast({ type: 'error', title: e?.response?.data?.message || 'Could not save profile details.' })
    } finally {
      setSaving(false)
    }
  }

  const handleUpload = async (slot, file) => {
    setUploadingSlot(slot)
    try {
      const res = await uploadDocument(userId, slot, file)
      onStatusChange?.(res.data.onboarding)
      loadDocuments()
      addToast({ type: 'success', title: `${SLOT_LABELS[slot] || slot} uploaded.` })
    } catch (e) {
      addToast({ type: 'error', title: e?.response?.data?.message || 'Upload failed.' })
    } finally {
      setUploadingSlot(null)
    }
  }

  if (!details) return null

  return (
    <div className="space-y-5">
      <div className="card p-6">
        <h2 className="text-lg font-semibold text-[color:var(--text)]">Onboarding Details</h2>
        <p className="mt-1 text-sm text-[color:var(--secondary)]">
          Family, identity and contact details required for institute records.
        </p>
        <div className="mt-4 grid gap-3 sm:grid-cols-2">
          {INFO_FIELDS.map((f) => (
            <label key={f.key} className={f.wide ? 'block sm:col-span-2' : 'block'}>
              <span className="text-sm font-semibold text-[color:var(--text)]">
                {f.label}{f.required && <span className="text-red-500"> *</span>}
              </span>
              {editable ? (
                f.type === 'textarea' ? (
                  <textarea
                    className="textarea mt-1.5 w-full"
                    value={draft[f.key] || ''}
                    onChange={(e) => setDraft((p) => ({ ...p, [f.key]: e.target.value }))}
                  />
                ) : (
                  <input
                    type={f.type === 'date' ? 'date' : 'text'}
                    className="input mt-1.5 w-full"
                    placeholder={f.placeholder}
                    value={(f.type === 'date' ? String(draft[f.key] || '').slice(0, 10) : draft[f.key]) || ''}
                    onChange={(e) => setDraft((p) => ({ ...p, [f.key]: e.target.value }))}
                  />
                )
              ) : (
                <div className="mt-1.5 rounded-lg border border-[color:var(--border)] bg-[color:var(--surface)] px-3 py-2 text-sm text-[color:var(--text)]">
                  {f.type === 'date' ? (draft[f.key] ? String(draft[f.key]).slice(0, 10) : '—') : (draft[f.key] || '—')}
                </div>
              )}
            </label>
          ))}
        </div>
        {editable && (
          <button className="btn-primary mt-4" disabled={saving} onClick={saveDetails}>
            {saving ? 'Saving…' : 'Save Details'}
          </button>
        )}
      </div>

      <div className="card p-6">
        <h2 className="text-lg font-semibold text-[color:var(--text)]">Uploads &amp; Documents</h2>
        <p className="mt-1 text-sm text-[color:var(--secondary)]">
          CV, research documents and identity proofs. PDF, DOC/DOCX, JPG, PNG or WEBP — max 15MB per file.
        </p>
        <div className="mt-4 grid gap-3 sm:grid-cols-2">
          {documents.map((doc) => (
            <DocumentSlot
              key={doc.slot}
              doc={doc}
              label={SLOT_LABELS[doc.slot] || doc.slot}
              editable={editable}
              uploading={uploadingSlot === doc.slot}
              onUpload={(file) => handleUpload(doc.slot, file)}
            />
          ))}
        </div>
      </div>
    </div>
  )
}

function DocumentSlot({ doc, label, editable, uploading, onUpload }) {
  const inputId = `doc-upload-${doc.slot}`
  return (
    <div className={`flex items-start gap-3 rounded-xl border p-4 transition ${doc.present ? 'border-emerald-200 bg-emerald-50' : 'border-[color:var(--border)] bg-[color:var(--surface)]'}`}>
      <span className={`mt-0.5 grid h-9 w-9 shrink-0 place-items-center rounded-lg ${doc.present ? 'bg-emerald-100 text-emerald-600' : 'bg-[color:var(--card)] text-[color:var(--muted)]'}`}>
        {doc.present ? <FileText size={16} /> : <Upload size={16} />}
      </span>
      <div className="min-w-0 flex-1">
        <p className="text-sm font-semibold text-[color:var(--text)]">{label}</p>
        <p className="mt-0.5 truncate text-xs text-[color:var(--secondary)]">
          {doc.present ? (doc.filename || 'Uploaded') : 'Not uploaded yet'}
        </p>
        {editable && (
          <label htmlFor={inputId} className={`mt-2 inline-block cursor-pointer text-xs font-semibold ${uploading ? 'pointer-events-none text-[color:var(--muted)]' : 'text-[color:var(--accent)]'}`}>
            {uploading ? 'Uploading…' : doc.present ? 'Replace file' : '+ Upload file'}
          </label>
        )}
        <input
          id={inputId}
          type="file"
          className="hidden"
          disabled={uploading}
          accept={acceptFor(doc)}
          onChange={(e) => { const f = e.target.files?.[0]; if (f) onUpload(f); e.target.value = '' }}
        />
      </div>
    </div>
  )
}
