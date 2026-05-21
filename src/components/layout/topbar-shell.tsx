import type { ReactNode } from "react";
import { cn } from "@/lib/utils/cn";

interface Props {
  left: ReactNode;
  center?: ReactNode;
  right?: ReactNode;
  /**
   * "solid"   — bg-bg-card, used everywhere by default
   * "blur"    — translucent + backdrop-blur, for marketing pages where the
   *             hero should peek through. Same height/border/padding.
   */
  variant?: "solid" | "blur";
  /**
   * Override center-slot grow behavior. "flex" lets the center column take
   * remaining space (default — good for nav-tabs/search-pills). "auto" sizes
   * the center to its content (when it's a fixed-width element).
   */
  centerGrow?: "flex" | "auto";
}

export function TopbarShell({ left, center, right, variant = "solid", centerGrow = "flex" }: Props) {
  return (
    <header
      className={cn(
        "sticky top-0 z-40 h-[var(--topbar-h)] border-b border-border flex items-center",
        variant === "solid" && "bg-bg-card",
        variant === "blur"  && "bg-bg-card/95 backdrop-blur-md",
      )}
    >
      <div
        className={cn(
          "w-full px-4 md:px-8 lg:px-12 flex items-center gap-4",
          centerGrow === "auto" && "justify-between",
        )}
      >
        <div className="flex items-center gap-3 shrink-0">{left}</div>

        {center && (
          <div
            className={cn(
              "min-w-0",
              centerGrow === "flex" && "flex-1 flex items-center justify-center",
              centerGrow === "auto" && "flex items-center",
            )}
          >
            {center}
          </div>
        )}

        <div className="flex items-center gap-2 ml-auto shrink-0">{right}</div>
      </div>
    </header>
  );
}
