import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { bookingsApi } from "../api/bookings.api";
import type { CreateBookingRequest, AddGuestRequest, UpsertPassportRequest } from "../types";
import type { BookingStatus } from "../types/enums";



const keys = {
  all: ["bookings"] as const,
  host: () => ["bookings", "host"] as const,
  my: () => ["bookings", "my"] as const,
  detail: (id: string) => ["bookings", id] as const,
  byAsset: (assetId: string) => ["bookings", "asset", assetId] as const,
  guests: (id: string) => ["bookings", id, "guests"] as const,
  invoices: (id: string) => ["bookings", id, "invoices"] as const,
  tickets: (id: string) => ["bookings", id, "tickets"] as const,
  tm30: (bookingId: string, guestId: string) => ["bookings", bookingId, "guests", guestId, "tm30"] as const,
  contract: (id: string) => ["bookings", id, "contract"] as const,
  payment: (id: string) => ["bookings", id, "payment"] as const,
  cancellation: (id: string) => ["bookings", id, "cancellation"] as const,
  depositSettlement: (id: string) => ["bookings", id, "deposit-settlement"] as const,
};

export const useBookings = () =>
  useQuery({ queryKey: keys.all, queryFn: bookingsApi.getAll, staleTime: 30_000 });

export const useHostBookings = () =>
  useQuery({ queryKey: keys.host(), queryFn: bookingsApi.getHostBookings, staleTime: 30_000 });

export const useMyBookings = () =>
  useQuery({ queryKey: keys.my(), queryFn: bookingsApi.getMy, staleTime: 30_000 });

export const useBooking = (id: string) =>
  useQuery({ queryKey: keys.detail(id), queryFn: () => bookingsApi.getById(id), staleTime: 30_000 });

export const useBookingsByAsset = (assetId: string) =>
  useQuery({
    queryKey: keys.byAsset(assetId),
    queryFn: () => bookingsApi.getByAsset(assetId),
    staleTime: 30_000,
  });

export const useBookingGuests = (id: string) =>
  useQuery({ queryKey: keys.guests(id), queryFn: () => bookingsApi.getGuests(id), staleTime: 30_000 });

export const useBookingInvoices = (id: string) =>
  useQuery({
    queryKey: keys.invoices(id),
    queryFn: () => bookingsApi.getInvoices(id),
    staleTime: 30_000,
  });

export const useBookingTickets = (id: string) =>
  useQuery({
    queryKey: keys.tickets(id),
    queryFn: () => bookingsApi.getTickets(id),
    staleTime: 30_000,
  });

export const useBookingContract = (bookingId: string) =>
  useQuery({
    queryKey: keys.contract(bookingId),
    queryFn: () => bookingsApi.getContract(bookingId),
    staleTime: 30_000,
    retry: (count, err: unknown) => {
      const status = (err as { response?: { status?: number } })?.response?.status;
      if (status === 404) return false;
      return count < 1;
    },
  });

export const useTenantSignContract = (bookingId: string) => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ typedName, signatureImage }: { typedName: string; signatureImage?: File }) =>
      bookingsApi.tenantSignContract(bookingId, typedName, signatureImage),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: keys.contract(bookingId) });
      qc.invalidateQueries({ queryKey: keys.detail(bookingId) });
    },
  });
};

export const useLandlordSignContract = (bookingId: string) => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({
      typedName,
      signingCapacity,
      companyName,
      signatureImage,
    }: {
      typedName: string;
      signingCapacity: string;
      companyName?: string;
      signatureImage?: File;
    }) => bookingsApi.landlordSignContract(bookingId, typedName, signingCapacity, companyName, signatureImage),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: keys.contract(bookingId) });
      qc.invalidateQueries({ queryKey: keys.detail(bookingId) });
    },
  });
};

export const useBookingTm30 = (bookingId: string, guestId: string | null) =>
  useQuery({
    queryKey: keys.tm30(bookingId, guestId ?? ""),
    queryFn: () => bookingsApi.getTm30(bookingId, guestId!),
    enabled: !!guestId,
    staleTime: 30_000,
  });


export const useCreateBooking = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: CreateBookingRequest) => bookingsApi.create(data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: keys.all });
      qc.invalidateQueries({ queryKey: ["capabilities"] });
    },
  });
};

export const useUpdateBookingStatus = (id: string) => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (status: BookingStatus) => bookingsApi.updateStatus(id, status),
    onSuccess: () => qc.invalidateQueries({ queryKey: keys.detail(id) }),
  });
};

export const useAddGuest = (bookingId: string) => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: AddGuestRequest) => bookingsApi.addGuest(bookingId, data),
    onSuccess: () => qc.invalidateQueries({ queryKey: keys.guests(bookingId) }),
  });
};

export const useRemoveGuest = (bookingId: string) => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (guestId: string) => bookingsApi.removeGuest(bookingId, guestId),
    onSuccess: () => qc.invalidateQueries({ queryKey: keys.guests(bookingId) }),
  });
};

export const useUpdatePassport = (bookingId: string) => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ guestId, data }: { guestId: string; data: UpsertPassportRequest }) =>
      bookingsApi.updatePassport(bookingId, guestId, data),
    onSuccess: () => qc.invalidateQueries({ queryKey: keys.guests(bookingId) }),
  });
};

export const useUnlinkTenant = (bookingId: string) => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: () => bookingsApi.unlinkTenant(bookingId),
    onSuccess: () => qc.invalidateQueries({ queryKey: keys.detail(bookingId) }),
  });
};

