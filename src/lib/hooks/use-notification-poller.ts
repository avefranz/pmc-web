import { useEffect, useRef } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { useCapabilities } from "./use-capabilities";
import { bookingRequestsApi } from "../api/booking-requests.api";
import { useAuthStore } from "../stores/auth.store";

// ─── Stored statuses (persist across sessions) ────────────────────────────────

const STATUSES_KEY = "siamo_app_statuses";   // { [id]: status }
const UNSEEN_KEY   = "siamo_unseen_apps";    // number

export function loadStoredStatuses(): Record<string, string> {
  try { return JSON.parse(localStorage.getItem(STATUSES_KEY) ?? "{}"); } catch { return {}; }
}
function saveStatuses(map: Record<string, string>) {
  localStorage.setItem(STATUSES_KEY, JSON.stringify(map));
}
export function getUnseenCount(): number {
  return parseInt(localStorage.getItem(UNSEEN_KEY) ?? "0", 10) || 0;
}
export function incrementUnseen() {
  localStorage.setItem(UNSEEN_KEY, String(getUnseenCount() + 1));
  window.dispatchEvent(new Event("siamo_unseen_changed"));
}
export function clearUnseen() {
  localStorage.setItem(UNSEEN_KEY, "0");
  window.dispatchEvent(new Event("siamo_unseen_changed"));
}

// ─── Host: watch pendingRequestsCount ─────────────────────────────────────────

export function useHostNotificationPoller() {
  const { pathname } = useLocation();
  const isOnRequestsPage = pathname.startsWith("/me/host/requests");
  const navigate = useNavigate();
  const { data: caps } = useCapabilities();
  const prevCount = useRef<number | undefined>(undefined);

  useEffect(() => {
    const current = caps?.stats.pendingRequestsCount ?? 0;

    if (prevCount.current !== undefined && current > prevCount.current && !isOnRequestsPage) {
      const diff = current - prevCount.current;
      toast.info(
        diff === 1 ? "New booking request" : `${diff} new booking requests`,
        {
          description: "Someone wants to rent your property",
          action: { label: "View", onClick: () => navigate("/me/host/requests") },
          duration: 8000,
        },
      );
    }

    prevCount.current = current;
  }, [caps?.stats.pendingRequestsCount]);
}

// ─── Guest: watch application status changes ──────────────────────────────────

export function useGuestNotificationPoller() {
  const { pathname } = useLocation();
  const navigate = useNavigate();
  const token = useAuthStore((s) => s.token);
  const qc = useQueryClient();

  const { data: apps } = useQuery({
    queryKey: ["guest-applications-poll"],
    queryFn: bookingRequestsApi.getMyApplications,
    enabled: !!token,
    staleTime: 30_000,
    refetchInterval: 30_000,
  });

  // Clear unseen badge when on applications page
  useEffect(() => {
    if (pathname.startsWith("/me/guest/applications")) {
      clearUnseen();
    }
  }, [pathname]);

  useEffect(() => {
    if (!apps) return;

    const stored = loadStoredStatuses();
    const updated: Record<string, string> = {};
    let toastFired = false;

    for (const app of apps) {
      const prev = stored[app.id];
      updated[app.id] = app.status;

      // Detect Pending → something else (works even on first load if prev is in localStorage)
      if (prev === "Pending" && app.status !== "Pending") {
        incrementUnseen();
        // Invalidate the real applications cache so list/detail refresh
        qc.invalidateQueries({ queryKey: ["guest-applications"] });

        const isOnThisApp = pathname.startsWith(`/me/guest/applications/${app.id}`);
        const isOnAppsPage = pathname.startsWith("/me/guest/applications");

        if (!isOnAppsPage && !toastFired) {
          const approved = app.status === "Approved";
          toast[approved ? "success" : "info"](
            approved ? "🎉 Application approved!" : "Application update",
            {
              description: approved
                ? `${app.listingTitle} — the host accepted your request`
                : `${app.listingTitle} — the host has responded`,
              action: {
                label: "View",
                onClick: () => navigate(`/me/guest/applications/${app.id}`),
              },
              duration: 10_000,
            },
          );
          toastFired = true;
        }

        // If currently viewing this app's detail — invalidate so it refreshes
        if (isOnThisApp) {
          qc.invalidateQueries({ queryKey: ["guest-applications", app.id] });
        }
      }
    }

    saveStatuses(updated);
  }, [apps]);
}
