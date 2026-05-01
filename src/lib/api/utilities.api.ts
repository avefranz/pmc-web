import { apiClient } from "./client";
import type { UtilityContractDto, CreateUtilityContractRequest } from "../types";

export const utilitiesApi = {
  getByAsset: (assetId: string) =>
    apiClient.get<UtilityContractDto[]>(`/api/utilities/asset/${assetId}`).then((r) => r.data),

  create: (data: CreateUtilityContractRequest) =>
    apiClient.post<{ id: string }>("/api/utilities", data).then((r) => r.data),

  delete: (id: string) => apiClient.delete(`/api/utilities/${id}`),
};
