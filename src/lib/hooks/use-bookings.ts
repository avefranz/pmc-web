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

export const useBookingContract = (bookingId: string, enabled: boolean) =>
  useQuery({
    queryKey: keys.contract(bookingId),
    queryFn: () => bookingsApi.getContract(bookingId),
    enabled,
    staleTime: 30_000,
  });

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
