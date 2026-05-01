import { apiClient } from "./client";
import type { CalendarDayDto } from "../types";

export const calendarsApi = {
  get: (listingId: string, startDate: string, endDate: string) =>
    apiClient
      .get<CalendarDayDto[]>("/api/calendars", { params: { listingId, startDate, endDate } })
      .then((r) => r.data),
};
