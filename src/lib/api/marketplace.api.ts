import { apiClient } from "./client";
import type {
  MarketplaceListingPreviewDto,
  MarketplaceListingDto,
  MarketplaceCityDto,
  CalendarDayDto,
  PagedResult,
  MarketplaceListingsQuery,
} from "../types/marketplace";

interface ApiEnvelope<T> {
  success: boolean;
  data: T;
  message: string | null;
}

export const marketplaceApi = {
  getListings: (params: MarketplaceListingsQuery = {}) => {
    const sp = new URLSearchParams();
    Object.entries(params).forEach(([key, val]) => {
      if (val === undefined || val === null || val === "") return;
      if (Array.isArray(val)) {
        val.forEach((v) => sp.append(key, String(v)));
      } else {
        sp.set(key, String(val));
      }
    });
    const qs = sp.toString();
    return apiClient
      .get<ApiEnvelope<PagedResult<MarketplaceListingPreviewDto>>>(
        `/api/marketplace/listings${qs ? `?${qs}` : ""}`
      )
      .then((r) => r.data.data);
  },

  getListing: (id: string) =>
    apiClient
      .get<ApiEnvelope<MarketplaceListingDto>>(`/api/marketplace/listings/${id}`)
      .then((r) => r.data.data),

  getAvailability: (id: string, from: string, to: string) =>
    apiClient
      .get<ApiEnvelope<CalendarDayDto[]>>(
        `/api/marketplace/listings/${id}/availability?from=${from}&to=${to}`
      )
      .then((r) => r.data.data),

  getCities: () =>
    apiClient
      .get<ApiEnvelope<MarketplaceCityDto[]>>("/api/marketplace/cities")
      .then((r) => r.data.data),
};
