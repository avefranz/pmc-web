import { useAmenities, useAmenityCategories } from "@/lib/hooks/use-references";
import { AmenityToggleGrid } from "@/components/amenity-toggle-grid";
import type { SectionDef, SectionDialogProps } from "../types";

function AmenitiesDialog({ draft, patch }: SectionDialogProps) {
  const { data: amenities = [] } = useAmenities();
  const { data: categories = [] } = useAmenityCategories();
  const presentSet = new Set(draft.amenityIds);

  return (
    <AmenityToggleGrid
      amenities={amenities}
      categories={categories}
      presentSet={presentSet}
      pending={{}}
      onToggle={(id, isPresent) => {
        const next = new Set(draft.amenityIds);
        if (isPresent) next.delete(id);
        else next.add(id);
        patch({ amenityIds: Array.from(next) });
      }}
    />
  );
}

export const amenitiesSection: SectionDef = {
  id: "amenities",
  label: "Amenities",
  group: "included",
  required: false,
  estTime: "3 min",
  isComplete: (d) => d.amenityIds.length > 0,
  summary: (d) => (d.amenityIds.length === 0 ? "—" : `${d.amenityIds.length} amenities selected`),
  Form: AmenitiesDialog,
};
