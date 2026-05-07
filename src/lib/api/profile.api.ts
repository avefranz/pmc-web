import { apiClient } from "./client";
import type { UserProfileDto, UpdateProfileRequest } from "../types";

export const profileApi = {
  get: () =>
    apiClient.get<UserProfileDto>("/api/me/profile").then((r) => r.data),

  update: (data: UpdateProfileRequest) =>
    apiClient.patch("/api/me/profile", data).then(() => undefined),
};
