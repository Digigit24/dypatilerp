# Notifications — Audit & Replacement Plan

Status: audit complete, mark-all-read bug fixed, replacement plan below is a
**planning deliverable** — not yet implemented.

---

## 1. Audit — how notifications actually work today

There are two independent systems sharing two tables. Don't conflate them:

| | In-app bell | Email |
|---|---|---|
| Table | `notifications` + `notification_recipients` | `notification_queue` |
| Written | synchronously, inline in the request that triggers the event | synchronously, inline (as a queued row) |
| Delivered | read directly by `GET /notifications` — no delivery step, just storage | asynchronously by a 60s worker tick |

### 1.1 Event → in-app row (no polling involved)

`backend/src/modules/notifications/notify.service.js`'s `enqueueEvent()` does two
things per call, both synchronous, inside the HTTP request that triggered them
(submission approved, stage opened, application submitted, fee due, etc.):

1. `INSERT INTO notification_queue` (the email job — see §1.2).
2. If `inApp: { title, message }` was passed **and** at least one queue row was
   inserted: `INSERT INTO notifications`, then one `INSERT INTO
   notification_recipients` per recipient `user_id`.

`POST /notifications` (manual admin send, `notifications.routes.js`) does the
same insert pair directly, no queue involved for the in-app half.

**There is no polling anywhere in this path.** The bell is not fed by a
background job — a row appears in `notifications`/`notification_recipients`
the instant the triggering action commits.

### 1.2 Email delivery — this is the actual polling loop

`startNotificationWorker()` (`notify.service.js:449`, called once from
`backend/src/server.js:19` at boot) does:

```js
_timer = setInterval(tick, 60 * 1000);       // every 60s, forever
setTimeout(tick, 10 * 1000);                  // first pass at boot+10s
```

Each `tick()` runs two Postgres round-trips unconditionally:

1. `processDueQueue()` — `UPDATE notification_queue SET status='sending', ...
   WHERE status='pending' AND run_at <= NOW() ... RETURNING *`, then for each
   claimed row calls `sendNotificationEmail()` (Brevo API) and updates status
   (`sent` / `skipped` / retried up to 3x / `failed`).
2. `runScheduledScans()` — `SELECT id, code, preferences FROM courses WHERE
   is_active=true`, then per-course fee/overdue queries, gated to actually run
   only once/course/day at the configured IST hour (`app_settings` key
   `notification_scan_state` tracks the last-run date per course/event).

**This is the polling this task is about.** It is a fixed 60-second interval
that queries Postgres forever, whether or not there is anything to do —
including nights/weekends with zero activity. On **Neon serverless** with
autoscaling/autosuspend compute (confirmed: this project's `development`
branch, like all Neon branches, suspends compute after a period of no
queries), a permanent 60s heartbeat query means **the compute can never
autosuspend** as long as the backend process is running. That defeats the
entire point of serverless Postgres pricing — you pay for an always-on
compute instead of a scale-to-zero one. This is very likely the literal
dollar cost the user meant by "cheaper."

Two additional real (non-cost) risks in this loop, worth fixing regardless of
the polling question:
- `runScheduledScans()` runs a `SELECT ... FROM courses` and, if any courses
  are due, two more queries **per course** every single tick — even though
  the actual gating (`istHour() >= ... && cState.scan !== today`) means at
  most one of those per course fires productively per day. 1,440 no-op
  wake-ups/day per course for a check that needs to happen once.
- The queue and the scan share one 60s timer with no backpressure/jitter — if
  `processDueQueue` or an email provider call hangs, the tick is not
  re-entrant-guarded except via the `_draining` flag on `processDueQueue`
  itself; `runScheduledScans` has no equivalent guard, so a slow scan could in
  principle overlap with itself if a single tick runs long — unlikely at this
  scale but worth naming.

### 1.3 Frontend — no polling, but no live delivery either

`src/components/shared/NotificationBell.jsx` fetches `GET /notifications`
**exactly once**, in a `useEffect` keyed on `canReadNotifications` (which
flips from `undefined`→`true` once after `permStore` loads). There is no
`setInterval`, no `EventSource`, no `WebSocket`, no refetch-on-navigation,
no refetch-on-window-focus anywhere in the frontend for notifications (grepped
the full `src/` tree — the only other `setInterval`s in the app are the video
player's progress tracking, the applicant list's polling for test-attempt
status, and the test-taking autosave, all unrelated).

