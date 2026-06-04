import { apiClient } from "./client";
import type { UserProfileDto, UpdateProfileRequest, UpdateLandlordIdentityRequest } from "../types";

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

  // BUG-267: persist the landlord identity snapshot used when generating the
  // rental contract PDF. Required before a landlord can sign — without it the
  // BE rejects landlord-sign with `landlord_identity_missing`.
  // `skipAuthRedirect`: a 401 here must NOT log the host out mid-form (see
  // client.ts) — the form surfaces the error inline and keeps the typed data.
  updateLandlordIdentity: (data: UpdateLandlordIdentityRequest) =>
    apiClient
      .patch("/api/me/profile/landlord-identity", data, { skipAuthRedirect: true } as Parameters<typeof apiClient.patch>[2])
      .then(() => undefined),
};
