import { useEffect, useState } from "react";
import { Clock } from "lucide-react";
import { cn } from "@/lib/utils/cn";

/**
 * CountdownPill — small visual countdown to a deadline.
 *
 * Used for response deadlines on cancellation requests, contract signing
 * windows, payment due dates, etc. Updates every minute.
 *
 * Visual intensity escalates as the deadline approaches:
 *  - >24h remaining → neutral
 *  - 6–24h         → warning (amber)
 *  - <6h           → danger (red)
 *  - expired       → danger with "Expired" label
 */
export function CountdownPill({
  deadline,
  prefix,
  expiredLabel = "Expired",
  className,
}: {
  /** ISO timestamp of the deadline. */
  deadline: string | null | undefined;
  /** Optional prefix shown before the time remaining (e.g. "Responds in"). */
  prefix?: string;
  expiredLabel?: string;
  className?: string;
}) {
  const [now, setNow] = useState(() => Date.now());

  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), 60_000);
    return () => clearInterval(id);
  }, []);

  if (!deadline) return null;

  const target = new Date(deadline).getTime();
  if (Number.isNaN(target)) return null;

  const diffMs = target - now;
  const expired = diffMs <= 0;

  const totalMinutes = Math.max(0, Math.floor(diffMs / 60_000));
  const days = Math.floor(totalMinutes / (60 * 24));
  const hours = Math.floor((totalMinutes % (60 * 24)) / 60);
  const minutes = totalMinutes % 60;

  let timeText: string;
  if (expired) {
    timeText = expiredLabel;
  } else if (days > 0) {
    timeText = hours > 0 ? `${days}d ${hours}h` : `${days}d`;
  } else if (hours > 0) {
    timeText = minutes > 0 ? `${hours}h ${minutes}m` : `${hours}h`;
  } else {
    timeText = `${minutes}m`;
  }

  // Severity buckets
  const severity: "neutral" | "warning" | "danger" = expired
    ? "danger"
    : diffMs < 6 * 3600_000
      ? "danger"
      : diffMs < 24 * 3600_000
        ? "warning"
        : "neutral";

  const palette = {
    neutral: "bg-bg-subtle text-fg-muted",
    warning: "bg-warning/10 text-warning",
    danger:  "bg-danger/10 text-danger",
  }[severity];

  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[11px] font-semibold",
        palette,
        className,
      )}
    >
      <Clock size={11} className="shrink-0" />
      {prefix && <span className="font-normal opacity-80">{prefix}</span>}
      <span>{timeText}</span>
    </span>
  );
}

/**
 * Compute the effective deadline for a cancellation response.
 * Backend ideally provides `expiresAt`; if absent we fall back to `createdAt + 72h`.
 */
export function cancellationDeadline(c: { expiresAt?: string | null; createdAt: string }): string {
  if (c.expiresAt) return c.expiresAt;
  const created = new Date(c.createdAt).getTime();
  return new Date(created + 72 * 3600_000).toISOString();
}
