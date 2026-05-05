import { useQuery } from "@tanstack/react-query";
import { marketplaceApi } from "../api/marketplace.api";
import type { MarketplaceListingsQuery } from "../types/marketplace";

const keys = {
  cities: ["marketplace", "cities"] as const,
  listings: (q: MarketplaceListingsQuery) =>
    ["marketplace", "listings", q] as const,
  listing: (id: string) => ["marketplace", "listing", id] as const,
  availability: (id: string, from: string, to: string) =>
    ["marketplace", "availability", id, from, to] as const,
};

export const useMarketplaceCities = () =>
  useQuery({
    queryKey: keys.cities,
    queryFn: marketplaceApi.getCities,
    staleTime: 5 * 60_000,
  });

export const useMarketplaceListings = (query: MarketplaceListingsQuery) =>
  useQuery({
    queryKey: keys.listings(query),
    queryFn: () => marketplaceApi.getListings(query),
    staleTime: 30_000,
  });

export const useMarketplaceListing = (id: string) =>
  useQuery({
    queryKey: keys.listing(id),
    queryFn: () => marketplaceApi.getListing(id),
    staleTime: 60_000,
    enabled: !!id,
  });

export const useListingAvailability = (
  id: string,
  from: string,
  to: string,
  enabled = true
) =>
  useQuery({
    queryKey: keys.availability(id, from, to),
    queryFn: () => marketplaceApi.getAvailability(id, from, to),
    staleTime: 60_000,
    enabled: enabled && !!id && !!from && !!to,
  });
