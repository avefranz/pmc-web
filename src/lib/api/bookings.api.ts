import { apiClient } from "./client";
import type { BookingDto, BookingGuestDto, InvoiceDto, TicketDto, Tm30FilingDto, CreateBookingRequest, AddGuestRequest, UpsertPassportRequest, PaymentInstructionsDto, BookingCancellationDto, ContractDto } from "../types";
import type { BookingStatus } from "../types/enums";

export const bookingsApi = {
  create: (data: CreateBookingRequest) =>
    apiClient
      .post<{ data: { id: string } }>("/api/bookings", data)
      .then((r) => r.data.data),

  getAll: () => apiClient.get<BookingDto[]>("/api/bookings").then((r) => r.data),

  getMy: () => apiClient.get<BookingDto[]>("/api/bookings/my").then((r) => r.data),

  getHostBookings: () =>
    apiClient.get<{ data: BookingDto[] }>("/api/me/host/bookings").then((r) => r.data.data),

  getById: (id: string) => apiClient.get<BookingDto>(`/api/bookings/${id}`).then((r) => r.data),

  getByAsset: (assetId: string) =>
    apiClient.get<BookingDto[]>(`/api/bookings/asset/${assetId}`).then((r) => r.data),

  getTickets: (id: string) =>
    apiClient.get<TicketDto[]>(`/api/bookings/${id}/tickets`).then((r) => r.data),

  getInvoices: (id: string) =>
    apiClient.get<InvoiceDto[]>(`/api/bookings/${id}/invoices`).then((r) => r.data),

  updateStatus: (id: string, newStatus: BookingStatus) =>
    apiClient.patch(`/api/bookings/${id}/status`, { newStatus }),

  getContract: (id: string) =>
    apiClient.get<ContractDto>(`/api/bookings/${id}/contract`).then((r) => r.data),

  uploadContract: (id: string, file: File) => {
    const form = new FormData();
    form.append("file", file);
    return apiClient
      .post<{ url: string }>(`/api/bookings/${id}/contract`, form)
      .then((r) => r.data);
  },

  tenantSignContract: (id: string, typedName: string, signatureImage?: File) => {
    const form = new FormData();
    form.append("typedName", typedName);
    if (signatureImage) form.append("signatureImage", signatureImage);
    return apiClient
      .post<ContractDto>(`/api/bookings/${id}/contract/tenant-sign`, form)
      .then((r) => r.data);
  },

  landlordSignContract: (
    id: string,
    typedName: string,
    signingCapacity: string,
    companyName?: string,
    signatureImage?: File,
  ) => {
    const form = new FormData();
    form.append("typedName", typedName);
    form.append("signingCapacity", signingCapacity);
    if (companyName) form.append("companyName", companyName);
    if (signatureImage) form.append("signatureImage", signatureImage);
    return apiClient
      .post<ContractDto>(`/api/bookings/${id}/contract/landlord-sign`, form)
      .then((r) => r.data);
  },

  getGuests: (id: string) =>
    apiClient.get<BookingGuestDto[]>(`/api/bookings/${id}/guests`).then((r) => r.data),

  addGuest: (id: string, data: AddGuestRequest) =>
    apiClient.post<BookingGuestDto>(`/api/bookings/${id}/guests`, data).then((r) => r.data),

  removeGuest: (id: string, guestId: string) =>
    apiClient.delete(`/api/bookings/${id}/guests/${guestId}`),

  updatePassport: (bookingId: string, guestId: string, data: UpsertPassportRequest) =>
    apiClient.put(`/api/bookings/${bookingId}/guests/${guestId}/passport`, data),

  uploadPassportPhotos: (bookingId: string, guestId: string, photos: File[]) => {
    const form = new FormData();
    photos.forEach((f) => form.append("photos", f));
    return apiClient.post<string[]>(`/api/bookings/${bookingId}/guests/${guestId}/passport/photos`, form);
  },

  unlinkTenant: (id: string) => apiClient.delete(`/api/bookings/${id}/tenant`),

  getTm30: (bookingId: string, guestId: string) =>
    apiClient
      .get<Tm30FilingDto>(`/api/bookings/${bookingId}/guests/${guestId}/tm30`)
      .then((r) => r.data),

  uploadTm30: (bookingId: string, guestId: string, file: File) => {
    const form = new FormData();
    form.append("file", file);
    return apiClient
      .post<Tm30FilingDto>(`/api/bookings/${bookingId}/guests/${guestId}/tm30`, form)
      .then((r) => r.data);
  },

  // ─── Payment ──────────────────────────────────────────────────────────────

  getPaymentInstructions: (bookingId: string) =>
    apiClient.get<{ data: PaymentInstructionsDto }>(`/api/bookings/${bookingId}/payment`).then((r) => r.data.data),

  confirmTransfer: (bookingId: string, paymentId: string, note?: string) =>
    apiClient
      .post<{ data: PaymentInstructionsDto }>(`/api/bookings/${bookingId}/payment/${paymentId}/transfer`, { note })
      .then((r) => r.data.data),

  confirmReceipt: (bookingId: string, paymentId: string) =>
    apiClient
      .post<{ data: PaymentInstructionsDto }>(`/api/bookings/${bookingId}/payment/${paymentId}/receipt`, {})
      .then((r) => r.data.data),

  sandboxConfirm: (bookingId: string, paymentId: string) =>
    apiClient
      .post<{ data: PaymentInstructionsDto }>(`/api/bookings/${bookingId}/payment/${paymentId}/sandbox-confirm`, {})
      .then((r) => r.data.data),

  // ─── Cancellation ─────────────────────────────────────────────────────────

  requestCancellation: (bookingId: string, note?: string) =>
    apiClient
      .post<BookingCancellationDto>(`/api/bookings/${bookingId}/cancellation`, { note })
      .then((r) => r.data),

  getCancellation: (bookingId: string) =>
    apiClient
      .get<BookingCancellationDto>(`/api/bookings/${bookingId}/cancellation`)
      .then((r) => r.data),

  confirmCancellation: (cancellationId: string) =>
    apiClient
      .post<BookingCancellationDto>(`/api/bookings/cancellations/${cancellationId}/confirm`, {})
      .then((r) => r.data),
};
