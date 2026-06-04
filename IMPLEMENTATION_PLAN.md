# Frontend Login UI + API Integration — Implementation Plan

> **For a fresh agent:** This document is fully self-contained. Everything you need to know
> about the project, the current state, and the exact steps to implement is here.
> Work through the tasks in order. Do not skip phases.

---

## Project Context

**What this is:** React SPA (Vite + Tailwind v4) for the DY Patil Applied Business Research
Fellowship ERP. Multi-role system: admin, coordinator, academic_guide, industry_mentor, student, applicant.

**Root directory:** `c:\ritik\hrithik\dypatilerp`

**Backend:** Running at `http://localhost:5000/api` (Node.js/Express/Neon PostgreSQL).
Start it with: `cd backend && npm run dev`

**Frontend:** Running at `http://localhost:5173` via `npm run dev` from root.

---

## Current Frontend State

```
src/
├── api/
│   ├── config.js          ← USE_MOCK = true, BASE_URL = 'http://localhost:8000/api' (wrong port)
│   ├── mock/              ← 12 mock data files (keep, used as fallback)
│   └── services/          ← 12 service files (all mock-only, need real API wiring)
│       ├── _mock.js       ← ok(), notFound(), delay(), byId(), applyFilters()
│       ├── userService.js
│       ├── applicantService.js
│       ├── batchService.js
│       ├── studentService.js
│       ├── submissionService.js
│       ├── approvalService.js
│       ├── feeService.js
│       ├── testService.js
│       ├── notificationService.js
│       ├── progressReportService.js
│       ├── researchProfileService.js
│       └── themeService.js
├── store/
│   ├── authStore.js       ← { currentUser, role, login(), logout(), setRole() } — NO token storage
│   └── uiStore.js         ← { theme, themeConfig, toasts, ... }
├── layouts/
│   ├── AdminLayout.jsx    ← hardcoded "Dr. Priya Sharma" in sidebar footer
│   └── StudentLayout.jsx  ← similarly hardcoded
├── components/shared/
│   └── DevRoleSwitcher.jsx ← dev-only role switcher, needs to be removed in prod
├── App.jsx                ← no /login route, no route protection
└── pages/
    ├── admin/             ← 14 pages all using mock data
    └── student/           ← 8 pages all using mock data
```

**No axios installed yet** — must be added.

---

## Backend API Quick Reference

Base URL: `http://localhost:5000/api`
Swagger: `http://localhost:5000/api-docs`
Admin credentials: `admin@dypatil.edu` / `Admin@1234`

| Endpoint | Method | Body / Params | Returns |
|---|---|---|---|
| `/auth/login` | POST | `{ email, password }` | `{ data: { user, access_token, refresh_token } }` |
| `/auth/register` | POST | `{ email, password, first_name, last_name }` | `{ data: { user, access_token, refresh_token } }` |
| `/auth/me` | GET | — | `{ data: { id, email, first_name, last_name, roles: ['admin'] } }` |
| `/auth/refresh` | POST | `{ refresh_token }` | `{ data: { access_token, refresh_token } }` |
| `/auth/logout` | POST | — | `{ success: true }` |
| `/courses` | GET | `?page&limit&is_active` | `{ data: [], pagination: { total, page, limit } }` |
| `/batches` | GET | `?course_id&status&page&limit` | `{ data: [], pagination }` |
| `/applicants` | GET | `?status&search&course_id&page&limit` | `{ data: [], pagination }` |
| `/applicants/:id/status` | PUT | `{ status, batch_id? }` | `{ data: applicant }` |
| `/applicants/:id/convert` | POST | `{ batch_id }` | `{ data: { user_id, enrollment_number } }` |
| `/students` | GET | `?batch_id&search&page&limit` | `{ data: [], pagination }` |
| `/students/:id` | GET | — | `{ data: student + guides + progress_summary }` |
| `/submissions` | GET | `?batch_id&status&page&limit` | `{ data: [], pagination }` |
| `/submissions` | POST | `{ batch_id, title, submission_type, semester }` | `{ data: submission }` |
| `/submissions/:id/submit` | POST | — | submits for review, creates approval chain |
| `/approvals/pending` | GET | — | approvals pending for current user's role |
| `/approvals/:id/action` | POST | `{ action: 'approve'/'reject'/'request_revision', comments? }` | |
| `/fees` | GET | `?student_user_id&batch_id&status` | `{ data: [], pagination }` |
| `/fees/:id/payments` | POST | `{ amount, payment_method, transaction_id? }` | |
| `/notifications` | GET | `?is_read&page&limit` | `{ data: [], pagination }` |
| `/notifications` | POST | `{ type, title, message, recipient_ids: [] }` | |
| `/notifications/:id/read` | PUT | — | marks read |
| `/notifications/mark-all-read` | PUT | — | |
| `/progress-reports` | GET | `?batch_id&student_user_id&semester` | `{ data: [], pagination }` |
| `/research-profiles/:userId` | GET | — | `{ data: profile + publications }` |
| `/research-profiles/:userId` | PUT | profile payload | upserts profile |
| `/dashboard/admin` | GET | — | KPIs: applicants, students, submissions, fees |
| `/dashboard/student` | GET | — | personal: enrollment, submissions, guides, fees |

