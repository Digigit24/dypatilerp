# Frontend Context — DY Patil ERP

## Project Overview
React SPA for the **Applied Business Research Fellowship Program** ERP.
Manages applicants, students, batches, submissions, approvals, fees, tests, and research profiles across multiple courses and batches.

## Tech Stack
| Layer | Choice |
|---|---|
| Framework | React 18.2 + Vite 8 |
| Styling | Tailwind CSS v4 |
| Routing | React Router DOM v6 |
| State | Zustand (authStore, uiStore) |
| Forms | React Hook Form + Zod |
| Rich Text | Tiptap 3 |
| PDF | @react-pdf/renderer |
| Drag & Drop | @hello-pangea/dnd |
| UI Primitives | Radix UI (dialog, dropdown, tabs, switch, toast) |
| Icons | Lucide React |

## Folder Structure
```
src/
├── api/
│   ├── config.js            # USE_MOCK toggle, BASE_URL
│   ├── mock/                # Mock data (12 modules)
│   └── services/            # Service layer (REST adapters)
├── components/shared/       # Navbar, Sidebar, StatusBadge, SkeletonCard, etc.
├── hooks/                   # useAuth, useRole, useScrollLock
├── layouts/                 # AdminLayout, StudentLayout, PublicLayout
├── lib/                     # constants.js (ROLES, STATUSES), formatters, utils
├── pages/
│   ├── admin/               # 14 admin pages
│   ├── student/             # 8 student pages
│   └── public/              # 6 public pages
├── store/                   # authStore.js, uiStore.js
├── App.jsx                  # Route tree
├── index.css                # Design tokens + named CSS classes
└── main.jsx
```

## Design System
- **Light mode**: Beige `#f8f6f5`, white cards, indigo accent `#4f46e5`
- **Dark mode**: Deep `#121212`, pink accent `#ff5c8a`
- **Dynamic theming**: Runtime primary color override via `uiStore.themeConfig`
- Key CSS classes: `.card`, `.btn-primary`, `.input`, `.soft-panel`, `.responsive-kpis`, `.responsive-cards`, `.responsive-two`, `.sidebar-link`

## Roles
```
admin | coordinator | academic_guide | industry_mentor | student | applicant
```

## API Layer Pattern
All services in `src/api/services/` follow:
```js
export const getEntity = async (filters) => { /* { data, total } */ }
export const getEntityById = async (id) => { /* { data } */ }
export const createEntity = async (payload) => { /* { data } */ }
export const updateEntity = async (id, payload) => { /* { data } */ }
```
Switch `USE_MOCK = false` in `src/api/config.js` when connecting to the backend.

## Route Map
```
/                           Public landing, apply, confirmation
/test/:testId               Fullscreen test page
/onboard                    Account setup
/p/:slug                    Public research profile

/student/*                  Student dashboard (sidebar layout)
  dashboard, submit, submissions, progress, fees, profile, notifications

/admin/*                    Admin dashboard (sidebar layout)
  /, applicants, students/:id, batches, approvals, fees, test-builder,
  notifications, users, settings, progress
```

## State
```js
// authStore.js
{ currentUser, role, login(user), logout(), setRole(role) }

// uiStore.js
{ theme, themeConfig, toasts, toggleTheme(), addToast({ type, title, message }), ... }
```

---

## Task List

### Phase 1 — Design & Mock ✅ DONE
- [x] Complete design system (Tailwind v4, CSS tokens)
- [x] All layouts (Admin, Student, Public)
- [x] All 28 pages with mock data
- [x] All shared components
- [x] Auth store + role switching (DevRoleSwitcher)
- [x] Service layer with mock adapters
- [x] Responsive design (mobile sidebar, collapsed nav)

### Phase 2 — Backend Integration ⬜ TODO
- [ ] Set `USE_MOCK = false` in `src/api/config.js`
- [ ] Add `BASE_URL` pointing to `http://localhost:5000/api`
- [ ] Update `userService.js` → `/api/auth/me`, login/logout
- [ ] Update `applicantService.js` → `/api/applicants`
- [ ] Update `batchService.js` → `/api/batches`
- [ ] Update `studentService.js` → `/api/students`
- [ ] Update `submissionService.js` → `/api/submissions`
- [ ] Update `approvalService.js` → `/api/approvals`
- [ ] Update `feeService.js` → `/api/fees`
- [ ] Update `testService.js` → `/api/tests`
- [ ] Update `notificationService.js` → `/api/notifications`
- [ ] Update `progressReportService.js` → `/api/progress-reports`
- [ ] Update `researchProfileService.js` → `/api/research-profiles`
- [ ] Add auth token storage (localStorage / httpOnly cookie)
- [ ] Add axios interceptor for 401 → auto-refresh token
- [ ] Replace mock role switching with real role from JWT

### Phase 3 — Polish ⬜ TODO
- [ ] File upload integration (submissions: PDF/PPT/video to cloud storage)
- [ ] Real-time notification badge updates (polling or SSE)
- [ ] Multi-course selector in admin (dropdown for course scope)
- [ ] Course-level dashboard page (`/admin/courses/:id`)
- [ ] Batch dashboard page with per-batch stats
- [ ] Test-taking timer (countdown from `duration_minutes`)
- [ ] PDF receipt generation for fee payments
- [ ] Error boundary components
- [ ] Loading states for all service calls
- [ ] Form error messages mapped from API validation errors

### Phase 4 — Advanced ⬜ TODO
- [ ] CSV export (students, fees)
- [ ] Dark mode persistence (localStorage)
- [ ] Internationalisation (i18n)
- [ ] Analytics charts (recharts/victory) for dashboard trends

---

## Code Reviewer Agent (Frontend)

**Role:** Senior React engineer focused on UI correctness, performance, and accessibility.

### Review Checklist

**React Patterns**
- [ ] No direct DOM manipulation — use refs only when necessary
- [ ] Keys on list items are stable IDs, not array indexes
- [ ] `useEffect` dependencies complete — no stale closures
- [ ] Async calls inside effects have cleanup / abort controller
- [ ] No state mutations — always spread or produce new objects

**API Integration**
- [ ] Every API call shows loading skeleton (`<SkeletonCard />`)
- [ ] Errors displayed via `addToast({ type: 'error', ... })` from uiStore
- [ ] No hardcoded IDs or mock data left when `USE_MOCK = false`
- [ ] Token attached via `Authorization: Bearer <token>` header in every service

**Routing & Auth**
- [ ] Protected routes redirect to `/` if no `currentUser`
- [ ] Role-based route guards match backend RBAC roles
- [ ] Deep-link URLs work after page refresh (SPA 404 → Netlify `_redirects`)

**Design System**
- [ ] Use `.card`, `.btn-primary`, `.input` classes — no inline styles for layout
- [ ] New responsive grids use `responsive-kpis` or `responsive-cards` patterns
- [ ] Status colours match `StatusBadge` component — no hardcoded colour classes
- [ ] Dark mode works — use CSS variable-based colours, not hardcoded hex

**Performance**
- [ ] Large lists paginated (not loading all data at once)
- [ ] Images have explicit `width`/`height` to avoid layout shift
- [ ] `React.memo` only where measurably needed — avoid premature optimisation

**Accessibility**
- [ ] Form inputs have associated `<label>` elements
- [ ] Buttons have accessible text or `aria-label`
- [ ] Modals trap focus and close on Escape
- [ ] Colour contrast meets WCAG AA (4.5:1 for text)
