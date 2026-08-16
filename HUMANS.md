

&nbsp;

# Exposing a local dev app over Tailscale (Vite + Node/Express)

## Why it breaks (2 separate errors, 2 separate fixes)

1. **"Blocked request. This host is not allowed"** → Vite's dev server itself

   rejects requests with an unrecognized `Host` header. Fix in `vite.config.js`.

2. **CORS error** → your backend API's CORS allowlist doesn't include the

   Tailscale origin the frontend is now running on. Fix in backend CORS config.

These are independent — fixing one does not fix the other. Expect to hit #1

first, then #2 once the page loads and starts calling the API.

## Files to check in any new app

| What | File | Look for |

|---|---|---|

| Vite host allowlist | `vite.config.js` | `server.allowedHosts` |

| Frontend → backend URL | `.env` / `.env.local` (frontend root) | `VITE_API_URL` or similar |

| Backend CORS allowlist | wherever `cors()` / CORS middleware is set up (e.g. `app.js`, `server.js`) | array of allowed origins |

| Backend port/host binding | backend entrypoint `server.js`) | `app.listen(port)` — bare `listen(port)` binds all interfaces, that's fine |

| Backend env | `backend/.env` | `FRONTEND_URL`, `PORT`, secrets — **only used by the backend process, must live in the backend's own folder**, not the frontend root |

## Step-by-step fix

1. **Get your Tailscale hostname**: `tailscale status` or check the admin

   console. Looks like `<device>.<tailnet>.[ts.net](http://ts.net)`.

2. **Run the frontend bound to all interfaces**:

   ```

   npm run dev -- --host 0.0.0.0 --port 5173

   ```

3. **Allow the host in `vite.config.js`**:

   ```js

   export default defineConfig({

     server: {

       host: '0.0.0.0',

       port: 5173,

       allowedHosts: ['[your-device.your-tailnet.ts.net](http://your-device.your-tailnet.ts.net)'], // hostname only, no protocol/port

     },

   })

   ```

4. **Point the frontend at the backend via the Tailscale hostname**, not

   `localhost` (so it also works from other devices on your tailnet). In

   the frontend's `.env.env.local`:

   ```

   VITE_API_URL=[http://your-device.your-tailnet.ts.net:5000/api](http://your-device.your-tailnet.ts.net:5000/api)

   ```

   Restart `npm run dev` after editing — Vite only reads env files at startup.

5. **Add the same origin to the backend's CORS allowlist**:

   ```js

   const allowedOrigins = [

     '[http://localhost:5173](http://localhost:5173)',

     '[http://your-device.your-tailnet.ts.net:5173](http://your-device.your-tailnet.ts.net:5173)', // add this

   ]

   app.use(cors({

     origin: (origin, cb) =&gt; {

       if (!origin || allowedOrigins.includes(origin)) return cb(null, true)

       cb(new Error('CORS: origin not allowed'))

     },

     credentials: true,

   }))

   ```

   The origin must match **exactly**: same scheme (http/https) and same port.

6. **Make sure the backend actually starts.** A crashed backend (e.g. missing

   `DATABASE_URL`) looks exactly like a CORS/connection error in the browser.

   Always check the backend terminal output first.

## Optional: real HTTPS instead of [`http://host:port`](http://host:port)

Tailscale can terminate HTTPS for you, no cert setup needed:

```

tailscale serve --bg --https=443 5173      # frontend → [https://host.tailnet.ts.net/](https://host.tailnet.ts.net/)

tailscale serve --bg --https=8443 5000     # backend  → [https://host.tailnet.ts.net:8443/](https://host.tailnet.ts.net:8443/)

tailscale serve status                     # see current mappings

tailscale serve reset                      # remove all mappings

```

Requires **HTTPS Certificates** enabled once in the Tailscale admin console

(DNS tab). Update `VITE_API_URL` and the CORS allowlist to the `https://` URL

after switching.

## Quick debugging commands

```

tailscale status                     # confirm device is online, get hostname/IP

curl [http://localhost:5000/health](http://localhost:5000/health)    # confirm backend is up locally first

curl -I [http://your-device.your-tailnet.ts.net:5000/health](http://your-device.your-tailnet.ts.net:5000/health)   # confirm reachable over tailnet

```

In Chrome DevTools → Network tab, check the **failed request's** status/error

directly (not just headers) — "CORS", "ERR_CONNECTION_REFUSED", and "blocked

host" all look different there and point to different fixes.