**Standard response shape (all endpoints):**
```json
{ "success": true, "data": <object or array>, "message": "...", "pagination": { "total": 5, "page": 1, "limit": 20, "totalPages": 1 } }
```

**Error response:**
```json
{ "success": false, "message": "Validation failed", "errors": [] }
```

---

## Critical: Data Shape Differences (Mock vs Real)

Mock data was designed independently and has different field names than the backend.
**When wiring a service, you must also update the pages that consume it.**

| Mock field | Real API field |
|---|---|
| `applicant.personal.full_name` | `applicant.first_name + last_name` |
| `applicant.personal.email` | `applicant.email` |
| `submission.student_name` | `submission.first_name + last_name` |
| `submission.batch` | `submission.batch_name` |
| `user.role` (single string) | `user.roles` (array: `['admin']`) |
| `fee.semester_label` | `fee.semester` (integer) |

The safe strategy: **wire services one at a time, and update the consuming page in the same task.**

---

## Implementation Plan — Ordered Task List

---

### PHASE 1 — Auth Layer (Complete this before touching any other service)

#### Task 1.1 — Install axios

```bash
cd c:\ritik\hrithik\dypatilerp
npm install axios
```

#### Task 1.2 — Create `src/api/http.js`

New file. Axios instance with:
- Base URL pointing to `http://localhost:5000/api`
- Request interceptor: attach `Authorization: Bearer <token>` from localStorage
- Response interceptor: on 401, try refresh token → retry; if refresh fails, redirect to `/login`

```js
// src/api/http.js
import axios from 'axios'

const BASE = 'http://localhost:5000/api'

const http = axios.create({ baseURL: BASE, timeout: 15000 })

http.interceptors.request.use((config) => {
  const token = localStorage.getItem('access_token')
  if (token) config.headers.Authorization = `Bearer ${token}`
  return config
})

http.interceptors.response.use(
  (res) => res,
  async (error) => {
    const original = error.config
    if (error.response?.status === 401 && !original._retry) {
      original._retry = true
      const refresh = localStorage.getItem('refresh_token')
      if (refresh) {
        try {
          const { data } = await axios.post(`${BASE}/auth/refresh`, { refresh_token: refresh })
          const { access_token, refresh_token } = data.data
          localStorage.setItem('access_token', access_token)
          localStorage.setItem('refresh_token', refresh_token)
          original.headers.Authorization = `Bearer ${access_token}`
          return http(original)
        } catch {
          localStorage.removeItem('access_token')
          localStorage.removeItem('refresh_token')
          window.location.href = '/login'
        }
      } else {
        window.location.href = '/login'
      }
    }
    return Promise.reject(error)
  }
)

export default http
```

#### Task 1.3 — Update `src/api/config.js`

```js
// src/api/config.js
export const USE_MOCK = false
export const BASE_URL = 'http://localhost:5000/api'
```

#### Task 1.4 — Rewrite `src/store/authStore.js`

Replace the current store entirely. Add:
- Token storage in localStorage
- `initAuth()` to rehydrate on page reload from stored token
- `setTokens()` to save tokens
- `clearAuth()` to remove tokens + user

