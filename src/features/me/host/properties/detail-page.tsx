import { useState, useRef } from "react";
import { useParams, Link, useNavigate } from "react-router-dom";
import {
  ArrowLeft, Plus, Trash2, Pencil, ImagePlus, X, Copy, Check,
  BedDouble, Bath, Users, Wifi, Zap, AlertTriangle,
} from "lucide-react";
import { toast } from "sonner";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { DatePicker } from "@/components/ui/date-picker";
import { AmenityToggleGrid } from "@/components/amenity-toggle-grid";
import { StatCard } from "@/components/stat-card";
import { useAsset, useAssetMembers, useAssetSummary, useDeleteAsset, useUnlinkLandlord } from "@/lib/hooks/use-assets";
import { useBookingsByAsset } from "@/lib/hooks/use-bookings";
import { useTicketsByAsset } from "@/lib/hooks/use-tickets";
import { useUtilitiesByAsset, useCreateUtility, useDeleteUtility } from "@/lib/hooks/use-utilities";
import { useListingsByAsset, useCreateNewVersion, useHotfixListing, usePublishListing } from "@/lib/hooks/use-listings";
import { useAmenities, useAmenityCategories } from "@/lib/hooks/use-references";
import { useGenerateInvite } from "@/lib/hooks/use-invites";
import { listingsApi } from "@/lib/api/listings.api";
import { buildInviteUrl } from "@/lib/api/invites.api";
import { formatThb, formatDate } from "@/lib/utils/format";
import { ticketStatusColor, ticketKindIcon } from "@/lib/utils/ticket-status";
import { UtilityType, RentalType, ListingStatus, InviteType, AssetOccupancyStatus } from "@/lib/types/enums";
import type { AmenityDto, ListingMediaDto } from "@/lib/types";
import { cn } from "@/lib/utils/cn";
import { useQueryClient } from "@tanstack/react-query";

function isRealDate(d?: string | null): d is string {
  return !!d && !d.startsWith("0001-");
}

// ─── Photo gallery ────────────────────────────────────────────────────────────

function PhotoGallery({ listingId, media }: { listingId: string; media: ListingMediaDto[] }) {
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
    } catch {
      toast.error("Failed to delete photo");
    } finally {
      setDeleting(null);
    }
  }

  return (
    <>
      <div className="grid gap-2 grid-cols-4 sm:grid-cols-5 lg:grid-cols-6">
        {media.map((m) => (
          <div key={m.id} className="relative group aspect-video overflow-hidden rounded-lg bg-bg-subtle">
            <img
              src={m.url}
              alt={m.caption ?? "Photo"}
              className="w-full h-full object-cover cursor-zoom-in"
              onClick={() => setLightboxUrl(m.url)}
            />
            <button
              onClick={(e) => { e.stopPropagation(); setConfirmId(m.id); }}
              disabled={!!deleting}
              className="absolute top-1.5 right-1.5 w-6 h-6 bg-black/60 rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity text-white"
            >
              {deleting === m.id
                ? <div className="w-2.5 h-2.5 border border-white border-t-transparent rounded-full animate-spin" />
                : <X size={11} />}
            </button>
          </div>
        ))}
        <label className={cn(
          "aspect-video rounded-lg border-2 border-dashed border-border flex flex-col items-center justify-center gap-1 cursor-pointer hover:border-fg-muted transition-colors",
          uploading && "opacity-50 pointer-events-none",
        )}>
          {uploading
            ? <div className="w-4 h-4 border-2 border-fg-muted border-t-transparent rounded-full animate-spin" />
            : <ImagePlus size={16} className="text-fg-muted" />}
          <span className="text-xs text-fg-muted">{uploading ? "Uploading…" : media.length === 0 ? "Add photo" : "Add"}</span>
          <input ref={inputRef} type="file" accept="image/*" className="hidden" onChange={handleUpload} disabled={uploading} />
        </label>
      </div>

      {lightboxUrl && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/85 p-4" onClick={() => setLightboxUrl(null)}>
          <button className="absolute right-4 top-4 p-2 rounded-full bg-white/10 text-white" onClick={() => setLightboxUrl(null)}>
            <X size={18} />
          </button>
          <img src={lightboxUrl} alt="" className="max-h-[90vh] max-w-[90vw] object-contain" onClick={(e) => e.stopPropagation()} />
        </div>
      )}

      <Dialog open={!!confirmId} onOpenChange={(o) => !o && setConfirmId(null)}>
        <DialogContent className="max-w-sm">
          <DialogHeader><DialogTitle>Delete this photo?</DialogTitle></DialogHeader>
          <p className="text-sm text-fg-muted">This action cannot be undone.</p>
          <DialogFooter>
            <Button variant="outline" onClick={() => setConfirmId(null)}>Cancel</Button>
            <Button variant="destructive" disabled={!!deleting} onClick={() => confirmId && handleDelete(confirmId)}>
              {deleting ? "Deleting…" : "Delete"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}

