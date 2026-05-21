import { useQuery } from "@tanstack/react-query";
import { calendarsApi } from "../api/calendars.api";

export const useCalendar = (listingId: string, startDate: string, endDate: string) =>
  useQuery({
    queryKey: ["calendars", listingId, startDate, endDate],
    queryFn: () => calendarsApi.get(listingId, startDate, endDate),
    staleTime: 60_000,
    enabled: !!listingId && !!startDate && !!endDate,
  });
