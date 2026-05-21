import { apiClient } from "./client";
import type { UserDto } from "../types";

// Auth endpoints wrap responses in ApiResponse<T> — need .data.data double-unwrap
export const authApi = {
  register: (email: string, password: string, firstName?: string) =>
    apiClient
      .post<{ data: { token: string } }>("/api/auth/register", { email, password, firstName })
      .then((r) => r.data.data),

  login: (email: string, password: string) =>
    apiClient
      .post<{ data: { token: string } }>("/api/auth/login", { email, password })
      .then((r) => r.data.data),

  lineLogin: (code: string, redirectUri: string) =>
    apiClient
      .post<{ data: { token: string } }>("/api/auth/line-login", { code, redirectUri })
      .then((r) => r.data.data),

  me: () =>
    apiClient
      .get<{ data: UserDto }>("/api/auth/me")
      .then((r) => r.data.data),
};
