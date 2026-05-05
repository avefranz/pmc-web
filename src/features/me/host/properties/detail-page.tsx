import { useState, useRef } from "react";
import { useParams, Link, useNavigate } from "react-router-dom";
import {
  ArrowLeft, Plus, Trash2, Pencil, ImagePlus, X,
  BedDouble, Bath, Users, Wifi, Zap, AlertTriangle,
  LayoutGrid, FileText, CalendarDays, Wrench, Settings,
  BarChart2, Home, ChevronRight,
} from "lucide-react";
import { toast } from "sonner";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { DatePicker } from "@/components/ui/date-picker";
import { AmenityToggleGrid } from "@/components/amenity-toggle-grid";
import { useAsset, useAssetSummary, useDeleteAsset } from "@/lib/hooks/use-assets";
import { useBookingsByAsset, useCreateBooking } from "@/lib/hooks/use-bookings";
import { useTicketsByAsset, useCreateTicket } from "@/lib/hooks/use-tickets";
import { useUtilitiesByAsset, useCreateUtility, useDeleteUtility } from "@/lib/hooks/use-utilities";
import { useListingsByAsset, useCreateNewVersion, useHotfixListing, usePublishListing } from "@/lib/hooks/use-listings";
import { useAmenities, useAmenityCategories } from "@/lib/hooks/use-references";
import { listingsApi } from "@/lib/api/listings.api";
import { formatThb, formatDate } from "@/lib/utils/format";
import { ticketStatusColor, ticketKindIcon } from "@/lib/utils/ticket-status";
import { UtilityType, RentalType, ListingStatus, AssetOccupancyStatus, TicketType, TicketKind } from "@/lib/types/enums";
import type { AmenityDto, ListingMediaDto } from "@/lib/types";
import { cn } from "@/lib/utils/cn";
import { useQueryClient } from "@tanstack/react-query";

type Section = "overview" | "photos" | "listing" | "bookings" | "tickets" | "utilities" | "amenities" | "finances";

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
      {media.length === 0 ? (
        <label className={cn(
          "flex flex-col items-center justify-center gap-3 rounded-2xl border-2 border-dashed border-border h-56 cursor-pointer",
          "hover:border-fg-muted transition-colors bg-bg-subtle",
          uploading && "opacity-50 pointer-events-none",
        )}>
          {uploading
            ? <div className="w-6 h-6 border-2 border-fg-muted border-t-transparent rounded-full animate-spin" />
            : <ImagePlus size={28} className="text-fg-muted" />}
          <div className="text-center">
            <p className="text-sm font-semibold text-fg-muted">Add your first photo</p>
            <p className="text-xs text-fg-subtle mt-0.5">Guests will see your photos on the listing</p>
          </div>
          <input ref={inputRef} type="file" accept="image/*" className="hidden" onChange={handleUpload} disabled={uploading} />
        </label>
      ) : (
        <div className="space-y-4">
          <div className="grid gap-2 grid-cols-3 sm:grid-cols-4 lg:grid-cols-5">
            {media.map((m) => (
              <div key={m.id} className="relative group aspect-square overflow-hidden rounded-xl bg-bg-subtle">
                <img
                  src={m.url}
                  alt={m.caption ?? "Photo"}
                  className="w-full h-full object-cover cursor-zoom-in hover:scale-[1.03] transition-transform duration-300"
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
              "aspect-square rounded-xl border-2 border-dashed border-border flex flex-col items-center justify-center gap-1.5 cursor-pointer hover:border-fg-muted transition-colors bg-bg-subtle",
              uploading && "opacity-50 pointer-events-none",
            )}>
              {uploading
                ? <div className="w-4 h-4 border-2 border-fg-muted border-t-transparent rounded-full animate-spin" />
                : <ImagePlus size={18} className="text-fg-muted" />}
              <span className="text-xs text-fg-muted font-medium">{uploading ? "Uploading…" : "Add"}</span>
              <input ref={inputRef} type="file" accept="image/*" className="hidden" onChange={handleUpload} disabled={uploading} />
            </label>
          </div>
          <p className="text-xs text-fg-muted">{media.length} photo{media.length !== 1 ? "s" : ""} · Guests will see these photos on your listing</p>
        </div>
      )}

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

  if (isLoading) return <p className="text-sm text-fg-muted py-8 text-center">Loading amenities…</p>;
  if (!refAmenities?.length) return <p className="text-sm text-fg-muted">No amenities configured.</p>;

  return (
    <AmenityToggleGrid
      amenities={refAmenities}
      categories={categories}
      presentSet={presentSet}
      pending={pending}
      onToggle={onToggle}
      compact
    />
  );
}

// ─── Occupancy badge ──────────────────────────────────────────────────────────

