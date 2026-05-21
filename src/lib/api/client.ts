import axios from "axios";
import { useAuthStore } from "../stores/auth.store";

// One-time migration: older sessions kept the token under "pmc_token" alongside
// Zustand's "pmc_auth". Import any leftover value into the store (if Zustand has
// none) and drop the legacy key, so going forward there is a single source of truth.
(() => {
  const legacy = localStorage.getItem("pmc_token");
  if (legacy && !useAuthStore.getState().token) {
    useAuthStore.getState().setToken(legacy);
  }
  if (legacy !== null) localStorage.removeItem("pmc_token");
})();

export const apiClient = axios.create({
  baseURL: import.meta.env.VITE_API_BASE_URL ?? "",
  headers: { "Content-Type": "application/json" },
});

apiClient.interceptors.request.use((config) => {
  const token = useAuthStore.getState().token;
  if (token) config.headers.Authorization = `Bearer ${token}`;

  // For FormData axios must set Content-Type itself (it adds the multipart boundary).
  // Deleting the header here lets axios replace the instance-level default.
  if (config.data instanceof FormData) {
    delete config.headers["Content-Type"];
  }

  return config;
});

let redirecting = false;

apiClient.interceptors.response.use(
  (res) => {
    redirecting = false;
    return res;
  },
  (err) => {
    // Only redirect to /login when the user HAD a token (session expired).
    // Anonymous users hitting a 401 (e.g. submitting a booking request before auth)
    // should NOT be redirected — the UI handles that inline.
    const hadToken = !!useAuthStore.getState().token;
    if (err.response?.status === 401 && !redirecting && hadToken) {
      redirecting = true;
      useAuthStore.getState().clearAuth();
      if (!window.location.pathname.startsWith("/login")) {
        window.location.href = "/login";
      }
    }
    return Promise.reject(err);
  }
);
