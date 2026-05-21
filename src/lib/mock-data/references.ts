import type { AmenityDefinition, ReferencesAll } from "@/lib/types";

// ─── Amenities ────────────────────────────────────────────────────────────────
// IDs match the AMENITY_PRIORITY list in listings-page.tsx

export const MOCK_AMENITIES: AmenityDefinition[] = [
  { id: 1,  categoryId: 5, name: "Essentials"           },
  { id: 2,  categoryId: 1, name: "Wi-Fi"                },
  { id: 3,  categoryId: 1, name: "Dedicated workspace"  },
  { id: 4,  categoryId: 2, name: "Kitchen"              },
  { id: 5,  categoryId: 2, name: "Refrigerator"         },
  { id: 6,  categoryId: 2, name: "Microwave"            },
  { id: 7,  categoryId: 2, name: "Dishwasher"           },
  { id: 8,  categoryId: 2, name: "Coffee maker"         },
  { id: 9,  categoryId: 3, name: "Air conditioning"     },
  { id: 10, categoryId: 3, name: "Heating"              },
  { id: 11, categoryId: 4, name: "Washer"               },
  { id: 12, categoryId: 4, name: "Dryer"                },
  { id: 13, categoryId: 4, name: "Iron"                 },
  { id: 14, categoryId: 5, name: "Hangers"              },
  { id: 15, categoryId: 5, name: "Hair dryer"           },
  { id: 16, categoryId: 5, name: "Shampoo"              },
  { id: 17, categoryId: 5, name: "Hot water"            },
  { id: 18, categoryId: 1, name: "TV"                   },
  { id: 19, categoryId: 6, name: "Smoke alarm"          },
  { id: 20, categoryId: 6, name: "Carbon monoxide alarm"},
  { id: 21, categoryId: 6, name: "Fire extinguisher"    },
  { id: 22, categoryId: 6, name: "First aid kit"        },
  { id: 23, categoryId: 7, name: "Pool"                 },
  { id: 24, categoryId: 7, name: "Patio or balcony"     },
  { id: 25, categoryId: 7, name: "BBQ grill"            },
  { id: 26, categoryId: 7, name: "Free parking"         },
  { id: 27, categoryId: 7, name: "EV charger"           },
  { id: 28, categoryId: 2, name: "Oven"                 },
  { id: 29, categoryId: 2, name: "Stove"                },
  { id: 30, categoryId: 7, name: "Gym"                  },
  { id: 31, categoryId: 7, name: "Pet-friendly"         },
];

export const MOCK_REFERENCES_ALL: ReferencesAll = {
  unitTypes:          [],
  propertyCategories: [
    { id: 1, name: "Apartment"  },
    { id: 2, name: "House"      },
    { id: 3, name: "Villa"      },
    { id: 4, name: "Townhouse"  },
    { id: 5, name: "Loft"       },
    { id: 6, name: "Condo"      },
  ],
  roomSegments: [],
  amenities: MOCK_AMENITIES,
  amenityCategories: [
    { id: 1, name: "Tech & connectivity", amenities: [] },
    { id: 2, name: "Kitchen & dining",    amenities: [] },
    { id: 3, name: "Climate",             amenities: [] },
    { id: 4, name: "Laundry",             amenities: [] },
    { id: 5, name: "Bathroom & basics",   amenities: [] },
    { id: 6, name: "Safety",              amenities: [] },
    { id: 7, name: "Outdoor & extras",    amenities: [] },
  ],
};
