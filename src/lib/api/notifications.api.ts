import { apiClient } from "./client";
import type { NotificationFeedDto } from "../types";

// BUG-265: in-app notification feed. Backend wraps every response in the
// standard { data, success, message, errors } envelope, so we unwrap `.data.data`.
export const notificationsApi = {
  /** GET /api/me/notifications → newest-first, up to 50, plus unreadCount. */
  getFeed: (): Promise<NotificationFeedDto> =>
    apiClient
      .get<{ data: NotificationFeedDto }>("/api/me/notifications")
      .then((r) => r.data.data),

  /** PATCH /api/me/notifications/{id}/read — idempotent; 404 if not owned. */
  markRead: (id: string): Promise<void> =>
    apiClient
      .patch(`/api/me/notifications/${id}/read`, {})
      .then(() => undefined),

  /** POST /api/me/notifications/read-all → number marked. */
  markAllRead: (): Promise<void> =>
    apiClient
      .post("/api/me/notifications/read-all", {})
      .then(() => undefined),
};