```js
// src/store/authStore.js
import { create } from 'zustand'

const loadUser = () => {
  try { return JSON.parse(localStorage.getItem('auth_user') || 'null') }
  catch { return null }
}

export const useAuthStore = create((set) => ({
  currentUser: loadUser(),
  role: loadUser()?.roles?.[0] || null,

  setAuth: (user, accessToken, refreshToken) => {
    localStorage.setItem('access_token', accessToken)
    localStorage.setItem('refresh_token', refreshToken)
    localStorage.setItem('auth_user', JSON.stringify(user))
    set({ currentUser: user, role: user?.roles?.[0] || null })
  },

  clearAuth: () => {
    localStorage.removeItem('access_token')
    localStorage.removeItem('refresh_token')
    localStorage.removeItem('auth_user')
    set({ currentUser: null, role: null })
  },

  // kept for DevRoleSwitcher compatibility during transition
  setRole: (role) => set({ role }),
}))
```

#### Task 1.5 — Rewrite `src/api/services/userService.js`

This service must support both login/logout (auth flow) AND user CRUD (admin).
Make it call the real API when `USE_MOCK = false`.

```js
// src/api/services/userService.js
import { USERS } from '../mock/users.js'
import { USE_MOCK } from '../config.js'
import { applyFilters, byId, delay, notFound, ok } from './_mock.js'
import http from '../http.js'

export const login = async (email, password) => {
  if (USE_MOCK) {
    await delay()
    const user = USERS.find((u) => u.email === email) || USERS[0]
    return ok({ user, access_token: 'mock_token', refresh_token: 'mock_refresh' })
  }
  const { data: res } = await http.post('/auth/login', { email, password })
  return ok(res.data)
}

export const logout = async () => {
  if (USE_MOCK) { await delay(); return ok(null) }
  await http.post('/auth/logout')
  return ok(null)
}

export const getMe = async () => {
  if (USE_MOCK) {
    await delay()
    return ok(USERS.find((u) => u.role === 'admin') || USERS[0])
  }
  const { data: res } = await http.get('/auth/me')
  return ok(res.data)
}

export const getUsers = async (filters = {}) => {
  if (USE_MOCK) { await delay(); const data = applyFilters(USERS, filters); return ok(data, { total: data.length }) }
  const { data: res } = await http.get('/users', { params: filters })
  return ok(res.data, { total: res.pagination?.total || 0 })
}

export const getUserById = async (id) => {
  if (USE_MOCK) { await delay(); const user = byId(USERS, id); return user ? ok(user) : notFound() }
  const { data: res } = await http.get(`/users/${id}`)
  return ok(res.data)
}

export const updateUser = async (id, payload) => {
  if (USE_MOCK) { await delay(); const user = byId(USERS, id); return user ? ok({ ...user, ...payload }) : notFound() }
  const { data: res } = await http.put(`/users/${id}`, payload)
  return ok(res.data)
}
```

#### Task 1.6 — Create `src/pages/auth/LoginPage.jsx`

New file. Full-page login form using the design system classes (`.card`, `.btn-primary`, `.input`).

**What it must do:**
1. Render email + password form with React Hook Form
2. On submit → call `login(email, password)` from userService
3. On success → call `setAuth(user, access_token, refresh_token)` from authStore
4. Navigate to correct dashboard based on `user.roles[0]`:
   - `admin` / `coordinator` → `/admin`
   - `student` → `/student/dashboard`
   - `academic_guide` / `industry_mentor` → `/admin` (they use admin layout)
   - `applicant` → `/` (landing)
5. Show error toast on failure (use `addToast` from uiStore)
6. Show loading spinner on submit

UI design requirements:
- Split layout: left side = brand/logo panel (indigo/accent bg, program name, tagline), right side = form
- Use `.input` class for inputs
- Use `.btn-primary` class for submit button
- Show the university logo text (no image needed — just styled text)
- Link to `/apply` for new applicants
- Responsive: stacks on mobile

#### Task 1.7 — Create `src/components/shared/ProtectedRoute.jsx`

```jsx
// src/components/shared/ProtectedRoute.jsx
import { Navigate, useLocation } from 'react-router-dom'
import { useAuthStore } from '../../store/authStore.js'

export default function ProtectedRoute({ children, allowedRoles }) {
  const { currentUser, role } = useAuthStore()
  const location = useLocation()

  if (!currentUser) {
    return <Navigate to="/login" state={{ from: location }} replace />
  }

  if (allowedRoles && !allowedRoles.includes(role)) {
    // redirect to their correct dashboard
    const dashboard = ['admin','coordinator','academic_guide','industry_mentor'].includes(role)
      ? '/admin'
      : '/student/dashboard'
    return <Navigate to={dashboard} replace />
  }

  return children
}
```

