# DLitt Portal — Visual Preview

Standalone, static visual preview of the DLitt login portal for `dlitt.dyperf.com`.

**This is a visual preview only.** There is no login, no authentication, no API
calls, no backend, no database, and no application-submission flow anywhere in
this folder. It is plain HTML + CSS with **zero JavaScript**.

## Contents

```
dlitt-preview/
├── source/
│   ├── index.html      # editable source (assets referenced via ../assets/)
│   └── styles.css
├── assets/
│   ├── dyperf-logo.jpg     # copied from public/logo-new.jpg (existing approved DYPERF asset)
│   ├── undiksha-logo.png   # provided by the client, converted from the uploaded WebP
│   └── favicon.svg         # copied from public/favicon.svg
├── dist/                # self-contained build — copy this to the server
│   ├── index.html
│   ├── styles.css
│   └── assets/
│       ├── dyperf-logo.jpg
│       ├── undiksha-logo.png
│       └── favicon.svg
├── README.md
└── DEPLOYMENT.md
```

`source/` and `dist/` are identical in content — `dist/` simply uses same-level
asset paths (`assets/...`) so it is fully self-contained and portable, while
`source/` uses `../assets/...` to share the one copy of assets during editing.

## What this page does

- Reproduces the split-screen layout of the existing Postdoc login page
  (`src/pages/auth/LoginPage.jsx`): left brand panel / right form panel on
  desktop, stacked on mobile.
- Uses DLitt + DYPERF + Undiksha University branding only. No Texas State or
  Postdoc content appears anywhere (visible text, alt text, metadata, or
  comments).
- Email/password fields are visually interactive but store nothing (no
  `name` attributes, no state, no localStorage/sessionStorage/cookies).
- The Sign In button is `type="button" disabled` — it cannot submit anything.
- Shows the status line: "D.Litt portal access will be activated shortly."
- No "Apply here" / application link (per instructions, that flow is separate).

## Intentional differences from the production app

- **No Google Fonts / external network calls.** The production app loads
  Inter/DM Sans/Playfair Display from `fonts.googleapis.com`. This preview
  uses the OS system font stack instead, specifically so the page makes
  **zero external network requests** and works fully offline once copied to
  the server. Visual weight/sizing closely approximates the original Inter
  typography.
- **No Tailwind.** The original page uses Tailwind utility classes. This
  preview reproduces the same visual result with plain CSS (see
  `styles.css`), matching the CSS variables (`--accent`, `--bg`, `--text`,
  `--secondary`, `--border`) and the `.input` / `.btn-primary` component
  styles from `src/index.css`.
- **No Postdoc feature bullet list.** The original left panel has a 3-item
  feature bullet list specific to the Postdoc program. Per instructions,
  Postdoc bullet points/descriptions must not appear, so this list was
  omitted rather than replaced with invented DLitt copy.

## Viewing it locally

No build step, no Node.js/npm required. Either:

- Open `dist/index.html` directly in a browser, or
- Serve it locally, e.g. `python3 -m http.server 8000` from inside `dist/`
  and visit `http://localhost:8000/`.

## Verified

- Loads with zero console errors and zero network requests beyond its own
  local assets (verified with a headless Chromium run against `dist/`).
- Tested at 1440×900, 1024×768, 768×1024, 390×844, 360×800 — no horizontal
  overflow at any width, logos and text remain readable, footer stays
  visible.
- Sign In button confirmed `disabled` with `type="button"`.
- No occurrences of "Texas", "Postdoc", "Postdoctoral", "Applied Business
  Research", "Research Fellowship", or "Apply here" anywhere in the page.

See `DEPLOYMENT.md` for how to copy this into
`~/public_html/dlitt.dyperf.com/`.