Practical effect: a scholar who has the app open when a coordinator approves
their submission will **not** see the bell update until they reload the page
or the layout remounts (e.g. a full navigation that unmounts
`AdminLayout`/`StudentLayout`, which doesn't normally happen inside the SPA).
This is arguably the bigger "doesn't basically work" complaint — the bell is
correctly populated at load time but is otherwise inert for the rest of the
session.

### 1.4 Permissions

`notifications:read` is granted (seed.js) to `admin` (implicit `all` via
whatever grants admin normally gets — verify at seed time), `coordinator`
(`all` scope), `academic_guide` (`all` scope), `industry_mentor` (`all`
scope), `applicant` (`all` scope), and `student` (**`own`** scope,
`seed.js:107`). The route itself additionally branches on `req.user.roles
?.includes('student')` to force the recipient-scoped query regardless of the
granted scope value, so the `own` scope on the permission row is currently
redundant with that in-route check, not load-bearing — worth simplifying
later but not a bug.

**Caveat for whoever reads this next:** the July 2026 commit
`df0ccba` ("Stop the shell notification bell from 403-spamming roles without
access") states students *lacked* `notifications:read` in production at the
time. `seed.js` today grants it with `scope: 'own'`. Either the grant was
added after that commit, or the fix predates a seed change that hasn't been
re-run against the live `development`/`production` Neon branches yet. **Before
assuming students currently have this permission in the live database, run:**

```sql
SELECT r.name, p.module, p.action, rp.scope
FROM role_permissions rp
JOIN roles r ON r.id = rp.role_id
JOIN permissions p ON p.id = rp.permission_id
WHERE p.module = 'notifications' AND r.name = 'student';
```

If that returns nothing, `npm run db:seed` is safe to re-run (it's
`ON CONFLICT ... DO UPDATE`, additive) and will fix it — but per §2 of
`CLAUDE.md`, take a Neon branch first and don't run this against `production`
without confirming with the user first.

---

## 2. The mark-all-read bug — found, and fixed

### Diagnosis

The backend was never the problem:

```js
// backend/src/modules/notifications/notifications.routes.js:131
router.put('/mark-all-read', requirePermission('notifications', 'read'), asyncHandler(async (req, res) => {
  await query(
    `UPDATE notification_recipients SET is_read=true, read_at=NOW() WHERE user_id=$1 AND is_read=false`,
    [req.user.id]
  );
  ok(res, null, 'All marked as read');
}));
```

Correctly scoped to `req.user.id`, correctly declared before the `/:id` route
so it isn't shadowed, correctly sets `read_at`. Confirmed this actually
updates rows in Postgres.

The bug is 100% frontend, in **`src/components/shared/NotificationBell.jsx`**:

```jsx
<button ... onClick={() => markAllAsRead()}>Mark all read</button>
```

`markAllAsRead()` fired the `PUT /notifications/mark-all-read` request
(fire-and-forget — the promise wasn't even awaited) but nothing ever updated
the component's local `items` state. Since the bell fetches its notification
list exactly once on mount (§1.3) and never refetches, the unread badge count
and the blue "unread" highlighting on each row kept showing the pre-click
state for the rest of the session — clicking "Mark all read" *looked* like it
did nothing, even though the database was correctly updated underneath. The
same shape of bug existed in **`src/pages/student/NotificationsPage.jsx`**:
`onClick={() => markAsRead(n.id)}` had the identical fire-and-forget-with-no-
local-update pattern for marking a single notification read.

### Fix applied (this branch)

- `NotificationBell.jsx`: replaced the inline `markAllAsRead()` call with a
  `handleMarkAllRead` that awaits the request, then does
  `setItems((prev) => prev.map((n) => ({ ...n, is_read: true })))` on success
  — so the badge and highlighting clear immediately. Left as a no-op on
  failure (rather than optimistically clearing state) so a failed request
  doesn't lie to the user.
- `NotificationsPage.jsx` (student, full-page list): same pattern for
  `markAsRead(id)` — updates just the one matching item to `is_read: true`
  once the request resolves.

Neither backend route, schema, nor permissions needed any change. This does
**not** fix §1.3 (the bell still won't show *new* incoming notifications
without a reload) — that's a delivery-mechanism problem, addressed in §3.

---

## 3. Replacement plan — remove the always-on poll, keep it cheap

### Goal

Replace the unconditional 60s `setInterval` (§1.2) with something that (a)
lets Neon autosuspend when the app is idle, (b) delivers bell updates to open
sessions without the client reloading, and (c) costs nothing new to run, at
this app's real scale (tens of scholars per batch, single-digit concurrent
staff). No new paid infrastructure, no message broker, no Redis — those are
scale answers to a scale this app doesn't have.

### 3.1 What the constraint actually rules out

- **Postgres `LISTEN/NOTIFY`** is the obvious first idea and is explicitly
  the wrong fit here: a Neon compute suspend drops every open connection,
  including any `LISTEN` session. You'd need to detect the drop and
  reconnect, and on reconnect you've silently missed every `NOTIFY` fired
  while disconnected — for an email queue where a missed job means a
  scholar never gets an email, "silently missed" is not acceptable.
  `LISTEN/NOTIFY` also does nothing for the *pull-forever-anyway* cost
  problem: keeping a `LISTEN` connection open is itself a connection that
  can prevent autosuspend, so it doesn't even solve the cost half of the ask.
- **A hosted queue (SQS, Cloud Tasks, Upstash, etc.)** solves both halves
  correctly but is new paid/managed infrastructure for a queue processing at
  most a few hundred jobs/day. Explicitly out of scope per the "cheaper /
  open-source, no new paid infra" ask.

### 3.2 Recommended shape: event-driven trigger + push to open clients

Split the two systems in §1 and fix them differently, because they have
different constraints:

**A. Email queue (`notification_queue`) — trigger-on-write, not poll-on-timer**

Replace the unconditional 60s tick with: fire the drain **only when a job is
actually enqueued**, plus a much coarser safety-net interval for the retry
path (jobs that failed and are scheduled for a future `run_at`, or scans that
are date-gated anyway).

- `enqueueEvent()` already does `setImmediate(() => processDueQueue()...)`
  when `delay <= 0` (`notify.service.js:118`) — this is already
  event-driven for the common case! The 60s timer is mostly redundant for
  *immediate* sends; it exists to catch (a) delayed jobs whose `run_at` is in
  the future, (b) retried jobs on their 5-minute backoff, and (c) the daily
  scans.
- Stage 1 (cheap, safe, no schema change): drop the interval from 60s to
  something much coarser — e.g. 15 minutes — since nothing in this app's
  email rules needs minute-level precision (`delayMinutes` defaults are all
  `0`; the only non-zero-delay paths are `fee_due`/`deadline_overdue`, which
  are themselves gated to run once/day). This alone cuts wake-ups from
  1,440/day to 96/day — a ~93% reduction in the always-on cost — with a
  one-line change and zero behavior risk. Do this regardless of what else
  ships; it's the highest ROI, lowest-risk step available.
- Stage 2 (removes the *unconditional* part entirely): keep the interval
  only as a safety net for jobs that were scheduled while the process was
  down (missed `setImmediate` kicks, e.g. a delayed job whose delay elapses
  with no other event to trigger a drain), and make the interval **skip its
  own DB round-trip when there's nothing to do** by checking a lightweight
  in-memory "next known due time" the process already knows from its own
  `enqueueEvent()` calls, only querying Postgres when that time has actually
  arrived. This requires care around multi-instance deployments (see §3.4)
  and is why it's staged after, not instead of, Stage 1.
- Scans (`runScheduledScans`) stay time-based by nature (they're "once a day
  at hour X") — no event exists to trigger them. Move them off the 60s timer
  onto their own once-daily scheduled call (e.g. a single `setTimeout` that
  computes ms-until-next-configured-hour and reschedules itself after firing,
  or — simpler and more robust across restarts — an external cron hitting
  the existing `POST /notifications/run-scans` endpoint once a day). This
  removes the daily scan entirely from the per-minute cost equation.

**B. In-app bell — push to connected clients, don't ask them to poll**

The in-app half never needed Postgres polling (§1.1 confirmed it's already
event-driven at write time) — the missing piece is only getting the update
from server to an already-open browser tab (§1.3). For this app's scale
(single Node process, no horizontal scaling in evidence), **Server-Sent
Events (SSE)** is the right-sized answer: no new dependency (it's a plain
HTTP response Express already knows how to stream), works through normal
HTTPS/proxies, auto-reconnects natively in the browser (`EventSource`), and
is one-way, which is all this needs (bell → client; the client already POSTs
mark-read over regular REST).

- Backend: one new route, `GET /notifications/stream` (authenticated,
  `notifications:read`), that keeps the response open and holds the
  connection in an in-memory `Map<userId, Set<res>>`. When `enqueueEvent()`
  inserts into `notification_recipients` for a `user_id` that has an open
  connection, write an SSE event with the new notification's payload to that
  connection. No polling, no new table, no new package.
- Frontend: `NotificationBell` opens an `EventSource` to that route (only
  when `canReadNotifications`, mirroring the existing gate) instead of/in
  addition to the one-shot fetch, and appends incoming events to `items`
  client-side. Browsers reconnect `EventSource` automatically on drop —
  including the Neon-compute-suspend case, since the client reconnecting is
  what wakes it, at which point the reconnect handler does one `GET
  /notifications` catch-up fetch to backfill anything missed while
  disconnected (mirrors the "fetch-on-focus/fetch-on-reconnect" fallback the
  task context suggested, and closes the gap LISTEN/NOTIFY has around missed
  events).
- Fallback for anywhere SSE is blocked (some corporate proxies): keep the
  existing one-shot fetch as the baseline and add a `visibilitychange` /
  `focus` listener that re-fetches — cheap, no new infra, and correct even
  if SSE never connects.

This is a genuinely small change: one new backend route holding connections
in memory (no schema, no queue, no third-party service), and one frontend
hook swapping "fetch once" for "open a stream, append on message, refetch on
reconnect/focus." It scales to however many browser tabs are actually open
at once, which for this app is a handful, not thousands — an in-memory
`Map` on one process is entirely adequate and is the "cheap/open-source"
answer the task asked for; nothing here needs Redis pub/sub or similar until
the backend runs on more than one instance (see §3.4).

### 3.3 What changes, staged

| Stage | Change | Effort | Risk |
|---|---|---|---|
| 1 | Widen the email-queue `setInterval` from 60s → 15min | ~1 line | Very low — `setImmediate` kicks still cover all immediate sends; only delayed/retry jobs see slightly later delivery, well within acceptable bounds for an ERP notification |
| 2 | Move `runScheduledScans` off the shared timer onto a once-daily trigger (external cron hitting `POST /notifications/run-scans`, or a self-rescheduling `setTimeout`) | Small | Low — endpoint already exists and is idempotent (dedupe keys); just changing who calls it and when |
| 3 | Add `GET /notifications/stream` (SSE) + in-memory connection registry; push on `enqueueEvent()`/manual send | Medium | Low-medium — additive, no schema change, backend already single-process; must handle connection cleanup on disconnect/logout |
| 4 | Frontend: `NotificationBell` (and student `NotificationsPage`) subscribe via `EventSource`, append/backfill on reconnect; keep focus-refetch fallback | Small-medium | Low — purely additive to already-working fetch path; ship behind the existing `canReadNotifications` gate |
| 5 | Once Stage 3/4 are stable, revisit whether the email-queue timer in Stage 1 can shrink further to a due-time-aware skip (avoid the DB round-trip entirely when nothing is due) | Small | Low, but do last — the earlier stages already capture ~93%+ of the cost reduction; this is a further optimization, not a correctness fix |

### 3.4 Migration / rollout notes

- **No downtime, no data migration.** Every table (`notifications`,
  `notification_queue`, `notification_recipients`) stays exactly as-is —
  this is a delivery-mechanism change only, not a schema change. Existing
  queued/sent rows are unaffected.
- Stage 1–2 can ship independently and immediately; they're pure backend
  timing changes with no frontend coupling.
- Stage 3–4 should ship together (a stream with no subscriber is inert, and
  a subscriber with no stream falls back to the existing fetch-once
  behavior, so shipping either half alone is safe, just not yet useful).
- **Multi-instance caveat, noted for the future, not relevant today:** an
  in-memory SSE connection registry only works because this backend runs as
  one process. If it's ever scaled horizontally, a client's SSE connection
  and the process that inserted their notification could be different
  instances — at that point (and not before) this needs a shared pub/sub
  (Postgres `LISTEN/NOTIFY` becomes reasonable *here*, scoped just to
  fan-out between app instances rather than as the primary delivery
  mechanism, since instance-to-instance connections don't suffer the
  Neon-suspend problem the same way a long-lived client-facing connection
  does — or a small Redis if one is already in the stack for another
  reason). Not needed at current scale; flagging so nobody has to
  re-derive this later.
- Rollback is trivial at every stage: Stage 1–2 are timer-constant changes
  (revert the number); Stage 3–4 are additive (delete the route/hook, the
  one-shot fetch still works exactly as it does today).