#### Task 1.8 — Update `src/App.jsx`

Add the `/login` route and wrap protected zones in `<ProtectedRoute>`.

Changes needed:
1. Import `LoginPage` and `ProtectedRoute`
2. Add `<Route path="/login" element={<LoginPage />} />` before other routes (no layout)
3. Wrap `/admin` routes with `<ProtectedRoute allowedRoles={['admin','coordinator','academic_guide','industry_mentor']}>`
4. Wrap `/student` routes with `<ProtectedRoute allowedRoles={['student']}>`
5. Keep `/`, `/apply`, `/confirmation`, `/test/:testId`, `/onboard`, `/p/:slug` as public

#### Task 1.9 — Update `src/layouts/AdminLayout.jsx`

Replace the hardcoded user section with real data from authStore.
- Replace `"Dr. Priya Sharma"` / `"Coordinator"` with `currentUser.first_name + last_name` / `role`
- Wire the `<LogOut>` button to call `logout()` from userService, then `clearAuth()` from authStore, then navigate to `/login`
- Remove `<DevRoleSwitcher />` or gate it on `isDev` flag

#### Task 1.10 — Update `src/layouts/StudentLayout.jsx`

Same as Task 1.9 — replace hardcoded user with real authStore data.

---

**PHASE 1 DONE CHECK:**
- [ ] `npm run dev` starts without errors
- [ ] `/login` page renders correctly
- [ ] Login with `admin@dypatil.edu` / `Admin@1234` succeeds
- [ ] Redirected to `/admin` dashboard
- [ ] Refreshing the page keeps user logged in (localStorage token rehydration)
- [ ] Logout clears storage and redirects to `/login`
- [ ] Direct navigation to `/admin` without login redirects to `/login`

---

### PHASE 2 — Wire Simple Services (data shapes are straightforward)

These services have close enough data shapes that pages won't need heavy edits.

#### Task 2.1 — Wire `notificationService.js`

```js
export const getNotifications = async (filters = {}) => {
  if (USE_MOCK) { /* existing mock */ }
  const { data: res } = await http.get('/notifications', { params: filters })
  return ok(res.data, { total: res.pagination?.total || 0 })
}

export const getUnreadCount = async () => {
  if (USE_MOCK) { /* existing mock */ }
  const { data: res } = await http.get('/notifications', { params: { is_read: false, limit: 1 } })
  return ok(res.pagination?.total || 0)
}

export const markAsRead = async (id) => {
  if (USE_MOCK) { /* existing mock */ }
  await http.put(`/notifications/${id}/read`)
  return ok({ id, is_read: true })
}

export const markAllAsRead = async () => {
  if (USE_MOCK) { /* existing mock */ }
  await http.put('/notifications/mark-all-read')
  return ok({ updated: true })
}

export const sendNotification = async (payload) => {
  if (USE_MOCK) { /* existing mock */ }
  // payload needs: { type, title, message, recipient_ids: [] }
  const { data: res } = await http.post('/notifications', payload)
  return ok(res.data)
}
```

**Pages to check:** `src/pages/admin/NotificationsPage.jsx`, `src/pages/student/NotificationsPage.jsx`, `src/components/shared/NotificationBell.jsx`
- Verify `notification.title`, `notification.message`, `notification.created_at`, `notification.is_read` match what pages expect.

#### Task 2.2 — Wire `batchService.js`

```js
export const getBatches = async (filters = {}) => {
  if (USE_MOCK) { /* existing mock */ }
  const { data: res } = await http.get('/batches', { params: filters })
  return ok(res.data, { total: res.pagination?.total || 0 })
}

export const getBatchById = async (id) => {
  if (USE_MOCK) { /* existing mock */ }
  const { data: res } = await http.get(`/batches/${id}`)
  return ok(res.data)
}

export const createBatch = async (payload) => {
  if (USE_MOCK) { /* existing mock */ }
  const { data: res } = await http.post('/batches', payload)
  return ok(res.data)
}

export const updateBatch = async (id, payload) => {
  if (USE_MOCK) { /* existing mock */ }
  const { data: res } = await http.put(`/batches/${id}`, payload)
  return ok(res.data)
}

export const getBatchStudents = async (batchId, filters = {}) => {
  if (USE_MOCK) { return ok([]) }
  const { data: res } = await http.get(`/batches/${batchId}/students`, { params: filters })
  return ok(res.data, { total: res.pagination?.total || 0 })
}

export const getBatchStats = async (batchId) => {
  if (USE_MOCK) { return ok({}) }
  const { data: res } = await http.get(`/batches/${batchId}/stats`)
  return ok(res.data)
}
```

