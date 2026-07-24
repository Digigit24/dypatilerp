# Deployment Notes (Manual)

This preview is **not** deployed, pushed to a server, or wired into any CI/CD
by this change. Deployment is a manual step for you to perform.

## What to copy

Copy the entire contents of `dlitt-preview/dist/` into:

```
~/public_html/dlitt.dyperf.com/
```

i.e. after copying, that directory should contain:

```
~/public_html/dlitt.dyperf.com/index.html
~/public_html/dlitt.dyperf.com/styles.css
~/public_html/dlitt.dyperf.com/assets/dyperf-logo.jpg
~/public_html/dlitt.dyperf.com/assets/undiksha-logo.png
~/public_html/dlitt.dyperf.com/assets/favicon.svg
```

Example command (run from the repo root, adjust the destination if needed):

```bash
cp -r dlitt-preview/dist/. ~/public_html/dlitt.dyperf.com/
```

## What this does NOT do

- Does not touch DNS.
- Does not touch SSL/TLS configuration.
- Does not touch server (Apache/Nginx) configuration.
- Does not require Node.js, npm, or any build step on the server.
- Does not connect to any backend, API, or database.
- Does not require environment variables.

## Build step

There isn't one. `dist/` is hand-authored static HTML/CSS with no bundler —
copying the folder *is* the build.

## Before going live

- Confirm `assets/undiksha-logo.png` is the final approved artwork (it was
  converted from the WebP file provided in chat).
- This is a preview of the login screen only — enabling real authentication,
  configuring email, creating the DLitt course/batch, and connecting the
  backend are separate, later tasks and are explicitly out of scope here.
