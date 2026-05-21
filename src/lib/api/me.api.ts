import { apiClient } from "./client";
import type { CapabilitiesDto } from "../types/capabilities";

export const meApi = {
  getCapabilities: (): Promise<CapabilitiesDto> =>
    apiClient.get<{ data: CapabilitiesDto }>("/api/me/capabilities").then((r) => r.data.data),
};
