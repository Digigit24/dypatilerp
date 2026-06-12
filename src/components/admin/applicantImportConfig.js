/**
 * Applicant import configuration for the generic ImportDrawer.
 * Mirrors the student import experience: upload → column mapping → review.
 */
import { importApplicants } from '../../api/services/applicantService.js'

const APPLICANT_FIELDS = [
  { key: 'first_name',          label: 'First Name',          required: true  },
  { key: 'last_name',           label: 'Last Name',           required: true  },
  { key: 'email',               label: 'Email',               required: true  },
  { key: 'phone',               label: 'Phone',               required: false },
  { key: 'status',              label: 'Status',              required: false },
  { key: 'batch_code',          label: 'Batch Code',          required: false },
  { key: 'university',          label: 'University',          required: false },
  { key: 'highest_degree',      label: 'Highest Degree',      required: false },
  { key: 'phd_discipline',      label: 'PhD Discipline',      required: false },
  { key: 'phd_research_title',  label: 'PhD Research Title',  required: false },
  { key: 'phd_completion_year', label: 'PhD Completion Year', required: false },
  { key: 'scopus_publications', label: 'Scopus Publications', required: false },
  { key: 'state_country',       label: 'State / Country',     required: false },
  { key: 'research_statement',  label: 'Research Statement',  required: false },
]

const APPLICANT_ALIASES = {
  first_name:          ['first', 'fname', 'first name', 'firstname', 'given', 'given name'],
  last_name:           ['last', 'lname', 'last name', 'lastname', 'surname', 'family name'],
  email:               ['email', 'e-mail', 'mail', 'email address', 'emailaddress'],
  phone:               ['phone', 'mobile', 'contact', 'phone number', 'mobile number', 'contact number', 'cell', 'whatsapp'],
  status:              ['status', 'application status', 'stage'],
  batch_code:          ['batch', 'batch code', 'batchcode', 'batch_code', 'cohort'],
  university:          ['university', 'institute', 'institution', 'college', 'phd university'],
  highest_degree:      ['degree', 'highest degree', 'qualification', 'highest qualification'],
  phd_discipline:      ['discipline', 'subject', 'phd discipline', 'phd subject', 'specialization', 'specialisation', 'field'],
  phd_research_title:  ['research title', 'thesis', 'thesis title', 'phd title', 'phd research title', 'dissertation'],
  phd_completion_year: ['completion year', 'phd year', 'year awarded', 'phd completion year', 'year of completion', 'passing year'],
  scopus_publications: ['scopus', 'publications', 'scopus publications', 'no of publications', 'papers'],
  state_country:       ['state', 'country', 'state country', 'state/country', 'location', 'city'],
  research_statement:  ['research statement', 'statement', 'sop', 'statement of purpose', 'research interest'],
}

const APPLICANT_TEMPLATE_ROWS = [
  ['first_name', 'last_name', 'email', 'phone', 'status', 'university', 'highest_degree', 'phd_discipline', 'phd_research_title', 'phd_completion_year', 'scopus_publications', 'state_country', 'research_statement'],
  ['Anita', 'Deshmukh', 'anita.deshmukh@example.com', '9876543210', 'submitted', 'Pune University', 'Ph.D.', 'Biotechnology', 'Gene expression in crop resilience', '2021', '4', 'Maharashtra, India', 'My research focuses on...'],
  ['Vikram', 'Iyer', 'vikram.iyer@example.com', '9876543211', 'submitted', 'IIT Bombay', 'Ph.D.', 'Mechanical Engineering', 'Thermal optimisation of EV batteries', '2022', '7', 'Karnataka, India', ''],
]

const VALID_STATUSES = ['submitted', 'test_pending', 'test_completed', 'shortlisted', 'rejected', 'enrolled']

const validateApplicantRow = (row, idx) => {
  const errs = []
  if (!row.first_name?.trim()) errs.push('Missing first name')
  if (!row.last_name?.trim())  errs.push('Missing last name')
  if (!row.email?.trim())      errs.push('Missing email')
  else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(row.email.trim())) errs.push('Invalid email format')
  if (row.status?.trim() && !VALID_STATUSES.includes(row.status.trim().toLowerCase()))
    errs.push(`Unknown status "${row.status}" (will default to submitted)`)
  if (row.phd_completion_year?.trim() && !/^(19|20)\d{2}$/.test(row.phd_completion_year.trim()))
    errs.push('Completion year should be a 4-digit year')
  // Only hard failures block the row — soft warnings keep it importable
  const hard = errs.filter((e) => e.startsWith('Missing') || e.startsWith('Invalid'))
  return hard.length ? { row: idx + 1, email: row.email || '—', errors: hard } : null
}

/** Build the ImportDrawer config bound to the active course */
export const buildApplicantImportConfig = (course) => ({
  label: 'Applicants',
  singular: 'Applicant',
  fields: APPLICANT_FIELDS,
  aliases: APPLICANT_ALIASES,
  templateRows: APPLICANT_TEMPLATE_ROWS,
  templateFilename: 'applicants-import-template.csv',
  validateRow: validateApplicantRow,
  importFn: (rows) => importApplicants(rows, course?.id),
})
