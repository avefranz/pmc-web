import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { bookingRequestsApi } from "../api/booking-requests.api";
import { CAPS_KEY } from "./use-capabilities";

const keys = {
  hostRequests:    ()       => ["host-booking-requests"] as const,
  hostRequest:     (id: string) => ["host-booking-requests", id] as const,
  guestApps:       ()       => ["guest-applications"] as const,
  guestApp:        (id: string) => ["guest-applications", id] as const,
};

// ── Host ────────────────────────────────────────────────────────────────────

export const useHostRequests = () =>
  useQuery({
    queryKey: keys.hostRequests(),
    queryFn: bookingRequestsApi.getHostRequests,
    staleTime: 30_000,
  });

export const useHostRequest = (id: string) =>
  useQuery({
    queryKey: keys.hostRequest(id),
    queryFn: () => bookingRequestsApi.getHostRequest(id),
    staleTime: 30_000,
  });

export const useApproveRequest = (id: string) => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: () => bookingRequestsApi.approve(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: keys.hostRequests() });
      qc.invalidateQueries({ queryKey: keys.hostRequest(id) });
      qc.invalidateQueries({ queryKey: CAPS_KEY });
    },
  });
};

export const useRejectRequest = (id: string) => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: () => bookingRequestsApi.reject(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: keys.hostRequests() });
      qc.invalidateQueries({ queryKey: keys.hostRequest(id) });
    },
  });
};

// ── Guest ───────────────────────────────────────────────────────────────────

export const useMyApplications = () =>
  useQuery({
    queryKey: keys.guestApps(),
    queryFn: bookingRequestsApi.getMyApplications,
    staleTime: 30_000,
  });

export const useMyApplication = (id: string) =>
  useQuery({
    queryKey: keys.guestApp(id),
    queryFn: () => bookingRequestsApi.getMyApplication(id),
    staleTime: 30_000,
  });
