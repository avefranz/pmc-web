import { apiClient } from "./client";
import type {
  InvoiceDto,
  FinanceSummaryDto,
  LandlordOverviewDto,
  CashOnHandResponse,
  AssetAnalyticsDto,
  CreateInvoiceRequest,
  RegisterPaymentRequest,
} from "../types";

export const financeApi = {
  pay: (invoiceId: string, data: RegisterPaymentRequest) =>
    apiClient
      .post<{ message: string }>(`/api/finance/invoices/${invoiceId}/pay`, data)
      .then((r) => r.data),

  getCashOnHand: () =>
    apiClient.get<CashOnHandResponse>("/api/finance/cash-on-hand").then((r) => r.data),

  createRemittance: () =>
    apiClient.post<{ batchId: string }>("/api/finance/remittance/create").then((r) => r.data),

  confirmRemittance: (batchId: string, slipUrl: string) =>
    apiClient
      .post<{ message: string }>(`/api/finance/remittance/${batchId}/confirm`, { slipUrl })
      .then((r) => r.data),

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