**Pages to check:** `src/pages/admin/BatchesPage.jsx`, `src/pages/admin/BatchStudentsPage.jsx`
- Real batch fields: `id, name, code, status, start_date, end_date, max_students, enrolled_count, course_name`
- Update any mock-specific field reads

#### Task 2.3 — Wire `progressReportService.js`

```js
export const getProgressReports = async (filters = {}) => {
  if (USE_MOCK) { /* existing mock */ }
  const { data: res } = await http.get('/progress-reports', { params: filters })
  return ok(res.data, { total: res.pagination?.total || 0 })
}

export const updateProgressReport = async (id, payload) => {
  if (USE_MOCK) { /* existing mock */ }
  const { data: res } = await http.put(`/progress-reports/${id}`, payload)
  return ok(res.data)
}
```

**Pages to check:** `src/pages/admin/ProgressReportsPage.jsx`, `src/pages/student/ProgressPage.jsx`

#### Task 2.4 — Wire `feeService.js`

```js
export const getFees = async (filters = {}) => {
  if (USE_MOCK) { /* existing mock */ }
  const { data: res } = await http.get('/fees', { params: filters })
  return ok(res.data, { total: res.pagination?.total || 0 })
}

export const getFeeById = async (id) => {
  if (USE_MOCK) { /* existing mock */ }
  const { data: res } = await http.get(`/fees/${id}`)
  return ok(res.data)
}

export const getFeesByStudent = async (student_user_id) => getFees({ student_user_id })

export const markFeePaid = async (id, payload = {}) => {
  if (USE_MOCK) { /* existing mock */ }
  // Maps to POST /fees/:id/payments
  const { data: res } = await http.post(`/fees/${id}/payments`, {
    amount: payload.amount,
    payment_method: payload.payment_mode || 'bank_transfer',
    transaction_id: payload.transaction_id,
  })
  return ok(res.data)
}
```

**Pages to check:** `src/pages/admin/FeesPage.jsx`, `src/pages/student/FeesPage.jsx`
- Real fee fields: `id, semester, amount, due_date, status, amount_paid, student_user_id, first_name, last_name, batch_name`

---

### PHASE 3 — Wire Complex Services (requires page field updates)

#### Task 3.1 — Wire `applicantService.js` + update ApplicantsPage

Wire the service:
```js
export const getApplicants = async (filters = {}) => {
  if (USE_MOCK) { /* existing mock */ }
  const { data: res } = await http.get('/applicants', { params: filters })
  return ok(res.data, { total: res.pagination?.total || 0 })
}

export const getApplicantById = async (id) => {
  if (USE_MOCK) { /* existing mock */ }
  const { data: res } = await http.get(`/applicants/${id}`)
  return ok(res.data)
}

export const createApplicant = async (payload) => {
  if (USE_MOCK) { /* existing mock */ }
  const { data: res } = await http.post('/applicants', payload)
  return ok(res.data)
}

export const updateApplicantStatus = async (id, status, batch_id) => {
  if (USE_MOCK) { /* existing mock */ }
  const { data: res } = await http.put(`/applicants/${id}/status`, { status, batch_id })
  return ok(res.data)
}

export const shortlistApplicant = async (id) => updateApplicantStatus(id, 'shortlisted')

export const convertToStudent = async (id, batch_id) => {
  if (USE_MOCK) { return ok({}) }
  const { data: res } = await http.post(`/applicants/${id}/convert`, { batch_id })
  return ok(res.data)
}

export const bulkConvert = async (applicant_ids, batch_id) => {
  if (USE_MOCK) { return ok([]) }
  const { data: res } = await http.post('/applicants/bulk-convert', { applicant_ids, batch_id })
  return ok(res.data)
}
```

**Update `src/pages/admin/ApplicantsPage.jsx`:**
- Replace `applicant.personal.full_name` → `${applicant.first_name} ${applicant.last_name}`
- Replace `applicant.personal.email` → `applicant.email`
- Replace `applicant.personal.phone` → `applicant.phone`
- Replace `applicant.phd?.university` → `applicant.phd_details?.university`
- Replace `applicant.applied_at` → stays same

