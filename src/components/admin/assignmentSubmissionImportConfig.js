/**
 * Assignment-submission bulk import configuration for the generic ImportDrawer.
 * Each row links a student (by email) to their already-hosted submission file —
 * no file ever transits our servers, only the link is stored (file_urls already
 * supports a plain { name, url } descriptor, same shape a self-submit produces).
 * Every imported row is created AND immediately run through the normal
 * submit-for-review flow, so it shows up in Approvals exactly like a student's
 * own submission would.
 */
import { bulkImportAssignmentSubmissions } from '../../api/services/assignmentService.js'

const SUBMISSION_FIELDS = [
  { key: 'email',     label: 'Student Email', required: true  },
  { key: 'file_url',  label: 'File Link',     required: true  },
  { key: 'file_name', label: 'File Name',     required: false },
  { key: 'notes',     label: 'Notes',         required: false },
]

const SUBMISSION_ALIASES = {
  email:     ['email', 'e-mail', 'mail', 'email address', 'student email', 'emailaddress'],
  file_url:  ['link', 'url', 'file link', 'file url', 'drive link', 'submission link', 'google drive link', 'gdrive link', 'attachment link', 'file', 'document link'],
  file_name: ['file name', 'filename', 'document name', 'attachment name', 'title'],
  notes:     ['notes', 'remarks', 'comment', 'comments', 'description'],
}

const SUBMISSION_TEMPLATE_ROWS = [
  ['email', 'file_url', 'file_name', 'notes'],
  ['anita.deshmukh@example.com', 'https://drive.google.com/file/d/EXAMPLE_ID_1/view', 'Anita_Assignment1.pdf', 'Submitted on time'],
  ['vikram.iyer@example.com',    'https://drive.google.com/file/d/EXAMPLE_ID_2/view', 'Vikram_Assignment1.pdf', ''],
]

const validateSubmissionRow = (row, idx) => {
  const errs = []
  if (!row.email?.trim())    errs.push('Missing student email')
  else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(row.email.trim())) errs.push('Invalid email format')
  if (!row.file_url?.trim()) errs.push('Missing file link')
  else if (!/^https?:\/\//i.test(row.file_url.trim())) errs.push('File link must start with http:// or https://')
  return errs.length ? { row: idx + 1, email: row.email || '—', errors: errs } : null
}

/** Build the ImportDrawer config bound to one assignment. */
export const buildAssignmentSubmissionImportConfig = (assignment) => ({
  label: `"${assignment.title}" Submissions`,
  singular: 'Submission',
  fields: SUBMISSION_FIELDS,
  aliases: SUBMISSION_ALIASES,
  templateRows: SUBMISSION_TEMPLATE_ROWS,
  templateFilename: 'assignment-submissions-import-template.csv',
  validateRow: validateSubmissionRow,
  importFn: (rows) => bulkImportAssignmentSubmissions(assignment.id, rows),
})
