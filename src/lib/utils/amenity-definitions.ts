import type { AmenityDefinition, ReferencesAll } from "@/lib/types";

type UnknownRecord = Record<string, unknown>;

function asArray<T>(value: unknown): T[] {
  if (Array.isArray(value)) return value as T[];
  if (value && typeof value === "object" && Array.isArray((value as { data?: unknown }).data)) {
    return (value as { data: T[] }).data;
  }
  return [];
}

function fromCategories(value: unknown): AmenityDefinition[] {
  const categories = asArray<{ amenities?: AmenityDefinition[] }>(value);
  return categories.flatMap((category) => asArray<AmenityDefinition>(category.amenities));
}

function fromTree(value: unknown): AmenityDefinition[] {
  const tree = asArray<{ items?: AmenityDefinition[] }>(value);
  return tree.flatMap((node) => asArray<AmenityDefinition>(node.items));
}

function isAmenityDefinition(value: unknown): value is AmenityDefinition {
  if (!value || typeof value !== "object") return false;
  const candidate = value as { id?: unknown; name?: unknown };
  const hasId = typeof candidate.id === "string" || typeof candidate.id === "number";
  const hasName = typeof candidate.name === "string";
  return hasId && hasName;
}

function sanitizeAmenities(list: AmenityDefinition[]): AmenityDefinition[] {
  return list.filter(isAmenityDefinition);
}

export function getAmenityDefinitions(references?: ReferencesAll): AmenityDefinition[] {
  if (!references) return [];

  const refs = references as unknown as UnknownRecord;
  const fromCats = sanitizeAmenities(fromCategories(refs.amenityCategories));
  if (fromCats.length > 0) return fromCats;

  const fromFlat = sanitizeAmenities(asArray<AmenityDefinition>(refs.amenities));
  if (fromFlat.length > 0) return fromFlat;

  return sanitizeAmenities(fromTree(refs.amenitiesTree));
}
