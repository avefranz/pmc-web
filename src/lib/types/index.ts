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

export type ContactChannel = "Call" | "Sms" | "WhatsApp" | "Telegram" | "Line" | "WeChat";

export interface LandlordContact {
  phoneCountryCode: string;
  phone: string;
  contactChannels: ContactChannel[];
  lineHandle?: string | null;
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
  // Landlord payment details
  promptPayId?: string | null;
  bankName?: string | null;
  bankAccountNumber?: string | null;
  bankAccountName?: string | null;
  // Landlord contact channels
  contactChannels?: ContactChannel[];
  lineHandle?: string | null;
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
  // Landlord payment details
  promptPayId?: string;
  bankName?: string;
  bankAccountNumber?: string;
  bankAccountName?: string;
  // Landlord contact channels
  contactChannels?: ContactChannel[] | null;
  lineHandle?: string | null;
}

// ─── Payment ──────────────────────────────────────────────────────────────────

export type PaymentRecordStatus = "Pending" | "Paid";
export type PaymentRecordType = "Deposit" | "MonthlyRent" | "EarlyExitPenalty";

export interface PaymentRecordDto {
  id: string;
  type: PaymentRecordType;
  monthIndex: number | null;
  amount: number;
  status: PaymentRecordStatus;
  dueDate: string | null;
  paidAt: string | null;
}

export interface PaymentInstructionsDto {
  bookingId: string;
  totalDue: number;
  promptPayId: string | null;
  bankName: string | null;
  bankAccountNumber: string | null;
  bankAccountName: string | null;
  payments: PaymentRecordDto[];
  isFullyPaid: boolean;
  /** False when landlord hasn't set up payment details yet. */
  isLandlordReady: boolean;
  /** Human-readable reasons why isLandlordReady is false. */
  notReadyReasons: string[];
}

// ─── Deposit settlement ──────────────────────────────────────────────────────

export type DepositSettlementStatus =
  | "Pending"        // checkout window is open, host hasn't acted yet
  | "FullReturn"     // host confirmed full refund
  | "PartialHold"    // host wants to withhold part of deposit — tenant must accept/dispute
  | "Disputed"       // tenant disputed the partial hold, escalated to support
  | "PendingRefund"  // settlement decided, landlord must transfer refundAmount to tenant
  | "Released";      // funds settled (final state)

export interface DepositSettlementDto {
  id: string;
  bookingId: string;
  status: DepositSettlementStatus;
  totalDeposit: number;
  /** Amount the host wants to withhold (0 = full return). */
  holdAmount: number;
  /** Amount returned to tenant = totalDeposit - holdAmount. */
  returnAmount: number;
  /** Required when holdAmount > 0. */
  holdReason?: string | null;
  /** Photos uploaded by host as evidence. */
  photoUrls?: string[];
  /** Deadline by which tenant must respond to a partial hold. */
  tenantResponseDeadline?: string | null;
  hostActionAt?: string | null;
  tenantResponseAt?: string | null;
  /** Tenant's reason for disputing. */
  disputeReason?: string | null;
  /** Amount landlord must physically transfer to tenant (present when status = PendingRefund or Released). */
  refundAmount?: number | null;
  /** Bank reference / slip link provided by landlord when confirming the transfer. */
  refundReference?: string | null;
  /** When the landlord confirmed the refund transfer. */
  refundConfirmedAt?: string | null;
  createdAt: string;
}

// ─── Cancellation ─────────────────────────────────────────────────────────────

export type CancellationStatus = "Requested" | "Confirmed" | "Processed" | "Declined" | "Expired" | "Withdrawn";

export type CancellationInitiator = "Tenant" | "Landlord";

/**
 * Reason for cancellation. Drives financial treatment and cure rights:
 *  - TenantEarlyExit  → tenant pays 1-month penalty
 *  - NonPayment       → deposit applied to outstanding rent, tenant has 7-day cure window
 *  - Breach           → host claims damages from deposit, subject to dispute
 *  - MutualAgreement  → no penalties, full deposit refund
 */
