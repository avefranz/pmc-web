import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { utilitiesApi } from "../api/utilities.api";
import type { CreateUtilityContractRequest } from "../types";

const keys = {
  byAsset: (assetId: string) => ["utilities", assetId] as const,
};

export const useUtilitiesByAsset = (assetId: string) =>
  useQuery({
    queryKey: keys.byAsset(assetId),
    queryFn: () => utilitiesApi.getByAsset(assetId),
    staleTime: 60_000,
  });

export const useCreateUtility = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: CreateUtilityContractRequest) => utilitiesApi.create(data),
    onSuccess: (_d, vars) => qc.invalidateQueries({ queryKey: keys.byAsset(vars.assetId) }),
  });
};

export const useDeleteUtility = (assetId: string) => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => utilitiesApi.delete(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: keys.byAsset(assetId) }),
  });
};
