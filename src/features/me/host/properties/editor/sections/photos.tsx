import { useRef, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { ImagePlus, Loader2, X } from "lucide-react";
import { toast } from "sonner";
import { useListing } from "@/lib/hooks/use-listings";
import { listingsApi } from "@/lib/api/listings.api";
import { cn } from "@/lib/utils/cn";
import type { SectionDef, SectionDialogProps } from "../types";

const MAX_PHOTOS = 10;

function PhotosDialog({ listingId }: SectionDialogProps) {
  const { data: listing } = useListing(listingId);
  const qc = useQueryClient();
  const inputRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);
  const [deleting, setDeleting] = useState<string | null>(null);

  const media = listing?.media ?? [];

  async function handleUpload(files: FileList | null) {
    if (!files || !listingId) return;
    setUploading(true);
    try {
      for (const file of Array.from(files).slice(0, MAX_PHOTOS - media.length)) {
        await listingsApi.uploadMedia(listingId, file);
      }
      await qc.invalidateQueries({ queryKey: ["listings", listingId] });
      toast.success("Photos uploaded");
    } catch {
      toast.error("Couldn't upload some photos");
    } finally {
      setUploading(false);
    }
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
        accept="image/*"
        multiple
        hidden
        onChange={(e) => handleUpload(e.target.files)}
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
      <div className="text-xs text-fg-muted text-center">
        {media.length} of {MAX_PHOTOS} photos · Aim for 5+ for more inquiries
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
