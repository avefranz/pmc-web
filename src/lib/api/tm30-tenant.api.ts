import { apiClient } from "./client";
import type { Tm30TenantRecordDto } from "../types";

export const tm30TenantApi = {
  getMyTm30: () =>
    apiClient.get<{ data: Tm30TenantRecordDto[] } | Tm30TenantRecordDto[]>("/api/me/tm30")
      .then((r) => (Array.isArray(r.data) ? r.data : ((r.data as { data: Tm30TenantRecordDto[] }).data ?? []))),
};