function OccupancyBadge({ status }: { status: AssetOccupancyStatus }) {
  const map: Record<AssetOccupancyStatus, { label: string; cls: string }> = {
    [AssetOccupancyStatus.Vacant]:         { label: "Vacant",          cls: "bg-success/10 text-success border-success/20" },
    [AssetOccupancyStatus.Occupied]:       { label: "Occupied",        cls: "bg-[var(--color-info-bg)] text-[var(--color-info)] border-[var(--color-info)]/20" },
    [AssetOccupancyStatus.ActionRequired]: { label: "Action needed",   cls: "bg-warning/10 text-warning border-warning/20" },
  };
  const m = map[status] ?? { label: status, cls: "bg-bg-subtle text-fg-muted border-border" };
  return <span className={cn("text-[11px] font-semibold px-2.5 py-0.5 rounded-full border", m.cls)}>{m.label}</span>;
}

// ─── Nav item ─────────────────────────────────────────────────────────────────

function NavItem({
  icon: Icon,
  label,
  active,
  badge,
  onClick,
}: {
  icon: React.ElementType;
  label: string;
  active: boolean;
  badge?: number;
  onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      className={cn(
        "w-full flex items-center gap-3 px-4 py-2.5 rounded-xl text-sm font-medium transition-all text-left",
        active
          ? "bg-brand/8 text-brand font-semibold"
          : "text-fg-muted hover:bg-bg-subtle hover:text-fg",
      )}
    >
      <Icon size={16} className={active ? "text-brand" : "text-fg-muted"} />
      <span className="flex-1">{label}</span>
      {badge !== undefined && badge > 0 && (
        <span className={cn(
          "text-[11px] font-bold px-1.5 py-0.5 rounded-full min-w-[20px] text-center",
          active ? "bg-brand text-white" : "bg-fg-subtle/20 text-fg-muted",
        )}>
          {badge}
        </span>
      )}
    </button>
  );
}

// ─── Section heading ──────────────────────────────────────────────────────────

function SectionHeading({ title, subtitle, action }: { title: string; subtitle?: string; action?: React.ReactNode }) {
  return (
    <div className="flex items-start justify-between gap-4 mb-6">
      <div>
        <h2 className="text-xl font-bold text-fg">{title}</h2>
        {subtitle && <p className="text-sm text-fg-muted mt-0.5">{subtitle}</p>}
      </div>
      {action}
    </div>
  );
}

// ─── Main page ────────────────────────────────────────────────────────────────