export type CancellationReason = "TenantEarlyExit" | "NonPayment" | "Breach" | "MutualAgreement";

export interface BookingCancellationDto {
  id: string;
  bookingId: string;
  /** Who initiated the cancellation. Defaults to "Tenant" when missing (legacy data). */
  initiator?: CancellationInitiator;
  /** Reason for the cancellation; legacy records may not have it. */
  reason?: CancellationReason;
  earliestExitDate: string;
  monthlyRent: number;
  penaltyAmount: number;
  depositRefundAmount: number;
  netRefund: number;
  /** Amount the tenant must pay to cure a NonPayment termination (outstanding rent). */
  outstandingAmount?: number;
  status: CancellationStatus;
  tenantNote: string | null;
  /** Note from the cancellation initiator (host's reason for landlord-initiated). */
  initiatorNote?: string | null;
  /** Reason supplied by the responder when declining the request. */
  declineReason?: string | null;
  /** Deadline for the responder to confirm/decline. Derived from createdAt + 72h client-side if absent. */
  expiresAt?: string | null;
  /** Deadline by which tenant must cure a NonPayment termination (default: createdAt + 7d). */
  cureDeadline?: string | null;
  /** Deadline by which tenant may dispute a Breach termination through support. Null for other reasons. */
  disputeDeadline?: string | null;
  landlordConfirmedAt: string | null;
  declinedAt?: string | null;
  createdAt: string;
}

export interface Tm30TenantRecordDto {
  bookingId: string;
  listingTitle: string;
  checkInDate: string;
  checkOutDate: string;
  status: "Pending" | "Filed";
  filedAt: string | null;
  documentUrl: string | null;
  /**
   * Deadline by which the host must file the TM-30 with Thai immigration.
   * Server-computed as max(checkIn, entryDate) + 24h. Null only on legacy records.
   */
  filingDeadline?: string | null;
}

// ─── Assets ───────────────────────────────────────────────────────────────────

export type BuildingType = "Highrise" | "Lowrise" | "Landed" | "Other";
export type FurnishedType = "Fully" | "Semi" | "Unfurnished";

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
  unitNumber?: string | null;
  legalAddress?: string | null;
  googleMapsUrl?: string | null;
  // Physical characteristics
  floor?: number | null;
  totalFloors?: number | null;
  areaSqm?: number | null;
  buildingType?: BuildingType | null;
  furnished?: FurnishedType | null;
  // Parking
  parkingSpaces?: number;
  parkingIncluded?: boolean;
  // Lease terms
  minLeaseMonths?: number | null;
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

export type CheckInMethod = "KeyHandover" | "Smartlock" | "Keybox" | "Reception" | "Other";

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
  // Check-in
  checkInMethod?: CheckInMethod | null;
  checkInInstructions?: string | null;
  // Utilities included in rent
  utilityElectricity?: boolean;
  utilityWater?: boolean;
  utilityInternet?: boolean;
  utilityAircon?: boolean;
  utilityGarbage?: boolean;
  // Pets
  petsAllowed?: boolean;
  petDeposit?: number;
  // Cancellation policy
  cancellationNoticeDays?: number;
  cancellationPenaltyMonths?: number;
  // Safety disclosures
  hasSmokeDetector?: boolean;
  hasCODetector?: boolean;
  hasFireExtinguisher?: boolean;
  hasFirstAidKit?: boolean;
  hasSecurityCamera?: boolean;
  // Location context
  transportInfo?: string | null;
  nearbyPlaces?: string | null;
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
  landlordContact?: LandlordContact | null;
  /**
   * Critical listing fields that the host changed AFTER the tenant's lastSeenListingAt.
   * Short keys: "wifi", "houseRules", "checkInInstructions". Empty array when the
   * tenant hasn't opened the booking yet (so first-time viewers don't see ghost diffs).
   */
  listingChangesAfter?: string[];
  /** Set when booking expired because tenant checked in but didn't pay within the window. */
  noShowAt?: string | null;
  /** ID of the booking this was renewed from (present on renewal bookings). */
  renewedFromBookingId?: string | null;
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
  gender?: "M" | "F";
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
  /** MIME type from upload; used to reliably distinguish images from other files. */
  contentType?: string;
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
  monthIndex?: number | null;
  bookingId?: string;
  ticketId?: string;
  description?: string;
  /** Batch identifier for auto-generated invoices, e.g. "utilities-2026-05". */
  generationBatch?: string | null;
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
  /** Monthly estimated cost in THB; used by the auto-invoice generator. */
  monthlyEstimate?: number | null;
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

