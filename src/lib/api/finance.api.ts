import { apiClient } from "./client";
import type {
  InvoiceDto,
  FinanceSummaryDto,
  LandlordOverviewDto,
  AssetAnalyticsDto,
  CreateInvoiceRequest,
} from "../types";

export const financeApi = {
  markInvoicePaid: (invoiceId: string, idempotencyKey: string) =>
    apiClient.patch<void>(`/api/finance/invoices/${invoiceId}/paid`, undefined, {
      headers: { "Idempotency-Key": idempotencyKey },
    }),

  createCustomInvoice: (data: CreateInvoiceRequest) =>
    apiClient
      .post<{ invoiceId: string; message: string }>("/api/finance/invoices/custom", data)
      .then((r) => r.data),

  getSummary: (from?: string, to?: string) =>
    apiClient
      .get<FinanceSummaryDto>("/api/finance/summary", { params: { from, to } })
      .then((r) => r.data),

  getTicketInvoices: (ticketId: string) =>
    apiClient.get<InvoiceDto[]>(`/api/finance/tickets/${ticketId}/invoices`).then((r) => r.data),

  getOverview: () =>
    apiClient.get<LandlordOverviewDto>("/api/finance/overview").then((r) => r.data),

  getAnalytics: (period = "1m") =>
    apiClient
      .get<AssetAnalyticsDto | AssetAnalyticsDto[]>("/api/finance/analytics", { params: { period } })
      .then((r) => (Array.isArray(r.data) ? r.data[0] ?? null : r.data)),

  getAssetAnalytics: (assetId: string, period = "1m") =>
    apiClient
      .get<AssetAnalyticsDto>(`/api/finance/analytics/${assetId}`, { params: { period } })
      .then((r) => r.data),
};
