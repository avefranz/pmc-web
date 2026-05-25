import { apiClient } from "./client";
import type { AmenityDefinition, ReferencesAll } from "../types";

// Unwrap ApiResponse<T> envelope if present
function unwrap<T>(raw: unknown): T {
  if (raw && typeof raw === "object" && !Array.isArray(raw) && "data" in (raw as object)) {
    return (raw as { data: T }).data;
  }
  return raw as T;
}

function asArray<T>(value: unknown): T[] {
  if (Array.isArray(value)) return value as T[];
  if (value && typeof value === "object" && Array.isArray((value as { data?: unknown }).data)) {
    return (value as { data: T[] }).data;
  }
  return [];
}

// Normalise the amenitiesTree shape ({ category, items }[] or { name, items }[])
// into a flat AmenityDefinition[].
function flattenTree(tree: unknown[]): AmenityDefinition[] {
  return tree.flatMap((node) => {
    if (!node || typeof node !== "object") return [];
    const n = node as Record<string, unknown>;
    // Try known shapes in order of preference
    const items =
      asArray<AmenityDefinition>(n["items"]) ||
      asArray<AmenityDefinition>((n["category"] as Record<string, unknown> | undefined)?.["amenities"]) ||
      asArray<AmenityDefinition>(n["amenities"]);
    return items;
  });
}

/** Resolves a name field that may be a plain string or a { en, ru, … } i18n map. */
function resolveName(value: unknown): string {
  if (typeof value === "string") return value;
  if (value && typeof value === "object") {
    const map = value as Record<string, unknown>;
    const pick = map["en"] ?? map["ru"] ?? Object.values(map)[0];
    if (typeof pick === "string") return pick;
  }
  return String(value ?? "");
}

export const referencesApi = {
  getAll: async (): Promise<ReferencesAll> => {
    const raw = await apiClient.get<unknown>("/api/references/all").then((r) => r.data);

    // Unwrap ApiResponse<T> envelope if present
    const base: Record<string, unknown> =
      raw && typeof raw === "object" && !Array.isArray(raw) && "data" in (raw as object)
        ? ((raw as { data: unknown }).data as Record<string, unknown>)
        : (raw as Record<string, unknown>);

    const amenityCategories = asArray<NonNullable<ReferencesAll["amenityCategories"]>[number]>(base["amenityCategories"]);
    const amenities         = asArray<AmenityDefinition>(base["amenities"]);
    const amenitiesTree     = asArray<unknown>(base["amenitiesTree"]);

    // Already has what consumers expect — return as-is
    if (amenityCategories.length > 0 || amenities.length > 0) {
      return base as unknown as ReferencesAll;
    }

    // Server returned amenitiesTree — normalise into flat amenities list
    if (amenitiesTree.length > 0) {
      const flat = flattenTree(amenitiesTree);
      return { ...(base as unknown as ReferencesAll), amenities: flat };
    }

    // /api/references/all didn't include amenities at all — fetch separately
    try {
      const amenitiesRaw = await apiClient.get<unknown>("/api/references/amenities").then((r) => r.data);
      const parsed = asArray<AmenityDefinition>(amenitiesRaw);
      if (parsed.length > 0) {
        return { ...(base as unknown as ReferencesAll), amenities: parsed };
      }
    } catch { /* ignore */ }

    // Last resort: try the tree endpoint
    try {
      const treeRaw = await apiClient.get<unknown>("/api/references/amenities/tree").then((r) => r.data);
      const flat = flattenTree(asArray<unknown>(treeRaw));
      if (flat.length > 0) {
        return { ...(base as unknown as ReferencesAll), amenities: flat };
      }
    } catch { /* ignore */ }

    // Last resort: try amenity-categories
    try {
      const catRaw = await apiClient.get<unknown>("/api/references/amenity-categories").then((r) => r.data);
      const cats = asArray<NonNullable<ReferencesAll["amenityCategories"]>[number]>(catRaw);
      if (cats.length > 0) {
        return { ...(base as unknown as ReferencesAll), amenityCategories: cats };
      }
    } catch { /* ignore */ }

    return base as unknown as ReferencesAll;
  },

  getAmenityCategories: async (): Promise<{ id: number; name: string }[]> => {
    const raw = await apiClient.get<unknown>("/api/references/amenity-categories").then((r) => r.data);
    const items = asArray<Record<string, unknown>>(unwrap<unknown>(raw));
    return items.map((item) => ({
      id: Number(item["id"]),
      name: resolveName(item["name"]),
    }));
  },

  /** All cities available for property creation — not filtered by active listings (BUG-04). */
  getCities: async (): Promise<{ id: number; code: string; name: { en: string; ru?: string; th?: string } }[]> => {
    const raw = await apiClient.get<unknown>("/api/references/cities").then((r) => r.data);
    return asArray<{ id: number; code: string; name: { en: string; ru?: string; th?: string } }>(unwrap<unknown>(raw));
  },

  getAmenities: async (): Promise<AmenityDefinition[]> => {
    const raw = await apiClient.get<unknown>("/api/references/amenities").then((r) => r.data);
    const items = asArray<Record<string, unknown>>(unwrap<unknown>(raw));
    return items.map((item) => ({
      id: Number(item["id"]),
      categoryId: Number(item["categoryId"] ?? 0),
      icon: typeof item["icon"] === "string" ? item["icon"] : undefined,
      // name may come as { en: "...", ru: "..." } — extract a usable string
      name: resolveName(item["name"]),
    }));
  },
};
