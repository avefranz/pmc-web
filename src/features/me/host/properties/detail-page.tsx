import { useState, useRef } from "react";
import { useParams, Link, useNavigate } from "react-router-dom";
import {
  ArrowLeft, Plus, Trash2, Pencil, ImagePlus, X,
  BedDouble, Bath, Users, Zap, AlertTriangle,
  LayoutGrid, FileText, CalendarDays, Wrench, Settings,
  BarChart2, Home, ChevronRight, CheckCircle2,
  ImageIcon, TrendingUp,
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
import { getPlaceholderImage } from "@/lib/utils/placeholder-images";
import { useQueryClient } from "@tanstack/react-query";

type Section = "overview" | "photos" | "listing" | "bookings" | "tickets" | "utilities" | "amenities" | "finances";


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
      await listingsApi.updateAmenities(listingId, (refAmenities ?? []).map((d) => ({ amenityId: d.id as number, isPresent: next.has(d.id as number) })));
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
    [AssetOccupancyStatus.Occupied]:       { label: "Occupied",        cls: "bg-[rgb(var(--color-info-bg))] text-[rgb(var(--color-info))] border-[rgb(var(--color-info))]/20" },
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

  const computedEndDate: string | null = isLongTerm && publishStartDate && publishDurationMonths
    ? addMonthsFn(publishStartDate, parseInt(publishDurationMonths))
    : (publishEndDate || null);

  // open-ended = no duration required for long-term
  const canPublish = isLongTerm ? !!publishStartDate : !!publishStartDate && !!publishEndDate;

  async function handlePublish() {
    if (!listing) return;
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
  const [editDepositAmount, setEditDepositAmount] = useState(0);
  const [editWifiName, setEditWifiName] = useState("");
  const [editWifiPwd, setEditWifiPwd] = useState("");
  const [editRules, setEditRules] = useState("");
  const [editRentalType, setEditRentalType] = useState<RentalType>(RentalType.LongTerm);
  const [editDiscountTiers, setEditDiscountTiers] = useState<{ minMonths: number; discountPercent: number }[]>([]);
  const [saving, setSaving] = useState(false);

  function openEditSettings() {
    if (!listing) return;
    setEditTitle(listing.title);
    setEditDesc(listing.description ?? "");
    setEditPrice(listing.basePrice);
    setEditMonthlyPrice(listing.baseMonthlyRate ?? 0);
    setEditDepositAmount(listing.depositAmount ?? 0);
    setEditWifiName(listing.wifiName ?? "");
    setEditWifiPwd(listing.wifiPassword ?? "");
    setEditRules(listing.houseRules ?? "");
    setEditRentalType((listing.rentalType as RentalType) ?? RentalType.LongTerm);
    setEditDiscountTiers(listing.discountTiers ?? []);
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
        depositAmount: editDepositAmount,
        discountTiers: editDiscountTiers,
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
                  ? "bg-fg text-bg-card"
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
              <img
                src={coverPhoto ?? getPlaceholderImage(asset.id)}
                alt={asset.internalName}
                className="w-full h-full object-cover"
              />
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
          {section === "overview" && (() => {
            const hasPhotos = (listing?.media?.length ?? 0) > 0;
            const isPublished = listing?.status === ListingStatus.Active;
            const hasListingDetails = !!listing?.title;
            const hasBookings = (bookings?.length ?? 0) > 0;
            const isNewProperty = !hasBookings && !isPublished;

            const setupSteps = [
              {
                id: "created",
                label: "Property created",
                desc: `${asset.internalName} — ${[asset.bedrooms && `${asset.bedrooms} bed`, asset.bathrooms && `${asset.bathrooms} bath`].filter(Boolean).join(", ")}`,
                done: true,
                action: null as null | (() => void),
              },
              {
                id: "listing",
                label: "Listing details set",
                desc: hasListingDetails
                  ? listing!.baseMonthlyRate
                    ? `฿${listing!.baseMonthlyRate.toLocaleString()} / month · ${listing!.title}`
                    : listing!.title
                  : "Add title, price, and description",
                done: hasListingDetails,
                action: () => setSection("listing"),
              },
              {
                id: "photos",
                label: "Add photos",
                desc: hasPhotos
                  ? `${listing!.media.length} photo${listing!.media.length !== 1 ? "s" : ""} added`
                  : "High-quality photos get 3× more inquiries",
                done: hasPhotos,
                action: () => setSection("photos"),
              },
              {
                id: "publish",
                label: "Publish your listing",
                desc: isPublished
                  ? `Live since ${listing?.publishedAt ? formatDate(listing.publishedAt) : "recently"}`
                  : "Go live and start receiving booking requests",
                done: isPublished,
                action: () => { setPublishStartDate(""); setPublishEndDate(""); setPublishDurationMonths(""); setPublishOpen(true); },
              },
            ];

            const doneCount = setupSteps.filter((s) => s.done).length;
            const nextStep = setupSteps.find((s) => !s.done);
            const allDone = doneCount === setupSteps.length;

            const pct = Math.round((doneCount / setupSteps.length) * 100);
            const motivationalCopy = allDone
              ? { headline: "You're live.", sub: "Sit back and wait for your first booking request." }
              : doneCount === 0
              ? { headline: "Let's get this ready.", sub: "A few steps stand between you and your first booking." }
              : doneCount === 1
              ? { headline: "Good start. Keep going.", sub: `${setupSteps.length - doneCount} steps until you're live.` }
              : doneCount === setupSteps.length - 1
              ? { headline: "Almost there. One step left.", sub: "You're this close to your first booking request." }
              : { headline: "Good progress.", sub: `${setupSteps.length - doneCount} more steps until launch.` };

            return (
              <div className="space-y-6">
                {isNewProperty ? (
                  /* ── Getting-started checklist ── */
                  <div>
                    <style>{`
                      @keyframes bar-shine {
                        0% { background-position: -200% center; }
                        100% { background-position: 200% center; }
                      }
                      @keyframes step-done-pop {
                        0% { transform: scale(1); }
                        40% { transform: scale(1.03); }
                        100% { transform: scale(1); }
                      }
                      @keyframes next-pulse {
                        0%,100% { box-shadow: 0 0 0 0 rgba(99,102,241,.3); }
                        50% { box-shadow: 0 0 0 6px rgba(99,102,241,0); }
                      }
                    `}</style>

                    {/* ── Header card ── */}
                    <div className="rounded-2xl overflow-hidden mb-5" style={{ background: "linear-gradient(160deg,#0f172a 0%,#1e293b 100%)" }}>
                      {/* Subtle brand accent — single radial glow, no particles */}
                      <div style={{ position:"absolute", left:0, right:0, top:0, height:120, background:"radial-gradient(ellipse at 20% 0%,rgba(99,102,241,.18) 0%,transparent 70%)", pointerEvents:"none" }} />
                      <div className="relative px-6 pt-6 pb-5">
                        <div className="flex items-center justify-between gap-4 mb-5">
                          <div>
                            <p className="text-[11px] font-bold uppercase tracking-widest mb-1.5" style={{ color:"rgba(255,255,255,.35)" }}>
                              Setup checklist
                            </p>
                            <h2 className="text-lg font-bold text-white leading-snug">
                              {motivationalCopy.headline}
                            </h2>
                            <p className="text-sm mt-1" style={{ color:"rgba(255,255,255,.45)" }}>
                              {motivationalCopy.sub}
                            </p>
                          </div>
                          {/* Percentage — clean, typographic */}
                          <div className="shrink-0 text-right">
                            <span className="text-4xl font-black leading-none" style={{
                              background:"linear-gradient(135deg,#fff 40%,rgba(255,255,255,.5))",
                              WebkitBackgroundClip:"text",
                              WebkitTextFillColor:"transparent",
                            }}>{pct}</span>
                            <span className="text-lg font-bold text-white/50 ml-0.5">%</span>
                            <p className="text-[10px] font-semibold mt-0.5" style={{ color:"rgba(255,255,255,.3)" }}>
                              {doneCount} of {setupSteps.length}
                            </p>
                          </div>
                        </div>

                        {/* Progress bar — clean single color, no rainbow */}
                        <div className="h-1.5 rounded-full overflow-hidden" style={{ background:"rgba(255,255,255,.1)" }}>
                          <div
                            className="h-full rounded-full transition-all duration-700"
                            style={{
                              width:`${pct}%`,
                              background:"linear-gradient(90deg,#6366f1,#818cf8)",
                            }}
                          />
                        </div>
                      </div>
                    </div>

                    {/* ── Steps ── */}
                    <div className="space-y-2">
                      {setupSteps.map((step, i) => {
                        const isNext = step.id === nextStep?.id;
                        return (
                          <div
                            key={step.id}
                            className="flex items-center gap-4 rounded-xl border transition-all duration-200"
                            style={step.done ? {
                              background: "#f8fdf9",
                              border: "1px solid #d1fae5",
                              padding: "13px 16px",
                            } : isNext ? {
                              background: "white",
                              border: "1px solid #c4b5fd",
                              padding: "13px 16px",
                              boxShadow: "0 2px 12px rgba(99,102,241,.08)",
                            } : {
                              background: "#fafafa",
                              border: "1px solid #e4e4e7",
                              padding: "13px 16px",
                              opacity: 0.5,
                            }}
                          >
                            {/* Icon */}
                            <div className="shrink-0">
                              {step.done ? (
                                <div className="w-7 h-7 rounded-full bg-emerald-500 flex items-center justify-center">
                                  <CheckCircle2 size={16} className="text-white" strokeWidth={2.5} />
                                </div>
                              ) : isNext ? (
                                <div className="w-7 h-7 rounded-full flex items-center justify-center text-xs font-black text-white bg-indigo-500">
                                  {i + 1}
                                </div>
                              ) : (
                                <div className="w-7 h-7 rounded-full border-2 border-zinc-200 flex items-center justify-center text-xs font-bold text-zinc-400">
                                  {i + 1}
                                </div>
                              )}
                            </div>

                            {/* Text */}
                            <div className="flex-1 min-w-0">
                              <p className={cn(
                                "text-sm font-semibold leading-snug",
                                step.done ? "text-emerald-800" : isNext ? "text-fg" : "text-fg-muted",
                              )}>
                                {step.label}
                              </p>
                              <p className="text-xs text-fg-muted mt-0.5 truncate">{step.desc}</p>
                            </div>

                            {/* CTA */}
                            {step.done ? (
                              <span className="shrink-0 text-xs font-semibold text-emerald-600">Done</span>
                            ) : isNext && step.action ? (
                              <button
                                onClick={step.action}
                                className="shrink-0 flex items-center gap-1 text-sm font-semibold text-white px-3.5 py-1.5 rounded-lg bg-indigo-500 hover:bg-indigo-600 transition-colors active:scale-95"
                              >
                                Go <ChevronRight size={13} strokeWidth={2.5} />
                              </button>
                            ) : null}
                          </div>
                        );
                      })}
                    </div>

                    {/* ── Tips ── */}
                    {!allDone && (
                      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mt-5">
                        {[
                          { icon: ImageIcon,  color: "text-blue-500",   bg: "bg-blue-50",   title: "Photos matter most",        body: "Listings with 5+ photos get significantly more inquiries. Use natural light." },
                          { icon: FileText,   color: "text-indigo-500", bg: "bg-indigo-50", title: "Write a great description",  body: "Describe the neighbourhood, nearby transport, and what makes the place special." },
                          { icon: TrendingUp, color: "text-emerald-500",bg: "bg-emerald-50",title: "Price it right",             body: "Check nearby listings to set a competitive monthly rate for your area." },
                        ].map((tip) => (
                          <div key={tip.title} className="rounded-xl border border-border p-4 bg-bg-card hover:border-zinc-300 transition-colors">
                            <div className={cn("w-8 h-8 rounded-lg flex items-center justify-center mb-3", tip.bg)}>
                              <tip.icon size={15} className={tip.color} />
                            </div>
                            <p className="text-xs font-semibold text-fg mb-1">{tip.title}</p>
                            <p className="text-xs text-fg-muted leading-relaxed">{tip.body}</p>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                ) : isPublished && !hasBookings ? (
                  /* ── Just launched — waiting for first booking ── */
                  <div>
                    <style>{`
                      @keyframes live-pulse { 0%,100%{opacity:1;transform:scale(1)} 50%{opacity:.4;transform:scale(1.5)} }
                      @keyframes spark-fly {
                        0%   { transform: translate(0,0) scale(1); opacity:1; }
                        100% { transform: translate(var(--sx),var(--sy)) scale(0); opacity:0; }
                      }
                      @keyframes live-pop { 0%{transform:scale(0);opacity:0} 65%{transform:scale(1.06)} 100%{transform:scale(1);opacity:1} }
                    `}</style>

                    {/* ── Celebration hero ── */}
                    <div className="rounded-2xl overflow-hidden mb-5 relative" style={{ background:"linear-gradient(160deg,#052e16 0%,#14532d 55%,#0d2818 100%)" }}>
                      {/* Spark particles — fly outward from center */}
                      {[
                        { sx:"-60px", sy:"-50px", c:"#4ade80", d:0 },
                        { sx:"60px",  sy:"-60px", c:"#fbbf24", d:.15 },
                        { sx:"70px",  sy:"30px",  c:"#818cf8", d:.05 },
                        { sx:"-70px", sy:"35px",  c:"#f472b6", d:.2 },
                        { sx:"0px",   sy:"-70px", c:"#34d399", d:.1 },
                        { sx:"-40px", sy:"65px",  c:"#a78bfa", d:.25 },
                        { sx:"45px",  sy:"60px",  c:"#fb923c", d:.08 },
                        { sx:"-80px", sy:"-10px", c:"#67e8f9", d:.18 },
                      ].map((s,i) => (
                        <div key={i} style={{
                          position:"absolute", top:"50%", left:"50%",
                          width:6, height:6, borderRadius:"50%", background:s.c,
                          "--sx":s.sx, "--sy":s.sy,
                          animation:`spark-fly .8s cubic-bezier(.2,.8,.4,1) ${s.d}s both`,
                        } as React.CSSProperties} />
                      ))}
                      <div style={{ position:"absolute", inset:0, background:"radial-gradient(ellipse at 50% 0%,rgba(74,222,128,.12) 0%,transparent 70%)", pointerEvents:"none" }} />

                      <div className="relative px-6 py-7 flex items-center gap-5">
                        <div className="shrink-0 text-5xl" style={{ animation:"live-pop .5s cubic-bezier(.34,1.56,.64,1) .1s both" }}>🏡</div>
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-1">
                            <span className="text-[11px] font-bold uppercase tracking-widest" style={{ color:"rgba(74,222,128,.6)" }}>Live</span>
                            <span className="w-2 h-2 rounded-full bg-emerald-400 shrink-0" style={{ animation:"live-pulse 1.8s ease-in-out infinite" }} />
                          </div>
                          <h2 className="text-xl font-extrabold text-white leading-snug">Your listing is live.</h2>
                          <p className="text-sm mt-0.5" style={{ color:"rgba(255,255,255,.45)" }}>
                            Tenants searching in{" "}
                            <span className="text-white/70 font-medium">{asset.addressLine?.["en"] ?? "your area"}</span>{" "}
                            can now find and book your place.
                          </p>
                        </div>
                      </div>

                      {/* Full green bar */}
                      <div className="mx-6 mb-5 h-1 rounded-full overflow-hidden" style={{ background:"rgba(255,255,255,.1)" }}>
                        <div className="h-full rounded-full bg-emerald-400 w-full" />
                      </div>
                    </div>

                    {/* ── What happens next ── */}
                    <p className="text-[11px] font-bold text-fg-muted uppercase tracking-widest mb-3">What happens next</p>
                    <div className="space-y-2 mb-5">
                      {[
                        { n:1, title:"Tenants discover your listing", desc:"Your property appears in search results for people looking in your area and price range." },
                        { n:2, title:"A tenant sends a booking request", desc:"You'll get notified and can review their details before accepting or declining." },
                        { n:3, title:"Sign the contract & confirm", desc:"Upload the signed lease and your booking is officially confirmed — money incoming." },
                      ].map((item) => (
                        <div key={item.n} className="flex items-start gap-3.5 p-4 rounded-xl border border-border bg-bg-subtle">
                          <div className="w-6 h-6 rounded-full bg-fg flex items-center justify-center shrink-0 mt-0.5">
                            <span className="text-[10px] font-black text-white">{item.n}</span>
                          </div>
                          <div>
                            <p className="text-sm font-semibold text-fg">{item.title}</p>
                            <p className="text-xs text-fg-muted mt-0.5 leading-relaxed">{item.desc}</p>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                ) : (
                  /* ── Active property stats (has bookings) ── */
                  <div className="space-y-4">
                    <SectionHeading title="Overview" subtitle="Your property at a glance" />

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
                  </div>
                )}

                {/* Quick actions — always visible */}
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                  {[
                    { icon: LayoutGrid, label: "Manage photos", onClick: () => setSection("photos") },
                    { icon: FileText,   label: "Edit listing",  onClick: () => setSection("listing") },
                    { icon: CalendarDays, label: "New booking", onClick: () => setBookingOpen(true) },
                    { icon: Wrench,     label: "New ticket",   onClick: () => setTicketOpen(true) },
                  ].map((a) => (
                    <button
                      key={a.label}
                      onClick={a.onClick}
                      className="flex flex-col items-center gap-2 p-4 rounded-xl border border-border hover:border-fg-muted hover:bg-bg-subtle transition-all text-center group"
                    >
                      <a.icon size={20} className="text-fg-muted group-hover:text-fg" />
                      <span className="text-xs font-medium text-fg-muted group-hover:text-fg">{a.label}</span>
                    </button>
                  ))}
                </div>
              </div>
            );
          })()}

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
                  <Button className="bg-brand hover:bg-[rgb(var(--color-primary-hover))] text-white" onClick={() => createNewVersion.mutate(id!)}>
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
                  {listing.depositAmount > 0 && (
                    <Row label="Security deposit" value={formatThb(listing.depositAmount)} />
                  )}
                  {listing.discountTiers && listing.discountTiers.length > 0 && (
                    <Row label="Long-stay discounts" value={listing.discountTiers
                      .sort((a, b) => a.minMonths - b.minMonths)
                      .map((t) => `${t.minMonths}mo → ${t.discountPercent}% off`)
                      .join(" · ")} />
                  )}
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
                          className="bg-brand hover:bg-[rgb(var(--color-primary-hover))] text-white"
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
                  <Button className="bg-brand hover:bg-[rgb(var(--color-primary-hover))] text-white gap-1.5" onClick={() => setBookingOpen(true)}>
                    <Plus size={14} />New booking
                  </Button>
                }
              />
              {!bookings?.length ? (
                <div className="text-center py-12">
                  <CalendarDays size={36} className="text-fg-subtle mx-auto mb-3" />
                  <p className="text-sm font-semibold text-fg mb-1">No bookings yet</p>
                  <p className="text-sm text-fg-muted mb-4">Create a booking to get started.</p>
                  <Button className="bg-brand hover:bg-[rgb(var(--color-primary-hover))] text-white gap-1.5" onClick={() => setBookingOpen(true)}>
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
            <Button className="bg-brand hover:bg-[rgb(var(--color-primary-hover))] text-white" disabled={!bookingCheckIn || !bookingCheckOut || createBooking.isPending} onClick={handleCreateBooking}>
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
            <Button className="bg-brand hover:bg-[rgb(var(--color-primary-hover))] text-white" disabled={!ticketTitle.trim() || createTicket.isPending} onClick={handleCreateTicket}>
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
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label>{editRentalType === RentalType.LongTerm ? "Monthly rate (฿)" : "Nightly rate (฿)"}</Label>
                <Input type="number" value={editRentalType === RentalType.LongTerm ? editMonthlyPrice || "" : editPrice || ""} onChange={(e) => editRentalType === RentalType.LongTerm ? setEditMonthlyPrice(Number(e.target.value)) : setEditPrice(Number(e.target.value))} />
              </div>
              <div className="space-y-1.5">
                <Label>Security deposit (฿)</Label>
                <Input type="number" value={editDepositAmount || ""} onChange={(e) => setEditDepositAmount(Number(e.target.value))} placeholder="0" min={0} />
              </div>
            </div>
            {editRentalType === RentalType.LongTerm && (
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <Label>Long-stay discounts</Label>
                  <button
                    type="button"
                    onClick={() => setEditDiscountTiers((prev) => [...prev, { minMonths: 3, discountPercent: 5 }])}
                    className="text-xs font-semibold text-brand hover:underline flex items-center gap-1"
                  >
                    <Plus size={12} />Add tier
                  </button>
                </div>
                {editDiscountTiers.length === 0 && (
                  <p className="text-xs text-fg-muted">No discounts set — guests pay the full monthly rate.</p>
                )}
                {editDiscountTiers
                  .sort((a, b) => a.minMonths - b.minMonths)
                  .map((tier, i) => (
                    <div key={i} className="flex items-center gap-2">
                      <div className="flex-1 flex items-center gap-2">
                        <Input
                          type="number"
                          min={1}
                          max={24}
                          value={tier.minMonths}
                          onChange={(e) => setEditDiscountTiers((prev) => prev.map((t, j) => j === i ? { ...t, minMonths: Number(e.target.value) } : t))}
                          className="w-20 text-center"
                        />
                        <span className="text-xs text-fg-muted whitespace-nowrap">months →</span>
                        <Input
                          type="number"
                          min={1}
                          max={50}
                          value={tier.discountPercent}
                          onChange={(e) => setEditDiscountTiers((prev) => prev.map((t, j) => j === i ? { ...t, discountPercent: Number(e.target.value) } : t))}
                          className="w-20 text-center"
                        />
                        <span className="text-xs text-fg-muted">% off</span>
                      </div>
                      <button
                        type="button"
                        onClick={() => setEditDiscountTiers((prev) => prev.filter((_, j) => j !== i))}
                        className="w-7 h-7 rounded-lg hover:bg-danger/10 flex items-center justify-center text-fg-subtle hover:text-danger transition-colors shrink-0"
                      >
                        <X size={13} />
                      </button>
                    </div>
                  ))}
              </div>
            )}
            <div className="space-y-1.5"><Label>House rules</Label><Textarea value={editRules} onChange={(e) => setEditRules(e.target.value)} className="min-h-[60px] resize-none" /></div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditOpen(false)}>Cancel</Button>
            <Button disabled={saving} onClick={handleSaveSettings} className="bg-brand hover:bg-[rgb(var(--color-primary-hover))] text-white">
              {saving ? "Saving…" : "Save changes"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={publishOpen} onOpenChange={setPublishOpen}>
        <DialogContent className="max-w-[460px] overflow-hidden p-0 gap-0 border-0 rounded-2xl shadow-2xl">
          <style>{`
            @keyframes pub-float {
              0%,100% { transform: translateY(0) scale(1); opacity:.8; }
              50% { transform: translateY(-18px) scale(.85); opacity:.35; }
            }
            @keyframes pub-rocket {
              0% { transform: scale(0) rotate(-20deg); opacity:0; }
              60% { transform: scale(1.18) rotate(5deg); opacity:1; }
              80% { transform: scale(.95) rotate(-3deg); }
              100% { transform: scale(1) rotate(0deg); opacity:1; }
            }
            @keyframes pub-shimmer {
              0% { background-position: -300% center; }
              100% { background-position: 300% center; }
            }
            @keyframes pub-pulse {
              0%,100% { box-shadow: 0 0 0 0 rgba(139,92,246,.55); }
              50% { box-shadow: 0 0 0 14px rgba(139,92,246,0); }
            }
          `}</style>

          {/* ── Dark hero ── */}
          <div className="relative overflow-hidden px-8 pt-10 pb-8 text-center" style={{ background: "linear-gradient(145deg,#0f0c29 0%,#302b63 55%,#24243e 100%)" }}>
            {/* Floating colour particles */}
            {[
              { c:"#f59e0b", l:"10%", t:"20%", d:2.8 }, { c:"#10b981", l:"25%", t:"65%", d:3.5 },
              { c:"#6366f1", l:"52%", t:"12%", d:2.2 }, { c:"#f43f5e", l:"70%", t:"58%", d:3.1 },
              { c:"#06b6d4", l:"83%", t:"22%", d:2.6 }, { c:"#a78bfa", l:"40%", t:"75%", d:4.0 },
              { c:"#fb923c", l:"88%", t:"70%", d:3.3 }, { c:"#34d399", l:"6%",  t:"52%", d:2.9 },
            ].map((p,i) => (
              <div key={i} style={{ position:"absolute", width:7, height:7, borderRadius:"50%", background:p.c, left:p.l, top:p.t, animation:`pub-float ${p.d}s ease-in-out infinite`, animationDelay:`${i*.35}s`, filter:"blur(.5px)" }} />
            ))}
            <div style={{ position:"absolute", inset:0, background:"radial-gradient(ellipse at 50% 0%,rgba(99,102,241,.35) 0%,transparent 70%)", pointerEvents:"none" }} />

            <div style={{ fontSize:52, animation:"pub-rocket .55s cubic-bezier(.34,1.56,.64,1) .1s both", position:"relative", display:"inline-block" }}>🚀</div>
            <DialogTitle className="text-[22px] font-extrabold text-white mt-3 mb-1.5 relative">
              Time to launch!
            </DialogTitle>
            <p className="text-sm leading-relaxed relative" style={{ color:"rgba(255,255,255,.55)" }}>
              Thousands of tenants are searching right now.<br />Let your place shine.
            </p>
          </div>

          {/* ── Content ── */}
          <div className="bg-bg-card px-6 pt-5 pb-4 space-y-5">

            {/* No-photos blocker */}
            {!(listing?.media?.length) && (
              <div className="flex items-start gap-3 bg-amber-50 rounded-xl p-3.5 border border-amber-200">
                <AlertTriangle size={16} className="text-amber-500 mt-0.5 shrink-0" />
                <div>
                  <p className="text-xs font-bold text-amber-700">Photos required to publish</p>
                  <p className="text-xs text-amber-600 mt-0.5">
                    Go to the{" "}
                    <button onClick={() => { setPublishOpen(false); setSection("photos"); }} className="underline font-semibold">
                      Photos tab
                    </button>{" "}
                    and add at least one photo. Listings with photos get 3× more views.
                  </p>
                </div>
              </div>
            )}

            {/* Available from */}
            <div>
              <p className="text-[11px] font-bold text-fg-muted uppercase tracking-widest mb-1.5">Available from</p>
              <DatePicker value={publishStartDate} onChange={setPublishStartDate} />
            </div>

            {/* Duration */}
            {isLongTerm ? (() => {
              // Ordered values: 1..24 then open-ended (∞ = "")
              const STEPS = [1,2,3,4,5,6,7,8,9,10,11,12,13,14,15,16,17,18,19,20,21,22,23,24,"∞"] as const;
              const curIdx = publishDurationMonths === "" ? STEPS.length - 1 : STEPS.indexOf(parseInt(publishDurationMonths) as typeof STEPS[number]);
              const dec = () => {
                const prev = STEPS[(curIdx - 1 + STEPS.length) % STEPS.length];
                setPublishDurationMonths(prev === "∞" ? "" : String(prev));
              };
              const inc = () => {
                const next = STEPS[(curIdx + 1) % STEPS.length];
                setPublishDurationMonths(next === "∞" ? "" : String(next));
              };
              const isInfinity = !publishDurationMonths;
              const PRESETS: Array<number | "∞"> = [1, 3, 6, 12, "∞"];
              return (
                <div>
                  <p className="text-[11px] font-bold text-fg-muted uppercase tracking-widest mb-3">How long?</p>

                  {/* Stepper */}
                  <div className="flex items-stretch rounded-2xl overflow-hidden mb-2.5" style={{ border: "2px solid #ececf0", background: "#fafafa" }}>
                    <button type="button" onClick={dec}
                      className="flex-none w-14 flex items-center justify-center text-2xl font-black transition-colors active:scale-95 select-none"
                      style={{ color: "#a1a1aa" }}
                      onMouseEnter={e => (e.currentTarget.style.background="#f0f0f3")}
                      onMouseLeave={e => (e.currentTarget.style.background="transparent")}
                    >−</button>

                    <div className="flex-1 flex flex-col items-center justify-center py-4">
                      {isInfinity ? (
                        <>
                          <span className="text-4xl font-black leading-none" style={{ color:"#8b5cf6" }}>∞</span>
                          <span className="text-xs font-semibold text-zinc-400 mt-1">open-ended</span>
                        </>
                      ) : (
                        <>
                          <span className="text-4xl font-black text-fg leading-none">{publishDurationMonths}</span>
                          <span className="text-xs font-semibold text-zinc-400 mt-1">
                            {parseInt(publishDurationMonths) === 1 ? "month" : "months"}
                            {publishStartDate ? ` · ends ${formatDate(computedEndDate)}` : ""}
                          </span>
                        </>
                      )}
                    </div>

                    <button type="button" onClick={inc}
                      className="flex-none w-14 flex items-center justify-center text-2xl font-black transition-colors active:scale-95 select-none"
                      style={{ color: "#a1a1aa" }}
                      onMouseEnter={e => (e.currentTarget.style.background="#f0f0f3")}
                      onMouseLeave={e => (e.currentTarget.style.background="transparent")}
                    >+</button>
                  </div>

                  {/* Quick presets */}
                  <div className="flex gap-1.5">
                    {PRESETS.map((v) => {
                      const val = v === "∞" ? "" : String(v);
                      const active = publishDurationMonths === val;
                      return (
                        <button key={String(v)} type="button" onClick={() => setPublishDurationMonths(val)}
                          className="flex-1 py-2 rounded-xl text-sm font-bold transition-all duration-150 active:scale-95"
                          style={active ? {
                            background:"linear-gradient(135deg,#6366f1,#8b5cf6)",
                            color:"white",
                            boxShadow:"0 3px 10px rgba(139,92,246,.4)",
                          } : { background:"#f0f0f3", color:"#71717a" }}
                        >
                          {v === "∞" ? "∞" : `${v}mo`}
                        </button>
                      );
                    })}
                  </div>
                </div>
              );
            })() : (
              <div>
                <p className="text-[11px] font-bold text-fg-muted uppercase tracking-widest mb-1.5">Available until</p>
                <DatePicker value={publishEndDate} onChange={setPublishEndDate} />
              </div>
            )}
          </div>

          {/* ── CTA ── */}
          <div className="bg-bg-card px-6 pb-6 flex items-center gap-3">
            <button
              type="button"
              onClick={() => setPublishOpen(false)}
              className="px-4 py-3 rounded-xl text-sm font-semibold text-fg-muted hover:text-fg hover:bg-bg-subtle transition-colors whitespace-nowrap"
            >
              Not yet
            </button>
            <button
              type="button"
              disabled={!canPublish || !(listing?.media?.length) || publishListing.isPending}
              onClick={handlePublish}
              className="flex-1 h-12 rounded-xl font-extrabold text-white text-base transition-all active:scale-[.98] disabled:opacity-40 disabled:cursor-not-allowed"
              style={{
                background:"linear-gradient(135deg,#6366f1 0%,#8b5cf6 50%,#a78bfa 100%)",
                backgroundSize:"200% auto",
                ...(canPublish && (listing?.media?.length ?? 0) > 0 && !publishListing.isPending
                  ? { animation:"pub-pulse 2s ease-in-out infinite" }
                  : {}),
              }}
            >
              {publishListing.isPending ? "Launching…" : "🚀 Launch listing"}
            </button>
          </div>
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
            <Button disabled={!hotfixReason.trim() || hotfixListing.isPending} onClick={handleHotfix} className="bg-brand hover:bg-[rgb(var(--color-primary-hover))] text-white">
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
            <Button disabled={createUtility.isPending} onClick={handleAddUtility} className="bg-brand hover:bg-[rgb(var(--color-primary-hover))] text-white">
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
