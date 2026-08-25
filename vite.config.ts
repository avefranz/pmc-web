import { defineConfig, loadEnv } from "vite";
import react from "@vitejs/plugin-react";
import path from "path";

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), "");
  // Backend the dev server proxies /api to. Defaults to the Railway BFF;
  // override with VITE_API_BASE_URL in .env (e.g. http://localhost:5149 for a local backend).
  const apiTarget = env.VITE_API_BASE_URL || "https://pmc-bff-production.up.railway.app";

  return {
    plugins: [react()],
    resolve: {
      alias: {
        "@": path.resolve(__dirname, "./src"),
      },
    },
    server: {
      port: 5173,
      proxy: {
        "/api": {
          target: apiTarget,
          changeOrigin: true,
          secure: true,
        },
      },
      // BE-Sec-5: Security headers for the dev server.
      // In production add these at the reverse-proxy (nginx/Caddy) level.
      //
      // Recommended nginx snippet for the SPA shell:
      //   add_header X-Frame-Options "DENY" always;
      //   add_header X-Content-Type-Options "nosniff" always;
      //   add_header Referrer-Policy "strict-origin-when-cross-origin" always;
      //   add_header Permissions-Policy "geolocation=(), camera=(), microphone=()" always;
      //   add_header Content-Security-Policy "default-src 'self'; script-src 'self' 'unsafe-inline'; style-src 'self' 'unsafe-inline' https://fonts.googleapis.com; font-src 'self' https://fonts.gstatic.com; img-src 'self' data: blob: https:; connect-src 'self' wss: https:; frame-ancestors 'none';" always;
      headers: {
        "X-Frame-Options": "DENY",
        "X-Content-Type-Options": "nosniff",
        "Referrer-Policy": "strict-origin-when-cross-origin",
        "Permissions-Policy": "geolocation=(), camera=(), microphone=()",
        // BE-Sec-5: CSP must live on HTML responses, not just JSON API responses.
        // unsafe-inline needed for Vite HMR in dev; tighten with nonce in prod nginx config.
        "Content-Security-Policy":
          "default-src 'self'; " +
          "script-src 'self' 'unsafe-inline'; " +
          "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com; " +
          "font-src 'self' https://fonts.gstatic.com; " +
          "img-src 'self' data: blob: https:; " +
          "connect-src 'self' wss: https:; " +
          "frame-ancestors 'none';",
      },
    },
  };
});
