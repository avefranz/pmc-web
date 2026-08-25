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
import {
  getMockListings,
  getMockListingDetail,
  getMockAvailability,
} from "../mock-data/marketplace";

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
    // Fallback: when the backend is unreachable or returns an empty page, serve
    // generated demo listings so the marketplace never renders blank. The same
    // query params are applied to the mock so filters still behave sensibly.
    return apiClient
      .get<ApiEnvelope<PagedResult<MarketplaceListingPreviewDto>>>(
        `/api/marketplace/listings${qs ? `?${qs}` : ""}`
      )
      .then((r) => {
        const page = r.data.data;
        if (import.meta.env.DEV && (!page || page.items.length === 0)) {
          return getMockListings(params);
        }
        return page;
      })
      .catch((err) => {
        if (import.meta.env.DEV) return getMockListings(params);
        throw err;
      });
  },

  getListing: (id: string): Promise<MarketplaceListingDto> =>
    apiClient
      .get<ApiEnvelope<MarketplaceListingDto>>(`/api/marketplace/listings/${id}`)
      .then((r) => {
        const dto = r.data.data ?? (import.meta.env.DEV ? getMockListingDetail(id) : null);
        if (!dto) throw new Error(`Listing ${id} not found`);
        return dto;
      })
      .catch((err) => {
        // Dev-only: fall back to a curated or generated detail page.
        if (import.meta.env.DEV) {
          const mock = getMockListingDetail(id);
          if (mock) return mock;
        }
        throw err;
      }),

  // New medium-term availability format
  getAvailability: (id: string) =>
    apiClient
      .get<ApiEnvelope<ListingAvailabilityDto>>(
        `/api/marketplace/listings/${id}/availability`
      )
      .then((r) => {
        if (!r.data.data && import.meta.env.DEV) return getMockAvailability(id);
        return r.data.data;
      })
      .catch((err) => {
        if (import.meta.env.DEV) return getMockAvailability(id);
        throw err;
      }),

  // Legacy day-by-day (kept for manager calendar only)
  getAvailabilityRange: (id: string, from: string, to: string) =>
    apiClient
      .get<ApiEnvelope<CalendarDayDto[]>>(
        `/api/marketplace/listings/${id}/availability?from=${from}&to=${to}`
      )
      .then((r) => r.data.data),

  getCities: async (): Promise<MarketplaceCityDto[]> => {
    const cities = await apiClient
      .get<ApiEnvelope<MarketplaceCityDto[]>>("/api/marketplace/cities")
      .then((r) => r.data.data);

    if (cities && cities.length > 0) return cities;

    // Fallback when backend Cities table is not yet seeded
    const FALLBACK: MarketplaceCityDto[] = [
      { id: 1,  code: "BKK", name: { en: "Bangkok",               th: "กรุงเทพฯ"          }, latitude: 13.7563, longitude: 100.5018, activeListingsCount: 0 },
      { id: 2,  code: "CNX", name: { en: "Chiang Mai",            th: "เชียงใหม่"         }, latitude: 18.7883, longitude: 98.9853,  activeListingsCount: 0 },
      { id: 3,  code: "HKT", name: { en: "Phuket",                th: "ภูเก็ต"            }, latitude: 7.8804,  longitude: 98.3923,  activeListingsCount: 0 },
      { id: 4,  code: "PTY", name: { en: "Pattaya",               th: "พัทยา"             }, latitude: 12.9236, longitude: 100.8825, activeListingsCount: 0 },
      { id: 5,  code: "HHQ", name: { en: "Hua Hin",               th: "หัวหิน"            }, latitude: 12.5684, longitude: 99.9577,  activeListingsCount: 0 },
      { id: 6,  code: "USM", name: { en: "Koh Samui",             th: "เกาะสมุย"          }, latitude: 9.5120,  longitude: 100.0136, activeListingsCount: 0 },
      { id: 7,  code: "CEI", name: { en: "Chiang Rai",            th: "เชียงราย"          }, latitude: 19.9105, longitude: 99.8406,  activeListingsCount: 0 },
      { id: 8,  code: "KKC", name: { en: "Khon Kaen",             th: "ขอนแก่น"           }, latitude: 16.4419, longitude: 102.8360, activeListingsCount: 0 },
      { id: 9,  code: "UTP", name: { en: "Rayong",                th: "ระยอง"             }, latitude: 12.6814, longitude: 101.2816, activeListingsCount: 0 },
      { id: 10, code: "NST", name: { en: "Nakhon Si Thammarat",   th: "นครศรีธรรมราช"    }, latitude: 8.4326,  longitude: 99.9633,  activeListingsCount: 0 },
    ];
    return FALLBACK;
  },

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
