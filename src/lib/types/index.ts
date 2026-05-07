export * from "./enums";

import type {
  BookingStatus,
  ListingStatus,
  VisaType,
  Tm30Status,
  TicketType,
  TicketStatus,
  TicketKind,
  TicketPriority,
  TicketEventType,
  MessageVisibility,
  InvoiceType,
  InvoiceStatus,
  CalendarStatus,
  UtilityType,
  InviteType,
  PaymentMethod,
  AssetOccupancyStatus,
} from "./enums";

// ─── Auth ─────────────────────────────────────────────────────────────────────

export interface UserDto {
  id: string;
  email?: string;
  lineName?: string;
  firstName?: string;
  lastName?: string;
  lineUserId?: string;
  roles: string[];
}

export interface UserProfileDto {
  id: string;
  email?: string;
  lineName?: string;
  firstName?: string;
  lastName?: string;
  lineUserId?: string | null;
  roles: string[];
  phoneCountryCode?: string;
  phone?: string;
  nationality?: string;
  dateOfBirth?: string;
  passportNumber?: string;
  passportExpiry?: string;
  visaType?: VisaType | null;
  lastEntryDate?: string;
  lastEntryPort?: string;
}

export interface UpdateProfileRequest {
  firstName?: string;
  lastName?: string;
  phoneCountryCode?: string;
  phone?: string;
  nationality?: string;
  dateOfBirth?: string;
  passportNumber?: string;
  passportExpiry?: string;
  visaType?: VisaType | null;
  lastEntryDate?: string;
  lastEntryPort?: string;
}

export interface Tm30TenantRecordDto {
  bookingId: string;
  listingTitle: string;
  checkInDate: string;
  checkOutDate: string;
  status: "Pending" | "Filed";
  filedAt: string | null;
  documentUrl: string | null;
}

// ─── Assets ───────────────────────────────────────────────────────────────────

export interface AssetDto {
  id: string;
  parentAssetId?: string;
  assetTypeId: number;
  internalName: string;
  refNo: number;
  hierarchyPath?: string;
  maxOccupancy: number;
  bathrooms: number;
  bedrooms: number;
  beds: number;
  occupancyStatus: AssetOccupancyStatus;
  currentTenantName?: string;
  primaryImageUrl?: string;
  cityId?: number;
  addressLine?: Record<string, string>;
  zipCode?: string;
  exactLatitude?: number;
  exactLongitude?: number;
  fuzzyLatitude?: number;
  fuzzyLongitude?: number;
  timezone?: string;
  ownerId?: string;
}

export interface AssetMemberDto {
  userId: string;
  role: "Admin" | "Landlord";
  firstName?: string;
  lastName?: string;
  email?: string;
  lineName?: string;
}

export interface AssetSummaryDto {
  assetId: string;
  assetName: string;
  totalRevenue: number;
  totalExpenses: number;
  netProfit: number;
  currentTenantName?: string;
  leaseEnd?: string;
}

// ─── Listings ─────────────────────────────────────────────────────────────────

export interface ListingMediaDto {
  id: string;
  url: string;
  sortOrder: number;
  caption?: string;
}

export type AmenityId = string | number;

export interface AmenityDto {
  amenityId: AmenityId;
  name: string;
  isPresent: boolean;
}

export interface DiscountTier {
  minMonths: number;
  discountPercent: number;
}

export interface ListingDto {
  id: string;
  assetId: string;
  title: string;
  description: string;
  basePrice: number;        // nightly rate (ShortTerm) or legacy
  baseMonthlyRate?: number; // monthly rate (LongTerm)
  depositAmount: number;    // security deposit, default 0
  discountTiers?: DiscountTier[];
  wifiName?: string;
  wifiPassword?: string;
  houseRules?: string;
  rentalType?: string;
  status: ListingStatus;
  startDate?: string | null;
  endDate?: string | null;
  publishedAt?: string;
  supersededByListingId?: string;
  isEditable: boolean;
  media: ListingMediaDto[];
  amenities: AmenityDto[];
}

export interface CalendarDayDto {
  date: string;
  price: number;
  status: CalendarStatus;
}

