import { useState, type ImgHTMLAttributes } from "react";
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

/**
 * Drop-in replacement for <img> that swaps to PhotoPlaceholder if the
 * source 404s or fails to load (CDN miss, dead URL, etc.) — avoids
 * the browser's broken-image icon which looks like a bug to tenants.
 */
export function ListingImage({
  src,
  alt,
  className,
  placeholderLabel,
  placeholderIconSize,
  ...imgProps
}: ImgHTMLAttributes<HTMLImageElement> & {
  placeholderLabel?: string;
  placeholderIconSize?: number;
}) {
  const [errored, setErrored] = useState(false);
  if (!src || errored) {
    return <PhotoPlaceholder label={placeholderLabel} iconSize={placeholderIconSize} className={className} />;
  }
  return (
    <img
      src={src}
      alt={alt}
      onError={() => setErrored(true)}
      className={className}
      {...imgProps}
    />
  );
}