#### Task 3.2 — Wire `studentService.js` + update StudentsPage

```js
export const getStudents = async (filters = {}) => {
  if (USE_MOCK) { /* existing mock */ }
  const { data: res } = await http.get('/students', { params: filters })
  return ok(res.data, { total: res.pagination?.total || 0 })
}

export const getStudentById = async (id) => {
  if (USE_MOCK) { /* existing mock */ }
  const { data: res } = await http.get(`/students/${id}`)
  return ok(res.data)
}

export const updateStudent = async (id, payload) => {
  if (USE_MOCK) { /* existing mock */ }
  const { data: res } = await http.put(`/users/${id}`, payload)
  return ok(res.data)
}

export const assignGuide = async (studentId, guideData) => {
  if (USE_MOCK) { return ok({}) }
  const { data: res } = await http.post(`/students/${studentId}/guides`, guideData)
  return ok(res.data)
}
```

**Update `src/pages/admin/StudentsPage.jsx`, `src/pages/admin/StudentProfilePage.jsx`:**
- Replace `student.name` → `${student.first_name} ${student.last_name}`
- Replace `student.enrollment_id` → `student.enrollment_number`
- Replace `student.guides` → `student.guides` (same key, but fields differ)
- Replace `student.academic_guide.name` → `${guide.first_name} ${guide.last_name}` where `guide.guide_type === 'academic'`

#### Task 3.3 — Wire `submissionService.js` + update SubmissionsPages

```js
export const getSubmissions = async (filters = {}) => {
  if (USE_MOCK) { /* existing mock */ }
  const { data: res } = await http.get('/submissions', { params: filters })
  return ok(res.data, { total: res.pagination?.total || 0 })
}

export const getSubmissionById = async (id) => {
  if (USE_MOCK) { /* existing mock */ }
  const { data: res } = await http.get(`/submissions/${id}`)
  return ok(res.data)
}

export const createSubmission = async (payload) => {
  if (USE_MOCK) { /* existing mock */ }
  const { data: res } = await http.post('/submissions', payload)
  return ok(res.data)
}

export const updateSubmission = async (id, payload) => {
  if (USE_MOCK) { /* existing mock */ }
  const { data: res } = await http.put(`/submissions/${id}`, payload)
  return ok(res.data)
}

export const submitForReview = async (id) => {
  if (USE_MOCK) { return ok({}) }
  const { data: res } = await http.post(`/submissions/${id}/submit`)
  return ok(res.data)
}

export const getSubmissionsByStudent = async (student_user_id) => getSubmissions({ student_user_id })
```

**Update `src/pages/student/SubmitPage.jsx`, `src/pages/student/SubmissionsPage.jsx`, `src/pages/admin/ApprovalsPage.jsx` (if it reads submissions)**

#### Task 3.4 — Wire `approvalService.js` + update ApprovalsPage

```js
export const getApprovals = async (filters = {}) => {
  if (USE_MOCK) { /* existing mock */ }
  const { data: res } = await http.get('/approvals', { params: filters })
  return ok(res.data, { total: res.pagination?.total || 0 })
}

export const getPendingApprovals = async () => {
  if (USE_MOCK) { /* existing mock */ }
  const { data: res } = await http.get('/approvals/pending')
  return ok(res.data)
}

export const reviewSubmission = async (approvalId, payload) => {
  if (USE_MOCK) { /* existing mock */ }
  // payload: { action: 'approve'|'reject'|'request_revision', comments? }
  const { data: res } = await http.post(`/approvals/${approvalId}/action`, payload)
  return ok(res.data)
}
```

#### Task 3.5 — Wire `researchProfileService.js`

```js
export const getResearchProfile = async (userId) => {
  if (USE_MOCK) { /* existing mock */ }
  const { data: res } = await http.get(`/research-profiles/${userId}`)
  return ok(res.data)
}

export const updateResearchProfile = async (userId, payload) => {
  if (USE_MOCK) { /* existing mock */ }
  const { data: res } = await http.put(`/research-profiles/${userId}`, payload)
  return ok(res.data)
}

export const addPublication = async (userId, payload) => {
  if (USE_MOCK) { return ok({}) }
  const { data: res } = await http.post(`/research-profiles/${userId}/publications`, payload)
  return ok(res.data)
}

export const deletePublication = async (userId, pubId) => {
  if (USE_MOCK) { return ok(null) }
  await http.delete(`/research-profiles/${userId}/publications/${pubId}`)
  return ok(null)
}
```

