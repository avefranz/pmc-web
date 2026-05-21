import { apiClient } from "./client";
import type { UserProfileDto, UpdateProfileRequest } from "../types";

// Backend returns the profile inside an `{data, success, message, errors}`
// envelope — same shape as the marketplace/asset endpoints. Unwrap so callers
// get a real UserProfileDto.
interface ProfileEnvelope {
  data: UserProfileDto;
  success: boolean;
}

export const profileApi = {
  get: () =>
    apiClient.get<ProfileEnvelope>("/api/me/profile").then((r) => r.data.data),

  update: (data: UpdateProfileRequest) =>
    apiClient.patch("/api/me/profile", data).then(() => undefined),
};
