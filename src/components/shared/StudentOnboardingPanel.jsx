/**
 * StudentOnboardingPanel — personal-info form + document/upload grid.
 *
 * Shared between two places:
 *  1. The dedicated onboarding gate flow (pages/student/OnboardingPage.jsx)
 *  2. The "Profile" tab in StudentProfileView.jsx (both admin and student view)
 *
 * `editable` is true for the scholar's own view, and for admin/coordinator
 * staff viewing a scholar (they hold students:update); false otherwise.
 */
import { Download, Eye, FileText, Loader2, ShieldOff, Upload } from 'lucide-react'
import { useEffect, useState } from 'react'
import {
  downloadDocument, getDocuments, getOnboardingStatus, getProfileDetails, previewDocument,
  saveProfileDetails, setOnboardingSkip, uploadDocument,
} from '../../api/services/studentProfileService.js'
import DatePicker from './DatePicker.jsx'
import { useUiStore } from '../../store/uiStore.js'

const INFO_FIELDS = [
  { key: 'first_name',     label: 'First Name',      required: true },
  { key: 'middle_name',    label: 'Middle Name',     required: false },
  { key: 'last_name',      label: 'Last Name',       required: true },
  { key: 'father_name',    label: "Father's Name",   required: true },
  { key: 'mother_name',    label: "Mother's Name",   required: true },
  { key: 'phone',          label: 'Mobile Number',   required: true },
  { key: 'date_of_birth',  label: 'Date of Birth',   required: true, type: 'date' },
  { key: 'blood_group',    label: 'Blood Group',     required: true, placeholder: 'e.g. O+' },
  { key: 'postal_address', label: 'Postal Address',  required: true, type: 'textarea', wide: true },
  { key: 'current_designation',           label: 'Current Designation',              required: true },
  { key: 'current_organisation',          label: 'Current Institute/Organisation Name', required: true },
  { key: 'current_organisation_address',  label: 'Current Organisation Address',     required: true, type: 'textarea', wide: true },
]

