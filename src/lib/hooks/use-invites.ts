import { useMutation } from "@tanstack/react-query";
import { invitesApi } from "../api/invites.api";
import type { GenerateInviteRequest } from "../types";

export const useGenerateInvite = () =>
  useMutation({ mutationFn: (data: GenerateInviteRequest) => invitesApi.generate(data) });

export const useAcceptInvite = () =>
  useMutation({ mutationFn: (token: string) => invitesApi.accept(token) });