export interface UpdateAssetRequest {
  internalName?: string;
  maxOccupancy?: number;
  bathrooms?: number;
  bedrooms?: number;
  beds?: number;
  // Physical characteristics
  floor?: number | null;
  totalFloors?: number | null;
  areaSqm?: number | null;
  buildingType?: BuildingType | null;
  furnished?: FurnishedType | null;
  // Parking
  parkingSpaces?: number;
  parkingIncluded?: boolean;
  // Lease terms
  minLeaseMonths?: number | null;
}

export interface UpdateLocationRequest {
  assetId: string;
  cityId: number;
  streetAddress: string;
  unitNumber?: string;
  zipCode?: string;
  latitude: number;
  longitude: number;
  timezone?: string;
  legalAddress?: string;
  googleMapsUrl?: string;
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
  checkInMethod?: string | null;
  checkInInstructions?: string | null;
  utilityElectricity?: boolean;
  utilityWater?: boolean;
  utilityInternet?: boolean;
  utilityAircon?: boolean;
  utilityGarbage?: boolean;
  petsAllowed?: boolean;
  petDeposit?: number;
  cancellationNoticeDays?: number;
  cancellationPenaltyMonths?: number;
}

export interface GenerateInviteRequest {
  entityId: string;
  type: InviteType;
  guestId?: string;
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
  gender?: "M" | "F";
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
  gender?: "M" | "F";
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
  monthlyEstimate?: number | null;
}

// ─── Contract ─────────────────────────────────────────────────────────────────

export type ContractStatus = 'PendingTenantSignature' | 'PendingLandlordSignature' | 'FullySigned' | 'Voided';

export interface ContractDto {
  id: string;
  bookingId: string;
  status: ContractStatus;
  propertyAddress: string;
  startDate: string;
  endDate: string;
  totalRent: number;
  monthlyRate: number;
  depositAmount: number;
  durationMonths: number;
  tenantFullName: string;
  tenantEmail: string;
  tenantPassportNumber?: string;
  landlordFullName: string;
  landlordEmail: string;
  landlordSigningCapacity?: string;
  landlordCompanyName?: string;
  draftPdfUrl?: string;
  finalPdfUrl?: string;
  finalPdfSha256?: string;
  tenantSignedAt?: string;
  tenantTypedName?: string;
  tenantSignatureImageUrl?: string;
  landlordSignedAt?: string;
  landlordTypedName?: string;
  landlordSignatureImageUrl?: string;
  finalizedAt?: string;
  /**
   * Deadline by which the contract must be fully signed before the booking auto-expires.
   * Backend should set this when the contract is created (typically createdAt + 72h).
   * If absent, frontend falls back to createdAt + 72h.
   */
  signingDeadline?: string;
  createdAt: string;
}

/**
 * Compute the effective contract signing deadline. Falls back to createdAt + 72h.
 */
export function contractSigningDeadline(c: Pick<ContractDto, "signingDeadline" | "createdAt">): string {
  if (c.signingDeadline) return c.signingDeadline;
  return new Date(new Date(c.createdAt).getTime() + 72 * 3600_000).toISOString();
}
