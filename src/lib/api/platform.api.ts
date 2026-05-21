import { apiClient } from "./client";

export interface SupportContactDto {
  email: string;
  lineId?: string | null;
  webUrl?: string | null;
}

export const platformApi = {
  getSupportContact: () =>
    apiClient
      .get<{ data: SupportContactDto } | SupportContactDto>("/api/platform/support-contact")
      .then((r) => {
        const body = r.data as unknown;
        if (body && typeof body === "object" && "data" in body) {
          return (body as { data: SupportContactDto }).data;
        }
        return body as SupportContactDto;
      }),
};
