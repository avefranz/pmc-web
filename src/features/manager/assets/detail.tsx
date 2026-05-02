import { useState, useRef } from "react";
import { useParams, Link, useNavigate } from "react-router-dom";
import {
  ArrowLeft, Plus, Trash2, Pencil, Wifi, Zap,
  ImagePlus, BedDouble, Bath, Users, X, AlertTriangle, Copy, Check, Link2,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { DatePicker } from "@/components/ui/date-picker";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useAsset, useAssetMembers, useAssetSummary, useDeleteAsset, useUnlinkLandlord } from "@/lib/hooks/use-assets";
import { useGenerateInvite } from "@/lib/hooks/use-invites";
import { buildInviteUrl } from "@/lib/api/invites.api";
import { InviteType } from "@/lib/types/enums";
import { useBookingsByAsset } from "@/lib/hooks/use-bookings";
import { useTicketsByAsset } from "@/lib/hooks/use-tickets";
import { useUtilitiesByAsset, useCreateUtility, useDeleteUtility } from "@/lib/hooks/use-utilities";
import { useListingsByAsset, useCreateNewVersion, useHotfixListing, usePublishListing } from "@/lib/hooks/use-listings";
import { useAmenities, useAmenityCategories } from "@/lib/hooks/use-references";
import { AmenityToggleGrid } from "@/components/shared/amenity-toggle-grid";
import { listingsApi } from "@/lib/api/listings.api";
import { formatThb, formatDate } from "@/lib/utils/format";
import { ticketStatusColor, ticketKindIcon } from "@/lib/utils/ticket-status";
import { UtilityType, RentalType, ListingStatus } from "@/lib/types/enums";
import type { AmenityDto, ListingMediaDto } from "@/lib/types";
import { toast } from "sonner";
import { useQueryClient } from "@tanstack/react-query";
import { cn } from "@/lib/utils/cn";

// ─── Sub-components ──────────────────────────────────────────────────────────

function OccupancyBadge({ status }: { status: string }) {
  const cls =
    status === "Occupied" ? "bg-green-100 text-green-700" :
    status === "ActionRequired" ? "bg-red-100 text-red-700" :
    "bg-gray-100 text-gray-600";
  return <Badge className={`border-0 ${cls}`}>{status}</Badge>;
}

function Section({
  title, action, children,
}: { title: string; action?: React.ReactNode; children: React.ReactNode }) {
  return (
    <div>
      <div className="flex items-center justify-between mb-3">
        <h2 className="font-semibold text-base">{title}</h2>
        {action}
      </div>
      {children}
    </div>
  );
}

// ─── Media / Photos ──────────────────────────────────────────────────────────

function MediaSection({ listingId, media }: { listingId: string; media: ListingMediaDto[] }) {
  const qc = useQueryClient();
  const [uploading, setUploading] = useState(false);
  const [deleting, setDeleting] = useState<string | null>(null);
  const [confirmId, setConfirmId] = useState<string | null>(null);
  const [lightboxUrl, setLightboxUrl] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  async function handleUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    try {
      await listingsApi.uploadMedia(listingId, file);
      qc.invalidateQueries({ queryKey: ["listings"] });
      toast.success("Photo uploaded");
    } catch {
      toast.error("Failed to upload photo");
    } finally {
      setUploading(false);
      if (inputRef.current) inputRef.current.value = "";
    }
  }

  async function handleDelete(mediaId: string) {
    setDeleting(mediaId);
    setConfirmId(null);
    try {
      await listingsApi.deleteMedia(listingId, mediaId);
      qc.invalidateQueries({ queryKey: ["listings"] });
      toast.success("Photo deleted");
    } catch (err: unknown) {
      const axiosErr = err as { response?: { status?: number; data?: { message?: string; title?: string } } };
      const status = axiosErr?.response?.status;
      const msg = axiosErr?.response?.data?.message ?? axiosErr?.response?.data?.title;
      toast.error(msg ? `Failed to delete photo: ${msg}` : `Failed to delete photo (${status ?? "network error"})`);
      console.error("Delete media error:", axiosErr?.response?.status, axiosErr?.response?.data);
    } finally {
      setDeleting(null);
    }
  }

  return (
    <>
      <div>
        <div className="grid gap-2 grid-cols-4 sm:grid-cols-5 lg:grid-cols-6">
          {media.map((m) => (
            <div key={m.id} className="aspect-video rounded-lg overflow-hidden bg-muted relative group">
              {/* Click to view full size */}
              <img
                src={m.url}
                alt={m.caption ?? "Property photo"}
                className="w-full h-full object-cover cursor-zoom-in"
                onClick={() => setLightboxUrl(m.url)}
              />

              {/* Delete button */}
              <button
                onClick={(e) => { e.stopPropagation(); setConfirmId(m.id); }}
                disabled={deleting === m.id}
                className="absolute top-1 right-1 bg-black/60 text-white rounded-full w-6 h-6 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity hover:bg-red-600 disabled:opacity-50"
              >
                {deleting === m.id
                  ? <div className="w-3 h-3 border border-white border-t-transparent rounded-full animate-spin" />
                  : <X className="h-3.5 w-3.5" />}
              </button>
            </div>
          ))}

          {/* Upload button */}
          <label
            className={cn(
              "aspect-video rounded-lg border-2 border-dashed border-muted-foreground/30 flex flex-col items-center justify-center gap-1.5 cursor-pointer hover:border-primary/50 hover:bg-primary/5 transition-colors",
              uploading && "opacity-50 pointer-events-none",
            )}
          >
            {uploading ? (
              <div className="animate-spin rounded-full h-5 w-5 border-2 border-primary border-t-transparent" />
            ) : (
              <ImagePlus className="h-5 w-5 text-muted-foreground/60" />
            )}
            <span className="text-xs text-muted-foreground">
              {uploading ? "Uploading…" : media.length === 0 ? "Add first photo" : "Add photo"}
            </span>
            <input
              ref={inputRef}
              type="file"
              accept="image/*"
              className="hidden"
              onChange={handleUpload}
              disabled={uploading}
            />
          </label>
        </div>

        {media.length === 0 && (
          <p className="text-xs text-muted-foreground mt-2">
            Photos help tenants and landlords recognize the property at a glance.
          </p>
        )}
      </div>

      {/* ── Lightbox ── */}
      {lightboxUrl && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/85 p-4 backdrop-blur-sm"
          onClick={() => setLightboxUrl(null)}
        >
          <button
            className="absolute right-4 top-4 rounded-full bg-white/10 p-2 text-white transition-colors hover:bg-white/20"
            onClick={() => setLightboxUrl(null)}
          >
            <X className="h-5 w-5" />
          </button>
          <img
            src={lightboxUrl}
            alt="Full size preview"
            className="max-h-[90vh] max-w-[90vw] rounded-xl object-contain shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          />
        </div>
      )}

      {/* ── Delete confirmation ── */}
      <Dialog open={!!confirmId} onOpenChange={(open) => !open && setConfirmId(null)}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>Delete this photo?</DialogTitle>
          </DialogHeader>
          <p className="text-sm text-muted-foreground">
            This action cannot be undone.
          </p>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setConfirmId(null)}
              disabled={!!deleting}
            >
              Cancel
            </Button>
            <Button
              variant="destructive"
              disabled={!!deleting}
              onClick={() => confirmId && handleDelete(confirmId)}
            >
              {deleting ? "Deleting…" : "Delete"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}

