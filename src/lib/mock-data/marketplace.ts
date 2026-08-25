import type {
  MarketplaceCityDto,
  MarketplaceListingPreviewDto,
  MarketplaceListingDto,
  ListingAvailabilityDto,
  PagedResult,
  MarketplaceListingsQuery,
} from "@/lib/types/marketplace";

// ─── Cities ──────────────────────────────────────────────────────────────────

export const MOCK_CITIES: MarketplaceCityDto[] = [
  { id: 1, code: "BKK", name: { en: "Bangkok",    th: "กรุงเทพฯ"  }, latitude: 13.7563,  longitude: 100.5018, activeListingsCount: 45 },
  { id: 2, code: "CNX", name: { en: "Chiang Mai", th: "เชียงใหม่" }, latitude: 18.7883,  longitude:  98.9853, activeListingsCount: 32 },
  { id: 3, code: "HKT", name: { en: "Phuket",     th: "ภูเก็ต"   }, latitude:  7.9519,  longitude:  98.3381, activeListingsCount: 28 },
  { id: 4, code: "PTY", name: { en: "Pattaya",    th: "พัทยา"    }, latitude: 12.9236,  longitude: 100.8825, activeListingsCount: 18 },
  { id: 5, code: "KSM", name: { en: "Koh Samui",  th: "เกาะสมุย" }, latitude:  9.5120,  longitude: 100.0136, activeListingsCount: 12 },
  { id: 6, code: "HHN", name: { en: "Hua Hin",    th: "หัวหิน"   }, latitude: 12.5688,  longitude:  99.9580, activeListingsCount: 8  },
];

// ─── Listing previews ─────────────────────────────────────────────────────────

