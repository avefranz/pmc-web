import { apiClient } from "./client";

// ── DTOs ────────────────────────────────────────────────────────────────────

export type BookingRequestStatus = "Pending" | "Approved" | "Rejected" | "Expired";

export interface HostBookingRequestDto {
  id: string;
  guestName: string;
  guestEmail?: string;
  guestPhone?: string;
  message?: string;
  listingTitle: string;
  moveInDate: string;
  durationMonths: number;
  monthlyRate: number;
  status: BookingRequestStatus;
  createdAt: string;
}

export interface GuestApplicationDto {
  id: string;
  listingTitle: string;
  listingImageUrl?: string;
  moveInDate: string;
  durationMonths: number;
  monthlyRate: number;
  status: BookingRequestStatus;
  respondedAt?: string;
  createdAt: string;
}

// ── API ──────────────────────────────────────────────────────────────────────

export const bookingRequestsApi = {
  // Host
  getHostRequests: (): Promise<HostBookingRequestDto[]> =>
    apiClient.get<{ data: HostBookingRequestDto[] }>("/api/me/host/booking-requests").then((r) => r.data.data),

  getHostRequest: (id: string): Promise<HostBookingRequestDto> =>
    apiClient.get<{ data: HostBookingRequestDto }>(`/api/me/host/booking-requests/${id}`).then((r) => r.data.data),

  approve: (id: string): Promise<void> =>
    apiClient.post(`/api/me/host/booking-requests/${id}/approve`).then(() => undefined),

  reject: (id: string): Promise<void> =>
    apiClient.post(`/api/me/host/booking-requests/${id}/reject`).then(() => undefined),

  // Guest
  getMyApplications: (): Promise<GuestApplicationDto[]> =>
    apiClient.get<{ data: GuestApplicationDto[] }>("/api/me/guest/applications").then((r) => r.data.data),

  getMyApplication: (id: string): Promise<GuestApplicationDto> =>
    apiClient.get<{ data: GuestApplicationDto }>(`/api/me/guest/applications/${id}`).then((r) => r.data.data),
};
