import * as React from "react";
import * as DialogPrimitive from "@radix-ui/react-dialog";
import { X, ChevronLeft, ChevronRight, Download } from "lucide-react";
import { cn } from "@/lib/utils/cn";

export interface LightboxImage {
  url: string;
  name?: string;
}

interface LightboxProps {
  images: LightboxImage[];
  initialIndex?: number;
  open: boolean;
  onClose: () => void;
}

export function Lightbox({ images, initialIndex = 0, open, onClose }: LightboxProps) {
  const [index, setIndex] = React.useState(initialIndex);

  React.useEffect(() => {
    setIndex(initialIndex);
  }, [initialIndex, open]);

  React.useEffect(() => {
    if (!open) return;
    function onKey(e: KeyboardEvent) {
      if (e.key === "ArrowRight") setIndex((i) => (i + 1) % images.length);
      if (e.key === "ArrowLeft") setIndex((i) => (i - 1 + images.length) % images.length);
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, images.length]);

  const current = images[index];
  if (!current) return null;

  return (
    <DialogPrimitive.Root open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogPrimitive.Portal>
        <DialogPrimitive.Overlay className="fixed inset-0 z-50 bg-black/90 data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0" />

        <DialogPrimitive.Content
          className="fixed inset-0 z-50 flex flex-col items-center justify-center focus:outline-none"
          onClick={onClose}
        >
          {/* Top bar */}
          <div
            className="absolute top-0 left-0 right-0 flex items-center justify-between px-4 py-3 z-10"
            onClick={(e) => e.stopPropagation()}
          >
            <span className="text-white/60 text-sm">
              {images.length > 1 && `${index + 1} / ${images.length}`}
              {current.name && (
                <span className="ml-2 text-white/80 font-medium">{current.name}</span>
              )}
            </span>
            <div className="flex items-center gap-2">
              <a
                href={current.url}
                target="_blank"
                rel="noopener noreferrer"
                download
                onClick={(e) => e.stopPropagation()}
                className="h-8 w-8 rounded-lg bg-white/10 hover:bg-white/20 flex items-center justify-center transition-colors"
                title="Open original"
              >
                <Download className="h-4 w-4 text-white" />
              </a>
              <button
                onClick={(e) => { e.stopPropagation(); onClose(); }}
                className="h-8 w-8 rounded-lg bg-white/10 hover:bg-white/20 flex items-center justify-center transition-colors"
              >
                <X className="h-4 w-4 text-white" />
              </button>
            </div>
          </div>

          {/* Prev */}
          {images.length > 1 && (
            <button
              className="absolute left-4 top-1/2 -translate-y-1/2 h-10 w-10 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center transition-colors z-10"
              onClick={(e) => { e.stopPropagation(); setIndex((i) => (i - 1 + images.length) % images.length); }}
            >
              <ChevronLeft className="h-5 w-5 text-white" />
            </button>
          )}

          {/* Image */}
          <img
            key={current.url}
            src={current.url}
            alt={current.name ?? ""}
            onClick={(e) => e.stopPropagation()}
            className="max-h-[85vh] max-w-[85vw] object-contain rounded-lg shadow-2xl select-none"
            style={{ animation: "fadeIn 0.15s ease" }}
          />

          {/* Next */}
          {images.length > 1 && (
            <button
              className="absolute right-4 top-1/2 -translate-y-1/2 h-10 w-10 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center transition-colors z-10"
              onClick={(e) => { e.stopPropagation(); setIndex((i) => (i + 1) % images.length); }}
            >
              <ChevronRight className="h-5 w-5 text-white" />
            </button>
          )}

          {/* Thumbnail strip (only when multiple) */}
          {images.length > 1 && (
            <div
              className="absolute bottom-4 flex gap-2 px-4 overflow-x-auto max-w-full"
              onClick={(e) => e.stopPropagation()}
            >
              {images.map((img, i) => (
                <button
                  key={img.url}
                  onClick={() => setIndex(i)}
                  className={cn(
                    "h-12 w-12 rounded-md overflow-hidden shrink-0 border-2 transition-all",
                    i === index ? "border-white scale-110" : "border-transparent opacity-50 hover:opacity-80",
                  )}
                >
                  <img src={img.url} alt="" className="h-full w-full object-cover" />
                </button>
              ))}
            </div>
          )}
        </DialogPrimitive.Content>
      </DialogPrimitive.Portal>
    </DialogPrimitive.Root>
  );
}

/** Hook to open a lightbox from a list of URLs with a click index */
export function useLightbox(images: LightboxImage[]) {
  const [open, setOpen] = React.useState(false);
  const [startIndex, setStartIndex] = React.useState(0);

  function openAt(i: number) {
    setStartIndex(i);
    setOpen(true);
  }

  const lightbox = (
    <Lightbox images={images} initialIndex={startIndex} open={open} onClose={() => setOpen(false)} />
  );

  return { openAt, lightbox };
}
