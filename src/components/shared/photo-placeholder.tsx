import { Home } from "lucide-react";
import { cn } from "@/lib/utils/cn";

/**
 * Theme-aware placeholder shown when a listing/asset has no real photo.
 * NEVER fall back to a stock Unsplash image — that would mislead tenants
 * about what they're booking. Use this component instead.
 */
export function PhotoPlaceholder({
  label = "Photo coming soon",
  className,
  iconSize = 32,
}: {
  label?: string;
  className?: string;
  iconSize?: number;
}) {
  return (
    <div
      className={cn(
        "w-full h-full flex flex-col items-center justify-center gap-2 bg-bg-subtle text-fg-subtle",
        className,
      )}
    >
      <Home size={iconSize} strokeWidth={1.4} />
      {label && (
        <span className="text-[10px] uppercase tracking-wider">{label}</span>
      )}
    </div>
  );
}
