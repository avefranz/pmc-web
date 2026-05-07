import { apiClient } from "./client";
import type { Tm30TenantRecordDto } from "../types";

export const tm30TenantApi = {
  getMyTm30: () =>
    apiClient.get<Tm30TenantRecordDto[]>("/api/me/tm30").then((r) => r.data),
};
