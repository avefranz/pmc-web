import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { assetsApi } from "../api/assets.api";
import type { CreateAssetRequest, UpdateAssetRequest, UpdateLocationRequest } from "../types";

const keys = {
  all: ["assets"] as const,
  detail: (id: string) => ["assets", id] as const,
  summary: (id: string) => ["assets", id, "summary"] as const,
  members: (id: string) => ["assets", id, "members"] as const,
  nearbyPois: (id: string, radius: number) => ["assets", id, "nearby-pois", radius] as const,
};

export const useAssets = () =>
  useQuery({ queryKey: keys.all, queryFn: assetsApi.getAll, staleTime: 30_000 });

export const useAsset = (id: string) =>
  useQuery({ queryKey: keys.detail(id), queryFn: () => assetsApi.getById(id), staleTime: 30_000, enabled: !!id });

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

export const useUpdateAsset = (id: string) => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: UpdateAssetRequest) => assetsApi.update(id, data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: keys.detail(id) });
      qc.invalidateQueries({ queryKey: keys.all });
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

export const useNearbyPois = (assetId: string | undefined, radius = 500, enabled = true) =>
  useQuery({
    queryKey: keys.nearbyPois(assetId ?? "", radius),
    queryFn: () => assetsApi.getNearbyPois(assetId!, radius),
    enabled: !!assetId && enabled,
    staleTime: 24 * 60 * 60 * 1000,
    gcTime: 24 * 60 * 60 * 1000,
    retry: 0,
  });

export const useEnrichNearby = (assetId: string) => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: () => assetsApi.enrichNearby(assetId),
    // Invalidate both ["listings", assetId] and ["listings", "asset", assetId] so that
    // NearbyStatus (useListing by id) and the editor (useListingsByAsset) both refresh.
    // We also wait a short delay before invalidating since enrichment is async on the backend.
    onSuccess: () =>
      new Promise<void>((resolve) =>
        setTimeout(() => {
          qc.invalidateQueries({ queryKey: ["listings"] });
          resolve();
        }, 4000),
      ),
  });
};

export const useDeleteAsset = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => assetsApi.delete(id),
    onSuccess: (_d, id) => {
      // Immediately remove from list cache so navigation lands on a clean list.
      qc.setQueryData<import("../types").AssetDto[]>(keys.all, (old) =>
        old ? old.filter((a) => a.id !== id) : old,
      );
      qc.removeQueries({ queryKey: keys.detail(id) });
      qc.removeQueries({ queryKey: keys.summary(id) });
      qc.invalidateQueries({ queryKey: ["finance"] });
    },
  });
};
