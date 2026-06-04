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

// BUG-301: heuristic — strings that look like local filenames (no scheme,
// no leading slash, just a name with an extension) leaked into the BE seed
// or partial uploads and produced a broken image with the filename leaking
// as alt-text. We treat them as missing rather than asking the browser to
// resolve them.
function looksLikeBareFilename(s: string): boolean {
  if (s.startsWith("http://") || s.startsWith("https://") || s.startsWith("/") || s.startsWith("data:") || s.startsWith("blob:")) {
    return false;
  }
  return /\.[a-z0-9]{2,5}$/i.test(s);
}

/**
 * Drop-in replacement for <img> that swaps to PhotoPlaceholder if the
 * source 404s or fails to load (CDN miss, dead URL, etc.) — avoids
 * the browser's broken-image icon which looks like a bug to tenants.
 *
 * BUG-301: also (1) treats bare-filename sources as missing up-front, and
 * (2) clears alt-text so partial-load failures never leak the filename to
 * the viewport while the onError handler is still mid-flight.
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
  const safeSrc = typeof src === "string" && looksLikeBareFilename(src) ? undefined : src;
  if (!safeSrc || errored) {
    return <PhotoPlaceholder label={placeholderLabel} iconSize={placeholderIconSize} className={className} />;
  }
  return (
    <img
      src={safeSrc}
      // Decorative — the card title sits beneath the image and is the
      // semantic label tenants read. An empty alt prevents broken-load
      // states from rendering raw filenames or URLs in the viewport.
      alt={alt && alt.trim() && !looksLikeBareFilename(alt) ? alt : ""}
      onError={() => setErrored(true)}
      className={className}
      {...imgProps}
    />
  );
}
