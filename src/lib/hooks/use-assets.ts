import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { assetsApi } from "../api/assets.api";
import type { CreateAssetRequest, UpdateLocationRequest } from "../types";

const keys = {
  all: ["assets"] as const,
  detail: (id: string) => ["assets", id] as const,
  summary: (id: string) => ["assets", id, "summary"] as const,
  members: (id: string) => ["assets", id, "members"] as const,
};

export const useAssets = () =>
  useQuery({ queryKey: keys.all, queryFn: assetsApi.getAll, staleTime: 30_000 });

export const useAsset = (id: string) =>
  useQuery({ queryKey: keys.detail(id), queryFn: () => assetsApi.getById(id), staleTime: 30_000 });

export const useAssetMembers = (id: string) =>
  useQuery({
    queryKey: keys.members(id),
    queryFn: () => assetsApi.getMembers(id),
    staleTime: 30_000,
  });

export const useAssetSummary = (id: string) =>
  useQuery({
    queryKey: keys.summary(id),
    queryFn: () => assetsApi.getSummary(id),
    staleTime: 60_000,
  });

export const useCreateAsset = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: CreateAssetRequest) => assetsApi.create(data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: keys.all });
      qc.invalidateQueries({ queryKey: ["capabilities"] });
    },
  });
};

export const useUpdateLocation = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: UpdateLocationRequest) => assetsApi.updateLocation(data),
    onSuccess: (_d, vars) => qc.invalidateQueries({ queryKey: keys.detail(vars.assetId) }),
  });
};

export const useUnlinkLandlord = (id: string) => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: () => assetsApi.unlinkLandlord(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: keys.members(id) }),
  });
};

export const useDeleteAsset = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => assetsApi.delete(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: keys.all });
      qc.invalidateQueries({ queryKey: ["finance"] });
    },
  });
};