#### Task 3.6 — Wire `testService.js`

```js
export const getTests = async (filters = {}) => {
  if (USE_MOCK) { /* existing mock */ }
  const { data: res } = await http.get('/tests', { params: filters })
  return ok(res.data, { total: res.pagination?.total || 0 })
}

export const getTestById = async (id) => {
  if (USE_MOCK) { /* existing mock */ }
  const { data: res } = await http.get(`/tests/${id}`)
  return ok(res.data)
}

export const createTest = async (payload) => {
  if (USE_MOCK) { /* existing mock */ }
  const { data: res } = await http.post('/tests', payload)
  return ok(res.data)
}

export const updateTest = async (id, payload) => {
  if (USE_MOCK) { /* existing mock */ }
  const { data: res } = await http.put(`/tests/${id}`, payload)
  return ok(res.data)
}

export const publishTest = async (id) => {
  if (USE_MOCK) { return ok({}) }
  const { data: res } = await http.post(`/tests/${id}/publish`)
  return ok(res.data)
}

export const addQuestion = async (testId, payload) => {
  if (USE_MOCK) { return ok({}) }
  const { data: res } = await http.post(`/tests/${testId}/questions`, payload)
  return ok(res.data)
}

export const deleteQuestion = async (testId, questionId) => {
  if (USE_MOCK) { return ok(null) }
  await http.delete(`/tests/${testId}/questions/${questionId}`)
  return ok(null)
}

export const startTest = async (id) => {
  if (USE_MOCK) { return ok({}) }
  const { data: res } = await http.post(`/tests/${id}/start`)
  return ok(res.data)
}

export const submitTest = async (id, responses) => {
  if (USE_MOCK) { return ok({}) }
  const { data: res } = await http.post(`/tests/${id}/submit`, { responses })
  return ok(res.data)
}
```

---

### PHASE 4 — Dashboard Wiring

#### Task 4.1 — Wire Admin Dashboard to real data

Update `src/pages/admin/AdminDashboard.jsx`:
- Import and call `GET /dashboard/admin` via http client
- Response: `{ applicants: [{status, count}], total_active_students, submissions: [], fees: {total_due, total_paid}, total_active_courses, batches: [] }`
- Map response fields to existing KPI cards

#### Task 4.2 — Wire Student Dashboard to real data

Update `src/pages/student/DashboardPage.jsx`:
- Call `GET /dashboard/student`
- Response: `{ enrollment, submissions: [], progress, fees, guides: [], unread_notifications }`
- If no enrollment → show "pending enrollment" state

#### Task 4.3 — Wire Course Dashboard

Update or create `src/pages/admin/CourseDashboardPage.jsx`:
- Call `GET /dashboard/courses/:courseId`
- Response: `{ batches: [], total_active_students, applicants: [], submissions: [], fees, top_students_by_progress }`

---

### PHASE 5 — Polish & Error Handling

#### Task 5.1 — Global API error handling in pages

Each page that calls a service should catch errors and:
```jsx
try {
  const result = await getApplicants(filters)
  setData(result.data)
} catch (error) {
  addToast({ type: 'error', title: 'Failed to load', message: error.response?.data?.message || 'Something went wrong' })
}
```

#### Task 5.2 — Loading states

Every service call should set `loading = true` before and `false` after.
Use existing `<SkeletonCard />` component during loading.

#### Task 5.3 — Remove DevRoleSwitcher from production

In `src/layouts/AdminLayout.jsx` and `src/layouts/StudentLayout.jsx`:
```jsx
{import.meta.env.DEV && <DevRoleSwitcher />}
```

#### Task 5.4 — 401 redirect from `src/api/http.js` (already handled in Task 1.2)

Verify it works: log out and manually call an API — should redirect to `/login`.

#### Task 5.5 — Handle missing fields gracefully

Add `?? ''` or fallback defaults where mock data was more complete than real data.

---

## File Creation Summary

