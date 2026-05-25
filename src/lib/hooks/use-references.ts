import { useQuery } from "@tanstack/react-query";
import { referencesApi } from "../api/references.api";

export const useReferences = () =>
  useQuery({
    queryKey: ["references"],
    queryFn: referencesApi.getAll,
    staleTime: Infinity,
    gcTime: Infinity,
  });

/** All cities for property creation — full list, not filtered by active listings (BUG-04). */
export const useReferenceCities = () =>
  useQuery({
    queryKey: ["references", "cities"],
    queryFn: referencesApi.getCities,
    staleTime: Infinity,
    gcTime: Infinity,
  });

/** Fetches the flat amenity definitions list directly from /api/references/amenities. */
export const useAmenities = () =>
  useQuery({
    queryKey: ["references", "amenities"],
    queryFn: referencesApi.getAmenities,
    staleTime: Infinity,
    gcTime: Infinity,
  });

/** Fetches amenity categories for grouping the amenity list. */
export const useAmenityCategories = () =>
  useQuery({
    queryKey: ["references", "amenity-categories"],
    queryFn: referencesApi.getAmenityCategories,
    staleTime: Infinity,
    gcTime: Infinity,
  });
