import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { profileApi } from "../api/profile.api";
import { tm30TenantApi } from "../api/tm30-tenant.api";
import type { UpdateProfileRequest, UserProfileDto } from "../types";

const keys = {
  profile: ["profile"] as const,
  myTm30: ["tm30", "mine"] as const,
};

// BE-10 fixed: backend now returns all payment fields in GET /api/me/profile.
// Removed sessionStorage stash + mergeStash workaround — plain invalidate is enough.

export const useMyProfile = () =>
  useQuery({
    queryKey: keys.profile,
    queryFn: () => profileApi.get(),
    staleTime: 60_000,
  });

export const useUpdateProfile = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: UpdateProfileRequest) => profileApi.update(data),
    onSuccess: () => {
      // Simple invalidate — backend now returns the full profile including payment fields.
      qc.invalidateQueries({ queryKey: keys.profile });
    },
  });
};

/** Imperative variant kept for callers in the property editor (commitFirstSave). */
export function stashProfileUpdate(_patch: Record<string, unknown>) {
  // No-op — BE-10 fixed, stash no longer needed. Kept for API compat.
}

export const useMyTm30 = () =>
  useQuery({
    queryKey: keys.myTm30,
    queryFn: tm30TenantApi.getMyTm30,
    staleTime: 60_000,
  });
