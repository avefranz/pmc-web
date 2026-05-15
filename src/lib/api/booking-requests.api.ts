import { apiClient } from "./client";

// ── DTOs ────────────────────────────────────────────────────────────────────

export type BookingRequestStatus = "Pending" | "Approved" | "Rejected" | "Expired";

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
  totalRent: number;
  status: BookingRequestStatus;
  rejectionReason?: string;
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
  petCatsCount: number;
  petDogsCount: number;
  petOtherCount: number;
  petPhotoUrls: string[];
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
    totalRent:            r.totalRent ?? 0,
    status:               r.status,
    rejectionReason:      r.rejectionReason ?? undefined,
    petPhotoUrls:         r.petPhotoUrls ?? [],
    createdAt:            r.createdAt,
    expiresAt:            r.expiresAt ?? undefined,
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

  approve: (id: string): Promise<void> =>
    apiClient.post(`/api/me/host/booking-requests/${id}/approve`, {}, { headers: { "Content-Type": "application/json" } }).then(() => undefined),

  reject: (id: string, reason?: string): Promise<void> =>
    apiClient.post(`/api/me/host/booking-requests/${id}/reject`, { reason: reason ?? null }, { headers: { "Content-Type": "application/json" } }).then(() => undefined),

  // Guest
  getMyApplications: (): Promise<GuestApplicationDto[]> =>
    apiClient.get<{ data: GuestApplicationDto[] }>("/api/me/guest/applications").then((r) => r.data.data),

  getMyApplication: (id: string): Promise<GuestApplicationDto> =>
    apiClient.get<{ data: GuestApplicationDto }>(`/api/me/guest/applications/${id}`).then((r) => r.data.data),

  uploadPetPhotos: (bookingRequestId: string, photos: File[]): Promise<void> => {
    const form = new FormData();
    photos.forEach((f) => form.append("photos", f));
    return apiClient
      .post(`/api/me/guest/applications/${bookingRequestId}/pet-photos`, form)
      .then(() => undefined);
  },
};
