export type MarketplaceRentalType = "ShortTerm" | "LongTerm";
export type LocationAccuracy = "Exact" | "Approximate" | "Neighborhood";
export type CalendarStatus = "Available" | "Booked" | "Blocked";
export type MarketplaceSortOrder = "Newest" | "PriceAsc" | "PriceDesc";

// ─── Discount tiers ───────────────────────────────────────────────────────────
export interface DiscountTier {
  minMonths: number;
  discountPercent: number;
}

// ─── Availability (new medium-term format) ────────────────────────────────────
export interface OccupiedRange {
  from: string; // ISO date (first day of booking)
  to: string;   // ISO date (first day after booking ends)
}

export interface ListingAvailabilityDto {
  availableFrom: string;
  availableTo: string | null;      // backend field name
  availableUntil?: string | null;  // alias kept for compat
  minMonths: number;
  maxMonths: number;
  occupiedRanges: OccupiedRange[];
  nextAvailableDate: string;
}

// ─── Listing preview ──────────────────────────────────────────────────────────
export interface MarketplaceListingPreviewDto {
  id: string;
  title: string;
  slug: string;
  // new primary pricing
  monthlyRate: number;
  discountTiers: DiscountTier[];
  effectiveMonthlyRate?: number; // set by backend when durationMonths supplied
  // deprecated (kept for backward compat while backend migrates)
  rentalType?: MarketplaceRentalType;
  instantBookEnabled?: boolean;
  basePrice?: number;
  baseMonthlyRate?: number | null;
  // specs
  bedrooms: number;
  bathrooms: number;
  beds: number;
  maxOccupancy: number;
  propertyCategoryId: number;
  cityId: number;
  cityName: string;
  fuzzyLatitude: number;
  fuzzyLongitude: number;
  locationAccuracy: LocationAccuracy;
  startDate: string;
  endDate: string | null;
  coverImageUrl: string | null;
  amenityIds: number[];
}

export interface MarketplaceListingMediaDto {
  id: string;
  url: string;
  sortOrder: number;
  caption: string | null;
}

export interface MarketplaceListingAmenityDto {
  amenityId: number;
  name: string;
  isPresent: boolean;
}

export interface MarketplaceListingDto extends MarketplaceListingPreviewDto {
  assetId?: string;
  /** ID of the user who owns this listing. Used for self-booking guard (BUG-37). */
  ownerId?: string | null;
  description: string | null;
  houseRules: string | null;
  publishedAt: string;
  media: MarketplaceListingMediaDto[];
  amenities: MarketplaceListingAmenityDto[];
  // Asset specs (proxied from asset)
  areaSqm?: number | null;
  floor?: number | null;
  totalFloors?: number | null;
  buildingType?: string | null;
  furnished?: string | null;
  parkingSpaces?: number;
  parkingIncluded?: boolean;
  minLeaseMonths?: number | null;
  // Listing extras
  checkInMethod?: string | null;
  checkInInstructions?: string | null;
  utilityElectricity?: boolean;
  utilityWater?: boolean;
  utilityInternet?: boolean;
  utilityAircon?: boolean;
  utilityGarbage?: boolean;
  petsAllowed?: boolean;
  /** Host-configured security deposit (BUG-40/BE-16). */
  depositAmount?: number | null;
  petDeposit?: number;
  cancellationNoticeDays?: number;
  cancellationPenaltyMonths?: number;
  hasSmokeDetector?: boolean;
  hasCODetector?: boolean;
  hasFireExtinguisher?: boolean;
  hasFirstAidKit?: boolean;
  hasSecurityCamera?: boolean;
  transportInfo?: string | null;
  nearbyPlaces?: string | null;
  nearbyEnrichedAt?: string | null;
  wifiName?: string | null;
  googleMapsUrl?: string | null;
}

export interface MarketplaceCityDto {
  id: number;
  code: string;
  name: { en: string; ru?: string; th?: string };
  latitude: number;
  longitude: number;
  activeListingsCount: number;
}

// ─── Legacy (kept for manager calendar, not used in public marketplace) ────────
export interface CalendarDayDto {
  date: string;
  price: number;
  status: CalendarStatus;
}

// ─── Queries ──────────────────────────────────────────────────────────────────
export interface PagedResult<T> {
  items: T[];
  totalCount: number;
  page: number;
  pageSize: number;
  totalPages: number;
  hasNextPage: boolean;
  hasPreviousPage: boolean;
}

export interface MarketplaceListingsQuery {
  cityId?: number;
  // medium-term filters
  moveInFrom?: string;     // ISO date — earliest acceptable move-in
  durationMonths?: number; // how many months needed
  // price
  priceMin?: number;
  priceMax?: number;
  // specs
  bedrooms?: number;
  maxOccupancy?: number;
  propertyCategoryId?: number;
  amenityIds?: number[];
  // pagination + sort
  page?: number;
  pageSize?: number;
  sort?: MarketplaceSortOrder;
}

// ─── Booking request ──────────────────────────────────────────────────────────
export interface BookingRequestData {
  listingId: string;
  moveInDate: string;      // ISO date
  durationMonths: number;
  guestName?: string;
  guestEmail?: string;
  guestPhone?: string;
  message?: string;
  petCatsCount?: number;
  petDogsCount?: number;
  petOtherCount?: number;
}

export interface BookingRequestResult {
  id: string;
  secureToken: string;
  status: "Pending" | "Approved" | string;
  checkInDate: string;
  checkOutDate: string;
  durationMonths: number;
  totalRent: number;
  effectiveMonthlyRate: number;
  discountPercent: number;
  bookingId?: string | null;    // only when isInstantBook = true
  isInstantBook: boolean;
}
