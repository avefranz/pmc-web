import { apiClient } from "./client";
import type { BookingDto, BookingGuestDto, InvoiceDto, TicketDto, Tm30FilingDto, CreateBookingRequest, AddGuestRequest, UpsertPassportRequest } from "../types";
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
    apiClient.get<{ url: string }>(`/api/bookings/${id}/contract`).then((r) => r.data),

  uploadContract: (id: string, file: File) => {
    const form = new FormData();
    form.append("file", file);
    return apiClient
      .post<{ url: string }>(`/api/bookings/${id}/contract`, form)
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
};