// ─── Amenities section ────────────────────────────────────────────────────────

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
    const next = new Set(presentSet);
    if (!isPresent) next.add(id); else next.delete(id);
    setPresentSet(next);
    setPending((p) => ({ ...p, [id]: true }));
    try {
      await listingsApi.updateAmenities(listingId, (refAmenities ?? []).map((d) => ({ amenityId: d.id, isPresent: next.has(d.id) })));
      qc.invalidateQueries({ queryKey: ["listings"] });
    } catch {
      setPresentSet(presentSet);
      toast.error("Failed to update amenity");
    } finally {
      setPending((p) => { const n = { ...p }; delete n[id]; return n; });
    }
  }

  if (isLoading) return <p className="text-sm text-fg-muted">Loading amenities…</p>;
  if (!refAmenities?.length) return <p className="text-sm text-fg-muted">No amenities configured.</p>;

  const presentList = refAmenities.filter((a) => presentSet.has(a.id));

  return (
    <>
      <div className="flex flex-wrap gap-2 mb-3">
        {presentList.length === 0
          ? <p className="text-sm text-fg-muted">No amenities selected.</p>
          : presentList.map((a) => (
              <span key={a.id} className="inline-flex items-center gap-1 bg-bg-subtle rounded-full px-3 py-1 text-xs font-medium text-fg">
                {a.icon && [...a.icon].length <= 2 && <span>{a.icon}</span>}
                {a.name}
              </span>
            ))}
      </div>
      <div className="flex items-center justify-between">
        <p className="text-xs text-fg-muted">{presentList.length} of {refAmenities.length} selected</p>
        <Button variant="outline" size="sm" onClick={() => setEditOpen(true)}>Edit amenities</Button>
      </div>

      <Dialog open={editOpen} onOpenChange={setEditOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader><DialogTitle>Edit amenities</DialogTitle></DialogHeader>
          <div className="max-h-[60vh] overflow-y-auto pr-1">
            <AmenityToggleGrid amenities={refAmenities} categories={categories} presentSet={presentSet} pending={pending} onToggle={onToggle} compact />
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}

// ─── Occupancy badge ──────────────────────────────────────────────────────────

function OccupancyBadge({ status }: { status: AssetOccupancyStatus }) {
  const map: Record<AssetOccupancyStatus, string> = {
    [AssetOccupancyStatus.Vacant]: "bg-success/10 text-success",
    [AssetOccupancyStatus.Occupied]: "bg-[var(--color-info-bg)] text-[var(--color-info)]",
    [AssetOccupancyStatus.ActionRequired]: "bg-warning/10 text-warning",
  };
  return (
    <span className={cn("text-xs font-medium px-2.5 py-1 rounded-full", map[status] ?? "bg-bg-subtle text-fg-muted")}>
      {status === AssetOccupancyStatus.ActionRequired ? "Action needed" : status}
    </span>
  );
}

// ─── Card container ───────────────────────────────────────────────────────────

function Card({ children, className }: { children: React.ReactNode; className?: string }) {
  return <div className={cn("bg-bg-card rounded-xl shadow-card p-5", className)}>{children}</div>;
}

function SectionTitle({ title, action }: { title: string; action?: React.ReactNode }) {
  return (
    <div className="flex items-center justify-between mb-4">
      <h3 className="text-sm font-semibold text-fg uppercase tracking-wide">{title}</h3>
      {action}
    </div>
  );
}

// ─── Main page ────────────────────────────────────────────────────────────────

export function PropertyDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const qc = useQueryClient();

  const { data: asset, isLoading } = useAsset(id!);
  const { data: summary } = useAssetSummary(id!);
  const { data: bookings } = useBookingsByAsset(id!);
  const { data: tickets } = useTicketsByAsset(id!);
  const { data: utilities } = useUtilitiesByAsset(id!);
  const { data: listings } = useListingsByAsset(id!);
  const { data: members } = useAssetMembers(id!);

  const deleteAsset = useDeleteAsset();
  const [deleteOpen, setDeleteOpen] = useState(false);

  const landlord = members?.find((m) => m.role === "Landlord");
  const unlinkLandlord = useUnlinkLandlord(id!);
  const [unlinkOpen, setUnlinkOpen] = useState(false);

  const generateInvite = useGenerateInvite();
  const [landlordLink, setLandlordLink] = useState<{ link: string } | null>(null);
  const [linkCopied, setLinkCopied] = useState(false);

  async function handleGenerateLandlordInvite() {
    try {
      const r = await generateInvite.mutateAsync({ entityId: id!, type: InviteType.OwnerInvite });
      setLandlordLink({ link: buildInviteUrl(r.token) });
    } catch { toast.error("Failed to generate invite"); }
  }

  function handleCopyLink() {
    if (!landlordLink) return;
    navigator.clipboard.writeText(landlordLink.link);
    setLinkCopied(true);
    toast.success("Copied");
    setTimeout(() => setLinkCopied(false), 2000);
  }

  const draftListing = listings?.find((l) => l.status === ListingStatus.Draft);
  const listing = draftListing ?? listings?.[0];

  const createNewVersion = useCreateNewVersion();
  const hotfixListing = useHotfixListing(listing?.id ?? "");
  const publishListing = usePublishListing(listing?.id ?? "");

  const [publishOpen, setPublishOpen] = useState(false);
  const [publishStartDate, setPublishStartDate] = useState("");
  const [publishEndDate, setPublishEndDate] = useState("");
  const [publishDurationMonths, setPublishDurationMonths] = useState("");

  const isLongTerm = listing?.rentalType === RentalType.LongTerm;

  function addMonths(dateStr: string, months: number): string {
    const d = new Date(dateStr + "T00:00:00");
    d.setMonth(d.getMonth() + months);
    return d.toISOString().slice(0, 10);
  }

  const computedEndDate = isLongTerm && publishStartDate && publishDurationMonths
    ? addMonths(publishStartDate, parseInt(publishDurationMonths))
    : publishEndDate;

  async function handlePublish() {
    if (!listing) return;
    const canPublish = isLongTerm ? !!publishStartDate && !!publishDurationMonths : !!publishStartDate && !!publishEndDate;
    if (!canPublish) return;
    try {
      await listingsApi.update(listing.id, { startDate: publishStartDate, endDate: computedEndDate });
      await publishListing.mutateAsync();
      toast.success("Listing published");
      setPublishOpen(false);
    } catch { toast.error("Failed to publish listing"); }
  }

  const [hotfixOpen, setHotfixOpen] = useState(false);
  const [hotfixReason, setHotfixReason] = useState("");

  async function handleHotfix() {
    if (!listing || !hotfixReason.trim()) return;
    try {
      await hotfixListing.mutateAsync({ reason: hotfixReason });
      toast.success("Hotfix applied");
      setHotfixOpen(false);
    } catch { toast.error("Failed to apply hotfix"); }
  }

  // Utilities
  const createUtility = useCreateUtility();
  const deleteUtility = useDeleteUtility(id!);
  const [addUtilityOpen, setAddUtilityOpen] = useState(false);
  const [utilType, setUtilType] = useState<UtilityType>(UtilityType.Electricity);
  const [providerName, setProviderName] = useState("");
  const [accountNumber, setAccountNumber] = useState("");

  async function handleAddUtility() {
    try {
      await createUtility.mutateAsync({ assetId: id!, utilityType: utilType, providerName, accountNumber });
      toast.success("Utility added");
      setAddUtilityOpen(false);
      setProviderName(""); setAccountNumber("");
    } catch { toast.error("Failed to add utility"); }
  }

  // Edit settings
  const [editOpen, setEditOpen] = useState(false);
  const [editTitle, setEditTitle] = useState("");
  const [editDesc, setEditDesc] = useState("");
  const [editPrice, setEditPrice] = useState(0);
  const [editMonthlyPrice, setEditMonthlyPrice] = useState(0);
  const [editWifiName, setEditWifiName] = useState("");
  const [editWifiPwd, setEditWifiPwd] = useState("");
  const [editRules, setEditRules] = useState("");
  const [editRentalType, setEditRentalType] = useState<RentalType>(RentalType.LongTerm);
  const [saving, setSaving] = useState(false);

  function openEditSettings() {
    if (!listing) return;
    setEditTitle(listing.title);
    setEditDesc(listing.description ?? "");
    setEditPrice(listing.basePrice);
    setEditMonthlyPrice(listing.baseMonthlyRate ?? 0);
    setEditWifiName(listing.wifiName ?? "");
    setEditWifiPwd(listing.wifiPassword ?? "");
    setEditRules(listing.houseRules ?? "");
    setEditRentalType((listing.rentalType as RentalType) ?? RentalType.LongTerm);
    setEditOpen(true);
  }

  async function handleSaveSettings() {
    if (!listing) return;
    setSaving(true);
    try {
      await listingsApi.update(listing.id, {
        title: editTitle,
        description: editDesc,
        basePrice: editRentalType === RentalType.ShortTerm ? editPrice : Math.round(editMonthlyPrice / 30),
        baseMonthlyRate: editRentalType === RentalType.LongTerm ? editMonthlyPrice : undefined,
        wifiName: editWifiName,
        wifiPassword: editWifiPwd,
        houseRules: editRules,
      });
      qc.invalidateQueries({ queryKey: ["listings"] });
      toast.success("Saved");
      setEditOpen(false);
    } catch { toast.error("Failed to save"); }
    finally { setSaving(false); }
  }

  async function handleDeleteAsset() {
    try {
      await deleteAsset.mutateAsync(id!);
      toast.success("Property deleted");
      navigate("/me/host/properties", { replace: true });
    } catch { toast.error("Failed to delete"); setDeleteOpen(false); }
  }

  if (isLoading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-8 w-64" />
        <Skeleton className="h-48 w-full rounded-xl" />
      </div>
    );
  }
  if (!asset) return <p className="text-fg-muted">Property not found.</p>;

  const activeBooking = bookings?.find((b) => b.status === "Active");
  const openTickets = tickets?.filter((t) => !["Closed", "Cancelled"].includes(t.status));

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between gap-4">
        <div className="flex items-center gap-3">
          <Link to="/me/host/properties" className="p-1.5 rounded-lg hover:bg-bg-subtle text-fg-muted hover:text-fg transition-colors">
            <ArrowLeft size={18} />
          </Link>
          <div>
            <div className="flex items-center gap-2.5">
              <h1 className="text-2xl font-semibold text-fg">{asset.internalName}</h1>
              <OccupancyBadge status={asset.occupancyStatus} />
            </div>
            <div className="flex items-center gap-3 mt-1 text-sm text-fg-muted">
              {asset.bedrooms > 0 && <span className="flex items-center gap-1"><BedDouble size={13} />{asset.bedrooms} bed</span>}
              {asset.bathrooms > 0 && <span className="flex items-center gap-1"><Bath size={13} />{asset.bathrooms} bath</span>}
              {asset.maxOccupancy > 0 && <span className="flex items-center gap-1"><Users size={13} />{asset.maxOccupancy} guests</span>}
            </div>
          </div>
        </div>
        <Button
          variant="outline"
          size="sm"
          className="text-destructive border-destructive/30 hover:bg-destructive hover:text-white"
          onClick={() => setDeleteOpen(true)}
        >
          <Trash2 size={14} className="mr-1.5" />Delete
        </Button>
      </div>

      {/* Photos */}
      {listing && (
        <Card>
          <SectionTitle title="Photos" />
          <PhotoGallery listingId={listing.id} media={listing.media ?? []} />
        </Card>
      )}

      {/* Main grid */}
      <div className="grid grid-cols-1 lg:grid-cols-[1fr_340px] gap-6">
        {/* Left */}
        <div className="space-y-6">
          {/* Bookings */}
          <Card>
            <SectionTitle title="Bookings" action={
              <Button asChild size="sm" className="bg-brand hover:bg-[var(--color-primary-hover)] text-white">
                <Link to={`/me/host/bookings/new?assetId=${id}`}><Plus size={13} className="mr-1" />New booking</Link>
              </Button>
            } />
            {!bookings?.length
              ? <p className="text-sm text-fg-muted">No bookings yet.</p>
              : <div className="space-y-2">
                  {bookings.slice(0, 5).map((b) => (
                    <Link key={b.id} to={`/me/host/bookings/${b.id}`}
                      className="flex items-center justify-between p-3 rounded-lg hover:bg-bg-subtle transition-colors group">
                      <div>
                        <p className="text-sm font-medium text-fg group-hover:text-brand">{b.tenantName ?? "Guest"}</p>
                        <p className="text-xs text-fg-muted">{formatDate(b.startDate)} – {formatDate(b.endDate)}</p>
                      </div>
                      <Badge variant="outline" className="text-xs">{b.status}</Badge>
                    </Link>
                  ))}
                </div>}
          </Card>

          {/* Tickets */}
          <Card>
            <SectionTitle title="Tickets" action={
              <Button asChild variant="outline" size="sm">
                <Link to={`/me/host/tickets`}><Plus size={13} className="mr-1" />View all</Link>
              </Button>
            } />
            {!openTickets?.length
              ? <p className="text-sm text-fg-muted">No open tickets.</p>
              : <div className="space-y-2">
                  {openTickets.slice(0, 5).map((t) => (
                    <Link key={t.id} to={`/me/host/tickets/${t.id}`}
                      className="flex items-center justify-between p-3 rounded-lg hover:bg-bg-subtle transition-colors group">
                      <div className="flex items-center gap-2">
                        <span className="text-base">{ticketKindIcon(t.kind)}</span>
                        <p className="text-sm text-fg group-hover:text-brand line-clamp-1">{t.title}</p>
                      </div>
                      <span className={cn("text-xs px-2 py-0.5 rounded-full font-medium", ticketStatusColor(t.status))}>
                        {t.status}
                      </span>
                    </Link>
                  ))}
                </div>}
          </Card>
        </div>

        {/* Right sidebar */}
        <div className="space-y-4">
          {/* Financial summary */}
          {summary && (
            <Card>
              <SectionTitle title="Financials" />
              <div className="space-y-2">
                <div className="flex justify-between text-sm">
                  <span className="text-fg-muted">Revenue</span>
                  <span className="font-medium text-fg">{formatThb(summary.totalRevenue)}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-fg-muted">Expenses</span>
                  <span className="font-medium text-fg">{formatThb(summary.totalExpenses)}</span>
                </div>
                <div className="border-t border-border pt-2 flex justify-between text-sm">
                  <span className="font-medium text-fg">Net profit</span>
                  <span className={cn("font-semibold", summary.netProfit >= 0 ? "text-success" : "text-danger")}>
                    {formatThb(summary.netProfit)}
                  </span>
                </div>
              </div>
            </Card>
          )}

          {/* Rental details */}
          {listing && (
            <Card>
              <SectionTitle title="Rental details" action={
                <Button variant="ghost" size="sm" onClick={openEditSettings}><Pencil size={13} /></Button>
              } />
              <div className="space-y-3">
                <div>
                  <p className="text-xs text-fg-muted mb-0.5">Price</p>
                  <p className="text-sm font-semibold text-fg">
                    {listing.rentalType === RentalType.LongTerm
                      ? `${formatThb(listing.baseMonthlyRate ?? listing.basePrice * 30)}/mo`
                      : `${formatThb(listing.basePrice)}/night`}
                  </p>
                </div>
                {listing.wifiName && (
                  <div className="flex items-center gap-2 text-sm text-fg-muted">
                    <Wifi size={13} />
                    <span>{listing.wifiName}</span>
                    {listing.wifiPassword && <span className="text-fg-subtle">· {listing.wifiPassword}</span>}
                  </div>
                )}
                <div>
                  <Badge variant="outline" className="text-xs">
                    {listing.status}
                    {listing.status === ListingStatus.Draft && " · Unpublished"}
                  </Badge>
                </div>
                {listing.status === ListingStatus.Draft && (
                  <Button
                    size="sm"
                    className="w-full bg-brand hover:bg-[var(--color-primary-hover)] text-white"
                    onClick={() => { setPublishStartDate(""); setPublishEndDate(""); setPublishDurationMonths(""); setPublishOpen(true); }}
                  >
                    Publish listing
                  </Button>
                )}
                {listing.status === "Active" && (
                  <Button variant="outline" size="sm" className="w-full" onClick={() => setHotfixOpen(true)}>
                    Apply hotfix
                  </Button>
                )}
              </div>
            </Card>
          )}

          {/* Landlord */}
          <Card>
            <SectionTitle title="Landlord" />
            {landlord ? (
              <div className="space-y-2">
                <p className="text-sm font-medium text-fg">
                  {landlord.firstName} {landlord.lastName}
                </p>
                {landlord.email && <p className="text-xs text-fg-muted">{landlord.email}</p>}
                <Button
                  variant="outline"
                  size="sm"
                  className="w-full text-destructive border-destructive/30 hover:bg-destructive hover:text-white"
                  onClick={() => setUnlinkOpen(true)}
                >
                  Unlink landlord
                </Button>
              </div>
            ) : (
              <div className="space-y-3">
                <p className="text-xs text-fg-muted">No landlord linked yet.</p>
                <Button
                  variant="outline"
                  size="sm"
                  className="w-full"
                  onClick={handleGenerateLandlordInvite}
                  disabled={generateInvite.isPending}
                >
                  Generate invite link
                </Button>
                {landlordLink && (
                  <div className="flex items-center gap-2 p-2 bg-bg-subtle rounded-lg">
                    <p className="text-xs text-fg-muted truncate flex-1">{landlordLink.link}</p>
                    <button onClick={handleCopyLink} className="shrink-0 text-fg-muted hover:text-fg">
                      {linkCopied ? <Check size={14} className="text-success" /> : <Copy size={14} />}
                    </button>
                  </div>
                )}
              </div>
            )}
          </Card>

          {/* Utilities */}
          <Card>
            <SectionTitle title="Utilities" action={
              <Button variant="outline" size="sm" onClick={() => setAddUtilityOpen(true)}><Plus size={13} /></Button>
            } />
            {!utilities?.length
              ? <p className="text-xs text-fg-muted">No utilities added.</p>
              : <div className="space-y-2">
                  {utilities.map((u) => (
                    <div key={u.id} className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <Zap size={13} className="text-fg-muted" />
                        <div>
                          <p className="text-xs font-medium text-fg">{u.utilityType}</p>
                          {u.providerName && <p className="text-xs text-fg-muted">{u.providerName}</p>}
                        </div>
                      </div>
                      <button
                        onClick={() => deleteUtility.mutate(u.id)}
                        className="text-fg-subtle hover:text-destructive transition-colors"
                      >
                        <Trash2 size={12} />
                      </button>
                    </div>
                  ))}
                </div>}
          </Card>
        </div>
      </div>

      {/* Amenities — full width */}
      {listing && (
        <Card>
          <SectionTitle title="Amenities" />
          <AmenitiesSection listingId={listing.id} listingAmenities={listing.amenities} />
        </Card>
      )}

      {/* ── Dialogs ── */}

      {/* Delete confirmation */}
      <Dialog open={deleteOpen} onOpenChange={setDeleteOpen}>
        <DialogContent className="max-w-sm">
          <DialogHeader><DialogTitle>Delete this property?</DialogTitle></DialogHeader>
          <p className="text-sm text-fg-muted">This will permanently remove the property and all associated data. This cannot be undone.</p>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteOpen(false)}>Cancel</Button>
            <Button variant="destructive" disabled={deleteAsset.isPending} onClick={handleDeleteAsset}>
              {deleteAsset.isPending ? "Deleting…" : "Delete"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Unlink landlord */}
      <Dialog open={unlinkOpen} onOpenChange={setUnlinkOpen}>
        <DialogContent className="max-w-sm">
          <DialogHeader><DialogTitle>Unlink landlord?</DialogTitle></DialogHeader>
          <p className="text-sm text-fg-muted">The landlord will lose access to this property.</p>
          <DialogFooter>
            <Button variant="outline" onClick={() => setUnlinkOpen(false)}>Cancel</Button>
            <Button variant="destructive" disabled={unlinkLandlord.isPending}
              onClick={async () => { await unlinkLandlord.mutateAsync(); setUnlinkOpen(false); }}>
              Unlink
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Edit settings */}
      <Dialog open={editOpen} onOpenChange={setEditOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader><DialogTitle>Edit listing details</DialogTitle></DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-1.5">
              <Label className="text-sm font-medium">Title</Label>
              <Input value={editTitle} onChange={(e) => setEditTitle(e.target.value)} />
            </div>
            <div className="space-y-1.5">
              <Label className="text-sm font-medium">Description</Label>
              <Textarea value={editDesc} onChange={(e) => setEditDesc(e.target.value)} className="min-h-[80px] resize-none" />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label className="text-sm font-medium">WiFi name</Label>
                <Input value={editWifiName} onChange={(e) => setEditWifiName(e.target.value)} />
              </div>
              <div className="space-y-1.5">
                <Label className="text-sm font-medium">WiFi password</Label>
                <Input value={editWifiPwd} onChange={(e) => setEditWifiPwd(e.target.value)} />
              </div>
            </div>
            <div className="space-y-1.5">
              <Label className="text-sm font-medium">
                {editRentalType === RentalType.LongTerm ? "Monthly rate (฿)" : "Nightly rate (฿)"}
              </Label>
              <Input
                type="number"
                value={editRentalType === RentalType.LongTerm ? editMonthlyPrice || "" : editPrice || ""}
                onChange={(e) => editRentalType === RentalType.LongTerm
                  ? setEditMonthlyPrice(Number(e.target.value))
                  : setEditPrice(Number(e.target.value))}
              />
            </div>
            <div className="space-y-1.5">
              <Label className="text-sm font-medium">House rules</Label>
              <Textarea value={editRules} onChange={(e) => setEditRules(e.target.value)} className="min-h-[60px] resize-none" />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditOpen(false)}>Cancel</Button>
            <Button disabled={saving} onClick={handleSaveSettings}
              className="bg-brand hover:bg-[var(--color-primary-hover)] text-white">
              {saving ? "Saving…" : "Save changes"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Publish listing */}
      <Dialog open={publishOpen} onOpenChange={setPublishOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader><DialogTitle>Publish listing</DialogTitle></DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-1.5">
              <Label className="text-sm font-medium">Start date *</Label>
              <DatePicker value={publishStartDate} onChange={setPublishStartDate} />
            </div>
            {isLongTerm ? (
              <div className="space-y-1.5">
                <Label className="text-sm font-medium">Duration (months) *</Label>
                <Input type="number" min={1} value={publishDurationMonths} onChange={(e) => setPublishDurationMonths(e.target.value)} />
                {publishStartDate && publishDurationMonths && (
                  <p className="text-xs text-fg-muted">Ends: {formatDate(computedEndDate)}</p>
                )}
              </div>
            ) : (
              <div className="space-y-1.5">
                <Label className="text-sm font-medium">End date *</Label>
                <DatePicker value={publishEndDate} onChange={setPublishEndDate} />
              </div>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setPublishOpen(false)}>Cancel</Button>
            <Button
              className="bg-brand hover:bg-[var(--color-primary-hover)] text-white"
              disabled={publishListing.isPending}
              onClick={handlePublish}
            >
              {publishListing.isPending ? "Publishing…" : "Publish"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Hotfix */}
      <Dialog open={hotfixOpen} onOpenChange={setHotfixOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader><DialogTitle>Apply hotfix</DialogTitle></DialogHeader>
          <div className="space-y-3 py-2">
            <div className="flex items-start gap-2 bg-warning/10 rounded-lg p-3">
              <AlertTriangle size={15} className="text-warning mt-0.5 shrink-0" />
              <p className="text-xs text-warning">A hotfix applies changes to an active listing. Provide a clear reason.</p>
            </div>
            <div className="space-y-1.5">
              <Label className="text-sm font-medium">Reason *</Label>
              <Textarea value={hotfixReason} onChange={(e) => setHotfixReason(e.target.value)} className="min-h-[80px] resize-none" placeholder="e.g. Price correction requested by landlord" />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setHotfixOpen(false)}>Cancel</Button>
            <Button
              disabled={!hotfixReason.trim() || hotfixListing.isPending}
              onClick={handleHotfix}
              className="bg-brand hover:bg-[var(--color-primary-hover)] text-white"
            >
              {hotfixListing.isPending ? "Applying…" : "Apply hotfix"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Add utility */}
      <Dialog open={addUtilityOpen} onOpenChange={setAddUtilityOpen}>
        <DialogContent className="max-w-sm">
          <DialogHeader><DialogTitle>Add utility</DialogTitle></DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-1.5">
              <Label className="text-sm font-medium">Type</Label>
              <Select value={utilType} onValueChange={(v) => setUtilType(v as UtilityType)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {Object.values(UtilityType).map((t) => <SelectItem key={t} value={t}>{t}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label className="text-sm font-medium">Provider name</Label>
              <Input value={providerName} onChange={(e) => setProviderName(e.target.value)} placeholder="e.g. PEA" />
            </div>
            <div className="space-y-1.5">
              <Label className="text-sm font-medium">Account number</Label>
              <Input value={accountNumber} onChange={(e) => setAccountNumber(e.target.value)} />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setAddUtilityOpen(false)}>Cancel</Button>
            <Button disabled={createUtility.isPending} onClick={handleAddUtility}
              className="bg-brand hover:bg-[var(--color-primary-hover)] text-white">
              {createUtility.isPending ? "Adding…" : "Add utility"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
