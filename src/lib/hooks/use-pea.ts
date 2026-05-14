import { useQuery } from "@tanstack/react-query";
import { peaApi } from "../api/pea.api";

export const usePeaBill = (ca: string | undefined) =>
  useQuery({
    queryKey: ["pea-bill", ca],
    queryFn: () => peaApi.getBill(ca!),
    enabled: !!ca,
    staleTime: 5 * 60_000,
    retry: 1,
  });

export const useGuestPeaBill = (bookingId: string | undefined) =>
  useQuery({
    queryKey: ["pea-bill-guest", bookingId],
    queryFn: () => peaApi.getGuestBill(bookingId!),
    enabled: !!bookingId,
    staleTime: 5 * 60_000,
    retry: 1,
  });
