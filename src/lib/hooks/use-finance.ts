import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { financeApi } from "../api/finance.api";
import type { AssetAnalyticsDto, CreateInvoiceRequest, RegisterPaymentRequest } from "../types";

const keys = {
  overview: () => ["finance", "overview"] as const,
  summary: (from?: string, to?: string) => ["finance", "summary", from, to] as const,
  analytics: (period: string) => ["finance", "analytics", period] as const,
  assetAnalytics: (assetId: string, period: string) =>
    ["finance", "analytics", assetId, period] as const,
  cashOnHand: () => ["finance", "cash-on-hand"] as const,
};

export const useFinanceOverview = () =>
  useQuery({ queryKey: keys.overview(), queryFn: financeApi.getOverview, staleTime: 60_000 });

export const useFinanceSummary = (from?: string, to?: string) =>
  useQuery({
    queryKey: keys.summary(from, to),
    queryFn: () => financeApi.getSummary(from, to),
    staleTime: 60_000,
  });

export const useFinanceAnalytics = (period = "1m") =>
  useQuery<AssetAnalyticsDto | null>({
    queryKey: keys.analytics(period),
    queryFn: () => financeApi.getAnalytics(period),
    staleTime: 60_000,
  });

export const useAssetAnalytics = (assetId: string, period = "1m") =>
  useQuery({
    queryKey: keys.assetAnalytics(assetId, period),
    queryFn: () => financeApi.getAssetAnalytics(assetId, period),
    staleTime: 60_000,
  });

export const useCashOnHand = () =>
  useQuery({
    queryKey: keys.cashOnHand(),
    queryFn: financeApi.getCashOnHand,
    staleTime: 60_000,
  });

export const usePayInvoice = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ invoiceId, data }: { invoiceId: string; data: RegisterPaymentRequest }) =>
      financeApi.pay(invoiceId, data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["bookings"] });
      qc.invalidateQueries({ queryKey: keys.overview() });
      qc.invalidateQueries({ queryKey: keys.cashOnHand() });
    },
  });
};

export const useCreateInvoice = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: CreateInvoiceRequest) => financeApi.createCustomInvoice(data),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["bookings"] }),
  });
};

export const useCreateRemittance = () =>
  useMutation({ mutationFn: financeApi.createRemittance });

export const useConfirmRemittance = () =>
  useMutation({
    mutationFn: ({ batchId, slip }: { batchId: string; slip: File }) =>
      financeApi.confirmRemittance(batchId, slip),
  });