export const MOCK_LISTINGS: MarketplaceListingPreviewDto[] = [
  // ── Bangkok ──
  {
    id: "bkk-01-sukhumvit-condo",
    title: "Modern 1BR Condo — Sukhumvit 11",
    slug: "modern-1br-condo-sukhumvit-11",
    monthlyRate: 28000,
    discountTiers: [
      { minMonths: 3, discountPercent: 5 },
      { minMonths: 6, discountPercent: 10 },
    ],
    bedrooms: 1, bathrooms: 1, beds: 1, maxOccupancy: 2,
    propertyCategoryId: 6,   // Condo
    cityId: 1, cityName: "Bangkok",
    fuzzyLatitude: 13.7435, fuzzyLongitude: 100.5567,
    locationAccuracy: "Neighborhood",
    startDate: "2025-06-01", endDate: null,
    coverImageUrl: "https://images.unsplash.com/photo-1522708323590-d24dbb6b0267?auto=format&fit=crop&w=800&h=600&q=80",
    amenityIds: [2, 9, 4, 23, 30, 26, 3, 18],
  },
  {
    id: "bkk-02-sathorn-luxury",
    title: "Luxury 2BR — Sathorn, City View",
    slug: "luxury-2br-sathorn-city-view",
    monthlyRate: 52000,
    discountTiers: [
      { minMonths: 3, discountPercent: 7 },
      { minMonths: 6, discountPercent: 12 },
      { minMonths: 12, discountPercent: 18 },
    ],
    bedrooms: 2, bathrooms: 2, beds: 2, maxOccupancy: 4,
    propertyCategoryId: 6,
    cityId: 1, cityName: "Bangkok",
    fuzzyLatitude: 13.7243, fuzzyLongitude: 100.5251,
    locationAccuracy: "Neighborhood",
    startDate: "2025-05-15", endDate: null,
    coverImageUrl: "https://images.unsplash.com/photo-1600596542815-ffad4c1539a9?auto=format&fit=crop&w=800&h=600&q=80",
    amenityIds: [2, 9, 4, 23, 30, 26, 3, 18, 24, 11, 5],
  },
  {
    id: "bkk-03-asoke-studio",
    title: "Bright Studio — Asoke BTS",
    slug: "bright-studio-asoke-bts",
    monthlyRate: 18500,
    discountTiers: [],
    bedrooms: 0, bathrooms: 1, beds: 1, maxOccupancy: 2,
    propertyCategoryId: 1,   // Apartment
    cityId: 1, cityName: "Bangkok",
    fuzzyLatitude: 13.7376, fuzzyLongitude: 100.5612,
    locationAccuracy: "Neighborhood",
    startDate: "2025-06-15", endDate: null,
    coverImageUrl: "https://images.unsplash.com/photo-1558618666-fcd25c85cd64?auto=format&fit=crop&w=800&h=600&q=80",
    amenityIds: [2, 9, 4, 18, 11],
  },
  {
    id: "bkk-04-silom-townhouse",
    title: "3BR Townhouse — Silom, Private Garden",
    slug: "3br-townhouse-silom-garden",
    monthlyRate: 68000,
    discountTiers: [
      { minMonths: 6, discountPercent: 8 },
      { minMonths: 12, discountPercent: 15 },
    ],
    bedrooms: 3, bathrooms: 3, beds: 4, maxOccupancy: 6,
    propertyCategoryId: 4,   // Townhouse
    cityId: 1, cityName: "Bangkok",
    fuzzyLatitude: 13.7210, fuzzyLongitude: 100.5240,
    locationAccuracy: "Neighborhood",
    startDate: "2025-07-01", endDate: null,
    coverImageUrl: "https://images.unsplash.com/photo-1600585154340-be6161a56a0c?auto=format&fit=crop&w=800&h=600&q=80",
    amenityIds: [2, 9, 4, 26, 31, 3, 18, 11, 24, 5, 6, 25],
  },

  // ── Chiang Mai ──
  {
    id: "cnx-01-nimman-studio",
    title: "Cozy Studio — Nimmanhaemin",
    slug: "cozy-studio-nimmanhaemin",
    monthlyRate: 11500,
    discountTiers: [
      { minMonths: 3, discountPercent: 5 },
    ],
    bedrooms: 0, bathrooms: 1, beds: 1, maxOccupancy: 2,
    propertyCategoryId: 1,
    cityId: 2, cityName: "Chiang Mai",
    fuzzyLatitude: 18.8026, fuzzyLongitude: 98.9680,
    locationAccuracy: "Neighborhood",
    startDate: "2025-06-01", endDate: null,
    coverImageUrl: "https://images.unsplash.com/photo-1493809842364-78817add7ffb?auto=format&fit=crop&w=800&h=600&q=80",
    amenityIds: [2, 9, 4, 3, 26, 11],
  },
  {
    id: "cnx-02-old-city-apt",
    title: "2BR Apartment — Old City",
    slug: "2br-apartment-old-city-chiang-mai",
    monthlyRate: 16000,
    discountTiers: [
      { minMonths: 3, discountPercent: 6 },
      { minMonths: 6, discountPercent: 11 },
    ],
    bedrooms: 2, bathrooms: 1, beds: 2, maxOccupancy: 4,
    propertyCategoryId: 1,
    cityId: 2, cityName: "Chiang Mai",
    fuzzyLatitude: 18.7889, fuzzyLongitude: 98.9938,
    locationAccuracy: "Neighborhood",
    startDate: "2025-05-20", endDate: null,
    coverImageUrl: "https://images.unsplash.com/photo-1502672260266-1c1ef2d93688?auto=format&fit=crop&w=800&h=600&q=80",
    amenityIds: [2, 9, 4, 3, 26, 11, 24, 31],
  },
  {
    id: "cnx-03-hill-view",
    title: "1BR with Hill View — Hang Dong",
    slug: "1br-hill-view-hang-dong",
    monthlyRate: 9500,
    discountTiers: [],
    bedrooms: 1, bathrooms: 1, beds: 1, maxOccupancy: 2,
    propertyCategoryId: 1,
    cityId: 2, cityName: "Chiang Mai",
    fuzzyLatitude: 18.7233, fuzzyLongitude: 98.9380,
    locationAccuracy: "Neighborhood",
    startDate: "2025-06-01", endDate: null,
    coverImageUrl: "https://images.unsplash.com/photo-1505691938895-1758d7feb511?auto=format&fit=crop&w=800&h=600&q=80",
    amenityIds: [2, 9, 4, 26, 31, 24],
  },

  // ── Phuket ──
  {
    id: "hkt-01-patong-pool-villa",
    title: "3BR Private Pool Villa — Patong",
    slug: "3br-private-pool-villa-patong",
    monthlyRate: 95000,
    discountTiers: [
      { minMonths: 3, discountPercent: 10 },
      { minMonths: 6, discountPercent: 18 },
    ],
    bedrooms: 3, bathrooms: 3, beds: 4, maxOccupancy: 6,
    propertyCategoryId: 3,   // Villa
    cityId: 3, cityName: "Phuket",
    fuzzyLatitude: 7.9047,  fuzzyLongitude: 98.2962,
    locationAccuracy: "Neighborhood",
    startDate: "2025-06-01", endDate: null,
    coverImageUrl: "https://images.unsplash.com/photo-1564013799919-ab600027ffc6?auto=format&fit=crop&w=800&h=600&q=80",
    amenityIds: [2, 9, 4, 23, 26, 30, 3, 18, 24, 11, 5, 25, 31],
  },
  {
    id: "hkt-02-kata-house",
    title: "Tropical House with Pool — Kata",
    slug: "tropical-house-with-pool-kata",
    monthlyRate: 45000,
    discountTiers: [
      { minMonths: 3, discountPercent: 8 },
      { minMonths: 6, discountPercent: 15 },
    ],
    bedrooms: 3, bathrooms: 2, beds: 3, maxOccupancy: 6,
    propertyCategoryId: 2,   // House
    cityId: 3, cityName: "Phuket",
    fuzzyLatitude: 7.8195,  fuzzyLongitude: 98.2993,
    locationAccuracy: "Neighborhood",
    startDate: "2025-05-15", endDate: null,
    coverImageUrl: "https://images.unsplash.com/photo-1571896349842-33c89424de2d?auto=format&fit=crop&w=800&h=600&q=80",
    amenityIds: [2, 9, 4, 23, 26, 31, 24, 11, 25],
  },

  // ── Pattaya ──
  {
    id: "pty-01-pratumnak-seaview",
    title: "1BR Sea View Condo — Pratumnak",
    slug: "1br-sea-view-condo-pratumnak",
    monthlyRate: 18500,
    discountTiers: [
      { minMonths: 3, discountPercent: 5 },
      { minMonths: 6, discountPercent: 10 },
    ],
    bedrooms: 1, bathrooms: 1, beds: 1, maxOccupancy: 2,
    propertyCategoryId: 6,
    cityId: 4, cityName: "Pattaya",
    fuzzyLatitude: 12.9065, fuzzyLongitude: 100.8750,
    locationAccuracy: "Neighborhood",
    startDate: "2025-06-01", endDate: null,
    coverImageUrl: "https://images.unsplash.com/photo-1512917774080-9991f1c4c750?auto=format&fit=crop&w=800&h=600&q=80",
    amenityIds: [2, 9, 4, 23, 30, 26, 24, 18],
  },
  {
    id: "pty-02-jomtien-studio",
    title: "Affordable Studio — Jomtien Beach",
    slug: "affordable-studio-jomtien-beach",
    monthlyRate: 8500,
    discountTiers: [],
    bedrooms: 0, bathrooms: 1, beds: 1, maxOccupancy: 2,
    propertyCategoryId: 1,
    cityId: 4, cityName: "Pattaya",
    fuzzyLatitude: 12.8825, fuzzyLongitude: 100.8758,
    locationAccuracy: "Neighborhood",
    startDate: "2025-06-01", endDate: null,
    coverImageUrl: "https://images.unsplash.com/photo-1560448204-e02f11c3d0e2?auto=format&fit=crop&w=800&h=600&q=80",
    amenityIds: [2, 9, 4, 26],
  },

  // ── Koh Samui ──
  {
    id: "ksm-01-bophut-beachfront",
    title: "Beachfront Villa, 2BR — Bo Phut",
    slug: "beachfront-villa-2br-bophut",
    monthlyRate: 78000,
    discountTiers: [
      { minMonths: 3, discountPercent: 12 },
      { minMonths: 6, discountPercent: 20 },
    ],
    bedrooms: 2, bathrooms: 2, beds: 3, maxOccupancy: 4,
    propertyCategoryId: 3,
    cityId: 5, cityName: "Koh Samui",
    fuzzyLatitude: 9.5552,  fuzzyLongitude: 100.0547,
    locationAccuracy: "Neighborhood",
    startDate: "2025-06-01", endDate: null,
    coverImageUrl: "https://images.unsplash.com/photo-1540541338287-41700207dee6?auto=format&fit=crop&w=800&h=600&q=80",
    amenityIds: [2, 9, 4, 23, 26, 31, 24, 25, 18, 11],
  },

  // ── Hua Hin ──
  {
    id: "hhn-01-penthouse",
    title: "2BR Penthouse — Hua Hin Center",
    slug: "2br-penthouse-hua-hin-center",
    monthlyRate: 35000,
    discountTiers: [
      { minMonths: 6, discountPercent: 10 },
      { minMonths: 12, discountPercent: 17 },
    ],
    bedrooms: 2, bathrooms: 2, beds: 2, maxOccupancy: 4,
    propertyCategoryId: 6,
    cityId: 6, cityName: "Hua Hin",
    fuzzyLatitude: 12.5688, fuzzyLongitude: 99.9580,
    locationAccuracy: "Neighborhood",
    startDate: "2025-05-01", endDate: null,
    coverImageUrl: "https://images.unsplash.com/photo-1564013799919-ab600027ffc6?auto=format&fit=crop&w=800&h=600&q=80",
    amenityIds: [2, 9, 4, 23, 30, 26, 24, 3, 18, 11, 5],
  },
];