// ─── Bookings ─────────────────────────────────────────────────────────────────

export interface BookingDto {
  id: string;
  assetId: string;
  listingId: string;
  tenantId?: string;
  checkInDate: string;
  checkOutDate: string;
  rentAmount: number;
  depositAmount: number;
  status: BookingStatus;
  hasContract: boolean;
  contractUrl?: string;
  tenantName?: string;
  assetName?: string;
  listingTitle?: string;
  primaryImageUrl?: string;
  daysRemaining?: number;
}

export interface Tm30FilingDto {
  id: string;
  bookingId: string;
  status: Tm30Status;
  filedAt?: string;
  documentUrl?: string;
}

export interface BookingGuestDto {
  id: string;
  bookingId: string;
  userId?: string;
  isMainTenant: boolean;
  firstName?: string;
  lastName?: string;
  dateOfBirth?: string;
  nationality?: string;
  passportNumber?: string;
  passportExpiry?: string;
  visaType?: VisaType;
  entryDate?: string;
  entryPort?: string;
}

// ─── Tickets ──────────────────────────────────────────────────────────────────

export interface TicketDto {
  id: string;
  displayId: string;
  assetId: string;
  assetName?: string;
  creatorId?: string;
  bookingId?: string;
  parentTicketId?: string;
  assigneeId?: string;
  title: string;
  description: string;
  type: TicketType;
  status: TicketStatus;
  kind: TicketKind;
  priority: TicketPriority;
  estimatedCost: number;
  actualCost?: number;
  scheduledFor?: string;
  dueDate?: string;
  completedAt?: string;
  createdAt: string;
  detailsJson?: string;
  mediaUrls: string[];
  childrenCount: number;
}

export interface ChecklistItemDto {
  id: string;
  title: string;
  done: boolean;
  doneAt?: string;
  doneBy?: string;
  photoUrl?: string;
}

export interface TicketSummaryDto {
  id: string;
  displayId: string;
  title: string;
  kind: TicketKind;
  status: TicketStatus;
}

export interface TicketEventDto {
  id: string;
  ticketId: string;
  actorId?: string;
  eventType: TicketEventType;
  fromValue?: string;
  toValue?: string;
  comment?: string;
  createdAt: string;
}

export interface TicketMessageAttachmentDto {
  id: string;
  url: string;
  fileName?: string;
}

export interface TicketMessageDto {
  id: string;
  ticketId: string;
  authorId: string;
  authorName?: string;
  body: string;
  visibility: MessageVisibility;
  replyToMessageId?: string;
  createdAt: string;
  attachments: TicketMessageAttachmentDto[];
}

export interface TicketDetailsDto extends TicketDto {
  events: TicketEventDto[];
  messages: TicketMessageDto[];
  children: TicketSummaryDto[];
  allowedNextStatuses: TicketStatus[];
  checklistItems?: ChecklistItemDto[];
}

// ─── Finance ──────────────────────────────────────────────────────────────────

export interface InvoiceDto {
  id: string;
  type: InvoiceType;
  status: InvoiceStatus;
  amount?: number;
  dueDate?: string;
  bookingId?: string;
  ticketId?: string;
  description?: string;
}

export interface FinanceCategoryDto {
  category: string;
  amount: number;
}

export interface FinanceSummaryDto {
  totalRevenue: number;
  totalExpenses: number;
  netProfit: number;
  revenueByType: FinanceCategoryDto[];
  expensesByType: FinanceCategoryDto[];
}

export interface LandlordOverviewDto {
  currentMonthIncome: number;
  previousMonthIncome: number;
  changePercent: number;
  projectedEndOfMonth: number;
  currency: string;
}

export interface CashOnHandResponse {
  amount: number;
  currency: string;
}

export interface ExpenseCategoryDto {
  category: string;
  value: number;
  percentage: number;
}

export interface UnitPerformanceDto {
  property: string;
  tenant?: string;
  revenue: number;
  expenses: number;
  net: number;
}

