import { apiClient } from "./client";
import type { BookingDto, BookingGuestDto, InvoiceDto, TicketDto, Tm30FilingDto, CreateBookingRequest, AddGuestRequest, UpsertPassportRequest, PaymentInstructionsDto, BookingCancellationDto, ContractDto, DepositSettlementDto } from "../types";
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

  downloadTm30Template: async (bookingId: string): Promise<void> => {
    const response = await apiClient.get(`/api/bookings/${bookingId}/tm30-template`, {
      responseType: "blob",
    });
    const url = URL.createObjectURL(response.data as Blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `TM30_${bookingId}.xlsx`;
    a.click();
    URL.revokeObjectURL(url);
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
      .post<{ data: BookingCancellationDto }>(`/api/bookings/${bookingId}/cancellation`, { note })
      .then((r) => r.data.data),

  getCancellation: (bookingId: string) =>
    apiClient
      .get<{ data: BookingCancellationDto }>(`/api/bookings/${bookingId}/cancellation`)
      .then((r) => r.data.data),

  confirmCancellation: (cancellationId: string) =>
    apiClient
      .post<{ data: BookingCancellationDto }>(`/api/bookings/cancellations/${cancellationId}/confirm`, {})
      .then((r) => r.data.data),

  /**
   * Decline a cancellation request as the responder (landlord declining a tenant request,
   * or tenant declining a landlord termination). Requires a written reason.
   *
   * Expected backend: POST /api/bookings/cancellations/{id}/decline with { reason: string }.
   * Backend should set status="Declined", declinedAt=now, declineReason=reason.
   */
  declineCancellation: (cancellationId: string, reason: string) =>
    apiClient
      .post<{ data: BookingCancellationDto }>(`/api/bookings/cancellations/${cancellationId}/decline`, { reason })
      .then((r) => r.data.data),

  /**
   * Landlord-initiated termination request.
   *
   * `reason` determines financial treatment:
   *  - "NonPayment":      deposit goes to host in lieu of unpaid rent; tenant receives leftover.
   *                       Requires 14+ days of overdue rent.
   *  - "Breach":          host claims damages from deposit; subject to dispute.
   *  - "MutualAgreement": no penalties; deposit refunded in full.
   *
   * Expected backend: POST /api/bookings/{id}/cancellation with
   *   { initiator: "Landlord", reason, note }.
   */
  initiateLandlordTermination: (
    bookingId: string,
    payload: { reason: "NonPayment" | "Breach" | "MutualAgreement"; note: string },
  ) =>
    apiClient
      .post<{ data: BookingCancellationDto }>(`/api/bookings/${bookingId}/cancellation`, {
        initiator: "Landlord",
        reason: payload.reason,
        note: payload.note,
      })
      .then((r) => r.data.data),

  /**
   * Tenant "cure" action: pay outstanding rent to cancel a NonPayment termination.
   * Only valid while the cancellation is still "Requested" and reason is "NonPayment".
   *
   * Expected backend: POST /api/bookings/cancellations/{id}/cure
   * Should clear the cancellation and re-set booking status to Active.
   */
  cureCancellation: (cancellationId: string) =>
    apiClient
      .post<{ data: BookingCancellationDto }>(`/api/bookings/cancellations/${cancellationId}/cure`, {})
      .then((r) => r.data.data),

  /**
   * Withdraw a still-pending cancellation request. Only the initiator may withdraw,
   * and only while status === "Requested".
   *
   * Expected backend: POST /api/bookings/cancellations/{id}/withdraw.
   */
  withdrawCancellation: (cancellationId: string) =>
    apiClient
      .post<{ data: BookingCancellationDto }>(`/api/bookings/cancellations/${cancellationId}/withdraw`, {})
      .then((r) => r.data.data),

  // ─── Payment enforcement ───────────────────────────────────────────────────

  /**
   * Send a payment notice to the tenant. Two flavours:
   *  - `reminder` — friendly nudge, available from day 3 of overdue, rate-limited to once per 3 days
   *  - `formal`   — formal notice, available from day 7 of overdue, creates a timeline record
   *
   * Expected backend: POST /api/bookings/{id}/payment-notice with { type } body.
   * Should send email/push to tenant and record the action in booking timeline.
   */
  sendPaymentNotice: (bookingId: string, type: "reminder" | "formal") =>
    apiClient
      .post<{ data: { sentAt: string } }>(`/api/bookings/${bookingId}/payment-notice`, { type })
      .then((r) => r.data.data),

  // ─── Deposit settlement ────────────────────────────────────────────────────

  /**
   * Get the deposit-settlement record for a completed booking. Returns null/404 when
   * the booking hasn't entered the settlement phase yet.
   *
   * Expected backend: GET /api/bookings/{id}/deposit-settlement
   */
  getDepositSettlement: (bookingId: string) =>
    apiClient
      .get<{ data: DepositSettlementDto }>(`/api/bookings/${bookingId}/deposit-settlement`)
      .then((r) => r.data.data),

  /**
   * Host action: submit checkout inspection result.
   *   outcome="full_return" → release the full deposit to the tenant
   *   outcome="partial_hold" → withhold `holdAmount`, must include reason (and optionally photos)
   *
   * Expected backend: POST /api/bookings/{id}/checkout-inspection
   */
  submitCheckoutInspection: (
    bookingId: string,
    payload: { outcome: "full_return" | "partial_hold"; holdAmount?: number; reason?: string; photoUrls?: string[] },
  ) =>
    apiClient
      .post<{ data: DepositSettlementDto }>(`/api/bookings/${bookingId}/checkout-inspection`, payload)
      .then((r) => r.data.data),

  /**
   * Tenant accepts the partial hold proposed by the host.
   *
   * Expected backend: POST /api/bookings/{id}/deposit-settlement/accept
   */
  acceptDepositSettlement: (bookingId: string) =>
    apiClient
      .post<{ data: DepositSettlementDto }>(`/api/bookings/${bookingId}/deposit-settlement/accept`, {})
      .then((r) => r.data.data),

  /**
   * Tenant disputes the partial hold. Triggers manual support review.
   *
   * Expected backend: POST /api/bookings/{id}/deposit-settlement/dispute
   */
  disputeDepositSettlement: (bookingId: string, reason: string) =>
    apiClient
      .post<{ data: DepositSettlementDto }>(`/api/bookings/${bookingId}/deposit-settlement/dispute`, { reason })
      .then((r) => r.data.data),
};
