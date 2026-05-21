import { useRef, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { ImagePlus, Loader2, X, Star } from "lucide-react";
import { toast } from "sonner";
import { useListing } from "@/lib/hooks/use-listings";
import { listingsApi } from "@/lib/api/listings.api";
import { cn } from "@/lib/utils/cn";
import type { SectionDef, SectionDialogProps } from "../types";

const MAX_PHOTOS = 10;
const MAX_FILE_BYTES = 15 * 1024 * 1024; // 15 MB
// .heic / .heif are Apple's default — most servers can't display them in
// browsers without server-side conversion, so reject them with a clear hint.
const ALLOWED_MIME = new Set(["image/jpeg", "image/png", "image/webp", "image/gif"]);

function PhotosDialog({ listingId }: SectionDialogProps) {
  const { data: listing } = useListing(listingId);
  const qc = useQueryClient();
  const inputRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);
  const [deleting, setDeleting] = useState<string | null>(null);

  const media = listing?.media ?? [];

  async function handleUpload(files: FileList | null) {
    if (!files || !listingId) return;
    const slots = MAX_PHOTOS - media.length;
    const candidates = Array.from(files).slice(0, slots);

    // Up-front validation so the user sees one consolidated error instead of
    // partial uploads with vague "couldn't upload some photos".
    const rejected: { name: string; reason: string }[] = [];
    const accepted: File[] = [];
    for (const file of candidates) {
      const name = file.name || "photo";
      const isHeic = /\.(heic|heif)$/i.test(name);
      if (isHeic) {
        rejected.push({ name, reason: "HEIC/HEIF not supported — export as JPEG" });
      } else if (!ALLOWED_MIME.has(file.type)) {
        rejected.push({ name, reason: `Format ${file.type || "unknown"} not supported` });
      } else if (file.size > MAX_FILE_BYTES) {
        rejected.push({ name, reason: `${(file.size / 1_048_576).toFixed(1)} MB — limit is 15 MB` });
      } else {
        accepted.push(file);
      }
    }

    if (files.length > slots) {
      toast.warning(`Only ${slots} slot${slots === 1 ? "" : "s"} left — taking the first ${slots}.`);
    }
    if (rejected.length > 0) {
      // Show each rejection so the host knows exactly which file was the problem.
      toast.error(`${rejected.length} file${rejected.length === 1 ? "" : "s"} skipped:\n${rejected.map(r => `• ${r.name} — ${r.reason}`).join("\n")}`);
    }
    if (accepted.length === 0) return;

    setUploading(true);
    const failures: string[] = [];
    for (const file of accepted) {
      try {
        await listingsApi.uploadMedia(listingId, file);
      } catch {
        failures.push(file.name || "photo");
      }
    }
    await qc.invalidateQueries({ queryKey: ["listings", listingId] });
    const succeeded = accepted.length - failures.length;
    if (succeeded > 0 && failures.length === 0) {
      toast.success(`${succeeded} photo${succeeded === 1 ? "" : "s"} uploaded`);
    } else if (succeeded > 0) {
      toast.warning(`${succeeded} uploaded · ${failures.length} failed: ${failures.join(", ")}`);
    } else if (failures.length > 0) {
      toast.error(`Failed: ${failures.join(", ")}`);
    }
    setUploading(false);
  }

  async function handleDelete(mediaId: string) {
    if (!listingId) return;
    setDeleting(mediaId);
    try {
      await listingsApi.deleteMedia(listingId, mediaId);
      await qc.invalidateQueries({ queryKey: ["listings", listingId] });
    } catch {
      toast.error("Couldn't delete photo");
    } finally {
      setDeleting(null);
    }
  }

  // Move a photo to position 0 (cover). Calls the reorder endpoint with the
  // chosen photo first, the rest in current order.
  async function makeCover(mediaId: string) {
    if (!listingId || media.length < 2) return;
    const next = [mediaId, ...media.filter((m) => m.id !== mediaId).map((m) => m.id)];
    try {
      await listingsApi.reorderMedia(listingId, next);
      await qc.invalidateQueries({ queryKey: ["listings", listingId] });
      toast.success("Cover photo updated");
    } catch {
      toast.error("Couldn't update cover");
    }
  }

  if (!listingId) {
    return (
      <div className="rounded-xl bg-bg-subtle p-6 text-center text-sm text-fg-muted">
        Save your property first to upload photos.
      </div>
    );
  }

  return (
    <div>
      <input
        ref={inputRef}
        type="file"
        accept="image/jpeg,image/png,image/webp,image/gif"
        multiple
        hidden
        onChange={(e) => {
          handleUpload(e.target.files);
          // Reset so re-selecting the same file re-triggers onChange (otherwise
          // browser caches and skips the second attempt).
          if (inputRef.current) inputRef.current.value = "";
        }}
      />
      <div className="grid grid-cols-4 gap-2.5 mb-3">
        {media.map((m, i) => (
          <div
            key={m.id}
            className="relative aspect-square rounded-xl overflow-hidden border border-border bg-bg-subtle group"
          >
            <img src={m.url} alt="" className="w-full h-full object-cover" />
            {i === 0 && (
              <span className="absolute left-1.5 bottom-1.5 bg-black/60 text-white text-[10px] font-semibold px-2 py-0.5 rounded-md uppercase tracking-wider">
                ★ Cover
              </span>
            )}
            {i > 0 && (
              <button
                type="button"
                onClick={() => makeCover(m.id)}
                className="absolute left-1.5 bottom-1.5 bg-black/60 text-white text-[10px] font-semibold px-2 py-0.5 rounded-md uppercase tracking-wider opacity-0 group-hover:opacity-100 transition-opacity flex items-center gap-1 hover:bg-black/80"
                title="Set as cover photo"
              >
                <Star size={9} /> Set cover
              </button>
            )}
            <button
              type="button"
              disabled={deleting === m.id}
              onClick={() => handleDelete(m.id)}
              className="absolute top-1.5 right-1.5 w-6 h-6 rounded-full bg-black/60 text-white flex items-center justify-center hover:bg-black/80 disabled:opacity-50"
            >
              {deleting === m.id ? <Loader2 size={12} className="animate-spin" /> : <X size={12} />}
            </button>
          </div>
        ))}
        {media.length < MAX_PHOTOS && (
          <button
            type="button"
            onClick={() => inputRef.current?.click()}
            disabled={uploading}
            className={cn(
              "aspect-square rounded-xl border-2 border-dashed flex flex-col items-center justify-center gap-1.5 text-fg-muted hover:border-fg-subtle hover:text-fg transition-colors",
              uploading && "opacity-50 cursor-wait",
            )}
          >
            {uploading ? <Loader2 size={20} className="animate-spin" /> : <ImagePlus size={20} />}
            <span className="text-[11px]">Add</span>
          </button>
        )}
      </div>
      <div className="text-xs text-fg-muted text-center mb-2">
        {media.length} of {MAX_PHOTOS} photos · Aim for 5+ for more inquiries
      </div>
      <div className="text-[11px] text-fg-subtle bg-bg-subtle rounded-lg px-3 py-2">
        <span className="font-semibold text-fg-muted">Tips for the cover photo:</span> use the main living area in landscape, well-lit and uncluttered. Avoid close-ups of pets, signage, appliances, QR codes — tenants scrolling the marketplace need to recognise the room instantly.
      </div>
    </div>
  );
}

export const photosSection: SectionDef = {
  id: "photos",
  label: "Photos",
  group: "media",
  required: true,
  estTime: "3 min",
  editOnly: true,
  isComplete: (d) => d.photoCount >= 1,
  summary: (d) =>
    d.photoCount === 0
      ? "Upload photos to attract more tenants"
      : `${d.photoCount} ${d.photoCount === 1 ? "photo" : "photos"} uploaded`,
  Form: PhotosDialog,
};
