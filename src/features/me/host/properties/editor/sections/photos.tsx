import { useRef, useState, useMemo, useEffect } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { ImagePlus, Loader2, X, Star } from "lucide-react";
import { toast } from "sonner";
import { useListing } from "@/lib/hooks/use-listings";
import { useReferences } from "@/lib/hooks/use-references";
import { listingsApi } from "@/lib/api/listings.api";
import { cn } from "@/lib/utils/cn";
import type { SectionDef, SectionFormProps } from "../types";
import { toCreateListingRequest } from "../mappers";

const MAX_PHOTOS = 10;
const MAX_FILE_BYTES = 15 * 1024 * 1024; // 15 MB
// .heic / .heif are Apple's default — most servers can't display them in
// browsers without server-side conversion, so reject them with a clear hint.
const ALLOWED_MIME = new Set(["image/jpeg", "image/png", "image/webp", "image/gif"]);

// Shared file-validation: same rules whether we're uploading right away
// (edit mode) or buffering for after-create (create mode).
function validateFiles(files: File[], remainingSlots: number, totalRequested: number): {
  accepted: File[];
  rejected: { name: string; reason: string }[];
  slotWarning: string | null;
} {
  const rejected: { name: string; reason: string }[] = [];
  const accepted: File[] = [];
  const slotWarning = totalRequested > remainingSlots
    ? `Only ${remainingSlots} slot${remainingSlots === 1 ? "" : "s"} left — taking the first ${remainingSlots}.`
    : null;
  for (const file of files) {
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
  return { accepted, rejected, slotWarning };
}

function PhotosDialog({
  draft,
  listingId,
  assetId,
  mode,
  pendingPhotos = [],
  addPendingPhotos,
  removePendingPhotoAt,
  movePendingPhotoToCover,
  stagedPhotos = [],
  removeStagedPhotoAt,
}: SectionFormProps) {
  const { data: listing } = useListing(listingId);
  const { data: refs } = useReferences();
  const qc = useQueryClient();
  const inputRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);
  const [deleting, setDeleting] = useState<string | null>(null);

  const media = listing?.media ?? [];
  // In create mode we have no listing yet → render local File previews.
  // In edit mode previews come from server media.
  const isCreate = mode === "create";

  // Stable object URLs for the locally-buffered files — revoked on unmount /
  // when the file is removed so we don't leak blobs.
  const localPreviews = useMemo(
    () => pendingPhotos.map((f) => ({ file: f, url: URL.createObjectURL(f) })),
    [pendingPhotos],
  );
  useEffect(() => {
    return () => { localPreviews.forEach((p) => URL.revokeObjectURL(p.url)); };
  }, [localPreviews]);

  // BUG-331: restored staged photos (from a prior session) count toward the
  // create-mode total and render before freshly-picked pending files.
  const totalCount = isCreate ? stagedPhotos.length + pendingPhotos.length : media.length;
  const hasRestored = isCreate && stagedPhotos.length > 0;

  // ── CREATE-MODE handlers ──────────────────────────────────────────────────
  function handleCreateModeUpload(files: FileList | null) {
    if (!files || !addPendingPhotos) return;
    const slots = MAX_PHOTOS - (stagedPhotos.length + pendingPhotos.length);
    const { accepted, rejected, slotWarning } = validateFiles(Array.from(files).slice(0, slots), slots, files.length);
    if (slotWarning) toast.warning(slotWarning);
    if (rejected.length > 0) {
      toast.error(`${rejected.length} file${rejected.length === 1 ? "" : "s"} skipped:\n${rejected.map(r => `• ${r.name} — ${r.reason}`).join("\n")}`);
    }
    if (accepted.length > 0) addPendingPhotos(accepted);
  }

  function moveLocalToCover(index: number) {
    if (index === 0 || !movePendingPhotoToCover) return;
    movePendingPhotoToCover(index);
  }

  // ── EDIT-MODE handlers ────────────────────────────────────────────────────
  async function handleEditModeUpload(files: FileList | null) {
    if (!files) return;

    // BUG-115: listing may not exist yet (Phase 3 failed during initial save).
    // Auto-create it before uploading so photos don't silently no-op.
    let effectiveLid = listingId;
    if (!effectiveLid && assetId && draft) {
      try {
        const propertyCategoryId = refs?.propertyCategories?.[0]?.id ?? 1;
        const created = await listingsApi.create(
          toCreateListingRequest(draft, assetId, propertyCategoryId),
        );
        effectiveLid = created.id;
        await qc.invalidateQueries({ queryKey: ["listings"] });
      } catch {
        toast.error("Couldn't prepare listing for upload — try saving another section first.");
        return;
      }
    }
    if (!effectiveLid) return;
    const slots = MAX_PHOTOS - media.length;
    const { accepted, rejected, slotWarning } = validateFiles(Array.from(files).slice(0, slots), slots, files.length);
    if (slotWarning) toast.warning(slotWarning);
    if (rejected.length > 0) {
      toast.error(`${rejected.length} file${rejected.length === 1 ? "" : "s"} skipped:\n${rejected.map(r => `• ${r.name} — ${r.reason}`).join("\n")}`);
    }
    if (accepted.length === 0) return;

    setUploading(true);
    const results = await Promise.allSettled(
      accepted.map((file) => listingsApi.uploadMedia(effectiveLid, file)),
    );
    await qc.invalidateQueries({ queryKey: ["listings", effectiveLid] });
    const failures = accepted
      .filter((_, i) => results[i].status === "rejected")
      .map((f) => f.name || "photo");
    const succeeded = accepted.length - failures.length;
    if (succeeded > 0 && failures.length === 0) toast.success(`${succeeded} photo${succeeded === 1 ? "" : "s"} uploaded`);
    else if (succeeded > 0) toast.warning(`${succeeded} uploaded · ${failures.length} failed: ${failures.join(", ")}`);
    else if (failures.length > 0) toast.error(`Failed: ${failures.join(", ")}`);
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

  return (
    <div>
      <input
        ref={inputRef}
        type="file"
        accept="image/jpeg,image/png,image/webp,image/gif"
        multiple
        hidden
        onChange={(e) => {
          if (isCreate) handleCreateModeUpload(e.target.files);
          else handleEditModeUpload(e.target.files);
          // Reset so re-selecting the same file re-triggers onChange.
          if (inputRef.current) inputRef.current.value = "";
        }}
      />

      <div className="grid grid-cols-4 gap-2.5 mb-3">
        {/* Edit-mode: server media */}
        {!isCreate && media.map((m, i) => (
          <div key={m.id} className="relative aspect-square rounded-xl overflow-hidden border border-border bg-bg-subtle group">
            <img src={m.url} alt="" className="w-full h-full object-cover" />
            {i === 0 && (
              <span className="absolute left-1.5 bottom-1.5 bg-black/60 text-white text-[10px] font-semibold px-2 py-0.5 rounded-md uppercase tracking-wider">★ Cover</span>
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

        {/* Create-mode: restored staged photos (prior session). Preview-only —
            BUG-331: these survive a reload so the host's uploads aren't lost. */}
        {isCreate && stagedPhotos.map((s, i) => (
          <div key={s.stagedMediaId} className="relative aspect-square rounded-xl overflow-hidden border border-border bg-bg-subtle group">
            <img src={s.url} alt="" className="w-full h-full object-cover" />
            {i === 0 && (
              <span className="absolute left-1.5 bottom-1.5 bg-black/60 text-white text-[10px] font-semibold px-2 py-0.5 rounded-md uppercase tracking-wider">★ Cover</span>
            )}
            <button
              type="button"
              onClick={() => removeStagedPhotoAt?.(i)}
              className="absolute top-1.5 right-1.5 w-6 h-6 rounded-full bg-black/60 text-white flex items-center justify-center hover:bg-black/80"
              title="Remove photo"
            >
              <X size={12} />
            </button>
            <span className="absolute top-1.5 left-1.5 bg-emerald-600/80 text-white text-[10px] px-1.5 py-0.5 rounded-md">
              Saved
            </span>
          </div>
        ))}

        {/* Create-mode: local previews */}
        {isCreate && localPreviews.map((p, i) => (
          <div key={p.url} className="relative aspect-square rounded-xl overflow-hidden border border-border bg-bg-subtle group">
            <img src={p.url} alt="" className="w-full h-full object-cover" />
            {i === 0 && !hasRestored && (
              <span className="absolute left-1.5 bottom-1.5 bg-black/60 text-white text-[10px] font-semibold px-2 py-0.5 rounded-md uppercase tracking-wider">★ Cover</span>
            )}
            {/* Cover lives among the restored photos when any exist, so the
                pending set-cover control only makes sense with no restored. */}
            {!hasRestored && i > 0 && (
              <button
                type="button"
                onClick={() => moveLocalToCover(i)}
                className="absolute left-1.5 bottom-1.5 bg-black/60 text-white text-[10px] font-semibold px-2 py-0.5 rounded-md uppercase tracking-wider opacity-0 group-hover:opacity-100 transition-opacity flex items-center gap-1 hover:bg-black/80"
                title="Set as cover photo (re-orders on save)"
              >
                <Star size={9} /> Set cover
              </button>
            )}
            <button
              type="button"
              onClick={() => removePendingPhotoAt?.(i)}
              className="absolute top-1.5 right-1.5 w-6 h-6 rounded-full bg-black/60 text-white flex items-center justify-center hover:bg-black/80"
              title="Remove photo"
            >
              <X size={12} />
            </button>
            <span className="absolute top-1.5 left-1.5 bg-black/60 text-white text-[10px] px-1.5 py-0.5 rounded-md">
              Pending
            </span>
          </div>
        ))}

        {totalCount < MAX_PHOTOS && (
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
        {totalCount} of {MAX_PHOTOS} · min 1 to publish
        {isCreate && totalCount > 0 && " · upload happens when you save"}
        {!isCreate && " · Aim for 5+ for more inquiries"}
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
  // No longer editOnly — host can attach photos right in create mode; they
  // upload after createListing succeeds (see use-editor commitFirstSave).
  isComplete: (d) => d.photoCount >= 1,
  summary: (d) =>
    d.photoCount === 0
      ? "Upload photos to attract more tenants"
      : `${d.photoCount} ${d.photoCount === 1 ? "photo" : "photos"} uploaded`,
  Form: PhotosDialog,
};
