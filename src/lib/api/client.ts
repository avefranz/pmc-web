import axios from "axios";

export const apiClient = axios.create({
  baseURL: "",
  headers: { "Content-Type": "application/json" },
});

apiClient.interceptors.request.use((config) => {
  const token = localStorage.getItem("pmc_token");
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
  (res) => res,
  (err) => {
    if (err.response?.status === 401 && !redirecting) {
      localStorage.removeItem("pmc_token");
      if (!window.location.pathname.startsWith("/login")) {
        redirecting = true;
        window.location.href = "/login";
      }
    }
    return Promise.reject(err);
  }
);
