# Frontend Design System

A complete reference for replicating this UI shell in a new project. All design decisions, component patterns, tokens, and conventions are documented here — independent of the specific app domain.

---

## Table of Contents

1. [Tech Stack](#tech-stack)
2. [Project Structure](#project-structure)
3. [Design Tokens](#design-tokens)
4. [Typography](#typography)
5. [Color System](#color-system)
6. [Spacing & Layout](#spacing--layout)
7. [Component Patterns](#component-patterns)
8. [Layout Architecture](#layout-architecture)
9. [Animation & Transitions](#animation--transitions)
10. [Responsive Design](#responsive-design)
11. [State Management](#state-management)
12. [Routing Architecture](#routing-architecture)
13. [Utility Functions](#utility-functions)
14. [Conventions & Rules](#conventions--rules)

---

## Tech Stack

| Layer | Library | Version |
|---|---|---|
| Framework | React | 18.x |
| Build tool | Vite | 8.x |
| Styling | Tailwind CSS v4 | 4.x |
| Routing | React Router DOM | 6.x |
| State management | Zustand | 5.x |
| Forms | React Hook Form + Zod | 7.x / 4.x |
| Icons | Lucide React | latest |
| UI primitives | Radix UI | various |
| Class merging | clsx + tailwind-merge | latest |
| Drag & drop | @hello-pangea/dnd | 18.x |
| Rich text editor | Tiptap | 3.x |
| PDF generation | @react-pdf/renderer | 4.x |
| Dates | date-fns | 4.x |
| Animations | CSS (built-in) | — |

**Key pattern:** Tailwind is used for one-off layout/spacing utilities. All reusable visual patterns (cards, buttons, inputs, sidebar) are defined as **named CSS classes** in `index.css` using CSS custom properties.

---

## Project Structure

```
src/
├── api/
│   ├── config.js              # API base config / axios instance
│   ├── mock/                  # Mock data per entity (for dev/demo)
│   │   └── *.js
│   └── services/              # Service functions (one file per domain)
│       ├── _mock.js           # Mock service adapter
│       ├── themeService.js    # Theme config: persist, derive, apply tokens
│       └── *.js
├── assets/                    # Static images, svgs
├── components/
│   └── shared/                # App-wide reusable UI components
│       ├── Breadcrumbs.jsx
│       ├── DevRoleSwitcher.jsx
│       ├── EmptyState.jsx
│       ├── Navbar.jsx
│       ├── NotificationBell.jsx
│       ├── PageHeader.jsx
│       ├── Sidebar.jsx
│       ├── SkeletonCard.jsx
│       ├── StatusBadge.jsx
│       ├── StudentProfileView.jsx
│       └── ToastHost.jsx
├── hooks/
│   ├── useAuth.js
│   ├── useRole.js
│   └── useScrollLock.js
├── layouts/
│   ├── AdminLayout.jsx        # Shell: sidebar + topbar + <Outlet>
│   ├── PublicLayout.jsx       # Shell: sticky header + <Outlet>
│   └── StudentLayout.jsx      # Shell: sidebar + topbar + <Outlet>
├── lib/
│   ├── constants.js           # App-wide enums / role constants
│   ├── formatters.js          # Date/time formatters
│   └── utils.js               # cn(), initials(), roleLabel()
├── pages/
│   ├── admin/                 # One file per admin page
│   ├── public/                # Landing, apply, confirmation, etc.
│   └── student/               # One file per student page
├── store/
│   ├── authStore.js           # Zustand: current user + role
│   └── uiStore.js             # Zustand: theme, themeConfig, toasts
├── App.jsx                    # Route tree
├── index.css                  # All design tokens + named CSS classes
└── main.jsx                   # ReactDOM.createRoot entry point
```

---

## Design Tokens

All tokens are CSS custom properties on `:root`. Dark mode overrides are on `[data-theme="dark"]`. The accent color palette is also overridable at runtime via `themeService.js`.

### Light Mode (`:root`)

```css
--bg:              #f8f6f5    /* Page background */
--app-bg:          #fbfaf9    /* App shell background (slightly lighter) */
--card:            #ffffff    /* Card / panel surface */
--surface:         #f7f4f3    /* Subtle inner surface (hover states) */
--surface-strong:  #f1ece9    /* Stronger tinted surface */
--text:            #171717    /* Primary text */
--secondary:       #6e6a67    /* Secondary / label text */
--muted:           #a09a96    /* Placeholder / faint text */
--border:          rgba(23,23,23,.07)  /* Default border */

--accent:          #4f46e5    /* Primary accent (Indigo 600) */
--accent-hover:    #4338ca    /* Accent hover (darker) */
--accent-tint:     rgba(79,70,229,.12) /* Accent background tint */
--accent-soft:     rgba(79,70,229,.06) /* Subtler accent tint */

--scrollbar-thumb: rgba(79,70,229,.55)
--scrollbar-track: rgba(23,23,23,.045)

--green:           #36b37e
--amber:           #ffb84d
--blue:            #5b8def
```

### Dark Mode (`[data-theme="dark"]`)

```css
--bg:              #121212
--app-bg:          #151515
--card:            #1b1b1b
--surface:         #232323
--surface-strong:  #2b2b2b
--text:            #ffffff
--secondary:       #b8b3ae
--muted:           #7d7873
--border:          rgba(255,255,255,.09)

--accent:          #ff5c8a    /* Pink accent in dark mode */
--accent-hover:    #ff4b80
--accent-tint:     rgba(255,92,138,.15)
--scrollbar-track: rgba(255,255,255,.06)
```

### Dynamic Accent (Runtime)

The accent tokens can be overridden at runtime via `src/api/services/themeService.js`. This lets users pick a brand color that auto-derives hover, tint, and soft variants:

```js
// themeService.js exports:
deriveThemeTokens(primaryColor)   // returns { accent, accentHover, accentTint, accentSoft, scrollbarThumb }
applyThemeConfig(config)          // writes derived tokens to document.documentElement CSS vars
getThemeConfig()                  // reads from localStorage (key: 'dyp_theme_config')
saveThemeConfig(config)           // persists + applies

// Default primary:
DEFAULT_THEME_CONFIG = { primaryColor: '#4F46E5' }
```

**To wire up:** In `App.jsx`, call `applyThemeConfig(themeConfig)` inside a `useEffect` whenever `themeConfig` changes.

---

## Typography

### Font Families

Loaded via Google Fonts in `index.css`:

```css
@import url('https://fonts.googleapis.com/css2?family=DM+Sans:wght@400;500;600;700&family=Inter:wght@400;500;600;700&family=Playfair+Display:wght@600;700&display=swap');
```

| Family | Usage |
|---|---|
| **Inter** | Default body/UI font (`font-family` on `:root`) |
| **DM Sans** | Navigation labels (`font-nav` custom class) |
| **Playfair Display** | Large display headings on public/landing pages |

### Scale

| Element | Size | Weight | Notes |
|---|---|---|---|
| Page title `h1` | `32px` (text-[32px]) | 600 | Set via `PageHeader` |
| Section heading `h2` | `text-xl` (20px) | 600 | In-card headers |
| Label / nav item | `text-sm` (14px) | 600–700 | Sidebar links |
| Body | `text-sm` (14px) | 400–500 | Table rows, descriptions |
| Caption / secondary | `text-xs` (12px) | 400–500 | Muted labels |
| Micro | `text-[11px]` / `text-[10px]` | 600–700 | Section headers, badges |

Mobile `h1` scales down via clamp:
```css
@media (max-width: 640px) {
  h1 { font-size: clamp(1.7rem, 7vw, 2.2rem) !important; line-height: 1.08 !important; }
}
```

---

## Color System

### Status Colors (StatusBadge)

All statuses use Tailwind semantic color classes (not CSS vars) for badge coloring:

| Status | Background | Text | Border |
|---|---|---|---|
| approved / active / completed / shortlisted | `bg-emerald-50` | `text-emerald-700` | `border-emerald-100` |
| pending / test_pending | `bg-amber-50` | `text-amber-700` | `border-amber-100` |
| in_progress / test_completed | `bg-blue-50` | `text-blue-700` | `border-blue-100` |
| needs_revision | `bg-orange-50` | `text-orange-700` | `border-orange-100` |
| rejected / overdue | `bg-red-50` | `text-red-700` | `border-red-100` |
| draft | `bg-stone-100` | `text-stone-600` | `border-stone-200` |
| upcoming / enrolled | `bg-indigo-50` | `text-indigo-700` | `border-indigo-100` |

### Toast Colors

| Type | Class |
|---|---|
| success | `bg-emerald-600` |
| error | `bg-red-600` |
| info | `bg-indigo-600` |
| warning | `bg-amber-600` |

---

## Spacing & Layout

### Named Layout Classes

```css
/* Responsive KPI grid — auto-fit columns min 180px */
.responsive-kpis {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(180px, 1fr));
  gap: 20px;
}

/* Responsive card grid — auto-fit columns min 240px */
.responsive-cards {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(240px, 1fr));
  gap: 20px;
}

/* Two-column layout: main content + sidebar panel */
.responsive-two {
  display: grid;
  grid-template-columns: minmax(0, 1fr) minmax(280px, 380px);
  gap: 24px;
}
/* collapses to 1fr at ≤900px */

/* Safe row: flex space-between with gap, prevents overflow */
.safe-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 16px;
  min-width: 0;
}
.safe-row > * { min-width: 0; }

/* Action row — wraps on small screens */
.safe-actions {
  display: flex;
  flex-wrap: wrap;
  gap: 12px;
}
```

### Page Content Padding

```
Desktop: padding: 24px (admin-main)
Tablet:  padding: 20px (≤1080px)
Mobile:  padding: 16px, then 12px left/right (≤640px)
         padding-top: 88px (accounts for fixed topbar)
```

### Sidebar Dimensions

| State | Width |
|---|---|
| Expanded (admin) | `260px` (default) |
| Expanded (student) | `240px` |
| Collapsed | `88px` (icon-only) |
| Mobile (offscreen) | slides in from left, full-width capped |

Sidebar is `fixed`, `bottom: 5px left: 5px top: 5px`, `z-index: 40`, `border-radius: 30px`.

---

## Component Patterns

### `.card`

The primary container. Applied as a CSS class, not Tailwind.

```css
.card {
  background: var(--card);
  border-radius: 24px;
  border: 1px solid var(--border);
  box-shadow: 0 2px 10px rgba(0,0,0,0.03), 0 8px 30px rgba(0,0,0,0.04);
  color: var(--text);
  min-width: 0;
  overflow-wrap: anywhere;
  transition: transform 280ms cubic-bezier(0.22,1,0.36,1), ...;
}
/* Hover lift variant */
.card-hover:hover {
  transform: translateY(-2px);
  box-shadow: 0 10px 40px rgba(0,0,0,0.08);
}
/* Tables inside cards get horizontal scroll */
.card:has(table) { overflow-x: auto; }
```

Usage pattern:
```jsx
<div className="card p-6">...</div>
<div className="card card-hover p-6">...</div>  {/* with lift */}
```

### `.btn-primary`

```css
.btn-primary {
  height: 44px;
  border-radius: 14px;
  background: var(--accent);
  color: white;
  padding: 0 18px;
  font-weight: 600;
  box-shadow: 0 10px 24px rgba(79,70,229,.18);
  transition: transform 220ms cubic-bezier(0.22,1,0.36,1), background 220ms ease;
}
.btn-primary:hover {
  background: var(--accent-hover);
  transform: translateY(-1px);
}
```

Secondary/outline buttons use Tailwind inline:
```jsx
<button className="inline-flex items-center gap-2 rounded-2xl border border-[color:var(--border)] bg-[color:var(--card)] px-4 py-2.5 text-sm font-semibold text-[color:var(--secondary)]">
```

### `.input` / `.textarea`

```css
.input {
  min-height: 52px;
  border-radius: 14px;
  border: 1px solid var(--border);
  background: var(--card);
  padding: 0 14px;
  outline: none;
  color: var(--text);
  transition: border-color 180ms ease, box-shadow 180ms ease;
}
.input:focus, .textarea:focus {
  border-color: color-mix(in srgb, var(--accent) 45%, transparent);
  box-shadow: 0 0 0 4px var(--accent-tint);
}
```

### `.theme-icon-button`

Square icon buttons used throughout the topbar:
```css
.theme-icon-button {
  display: grid;
  place-items: center;
  height: 44px; width: 44px;
  border-radius: 16px;
  background: var(--card);
  border: 1px solid var(--border);
  box-shadow: 0 2px 10px rgba(0,0,0,0.03), 0 8px 30px rgba(0,0,0,0.04);
}
```

### `.soft-panel`

Glass-like panel — used for topbar search, user footer card, contextual panels:
```css
.soft-panel {
  background: color-mix(in srgb, var(--card) 90%, transparent);
  border: 1px solid var(--border);
  box-shadow: 0 2px 10px rgba(0,0,0,0.025), 0 12px 42px rgba(0,0,0,0.045);
  backdrop-filter: blur(18px);
}
```

### `.drawer-panel`

Right-side drawer (detail panels, slide-over):
```css
.drawer-panel {
  position: absolute;
  bottom: 16px; right: 16px; top: 16px;
  width: min(540px, calc(100vw - 32px));
  border-radius: 32px;
  background: var(--card);
  box-shadow: 0 10px 40px rgba(0,0,0,0.08);
}
/* Mobile: becomes bottom sheet */
@media (max-width: 900px) {
  .drawer-panel {
    top: auto; left: 0; right: 0; bottom: 0;
    width: 100%; height: 88vh;
    border-radius: 28px 28px 0 0;
  }
}
```

### `PageHeader`

```jsx
// src/components/shared/PageHeader.jsx
<div className="mb-6 flex flex-wrap items-start justify-between gap-4">
  <div className="min-w-0 flex-1">
    <h1 className="text-[32px] font-semibold tracking-normal text-[color:var(--text)]">{title}</h1>
    {subtitle && <p className="mt-1 max-w-3xl text-sm text-[color:var(--secondary)]">{subtitle}</p>}
  </div>
  {action && <div className="shrink-0">{action}</div>}
</div>
```

Props: `title`, `subtitle` (optional), `action` (optional JSX node — usually a button).

### `StatusBadge`

```jsx
// src/components/shared/StatusBadge.jsx
<span className={`inline-flex shrink-0 whitespace-nowrap rounded-full border px-3 py-1 text-xs font-semibold capitalize ${colorClass}`}>
  {status.replaceAll('_', ' ')}
</span>
```

Props: `status` (string) — automatically maps to color set.

### `SkeletonCard`

Loading placeholder for any card-shaped content:
```jsx
// src/components/shared/SkeletonCard.jsx
<div className="card p-6 space-y-4">
  {Array.from({ length: rows }).map((_, i) =>
    <div key={i} className="h-5 rounded-full shimmer" style={{ width: `${90 - i * 14}%` }} />
  )}
</div>
```

Props: `rows` (number, default 3).

```css
/* Shimmer animation */
.shimmer {
  background: linear-gradient(90deg, #eee9e6 25%, #f8f6f5 37%, #eee9e6 63%);
  background-size: 400% 100%;
  animation: shimmer 1.25s ease-in-out infinite;
}
```

### `EmptyState`

```jsx
// src/components/shared/EmptyState.jsx
<div className="card p-10 text-center text-muted">
  {/* SVG illustration */}
  <h3 className="text-lg font-semibold text-ink">{title}</h3>
  <p className="mt-1 text-sm">{subtitle}</p>
  {action}   {/* optional CTA button */}
</div>
```

Props: `title`, `subtitle`, `action` (optional JSX).

### `Breadcrumbs`

Auto-generated from `useLocation().pathname`:
```jsx
// Splits path by '/', renders "admin / students / profile" style trail
// Uses ChevronRight (lucide) as separator
// Text color: var(--muted), text-xs, capitalize
```

### `ToastHost`

Fixed notification stack, `top-right`, `z-index: 60`:
```jsx
// Reads toasts from uiStore
// Each toast: rounded-2xl px-4 py-3 text-sm font-medium text-white
// Auto-dismisses after 3000ms
// Max 3 toasts shown at once
```

Trigger from any component:
```js
const addToast = useUiStore((s) => s.addToast)
addToast({ type: 'success', title: 'Saved!' })
addToast({ type: 'error', message: 'Something failed' })
```

### `NotificationBell`

Dropdown notification panel anchored to bell icon:
- Positioned `fixed` on mobile (full-width), `absolute` on desktop (w-96)
- Unread count shown as red badge on icon
- Uses `useScrollLock` when open
- Backdrop button closes on outside click

### `Sidebar`

```jsx
<Sidebar
  sections={[
    {
      title: 'SECTION_LABEL',        // shown as uppercase label (hidden when collapsed)
      items: [
        { to: '/path', label: 'Label', icon: LucideIcon }
      ]
    }
  ]}
  role="Role Name"                   // shown as accent-tinted pill below logo
  collapsed={false}                  // icon-only mode
  mobileOpen={false}                 // mobile slide-in
  onClose={() => {}}                 // callback when mobile item clicked
  footer={<JSX />}                   // user card / logout area
  width={260}                        // default 260
/>
```

- Active link: `.sidebar-link-active` (accent tint bg, accent text, accent border)
- Inactive link: `.sidebar-link` (secondary text, hover surface bg)
- Section labels: `text-[10px] font-bold tracking-[0.16em] text-[color:var(--muted)]`

---

## Layout Architecture

Three layout shells, each wraps `<Outlet />` from React Router:

### `AdminLayout` / `StudentLayout`

```
div.app-shell (full viewport, radial gradient bg)
  ├── [optional] button.sidebar-backdrop   ← mobile overlay
  ├── Sidebar (fixed, left panel)
  └── main.admin-main
        ├── div.admin-topbar
        │     ├── Sidebar toggle (mobile: Menu, desktop: PanelLeft icons)
        │     ├── Search bar (soft-panel, rounded-full)
        │     ├── [optional contextual pill]
        │     ├── Theme toggle (theme-icon-button)
        │     └── NotificationBell
        ├── Breadcrumbs
        └── <Outlet />  ← page content
```

App-shell background:
```css
.app-shell {
  background:
    radial-gradient(circle at 4% 0%, var(--accent-soft), transparent 28rem),
    linear-gradient(135deg, var(--bg), var(--app-bg));
}
```

### `PublicLayout`

```
main.min-h-screen
  ├── header (sticky top-0, glass effect, z-30)
  │     ├── Logo (left)
  │     ├── [nav links / demo badge]
  │     └── Theme toggle
  └── <Outlet />
```

Header glass:
```css
bg-[color-mix(in_srgb,var(--card)_88%,transparent)]/90 backdrop-blur-xl
border-b border-[var(--border)]
```

---

## Animation & Transitions

### Page Transitions

Every page root div gets `.fade-page`:
```css
.fade-page { animation: fade-in 150ms ease-out; }
@keyframes fade-in {
  from { opacity: 0; transform: translateY(4px); }
  to   { opacity: 1; transform: translateY(0); }
}
```

Pattern in `App.jsx`: `<div key={location.pathname} className="fade-page">`.

### Transition Easing

All interactive transitions use `cubic-bezier(0.22, 1, 0.36, 1)` — a spring-like ease-out curve:
- Cards: `transform 280ms, box-shadow 280ms`
- Buttons: `transform 220ms, background 220ms`
- Sidebar: `transition-all duration-300`

### Table Rows

```css
.table-row { transition: background 180ms ease, transform 180ms ease; }
.table-row:hover { background: var(--accent-tint); }
```

---

## Responsive Design

### Breakpoints

| Breakpoint | Behavior |
|---|---|
| `≤1080px` | Sidebar offset adjusts, topbar wraps |
| `≤900px` | Sidebar hides behind backdrop, topbar becomes fixed, admin-main loses left margin + adds top padding |
| `≤640px` | Further compact padding, full-width buttons, clamp on h1 |

### Sidebar Collapse (CSS-driven)

```css
.app-shell.sidebar-collapsed { --sidebar-offset: 128px; }
.app-shell.sidebar-collapsed .admin-main { margin-left: 128px !important; }
.app-shell.sidebar-collapsed aside { width: 88px !important; }
```

Add/remove `sidebar-collapsed` class on `.app-shell` div to toggle.

### Mobile Topbar

At `≤900px`, `.admin-topbar` becomes `position: fixed; left: 12px; right: 12px; top: 12px; z-index: 35`.

### Utility Classes for Responsive

```css
.mobile-hide          { display: none !important; }  /* at ≤900px */
.mobile-filter-scroll { overflow-x: auto; scrollbar-width: none; }  /* horizontal pill filter tabs */
.mobile-sidebar-trigger { display: none; }  /* shown only at ≤900px */
.desktop-sidebar-trigger { display: grid; } /* hidden at ≤900px */
```

---

## State Management

Two Zustand stores:

### `authStore` — `src/store/authStore.js`

```js
{
  currentUser: null,  // user object
  role: 'admin',      // current active role string
  setRole(role),
  login(userData),
  logout(),
}
```

### `uiStore` — `src/store/uiStore.js`

```js
{
  theme: 'light',         // 'light' | 'dark'
  themeConfig: {...},     // { primaryColor: '#4F46E5' }
  toasts: [],             // [{ id, type, title, message }]
  toggleTheme(),
  setThemeConfig(partial),
  resetThemeConfig(),
  addToast({ type, title?, message? }),  // auto-removes after 3s, max 3
  removeToast(id),
}
```

Theme is applied by writing `document.documentElement.dataset.theme = theme` (triggers CSS `[data-theme="dark"]` override). Called in `App.jsx` + layout components.

---

## Routing Architecture

Three layout zones, defined in `App.jsx`:

```
/                          → PublicLayout
  /                        → LandingPage
  /apply                   → ApplyPage
  /confirmation            → ConfirmationPage

/test/:testId              → TestPage (no layout shell)
/onboard                   → OnboardPage (no layout shell)
/p/:slug                   → PublicProfilePage (no layout shell)

/student                   → StudentLayout
  /student/dashboard
  /student/submit
  /student/submissions
  /student/progress
  /student/fees
  /student/profile
  /student/profile/research
  /student/notifications

/admin                     → AdminLayout
  /admin                   → AdminDashboard (index)
  /admin/[entity]          → entity list pages
  /admin/[entity]/:id      → detail pages
  /admin/settings
  /admin/users
```

Page entry animation: wrap page root in `<div className="fade-page">`.

---

## Utility Functions

### `src/lib/utils.js`

```js
cn(...inputs)              // clsx + tailwind-merge — use for conditional Tailwind classes
initials(first, last)      // "Dr Priya Sharma" → "PS"
roleLabel(role)            // "academic_guide" → "Academic Guide"
```

### `src/lib/formatters.js`

```js
formatDate(value)          // Date → "21 May 2026"
timeAgo(value)             // Date → "3 hours ago"
```

### `src/lib/constants.js`

Defines `ROLES`, `SUBMISSION_STATUS`, `APPROVAL_STAGES`, `BATCH_STATUS`, `TEST_QUESTION_TYPES`, `NOTIFICATION_TYPES` as plain objects for use in filters, tabs, and form options.

---

## Conventions & Rules

### Styling

- Reusable visual patterns → named CSS class in `index.css`
- Layout/spacing one-offs → Tailwind inline
- Never mix inline styles with Tailwind for the same property
- Reference CSS vars in Tailwind with `text-[color:var(--text)]`, `bg-[color:var(--card)]`
- Use `color-mix(in srgb, ...)` for alpha variants without extra variables

### Components

- All shared UI in `src/components/shared/`
- Domain-specific UI lives inline in its page file until it needs reuse
- Props-driven, no internal state for pure display components
- Use `min-width: 0` + `overflow-wrap: anywhere` on flex children to prevent overflow

### Icons

Always from **Lucide React**. Consistent sizing:
- Sidebar nav: `size={17} strokeWidth={1.8}`
- Topbar buttons: `size={18} / size={19}`
- Inline text icons: `size={15} / size={16}`

### Loading State

Every data-fetched page returns `<SkeletonCard rows={N} />` while loading. Pattern:
```jsx
const [data, setData] = useState(null)
// ...fetch
if (!data) return <SkeletonCard rows={6} />
```

### Scrollbar

Custom scrollbar applied globally — thin, accent-colored thumb, transparent track:
```css
scrollbar-width: thin;
scrollbar-color: var(--scrollbar-thumb) transparent;
/* WebKit: 9px width, rounded pill thumb with border gap */
```

### Overflow / Scroll Locking

Use `useScrollLock(condition)` hook when drawers / modals / sidebars are open to prevent body scroll. The hook is at `src/hooks/useScrollLock.js`.

### Accessibility

- All icon-only buttons have `aria-label`
- Sidebar has `aria-label="Sidebar navigation"`
- Sidebar backdrop button has `aria-label="Close sidebar"`
- `NavLink` uses `end` prop on exact-match routes

### File Naming

- Components: `PascalCase.jsx`
- Hooks: `useXxx.js`
- Stores: `xxxStore.js`
- Services: `xxxService.js`
- Pages grouped by zone: `pages/admin/`, `pages/student/`, `pages/public/`

---

## Quick-Start Checklist for a New Project

1. **Copy `index.css`** — contains all tokens, named classes, scrollbar, responsive layout helpers
2. **Install dependencies** from `package.json` (React, Vite, Tailwind v4, Zustand, Lucide, Radix, RHF, Zod, date-fns, clsx, tailwind-merge)
3. **Copy `src/lib/utils.js`** — `cn()` helper
4. **Copy `src/store/uiStore.js`** + `src/api/services/themeService.js` — theme + toast system
5. **Copy `src/store/authStore.js`** — replace with your auth logic
6. **Copy `src/components/shared/`** — all shared UI components work out of the box
7. **Choose a layout** from `src/layouts/` and adapt nav sections
8. **Update `App.jsx`** with your route tree, keeping `key={location.pathname}` on fade-page wrapper
9. **Replace fonts** in `index.css` `@import` if needed (default: Inter body, DM Sans nav, Playfair Display for hero headings)
10. **Set brand color** via `themeService.js` `DEFAULT_THEME_CONFIG.primaryColor`
