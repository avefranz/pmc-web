import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { ticketsApi } from "../api/tickets.api";
import type { CreateTicketRequest, PostTicketMessageRequest, SpawnChildTicketRequest } from "../types";
import type { TicketStatus, TicketPriority } from "../types/enums";

export const ticketKeys = {
  all: ["tickets"] as const,
  attention: () => ["tickets", "attention"] as const,
  detail: (id: string) => ["tickets", id] as const,
  byAsset: (assetId: string) => ["tickets", "asset", assetId] as const,
};

export const useTickets = () =>
  useQuery({ queryKey: ticketKeys.all, queryFn: ticketsApi.getAll, staleTime: 30_000 });

export const useAttentionTickets = () =>
  useQuery({
    queryKey: ticketKeys.attention(),
    queryFn: ticketsApi.getAttention,
    staleTime: 30_000,
  });

export const useTicket = (id: string) =>
  useQuery({
    queryKey: ticketKeys.detail(id),
    queryFn: () => ticketsApi.getById(id),
    staleTime: 30_000,
  });

export const useTicketsByAsset = (assetId: string) =>
  useQuery({
    queryKey: ticketKeys.byAsset(assetId),
    queryFn: () => ticketsApi.getByAsset(assetId),
    staleTime: 30_000,
  });

export const useCreateTicket = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: CreateTicketRequest) => ticketsApi.create(data),
    onSuccess: () => qc.invalidateQueries({ queryKey: ticketKeys.all }),
  });
};

export const useUpdateTicketStatus = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, status }: { id: string; status: TicketStatus }) =>
      ticketsApi.updateStatus(id, status),
    onSuccess: (_d, { id }) => {
      qc.invalidateQueries({ queryKey: ticketKeys.detail(id) });
      qc.invalidateQueries({ queryKey: ticketKeys.all });
    },
  });
};

export const useUpdateTicketPriority = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, priority }: { id: string; priority: TicketPriority }) =>
      ticketsApi.updatePriority(id, priority),
    onSuccess: (_d, { id }) => {
      qc.invalidateQueries({ queryKey: ticketKeys.detail(id) });
      qc.invalidateQueries({ queryKey: ticketKeys.all });
    },
  });
};

export const useUpdateTicketAssignee = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, assigneeId }: { id: string; assigneeId: string | null }) =>
      ticketsApi.updateAssignee(id, assigneeId),
    onSuccess: (_d, { id }) => qc.invalidateQueries({ queryKey: ticketKeys.detail(id) }),
  });
};

export const usePostTicketMessage = (ticketId: string) => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ attachments, ...data }: PostTicketMessageRequest & { attachments?: File[] }) => {
      const { id } = await ticketsApi.postMessage(ticketId, data);
      // Attachments upload after the message exists; failures bubble up so the
      // compose UI can surface them rather than silently dropping evidence.
      if (attachments?.length) {
        await Promise.all(
          attachments.map((file) => ticketsApi.uploadMessageAttachment(ticketId, id, file)),
        );
      }
      return { id };
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ticketKeys.detail(ticketId) }),
  });
};

export const useSpawnChildTicket = (parentId: string) => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: SpawnChildTicketRequest) => ticketsApi.spawnChild(parentId, data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ticketKeys.detail(parentId) });
      qc.invalidateQueries({ queryKey: ticketKeys.all });
    },
  });
};

export const useToggleChecklistItem = (ticketId: string) => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ itemId, done, photoUrl }: { itemId: string; done: boolean; photoUrl?: string }) =>
      ticketsApi.toggleChecklistItem(ticketId, itemId, done, photoUrl),
    onMutate: async ({ itemId, done }) => {
      await qc.cancelQueries({ queryKey: ticketKeys.detail(ticketId) });
      const prev = qc.getQueryData(ticketKeys.detail(ticketId));
      qc.setQueryData(ticketKeys.detail(ticketId), (old: { checklistItems?: { id: string; done: boolean }[] } | undefined) => {
        if (!old) return old;
        return {
          ...old,
          checklistItems: old.checklistItems?.map((item) =>
            item.id === itemId ? { ...item, done } : item
          ),
        };
      });
      return { prev };
    },
    onError: (_e, _v, ctx) => {
      if (ctx?.prev) qc.setQueryData(ticketKeys.detail(ticketId), ctx.prev);
    },
    onSettled: () => qc.invalidateQueries({ queryKey: ticketKeys.detail(ticketId) }),
  });
};

export const useAddChecklistItem = (ticketId: string) => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (title: string) => ticketsApi.addChecklistItem(ticketId, title),
    onSuccess: () => qc.invalidateQueries({ queryKey: ticketKeys.detail(ticketId) }),
  });
};
