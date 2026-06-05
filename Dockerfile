# syntax=docker/dockerfile:1

# ─────────────────────────────────────────────────────────────────────────────
# Stage 1 — build the Vite SPA
# ─────────────────────────────────────────────────────────────────────────────
FROM node:20-alpine AS builder

WORKDIR /app

# Install deps first (better layer caching — only re-runs when manifests change).
COPY package.json package-lock.json ./
RUN npm ci --no-audit --no-fund

# Build-time public config. Vite inlines VITE_* into the bundle at build time,
# so these MUST be provided as build args (Railway passes service variables to
# the Docker build automatically). They are PUBLIC — never put secrets here.
ARG VITE_LINE_CLIENT_ID=""
ARG VITE_LINE_REDIRECT_URI=""
ARG VITE_API_BASE_URL=""
ENV VITE_LINE_CLIENT_ID=$VITE_LINE_CLIENT_ID \
    VITE_LINE_REDIRECT_URI=$VITE_LINE_REDIRECT_URI \
    VITE_API_BASE_URL=$VITE_API_BASE_URL

COPY . .

# tsc -b && vite build → static assets in /app/dist
RUN npm run build

# ─────────────────────────────────────────────────────────────────────────────
# Stage 2 — serve with nginx (SPA fallback + /api reverse proxy)
# ─────────────────────────────────────────────────────────────────────────────
FROM nginx:1.27-alpine AS runtime

# Static build output.
COPY --from=builder /app/dist /usr/share/nginx/html

# nginx config template (PORT + BACKEND_URL are substituted at container start
# by our own render script — placed OUTSIDE /etc/nginx/templates so the image's
# built-in envsubst processor doesn't also run on it).
COPY deploy/nginx.conf.template /etc/nginx/nginx.conf.template
COPY deploy/docker-entrypoint.sh /docker-entrypoint.d/99-render-config.sh
RUN chmod +x /docker-entrypoint.d/99-render-config.sh

# Railway injects PORT at runtime; default for local `docker run`.
ENV PORT=8080
# Backend origin the SPA's /api calls are proxied to (no trailing slash, no path).
# Baked default = the Azure App Service backend; a Railway service variable named
# BACKEND_URL overrides this at runtime without a rebuild.
ENV BACKEND_URL="https://siamo-bed5bgebauc9g4gj.southeastasia-01.azurewebsites.net"

EXPOSE 8080

# nginx:alpine's stock entrypoint runs every /docker-entrypoint.d/*.sh then
# launches nginx, so we don't override CMD.
