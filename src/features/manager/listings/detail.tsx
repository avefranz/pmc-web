import { useState } from "react";
import { useParams, Link } from "react-router-dom";
import { ArrowLeft, Upload, Wifi, Eye, EyeOff } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { FileUploadButton } from "@/components/shared/file-upload-button";
import { useListing, useUpdateAmenities, useUploadListingMedia } from "@/lib/hooks/use-listings";
import { useAmenities, useAmenityCategories } from "@/lib/hooks/use-references";
import { AmenityToggleGrid } from "@/components/shared/amenity-toggle-grid";
import { formatThb } from "@/lib/utils/format";
import { RentalType } from "@/lib/types/enums";
import { toast } from "sonner";


export default function ListingDetailPage() {
  const { id } = useParams<{ id: string }>();
  const { data: listing, isLoading } = useListing(id!);
  const { data: amenityDefs } = useAmenities();
  const { data: amenityCategories } = useAmenityCategories();
  const updateAmenities = useUpdateAmenities(id!);
  const uploadMedia = useUploadListingMedia(id!);
  const [showPass, setShowPass] = useState(false);
  const [pendingAmenities, setPendingAmenities] = useState<Record<number, boolean>>({});

  const [presentSet, setPresentSet] = useState<Set<number>>(
    () => new Set((listing?.amenities ?? []).filter((a) => a.isPresent).map((a) => Number(a.amenityId)))
  );

  async function handleMediaUpload(file: File) {
    try {
      await uploadMedia.mutateAsync(file);
      toast.success("Photo uploaded");
    } catch {
      toast.error("Upload failed");
    }
  }

  async function handleToggleAmenity(amenityId: number, isPresent: boolean) {
    if (!listing) return;
    const newValue = !isPresent;
    const newPresentSet = new Set(presentSet);
    if (newValue) newPresentSet.add(amenityId);
    else newPresentSet.delete(amenityId);

    setPresentSet(newPresentSet);
    setPendingAmenities((p) => ({ ...p, [amenityId]: true }));
    try {
      const updated = (amenityDefs ?? []).map((def) => ({
        amenityId: def.id,
        isPresent: newPresentSet.has(def.id),
      }));
      await updateAmenities.mutateAsync(updated);
    } catch {
      setPresentSet(presentSet);
      toast.error("Failed to update amenity");
    } finally {
      setPendingAmenities((p) => { const n = { ...p }; delete n[amenityId]; return n; });
    }
  }

  if (isLoading) {
    return (
      <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
        <Skeleton className="h-8 w-48" />
        <Skeleton className="h-40 w-full" />
        <Skeleton className="h-40 w-full" />
      </div>
    );
  }

  if (!listing) return <div style={{ color: "var(--ink-3)" }}>Listing not found.</div>;

  return (
    <div>
      {/* Back */}
      <div style={{ marginBottom: 20 }}>
        <Link to="/manager/assets" className="bm-pagehead__back">
          <ArrowLeft size={12} /> Back to properties
        </Link>
      </div>

      {/* Header */}
      <div className="adm-pagehead">
        <div>
          <div className="adm-pagehead__eyebrow">Listing</div>
          <h1 className="adm-pagehead__title">{listing.title}</h1>
        </div>
        <div className="adm-pagehead__actions">
          <span style={{ fontFamily: "var(--mono)", fontSize: 13, color: "var(--ink-3)" }}>
            {listing.rentalType === RentalType.LongTerm
              ? `${formatThb(listing.baseMonthlyRate ?? listing.basePrice * 30)}/mo`
              : `${formatThb(listing.basePrice)}/night`}
          </span>
        </div>
      </div>

      {/* 2-col grid */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 20 }}>

        {/* Wi-Fi */}
        <div className="adm-card">
          <div className="adm-card__head">
            <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
              <Wifi size={13} />
              <div className="adm-card__title">Wi-Fi</div>
            </div>
          </div>
          <div style={{ padding: "0 20px 16px", display: "flex", flexDirection: "column", gap: 12 }}>
            <div>
              <p style={{ fontFamily: "var(--mono)", fontSize: 10, color: "var(--ink-4)", letterSpacing: "0.1em", textTransform: "uppercase", marginBottom: 6 }}>
                Network name
              </p>
              <p style={{ fontFamily: "var(--mono)", fontSize: 13 }}>{listing.wifiName || "—"}</p>
            </div>
            <div>
              <p style={{ fontFamily: "var(--mono)", fontSize: 10, color: "var(--ink-4)", letterSpacing: "0.1em", textTransform: "uppercase", marginBottom: 6 }}>
                Password
              </p>
              <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                <input
                  type={showPass ? "text" : "password"}
                  value={listing.wifiPassword || ""}
                  readOnly
                  className="bm-input"
                  style={{ flex: 1, height: 36 }}
                />
                <button
                  className="adm-btn adm-btn--ghost adm-btn--sm"
                  onClick={() => setShowPass((p) => !p)}
                >
                  {showPass ? <EyeOff size={13} /> : <Eye size={13} />}
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Photos */}
        <div className="adm-card">
          <div className="adm-card__head">
            <div className="adm-card__title">Photos</div>
            <FileUploadButton onFile={handleMediaUpload} accept="image/*">
              <button
                className="adm-btn adm-btn--ghost adm-btn--sm"
                disabled={uploadMedia.isPending}
                style={{ display: "flex", alignItems: "center", gap: 4 }}
              >
                <Upload size={12} />
                {uploadMedia.isPending ? "Uploading…" : "Upload"}
              </button>
            </FileUploadButton>
          </div>
          <div style={{ padding: "0 20px 16px" }}>
            {!listing.media.length ? (
              <p style={{ fontFamily: "var(--mono)", fontSize: 11, color: "var(--ink-4)" }}>No photos yet.</p>
            ) : (
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 6 }}>
                {listing.media.map((m) => (
                  <img
                    key={m.id}
                    src={m.url}
                    alt={m.caption ?? ""}
                    style={{ width: "100%", aspectRatio: "1", objectFit: "cover" }}
                  />
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Amenities */}
        <div className="adm-card" style={{ gridColumn: "span 2" }}>
          <div className="adm-card__head">
            <div className="adm-card__title">Amenities</div>
          </div>
          <div style={{ padding: "0 20px 20px" }}>
            {!amenityDefs ? (
              <p style={{ fontFamily: "var(--mono)", fontSize: 11, color: "var(--ink-4)" }}>Loading amenities…</p>
            ) : !amenityDefs.length ? (
              <p style={{ fontFamily: "var(--mono)", fontSize: 11, color: "var(--ink-4)" }}>No amenities configured.</p>
            ) : (
              <AmenityToggleGrid
                amenities={amenityDefs}
                categories={amenityCategories}
                presentSet={presentSet}
                pending={pendingAmenities}
                onToggle={handleToggleAmenity}
              />
            )}
          </div>
        </div>

        {/* Description */}
        {listing.description && (
          <div className="adm-card" style={{ gridColumn: "span 2" }}>
            <div className="adm-card__head">
              <div className="adm-card__title">Description</div>
            </div>
            <div style={{ padding: "0 20px 20px" }}>
              <p style={{ fontFamily: "var(--sans)", fontSize: 13, lineHeight: 1.6, color: "var(--ink-3)", whiteSpace: "pre-wrap" }}>
                {listing.description}
              </p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
