import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { profileApi } from "../api/profile.api";
import { tm30TenantApi } from "../api/tm30-tenant.api";
import type { UpdateProfileRequest, UserProfileDto } from "../types";

const keys = {
  profile: ["profile"] as const,
  myTm30: ["tm30", "mine"] as const,
};

// Backend currently strips certain fields out of GET /api/me/profile that it
// DOES accept on PATCH (notably payment: promptPayId / bankName / bankAccount*
// — see BE-10). Until the backend serializes them, we keep the user's last
// known values in sessionStorage and merge them onto every profile read so
// the host doesn't see their payment "disappear" between pages.
const STASH_KEY = "pmc_profile_stash_v1";
const STASH_FIELDS = ["promptPayId", "bankName", "bankAccountNumber", "bankAccountName"] as const;
type StashedField = (typeof STASH_FIELDS)[number];

function readStash(): Partial<Record<StashedField, string>> {
  try {
    const raw = sessionStorage.getItem(STASH_KEY);
    return raw ? JSON.parse(raw) : {};
  } catch {
    return {};
  }
}

function writeStash(patch: Record<string, unknown>) {
  try {
    const cur = readStash();
    let changed = false;
    for (const f of STASH_FIELDS) {
      const v = patch[f];
      if (typeof v === "string" && v.trim() !== "") {
        cur[f] = v;
        changed = true;
      }
    }
    if (changed) sessionStorage.setItem(STASH_KEY, JSON.stringify(cur));
  } catch {
    /* sessionStorage disabled — workaround degrades to in-memory only */
  }
}

function mergeStash<T extends UserProfileDto>(profile: T): T {
  const stash = readStash();
  if (Object.keys(stash).length === 0) return profile;
  const merged: T = { ...profile };
  for (const f of STASH_FIELDS) {
    // Server value wins if present. We only fill in fields the server has
    // stripped from the response.
    if (merged[f] == null && stash[f]) (merged as unknown as Record<string, unknown>)[f] = stash[f];
  }
  return merged;
}

export const useMyProfile = () =>
  useQuery({
    queryKey: keys.profile,
    queryFn: async () => mergeStash(await profileApi.get()),
    staleTime: 60_000,
  });

export const useUpdateProfile = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: UpdateProfileRequest) => profileApi.update(data),
    onSuccess: (_data, variables) => {
      // Stash payment fields locally so subsequent profile reads can merge
      // them in even if the backend response omits them.
      writeStash(variables as unknown as Record<string, unknown>);
      // Update the current cached profile right now so listeners re-render.
      qc.setQueryData<UserProfileDto | undefined>(keys.profile, (cur) => {
        if (!cur) return cur;
        const merged: UserProfileDto = { ...cur };
        for (const [k, v] of Object.entries(variables)) {
          if (v !== undefined) (merged as unknown as Record<string, unknown>)[k] = v;
        }
        return merged;
      });
      // Background revalidate — when backend BE-10 is fixed, this overwrites
      // our stash-merged values with the source of truth.
      qc.invalidateQueries({ queryKey: keys.profile });
    },
  });
};

/** Imperative variant for callers that update the profile outside React Query
 *  (e.g. property editor's commitFirstSave). Keeps the stash in sync. */
export function stashProfileUpdate(patch: Record<string, unknown>) {
  writeStash(patch);
}

export const useMyTm30 = () =>
  useQuery({
    queryKey: keys.myTm30,
    queryFn: tm30TenantApi.getMyTm30,
    staleTime: 60_000,
  });