export interface AssetAnalyticsDto {
  assetId: string;
  assetName: string;
  bookingId?: string;
  profit: number;
  profitYear: number;
  roi: number;
  revenue: number;
  expenses: number;
  expenseStructure: ExpenseCategoryDto[];
  unitPerformance: UnitPerformanceDto[];
}

// ─── Invites ──────────────────────────────────────────────────────────────────

export interface InviteResponseDto {
  token: string;
  link: string;
  expiresAt: string;
}

// ─── Utilities ────────────────────────────────────────────────────────────────

export interface UtilityContractDto {
  id: string;
  assetId: string;
  utilityType: UtilityType;
  providerName: string;
  accountNumber: string;
}

// ─── References ───────────────────────────────────────────────────────────────

export interface AmenityDefinition {
  id: AmenityId;
  name: string;
  categoryId: AmenityId;
  icon?: string;
}

export interface AmenityCategory {
  id: number;
  name: string;
  amenities: AmenityDefinition[];
}

export interface ReferenceItem {
  id: number;
  name: Record<string, string> | string;
  code?: string;
}

export interface ReferencesAll {
  unitTypes: ReferenceItem[];
  propertyCategories: ReferenceItem[];
  roomSegments: ReferenceItem[];
  amenities?: AmenityDefinition[];
  amenityCategories?: AmenityCategory[];
}

// ─── Request types ────────────────────────────────────────────────────────────

export interface CreateTicketRequest {
  assetId: string;
  bookingId?: string;
  title: string;
  description: string;
  type: TicketType;
  kind?: TicketKind;
  priority?: TicketPriority;
  estimatedCost: number;
  assigneeId?: string;
  parentTicketId?: string;
  scheduledFor?: string;
  dueDate?: string;
}

export interface PostTicketMessageRequest {
  body: string;
  visibility: MessageVisibility;
  replyToMessageId?: string;
}

export interface SpawnChildTicketRequest {
  kind: TicketKind;
  title: string;
  description: string;
  type: TicketType;
  priority?: TicketPriority;
  estimatedCost: number;
  assigneeId?: string;
  scheduledFor?: string;
  dueDate?: string;
}

export interface CreateBookingRequest {
  assetId?: string;
  listingId?: string;
  checkInDate: string;
  checkOutDate: string;
  depositAmount: number;
}

export interface CreateAssetRequest {
  internalName: string;
  assetTypeId: number;
  maxOccupancy: number;
  bathrooms: number;
  bedrooms: number;
  beds: number;
  parentAssetId?: string;
}

export interface UpdateLocationRequest {
  assetId: string;
  cityId: number;
  streetAddress: string;
  latitude: number;
  longitude: number;
  timezone?: string;
}

export interface CreateListingRequest {
  assetId: string;
  title: string;
  description: string;
  houseRules: string;
  wifiName: string;
  wifiPassword: string;
  propertyCategoryId: number;
  instantBookEnabled: boolean;
  basePrice: number;
  baseMonthlyRate?: number;
  depositAmount?: number;
  rentalType?: string;
  startDate?: string;
  endDate?: string;
}

export interface GenerateInviteRequest {
  entityId: string;
  type: InviteType;
  guestId?: string;
}

export interface RegisterPaymentRequest {
  method: PaymentMethod;
  amount: number;
}

export interface CreateInvoiceRequest {
  assetId: string;
  bookingId?: string;
  ticketId?: string;
  amount: number;
  dueDate?: string;
  type: InvoiceType;
  description?: string;
}

export interface AddGuestRequest {
  firstName?: string;
  lastName?: string;
  dateOfBirth?: string;
  nationality?: string;
  passportNumber?: string;
  passportExpiry?: string;
  visaType?: VisaType;
  entryDate?: string;
  entryPort?: string;
}

export interface UpsertPassportRequest {
  firstName?: string;
  lastName?: string;
  dateOfBirth?: string;
  nationality?: string;
  passportNumber?: string;
  passportExpiry?: string;
  visaType?: VisaType;
  entryDate?: string;
  entryPort?: string;
}

export interface CreateUtilityContractRequest {
  assetId: string;
  utilityType: UtilityType;
  providerName: string;
  accountNumber: string;
}
