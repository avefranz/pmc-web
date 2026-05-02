import { useState } from "react";
import { useParams, Link } from "react-router-dom";
import { ArrowLeft, Upload, Wifi, Eye, EyeOff } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
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

  async function handleToggleAmenity(id: number, isPresent: boolean) {
    if (!listing) return;
    const newValue = !isPresent;
    const newPresentSet = new Set(presentSet);
    if (newValue) newPresentSet.add(id);
    else newPresentSet.delete(id);

    setPresentSet(newPresentSet);
    setPendingAmenities((p) => ({ ...p, [id]: true }));
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
      setPendingAmenities((p) => { const n = { ...p }; delete n[id]; return n; });
    }
  }

  if (isLoading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-8 w-48" />
        <Skeleton className="h-40 w-full" />
        <Skeleton className="h-40 w-full" />
      </div>
    );
  }

  if (!listing) return <div className="text-muted-foreground">Listing not found.</div>;

  return (
    <div>
      <div className="flex items-center gap-2 mb-6">
        <Link to="/manager/assets">
          <Button variant="ghost" size="sm">
            <ArrowLeft className="h-4 w-4 mr-1" /> Back
          </Button>
        </Link>
      </div>

      <div className="flex items-start justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold">{listing.title}</h1>
          <p className="text-muted-foreground text-sm mt-1">
            {listing.rentalType === RentalType.LongTerm
              ? `${formatThb(listing.baseMonthlyRate ?? listing.basePrice * 30)}/mo`
              : `${formatThb(listing.basePrice)}/night`}
          </p>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-6">
        {/* Wi-Fi */}
        <Card>
          <CardHeader><CardTitle className="text-base flex items-center gap-2"><Wifi className="h-4 w-4" />Wi-Fi</CardTitle></CardHeader>
          <CardContent className="space-y-3">
            <div>
              <Label className="text-xs text-muted-foreground">Network name</Label>
              <p className="font-medium text-sm mt-1">{listing.wifiName || "—"}</p>
            </div>
            <div>
              <Label className="text-xs text-muted-foreground">Password</Label>
              <div className="flex items-center gap-2 mt-1">
                <Input
                  type={showPass ? "text" : "password"}
                  value={listing.wifiPassword || ""}
                  readOnly
                  className="font-mono text-sm h-8"
                />
                <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => setShowPass((p) => !p)}>
                  {showPass ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Photos */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle className="text-base">Photos</CardTitle>
              <FileUploadButton onFile={handleMediaUpload} accept="image/*">
                <Button size="sm" variant="outline" disabled={uploadMedia.isPending}>
                  <Upload className="h-4 w-4 mr-1" />
                  {uploadMedia.isPending ? "Uploading..." : "Upload"}
                </Button>
              </FileUploadButton>
            </div>
          </CardHeader>
          <CardContent>
            {!listing.media.length ? (
              <p className="text-sm text-muted-foreground">No photos yet.</p>
            ) : (
              <div className="grid grid-cols-3 gap-2">
                {listing.media.map((m) => (
                  <img
                    key={m.id}
                    src={m.url}
                    alt={m.caption ?? ""}
                    className="w-full aspect-square object-cover rounded-md"
                  />
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Amenities */}
        <Card className="col-span-2">
          <CardHeader><CardTitle className="text-base">Amenities</CardTitle></CardHeader>
          <CardContent>
            {!amenityDefs ? (
              <p className="text-sm text-muted-foreground">Loading amenities…</p>
            ) : !amenityDefs.length ? (
              <p className="text-sm text-muted-foreground">No amenities configured in the system.</p>
            ) : (
              <AmenityToggleGrid
                amenities={amenityDefs}
                categories={amenityCategories}
                presentSet={presentSet}
                pending={pendingAmenities}
                onToggle={handleToggleAmenity}
              />
            )}
          </CardContent>
        </Card>

        {/* Description */}
        {listing.description && (
          <Card className="col-span-2">
            <CardHeader><CardTitle className="text-base">Description</CardTitle></CardHeader>
            <CardContent>
              <p className="text-sm whitespace-pre-wrap text-muted-foreground">{listing.description}</p>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}
