import { apiClient } from "./client";
import type { AssetDto, AssetMemberDto, AssetSummaryDto, CreateAssetRequest, UpdateAssetRequest, UpdateLocationRequest } from "../types";

export type PoiCategory = "Transit" | "Food" | "Shopping" | "Health" | "Education";

export type NearbyPoi = {
  name:           string;
  kind:           string;
  category:       PoiCategory;
  distanceMeters: number;
  latitude:       number;
  longitude:      number;
};

export type NearbyPoisResponse = {
  assetId:      string;
  latitude:     number;
  longitude:    number;
  radiusMeters: number;
  transit:      NearbyPoi[];
  food:         NearbyPoi[];
  shopping:     NearbyPoi[];
  health:       NearbyPoi[];
  education:    NearbyPoi[];
  source:       "osm";
  cached:       boolean;
  degraded:     boolean;
};

export const assetsApi = {
  getAll: () => apiClient.get<AssetDto[]>("/api/assets").then((r) => r.data),

  getById: (id: string) => apiClient.get<AssetDto>(`/api/assets/${id}`).then((r) => r.data),

  getSummary: (id: string, from?: string, to?: string) =>
    apiClient
      .get<AssetSummaryDto>(`/api/assets/${id}/summary`, { params: { from, to } })
      .then((r) => r.data),

  create: (data: CreateAssetRequest) =>
    apiClient.post<{ data: { id: string } }>("/api/assets", data).then((r) => r.data.data),

  update: (id: string, data: UpdateAssetRequest) =>
    apiClient.patch(`/api/assets/${id}`, data).then((r) => r.data),

  updateLocation: (data: UpdateLocationRequest) =>
    apiClient.put("/api/assets/location", data).then((r) => r.data),

  getMembers: (id: string) =>
    apiClient.get<AssetMemberDto[]>(`/api/assets/${id}/members`).then((r) => r.data),

  unlinkLandlord: (id: string) => apiClient.delete(`/api/assets/${id}/landlord`),

  delete: (id: string) => apiClient.delete(`/api/assets/${id}`),

  getNearbyPois: (assetId: string, radius = 500) =>
    apiClient
      .get<{ data: NearbyPoisResponse }>(`/api/assets/${assetId}/nearby-pois`, { params: { radius } })
      .then((r) => r.data.data),

  enrichNearby: (assetId: string) =>
    apiClient.post(`/api/assets/${assetId}/enrich-nearby`).then((r) => r.data),
};