const SLOT_LABELS = {
  cv: 'Your latest CV',
  research_proposal: 'Proposal for Postdoctoral Research (5 Pages Only)',
  publications_list: 'List of Publications till date (In APA Format Only)',
  research_statement: 'Research Statement (2 Pages Only)',
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
  const [actionSlot, setActionSlot] = useState(null) // `preview:<slot>` or `download:<slot>` currently in flight
  const [status, setStatus]     = useState(null)
  const [skipBusy, setSkipBusy] = useState(false)
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
    getOnboardingStatus(userId).then((r) => { setStatus(r.data); onStatusChange?.(r.data) }).catch(() => {})
  }

  useEffect(() => { loadDetails(); loadDocuments(); refreshStatus() }, [userId])

  // Admin-only — lets this one scholar into the app without finishing
  // onboarding. `editable` is false exactly when an admin/coordinator is
  // viewing someone else's profile (see the `!isAdminView` split at the
  // StudentProfileView call site), which is the only case this applies.
  const toggleSkip = async () => {
    setSkipBusy(true)
    try {
      const res = await setOnboardingSkip(userId, !status?.onboarding_skip)
      setStatus(res.data.onboarding)
      onStatusChange?.(res.data.onboarding)
      addToast({ type: 'success', title: res.data.onboarding?.onboarding_skip ? 'Onboarding skip enabled for this scholar.' : 'Onboarding skip disabled.' })
    } catch (e) {
      addToast({ type: 'error', title: e?.response?.data?.message || 'Could not update onboarding skip.' })
    } finally {
      setSkipBusy(false)
    }
  }

  // INFO_FIELDS' `required` flag previously only drew the red asterisk — it
  // was never actually enforced, so a field marked required could still be
  // saved blank. Blocking here is frontend-only by design: the backend
  // schema (profileDetailsSchema) keeps every one of these optional.
  const saveDetails = async () => {
    const missing = INFO_FIELDS.filter((f) => f.required && !String(draft[f.key] || '').trim())
    if (missing.length) {
      addToast({ type: 'error', title: `Please fill in: ${missing.map((f) => f.label).join(', ')}` })
      return
    }
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

  const handlePreview = async (slot) => {
    setActionSlot(`preview:${slot}`)
    try { await previewDocument(userId, slot) }
    catch (e) { addToast({ type: 'error', title: 'Preview failed', message: e?.response?.data?.message || e.message }) }
    finally { setActionSlot(null) }
  }

  const handleDownload = async (slot, filename) => {
    setActionSlot(`download:${slot}`)
    try { await downloadDocument(userId, slot, filename) }
    catch (e) { addToast({ type: 'error', title: 'Download failed', message: e?.response?.data?.message || e.message }) }
    finally { setActionSlot(null) }
  }

  if (!details) return null

  return (
    <div className="space-y-5">
      {!editable && (
        <div className="card flex flex-wrap items-center justify-between gap-3 p-5">
          <div className="flex items-center gap-3">
            <span className={`grid h-10 w-10 shrink-0 place-items-center rounded-xl ${status?.onboarding_skip ? 'bg-amber-100 text-amber-600' : 'bg-[color:var(--surface)] text-[color:var(--secondary)]'}`}>
              <ShieldOff size={17} />
            </span>
            <div>
              <p className="text-sm font-semibold text-[color:var(--text)]">Allow user to skip onboarding</p>
              <p className="mt-0.5 text-xs text-[color:var(--secondary)]">
                Lets this scholar use the app before their onboarding is complete. Turning it back off re-locks them unless they finish for real.
              </p>
            </div>
          </div>
          <button
            type="button"
            role="switch"
            aria-checked={!!status?.onboarding_skip}
            disabled={skipBusy || !status}
            onClick={toggleSkip}
            className={`relative h-7 w-12 shrink-0 rounded-full transition disabled:opacity-50 ${status?.onboarding_skip ? 'bg-[color:var(--accent)]' : 'bg-[color:var(--border)]'}`}
          >
            <span className={`absolute top-1 h-5 w-5 rounded-full bg-white shadow transition-all ${status?.onboarding_skip ? 'left-6' : 'left-1'}`} />
          </button>
        </div>
      )}

      <div className="card p-6">
        <h2 className="text-lg font-semibold text-[color:var(--text)]">Onboarding Details</h2>
        <p className="mt-1 text-sm text-[color:var(--secondary)]">
          Family, identity and contact details required for institute records.
        </p>
        <div className="mt-4 grid gap-3 sm:grid-cols-2">
          {/* Email is the account identifier, not an onboarding field — always
              shown so a scholar can confirm it, but never editable here. */}
          <label className="block">
            <span className="text-sm font-semibold text-[color:var(--text)]">Email</span>
            <input type="text" disabled className="input mt-1.5 w-full opacity-70" value={draft.email || ''} />
          </label>
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
                ) : f.type === 'date' ? (
                  <DatePicker
                    className="mt-1.5"
                    required={f.required}
                    name={f.key}
                    max={new Date().toISOString().slice(0, 10)}
                    value={String(draft[f.key] || '').slice(0, 10)}
                    onChange={(v) => setDraft((p) => ({ ...p, [f.key]: v }))}
                  />
                ) : (
                  <input
                    type="text"
                    className="input mt-1.5 w-full"
                    placeholder={f.placeholder}
                    value={draft[f.key] || ''}
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
              previewing={actionSlot === `preview:${doc.slot}`}
              downloading={actionSlot === `download:${doc.slot}`}
              onUpload={(file) => handleUpload(doc.slot, file)}
              onPreview={() => handlePreview(doc.slot)}
              onDownload={() => handleDownload(doc.slot, doc.filename)}
            />
          ))}
        </div>
      </div>
    </div>
  )
}

function DocumentSlot({ doc, label, editable, uploading, previewing, downloading, onUpload, onPreview, onDownload }) {
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
        <div className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1.5">
          {doc.present && (
            <>
              <button
                type="button"
                onClick={onPreview}
                disabled={previewing}
                className="inline-flex items-center gap-1 text-xs font-semibold text-[color:var(--accent)] disabled:opacity-50"
              >
                {previewing ? <Loader2 size={12} className="animate-spin" /> : <Eye size={12} />} View
              </button>
              <button
                type="button"
                onClick={onDownload}
                disabled={downloading}
                className="inline-flex items-center gap-1 text-xs font-semibold text-[color:var(--secondary)] disabled:opacity-50"
              >
                {downloading ? <Loader2 size={12} className="animate-spin" /> : <Download size={12} />} Download
              </button>
            </>
          )}
          {editable && (
            <label htmlFor={inputId} className={`inline-block cursor-pointer text-xs font-semibold ${uploading ? 'pointer-events-none text-[color:var(--muted)]' : 'text-[color:var(--accent)]'}`}>
              {uploading ? 'Uploading…' : doc.present ? 'Replace file' : '+ Upload file'}
            </label>
          )}
        </div>
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
