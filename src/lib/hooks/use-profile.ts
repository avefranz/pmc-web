import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { profileApi } from "../api/profile.api";
import { tm30TenantApi } from "../api/tm30-tenant.api";
import type { UpdateProfileRequest } from "../types";

const keys = {
  profile: ["profile"] as const,
  myTm30: ["tm30", "mine"] as const,
};

export const useMyProfile = () =>
  useQuery({
    queryKey: keys.profile,
    queryFn: profileApi.get,
    staleTime: 60_000,
  });

export const useUpdateProfile = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: UpdateProfileRequest) => profileApi.update(data),
    onSuccess: () => qc.invalidateQueries({ queryKey: keys.profile }),
  });
};

export const useMyTm30 = () =>
  useQuery({
    queryKey: keys.myTm30,
    queryFn: tm30TenantApi.getMyTm30,
    staleTime: 60_000,
  });
