import { apiClient } from "./client";
import type {
  TicketDto,
  TicketDetailsDto,
  TicketEventDto,
  TicketMessageDto,
  CreateTicketRequest,
  PostTicketMessageRequest,
  SpawnChildTicketRequest,
} from "../types";
import type { TicketStatus, TicketPriority } from "../types/enums";

export const ticketsApi = {
  getAll: () => apiClient.get<TicketDto[]>("/api/tickets").then((r) => r.data),

  getAttention: () => apiClient.get<TicketDto[]>("/api/tickets/attention").then((r) => r.data),

  getById: (id: string) =>
    apiClient.get<TicketDetailsDto>(`/api/tickets/${id}`).then((r) => r.data),

  getByAsset: (assetId: string) =>
    apiClient.get<TicketDto[]>(`/api/tickets/asset/${assetId}`).then((r) => r.data),

  create: (data: CreateTicketRequest) =>
    apiClient.post<{ data: { id: string } }>("/api/tickets", data).then((r) => r.data.data),

  updateStatus: (id: string, newStatus: TicketStatus) =>
    apiClient.patch(`/api/tickets/${id}/status`, { newStatus }),

  updateAssignee: (id: string, assigneeId: string | null) =>
    apiClient.patch(`/api/tickets/${id}/assignee`, { assigneeId }),

  updatePriority: (id: string, priority: TicketPriority) =>
    apiClient.patch(`/api/tickets/${id}/priority`, { priority }),

  uploadMedia: (id: string, file: File, assetId: string) => {
    const form = new FormData();
    form.append("file", file);
    if (assetId) form.append("assetId", assetId);
    return apiClient
      .post<{ url: string }>(`/api/tickets/${id}/media`, form)
      .then((r) => r.data);
  },

  spawnChild: (parentId: string, data: SpawnChildTicketRequest) =>
    apiClient.post<{ id: string }>(`/api/tickets/${parentId}/spawn`, data).then((r) => r.data),

  getEvents: (id: string) =>
    apiClient.get<TicketEventDto[]>(`/api/tickets/${id}/events`).then((r) => r.data),

  getMessages: (id: string) =>
    apiClient.get<TicketMessageDto[]>(`/api/tickets/${id}/messages`).then((r) => r.data),

  postMessage: (id: string, data: PostTicketMessageRequest) =>
    apiClient.post<{ id: string }>(`/api/tickets/${id}/messages`, data).then((r) => r.data),

  uploadMessageAttachment: (id: string, messageId: string, file: File) => {
    const form = new FormData();
    form.append("file", file);
    return apiClient
      .post<{ id: string; url: string }>(
        `/api/tickets/${id}/messages/${messageId}/attachments`,
        form
      )
      .then((r) => r.data);
  },

  addChecklistItem: (id: string, title: string) =>
    apiClient.post(`/api/tickets/${id}/checklist/items`, { title }),

  toggleChecklistItem: (id: string, itemId: string, done: boolean, photoUrl?: string) =>
    apiClient.patch(`/api/tickets/${id}/checklist/items/${itemId}`, { done, photoUrl }),

  removeChecklistItem: (id: string, itemId: string) =>
    apiClient.delete(`/api/tickets/${id}/checklist/items/${itemId}`),
};
