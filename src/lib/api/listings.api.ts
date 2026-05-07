import { apiClient } from "./client";
import type { ListingDto, CreateListingRequest } from "../types";

export interface AmenitySelection {
  amenityId: string | number;
  isPresent: boolean;
  detailsJson?: string | null;
}

export interface UpdateListingRequest {
  title?: string;
  description?: string;
  houseRules?: string;
  wifiName?: string;
  wifiPassword?: string;
  basePrice?: number;
  baseMonthlyRate?: number;
  depositAmount?: number;
  discountTiers?: { minMonths: number; discountPercent: number }[];
  instantBookEnabled?: boolean;
  rentalType?: string;
  startDate?: string | null;
  endDate?: string | null;
}

export interface HotfixListingRequest {
  reason: string;
  title?: string;
  description?: string;
  houseRules?: string;
  wifiName?: string;
  wifiPassword?: string;
  instantBookEnabled?: boolean;
  rentalType?: string;
}

export const listingsApi = {
  getById: (id: string) => apiClient.get<ListingDto>(`/api/listings/${id}`).then((r) => r.data),

  getByAsset: (assetId: string) =>
    apiClient.get<ListingDto[]>(`/api/listings/asset/${assetId}`).then((r) => r.data),

  create: (data: CreateListingRequest) =>
    apiClient.post<{ data: { id: string } }>("/api/listings", data).then((r) => r.data.data),

  update: (id: string, data: UpdateListingRequest) =>
    apiClient.patch(`/api/listings/${id}`, data).then((r) => r.data),

  uploadMedia: (listingId: string, file: File, roomSegmentId?: string) => {
    const form = new FormData();
    form.append("file", file);
    if (roomSegmentId) form.append("roomSegmentId", roomSegmentId);
    return apiClient
      .post<{ mediaId: string }>(`/api/listings/${listingId}/media`, form)
      .then((r) => r.data);
  },

  deleteMedia: (listingId: string, mediaId: string) =>
    apiClient.delete(`/api/listings/${listingId}/media/${mediaId}`),

  reorderMedia: (listingId: string, sortedMediaIds: string[]) =>
    apiClient.put("/api/listings/media/reorder", { listingId, sortedMediaIds }),

  updateAmenities: (listingId: string, selectedAmenities: AmenitySelection[]) =>
    apiClient.put("/api/listings/amenities", { listingId, selectedAmenities }),

  publish: (id: string) => apiClient.post(`/api/listings/${id}/publish`),

  newVersion: (id: string) =>
    apiClient
      .post<{ data: { id: string } }>(`/api/listings/${id}/new-version`)
      .then((r) => r.data.data),

  hotfix: (id: string, data: HotfixListingRequest) =>
    apiClient.post(`/api/listings/${id}/hotfix`, data),
};
