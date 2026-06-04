import { apiClient } from "./client";

// ── DTOs ────────────────────────────────────────────────────────────────────

export type BookingRequestStatus = "Pending" | "Approved" | "Rejected" | "Expired";

// UX-268: co-residents the tenant declared up-front in the booking modal.
// Matches BE's ResidentPreviewItem (BookingRequest.AdditionalResidents
// JSONB column). Optional — older requests pre-date the migration.
export interface AdditionalResidentDto {
  firstName: string;
  lastName: string;
  // BUG-325: no longer collected or displayed. Optional until BE drops it. @BE.
  relationship?: string;
  dateOfBirth: string;
}

export interface HostBookingRequestDto {
  id: string;
  guestName: string;
  guestEmail?: string;
  guestPhone?: string;
  message?: string;
  petCatsCount: number;
  petDogsCount: number;
  petOtherCount: number;
  petPhotoUrls: string[];
  listingTitle: string;
  listingCoverImageUrl?: string;
  moveInDate: string;       // normalized from backend's checkInDate
  moveOutDate: string;      // normalized from backend's checkOutDate
  durationMonths: number;
  monthlyRate: number;      // normalized from backend's effectiveMonthlyRate
  depositAmount?: number;   // security deposit; may be absent if backend hasn't added it yet (BE-23)
  // BUG-263/274: pet deposit billed alongside the security deposit when the
  // tenant declared pets. Absent if the listing didn't have a pet deposit
  // or the BE response hasn't surfaced it yet.
  petDeposit?: number;
  totalRent: number;
  status: BookingRequestStatus;
  rejectionReason?: string;
  additionalResidents?: AdditionalResidentDto[];
  createdAt: string;
  /** Server-computed deadline after which Pending auto-expires. */
  expiresAt?: string;
}

export interface GuestApplicationDto {
  id: string;
  listingId: string;
  listingSlug: string;
  listingTitle: string;
  listingImageUrl?: string;
  moveInDate: string;
  durationMonths: number;
  monthlyRate: number;
  depositAmount?: number;
  petCatsCount: number;
  petDogsCount: number;
  petOtherCount: number;
  petPhotoUrls: string[];
  /** BUG-368: pet deposit shown in "Reservation details" when the application
   *  carries pets — symmetric with the host request detail and booking widget. */
  petDeposit?: number;
  status: BookingRequestStatus;
  rejectionReason?: string;
  respondedAt?: string;
  createdAt: string;
  /** Server-computed deadline after which Pending auto-expires. */
  expiresAt?: string;
}

// ── Normalizer: maps backend BookingRequestSummaryDto field names → frontend DTO ──

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function normalizeHostRequest(r: any): HostBookingRequestDto {
  return {
    id:                   r.id,
    guestName:            r.guestName,
    guestEmail:           r.guestEmail,
    guestPhone:           r.guestPhone,
    message:              r.message,
    listingTitle:         r.listingTitle,
    listingCoverImageUrl: r.listingCoverImageUrl,
    // Backend sends DateOnly as "checkInDate" / "checkOutDate"
    petCatsCount:         r.petCatsCount  ?? 0,
    petDogsCount:         r.petDogsCount  ?? 0,
    petOtherCount:        r.petOtherCount ?? 0,
    moveInDate:           r.moveInDate  ?? r.checkInDate  ?? "",
    moveOutDate:          r.moveOutDate ?? r.checkOutDate ?? "",
    durationMonths:       r.durationMonths,
    // Backend sends effectiveMonthlyRate; monthlyRate is a legacy alias
    monthlyRate:          r.monthlyRate ?? r.effectiveMonthlyRate ?? 0,
    depositAmount:        r.depositAmount ?? r.securityDeposit ?? undefined,
    petDeposit:           r.petDeposit ?? r.petDepositAmount ?? undefined,
    totalRent:            r.totalRent ?? 0,
    status:               r.status,
    rejectionReason:      r.rejectionReason ?? undefined,
    petPhotoUrls:         r.petPhotoUrls ?? [],
    additionalResidents:  Array.isArray(r.additionalResidents)
      ? (r.additionalResidents as AdditionalResidentDto[])
      : undefined,
    createdAt:            r.createdAt,
    expiresAt:            r.expiresAt ?? undefined,
  };
}

