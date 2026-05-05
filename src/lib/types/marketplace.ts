export type MarketplaceRentalType = "ShortTerm" | "LongTerm";
export type LocationAccuracy = "Exact" | "Approximate" | "Neighborhood";
export type CalendarStatus = "Available" | "Booked" | "Blocked";
export type MarketplaceSortOrder = "Newest" | "PriceAsc" | "PriceDesc";

export interface MarketplaceListingPreviewDto {
  id: string;
  title: string;
  slug: string;
  rentalType: MarketplaceRentalType;
  instantBookEnabled: boolean;
  basePrice: number;
  baseMonthlyRate: number | null;
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
  description: string | null;
  houseRules: string | null;
  publishedAt: string;
  media: MarketplaceListingMediaDto[];
  amenities: MarketplaceListingAmenityDto[];
}

export interface MarketplaceCityDto {
  id: number;
  code: string;
  name: { en: string; ru?: string; th?: string };
  latitude: number;
  longitude: number;
  activeListingsCount: number;
}

export interface CalendarDayDto {
  date: string;
  price: number;
  status: CalendarStatus;
}

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
  checkIn?: string;
  checkOut?: string;
  rentalType?: MarketplaceRentalType;
  priceMin?: number;
  priceMax?: number;
  bedrooms?: number;
  maxOccupancy?: number;
  propertyCategoryId?: number;
  amenityIds?: number[];
  page?: number;
  pageSize?: number;
  sort?: MarketplaceSortOrder;
}
