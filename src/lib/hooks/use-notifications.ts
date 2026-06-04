import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { notificationsApi } from "../api/notifications.api";
import { useAuthStore } from "../stores/auth.store";
import type { NotificationFeedDto } from "../types";

// BUG-265: in-app notification feed for the header bell. The existing
// toast pollers (use-notification-poller.ts) stay as the transient layer;
// this is the persistent record + unread counter. We deliberately don't fire
// toasts here to avoid double-notifying.

const FEED_KEY = ["notifications", "feed"] as const;

/**
 * Poll the notification feed. 45s interval — matches the cadence of the
 * other pollers (30-60s) without hammering the endpoint. Only runs when the
 * user is authenticated. `refetchOnWindowFocus` gives a near-instant refresh
 * when the host tabs back in after approving something.
 */
export function useNotificationFeed() {
  const token = useAuthStore((s) => s.token);
  return useQuery({
    queryKey: FEED_KEY,
    queryFn: notificationsApi.getFeed,
    enabled: !!token,
    staleTime: 30_000,
    refetchInterval: 45_000,
    refetchOnWindowFocus: true,
  });
}

/**
 * Mark a single notification read. Optimistically flips `isRead` and
 * decrements `unreadCount` so the badge updates instantly on click, then
 * reconciles with the server. Rolls back on error.
 */
export function useMarkNotificationRead() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => notificationsApi.markRead(id),
    onMutate: async (id: string) => {
      await qc.cancelQueries({ queryKey: FEED_KEY });
      const prev = qc.getQueryData<NotificationFeedDto>(FEED_KEY);
      if (prev) {
        const target = prev.items.find((n) => n.id === id);
        const wasUnread = target ? !target.isRead : false;
        qc.setQueryData<NotificationFeedDto>(FEED_KEY, {
          items: prev.items.map((n) => (n.id === id ? { ...n, isRead: true } : n)),
          unreadCount: Math.max(0, prev.unreadCount - (wasUnread ? 1 : 0)),
        });
      }
      return { prev };
    },
    onError: (_e, _id, ctx) => {
      if (ctx?.prev) qc.setQueryData(FEED_KEY, ctx.prev);
    },
    onSettled: () => {
      qc.invalidateQueries({ queryKey: FEED_KEY });
    },
  });
}

/**
 * Mark every notification read. Optimistically zeroes the counter.
 */
export function useMarkAllNotificationsRead() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: () => notificationsApi.markAllRead(),
    onMutate: async () => {
      await qc.cancelQueries({ queryKey: FEED_KEY });
      const prev = qc.getQueryData<NotificationFeedDto>(FEED_KEY);
      if (prev) {
        qc.setQueryData<NotificationFeedDto>(FEED_KEY, {
          items: prev.items.map((n) => ({ ...n, isRead: true })),
          unreadCount: 0,
        });
      }
      return { prev };
    },
    onError: (_e, _v, ctx) => {
      if (ctx?.prev) qc.setQueryData(FEED_KEY, ctx.prev);
    },
    onSettled: () => {
      qc.invalidateQueries({ queryKey: FEED_KEY });
    },
  });
}
