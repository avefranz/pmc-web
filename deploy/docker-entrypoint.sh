#!/bin/sh
# Renders the nginx config from a template at container start, substituting
# ${PORT} (Railway-injected) and ${BACKEND_URL}. Runs via the nginx:alpine
# stock entrypoint's /docker-entrypoint.d/ hook, BEFORE nginx launches.
set -eu

PORT="${PORT:-8080}"
BACKEND_URL="${BACKEND_URL:-}"

# Strip a trailing slash so `proxy_pass ${BACKEND_URL};` preserves the /api
# prefix instead of rewriting the matched location away.
BACKEND_URL="${BACKEND_URL%/}"

if [ -z "$BACKEND_URL" ]; then
    # Keep the SPA serving (you can see the UI) but make /api fail loudly with a
    # 502 instead of crashing nginx on an empty proxy_pass. Set BACKEND_URL to
    # your backend origin (e.g. https://pmc-bff-production.up.railway.app).
    echo "WARNING: BACKEND_URL is not set — /api requests will return 502." >&2
    echo "         Set BACKEND_URL to your backend origin (no trailing slash)." >&2
    BACKEND_URL="http://127.0.0.1:9"
fi

export PORT BACKEND_URL

# Substitute ONLY our two vars; leave nginx runtime vars ($host, $uri, …) intact.
envsubst '${PORT} ${BACKEND_URL}' \
    < /etc/nginx/nginx.conf.template \
    > /etc/nginx/conf.d/default.conf

echo "nginx: serving SPA on :${PORT}, proxying /api → ${BACKEND_URL}"