// ─── Random listing generator ─────────────────────────────────────────────────
// Fills the marketplace with varied, plausible cards when the backend is
// unreachable or unseeded. The pool is built ONCE at module load with a fixed
// seed, so pagination stays consistent and images do not reshuffle on re-render.

// Known-good Unsplash photos reused from the curated listings above.
const IMAGE_POOL = [
  "1522708323590-d24dbb6b0267",
  "1600596542815-ffad4c1539a9",
  "1558618666-fcd25c85cd64",
  "1600585154340-be6161a56a0c",
  "1493809842364-78817add7ffb",
  "1502672260266-1c1ef2d93688",
  "1505691938895-1758d7feb511",
  "1564013799919-ab600027ffc6",
  "1571896349842-33c89424de2d",
  "1512917774080-9991f1c4c750",
  "1560448204-e02f11c3d0e2",
  "1540541338287-41700207dee6",
].map((id) => `https://images.unsplash.com/photo-${id}?auto=format&fit=crop&w=800&h=600&q=80`);

// Neighbourhoods per cityId (keys match MOCK_CITIES ids).
const AREA_NAMES: Record<number, string[]> = {
  1: ["Sukhumvit", "Sathorn", "Silom", "Asoke", "Thonglor", "Ekkamai", "Ari", "On Nut", "Phrom Phong"],
  2: ["Nimman", "Old City", "Santitham", "Hang Dong", "Chang Klan", "Mae Rim"],
  3: ["Patong", "Kata", "Karon", "Rawai", "Kamala", "Bang Tao", "Chalong"],
  4: ["Pratumnak", "Jomtien", "Central Pattaya", "Naklua", "Wongamat"],
  5: ["Bo Phut", "Chaweng", "Lamai", "Maenam", "Bang Rak"],
  6: ["Hua Hin Center", "Khao Takiab", "Cha-am", "Black Mountain"],
};

