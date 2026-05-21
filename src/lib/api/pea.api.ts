import { apiClient } from "./client";

export interface PeaBillDto {
  ca: string;
  statusCode: string;     // "I001" = no debt, "I002" = has debt
  statusText: string;     // Thai: "ปกติ" / "ค้างชำระ"
  statColor: string;      // hex color from PEA (green / red)
  hasDebt: boolean;
  sumTotal: number;
  billCount: number;
  period?: string;        // "202601"
  dueDate?: string;       // ISO date string
  barcode?: string;
  isCanQr: boolean;
  // backend sets this when cookies are stale / PEA is unreachable
  fetchedAt: string;
}

export interface PeaValidateDto {
  customerName: string;  // sanitized — e.g. "นาง ปู*** เร***"
  ca: string;
}

export const peaApi = {
  getBill: (ca: string) =>
    apiClient
      .get<PeaBillDto>("/api/utilities/pea/bill", { params: { ca } })
      .then((r) => r.data),

  validate: (ca: string, meter: string) =>
    apiClient
      .get<PeaValidateDto>("/api/utilities/pea/validate", { params: { ca, meter } })
      .then((r) => r.data),

  getGuestBill: (bookingId: string) =>
    apiClient
      .get<PeaBillDto>(`/api/me/guest/bookings/${bookingId}/pea-bill`)
      .then((r) => r.data),
};