export const useUploadTm30 = (bookingId: string, guestId: string | null) => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (file: File) => bookingsApi.uploadTm30(bookingId, guestId!, file),
    onSuccess: () => qc.invalidateQueries({ queryKey: keys.tm30(bookingId, guestId ?? "") }),
  });
};

// ─── Payment ──────────────────────────────────────────────────────────────────

export const useBookingPayment = (bookingId: string) =>
  useQuery({
    queryKey: keys.payment(bookingId),
    queryFn: () => bookingsApi.getPaymentInstructions(bookingId),
    staleTime: 30_000,
  });

export const useConfirmTransfer = (bookingId: string) => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ paymentId, note }: { paymentId: string; note?: string }) =>
      bookingsApi.confirmTransfer(bookingId, paymentId, note),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: keys.payment(bookingId) });
      qc.invalidateQueries({ queryKey: keys.detail(bookingId) });
      qc.invalidateQueries({ queryKey: keys.my() });
    },
  });
};

export const useConfirmReceipt = (bookingId: string) => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (paymentId: string) => bookingsApi.confirmReceipt(bookingId, paymentId),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: keys.payment(bookingId) });
      qc.invalidateQueries({ queryKey: keys.detail(bookingId) });
      qc.invalidateQueries({ queryKey: keys.invoices(bookingId) });
      qc.invalidateQueries({ queryKey: keys.host() });
    },
  });
};

// ─── Cancellation ─────────────────────────────────────────────────────────────

export const useBookingCancellation = (bookingId: string, enabled = true) =>
  useQuery({
    queryKey: keys.cancellation(bookingId),
    queryFn: () => bookingsApi.getCancellation(bookingId),
    staleTime: 30_000,
    enabled,
    retry: (count, err: unknown) => {
      // 404 means no cancellation request exists — don't retry
      const status = (err as { response?: { status?: number } })?.response?.status;
      if (status === 404) return false;
      return count < 1;
    },
  });

export const useRequestCancellation = (bookingId: string) => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (note?: string) => bookingsApi.requestCancellation(bookingId, note),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: keys.cancellation(bookingId) });
      qc.invalidateQueries({ queryKey: keys.detail(bookingId) });
    },
  });
};

export const useConfirmCancellation = (bookingId: string) => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (cancellationId: string) => bookingsApi.confirmCancellation(cancellationId),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: keys.cancellation(bookingId) });
      qc.invalidateQueries({ queryKey: keys.detail(bookingId) });
      qc.invalidateQueries({ queryKey: keys.host() });
      qc.invalidateQueries({ queryKey: keys.my() });
    },
  });
};

export const useDeclineCancellation = (bookingId: string) => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ cancellationId, reason }: { cancellationId: string; reason: string }) =>
      bookingsApi.declineCancellation(cancellationId, reason),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: keys.cancellation(bookingId) });
      qc.invalidateQueries({ queryKey: keys.detail(bookingId) });
    },
  });
};

export const useWithdrawCancellation = (bookingId: string) => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (cancellationId: string) => bookingsApi.withdrawCancellation(cancellationId),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: keys.cancellation(bookingId) });
      qc.invalidateQueries({ queryKey: keys.detail(bookingId) });
    },
  });
};

export const useInitiateLandlordTermination = (bookingId: string) => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (payload: { reason: "NonPayment" | "Breach" | "MutualAgreement"; note: string }) =>
      bookingsApi.initiateLandlordTermination(bookingId, payload),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: keys.cancellation(bookingId) });
      qc.invalidateQueries({ queryKey: keys.detail(bookingId) });
      qc.invalidateQueries({ queryKey: keys.host() });
    },
  });
};

export const useCureCancellation = (bookingId: string) => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (cancellationId: string) => bookingsApi.cureCancellation(cancellationId),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: keys.cancellation(bookingId) });
      qc.invalidateQueries({ queryKey: keys.detail(bookingId) });
      qc.invalidateQueries({ queryKey: keys.payment(bookingId) });
    },
  });
};

// ─── Payment enforcement ───────────────────────────────────────────────────

export const useSendPaymentNotice = (bookingId: string) => {
  return useMutation({
    mutationFn: (type: "reminder" | "formal") => bookingsApi.sendPaymentNotice(bookingId, type),
  });
};

// ─── Deposit settlement ────────────────────────────────────────────────────

export const useDepositSettlement = (bookingId: string, enabled = true) =>
  useQuery({
    queryKey: keys.depositSettlement(bookingId),
    queryFn: () => bookingsApi.getDepositSettlement(bookingId),
    staleTime: 30_000,
    enabled,
    retry: (count, err: unknown) => {
      const status = (err as { response?: { status?: number } })?.response?.status;
      if (status === 404) return false;
      return count < 1;
    },
  });

export const useSubmitCheckoutInspection = (bookingId: string) => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (payload: { outcome: "full_return" | "partial_hold"; holdAmount?: number; reason?: string; photoUrls?: string[] }) =>
      bookingsApi.submitCheckoutInspection(bookingId, payload),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: keys.depositSettlement(bookingId) });
      qc.invalidateQueries({ queryKey: keys.detail(bookingId) });
    },
  });
};

export const useAcceptDepositSettlement = (bookingId: string) => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: () => bookingsApi.acceptDepositSettlement(bookingId),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: keys.depositSettlement(bookingId) });
      qc.invalidateQueries({ queryKey: keys.detail(bookingId) });
    },
  });
};

export const useDisputeDepositSettlement = (bookingId: string) => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (reason: string) => bookingsApi.disputeDepositSettlement(bookingId, reason),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: keys.depositSettlement(bookingId) });
      qc.invalidateQueries({ queryKey: keys.detail(bookingId) });
    },
  });
};
