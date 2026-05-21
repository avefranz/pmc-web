import { apiClient } from "./client";
import type { InviteResponseDto, GenerateInviteRequest } from "../types";

export function buildInviteUrl(token: string): string {
  return `${window.location.origin}/invite/${token}`;
}

export const invitesApi = {
  generate: (data: GenerateInviteRequest) =>
    apiClient
      .post<{ data: InviteResponseDto }>("/api/invites/generate", data)
      .then((r) => r.data.data),

  accept: (token: string) =>
    apiClient.post<{ message: string }>("/api/invites/accept", { token }).then((r) => r.data),
};