export function PropertyDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const qc = useQueryClient();
  const [section, setSection] = useState<Section>("overview");

  const { data: asset, isLoading } = useAsset(id!);
  const { data: summary } = useAssetSummary(id!);
  const { data: bookings } = useBookingsByAsset(id!);
  const { data: tickets } = useTicketsByAsset(id!);
  const { data: utilities } = useUtilitiesByAsset(id!);
  const { data: listings } = useListingsByAsset(id!);

  const deleteAsset = useDeleteAsset();
  const [deleteOpen, setDeleteOpen] = useState(false);

  const createBooking = useCreateBooking();
  const [bookingOpen, setBookingOpen] = useState(false);
  const [bookingCheckIn, setBookingCheckIn] = useState("");
  const [bookingCheckOut, setBookingCheckOut] = useState("");
  const [bookingDeposit, setBookingDeposit] = useState("");

  async function handleCreateBooking() {
    if (!bookingCheckIn || !bookingCheckOut) return;
    try {
      await createBooking.mutateAsync({
        assetId: id!,
        checkInDate: bookingCheckIn,
        checkOutDate: bookingCheckOut,
        depositAmount: bookingDeposit ? Number(bookingDeposit) : 0,
      });
      toast.success("Booking created");
      setBookingOpen(false);
      setBookingCheckIn(""); setBookingCheckOut(""); setBookingDeposit("");
    } catch { toast.error("Failed to create booking"); }
  }

  const createTicket = useCreateTicket();
  const [ticketOpen, setTicketOpen] = useState(false);
  const [ticketTitle, setTicketTitle] = useState("");
  const [ticketDesc, setTicketDesc] = useState("");
  const [ticketType, setTicketType] = useState<TicketType>(TicketType.Maintenance);
  const [ticketKind, setTicketKind] = useState<TicketKind>(TicketKind.WorkOrder);

  async function handleCreateTicket() {
    if (!ticketTitle.trim()) return;
    try {
      await createTicket.mutateAsync({
        assetId: id!,
        title: ticketTitle,
        description: ticketDesc,
        type: ticketType,
        kind: ticketKind,
        estimatedCost: 0,
      });
      toast.success("Ticket created");
      setTicketOpen(false);
      setTicketTitle(""); setTicketDesc("");
    } catch { toast.error("Failed to create ticket"); }
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

  function addMonthsFn(dateStr: string, months: number): string {
    const d = new Date(dateStr + "T00:00:00");
    d.setMonth(d.getMonth() + months);
    return d.toISOString().slice(0, 10);
  }

  const computedEndDate = isLongTerm && publishStartDate && publishDurationMonths
    ? addMonthsFn(publishStartDate, parseInt(publishDurationMonths))
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
      <div className="flex gap-6">
        <Skeleton className="w-[260px] h-[500px] rounded-2xl shrink-0 hidden lg:block" />
        <div className="flex-1 space-y-4">
          <Skeleton className="h-8 w-48" />
          <Skeleton className="h-48 rounded-xl" />
        </div>
      </div>
    );
  }
  if (!asset) return <p className="text-fg-muted">Property not found.</p>;

  const activeBooking = bookings?.find((b) => b.status === "Active");
  const openTickets = tickets?.filter((t) => !["Closed", "Cancelled"].includes(t.status)) ?? [];
  const coverPhoto = listing?.media?.[0]?.url ?? asset.primaryImageUrl;

  // ── Nav sections
  const NAV: { id: Section; icon: React.ElementType; label: string; badge?: number }[] = [
    { id: "overview",   icon: Home,         label: "Overview" },
    { id: "photos",     icon: LayoutGrid,   label: "Photos",     badge: listing?.media?.length ? undefined : 0 },
    { id: "listing",    icon: FileText,     label: "Listing" },
    { id: "bookings",   icon: CalendarDays, label: "Bookings",   badge: bookings?.length },
    { id: "tickets",    icon: Wrench,       label: "Tickets",    badge: openTickets.length || undefined },
    { id: "utilities",  icon: Zap,          label: "Utilities" },
    { id: "amenities",  icon: Settings,     label: "Amenities" },
    { id: "finances",   icon: BarChart2,    label: "Finances" },
  ];

  return (
    <div>
      {/* Page header */}
      <div className="flex items-center gap-3 mb-6">
        <Link to="/me/host/properties" className="p-1.5 rounded-lg hover:bg-bg-subtle text-fg-muted hover:text-fg transition-colors">
          <ArrowLeft size={18} />
        </Link>
        <div>
          <h1 className="text-lg font-bold text-fg leading-none">Listing editor</h1>
          <p className="text-sm text-fg-muted mt-0.5">{asset.internalName}</p>
        </div>
      </div>

      {/* Mobile tab bar */}
      <div className="lg:hidden mb-4 -mx-4 px-4 overflow-x-auto scrollbar-hide">
        <div className="flex gap-1 pb-1">
          {NAV.map((n) => (
            <button
              key={n.id}
              onClick={() => setSection(n.id)}
              className={cn(
                "flex items-center gap-1.5 px-3 py-2 rounded-full text-xs font-semibold whitespace-nowrap transition-all",
                section === n.id
                  ? "bg-fg text-white"
                  : "bg-bg-subtle text-fg-muted hover:text-fg",
              )}
            >
              <n.icon size={12} />
              {n.label}
              {n.badge !== undefined && n.badge > 0 && (
                <span className={cn(
                  "text-[10px] font-bold px-1 rounded-full",
                  section === n.id ? "bg-white/30 text-white" : "bg-fg-muted/20 text-fg-muted",
                )}>
                  {n.badge}
                </span>
              )}
            </button>
          ))}
        </div>
      </div>

      {/* Two-panel layout */}
      <div className="flex gap-6 items-start">

        {/* ── Left sidebar ── */}
        <aside className="hidden lg:flex w-[260px] shrink-0 flex-col gap-2">
          {/* Property card */}
          <div className="bg-bg-card rounded-2xl border border-border overflow-hidden shadow-card">
            {/* Cover photo */}
            <div className="aspect-[4/3] bg-bg-subtle overflow-hidden">
              {coverPhoto ? (
                <img src={coverPhoto} alt={asset.internalName} className="w-full h-full object-cover" />
              ) : (
                <div className="w-full h-full flex items-center justify-center">
                  <Home size={36} className="text-fg-subtle" />
                </div>
              )}
            </div>

            <div className="p-4">
              <div className="flex items-start justify-between gap-2 mb-1.5">
                <p className="text-sm font-semibold text-fg leading-snug line-clamp-1">{asset.internalName}</p>
                <OccupancyBadge status={asset.occupancyStatus} />
              </div>
              <div className="flex items-center gap-3 text-xs text-fg-muted flex-wrap">
                {asset.bedrooms > 0 && <span className="flex items-center gap-1"><BedDouble size={11} />{asset.bedrooms} bed</span>}
                {asset.bathrooms > 0 && <span className="flex items-center gap-1"><Bath size={11} />{asset.bathrooms} bath</span>}
                {asset.maxOccupancy > 0 && <span className="flex items-center gap-1"><Users size={11} />{asset.maxOccupancy} guests</span>}
              </div>

              {listing && (
                <div className="mt-3 pt-3 border-t border-border">
                  <div className="flex items-center justify-between">
                    <span className={cn(
                      "text-[11px] font-semibold px-2 py-0.5 rounded-full",
                      listing.status === ListingStatus.Active ? "bg-success/10 text-success" : "bg-warning/10 text-warning",
                    )}>
                      {listing.status === ListingStatus.Active ? "Published" : "Draft"}
                    </span>
                    {listing.status === ListingStatus.Draft && (
                      <button
                        onClick={() => { setPublishStartDate(""); setPublishEndDate(""); setPublishDurationMonths(""); setPublishOpen(true); }}
                        className="text-[11px] font-semibold text-brand hover:underline"
                      >
                        Publish →
                      </button>
                    )}
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Navigation */}
          <div className="bg-bg-card rounded-2xl border border-border shadow-card p-2">
            {NAV.map((n) => (
              <NavItem
                key={n.id}
                icon={n.icon}
                label={n.label}
                active={section === n.id}
                badge={n.badge}
                onClick={() => setSection(n.id)}
              />
            ))}
          </div>

          {/* Delete property */}
          <button
            onClick={() => setDeleteOpen(true)}
            className="w-full flex items-center justify-center gap-2 py-2.5 text-xs font-medium text-fg-muted hover:text-danger transition-colors rounded-xl hover:bg-danger/5"
          >
            <Trash2 size={13} />
            Delete property
          </button>
        </aside>

        {/* ── Right content ── */}
        <div className="flex-1 min-w-0 bg-bg-card rounded-2xl border border-border shadow-card p-6">

          {/* OVERVIEW */}
          {section === "overview" && (
            <div className="space-y-6">
              <SectionHeading
                title="Overview"
                subtitle="Your property at a glance"
              />

              {/* Stats */}
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
                <div className="bg-bg-subtle rounded-xl p-4 text-center">
                  <p className="text-2xl font-bold text-fg">{bookings?.length ?? 0}</p>
                  <p className="text-xs text-fg-muted mt-1">Total bookings</p>
                </div>
                <div className="bg-bg-subtle rounded-xl p-4 text-center">
                  <p className="text-2xl font-bold text-fg">{openTickets.length}</p>
                  <p className="text-xs text-fg-muted mt-1">Open tickets</p>
                </div>
                {summary && (
                  <div className={cn("bg-bg-subtle rounded-xl p-4 text-center", "sm:col-span-1 col-span-2")}>
                    <p className={cn("text-2xl font-bold", summary.netProfit >= 0 ? "text-success" : "text-danger")}>
                      {formatThb(summary.netProfit)}
                    </p>
                    <p className="text-xs text-fg-muted mt-1">Net profit</p>
                  </div>
                )}
              </div>

              {/* Active booking */}
              {activeBooking && (
                <div className="rounded-xl border border-border p-4">
                  <p className="text-xs font-semibold text-fg-muted uppercase tracking-wide mb-3">Current tenant</p>
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="font-semibold text-fg">{activeBooking.tenantName ?? "Guest"}</p>
                      <p className="text-sm text-fg-muted">{formatDate(activeBooking.checkInDate)} – {formatDate(activeBooking.checkOutDate)}</p>
                    </div>
                    <Link to={`/me/host/bookings/${activeBooking.id}`} className="text-sm font-semibold text-brand hover:underline flex items-center gap-1">
                      View <ChevronRight size={14} />
                    </Link>
                  </div>
                </div>
              )}

              {/* Quick actions */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                <button onClick={() => { setSection("photos"); }} className="flex flex-col items-center gap-2 p-4 rounded-xl border border-border hover:border-fg-muted hover:bg-bg-subtle transition-all text-center group">
                  <LayoutGrid size={20} className="text-fg-muted group-hover:text-fg" />
                  <span className="text-xs font-medium text-fg-muted group-hover:text-fg">Manage photos</span>
                </button>
                <button onClick={() => { setSection("listing"); }} className="flex flex-col items-center gap-2 p-4 rounded-xl border border-border hover:border-fg-muted hover:bg-bg-subtle transition-all text-center group">
                  <FileText size={20} className="text-fg-muted group-hover:text-fg" />
                  <span className="text-xs font-medium text-fg-muted group-hover:text-fg">Edit listing</span>
                </button>
                <button onClick={() => setBookingOpen(true)} className="flex flex-col items-center gap-2 p-4 rounded-xl border border-border hover:border-fg-muted hover:bg-bg-subtle transition-all text-center group">
                  <CalendarDays size={20} className="text-fg-muted group-hover:text-fg" />
                  <span className="text-xs font-medium text-fg-muted group-hover:text-fg">New booking</span>
                </button>
                <button onClick={() => setTicketOpen(true)} className="flex flex-col items-center gap-2 p-4 rounded-xl border border-border hover:border-fg-muted hover:bg-bg-subtle transition-all text-center group">
                  <Wrench size={20} className="text-fg-muted group-hover:text-fg" />
                  <span className="text-xs font-medium text-fg-muted group-hover:text-fg">New ticket</span>
                </button>
              </div>
            </div>
          )}

          {/* PHOTOS */}
          {section === "photos" && (
            <div>
              <SectionHeading
                title="Photos"
                subtitle="Manage photos for your listing. High-quality photos attract more guests."
              />
              {listing
                ? <PhotoGallery listingId={listing.id} media={listing.media ?? []} />
                : <p className="text-sm text-fg-muted">Create a listing first to add photos.</p>}
            </div>
          )}

          {/* LISTING */}
          {section === "listing" && (
            <div className="space-y-6">
              <SectionHeading
                title="Listing details"
                subtitle="Edit your listing title, price, description, and rules."
                action={listing && (
                  <Button variant="outline" onClick={openEditSettings} className="gap-1.5">
                    <Pencil size={14} />Edit
                  </Button>
                )}
              />

              {!listing ? (
                <div className="text-center py-12">
                  <p className="text-fg-muted mb-4">No listing created yet.</p>
                  <Button className="bg-brand hover:bg-[var(--color-primary-hover)] text-white" onClick={() => createNewVersion.mutate(id!)}>
                    Create listing
                  </Button>
                </div>
              ) : (
                <div className="space-y-5">
                  <Row label="Title" value={listing.title || "—"} />
                  <Row label="Rental type" value={listing.rentalType === RentalType.LongTerm ? "Long-term" : "Short-term"} />
                  <Row label="Price" value={
                    listing.rentalType === RentalType.LongTerm
                      ? `${formatThb(listing.baseMonthlyRate ?? listing.basePrice * 30)} / month`
                      : `${formatThb(listing.basePrice)} / night`
                  } />
                  {listing.wifiName && <Row label="WiFi" value={`${listing.wifiName}${listing.wifiPassword ? ` · ${listing.wifiPassword}` : ""}`} />}
                  {listing.description && <Row label="Description" value={listing.description} multiline />}
                  {listing.houseRules && <Row label="House rules" value={listing.houseRules} multiline />}

                  <div className="pt-2 border-t border-border flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span className={cn(
                        "text-xs font-semibold px-2.5 py-1 rounded-full",
                        listing.status === ListingStatus.Active ? "bg-success/10 text-success" : "bg-warning/10 text-warning",
                      )}>
                        {listing.status === ListingStatus.Active ? "✓ Published" : "Draft — not visible to guests"}
                      </span>
                    </div>
                    <div className="flex gap-2">
                      {listing.status === ListingStatus.Draft && (
                        <Button
                          size="sm"
                          className="bg-brand hover:bg-[var(--color-primary-hover)] text-white"
                          onClick={() => { setPublishStartDate(""); setPublishEndDate(""); setPublishDurationMonths(""); setPublishOpen(true); }}
                        >
                          Publish
                        </Button>
                      )}
                      {listing.status === "Active" && (
                        <Button variant="outline" size="sm" onClick={() => setHotfixOpen(true)}>Apply hotfix</Button>
                      )}
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* BOOKINGS */}
          {section === "bookings" && (
            <div>
              <SectionHeading
                title="Bookings"
                subtitle="All bookings for this property."
                action={
                  <Button className="bg-brand hover:bg-[var(--color-primary-hover)] text-white gap-1.5" onClick={() => setBookingOpen(true)}>
                    <Plus size={14} />New booking
                  </Button>
                }
              />
              {!bookings?.length ? (
                <div className="text-center py-12">
                  <CalendarDays size={36} className="text-fg-subtle mx-auto mb-3" />
                  <p className="text-sm font-semibold text-fg mb-1">No bookings yet</p>
                  <p className="text-sm text-fg-muted mb-4">Create a booking to get started.</p>
                  <Button className="bg-brand hover:bg-[var(--color-primary-hover)] text-white gap-1.5" onClick={() => setBookingOpen(true)}>
                    <Plus size={14} />New booking
                  </Button>
                </div>
              ) : (
                <div className="divide-y divide-border">
                  {bookings.map((b) => (
                    <Link key={b.id} to={`/me/host/bookings/${b.id}`}
                      className="flex items-center justify-between py-3.5 hover:bg-bg-subtle -mx-2 px-2 rounded-lg transition-colors group">
                      <div>
                        <p className="text-sm font-semibold text-fg group-hover:text-brand">{b.tenantName ?? "Guest"}</p>
                        <p className="text-xs text-fg-muted">{formatDate(b.checkInDate)} – {formatDate(b.checkOutDate)}</p>
                      </div>
                      <div className="flex items-center gap-2">
                        <Badge variant="outline" className="text-xs">{b.status}</Badge>
                        <ChevronRight size={14} className="text-fg-subtle" />
                      </div>
                    </Link>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* TICKETS */}
          {section === "tickets" && (
            <div>
              <SectionHeading
                title="Tickets"
                subtitle="Maintenance requests and issues."
                action={
                  <div className="flex gap-2">
                    <Button variant="outline" className="gap-1.5" onClick={() => setTicketOpen(true)}>
                      <Plus size={14} />New ticket
                    </Button>
                    <Button asChild variant="ghost">
                      <Link to="/me/host/tickets">View all</Link>
                    </Button>
                  </div>
                }
              />
              {!openTickets.length ? (
                <div className="text-center py-12">
                  <Wrench size={36} className="text-fg-subtle mx-auto mb-3" />
                  <p className="text-sm font-semibold text-fg mb-1">No open tickets</p>
                  <p className="text-sm text-fg-muted">Create a ticket to track maintenance or issues.</p>
                </div>
              ) : (
                <div className="divide-y divide-border">
                  {openTickets.map((t) => (
                    <Link key={t.id} to={`/me/host/tickets/${t.id}`}
                      className="flex items-center justify-between py-3.5 hover:bg-bg-subtle -mx-2 px-2 rounded-lg transition-colors group">
                      <div className="flex items-center gap-3 min-w-0">
                        <span className="text-lg shrink-0">{ticketKindIcon(t.kind)}</span>
                        <p className="text-sm text-fg group-hover:text-brand line-clamp-1">{t.title}</p>
                      </div>
                      <div className="flex items-center gap-2 shrink-0">
                        <span className={cn("text-xs px-2 py-0.5 rounded-full font-medium", ticketStatusColor(t.status))}>
                          {t.status}
                        </span>
                        <ChevronRight size={14} className="text-fg-subtle" />
                      </div>
                    </Link>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* UTILITIES */}
          {section === "utilities" && (
            <div>
              <SectionHeading
                title="Utilities"
                subtitle="Track utility providers and account numbers."
                action={
                  <Button variant="outline" className="gap-1.5" onClick={() => setAddUtilityOpen(true)}>
                    <Plus size={14} />Add utility
                  </Button>
                }
              />
              {!utilities?.length ? (
                <div className="text-center py-12">
                  <Zap size={36} className="text-fg-subtle mx-auto mb-3" />
                  <p className="text-sm font-semibold text-fg mb-1">No utilities added</p>
                  <p className="text-sm text-fg-muted mb-4">Add electricity, water, internet, and more.</p>
                  <Button variant="outline" className="gap-1.5" onClick={() => setAddUtilityOpen(true)}>
                    <Plus size={14} />Add utility
                  </Button>
                </div>
              ) : (
                <div className="space-y-2">
                  {utilities.map((u) => (
                    <div key={u.id} className="flex items-center justify-between p-3.5 rounded-xl border border-border hover:border-fg-muted transition-colors">
                      <div className="flex items-center gap-3">
                        <div className="w-9 h-9 rounded-lg bg-bg-subtle flex items-center justify-center">
                          <Zap size={16} className="text-fg-muted" />
                        </div>
                        <div>
                          <p className="text-sm font-semibold text-fg">{u.utilityType}</p>
                          {u.providerName && <p className="text-xs text-fg-muted">{u.providerName}</p>}
                          {u.accountNumber && <p className="text-xs text-fg-subtle font-mono">{u.accountNumber}</p>}
                        </div>
                      </div>
                      <button
                        onClick={() => deleteUtility.mutate(u.id)}
                        className="w-8 h-8 rounded-lg hover:bg-danger/10 flex items-center justify-center text-fg-subtle hover:text-danger transition-colors"
                      >
                        <Trash2 size={13} />
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* AMENITIES */}
          {section === "amenities" && (
            <div>
              <SectionHeading
                title="Amenities"
                subtitle="What does your place offer? Guests can filter by amenities."
              />
              {listing
                ? <AmenitiesSection listingId={listing.id} listingAmenities={listing.amenities} />
                : <p className="text-sm text-fg-muted">Create a listing first to manage amenities.</p>}
            </div>
          )}

          {/* FINANCES */}
          {section === "finances" && (
            <div className="space-y-6">
              <SectionHeading
                title="Finances"
                subtitle="Revenue and expense summary for this property."
              />
              {!summary ? (
                <p className="text-sm text-fg-muted text-center py-12">No financial data available yet.</p>
              ) : (
                <div className="space-y-3">
                  <div className="grid grid-cols-2 gap-4">
                    <div className="bg-bg-subtle rounded-xl p-5">
                      <p className="text-xs text-fg-muted mb-1">Total revenue</p>
                      <p className="text-2xl font-bold text-fg">{formatThb(summary.totalRevenue)}</p>
                    </div>
                    <div className="bg-bg-subtle rounded-xl p-5">
                      <p className="text-xs text-fg-muted mb-1">Total expenses</p>
                      <p className="text-2xl font-bold text-fg">{formatThb(summary.totalExpenses)}</p>
                    </div>
                  </div>
                  <div className={cn(
                    "rounded-xl p-5 flex items-center justify-between",
                    summary.netProfit >= 0 ? "bg-success/8 border border-success/20" : "bg-danger/8 border border-danger/20",
                  )}>
                    <div>
                      <p className="text-xs font-semibold text-fg-muted mb-1">Net profit</p>
                      <p className={cn("text-3xl font-bold", summary.netProfit >= 0 ? "text-success" : "text-danger")}>
                        {formatThb(summary.netProfit)}
                      </p>
                    </div>
                    <BarChart2 size={40} className={summary.netProfit >= 0 ? "text-success/30" : "text-danger/30"} />
                  </div>
                </div>
              )}
            </div>
          )}

        </div>
      </div>

      {/* ── Dialogs (unchanged) ── */}

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

      <Dialog open={bookingOpen} onOpenChange={setBookingOpen}>
        <DialogContent className="max-w-sm">
          <DialogHeader><DialogTitle>New booking</DialogTitle></DialogHeader>
          <div className="space-y-4 py-2">
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label>Check-in</Label>
                <DatePicker value={bookingCheckIn} onChange={(v) => { setBookingCheckIn(v); if (bookingCheckOut && v >= bookingCheckOut) setBookingCheckOut(""); }} placeholder="Pick date" />
              </div>
              <div className="space-y-1.5">
                <Label>Check-out</Label>
                <DatePicker value={bookingCheckOut} onChange={setBookingCheckOut} placeholder="Pick date" isDisabled={(d) => !!bookingCheckIn && d <= new Date(bookingCheckIn + "T00:00:00")} />
              </div>
            </div>
            <div className="space-y-1.5">
              <Label>Security deposit (฿)</Label>
              <Input type="number" min="0" step="100" placeholder="0" value={bookingDeposit} onChange={(e) => setBookingDeposit(e.target.value)} />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setBookingOpen(false)}>Cancel</Button>
            <Button className="bg-brand hover:bg-[var(--color-primary-hover)] text-white" disabled={!bookingCheckIn || !bookingCheckOut || createBooking.isPending} onClick={handleCreateBooking}>
              {createBooking.isPending ? "Creating…" : "Create"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={ticketOpen} onOpenChange={setTicketOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader><DialogTitle>New ticket</DialogTitle></DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-1.5">
              <Label>Title</Label>
              <Input value={ticketTitle} onChange={(e) => setTicketTitle(e.target.value)} placeholder="Brief description of the issue" />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label>Type</Label>
                <select className="w-full text-sm rounded-lg border border-border bg-bg-card px-3 py-2 text-fg outline-none focus:ring-2 focus:ring-brand/30" value={ticketType} onChange={(e) => setTicketType(e.target.value as TicketType)}>
                  {Object.values(TicketType).map((t) => <option key={t} value={t}>{t}</option>)}
                </select>
              </div>
              <div className="space-y-1.5">
                <Label>Kind</Label>
                <select className="w-full text-sm rounded-lg border border-border bg-bg-card px-3 py-2 text-fg outline-none focus:ring-2 focus:ring-brand/30" value={ticketKind} onChange={(e) => setTicketKind(e.target.value as TicketKind)}>
                  {Object.values(TicketKind).map((k) => <option key={k} value={k}>{k}</option>)}
                </select>
              </div>
            </div>
            <div className="space-y-1.5">
              <Label>Description (optional)</Label>
              <Textarea value={ticketDesc} onChange={(e) => setTicketDesc(e.target.value)} className="min-h-[80px] resize-none" />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setTicketOpen(false)}>Cancel</Button>
            <Button className="bg-brand hover:bg-[var(--color-primary-hover)] text-white" disabled={!ticketTitle.trim() || createTicket.isPending} onClick={handleCreateTicket}>
              {createTicket.isPending ? "Creating…" : "Create ticket"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={editOpen} onOpenChange={setEditOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader><DialogTitle>Edit listing details</DialogTitle></DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-1.5"><Label>Title</Label><Input value={editTitle} onChange={(e) => setEditTitle(e.target.value)} /></div>
            <div className="space-y-1.5"><Label>Description</Label><Textarea value={editDesc} onChange={(e) => setEditDesc(e.target.value)} className="min-h-[80px] resize-none" /></div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5"><Label>WiFi name</Label><Input value={editWifiName} onChange={(e) => setEditWifiName(e.target.value)} /></div>
              <div className="space-y-1.5"><Label>WiFi password</Label><Input value={editWifiPwd} onChange={(e) => setEditWifiPwd(e.target.value)} /></div>
            </div>
            <div className="space-y-1.5">
              <Label>{editRentalType === RentalType.LongTerm ? "Monthly rate (฿)" : "Nightly rate (฿)"}</Label>
              <Input type="number" value={editRentalType === RentalType.LongTerm ? editMonthlyPrice || "" : editPrice || ""} onChange={(e) => editRentalType === RentalType.LongTerm ? setEditMonthlyPrice(Number(e.target.value)) : setEditPrice(Number(e.target.value))} />
            </div>
            <div className="space-y-1.5"><Label>House rules</Label><Textarea value={editRules} onChange={(e) => setEditRules(e.target.value)} className="min-h-[60px] resize-none" /></div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditOpen(false)}>Cancel</Button>
            <Button disabled={saving} onClick={handleSaveSettings} className="bg-brand hover:bg-[var(--color-primary-hover)] text-white">
              {saving ? "Saving…" : "Save changes"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={publishOpen} onOpenChange={setPublishOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader><DialogTitle>Publish listing</DialogTitle></DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-1.5"><Label>Start date *</Label><DatePicker value={publishStartDate} onChange={setPublishStartDate} /></div>
            {isLongTerm ? (
              <div className="space-y-1.5">
                <Label>Duration (months) *</Label>
                <Input type="number" min={1} value={publishDurationMonths} onChange={(e) => setPublishDurationMonths(e.target.value)} />
                {publishStartDate && publishDurationMonths && (
                  <p className="text-xs text-fg-muted">Ends: {formatDate(computedEndDate)}</p>
                )}
              </div>
            ) : (
              <div className="space-y-1.5"><Label>End date *</Label><DatePicker value={publishEndDate} onChange={setPublishEndDate} /></div>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setPublishOpen(false)}>Cancel</Button>
            <Button className="bg-brand hover:bg-[var(--color-primary-hover)] text-white" disabled={publishListing.isPending} onClick={handlePublish}>
              {publishListing.isPending ? "Publishing…" : "Publish"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={hotfixOpen} onOpenChange={setHotfixOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader><DialogTitle>Apply hotfix</DialogTitle></DialogHeader>
          <div className="space-y-3 py-2">
            <div className="flex items-start gap-2 bg-warning/10 rounded-lg p-3">
              <AlertTriangle size={15} className="text-warning mt-0.5 shrink-0" />
              <p className="text-xs text-warning">A hotfix applies changes to an active listing. Provide a clear reason.</p>
            </div>
            <div className="space-y-1.5">
              <Label>Reason *</Label>
              <Textarea value={hotfixReason} onChange={(e) => setHotfixReason(e.target.value)} className="min-h-[80px] resize-none" placeholder="e.g. Price correction requested by landlord" />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setHotfixOpen(false)}>Cancel</Button>
            <Button disabled={!hotfixReason.trim() || hotfixListing.isPending} onClick={handleHotfix} className="bg-brand hover:bg-[var(--color-primary-hover)] text-white">
              {hotfixListing.isPending ? "Applying…" : "Apply hotfix"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={addUtilityOpen} onOpenChange={setAddUtilityOpen}>
        <DialogContent className="max-w-sm">
          <DialogHeader><DialogTitle>Add utility</DialogTitle></DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-1.5">
              <Label>Type</Label>
              <Select value={utilType} onValueChange={(v) => setUtilType(v as UtilityType)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>{Object.values(UtilityType).map((t) => <SelectItem key={t} value={t}>{t}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5"><Label>Provider name</Label><Input value={providerName} onChange={(e) => setProviderName(e.target.value)} placeholder="e.g. PEA" /></div>
            <div className="space-y-1.5"><Label>Account number</Label><Input value={accountNumber} onChange={(e) => setAccountNumber(e.target.value)} /></div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setAddUtilityOpen(false)}>Cancel</Button>
            <Button disabled={createUtility.isPending} onClick={handleAddUtility} className="bg-brand hover:bg-[var(--color-primary-hover)] text-white">
              {createUtility.isPending ? "Adding…" : "Add utility"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

// ─── Row helper ───────────────────────────────────────────────────────────────

function Row({ label, value, multiline }: { label: string; value: string; multiline?: boolean }) {
  return (
    <div className={cn("grid gap-1", multiline ? "grid-cols-1" : "grid-cols-[140px_1fr]")}>
      <p className="text-xs font-semibold text-fg-muted uppercase tracking-wide pt-0.5">{label}</p>
      <p className={cn("text-sm text-fg", multiline && "mt-1 whitespace-pre-line leading-relaxed text-fg-muted")}>{value}</p>
    </div>
  );
}