// Guest-side application is the same underlying booking request; map field-name
// variants conservatively (pass through known fields, backfill petDeposit).
// eslint-disable-next-line @typescript-eslint/no-explicit-any
function normalizeGuestApplication(r: any): GuestApplicationDto {
  return {
    id:               r.id,
    listingId:        r.listingId,
    listingSlug:      r.listingSlug,
    listingTitle:     r.listingTitle,
    listingImageUrl:  r.listingImageUrl ?? r.listingCoverImageUrl ?? undefined,
    moveInDate:       r.moveInDate ?? r.checkInDate ?? "",
    durationMonths:   r.durationMonths,
    monthlyRate:      r.monthlyRate ?? r.effectiveMonthlyRate ?? 0,
    depositAmount:    r.depositAmount ?? r.securityDeposit ?? undefined,
    petCatsCount:     r.petCatsCount  ?? 0,
    petDogsCount:     r.petDogsCount  ?? 0,
    petOtherCount:    r.petOtherCount ?? 0,
    petPhotoUrls:     r.petPhotoUrls ?? [],
    // BUG-368: surface the pet deposit so the tenant sees the same money line
    // the booking widget / success screen already show.
    petDeposit:       r.petDeposit ?? r.petDepositAmount ?? undefined,
    status:           r.status,
    rejectionReason:  r.rejectionReason ?? undefined,
    respondedAt:      r.respondedAt ?? undefined,
    createdAt:        r.createdAt,
    expiresAt:        r.expiresAt ?? undefined,
  };
}

/**
 * Pending booking requests auto-expire after 72h with no response (matches the
 * contract-signing window). Backend fills `expiresAt`; we keep a client-side
 * fallback for legacy records that pre-date the column.
 */
export const REQUEST_EXPIRY_HOURS = 72;

export function bookingRequestDeadline(req: {
  expiresAt?: string | null;
  createdAt: string;
}): string {
  if (req.expiresAt) return req.expiresAt;
  return new Date(new Date(req.createdAt).getTime() + REQUEST_EXPIRY_HOURS * 3600_000).toISOString();
}

// ── API ──────────────────────────────────────────────────────────────────────

export const bookingRequestsApi = {
  // Host
  getHostRequests: (): Promise<HostBookingRequestDto[]> =>
    apiClient.get<{ data: unknown[] }>("/api/me/host/booking-requests")
      .then((r) => r.data.data.map(normalizeHostRequest)),

  getHostRequest: (id: string): Promise<HostBookingRequestDto> =>
    apiClient.get<{ data: unknown }>(`/api/me/host/booking-requests/${id}`)
      .then((r) => normalizeHostRequest(r.data.data)),

  approve: (id: string, idempotencyKey: string): Promise<void> =>
    apiClient.post(`/api/me/host/booking-requests/${id}/approve`, {}, {
      headers: { "Content-Type": "application/json", "Idempotency-Key": idempotencyKey },
    }).then(() => undefined),

  reject: (id: string, reason?: string): Promise<void> =>
    apiClient.post(`/api/me/host/booking-requests/${id}/reject`, { reason: reason ?? null }, { headers: { "Content-Type": "application/json" } }).then(() => undefined),

  // Guest
  getMyApplications: (): Promise<GuestApplicationDto[]> =>
    apiClient.get<{ data: unknown[] }>("/api/me/guest/applications").then((r) => r.data.data.map(normalizeGuestApplication)),

  getMyApplication: (id: string): Promise<GuestApplicationDto> =>
    apiClient.get<{ data: unknown }>(`/api/me/guest/applications/${id}`).then((r) => normalizeGuestApplication(r.data.data)),

  uploadPetPhotos: (bookingRequestId: string, photos: File[]): Promise<void> => {
    const form = new FormData();
    photos.forEach((f) => form.append("photos", f));
    return apiClient
      .post(`/api/me/guest/applications/${bookingRequestId}/pet-photos`, form)
      .then(() => undefined);
  },
};
