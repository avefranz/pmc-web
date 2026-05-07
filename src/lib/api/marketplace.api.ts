import { apiClient } from "./client";
import type {
  MarketplaceListingPreviewDto,
  MarketplaceListingDto,
  MarketplaceCityDto,
  CalendarDayDto,
  ListingAvailabilityDto,
  PagedResult,
  MarketplaceListingsQuery,
  BookingRequestData,
  BookingRequestResult,
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

  // New medium-term availability format
  getAvailability: (id: string) =>
    apiClient
      .get<ApiEnvelope<ListingAvailabilityDto>>(
        `/api/marketplace/listings/${id}/availability`
      )
      .then((r) => r.data.data),

  // Legacy day-by-day (kept for manager calendar only)
  getAvailabilityRange: (id: string, from: string, to: string) =>
    apiClient
      .get<ApiEnvelope<CalendarDayDto[]>>(
        `/api/marketplace/listings/${id}/availability?from=${from}&to=${to}`
      )
      .then((r) => r.data.data),

  getCities: () =>
    apiClient
      .get<ApiEnvelope<MarketplaceCityDto[]>>("/api/marketplace/cities")
      .then((r) => r.data.data),

  submitBookingRequest: (data: BookingRequestData) => {
    // Backend uses checkInDate; frontend model uses moveInDate
    const { moveInDate, ...rest } = data;
    return apiClient
      .post<ApiEnvelope<BookingRequestResult>>(
        `/api/marketplace/listings/${data.listingId}/booking-requests`,
        { ...rest, checkInDate: moveInDate }
      )
      .then((r) => r.data.data);
  },
};