// Property types: label + category id (matches propertyCategoryId used above).
const PROPERTY_TYPES = [
  { label: "Condo", categoryId: 6 },
  { label: "Apartment", categoryId: 1 },
  { label: "House", categoryId: 2 },
  { label: "Villa", categoryId: 3 },
  { label: "Townhouse", categoryId: 4 },
];

// Base monthly rate (THB) per cityId — multiplied by a bedroom factor below.
const CITY_BASE_RATE: Record<number, number> = {
  1: 22000, 2: 9000, 3: 30000, 4: 12000, 5: 25000, 6: 15000,
};

const AMENITY_POOL = [23, 30, 26, 3, 18, 11, 24, 5, 25, 31];

// mulberry32: tiny deterministic PRNG. Fixed seed keeps the pool reproducible.
function makeRng(seed: number) {
  return () => {
    seed |= 0;
    seed = (seed + 0x6d2b79f5) | 0;
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function slugify(text: string) {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "");
}

function generateRandomListings(count: number): MarketplaceListingPreviewDto[] {
  const rng = makeRng(20260801);
  const pick = <T,>(arr: T[]) => arr[Math.floor(rng() * arr.length)];
  const cities = MOCK_CITIES;
  const bedroomFactor = [0.7, 1.0, 1.6, 2.6, 3.6]; // index = bedrooms (0..4)
  const today = Date.now();

  return Array.from({ length: count }, (_, i) => {
    const city = pick(cities);
    const area = pick(AREA_NAMES[city.id] ?? ["Downtown"]);
    const bedrooms = Math.floor(rng() * 5); // 0..4
    // Studios lean condo/apartment; larger units can be any type.
    const type = bedrooms === 0 ? pick(PROPERTY_TYPES.slice(0, 2)) : pick(PROPERTY_TYPES);
    const bathrooms = Math.max(1, Math.min(bedrooms, 3));

    const rate = Math.round(
      ((CITY_BASE_RATE[city.id] ?? 15000) * bedroomFactor[bedrooms] * (0.85 + rng() * 0.4)) / 500,
    ) * 500;

    const title =
      bedrooms === 0
        ? `Studio ${type.label} — ${area}`
        : `${bedrooms}BR ${type.label} — ${area}`;

    // Amenities: always Wi-Fi/AC/Kitchen, plus a random subset of the pool.
    const extras = AMENITY_POOL.filter(() => rng() < 0.45);
    const amenityIds = [2, 9, 4, ...extras];

    // Optional discount tiers for longer stays.
    const discountTiers =
      rng() < 0.6
        ? [
            { minMonths: 3, discountPercent: 5 + Math.floor(rng() * 5) },
            { minMonths: 6, discountPercent: 10 + Math.floor(rng() * 8) },
          ]
        : [];

    const publishedDaysAgo = Math.floor(rng() * 60);
    const published = new Date(today - publishedDaysAgo * 86400000);
    const iso = (d: Date) => d.toISOString().slice(0, 10);

    return {
      id: `gen-${String(i + 1).padStart(2, "0")}-${slugify(`${city.code}-${area}`)}`,
      title,
      slug: slugify(title),
      monthlyRate: rate,
      discountTiers,
      bedrooms,
      bathrooms,
      beds: Math.max(1, bedrooms),
      maxOccupancy: Math.max(2, bedrooms * 2),
      propertyCategoryId: type.categoryId,
      cityId: city.id,
      cityName: city.name.en,
      fuzzyLatitude: city.latitude + (rng() - 0.5) * 0.06,
      fuzzyLongitude: city.longitude + (rng() - 0.5) * 0.06,
      locationAccuracy: "Neighborhood",
      startDate: iso(published),
      endDate: null,
      coverImageUrl: IMAGE_POOL[(i * 5 + city.id) % IMAGE_POOL.length],
      amenityIds,
      publishedAt: published.toISOString(),
    } satisfies MarketplaceListingPreviewDto;
  });
}

// Curated listings first (they have rich detail pages), then generated fillers.
const GENERATED_LISTINGS = generateRandomListings(20);
export const LISTING_POOL: MarketplaceListingPreviewDto[] = [...MOCK_LISTINGS, ...GENERATED_LISTINGS];

// ─── Full listing details ─────────────────────────────────────────────────────

const ALL_AMENITIES_TEMPLATE = [
  { amenityId: 2,  name: "Wi-Fi",                 isPresent: true  },
  { amenityId: 9,  name: "Air conditioning",      isPresent: true  },
  { amenityId: 4,  name: "Kitchen",               isPresent: true  },
  { amenityId: 23, name: "Pool",                  isPresent: false },
  { amenityId: 30, name: "Gym",                   isPresent: false },
  { amenityId: 26, name: "Free parking",          isPresent: false },
  { amenityId: 3,  name: "Dedicated workspace",   isPresent: false },
  { amenityId: 18, name: "TV",                    isPresent: false },
  { amenityId: 11, name: "Washer",                isPresent: false },
  { amenityId: 24, name: "Patio or balcony",      isPresent: false },
  { amenityId: 5,  name: "Refrigerator",          isPresent: true  },
  { amenityId: 8,  name: "Coffee maker",          isPresent: false },
  { amenityId: 17, name: "Hot water",             isPresent: true  },
  { amenityId: 1,  name: "Essentials",            isPresent: true  },
  { amenityId: 15, name: "Hair dryer",            isPresent: false },
  { amenityId: 31, name: "Pet-friendly",          isPresent: false },
  { amenityId: 25, name: "BBQ grill",             isPresent: false },
];

function amenities(presentIds: number[]) {
  return ALL_AMENITIES_TEMPLATE.map((a) => ({
    ...a,
    isPresent: presentIds.includes(a.amenityId),
  }));
}

export const MOCK_LISTING_DETAILS: Record<string, MarketplaceListingDto> = {
  "bkk-01-sukhumvit-condo": {
    ...MOCK_LISTINGS[0],
    assetId: "asset-bkk-01",
    description:
      "A beautifully furnished 1-bedroom condo on the 22nd floor of a modern high-rise in the heart of Sukhumvit. Just a 3-minute walk from BTS Nana station and steps from some of Bangkok's best restaurants and nightlife.\n\nThe unit features floor-to-ceiling windows with a stunning city view, a fully equipped kitchen, and a king-size bed. The building amenities include a rooftop infinity pool, a fully equipped gym, and a 24-hour security and concierge service.\n\nIdeal for professionals, remote workers, or expats looking for a quality long-term base in Bangkok.",
    houseRules:
      "No smoking inside the unit.\nQuiet hours after 22:00.\nPets not allowed.\nNo subletting.\nCoordinate key handover with Siamo at least 24 hours before move-in.",
    publishedAt: "2025-04-10T08:00:00Z",
    media: [
      { id: "m1", url: "https://images.unsplash.com/photo-1522708323590-d24dbb6b0267?auto=format&fit=crop&w=1200&h=800&q=85", sortOrder: 1, caption: "Living area with city view" },
      { id: "m2", url: "https://images.unsplash.com/photo-1560448204-e02f11c3d0e2?auto=format&fit=crop&w=1200&h=800&q=85", sortOrder: 2, caption: "Master bedroom" },
      { id: "m3", url: "https://images.unsplash.com/photo-1493809842364-78817add7ffb?auto=format&fit=crop&w=1200&h=800&q=85", sortOrder: 3, caption: "Open plan kitchen" },
      { id: "m4", url: "https://images.unsplash.com/photo-1571896349842-33c89424de2d?auto=format&fit=crop&w=1200&h=800&q=85", sortOrder: 4, caption: "Rooftop infinity pool" },
      { id: "m5", url: "https://images.unsplash.com/photo-1600596542815-ffad4c1539a9?auto=format&fit=crop&w=1200&h=800&q=85", sortOrder: 5, caption: "Building lobby" },
    ],
    amenities: amenities([2, 9, 4, 23, 30, 26, 3, 18, 5, 17, 1, 15, 8]),
  },

  "hkt-01-patong-pool-villa": {
    ...MOCK_LISTINGS[7],
    assetId: "asset-hkt-01",
    description:
      "An exceptional 3-bedroom private pool villa in a quiet residential area of Patong, just 10 minutes' drive from the beach. Surrounded by tropical gardens and designed with open-plan living in mind — perfect for families or groups seeking privacy and comfort.\n\nThe villa features a 10m private pool, outdoor sala, fully equipped Western kitchen, and three en-suite bedrooms with air conditioning and quality mattresses. High-speed fibre Wi-Fi available throughout.\n\nLong-stay guests (3+ months) receive priority pricing and a dedicated Siamo property manager on call.",
    houseRules:
      "No loud music after 22:00.\nNo parties or events without prior consent.\nPets allowed with prior approval.\nPool chemicals are refreshed weekly — do not add any substances.\nSmoking permitted in outdoor areas only.",
    publishedAt: "2025-03-20T10:00:00Z",
    media: [
      { id: "m1", url: "https://images.unsplash.com/photo-1564013799919-ab600027ffc6?auto=format&fit=crop&w=1200&h=800&q=85", sortOrder: 1, caption: "Private pool and villa exterior" },
      { id: "m2", url: "https://images.unsplash.com/photo-1600596542815-ffad4c1539a9?auto=format&fit=crop&w=1200&h=800&q=85", sortOrder: 2, caption: "Master bedroom" },
      { id: "m3", url: "https://images.unsplash.com/photo-1502672260266-1c1ef2d93688?auto=format&fit=crop&w=1200&h=800&q=85", sortOrder: 3, caption: "Living room" },
      { id: "m4", url: "https://images.unsplash.com/photo-1571896349842-33c89424de2d?auto=format&fit=crop&w=1200&h=800&q=85", sortOrder: 4, caption: "Pool at sunset" },
      { id: "m5", url: "https://images.unsplash.com/photo-1600585154340-be6161a56a0c?auto=format&fit=crop&w=1200&h=800&q=85", sortOrder: 5, caption: "Outdoor sala and dining" },
    ],
    amenities: amenities([2, 9, 4, 23, 26, 30, 3, 18, 24, 11, 5, 25, 31, 8, 17, 1, 15]),
  },

  "ksm-01-bophut-beachfront": {
    ...MOCK_LISTINGS[11],
    assetId: "asset-ksm-01",
    description:
      "Wake up to the sound of waves in this stunning beachfront 2-bedroom villa on Bo Phut beach, the quieter and more upscale side of Koh Samui. The villa sits directly on the sand — no roads between you and the sea.\n\nFeaturing a private 8m pool, two spacious en-suite bedrooms, a fully equipped kitchen, and a large sea-facing terrace perfect for sunsets. The iconic Bo Phut Fisherman's Village with its boutique restaurants and bars is a short walk away.\n\nIdeal for couples, digital nomads, or small families who want a true island lifestyle without sacrificing comfort.",
    houseRules:
      "No smoking indoors.\nQuiet hours 23:00 – 07:00.\nPets not allowed.\nPool towels provided — please don't take beach towels from the villa.\nSand must be rinsed off before re-entering the villa.",
    publishedAt: "2025-02-14T09:00:00Z",
    media: [
      { id: "m1", url: "https://images.unsplash.com/photo-1540541338287-41700207dee6?auto=format&fit=crop&w=1200&h=800&q=85", sortOrder: 1, caption: "Beachfront villa with pool" },
      { id: "m2", url: "https://images.unsplash.com/photo-1564013799919-ab600027ffc6?auto=format&fit=crop&w=1200&h=800&q=85", sortOrder: 2, caption: "Sea view from terrace" },
      { id: "m3", url: "https://images.unsplash.com/photo-1600596542815-ffad4c1539a9?auto=format&fit=crop&w=1200&h=800&q=85", sortOrder: 3, caption: "Master bedroom" },
      { id: "m4", url: "https://images.unsplash.com/photo-1502672260266-1c1ef2d93688?auto=format&fit=crop&w=1200&h=800&q=85", sortOrder: 4, caption: "Living room" },
      { id: "m5", url: "https://images.unsplash.com/photo-1571896349842-33c89424de2d?auto=format&fit=crop&w=1200&h=800&q=85", sortOrder: 5, caption: "Pool at twilight" },
    ],
    amenities: amenities([2, 9, 4, 23, 26, 31, 24, 25, 18, 11, 5, 17, 1, 15, 8]),
  },
};

// Returns a full detail DTO for any listing id: the curated one when it exists,
// otherwise a detail synthesized from the generated preview in the pool.
export function getMockListingDetail(id: string): MarketplaceListingDto | null {
  if (MOCK_LISTING_DETAILS[id]) return MOCK_LISTING_DETAILS[id];

  const preview = LISTING_POOL.find((l) => l.id === id);
  if (!preview) return null;

  const gallery = [preview.coverImageUrl, ...MOCK_LISTINGS.slice(0, 4).map((l) => l.coverImageUrl)]
    .filter((u): u is string => !!u)
    .map((url, i) => ({
      id: `m${i + 1}`,
      url: url.replace("w=800&h=600", "w=1200&h=800"),
      sortOrder: i + 1,
      caption: null,
    }));

  const bedroomLabel = preview.bedrooms === 0 ? "studio" : `${preview.bedrooms}-bedroom`;

  return {
    ...preview,
    assetId: `asset-${preview.id}`,
    description:
      `A comfortable, fully furnished ${bedroomLabel} rental in ${preview.cityName}. ` +
      `Bright, move-in ready, and well connected to the neighbourhood's cafes, transport and daily essentials.\n\n` +
      `Ideal for long-stay guests, remote workers and expats looking for a quality base in ${preview.cityName}.`,
    houseRules:
      "No smoking inside the unit.\nQuiet hours after 22:00.\nCoordinate key handover with Siamo at least 24 hours before move-in.",
    publishedAt: preview.publishedAt ?? preview.startDate,
    media: gallery,
    amenities: amenities(preview.amenityIds),
  };
}

// ─── Availability ─────────────────────────────────────────────────────────────

export function getMockAvailability(id: string): ListingAvailabilityDto {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const fmt = (d: Date) =>
    `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;

  // Some listings have an upcoming occupied block to show the timeline
  const occupiedRanges =
    id === "bkk-01-sukhumvit-condo"
      ? [
          {
            from: fmt(new Date(today.getFullYear(), today.getMonth() + 2, 1)),
            to:   fmt(new Date(today.getFullYear(), today.getMonth() + 3, 1)),
          },
        ]
      : [];

  return {
    availableFrom:    fmt(today),
    availableTo:      null,
    availableUntil:   null,
    minMonths:        1,
    maxMonths:        12,
    occupiedRanges,
    nextAvailableDate: fmt(today),
  };
}

// ─── Paginated listings helper ────────────────────────────────────────────────

export function getMockListings(params: MarketplaceListingsQuery): PagedResult<MarketplaceListingPreviewDto> {
  let items = [...LISTING_POOL];

  // Filter by cityId
  if (params.cityId !== undefined) {
    items = items.filter((l) => l.cityId === params.cityId);
  }

  // Filter by bedrooms (≥ when 3+, exact otherwise)
  if (params.bedrooms !== undefined) {
    if (params.bedrooms >= 3) {
      items = items.filter((l) => l.bedrooms >= 3);
    } else {
      items = items.filter((l) => l.bedrooms === params.bedrooms);
    }
  }

  // Filter by property category
  if (params.propertyCategoryId !== undefined) {
    items = items.filter((l) => l.propertyCategoryId === params.propertyCategoryId);
  }

  // Filter by price range
  if (params.priceMin !== undefined) {
    items = items.filter((l) => l.monthlyRate >= params.priceMin!);
  }
  if (params.priceMax !== undefined) {
    items = items.filter((l) => l.monthlyRate <= params.priceMax!);
  }

  // Filter by amenityIds (must have all)
  if (params.amenityIds?.length) {
    items = items.filter((l) =>
      params.amenityIds!.every((id) => l.amenityIds.includes(id)),
    );
  }

  // Sort
  if (params.sort === "PriceAsc") {
    items.sort((a, b) => a.monthlyRate - b.monthlyRate);
  } else if (params.sort === "PriceDesc") {
    items.sort((a, b) => b.monthlyRate - a.monthlyRate);
  } else if (params.sort === "Newest") {
    // Newest first by publish/start date (generated listings carry publishedAt).
    const when = (l: MarketplaceListingPreviewDto) =>
      new Date(l.publishedAt ?? l.startDate ?? 0).getTime();
    items.sort((a, b) => when(b) - when(a));
  }

  // Paginate
  const page     = params.page ?? 1;
  const pageSize = params.pageSize ?? 12;
  const total    = items.length;
  const start    = (page - 1) * pageSize;
  const paged    = items.slice(start, start + pageSize);

  return {
    items:           paged,
    totalCount:      total,
    page,
    pageSize,
    totalPages:      Math.ceil(total / pageSize),
    hasNextPage:     page * pageSize < total,
    hasPreviousPage: page > 1,
  };
}
