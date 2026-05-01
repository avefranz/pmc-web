import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { listingsApi, type AmenitySelection, type UpdateListingRequest, type HotfixListingRequest } from "../api/listings.api";
import type { CreateListingRequest } from "../types";

const keys = {
  detail: (id: string) => ["listings", id] as const,
  byAsset: (assetId: string) => ["listings", "asset", assetId] as const,
};

export const useListing = (id: string) =>
  useQuery({ queryKey: keys.detail(id), queryFn: () => listingsApi.getById(id), staleTime: 30_000 });

export const useListingsByAsset = (assetId: string) =>
  useQuery({
    queryKey: keys.byAsset(assetId),
    queryFn: () => listingsApi.getByAsset(assetId),
    staleTime: 30_000,
  });

export const useCreateListing = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: CreateListingRequest) => listingsApi.create(data),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["listings"] }),
  });
};

export const useUpdateListing = (listingId: string) => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: UpdateListingRequest) => listingsApi.update(listingId, data),
    onSuccess: () => qc.invalidateQueries({ queryKey: keys.detail(listingId) }),
  });
};

export const useUpdateAmenities = (listingId: string) => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (selectedAmenities: AmenitySelection[]) =>
      listingsApi.updateAmenities(listingId, selectedAmenities),
    onSuccess: () => qc.invalidateQueries({ queryKey: keys.detail(listingId) }),
  });
};

export const useUploadListingMedia = (listingId: string) => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (file: File) => listingsApi.uploadMedia(listingId, file),
    onSuccess: () => qc.invalidateQueries({ queryKey: keys.detail(listingId) }),
  });
};

export const usePublishListing = (listingId: string) => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: () => listingsApi.publish(listingId),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["listings"] }),
  });
};

export const useCreateNewVersion = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (sourceListingId: string) => listingsApi.newVersion(sourceListingId),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["listings"] }),
  });
};

export const useHotfixListing = (listingId: string) => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: HotfixListingRequest) => listingsApi.hotfix(listingId, data),
    onSuccess: () => qc.invalidateQueries({ queryKey: keys.detail(listingId) }),
  });
};