| File | Action |
|---|---|
| `src/api/http.js` | **CREATE NEW** — axios instance with auth interceptors |
| `src/api/config.js` | **EDIT** — set `USE_MOCK = false`, fix port to 5000 |
| `src/store/authStore.js` | **REWRITE** — add token storage, `setAuth()`, `clearAuth()` |
| `src/pages/auth/LoginPage.jsx` | **CREATE NEW** — split-panel login form |
| `src/components/shared/ProtectedRoute.jsx` | **CREATE NEW** — auth guard component |
| `src/App.jsx` | **EDIT** — add `/login` route + wrap protected zones |
| `src/layouts/AdminLayout.jsx` | **EDIT** — real user name, real logout |
| `src/layouts/StudentLayout.jsx` | **EDIT** — real user name, real logout |
| `src/api/services/userService.js` | **REWRITE** — add login/logout/getMe + real CRUD |
| `src/api/services/notificationService.js` | **EDIT** — add real API branch |
| `src/api/services/batchService.js` | **EDIT** — add real API branch |
| `src/api/services/progressReportService.js` | **EDIT** — add real API branch |
| `src/api/services/feeService.js` | **EDIT** — add real API branch |
| `src/api/services/applicantService.js` | **EDIT** — add real API branch |
| `src/api/services/studentService.js` | **EDIT** — add real API branch |
| `src/api/services/submissionService.js` | **EDIT** — add real API branch |
| `src/api/services/approvalService.js` | **EDIT** — add real API branch |
| `src/api/services/researchProfileService.js` | **EDIT** — add real API branch |
| `src/api/services/testService.js` | **EDIT** — add real API branch |
| `src/pages/admin/AdminDashboard.jsx` | **EDIT** — wire to `/dashboard/admin` |
| `src/pages/student/DashboardPage.jsx` | **EDIT** — wire to `/dashboard/student` |

---

## Design Spec for LoginPage

```
┌─────────────────────────────────────────────────────────┐
│                                                         │
│  ┌───────────────────┐  ┌──────────────────────────┐   │
│  │  [Brand Panel]    │  │  [Form Panel]            │   │
│  │                   │  │                          │   │
│  │  accent bg        │  │  white / card bg         │   │
│  │                   │  │                          │   │
│  │  DY Patil         │  │  Welcome back            │   │
│  │  Education        │  │  Sign in to continue     │   │
│  │  Foundation       │  │                          │   │
│  │                   │  │  Email                   │   │
│  │  "Applied         │  │  [input field       ]    │   │
│  │  Business         │  │                          │   │
│  │  Research         │  │  Password                │   │
│  │  Fellowship"      │  │  [input field       ]    │   │
│  │                   │  │                          │   │
│  │  ✦ Key feature 1  │  │  [Sign In]  ← .btn-primary  │
│  │  ✦ Key feature 2  │  │                          │   │
│  │  ✦ Key feature 3  │  │  New applicant?          │   │
│  │                   │  │  Apply here →            │   │
│  └───────────────────┘  └──────────────────────────┘   │
│                                                         │
└─────────────────────────────────────────────────────────┘

Mobile: Brand panel collapses to top banner; form below.
```

CSS to use:
- Brand panel: `bg-[color:var(--accent)]` or `style={{ background: 'var(--accent)' }}`
- Text on brand: white
- Card: `.card` class or `soft-panel`
- Inputs: `.input` class
- Button: `.btn-primary`
- Error: red text below the input or a toast

---

## Quick Test Credentials

After login is built, test with these:

| Email | Password | Expected redirect |
|---|---|---|
| `admin@dypatil.edu` | `Admin@1234` | `/admin` |

To create more users, use the backend API:
```
POST http://localhost:5000/api/users
Authorization: Bearer <admin_token>
Body: { "email": "student@test.com", "password": "Student@1234", "first_name": "Test", "last_name": "Student", "role": "student" }
```

---

## Notes for the Agent

1. **Keep `USE_MOCK = false` from Task 1.3 onwards.** Do not revert it.
2. **When a service is wired, always test it immediately** by checking the relevant page works.
3. **If a page shows blank/broken after wiring**, compare the mock data shape vs real API shape in the Network tab and update the field reads in the page.
4. **The `ok()` helper** from `_mock.js` is just `{ data, error: null, ...extra }` — keep returning this shape from real services so pages don't break.
5. **The backend server must be running** at `http://localhost:5000` for Phase 2+ to work. Start with `cd backend && npm run dev`.
6. **CORS is configured** for `http://localhost:5173` in the backend — do not change the Vite port.
7. **Token refresh is automatic** via the axios interceptor in http.js — no manual token management needed in pages.