// ─── Amenities ────────────────────────────────────────────────────────────────

function AmenitiesSection({ listingId, listingAmenities }: { listingId: string; listingAmenities?: AmenityDto[] | null }) {
  const qc = useQueryClient();
  const { data: refAmenities, isLoading } = useAmenities();
  const { data: categories } = useAmenityCategories();
  const [editOpen, setEditOpen] = useState(false);

  const [presentSet, setPresentSet] = useState<Set<number>>(
    () => new Set((listingAmenities ?? []).filter((a) => a.isPresent).map((a) => Number(a.amenityId)))
  );
  const [pending, setPending] = useState<Record<number, boolean>>({});

  async function onToggle(id: number, isPresent: boolean) {
    const newValue = !isPresent;
    const newPresentSet = new Set(presentSet);
    if (newValue) newPresentSet.add(id);
    else newPresentSet.delete(id);

    setPresentSet(newPresentSet);
    setPending((p) => ({ ...p, [id]: true }));

    try {
      const updated = (refAmenities ?? []).map((def) => ({
        amenityId: def.id,
        isPresent: newPresentSet.has(def.id),
      }));
      await listingsApi.updateAmenities(listingId, updated);
      qc.invalidateQueries({ queryKey: ["listings"] });
    } catch {
      setPresentSet(presentSet);
      toast.error("Failed to update amenity");
    } finally {
      setPending((p) => { const n = { ...p }; delete n[id]; return n; });
    }
  }

  if (isLoading) return <p className="text-sm text-muted-foreground">Loading amenities…</p>;
  if (!refAmenities?.length) return <p className="text-sm text-muted-foreground">No amenities configured.</p>;

  const presentList = refAmenities.filter((a) => presentSet.has(a.id));

  return (
    <>
      <div>
        {presentList.length === 0 ? (
          <p className="text-sm text-muted-foreground">No amenities selected.</p>
        ) : (
          <div className="flex flex-wrap gap-1.5">
            {presentList.map((a) => (
              <span
                key={a.id}
                className="inline-flex items-center gap-1 rounded-md bg-muted px-2 py-1 text-xs font-medium text-foreground"
              >
                {a.icon && [...a.icon].length <= 2 && (
                  <span className="text-sm leading-none">{a.icon}</span>
                )}
                {a.name}
              </span>
            ))}
          </div>
        )}
        <div className="flex items-center justify-between mt-3">
          <p className="text-xs text-muted-foreground">
            {presentList.length} of {refAmenities.length} selected
          </p>
          <Button size="sm" variant="outline" onClick={() => setEditOpen(true)}>
            Edit amenities
          </Button>
        </div>
      </div>

      <Dialog open={editOpen} onOpenChange={setEditOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Edit amenities</DialogTitle>
          </DialogHeader>
          <div className="max-h-[60vh] overflow-y-auto pr-1">
            <AmenityToggleGrid
              amenities={refAmenities}
              categories={categories}
              presentSet={presentSet}
              pending={pending}
              onToggle={onToggle}
              compact
            />
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}

// Returns false for null/empty/zero-date (0001-01-01) from backend default values
function isRealDate(d?: string | null): d is string {
  return !!d && !d.startsWith("0001-");
}

// ─── Main Page ────────────────────────────────────────────────────────────────

export default function AssetDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const qc = useQueryClient();
  const { data: asset, isLoading } = useAsset(id!);
  const { data: summary } = useAssetSummary(id!);
  const { data: bookings } = useBookingsByAsset(id!);
  const { data: tickets } = useTicketsByAsset(id!);
  const { data: utilities } = useUtilitiesByAsset(id!);
  const { data: listings } = useListingsByAsset(id!);
  const createUtility = useCreateUtility();
  const deleteUtility = useDeleteUtility(id!);
  const deleteAsset = useDeleteAsset();
  const [deleteOpen, setDeleteOpen] = useState(false);
  const { data: members } = useAssetMembers(id!);
  const landlord = members?.find((m) => m.role === "Landlord");
  const unlinkLandlord = useUnlinkLandlord(id!);
  const [unlinkLandlordOpen, setUnlinkLandlordOpen] = useState(false);

  // Landlord invite
  const generateInvite = useGenerateInvite();
  const [landlordLink, setLandlordLink] = useState<{ link: string; expiresAt: string } | null>(null);
  const [linkCopied, setLinkCopied] = useState(false);

  async function handleGenerateLandlordInvite() {
    try {
      const result = await generateInvite.mutateAsync({ entityId: id!, type: InviteType.OwnerInvite });
      setLandlordLink({ link: buildInviteUrl(result.token), expiresAt: result.expiresAt });
    } catch {
      toast.error("Failed to generate invite link");
    }
  }

  function handleCopyLandlordLink() {
    if (!landlordLink) return;
    navigator.clipboard.writeText(landlordLink.link);
    setLinkCopied(true);
    toast.success("Link copied");
    setTimeout(() => setLinkCopied(false), 2000);
  }

  // Prefer Draft listing (new version waiting to publish), fall back to first
  const draftListing = listings?.find((l) => l.status === ListingStatus.Draft);
  const listing = draftListing ?? listings?.[0];

  const createNewVersion = useCreateNewVersion();
  const hotfixListing = useHotfixListing(listing?.id ?? "");
  const publishListing = usePublishListing(listing?.id ?? "");

  const [publishConfirmOpen, setPublishConfirmOpen] = useState(false);
  const [newVersionConfirmOpen, setNewVersionConfirmOpen] = useState(false);
  const [publishStartDate, setPublishStartDate] = useState("");
  const [publishEndDate, setPublishEndDate] = useState("");       // short-term only
  const [publishDurationMonths, setPublishDurationMonths] = useState(""); // long-term only

  const isListingLongTerm = listing?.rentalType === RentalType.LongTerm;

  function addMonthsToDate(dateStr: string, months: number): string {
    const d = new Date(dateStr + "T00:00:00");
    d.setMonth(d.getMonth() + months);
    return d.toISOString().slice(0, 10);
  }

  const computedPublishEndDate = isListingLongTerm && publishStartDate && publishDurationMonths
    ? addMonthsToDate(publishStartDate, parseInt(publishDurationMonths))
    : publishEndDate;

  function openPublishDialog() {
    setPublishStartDate(isRealDate(listing?.startDate) ? listing!.startDate! : "");
    setPublishEndDate(isRealDate(listing?.endDate) ? listing!.endDate! : "");
    setPublishDurationMonths("");
    setPublishConfirmOpen(true);
  }

  async function handlePublish() {
    if (!listing) return;
    const canPublish = isListingLongTerm
      ? !!publishStartDate && !!publishDurationMonths
      : !!publishStartDate && !!publishEndDate;
    if (!canPublish) return;
    try {
      await listingsApi.update(listing.id, {
        startDate: publishStartDate,
        endDate: computedPublishEndDate,
      });
      await publishListing.mutateAsync();
      toast.success("Listing published and now active");
      setPublishConfirmOpen(false);
    } catch {
      toast.error("Failed to publish listing");
    }
  }

  // Hotfix dialog
  const [hotfixOpen, setHotfixOpen] = useState(false);
  const [hotfixReason, setHotfixReason] = useState("");
  const [hotfixSaving, setHotfixSaving] = useState(false);

  async function handleCreateNewVersion() {
    if (!listing) return;
    try {
      await createNewVersion.mutateAsync(listing.id);
      toast.success("New version created — edit it and publish when ready");
      setNewVersionConfirmOpen(false);
    } catch {
      toast.error("Failed to create new version");
    }
  }

  async function handleHotfix() {
    if (!listing || !hotfixReason.trim()) return;
    setHotfixSaving(true);
    try {
      await hotfixListing.mutateAsync({ reason: hotfixReason });
      toast.success("Hotfix applied");
      setHotfixOpen(false);
      setHotfixReason("");
    } catch {
      toast.error("Failed to apply hotfix");
    } finally {
      setHotfixSaving(false);
    }
  }

  // Utility dialog
  const [addUtilityOpen, setAddUtilityOpen] = useState(false);
  const [utilType, setUtilType] = useState<UtilityType>(UtilityType.Electricity);
  const [providerName, setProviderName] = useState("");
  const [accountNumber, setAccountNumber] = useState("");

  // Edit settings dialog
  const [editSettingsOpen, setEditSettingsOpen] = useState(false);
  const [editTitle, setEditTitle] = useState("");
  const [editDescription, setEditDescription] = useState("");
  const [editPrice, setEditPrice] = useState(0);
  const [editMonthlyPrice, setEditMonthlyPrice] = useState(0);
  const [editWifiName, setEditWifiName] = useState("");
  const [editWifiPassword, setEditWifiPassword] = useState("");
  const [editRules, setEditRules] = useState("");
  const [editRentalType, setEditRentalType] = useState<RentalType>(RentalType.LongTerm);
  const [saving, setSaving] = useState(false);

  function openEditSettings() {
    if (!listing) return;
    setEditTitle(listing.title);
    setEditDescription(listing.description ?? "");
    setEditPrice(listing.basePrice);
    setEditMonthlyPrice(listing.baseMonthlyRate ?? 0);
    setEditWifiName(listing.wifiName ?? "");
    setEditWifiPassword(listing.wifiPassword ?? "");
    setEditRules(listing.houseRules ?? "");
    setEditRentalType((listing.rentalType as RentalType) ?? RentalType.LongTerm);
    setEditSettingsOpen(true);
  }

  async function handleDeleteAsset() {
    try {
      await deleteAsset.mutateAsync(id!);
      toast.success("Property deleted");
      navigate("/manager/assets", { replace: true });
    } catch {
      toast.error("Failed to delete property");
      setDeleteOpen(false);
    }
  }

  async function handleSaveSettings() {
    if (!listing) return;
    setSaving(true);
    try {
      await listingsApi.update(listing.id, {
        title: editTitle,
        description: editDescription,
        basePrice: editRentalType === RentalType.ShortTerm ? editPrice : undefined,
        baseMonthlyRate: editRentalType === RentalType.LongTerm ? editMonthlyPrice : undefined,
        wifiName: editWifiName,
        wifiPassword: editWifiPassword,
        houseRules: editRules,
        rentalType: editRentalType,
      });
      qc.invalidateQueries({ queryKey: ["listings"] });
      toast.success("Settings saved");
      setEditSettingsOpen(false);
    } catch {
      toast.error("Failed to save settings");
    } finally {
      setSaving(false);
    }
  }

  async function handleAddUtility() {
    if (!providerName || !accountNumber) return;
    try {
      await createUtility.mutateAsync({ assetId: id!, utilityType: utilType, providerName, accountNumber });
      toast.success("Utility contract added");
      setAddUtilityOpen(false);
      setProviderName(""); setAccountNumber("");
    } catch {
      toast.error("Failed to add utility");
    }
  }

  if (isLoading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-8 w-64" />
        <Skeleton className="h-48 w-full" />
        <Skeleton className="h-32 w-full" />
      </div>
    );
  }

  if (!asset) return <div className="text-muted-foreground">Property not found.</div>;

  const activeBooking = bookings?.find((b) => b.status === "Active");
  const upcomingBookings = bookings?.filter(
    (b) => b.status === "Confirmed" || b.status === "Pending"
  ) ?? [];
  const openTickets = (tickets ?? []).filter(
    (t) => !["Closed", "Completed", "Cancelled", "Canceled", "Verified"].includes(t.status)
  );

  // ── helpers ──────────────────────────────────────────────────────────────

  const LandlordSection = (
    <Section
      title="Landlord"
      action={
        !landlord && !landlordLink ? (
          <Button size="sm" variant="outline" onClick={handleGenerateLandlordInvite} disabled={generateInvite.isPending}>
            <Link2 className="h-3.5 w-3.5 mr-1" />
            {generateInvite.isPending ? "Generating…" : "Invite"}
          </Button>
        ) : undefined
      }
    >
      {landlord ? (
        <Card>
          <CardContent className="p-4">
            <div className="flex items-start gap-3">
              <div className="h-9 w-9 rounded-full bg-muted flex items-center justify-center text-sm font-bold shrink-0">
                {((landlord.firstName ?? landlord.lineName ?? landlord.email ?? "?")[0]).toUpperCase()}
              </div>
              <div className="flex-1 min-w-0 space-y-0.5">
                <p className="font-semibold text-sm">
                  {landlord.firstName && landlord.lastName
                    ? `${landlord.firstName} ${landlord.lastName}`
                    : landlord.lineName ?? landlord.email ?? "Landlord"}
                </p>
                {landlord.email && <p className="text-xs text-muted-foreground">{landlord.email}</p>}
                {landlord.lineName && <p className="text-xs text-muted-foreground">LINE: {landlord.lineName}</p>}
                <p className="text-xs text-muted-foreground font-mono">{landlord.userId.slice(0, 8)}…</p>
              </div>
              <Button variant="ghost" size="icon" className="text-destructive hover:text-destructive h-7 w-7 shrink-0"
                onClick={() => setUnlinkLandlordOpen(true)} title="Unlink">
                <Trash2 className="h-3.5 w-3.5" />
              </Button>
            </div>
          </CardContent>
        </Card>
      ) : !landlordLink ? (
        <p className="text-sm text-muted-foreground">No landlord linked.</p>
      ) : null}
      {landlordLink && (
        <Card className="border-green-200 bg-green-50">
          <CardContent className="p-3 space-y-2.5">
            <p className="text-xs text-muted-foreground">Expires {formatDate(landlordLink.expiresAt)}</p>
            <div className="bg-white rounded px-2 py-1.5 border border-green-200 break-all">
              <p className="text-xs font-mono text-gray-700">{landlordLink.link}</p>
            </div>
            <div className="flex gap-2">
              <Button size="sm" onClick={handleCopyLandlordLink} className="flex-1 bg-green-700 hover:bg-green-800 h-7 text-xs">
                {linkCopied ? <><Check className="h-3 w-3 mr-1" />Copied!</> : <><Copy className="h-3 w-3 mr-1" />Copy link</>}
              </Button>
              <Button size="sm" variant="outline" className="h-7 text-xs" onClick={() => setLandlordLink(null)}>Dismiss</Button>
            </div>
          </CardContent>
        </Card>
      )}
    </Section>
  );

  return (
    <div className="max-w-6xl space-y-6">
      {/* Back */}
      <div>
        <Link to="/manager/assets">
          <Button variant="ghost" size="sm">
            <ArrowLeft className="h-4 w-4 mr-1" />Properties
          </Button>
        </Link>
      </div>

      {/* ── Header ── */}
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold">{asset.internalName}</h1>
          <div className="flex items-center gap-4 text-sm text-muted-foreground mt-1.5">
            <span className="flex items-center gap-1"><BedDouble className="h-3.5 w-3.5" />{asset.bedrooms} bed</span>
            <span className="flex items-center gap-1"><Bath className="h-3.5 w-3.5" />{asset.bathrooms} bath</span>
            <span className="flex items-center gap-1"><Users className="h-3.5 w-3.5" />max {asset.maxOccupancy}</span>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <OccupancyBadge status={asset.occupancyStatus} />
          <Button variant="ghost" size="sm" className="text-destructive hover:text-destructive hover:bg-destructive/10" onClick={() => setDeleteOpen(true)}>
            <Trash2 className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {/* ── Photos — full width ── */}
      {listing && (
        <Section title="Photos" action={<span className="text-xs text-muted-foreground">{listing.media.length} photo{listing.media.length !== 1 ? "s" : ""}</span>}>
          <MediaSection listingId={listing.id} media={listing.media} />
        </Section>
      )}

      {/* ── Two-column body ── */}
      <div className="grid grid-cols-[3fr_2fr] gap-6 items-start">

        {/* ── LEFT: operational ── */}
        <div className="space-y-6">

          {/* Booking */}
          <Section
            title="Booking"
            action={
              landlord ? (
                <Link to={`/manager/bookings/new?assetId=${id}`}>
                  <Button size="sm"><Plus className="h-4 w-4 mr-1" />New booking</Button>
                </Link>
              ) : (
                <span className="text-xs text-muted-foreground">No landlord linked</span>
              )
            }
          >
            {activeBooking ? (
              <div className="space-y-2">
                <Link to={`/manager/bookings/${activeBooking.id}`}>
                  <Card className="border-green-200 bg-green-50 hover:shadow-sm transition-shadow">
                    <CardContent className="p-4">
                      <div className="flex items-start justify-between gap-3">
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-1">
                            <Badge className="bg-green-100 text-green-700 border-0 text-xs shrink-0">Active</Badge>
                            <span className="font-semibold text-sm truncate">{activeBooking.tenantName ?? "No tenant"}</span>
                          </div>
                          <p className="text-xs text-muted-foreground">
                            {formatDate(activeBooking.checkInDate)} → {formatDate(activeBooking.checkOutDate)}
                          </p>
                          {activeBooking.daysRemaining != null && (
                            <p className="text-xs font-medium text-green-700 mt-0.5">{activeBooking.daysRemaining} days remaining</p>
                          )}
                        </div>
                        <div className="text-right shrink-0">
                          <p className="font-bold text-base">{formatThb(activeBooking.rentAmount)}</p>
                          <p className="text-xs text-muted-foreground">total</p>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                </Link>
                {upcomingBookings.length > 0 && (
                  <div>
                    <p className="text-xs font-medium text-muted-foreground mb-1.5 mt-2">Upcoming</p>
                    <div className="space-y-1.5">
                      {upcomingBookings.map((b) => (
                        <Link key={b.id} to={`/manager/bookings/${b.id}`}>
                          <Card className="hover:shadow-sm transition-shadow">
                            <CardContent className="p-3 flex items-center justify-between">
                              <div>
                                <p className="text-sm font-medium">{b.tenantName ?? "No tenant"}</p>
                                <p className="text-xs text-muted-foreground">{formatDate(b.checkInDate)} → {formatDate(b.checkOutDate)}</p>
                              </div>
                              <div className="text-right">
                                <Badge className="border-0 bg-blue-100 text-blue-700 text-xs">{b.status}</Badge>
                                <p className="text-xs text-muted-foreground mt-0.5">{formatThb(b.rentAmount)} total</p>
                              </div>
                            </CardContent>
                          </Card>
                        </Link>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            ) : upcomingBookings.length > 0 ? (
              <div className="space-y-1.5">
                {upcomingBookings.map((b) => (
                  <Link key={b.id} to={`/manager/bookings/${b.id}`}>
                    <Card className="hover:shadow-sm transition-shadow">
                      <CardContent className="p-3 flex items-center justify-between">
                        <div>
                          <p className="text-sm font-medium">{b.tenantName ?? "No tenant"}</p>
                          <p className="text-xs text-muted-foreground">{formatDate(b.checkInDate)} → {formatDate(b.checkOutDate)}</p>
                        </div>
                        <div className="text-right">
                          <Badge className="border-0 bg-blue-100 text-blue-700 text-xs">{b.status}</Badge>
                          <p className="text-xs text-muted-foreground mt-0.5">{formatThb(b.rentAmount)}/mo</p>
                        </div>
                      </CardContent>
                    </Card>
                  </Link>
                ))}
              </div>
            ) : (
              <p className="text-sm text-muted-foreground">No bookings yet.</p>
            )}
          </Section>

          {/* Financial */}
          {summary && (
            <div className="grid grid-cols-3 gap-3">
              <Card><CardContent className="p-4">
                <p className="text-xs text-muted-foreground mb-1">Revenue</p>
                <p className="text-lg font-bold">{formatThb(summary.totalRevenue)}</p>
              </CardContent></Card>
              <Card><CardContent className="p-4">
                <p className="text-xs text-muted-foreground mb-1">Expenses</p>
                <p className="text-lg font-bold">{formatThb(summary.totalExpenses)}</p>
              </CardContent></Card>
              <Card><CardContent className="p-4">
                <p className="text-xs text-muted-foreground mb-1">Net profit</p>
                <p className={`text-lg font-bold ${summary.netProfit >= 0 ? "text-green-600" : "text-red-500"}`}>
                  {formatThb(summary.netProfit)}
                </p>
              </CardContent></Card>
            </div>
          )}

          {/* Tickets */}
          <Section
            title="Tickets"
            action={
              <Link to={`/manager/tickets/new?assetId=${id}`}>
                <Button size="sm" variant="outline"><Plus className="h-4 w-4 mr-1" />New ticket</Button>
              </Link>
            }
          >
            {!openTickets.length ? (
              <p className="text-sm text-muted-foreground">No open tickets.</p>
            ) : (
              <div className="space-y-1.5">
                {openTickets.slice(0, 5).map((t) => (
                  <Link key={t.id} to={`/manager/tickets/${t.id}`}>
                    <Card className="hover:shadow-sm transition-shadow">
                      <CardContent className="p-3 flex items-center gap-3">
                        <span className="text-base">{ticketKindIcon(t.kind)}</span>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium truncate">{t.title}</p>
                          <p className="text-xs text-muted-foreground">{t.displayId}</p>
                        </div>
                        <Badge className={`text-xs border-0 ${ticketStatusColor(t.status)}`}>{t.status}</Badge>
                      </CardContent>
                    </Card>
                  </Link>
                ))}
                {openTickets.length > 5 && (
                  <p className="text-xs text-muted-foreground text-center pt-1">+{openTickets.length - 5} more</p>
                )}
              </div>
            )}
          </Section>
        </div>

        {/* ── RIGHT: property info ── */}
        <div className="space-y-6">

          {/* Rental details */}
          <Section
            title="Rental details"
            action={listing && (
              listing.status === ListingStatus.Draft
                ? (
                  <Button size="sm" onClick={openPublishDialog}>
                    Publish listing
                  </Button>
                )
                : listing.isEditable
                ? <Button size="sm" variant="outline" onClick={openEditSettings}><Pencil className="h-3.5 w-3.5 mr-1" />Edit</Button>
                : (
                  <div className="flex gap-1.5">
                    <Button size="sm" variant="outline" onClick={() => setNewVersionConfirmOpen(true)}>
                      <Plus className="h-3.5 w-3.5 mr-1" />New version
                    </Button>
                    {activeBooking && (
                      <Button size="sm" variant="outline" onClick={() => setHotfixOpen(true)}>
                        Hotfix
                      </Button>
                    )}
                  </div>
                )
            )}
          >
            {listing ? (
              <Card>
                <CardContent className="p-4 space-y-3 text-sm">
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      {listing.rentalType === RentalType.ShortTerm ? (
                        <>
                          <p className="text-xs text-muted-foreground mb-0.5">Nightly rate</p>
                          <p className="font-bold text-xl">{formatThb(listing.basePrice)}<span className="text-sm font-normal text-muted-foreground">/night</span></p>
                        </>
                      ) : (
                        <>
                          <p className="text-xs text-muted-foreground mb-0.5">Monthly rent</p>
                          <p className="font-bold text-xl">
                            {listing.baseMonthlyRate != null ? formatThb(listing.baseMonthlyRate) : formatThb(listing.basePrice)}
                            <span className="text-sm font-normal text-muted-foreground">/mo</span>
                          </p>
                        </>
                      )}
                    </div>
                    <Badge className="border-0 bg-muted text-muted-foreground text-xs shrink-0">
                      {listing.rentalType === RentalType.ShortTerm ? "Short term" : "Long term"}
                    </Badge>
                  </div>
                  {(!isRealDate(listing.startDate) || !isRealDate(listing.endDate)) && (
                    <div className="rounded-md bg-amber-50 border border-amber-200 px-3 py-2">
                      <p className="text-xs text-amber-700 font-medium">No validity period set</p>
                      <p className="text-xs text-amber-600 mt-0.5">Bookings cannot be created until a validity period is set. Dates are set when you publish.</p>
                    </div>
                  )}
                  {isRealDate(listing.startDate) && isRealDate(listing.endDate) && (
                    <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                      <span>Valid:</span>
                      <span className="font-medium text-foreground">{formatDate(listing.startDate)} → {formatDate(listing.endDate)}</span>
                    </div>
                  )}
                  {listing.status === ListingStatus.Draft && (
                    <p className="text-xs text-amber-600 font-medium">Draft — publish to make available for bookings.</p>
                  )}
                  {listing.description && (
                    <div>
                      <p className="text-xs text-muted-foreground mb-0.5">Description</p>
                      <p className="text-muted-foreground text-xs leading-relaxed line-clamp-3">{listing.description}</p>
                    </div>
                  )}
                  {(listing.wifiName || listing.wifiPassword) && (
                    <div className="flex items-start gap-2 p-2.5 rounded-lg bg-muted/50">
                      <Wifi className="h-3.5 w-3.5 shrink-0 mt-0.5 text-muted-foreground" />
                      <div>
                        <p className="text-xs font-medium">{listing.wifiName}</p>
                        {listing.wifiPassword && <p className="text-xs text-muted-foreground">{listing.wifiPassword}</p>}
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>
            ) : (
              <p className="text-sm text-muted-foreground">Not configured.</p>
            )}
          </Section>

          {/* Landlord */}
          {LandlordSection}

          {/* Utilities */}
          <Section
            title="Utilities"
            action={<Button size="sm" variant="outline" onClick={() => setAddUtilityOpen(true)}><Plus className="h-4 w-4 mr-1" />Add</Button>}
          >
            {!utilities?.length ? (
              <p className="text-sm text-muted-foreground">No utility contracts.</p>
            ) : (
              <div className="space-y-1.5">
                {utilities.map((u) => (
                  <Card key={u.id}>
                    <CardContent className="p-3 flex items-center justify-between">
                      <div className="flex items-center gap-2.5">
                        <Zap className="h-3.5 w-3.5 text-muted-foreground" />
                        <div>
                          <p className="text-sm font-medium">{u.utilityType}</p>
                          <p className="text-xs text-muted-foreground">{u.providerName} · {u.accountNumber}</p>
                        </div>
                      </div>
                      <Button variant="ghost" size="icon" className="text-destructive hover:text-destructive h-7 w-7"
                        onClick={() => deleteUtility.mutate(u.id)}>
                        <Trash2 className="h-3.5 w-3.5" />
                      </Button>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </Section>

        </div>{/* end right column */}
      </div>{/* end grid */}

      {/* ── Amenities — full width ── */}
      {listing && (
        <Section title="Amenities">
          <AmenitiesSection listingId={listing.id} listingAmenities={Array.isArray(listing.amenities) ? listing.amenities : []} />
        </Section>
      )}

      {/* ── Listing history — full width ── */}
      {listings && listings.length > 1 && (
        <Section title="Listing history">
          <div className="space-y-1.5">
            {listings
              .filter((l) => l.id !== listing?.id)
              .map((l) => {
                const statusColor =
                  l.status === ListingStatus.Active ? "bg-green-100 text-green-700" :
                  l.status === ListingStatus.Draft ? "bg-yellow-100 text-yellow-700" :
                  "bg-gray-100 text-gray-500";
                return (
                  <Card key={l.id}>
                    <CardContent className="p-3 flex items-center gap-4 text-sm">
                      <Badge className={`border-0 text-xs shrink-0 ${statusColor}`}>{l.status}</Badge>
                      <div className="flex-1 min-w-0">
                        <p className="font-medium truncate">{l.title}</p>
                        <p className="text-xs text-muted-foreground">
                          {l.rentalType === RentalType.ShortTerm
                            ? `${formatThb(l.basePrice)}/night`
                            : l.baseMonthlyRate != null
                              ? `${formatThb(l.baseMonthlyRate)}/mo`
                              : `${formatThb(l.basePrice)}/mo`}
                          {isRealDate(l.startDate) && isRealDate(l.endDate) && ` · ${formatDate(l.startDate)} → ${formatDate(l.endDate)}`}
                        </p>
                      </div>
                      {l.publishedAt && (
                        <p className="text-xs text-muted-foreground shrink-0">Published {formatDate(l.publishedAt)}</p>
                      )}
                    </CardContent>
                  </Card>
                );
              })}
          </div>
        </Section>
      )}

      {/* ══ Dialogs ══════════════════════════════════════════════════════════ */}

      {/* Edit rental settings */}
      <Dialog open={editSettingsOpen} onOpenChange={setEditSettingsOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader><DialogTitle>Edit rental details</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <div className="space-y-1">
              <Label>Listing title</Label>
              <Input value={editTitle} onChange={(e) => setEditTitle(e.target.value)} />
            </div>
            <div className="space-y-1">
              <Label>Description</Label>
              <Textarea
                className="min-h-[80px] resize-none"
                value={editDescription}
                onChange={(e) => setEditDescription(e.target.value)}
              />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                {editRentalType === RentalType.ShortTerm ? (
                  <>
                    <Label>Nightly rate (฿)</Label>
                    <Input
                      type="number"
                      value={editPrice}
                      onChange={(e) => setEditPrice(Number(e.target.value))}
                      placeholder="e.g. 2500"
                    />
                    <p className="text-xs text-muted-foreground">Price per night × number of nights = rent</p>
                  </>
                ) : (
                  <>
                    <Label>Monthly rent (฿)</Label>
                    <Input
                      type="number"
                      value={editMonthlyPrice}
                      onChange={(e) => setEditMonthlyPrice(Number(e.target.value))}
                      placeholder="e.g. 50000"
                    />
                    <p className="text-xs text-muted-foreground">Divided by 30 to calculate daily rate</p>
                  </>
                )}
              </div>
              <div className="space-y-1">
                <Label>Rental type</Label>
                <Select value={editRentalType} onValueChange={(v) => setEditRentalType(v as RentalType)}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value={RentalType.LongTerm}>Long term</SelectItem>
                    <SelectItem value={RentalType.ShortTerm}>Short term</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <Label>WiFi name</Label>
                <Input value={editWifiName} onChange={(e) => setEditWifiName(e.target.value)} />
              </div>
              <div className="space-y-1">
                <Label>WiFi password</Label>
                <Input value={editWifiPassword} onChange={(e) => setEditWifiPassword(e.target.value)} />
              </div>
            </div>
            <div className="space-y-1">
              <Label>House rules</Label>
              <Textarea
                className="min-h-[60px] resize-none"
                placeholder="No smoking indoors, quiet hours after 10 pm…"
                value={editRules}
                onChange={(e) => setEditRules(e.target.value)}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditSettingsOpen(false)}>Cancel</Button>
            <Button onClick={handleSaveSettings} disabled={saving}>
              {saving ? "Saving…" : "Save"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Publish confirm */}
      <Dialog open={publishConfirmOpen} onOpenChange={setPublishConfirmOpen}>
        <DialogContent className="max-w-sm">
          <DialogHeader><DialogTitle>Publish listing?</DialogTitle></DialogHeader>
          <div className="space-y-3 text-sm text-muted-foreground">
            <p>Publishing makes this listing <span className="font-medium text-foreground">active</span> — it becomes available for new bookings immediately.</p>
            <p>If there is already an active listing for this property, it will be <span className="font-medium text-foreground">superseded</span> (archived) and replaced by this version.</p>
            <div className="space-y-2">
              <Label className="text-foreground">Validity period <span className="text-destructive">*</span></Label>
              {isListingLongTerm ? (
                <>
                  <div className="grid grid-cols-2 gap-2">
                    <div className="space-y-1">
                      <p className="text-xs text-muted-foreground">Start date</p>
                      <DatePicker value={publishStartDate} onChange={setPublishStartDate} placeholder="Start date" />
                    </div>
                    <div className="space-y-1">
                      <p className="text-xs text-muted-foreground">Duration</p>
                      <Select value={publishDurationMonths} onValueChange={setPublishDurationMonths}>
                        <SelectTrigger><SelectValue placeholder="Months..." /></SelectTrigger>
                        <SelectContent>
                          {[1, 2, 3, 6, 12, 18, 24].map((m) => (
                            <SelectItem key={m} value={String(m)}>
                              {m} {m === 1 ? "month" : "months"}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                  {publishStartDate && publishDurationMonths && (
                    <p className="text-xs text-muted-foreground">
                      Valid until: {formatDate(computedPublishEndDate)}
                    </p>
                  )}
                </>
              ) : (
                <div className="grid grid-cols-2 gap-2">
                  <DatePicker value={publishStartDate} onChange={setPublishStartDate} placeholder="Start date" />
                  <DatePicker value={publishEndDate} onChange={setPublishEndDate} placeholder="End date" />
                </div>
              )}
              <p className="text-xs">Bookings can only be created within this window.</p>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setPublishConfirmOpen(false)}>Cancel</Button>
            <Button onClick={handlePublish} disabled={publishListing.isPending || !publishStartDate || (isListingLongTerm ? !publishDurationMonths : !publishEndDate)}>
              {publishListing.isPending ? "Publishing…" : "Publish"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* New version confirm */}
      <Dialog open={newVersionConfirmOpen} onOpenChange={setNewVersionConfirmOpen}>
        <DialogContent className="max-w-sm">
          <DialogHeader><DialogTitle>Create new version?</DialogTitle></DialogHeader>
          <div className="space-y-2 text-sm text-muted-foreground">
            <p>This creates a <span className="font-medium text-foreground">draft copy</span> of the current listing that you can freely edit.</p>
            <p>The current listing stays active until you publish the new version. Once published, the new version replaces the old one for future bookings.</p>
            <p>Existing bookings are <span className="font-medium text-foreground">not affected</span>.</p>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setNewVersionConfirmOpen(false)}>Cancel</Button>
            <Button onClick={handleCreateNewVersion} disabled={createNewVersion.isPending}>
              {createNewVersion.isPending ? "Creating…" : "Create draft"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Hotfix listing */}
      <Dialog open={hotfixOpen} onOpenChange={setHotfixOpen}>
        <DialogContent className="max-w-sm">
          <DialogHeader><DialogTitle>Apply hotfix</DialogTitle></DialogHeader>
          <p className="text-sm text-muted-foreground">
            This listing is frozen due to an active booking. A hotfix applies a minor correction without creating a new version.
          </p>
          <div className="space-y-1">
            <Label>Reason</Label>
            <Textarea
              className="min-h-[80px] resize-none"
              placeholder="Describe the correction…"
              value={hotfixReason}
              onChange={(e) => setHotfixReason(e.target.value)}
            />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setHotfixOpen(false)}>Cancel</Button>
            <Button onClick={handleHotfix} disabled={hotfixSaving || !hotfixReason.trim()}>
              {hotfixSaving ? "Applying…" : "Apply"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Add utility */}
      <Dialog open={addUtilityOpen} onOpenChange={setAddUtilityOpen}>
        <DialogContent>
          <DialogHeader><DialogTitle>Add utility contract</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <div className="space-y-1">
              <Label>Type</Label>
              <Select value={utilType} onValueChange={(v) => setUtilType(v as UtilityType)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {Object.values(UtilityType).map((t) => (
                    <SelectItem key={t} value={t}>{t}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1">
              <Label>Provider name</Label>
              <Input
                value={providerName}
                onChange={(e) => setProviderName(e.target.value)}
                placeholder="e.g. PEA, PWA"
              />
            </div>
            <div className="space-y-1">
              <Label>Account number</Label>
              <Input value={accountNumber} onChange={(e) => setAccountNumber(e.target.value)} />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setAddUtilityOpen(false)}>Cancel</Button>
            <Button onClick={handleAddUtility} disabled={createUtility.isPending}>
              {createUtility.isPending ? "Adding…" : "Add"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Unlink landlord */}
      <Dialog open={unlinkLandlordOpen} onOpenChange={setUnlinkLandlordOpen}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-destructive" />
              Unlink landlord
            </DialogTitle>
          </DialogHeader>
          <p className="text-sm text-muted-foreground">
            Remove{" "}
            <span className="font-semibold text-foreground">
              {landlord?.firstName && landlord?.lastName
                ? `${landlord.firstName} ${landlord.lastName}`
                : landlord?.email ?? "this landlord"}
            </span>{" "}
            from the property? They will lose access. You can re-invite them afterwards.
          </p>
          <DialogFooter>
            <Button variant="outline" onClick={() => setUnlinkLandlordOpen(false)} disabled={unlinkLandlord.isPending}>
              Cancel
            </Button>
            <Button
              variant="destructive"
              disabled={unlinkLandlord.isPending}
              onClick={async () => {
                try {
                  await unlinkLandlord.mutateAsync();
                  toast.success("Landlord unlinked");
                  setUnlinkLandlordOpen(false);
                } catch {
                  toast.error("Failed to unlink landlord");
                }
              }}
            >
              {unlinkLandlord.isPending ? "Removing…" : "Remove"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete property */}
      <Dialog open={deleteOpen} onOpenChange={setDeleteOpen}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-destructive" />
              Delete property
            </DialogTitle>
          </DialogHeader>
          <p className="text-sm text-muted-foreground">
            Are you sure you want to delete{" "}
            <span className="font-semibold text-foreground">{asset.internalName}</span>?
            This action cannot be undone.
          </p>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteOpen(false)} disabled={deleteAsset.isPending}>
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={handleDeleteAsset}
              disabled={deleteAsset.isPending}
            >
              {deleteAsset.isPending ? "Deleting…" : "Delete"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
