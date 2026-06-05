# Deploying pmc-web (Railway / Docker)

The frontend is a static Vite SPA served by **nginx**, which also reverse-proxies
`/api/*` to the backend so the browser stays same-origin (no CORS changes on the
backend). Build & serve are defined in the repo-root [`Dockerfile`](../Dockerfile).

## How it works

```
Browser ──▶ nginx (this container)
              ├─ /            → dist/index.html  (SPA, React Router fallback)
              ├─ /assets/*    → hashed JS/CSS/img (cached 1y)
              └─ /api/*       → proxy_pass $BACKEND_URL   (your PMC.BFF)
```

The app's axios client uses relative `/api` paths (`baseURL: ""`), exactly like
the Vite dev proxy — so in production nginx fills the same role.

## Railway setup

1. **New Project → Deploy from GitHub repo** → pick `pmc-web`.
   Railway auto-detects the `Dockerfile` (no Nixpacks config needed).
2. Add the backend (PMC.BFF) as its own Railway service, or use its existing URL.
3. On the **pmc-web** service → **Variables**, set:

   | Variable | Required | Example | Notes |
   |----------|----------|---------|-------|
   | `BACKEND_URL` | optional* | `https://siamo-bed5bgebauc9g4gj.southeastasia-01.azurewebsites.net` | Backend origin. **No trailing slash, no path.** `/api` is preserved upstream. *Defaults to the Azure backend baked into the image; set this only to point at a different backend.* |
   | `VITE_LINE_CLIENT_ID` | optional | `1657…` | LINE OAuth (build-time). Omit to disable LINE login. |
   | `VITE_LINE_REDIRECT_URI` | optional | `https://app.yoursite.com/line-callback` | Defaults to `window.location.origin/line-callback` if unset. |
   | `PORT` | — | (auto) | Railway injects this; nginx listens on it. Don't set manually. |

   > `VITE_*` are **build-time** and baked into the bundle (Railway passes service
   > variables to the Docker build automatically). Changing them requires a
   > redeploy. They are public — never put secrets in `VITE_*`.

4. Deploy. Railway's health check hits `/` → nginx returns `index.html` (200).

### Using Railway private networking (optional)

If the backend is in the same Railway project you can point `BACKEND_URL` at its
internal URL, e.g. `http://pmc-bff.railway.internal:8080`. nginx resolves the
host at startup, so redeploying the backend may occasionally need a pmc-web
restart if its internal IP changes. A public `*.up.railway.app` URL avoids that.

## Local test

```bash
docker build -t pmc-web .
docker run --rm -p 8080:8080 \
  -e BACKEND_URL=https://your-backend.example.com \
  pmc-web
# open http://localhost:8080
```

Without `BACKEND_URL` the SPA still serves (you can see the UI); `/api` calls
return 502 until it's set.

## Files

- [`Dockerfile`](../Dockerfile) — multi-stage build (Node 20 → nginx 1.27).
- [`deploy/nginx.conf.template`](./nginx.conf.template) — server config (SPA
  fallback, `/api` proxy, security headers mirrored from `vite.config.ts`).
- [`deploy/docker-entrypoint.sh`](./docker-entrypoint.sh) — renders the template
  with `$PORT` / `$BACKEND_URL` at container start.
