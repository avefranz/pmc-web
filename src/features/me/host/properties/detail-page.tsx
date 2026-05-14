import { useState, useRef, lazy, Suspense, useEffect, useCallback } from "react";

const PropertyMap = lazy(() =>
  import("@/components/shared/property-map").then((m) => ({ default: m.PropertyMap }))
);
const LocationPicker = lazy(() =>
  import("@/components/shared/location-picker").then((m) => ({ default: m.LocationPicker }))
);
import { useParams, Link, useNavigate } from "react-router-dom";
import {
  ArrowLeft, Plus, Trash2, Pencil, ImagePlus, X,
  BedDouble, Bath, Users, Wifi, Zap, AlertTriangle,
  LayoutGrid, FileText, CalendarDays, Wrench, Settings,
  BarChart2, Home, ChevronRight, CheckCircle2, Circle,
  ImageIcon, Megaphone, TrendingUp, MapPin, Ruler, Car,
  Search, Loader2, Star, ExternalLink,
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
import { Stepper } from "@/components/shared/stepper";
import { useAsset, useAssetSummary, useDeleteAsset, useUpdateLocation, useUpdateAsset } from "@/lib/hooks/use-assets";
import { useBookingsByAsset, useCreateBooking } from "@/lib/hooks/use-bookings";
import { useTicketsByAsset, useCreateTicket } from "@/lib/hooks/use-tickets";
import { useUtilitiesByAsset, useCreateUtility, useDeleteUtility } from "@/lib/hooks/use-utilities";
import { useListingsByAsset, useCreateNewVersion, useCreateListing, usePublishListing } from "@/lib/hooks/use-listings";
import { useAmenities, useAmenityCategories, useReferences } from "@/lib/hooks/use-references";
import { useMarketplaceCities } from "@/lib/hooks/use-marketplace";
import { listingsApi } from "@/lib/api/listings.api";
import { peaApi } from "@/lib/api/pea.api";
import { formatThb, formatDate } from "@/lib/utils/format";
import { ticketStatusColor, ticketKindIcon } from "@/lib/utils/ticket-status";
import { UtilityType, RentalType, ListingStatus, AssetOccupancyStatus, TicketType, TicketKind, BookingStatus } from "@/lib/types/enums";
import type { AmenityDto, ListingMediaDto, BuildingType, FurnishedType } from "@/lib/types";
import { cn } from "@/lib/utils/cn";
import { useQueryClient } from "@tanstack/react-query";

type Section = "overview" | "photos" | "listing" | "utilities" | "amenities";

interface NominatimResult {
  place_id: number;
  display_name: string;
  lat: string;
  lon: string;
  address: {
    road?: string;
    house_number?: string;
    suburb?: string;
    city?: string;
    town?: string;
    village?: string;
    state?: string;
    postcode?: string;
    country?: string;
  };
}

function isRealDate(d?: string | null): d is string {
  return !!d && !d.startsWith("0001-");
}

// ─── Photo gallery ────────────────────────────────────────────────────────────

const MAX_PHOTOS = 10;

function PhotoGallery({ listingId, media }: { listingId: string; media: ListingMediaDto[] }) {
  const qc = useQueryClient();
  // uploadProgress: number of files done out of total in current batch
  const [uploadProgress, setUploadProgress] = useState<{ done: number; total: number } | null>(null);
  const [deleting, setDeleting] = useState<string | null>(null);
  const [settingCover, setSettingCover] = useState(false);
  const [confirmId, setConfirmId] = useState<string | null>(null);
  const [lightboxUrl, setLightboxUrl] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const uploading = uploadProgress !== null;
  const remaining = MAX_PHOTOS - media.length; // how many more photos are allowed

  async function handleSetCover(mediaId: string) {
    // Move chosen photo to front, keep rest in current order
    const reordered = [mediaId, ...media.map((m) => m.id).filter((id) => id !== mediaId)];
    setSettingCover(true);
    try {
      await listingsApi.reorderMedia(listingId, reordered);
      qc.invalidateQueries({ queryKey: ["listings"] });
    } catch {
      toast.error("Failed to set cover photo");
    } finally {
      setSettingCover(false);
    }
  }

  async function handleUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const files = Array.from(e.target.files ?? []);
    if (!files.length) return;

    // Enforce limit: take only as many as are still allowed
    const allowed = files.slice(0, Math.max(0, remaining));
    const skipped = files.length - allowed.length;
    if (skipped > 0) {
      toast.warning(`Only ${MAX_PHOTOS} photos allowed. ${skipped} file${skipped > 1 ? "s" : ""} skipped.`);
    }
    if (!allowed.length) return;

    setUploadProgress({ done: 0, total: allowed.length });
    let failed = 0;
    // Upload sequentially to preserve order
    for (let i = 0; i < allowed.length; i++) {
      try {
        await listingsApi.uploadMedia(listingId, allowed[i]);
        // Refresh after each upload so the grid grows in real-time
        await qc.invalidateQueries({ queryKey: ["listings"] });
      } catch {
        failed++;
      }
      setUploadProgress({ done: i + 1, total: allowed.length });
    }

    if (failed === 0) {
      toast.success(allowed.length === 1 ? "Photo uploaded" : `${allowed.length} photos uploaded`);
    } else {
      toast.error(`${failed} photo${failed > 1 ? "s" : ""} failed to upload`);
    }
    setUploadProgress(null);
    if (inputRef.current) inputRef.current.value = "";
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

  const uploadLabel = uploadProgress
    ? `Uploading ${uploadProgress.done}/${uploadProgress.total}…`
    : remaining <= 3 && remaining > 0
    ? `Add (${remaining} left)`
    : "Add";

  return (
    <>
      {media.length === 0 ? (
        <label className={cn(
          "flex flex-col items-center justify-center gap-3 rounded-2xl border-2 border-dashed border-border h-56 cursor-pointer",
          "hover:border-fg-muted transition-colors bg-bg-subtle",
          uploading && "opacity-50 pointer-events-none",
        )}>
          {uploading ? (
            <div className="flex flex-col items-center gap-2">
              <div className="w-6 h-6 border-2 border-fg-muted border-t-transparent rounded-full animate-spin" />
              <p className="text-xs text-fg-muted">{uploadProgress!.done}/{uploadProgress!.total} uploaded</p>
            </div>
          ) : (
            <ImagePlus size={28} className="text-fg-muted" />
          )}
          <div className="text-center">
            <p className="text-sm font-semibold text-fg-muted">Add your first photo</p>
            <p className="text-xs text-fg-subtle mt-0.5">Select up to {MAX_PHOTOS} photos at once</p>
          </div>
          <input ref={inputRef} type="file" accept="image/*" multiple className="hidden" onChange={handleUpload} disabled={uploading} />
        </label>
      ) : (
        <div className="space-y-4">
          <div className="grid gap-2 grid-cols-3 sm:grid-cols-4 lg:grid-cols-5">
            {media.map((m, idx) => {
              const isCover = idx === 0;
              return (
                <div key={m.id} className="relative group aspect-square overflow-hidden rounded-xl bg-bg-subtle">
                  <img
                    src={m.url}
                    alt={m.caption ?? "Photo"}
                    className="w-full h-full object-cover cursor-zoom-in hover:scale-[1.03] transition-[opacity,transform] duration-300"
                    style={{ opacity: 0 }}
                    onLoad={(e) => { e.currentTarget.style.opacity = "1"; }}
                    onClick={() => setLightboxUrl(m.url)}
                  />

                  {/* Cover badge — always visible on first photo */}
                  {isCover && (
                    <div className="absolute bottom-1.5 left-1.5 flex items-center gap-1 bg-black/60 text-white text-[10px] font-semibold px-1.5 py-0.5 rounded-full">
                      <Star size={9} className="fill-amber-400 text-amber-400" />
                      Cover
                    </div>
                  )}

                  {/* "Set as cover" button — shown on hover for non-cover photos */}
                  {!isCover && (
                    <button
                      onClick={(e) => { e.stopPropagation(); handleSetCover(m.id); }}
                      disabled={settingCover || !!deleting}
                      className="absolute bottom-1.5 left-1.5 flex items-center gap-1 bg-black/60 text-white text-[10px] font-semibold px-1.5 py-0.5 rounded-full opacity-0 group-hover:opacity-100 transition-opacity hover:bg-amber-500/80"
                      title="Set as cover photo"
                    >
                      {settingCover
                        ? <div className="w-2 h-2 border border-white border-t-transparent rounded-full animate-spin" />
                        : <Star size={9} />}
                      Cover
                    </button>
                  )}

                  {/* Delete button */}
                  <button
                    onClick={(e) => { e.stopPropagation(); setConfirmId(m.id); }}
                    disabled={!!deleting}
                    className="absolute top-1.5 right-1.5 w-6 h-6 bg-black/60 rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity text-white hover:bg-danger/80"
                  >
                    {deleting === m.id
                      ? <div className="w-2.5 h-2.5 border border-white border-t-transparent rounded-full animate-spin" />
                      : <X size={11} />}
                  </button>
                </div>
              );
            })}
            {/* Upload tile — hidden when limit reached */}
            {remaining > 0 && (
              <label className={cn(
                "aspect-square rounded-xl border-2 border-dashed border-border flex flex-col items-center justify-center gap-1.5 cursor-pointer hover:border-fg-muted transition-colors bg-bg-subtle",
                uploading && "opacity-50 pointer-events-none",
              )}>
                {uploading ? (
                  <>
                    <div className="w-4 h-4 border-2 border-fg-muted border-t-transparent rounded-full animate-spin" />
                    <span className="text-[10px] text-fg-muted font-medium text-center leading-tight px-1">
                      {uploadProgress!.done}/{uploadProgress!.total}
                    </span>
                  </>
                ) : (
                  <>
                    <ImagePlus size={18} className="text-fg-muted" />
                    <span className="text-xs text-fg-muted font-medium text-center leading-tight px-1">{uploadLabel}</span>
                  </>
                )}
                <input ref={inputRef} type="file" accept="image/*" multiple className="hidden" onChange={handleUpload} disabled={uploading} />
              </label>
            )}
          </div>
          <p className="text-xs text-fg-muted">
            {media.length} photo{media.length !== 1 ? "s" : ""}
            {remaining > 0 ? ` · up to ${remaining} more` : ` · maximum reached`}
            {" · Guests will see these photos on your ad"}
          </p>
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

  // "Pets allowed" is managed in the dedicated Pets section — exclude from amenity grid
  const filteredAmenities = refAmenities.filter(
    (a) => !a.name.toLowerCase().includes("pet")
  );

  return (
    <AmenityToggleGrid
      amenities={filteredAmenities}
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
    [AssetOccupancyStatus.Occupied]:       { label: "Occupied",        cls: "bg-blue-50 text-blue-700 border-blue-200" },
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

// ─── Listing section card ─────────────────────────────────────────────────────

interface ListingSectionCardProps {
  title: string;
  done: boolean;
  required?: boolean;
  onEdit: () => void;
  children?: React.ReactNode;
}

function ListingSectionCard({ title, done, required, onEdit, children }: ListingSectionCardProps) {
  return (
    <div className={cn(
      "rounded-2xl border p-4 transition-colors",
      done ? "border-border bg-bg-card" : "border-dashed border-border bg-bg-subtle/40",
    )}>
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-center gap-2.5 min-w-0">
          {done ? (
            <CheckCircle2 size={16} className="text-success shrink-0" />
          ) : (
            <Circle size={16} className="text-fg-subtle shrink-0" />
          )}
          <span className={cn("text-sm font-semibold", done ? "text-fg" : "text-fg-muted")}>
            {title}
            {required && !done && <span className="ml-1 text-xs text-danger font-normal">required</span>}
          </span>
        </div>
        <button
          onClick={onEdit}
          className="text-xs font-medium text-brand hover:underline shrink-0 flex items-center gap-1"
        >
          <Pencil size={11} />
          {done ? "Edit" : "Add"}
        </button>
      </div>
      {done && children && (
        <div className="mt-2.5 pl-[26px]">
          {children}
        </div>
      )}
      {!done && (
        <div className="mt-2.5 pl-[26px]">
          <p className="text-xs text-fg-muted">Not set — click Add to fill in</p>
        </div>
      )}
    </div>
  );
}

// ─── Cancellation policy presets ─────────────────────────────────────────────
// noticeDays = grace period: how long tenant can leave and get deposit back.
// minBillingDays = minimum days charged from first month payment even during grace (anti-abuse).
// After grace period: leaving early = deposit kept (penaltyMonths = 1 always).
const CANCELLATION_PRESETS = [
  {
    id: "week",
    label: "1 week",
    noticeDays: 7,
    penaltyMonths: 1,
    minBillingDays: 7,
    note: "Only useful if property is in very high demand",
  },
  {
    id: "twoweeks",
    label: "2 weeks",
    noticeDays: 14,
    penaltyMonths: 1,
    minBillingDays: 7,
    note: "Good balance for most rentals",
  },
  {
    id: "month",
    label: "1 month",
    noticeDays: 30,
    penaltyMonths: 1,
    minBillingDays: 14,
    note: "Most tenant-friendly, easier to attract long-term renters",
  },
] as const;

// ─── Transport & nearby presets ───────────────────────────────────────────────
// cityId 1=Bangkok, 2=Chiang Mai, 3=Phuket, 4=Pattaya, others=generic
const TRANSPORT_PRESETS_BY_CITY: Record<number, string[]> = {
  1: ["BTS Skytrain nearby", "MRT nearby", "Airport Rail Link", "Bus stop nearby", "Expressway access"],
  2: ["Songthaew route nearby", "Old City walking distance", "Bus stop nearby", "Near Nimman area"],
  3: ["Bus stop nearby", "Near Phuket Town", "Airport 30 min drive", "Near beach"],
  4: ["Baht bus route", "Beach Road nearby", "Bus stop nearby"],
  5: ["Bus stop nearby", "Near Hua Hin town centre", "Near beach"],
  6: ["Ferry pier nearby", "Near Chaweng / Lamai", "Bus stop nearby"],
};
const DEFAULT_TRANSPORT_PRESETS = ["Bus stop nearby", "Grab / taxi access", "Near airport", "Expressway access", "Motorcycle taxi nearby"];

const NEARBY_PRESETS = [
  "Supermarket (Big C / Lotus's)", "7-Eleven / convenience store", "Hospital / clinic",
  "International school", "Shopping mall", "Local fresh market",
  "Gym / fitness centre", "Restaurant area", "Pharmacy",
];

function parseChipString(raw: string, knownChips: string[]): { chips: string[]; custom: string } {
  const parts = raw.split(/\s*·\s*|\n/).map((l) => l.trim()).filter(Boolean);
  const chips: string[] = [];
  const custom: string[] = [];
  for (const part of parts) {
    if (knownChips.includes(part)) chips.push(part);
    else custom.push(part);
  }
  return { chips, custom: custom.join(" · ") };
}

// ─── House rule presets ───────────────────────────────────────────────────────
const HOUSE_RULE_PRESETS = [
  "No smoking indoors",
  "No parties or events",
  "Quiet hours after 22:00",
  "Shoes off at the entrance",
  "No subletting",
  "No additional guests without prior notice",
  "Keep common areas clean",
  "Report maintenance issues promptly",
];

/** Split saved houseRules string into (matched presets, leftover custom text) */
function parseHouseRules(raw: string): { presets: string[]; custom: string } {
  const lines = raw.split(/\n|·/).map((l) => l.trim()).filter(Boolean);
  const presets: string[] = [];
  const custom: string[] = [];
  for (const line of lines) {
    if (HOUSE_RULE_PRESETS.includes(line)) presets.push(line);
    else custom.push(line);
  }
  return { presets, custom: custom.join("\n") };
}

// ─── Main page ────────────────────────────────────────────────────────────────

export function PropertyDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const qc = useQueryClient();
  const [section, setSection] = useState<Section>("overview");
  const contentRef = useRef<HTMLDivElement>(null);
  const [autoOpenListing, setAutoOpenListing] = useState(false);

  const navigateSection = useCallback((s: Section, autoOpen = false) => {
    setSection(s);
    if (s === "listing" && autoOpen) setAutoOpenListing(true);
    // Scroll to the top of the content panel, accounting for sticky header
    setTimeout(() => {
      if (contentRef.current) {
        const top = contentRef.current.getBoundingClientRect().top + window.scrollY - 80;
        window.scrollTo({ top: Math.max(0, top), behavior: "smooth" });
      }
    }, 50);
  }, []);

  // Auto-open first incomplete listing section when navigating to Details tab
  useEffect(() => {
    if (autoOpenListing && section === "listing") {
      setAutoOpenListing(false);
      openNextListingSection(); // open first incomplete
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [autoOpenListing, section]);

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
  const createListing = useCreateListing();
  const { data: refs } = useReferences();

  const publishListing = usePublishListing(listing?.id ?? "");

  const [setupOpen, setSetupOpen] = useState(false);
  const [setupMonthlyRate, setSetupMonthlyRate] = useState("");
  const [setupDeposit, setSetupDeposit] = useState("");

  async function handleCreateListing() {
    const rate = Number(setupMonthlyRate.replace(/[^0-9]/g, ""));
    if (!rate) return;
    const firstCategory = refs?.propertyCategories?.[0]?.id ?? 1;
    await createListing.mutateAsync({
      assetId: id!,
      title: asset?.internalName ?? "",
      description: "",
      houseRules: "",
      wifiName: "",
      wifiPassword: "",
      propertyCategoryId: firstCategory,
      instantBookEnabled: false,
      basePrice: rate,
      baseMonthlyRate: rate,
      depositAmount: setupDeposit ? Number(setupDeposit.replace(/[^0-9]/g, "")) : undefined,
    });
    setSetupOpen(false);
  }

  const [publishOpen, setPublishOpen] = useState(false);
  const [isPublishing, setIsPublishing] = useState(false);
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

  // ── Pre-publish readiness checks (used in sidebar button + publish dialog) ──
  const readyAddress = !!(asset?.exactLatitude && asset?.exactLongitude && asset?.cityId && asset.cityId > 0);
  const readyBasics  = !!(listing?.title && listing?.baseMonthlyRate);
  const readyPhotos  = (listing?.media?.length ?? 0) > 0;

  // All 9 listing detail sections must be filled before publish
  const listingSectionsDone = listing ? [
    !!listing.title && !!listing.description,
    !!(listing.baseMonthlyRate || listing.basePrice > 0),
    !!listing.checkInMethod,
    true, // Utilities — "none included" is a valid explicit choice
    !!(listing.houseRules || listing.wifiName),
    listing.petsAllowed != null,
    listing.cancellationNoticeDays != null,
    listing.hasSmokeDetector != null || listing.hasCODetector != null || listing.hasFireExtinguisher != null || listing.hasFirstAidKit != null || listing.hasSecurityCamera != null,
    !!(listing.transportInfo || listing.nearbyPlaces),
  ].filter(Boolean).length : 0;
  const totalListingSections = 9;
  const readyListing = listingSectionsDone === totalListingSections;

  const readyToPublish = readyAddress && readyBasics && readyPhotos && readyListing;

  async function handlePublish() {
    if (!listing) return;
    if (!canPublish) return;
    if (isPublishing) return;
    setIsPublishing(true);
    try {
      await listingsApi.update(listing.id, { startDate: publishStartDate, endDate: computedEndDate });
      await publishListing.mutateAsync();
      toast.success("Listing published");
      setPublishOpen(false);
    } catch { toast.error("Failed to publish ad"); }
    finally { setIsPublishing(false); }
  }

  const createUtility = useCreateUtility();
  const deleteUtility = useDeleteUtility(id!);
  const [addUtilityOpen, setAddUtilityOpen] = useState(false);
  const [utilType, setUtilType] = useState<UtilityType>(UtilityType.Electricity);
  const [providerName, setProviderName] = useState("");
  const [accountNumber, setAccountNumber] = useState("");
  // PEA-specific validation flow
  const [peaMeterNo, setPeaMeterNo] = useState("");
  const [peaStep, setPeaStep] = useState<"form" | "confirm">("form");
  const [peaCustomerName, setPeaCustomerName] = useState("");
  const [peaValidating, setPeaValidating] = useState(false);

  const UTILITY_PROVIDERS: Record<UtilityType, string[]> = {
    [UtilityType.Electricity]: ["PEA", "MEA"],
    [UtilityType.Water]: ["PWA", "MWA"],
    [UtilityType.Internet]: ["AIS Fibre", "True Online", "NT (TOT)", "3BB", "DTAC"],
    [UtilityType.CommonAreaFee]: ["Juristic Person"],
    [UtilityType.Other]: ["Other"],
  };

  const isPea = utilType === UtilityType.Electricity && providerName === "PEA";

  function resetUtilityDialog() {
    setProviderName(""); setAccountNumber("");
    setPeaMeterNo(""); setPeaStep("form"); setPeaCustomerName(""); setPeaValidating(false);
  }

  async function handlePeaVerify() {
    setPeaValidating(true);
    try {
      const result = await peaApi.validate(accountNumber.trim(), peaMeterNo.trim());
      setPeaCustomerName(result.customerName);
      setPeaStep("confirm");
    } catch {
      toast.error("Could not verify meter — check CA and PEA No.");
    } finally {
      setPeaValidating(false);
    }
  }

  async function handleAddUtility() {
    try {
      await createUtility.mutateAsync({ assetId: id!, utilityType: utilType, providerName: providerName.trim(), accountNumber: accountNumber.trim() });
      toast.success("Utility added");
      setAddUtilityOpen(false);
      resetUtilityDialog();
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
  const [editRules, setEditRules] = useState("");        // free-text (custom) part
  const [editRulesPresets, setEditRulesPresets] = useState<string[]>([]); // selected presets
  const [editRentalType, setEditRentalType] = useState<RentalType>(RentalType.LongTerm);
  const [editDiscountTiers, setEditDiscountTiers] = useState<{ minMonths: number; discountPercent: number }[]>([]);
  // New listing fields
  const [editCheckInMethod, setEditCheckInMethod] = useState<string>("");
  const [editCheckInInstructions, setEditCheckInInstructions] = useState("");
  const [editUtilElec, setEditUtilElec] = useState(false);
  const [editUtilWater, setEditUtilWater] = useState(false);
  const [editUtilInternet, setEditUtilInternet] = useState(false);
  const [editUtilAircon, setEditUtilAircon] = useState(false);
  const [editUtilGarbage, setEditUtilGarbage] = useState(false);
  const [editPetsAllowed, setEditPetsAllowed] = useState(false);
  const [editPetDeposit, setEditPetDeposit] = useState(0);
  const [editCancelNoticeDays, setEditCancelNoticeDays] = useState(30);
  const [editCancelPenaltyMonths, setEditCancelPenaltyMonths] = useState(1);
  const [editHasSmokeDetector, setEditHasSmokeDetector] = useState(false);
  const [editHasCODetector, setEditHasCODetector] = useState(false);
  const [editHasFireExtinguisher, setEditHasFireExtinguisher] = useState(false);
  const [editHasFirstAid, setEditHasFirstAid] = useState(false);
  const [editHasSecurityCamera, setEditHasSecurityCamera] = useState(false);
  const [editNoneOfAbove, setEditNoneOfAbove] = useState(false);
  const [editTransportInfo, setEditTransportInfo] = useState("");      // free text
  const [editTransportChips, setEditTransportChips] = useState<string[]>([]);
  const [editNearbyPlaces, setEditNearbyPlaces] = useState("");         // free text
  const [editNearbyChips, setEditNearbyChips] = useState<string[]>([]);
  const [saving, setSaving] = useState(false);

  // Focused listing section dialogs
  const [basicsOpen, setBasicsOpen] = useState(false);
  const [pricingOpen, setPricingOpen] = useState(false);
  const [checkInSectionOpen, setCheckInSectionOpen] = useState(false);
  const [utilitiesOpen, setUtilitiesOpen] = useState(false);
  const [rulesOpen, setRulesOpen] = useState(false);
  const [petsOpen, setPetsOpen] = useState(false);
  const [cancellationOpen, setCancellationOpen] = useState(false);
  const [safetyOpen, setSafetyOpen] = useState(false);
  const [locationCtxOpen, setLocationCtxOpen] = useState(false);

  // Location dialog
  const updateLocation = useUpdateLocation();
  const { data: cities } = useMarketplaceCities();
  const [locationOpen, setLocationOpen] = useState(false);
  const [locLat, setLocLat] = useState<number | null>(null);
  const [locLng, setLocLng] = useState<number | null>(null);
  const [locStreet, setLocStreet] = useState("");
  const [locSoi, setLocSoi] = useState("");
  const [locUnit, setLocUnit] = useState("");
  const [locZip, setLocZip] = useState("");
  const [locCityId, setLocCityId] = useState<number | null>(null);
  const [locLegalAddress, setLocLegalAddress] = useState("");
  const [locGoogleMapsUrl, setLocGoogleMapsUrl] = useState("");
  const [locMapZoom, setLocMapZoom] = useState<number>(11);
  const [locSearch, setLocSearch] = useState("");
  const [locResults, setLocResults] = useState<NominatimResult[]>([]);
  const [locSearching, setLocSearching] = useState(false);
  const searchTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const suppressSearch = useRef(false);

  const searchAddress = useCallback(async (q: string, cityHint?: string) => {
    if (q.length < 3) { setLocResults([]); return; }
    setLocSearching(true);
    try {
      // Append city name to query for better local results, but also search without
      // it in parallel in case the user already typed the city or wants a different area
      const withCity = cityHint ? `${q}, ${cityHint}` : q;
      const [r1, r2] = await Promise.all([
        fetch(
          `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(withCity)}&format=json&addressdetails=1&limit=5&countrycodes=th`,
          { headers: { "Accept-Language": "en" } }
        ).then((r) => r.json() as Promise<NominatimResult[]>),
        cityHint
          ? fetch(
              `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(q)}&format=json&addressdetails=1&limit=3&countrycodes=th`,
              { headers: { "Accept-Language": "en" } }
            ).then((r) => r.json() as Promise<NominatimResult[]>)
          : Promise.resolve([] as NominatimResult[]),
      ]);
      // Merge, deduplicate by place_id, city-scoped results first
      const seen = new Set<string>();
      const merged: NominatimResult[] = [];
      for (const item of [...r1, ...r2]) {
        const key = String(item.place_id);
        if (!seen.has(key)) { seen.add(key); merged.push(item); }
      }
      setLocResults(merged.slice(0, 6));
    } catch { /* ignore */ }
    finally { setLocSearching(false); }
  }, []);

  useEffect(() => {
    if (suppressSearch.current) {
      suppressSearch.current = false;
      return;
    }
    const cityName = locCityId
      ? (() => {
          const c = (cities ?? []).find((x) => x.id === locCityId);
          return c ? (typeof c.name === "string" ? c.name : (c.name as Record<string, string>).en) : undefined;
        })()
      : undefined;
    if (searchTimer.current) clearTimeout(searchTimer.current);
    searchTimer.current = setTimeout(() => searchAddress(locSearch, cityName), 400);
    return () => { if (searchTimer.current) clearTimeout(searchTimer.current); };
  }, [locSearch, locCityId, cities, searchAddress]);

  // Reverse geocode when user clicks on the map
  // fillAddress=true (default): update street, search bar, city, and postcode
  // fillAddress=false: only update postcode (used after dropdown pick to silently fill zip)
  const [locReverseLoading, setLocReverseLoading] = useState(false);
  const reverseGeocode = useCallback(async (lat: number, lng: number, { fillAddress = true }: { fillAddress?: boolean } = {}) => {
    setLocReverseLoading(true);
    try {
      const res = await fetch(
        `https://nominatim.openstreetmap.org/reverse?lat=${lat}&lon=${lng}&format=json&addressdetails=1`,
        { headers: { "Accept-Language": "en" } }
      );
      const data = await res.json() as NominatimResult;
      const addr = data.address;
      if (!addr) return;
      if (addr.postcode) setLocZip(addr.postcode);
      if (fillAddress) {
        const road = [addr.road, addr.house_number].filter(Boolean).join(" ");
        if (road) setLocStreet(road);
        const nominatimCity = addr.city ?? addr.town ?? addr.village ?? "";
        if (cities && nominatimCity) {
          const match = cities.find((c) => {
            const name = typeof c.name === "string" ? c.name : (c.name as Record<string, string>).en ?? "";
            return name.toLowerCase().includes(nominatimCity.toLowerCase()) ||
                   nominatimCity.toLowerCase().includes(name.toLowerCase());
          });
          if (match) setLocCityId(match.id);
        }
        // Show the short readable address in the search bar
        suppressSearch.current = true;
        setLocSearch(road || data.display_name.split(",")[0]);
      }
    } catch { /* ignore */ }
    finally { setLocReverseLoading(false); }
  }, [cities]);

  // Property specs dialog
  const updateAsset = useUpdateAsset(id!);
  const [specsOpen, setSpecsOpen] = useState(false);
  const [specsFloor, setSpecsFloor] = useState<number>(1);
  const [specsTotalFloors, setSpecsTotalFloors] = useState<number>(1);
  const [specsArea, setSpecsArea] = useState<string>("");
  const [specsBuildingType, setSpecsBuildingType] = useState<BuildingType | "">("");
  const [specsFurnished, setSpecsFurnished] = useState<FurnishedType | "">("");
  const [specsParkingSpaces, setSpecsParkingSpaces] = useState<number>(0);
  const [specsParkingIncluded, setSpecsParkingIncluded] = useState(false);
  const [specsMinLease, setSpecsMinLease] = useState<string>("");

  function openSpecsDialog() {
    if (!asset) return;
    setSpecsFloor(asset.floor ?? 1);
    setSpecsTotalFloors(asset.totalFloors ?? 1);
    setSpecsArea(asset.areaSqm != null ? String(asset.areaSqm) : "");
    setSpecsBuildingType(asset.buildingType ?? "");
    setSpecsFurnished(asset.furnished ?? "");
    setSpecsParkingSpaces(asset.parkingSpaces ?? 0);
    setSpecsParkingIncluded(asset.parkingIncluded ?? false);
    setSpecsMinLease(asset.minLeaseMonths != null ? String(asset.minLeaseMonths) : "");
    setSpecsOpen(true);
  }

  async function handleSaveSpecs() {
    try {
      await updateAsset.mutateAsync({
        // For landed property (house/villa), "floor" field is not applicable
        floor: specsBuildingType === "Landed" ? null : specsFloor,
        totalFloors: specsTotalFloors,
        areaSqm: specsArea !== "" ? Number(specsArea) : null,
        buildingType: (specsBuildingType as BuildingType) || null,
        furnished: (specsFurnished as FurnishedType) || null,
        parkingSpaces: specsParkingSpaces,
        parkingIncluded: specsParkingIncluded,
        minLeaseMonths: specsMinLease !== "" ? Number(specsMinLease) : null,
      });
      toast.success("Property specs saved");
      setSpecsOpen(false);
    } catch {
      toast.error("Failed to save specs");
    }
  }
  function pickNominatimResult(r: NominatimResult) {
    const lat = parseFloat(r.lat);
    const lng = parseFloat(r.lon);
    setLocLat(lat);
    setLocLng(lng);
    setLocMapZoom(16);
    const addr = r.address;
    const road = [addr.road, addr.house_number].filter(Boolean).join(" ");
    const filled = road || r.display_name.split(",")[0];
    setLocStreet(filled);
    // Suppress the debounced re-search triggered by setLocSearch
    suppressSearch.current = true;
    setLocSearch(filled);
    setLocResults([]);
    // If forward search has postcode, use it immediately; otherwise fetch via reverse geocode
    if (addr.postcode) {
      setLocZip(addr.postcode);
    } else {
      void reverseGeocode(lat, lng, { fillAddress: false });
    }
    const nominatimCity = addr.city ?? addr.town ?? addr.village ?? "";
    if (cities && nominatimCity) {
      const match = cities.find((c) => {
        const name = typeof c.name === "string" ? c.name : (c.name as Record<string, string>).en ?? "";
        return name.toLowerCase().includes(nominatimCity.toLowerCase()) ||
               nominatimCity.toLowerCase().includes(name.toLowerCase());
      });
      if (match) setLocCityId(match.id);
    }
  }

  function openLocationDialog() {
    if (!asset) return;
    setLocLat(asset.exactLatitude ?? null);
    setLocLng(asset.exactLongitude ?? null);
    setLocMapZoom(asset.exactLatitude ? 16 : 11);
    setLocUnit(asset.unitNumber ?? "");
    setLocZip(asset.zipCode ?? "");
    setLocCityId(asset.cityId && asset.cityId > 0 ? asset.cityId : 1);
    setLocLegalAddress(asset.legalAddress ?? "");
    setLocGoogleMapsUrl(asset.googleMapsUrl ?? "");
    const addrStr = asset.addressLine ? Object.values(asset.addressLine).filter(Boolean).join(", ") : "";
    // Parse "Soi X, Road name" back into separate fields
    const soiMatch = addrStr.match(/^Soi\s+([^,]+),?\s*(.*)/i);
    if (soiMatch) {
      setLocSoi(soiMatch[1].trim());
      const street = soiMatch[2].trim();
      setLocStreet(street);
      suppressSearch.current = true;
      setLocSearch(street || addrStr);
    } else {
      setLocSoi("");
      setLocStreet(addrStr);
      suppressSearch.current = true;
      setLocSearch(addrStr);
    }
    setLocResults([]);
    setLocationOpen(true);
  }

  async function handleSaveLocation() {
    if (!locLat || !locLng || !asset) return;
    try {
      // Combine Soi into streetAddress if provided
      const fullStreet = [locSoi && `Soi ${locSoi.replace(/^soi\s*/i, "")}`, locStreet].filter(Boolean).join(", ");
      await updateLocation.mutateAsync({
        assetId: asset.id,
        cityId: (locCityId && locCityId > 0) ? locCityId : 1,
        streetAddress: fullStreet || locStreet,
        unitNumber: locUnit || undefined,
        zipCode: locZip || undefined,
        latitude: locLat,
        longitude: locLng,
        legalAddress: locLegalAddress || undefined,
        googleMapsUrl: locGoogleMapsUrl || undefined,
      });
      toast.success("Location saved");
      setLocationOpen(false);
    } catch {
      toast.error("Failed to save location");
    }
  }

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
    // New fields
    setEditCheckInMethod(listing.checkInMethod ?? "");
    setEditCheckInInstructions(listing.checkInInstructions ?? "");
    setEditUtilElec(listing.utilityElectricity ?? false);
    setEditUtilWater(listing.utilityWater ?? false);
    setEditUtilInternet(listing.utilityInternet ?? false);
    setEditUtilAircon(listing.utilityAircon ?? false);
    setEditUtilGarbage(listing.utilityGarbage ?? false);
    setEditPetsAllowed(listing.petsAllowed ?? false);
    setEditPetDeposit(listing.petDeposit ?? 0);
    setEditCancelNoticeDays(listing.cancellationNoticeDays ?? 30);
    setEditCancelPenaltyMonths(listing.cancellationPenaltyMonths ?? 1);
    setEditHasSmokeDetector(listing.hasSmokeDetector ?? false);
    setEditHasCODetector(listing.hasCODetector ?? false);
    setEditHasFireExtinguisher(listing.hasFireExtinguisher ?? false);
    setEditHasFirstAid(listing.hasFirstAidKit ?? false);
    setEditHasSecurityCamera(listing.hasSecurityCamera ?? false);
    setEditTransportInfo(listing.transportInfo ?? "");
    setEditNearbyPlaces(listing.nearbyPlaces ?? "");
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
        // New fields
        checkInMethod: editCheckInMethod || null,
        checkInInstructions: editCheckInInstructions || null,
        utilityElectricity: editUtilElec,
        utilityWater: editUtilWater,
        utilityInternet: editUtilInternet,
        utilityAircon: editUtilAircon,
        utilityGarbage: editUtilGarbage,
        petsAllowed: editPetsAllowed,
        petDeposit: editPetDeposit,
        cancellationNoticeDays: editCancelNoticeDays,
        cancellationPenaltyMonths: editCancelPenaltyMonths,
        hasSmokeDetector: editHasSmokeDetector,
        hasCODetector: editHasCODetector,
        hasFireExtinguisher: editHasFireExtinguisher,
        hasFirstAidKit: editHasFirstAid,
        hasSecurityCamera: editHasSecurityCamera,
        transportInfo: editTransportInfo || null,
        nearbyPlaces: editNearbyPlaces || null,
      });
      qc.invalidateQueries({ queryKey: ["listings"] });
      toast.success("Saved");
      setEditOpen(false);
    } catch { toast.error("Failed to save"); }
    finally { setSaving(false); }
  }

  async function saveListingSection(patch: Record<string, unknown>, close: () => void) {
    if (!listing) return;
    setSaving(true);
    try {
      await listingsApi.update(listing.id, patch as Parameters<typeof listingsApi.update>[1]);
      qc.invalidateQueries({ queryKey: ["listings"] });
      toast.success("Saved");
      close();
    } catch { toast.error("Failed to save"); }
    finally { setSaving(false); }
  }

  // ── Listing section auto-navigation ───────────────────────────────────────
  // Returns the ordered list of listing section defs with current done status + open action.
  // Reading `listing` from closure — always fresh when called.
  function getListingSectionDefs() {
    if (!listing) return [];
    return [
      {
        id: "basics",
        done: !!listing.title && !!listing.description,
        open: () => { setEditTitle(listing.title ?? ""); setEditDesc(listing.description ?? ""); setBasicsOpen(true); },
      },
      {
        id: "pricing",
        done: !!(listing.baseMonthlyRate || listing.basePrice > 0),
        open: () => { setPricingOpen(true); },
      },
      {
        id: "checkin",
        done: !!listing.checkInMethod,
        open: () => { setEditCheckInMethod(listing.checkInMethod ?? ""); setEditCheckInInstructions(listing.checkInInstructions ?? ""); setCheckInSectionOpen(true); },
      },
      {
        id: "utilities",
        done: true,
        open: () => { setEditUtilElec(listing.utilityElectricity ?? false); setEditUtilWater(listing.utilityWater ?? false); setEditUtilInternet(listing.utilityInternet ?? false); setEditUtilGarbage(listing.utilityGarbage ?? false); setUtilitiesOpen(true); },
      },
      {
        id: "rules",
        done: !!(listing.houseRules || listing.wifiName),
        open: () => { const { presets, custom } = parseHouseRules(listing.houseRules ?? ""); setEditRulesPresets(presets); setEditRules(custom); setEditWifiName(listing.wifiName ?? ""); setEditWifiPwd(listing.wifiPassword ?? ""); setRulesOpen(true); },
      },
      {
        id: "pets",
        done: listing.petsAllowed != null,
        open: () => { setEditPetsAllowed(listing.petsAllowed ?? false); setEditPetDeposit(listing.petDeposit ?? 0); setPetsOpen(true); },
      },
      {
        id: "cancellation",
        done: listing.cancellationNoticeDays != null,
        open: () => { setEditCancelNoticeDays(listing.cancellationNoticeDays ?? 30); setEditCancelPenaltyMonths(listing.cancellationPenaltyMonths ?? 1); setCancellationOpen(true); },
      },
      {
        id: "safety",
        done: listing.hasSmokeDetector != null || listing.hasCODetector != null || listing.hasFireExtinguisher != null || listing.hasFirstAidKit != null || listing.hasSecurityCamera != null,
        open: () => {
          setEditHasSmokeDetector(listing.hasSmokeDetector ?? false);
          setEditHasCODetector(listing.hasCODetector ?? false);
          setEditHasFireExtinguisher(listing.hasFireExtinguisher ?? false);
          setEditHasFirstAid(listing.hasFirstAidKit ?? false);
          setEditHasSecurityCamera(listing.hasSecurityCamera ?? false);
          // Pre-check "none of above" if section was saved with all-false values
          const safetySaved = listing.hasSmokeDetector != null || listing.hasCODetector != null || listing.hasFireExtinguisher != null || listing.hasFirstAidKit != null || listing.hasSecurityCamera != null;
          setEditNoneOfAbove(safetySaved && !listing.hasSmokeDetector && !listing.hasCODetector && !listing.hasFireExtinguisher && !listing.hasFirstAidKit && !listing.hasSecurityCamera);
          setSafetyOpen(true);
        },
      },
      {
        id: "transport",
        done: !!(listing.transportInfo || listing.nearbyPlaces),
        open: () => {
          const allTransportChips = TRANSPORT_PRESETS_BY_CITY[asset?.cityId ?? 0] ?? DEFAULT_TRANSPORT_PRESETS;
          const tp = parseChipString(listing.transportInfo ?? "", allTransportChips);
          setEditTransportChips(tp.chips); setEditTransportInfo(tp.custom);
          const np = parseChipString(listing.nearbyPlaces ?? "", NEARBY_PRESETS);
          setEditNearbyChips(np.chips); setEditNearbyPlaces(np.custom);
          setLocationCtxOpen(true);
        },
      },
    ];
  }

  /** Open first incomplete listing section (or the one after `afterId`). */
  function openNextListingSection(afterId?: string) {
    const defs = getListingSectionDefs();
    const startIdx = afterId ? (defs.findIndex((d) => d.id === afterId) + 1) : 0;
    const next = defs.slice(startIdx).find((d) => !d.done);
    if (next) setTimeout(() => next.open(), 120); // small delay so previous dialog can close
  }

  /** Close dialog and advance to next incomplete listing section. */
  function saveAndNext(patch: Record<string, unknown>, closeFn: () => void, currentSectionId: string) {
    void saveListingSection(patch, () => { closeFn(); openNextListingSection(currentSectionId); });
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
  const hasActiveBookings = bookings?.some((b) =>
    [BookingStatus.Active, BookingStatus.Confirmed, BookingStatus.PendingPayment].includes(b.status as BookingStatus),
  ) ?? false;

  // ── Nav sections
  const NAV: { id: Section; icon: React.ElementType; label: string; badge?: number }[] = [
    { id: "overview",   icon: Home,         label: "Overview" },
    { id: "photos",     icon: LayoutGrid,   label: "Photos",     badge: listing?.media?.length ? undefined : 0 },
    { id: "listing",    icon: FileText,     label: "Details" },
    { id: "utilities",  icon: Zap,          label: "Utilities" },
    { id: "amenities",  icon: Settings,     label: "Amenities" },
  ];

  return (
    <div>
      {/* Page header */}
      <div className="flex items-center gap-3 mb-6">
        <Link to="/me/host/properties" className="p-1.5 rounded-lg hover:bg-bg-subtle text-fg-muted hover:text-fg transition-colors">
          <ArrowLeft size={18} />
        </Link>
        <div>
          <h1 className="text-lg font-bold text-fg leading-none">Property</h1>
          <p className="text-sm text-fg-muted mt-0.5">{asset.internalName}</p>
        </div>
      </div>

      {/* Mobile tab bar */}
      <div className="lg:hidden mb-4 -mx-4 px-4 overflow-x-auto scrollbar-hide">
        <div className="flex gap-1 pb-1">
          {NAV.map((n) => (
            <button
              key={n.id}
              onClick={() => navigateSection(n.id)}
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
                  <span className={cn(
                    "inline-block text-[11px] font-semibold px-2 py-0.5 rounded-full",
                    listing.status === ListingStatus.Active ? "bg-success/10 text-success" : "bg-warning/10 text-warning",
                  )}>
                    {listing.status === ListingStatus.Active ? "Published" : "Draft"}
                  </span>
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
                onClick={() => navigateSection(n.id)}
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
        <div ref={contentRef} className="flex-1 min-w-0 bg-bg-card rounded-2xl border border-border shadow-card p-6">

          {/* OVERVIEW */}
          {section === "overview" && (() => {
            const hasAddress = !!(asset.exactLatitude && asset.exactLongitude && asset.cityId && asset.cityId > 0);
            const hasBasics  = !!(listing?.title && listing?.baseMonthlyRate);
            const photoCount = listing?.media?.length ?? 0;
            const hasPhotos  = photoCount >= 3; // require at least 3 photos to consider this step done
            // Mirror listingSectionsDone so checklist and listing panel always agree
            const detailsDoneCount = listingSectionsDone;
            const detailsTotal = totalListingSections; // 9
            const hasDetails = detailsDoneCount === detailsTotal;
            const isPublished = listing?.status === ListingStatus.Active;
            const hasBookings = (bookings?.length ?? 0) > 0;
            const isNewProperty = !hasBookings && !isPublished;

            // ── Address desc helper ──
            const addressDesc = (() => {
              if (!hasAddress) return "Add your address so tenants can find you in search";
              const parts = asset.addressLine ? Object.values(asset.addressLine).filter(Boolean) : [];
              return parts.length ? parts.join(", ") : "Location saved";
            })();

            const hasSpecs = !!(asset.buildingType && asset.areaSqm && asset.furnished);
            const specsDesc = hasSpecs
              ? [
                  asset.buildingType === "Highrise" ? "Apartment" : asset.buildingType === "Lowrise" ? "Condo" : asset.buildingType === "Landed" ? "House / Villa" : "Other",
                  asset.areaSqm && `${asset.areaSqm} m²`,
                  asset.furnished === "Fully" ? "Fully furnished" : asset.furnished === "Semi" ? "Semi-furnished" : "Unfurnished",
                ].filter(Boolean).join(" · ")
              : "Property type, size, furnishing — helps tenants find you";

            const setupSteps: { id: string; label: string; desc: string; done: boolean; action: (() => void) | null }[] = [
              {
                id: "created",
                label: "Property created",
                desc: `${asset.internalName} — ${[asset.bedrooms && `${asset.bedrooms} bed`, asset.bathrooms && `${asset.bathrooms} bath`].filter(Boolean).join(", ")}`,
                done: true,
                action: null,
              },
              {
                id: "basics",
                label: "Add title & price",
                desc: hasBasics
                  ? `฿${listing!.baseMonthlyRate!.toLocaleString()} / month · ${listing!.title}`
                  : "Your listing headline and monthly rent",
                done: hasBasics,
                action: () => navigateSection("listing"),
              },
              {
                id: "specs",
                label: "Property specs",
                desc: specsDesc,
                done: hasSpecs,
                action: () => openSpecsDialog(),
              },
              {
                id: "address",
                label: "Set your address",
                desc: addressDesc,
                done: hasAddress,
                action: () => openLocationDialog(),
              },
              {
                id: "photos",
                label: "Add photos",
                desc: hasPhotos
                  ? `${photoCount} photo${photoCount !== 1 ? "s" : ""} added ✓`
                  : photoCount > 0
                    ? `${photoCount} added — need at least 3 to continue`
                    : "Great photos get 3× more inquiries — aim for 5+",
                done: hasPhotos,
                action: () => navigateSection("photos"),
              },
              {
                id: "details",
                label: "Complete your listing",
                desc: hasDetails
                  ? `${detailsDoneCount} of ${detailsTotal} sections filled`
                  : `${detailsDoneCount} of ${detailsTotal} sections — check-in, rules, utilities, and more`,
                done: hasDetails,
                action: () => navigateSection("listing", true),
              },
              {
                id: "publish",
                label: "Publish your listing",
                desc: isPublished
                  ? `Live since ${listing?.publishedAt ? formatDate(listing.publishedAt) : "recently"}`
                  : "Go live and start receiving reservation requests",
                done: isPublished,
                action: () => { setPublishStartDate(""); setPublishEndDate(""); setPublishDurationMonths(""); setPublishOpen(true); },
              },
            ];

            // Separate the publish step so it can be shown as a hero CTA
            const publishStep = setupSteps.find((s) => s.id === "publish")!;
            const contentSteps = setupSteps.filter((s) => s.id !== "publish");

            const doneCount = setupSteps.filter((s) => s.done).length;
            const contentDoneCount = contentSteps.filter((s) => s.done).length;
            const allContentDone = contentDoneCount === contentSteps.length;
            const nextStep = contentSteps.find((s) => !s.done);
            const allDone = doneCount === setupSteps.length;

            const pct = Math.round((contentDoneCount / contentSteps.length) * 100);
            const remaining = contentSteps.length - contentDoneCount;
            const motivationalCopy = allDone
              ? { headline: "You're live! 🎉", sub: "Sit back and wait for your first reservation request." }
              : allContentDone
              ? { headline: "Everything's ready 🎉", sub: "Your listing is complete — hit Publish to go live." }
              : doneCount <= 1
              ? { headline: "Let's get this ready.", sub: `${remaining} steps stand between you and your first tenant.` }
              : doneCount >= contentSteps.length - 1
              ? { headline: "Great progress!", sub: `Just ${remaining} more step${remaining !== 1 ? "s" : ""} until you can publish.` }
              : { headline: "Keep it up.", sub: `${remaining} more steps until launch.` };

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
                    {allContentDone ? (
                      /* ── All steps done → big launch CTA ── */
                      <div className="rounded-2xl overflow-hidden mb-5 relative" style={{ background: "linear-gradient(135deg,#4f46e5 0%,#7c3aed 50%,#9333ea 100%)" }}>
                        <div style={{ position:"absolute", inset:0, background:"radial-gradient(ellipse at 80% 20%,rgba(255,255,255,.15) 0%,transparent 60%)", pointerEvents:"none" }} />
                        <div className="relative px-6 py-6 flex items-center justify-between gap-6">
                          <div>
                            <p className="text-[11px] font-bold uppercase tracking-widest mb-1.5" style={{ color:"rgba(255,255,255,.5)" }}>
                              Setup checklist
                            </p>
                            <h2 className="text-xl font-extrabold text-white leading-snug">
                              {allDone ? "You're live! 🎉" : "Everything's ready! 🎉"}
                            </h2>
                            <p className="text-sm mt-1" style={{ color:"rgba(255,255,255,.7)" }}>
                              {allDone
                                ? "Sit back and wait for your first reservation request."
                                : "All steps complete — publish your listing to start receiving enquiries."}
                            </p>
                          </div>
                          {!allDone && (
                            <button
                              onClick={() => { setPublishStartDate(""); setPublishEndDate(""); setPublishDurationMonths(""); setPublishOpen(true); }}
                              className="shrink-0 flex items-center gap-2 px-6 py-3 rounded-2xl font-extrabold text-base transition-all active:scale-95 hover:opacity-90"
                              style={{ background:"rgba(255,255,255,.15)", backdropFilter:"blur(8px)", border:"1.5px solid rgba(255,255,255,.3)", color:"#fff" }}
                            >
                              🚀 Publish now
                            </button>
                          )}
                        </div>
                      </div>
                    ) : (
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
                                {contentDoneCount} of {contentSteps.length}
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
                    )}

                    {/* ── Steps (publish step excluded — shown as hero CTA above) ── */}
                    <div className="space-y-2">
                      {contentSteps.map((step, i) => {
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
                              step.action ? (
                                <button
                                  onClick={step.action}
                                  className="shrink-0 text-xs font-semibold text-emerald-600 hover:text-emerald-700 hover:underline flex items-center gap-1 transition-colors"
                                >
                                  <Pencil size={10} />Edit
                                </button>
                              ) : (
                                <span className="shrink-0 text-xs font-semibold text-emerald-600">✓ Done</span>
                              )
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
                          { icon: ImageIcon,  color: "text-blue-500",   bg: "bg-blue-50",   title: "Photos matter most",       body: "Listings with 5+ quality photos get significantly more inquiries. Natural light and tidy rooms make a big difference." },
                          { icon: Zap,        color: "text-amber-500",  bg: "bg-amber-50",  title: "Mention what's included",  body: "Tell tenants if utilities like electricity, water, or internet are covered in the rent. It's a common decision factor." },
                          { icon: TrendingUp, color: "text-emerald-500",bg: "bg-emerald-50",title: "Price it right",            body: "Check nearby listings to set a competitive monthly rate. A well-priced listing fills up 2× faster." },
                        ].map((tip) => (
                          <div key={tip.title} className="rounded-xl border border-border p-4 bg-white hover:border-zinc-300 transition-colors">
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
                            <span className="text-white/70 font-medium">{asset.address?.city ?? "your area"}</span>{" "}
                            can now find and rent your place.
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
                        { n:1, title:"Tenants discover your ad", desc:"Your property appears in search results for people looking in your area and price range." },
                        { n:2, title:"A tenant sends a reservation request", desc:"You'll get notified and can review their details before accepting or declining." },
                        { n:3, title:"Sign the contract & confirm", desc:"Upload the signed lease and your reservation is officially confirmed — money incoming." },
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
                        <p className="text-xs text-fg-muted mt-1">Total reservations</p>
                      </div>
                      <div className="bg-bg-subtle rounded-xl p-4 text-center">
                        <p className="text-2xl font-bold text-fg">{openTickets.length}</p>
                        <p className="text-xs text-fg-muted mt-1">Open issues</p>
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
                <div className="grid grid-cols-2 gap-3">
                  {[
                    { icon: LayoutGrid, label: "Manage photos", onClick: () => navigateSection("photos") },
                    { icon: FileText,   label: "Edit details",  onClick: () => navigateSection("listing") },
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

                {/* Property specs */}
                <div>
                  <div className="flex items-center justify-between mb-3">
                    <p className="text-sm font-semibold text-fg">Property specs</p>
                    <button
                      onClick={openSpecsDialog}
                      className="text-xs text-fg-muted hover:text-fg transition-colors flex items-center gap-1"
                    >
                      <Pencil size={11} />Edit specs
                    </button>
                  </div>
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                    {asset.areaSqm != null && (
                      <div className="flex items-center gap-2 text-sm">
                        <Ruler size={14} className="text-fg-muted shrink-0" />
                        <span className="text-fg">{asset.areaSqm} m²</span>
                      </div>
                    )}
                    {asset.floor != null && (
                      <div className="flex items-center gap-2 text-sm">
                        <Home size={14} className="text-fg-muted shrink-0" />
                        <span className="text-fg">Floor {asset.floor}{asset.totalFloors ? ` of ${asset.totalFloors}` : ""}</span>
                      </div>
                    )}
                    {asset.buildingType && (
                      <div className="text-sm text-fg">{asset.buildingType}</div>
                    )}
                    {asset.furnished && (
                      <div className="text-sm text-fg">{asset.furnished === "Fully" ? "Fully furnished" : asset.furnished === "Semi" ? "Semi-furnished" : "Unfurnished"}</div>
                    )}
                    {(asset.parkingSpaces != null && asset.parkingSpaces > 0) && (
                      <div className="flex items-center gap-2 text-sm">
                        <Car size={14} className="text-fg-muted shrink-0" />
                        <span className="text-fg">{asset.parkingSpaces} parking{asset.parkingIncluded ? " (incl.)" : ""}</span>
                      </div>
                    )}
                    {!asset.areaSqm && !asset.floor && !asset.buildingType && !asset.furnished && !(asset.parkingSpaces && asset.parkingSpaces > 0) && (
                      <p className="col-span-full text-xs text-fg-muted">No specs set yet. Click "Edit specs" to add details.</p>
                    )}
                  </div>
                </div>

                {/* Location map */}
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <p className="text-sm font-semibold text-fg flex items-center gap-1.5">
                      <MapPin size={14} className="text-fg-muted" />Location
                    </p>
                    <button
                      onClick={openLocationDialog}
                      className="text-xs text-fg-muted hover:text-fg transition-colors flex items-center gap-1"
                    >
                      <Pencil size={11} />
                      {asset.exactLatitude ? "Edit" : "Set location"}
                    </button>
                  </div>
                  {asset.exactLatitude && asset.exactLongitude ? (
                    <div>
                      {/* isolation:isolate keeps Leaflet's z-index stack inside, preventing it from covering dialogs */}
                      <div style={{ isolation: "isolate", position: "relative", zIndex: 0 }}>
                        <Suspense fallback={<div className="rounded-2xl bg-bg-subtle animate-pulse" style={{ height: 220 }} />}>
                          <PropertyMap
                            lat={asset.exactLatitude}
                            lng={asset.exactLongitude}
                            label={asset.internalName}
                          />
                        </Suspense>
                      </div>
                      {(asset.addressLine || asset.unitNumber || asset.zipCode) && (
                        <div className="mt-2 text-xs text-fg-muted flex items-start gap-1.5">
                          <MapPin size={11} className="shrink-0 mt-0.5" />
                          <div>
                            {asset.unitNumber && <span className="font-medium text-fg">{asset.unitNumber} · </span>}
                            {asset.addressLine && Object.values(asset.addressLine).filter(Boolean).join(", ")}
                            {asset.zipCode && <span className="ml-1">{asset.zipCode}</span>}
                          </div>
                        </div>
                      )}
                      {asset.legalAddress && (
                        <div className="mt-1.5 text-xs text-fg-muted flex items-start gap-1.5">
                          <FileText size={11} className="shrink-0 mt-0.5" />
                          <span className="leading-relaxed">{asset.legalAddress}</span>
                        </div>
                      )}
                      {asset.googleMapsUrl && (
                        <a
                          href={asset.googleMapsUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="mt-1.5 inline-flex items-center gap-1 text-xs text-brand hover:underline"
                        >
                          <ExternalLink size={10} /> View on Google Maps
                        </a>
                      )}
                    </div>
                  ) : (
                    <button
                      onClick={openLocationDialog}
                      className="w-full rounded-2xl border border-dashed border-border p-6 text-center hover:bg-bg-subtle transition-colors"
                    >
                      <MapPin size={20} className="text-fg-muted mx-auto mb-2" />
                      <p className="text-sm text-fg-muted">No location set</p>
                      <p className="text-xs text-fg-muted mt-0.5">Click to add coordinates</p>
                    </button>
                  )}
                </div>
              </div>
            );
          })()}

          {/* PHOTOS */}
          {section === "photos" && (
            <div>
              <SectionHeading
                title="Photos"
                subtitle="Manage photos for your ad. High-quality photos attract more guests."
              />
              {listing
                ? <PhotoGallery listingId={listing.id} media={listing.media ?? []} />
                : <p className="text-sm text-fg-muted">Create a listing first to add photos.</p>}

              {/* CTA — appears once ≥ 3 photos uploaded */}
              {(listing?.media?.length ?? 0) >= 3 && (
                <div className="mt-6 bg-success/8 border border-success/20 rounded-2xl px-5 py-4 flex items-center justify-between gap-4">
                  <div>
                    <p className="text-sm font-semibold text-fg">
                      {readyToPublish
                        ? "Everything's ready — time to go live! 🎉"
                        : (listing?.media?.length ?? 0) >= 5
                          ? "Great selection of photos 🎉"
                          : "Looking good — keep going for best results"}
                    </p>
                    <p className="text-xs text-fg-muted mt-0.5">
                      {readyToPublish
                        ? "Your listing is complete. Publish it to start receiving enquiries."
                        : (listing?.media?.length ?? 0) >= 5
                          ? "Time to fill in your property details."
                          : `${listing?.media?.length} photos added · 5+ recommended for more enquiries.`}
                    </p>
                  </div>
                  {readyToPublish ? (
                    <Button
                      className="shrink-0 text-white rounded-xl"
                      style={{ background: "linear-gradient(135deg,#6366f1 0%,#8b5cf6 50%,#a78bfa 100%)" }}
                      onClick={() => { setPublishStartDate(""); setPublishEndDate(""); setPublishDurationMonths(""); setPublishOpen(true); }}
                    >
                      🚀 Publish →
                    </Button>
                  ) : (
                    <Button
                      className="shrink-0 bg-brand hover:bg-[var(--color-primary-hover)] text-white rounded-xl"
                      onClick={() => navigateSection("listing", true)}
                    >
                      Next: Details →
                    </Button>
                  )}
                </div>
              )}
            </div>
          )}

          {/* LISTING */}
          {section === "listing" && (
            <div className="space-y-5">
              {!listing ? (
                <div className="text-center py-12">
                  <p className="text-fg-muted mb-4">Property details not set up yet.</p>
                  <Button
                    className="bg-brand hover:bg-[var(--color-primary-hover)] text-white"
                    onClick={() => setSetupOpen(true)}
                  >
                    Set up property
                  </Button>
                </div>
              ) : (() => {
                const sectionsDone = listingSectionsDone;
                const totalSections = totalListingSections;
                const pct = Math.round((sectionsDone / totalSections) * 100);

                return (
                  <div className="space-y-4">
                    {/* Header: congratulatory banner when ready, plain header otherwise */}
                    {listing.status === ListingStatus.Draft && readyToPublish ? (
                      <div className="rounded-2xl px-5 py-4 flex items-center justify-between gap-4"
                        style={{ background: "linear-gradient(135deg,rgba(99,102,241,.08) 0%,rgba(139,92,246,.12) 100%)", border: "1px solid rgba(139,92,246,.2)" }}
                      >
                        <div>
                          <p className="text-sm font-bold text-fg">Everything's ready — time to go live! 🎉</p>
                          <p className="text-xs text-fg-muted mt-0.5">All sections complete. Publish to start receiving enquiries.</p>
                        </div>
                        <Button
                          className="shrink-0 text-white font-bold px-5"
                          style={{ background: "linear-gradient(135deg,#6366f1 0%,#8b5cf6 50%,#a78bfa 100%)" }}
                          onClick={() => { setPublishStartDate(""); setPublishEndDate(""); setPublishDurationMonths(""); setPublishOpen(true); }}
                        >
                          🚀 Publish →
                        </Button>
                      </div>
                    ) : (
                      <>
                        <div className="flex items-start justify-between gap-4">
                          <div>
                            <h2 className="text-base font-semibold text-fg">Property details</h2>
                            <p className="text-sm text-fg-muted mt-0.5">
                              {listing.status === ListingStatus.Active
                                ? "Your listing is live"
                                : `${sectionsDone} of ${totalSections} sections complete`}
                            </p>
                          </div>
                          {listing.status === ListingStatus.Active && (
                            <span className="text-xs font-semibold text-success shrink-0">✓ Live</span>
                          )}
                        </div>
                        {/* Progress bar */}
                        <div className="h-1.5 bg-bg-subtle rounded-full overflow-hidden">
                          <div
                            className="h-full rounded-full transition-all duration-500"
                            style={{
                              width: `${pct}%`,
                              background: pct === 100 ? "var(--color-success)" : "var(--color-primary)",
                            }}
                          />
                        </div>
                      </>
                    )}

                    {/* Active booking note */}
                    {hasActiveBookings && (
                      <p className="text-xs text-fg-muted bg-bg-subtle rounded-xl px-3 py-2">
                        ⚡ Booking in progress — price &amp; availability changes apply to new bookings only.
                      </p>
                    )}

                    {/* Section cards */}
                    <div className="space-y-2">

                      {/* 1. Title & description */}
                      <ListingSectionCard
                        title="Title & description"
                        done={!!listing.title && !!listing.description}
                        required
                        onEdit={() => {
                          setEditTitle(listing.title);
                          setEditDesc(listing.description ?? "");
                          setBasicsOpen(true);
                        }}
                      >
                        <p className="text-sm font-medium text-fg leading-snug">{listing.title || "—"}</p>
                        {listing.description && (
                          <p className="text-xs text-fg-muted mt-1 line-clamp-2">{listing.description}</p>
                        )}
                      </ListingSectionCard>

                      {/* 2. Pricing */}
                      <ListingSectionCard
                        title="Pricing"
                        done={!!(listing.baseMonthlyRate || listing.basePrice > 0)}
                        required
                        onEdit={() => {
                          setEditPrice(listing.basePrice);
                          setEditMonthlyPrice(listing.baseMonthlyRate ?? 0);
                          setEditDepositAmount(listing.depositAmount ?? 0);
                          setEditRentalType((listing.rentalType as RentalType) ?? RentalType.LongTerm);
                          setEditDiscountTiers(listing.discountTiers ?? []);
                          setPricingOpen(true);
                        }}
                      >
                        <div className="flex items-center gap-3 flex-wrap">
                          <span className="text-sm font-semibold text-fg">
                            {formatThb(listing.baseMonthlyRate ?? listing.basePrice * 30)}/month
                          </span>
                          {listing.depositAmount > 0 && (
                            <span className="text-xs text-fg-muted">{formatThb(listing.depositAmount)} deposit</span>
                          )}
                          {listing.discountTiers && listing.discountTiers.length > 0 && (
                            <span className="text-xs bg-success/10 text-success px-2 py-0.5 rounded-full font-medium">
                              {listing.discountTiers.length} discount tier{listing.discountTiers.length !== 1 ? "s" : ""}
                            </span>
                          )}
                        </div>
                      </ListingSectionCard>

                      {/* 3. Check-in */}
                      <ListingSectionCard
                        title="Check-in"
                        done={!!listing.checkInMethod}
                        onEdit={() => {
                          setEditCheckInMethod(listing.checkInMethod ?? "");
                          setEditCheckInInstructions(listing.checkInInstructions ?? "");
                          setCheckInSectionOpen(true);
                        }}
                      >
                        <p className="text-sm text-fg">
                          {listing.checkInMethod?.replace(/([A-Z])/g, " $1").trim()}
                        </p>
                        {listing.checkInInstructions && (
                          <p className="text-xs text-fg-muted mt-0.5 line-clamp-1">{listing.checkInInstructions}</p>
                        )}
                      </ListingSectionCard>

                      {/* 4. Utilities included */}
                      {(() => {
                        const utils = [
                          listing.utilityElectricity && "Electricity",
                          listing.utilityWater && "Water",
                          listing.utilityInternet && "Internet",
                          listing.utilityGarbage && "Garbage",
                        ].filter(Boolean) as string[];
                        return (
                          <ListingSectionCard
                            title="Utilities included"
                            done={true}
                            onEdit={() => {
                              setEditUtilElec(listing.utilityElectricity ?? false);
                              setEditUtilWater(listing.utilityWater ?? false);
                              setEditUtilInternet(listing.utilityInternet ?? false);
                              setEditUtilGarbage(listing.utilityGarbage ?? false);
                              setUtilitiesOpen(true);
                            }}
                          >
                            {utils.length > 0 ? (
                              <div className="flex flex-wrap gap-1.5">
                                {utils.map((u) => (
                                  <span key={u} className="text-xs bg-bg-subtle text-fg px-2 py-0.5 rounded-full border border-border">{u}</span>
                                ))}
                              </div>
                            ) : (
                              <span className="text-xs text-fg-muted">None included — tenant pays separately</span>
                            )}
                          </ListingSectionCard>
                        );
                      })()}

                      {/* 5. House rules & WiFi */}
                      <ListingSectionCard
                        title="House rules & WiFi"
                        done={!!listing.houseRules || !!listing.wifiName}
                        onEdit={() => {
                          const { presets, custom } = parseHouseRules(listing.houseRules ?? "");
                          setEditRulesPresets(presets);
                          setEditRules(custom);
                          setEditWifiName(listing.wifiName ?? "");
                          setEditWifiPwd(listing.wifiPassword ?? "");
                          setRulesOpen(true);
                        }}
                      >
                        {listing.houseRules && (
                          <p className="text-xs text-fg-muted line-clamp-1">{listing.houseRules}</p>
                        )}
                        {listing.wifiName && (
                          <p className="text-xs text-fg-muted mt-0.5">WiFi: {listing.wifiName} {listing.wifiPassword && `· ${listing.wifiPassword}`}</p>
                        )}
                      </ListingSectionCard>

                      {/* 6. Pets */}
                      <ListingSectionCard
                        title="Pets"
                        done={listing.petsAllowed != null}
                        onEdit={() => {
                          setEditPetsAllowed(listing.petsAllowed ?? false);
                          setEditPetDeposit(listing.petDeposit ?? 0);
                          setPetsOpen(true);
                        }}
                      >
                        <p className="text-sm text-fg">
                          {listing.petsAllowed
                            ? `Allowed${listing.petDeposit ? ` · ${formatThb(listing.petDeposit)} deposit` : ""}`
                            : "Not allowed"}
                        </p>
                      </ListingSectionCard>

                      {/* 7. Cancellation policy */}
                      <ListingSectionCard
                        title="Cancellation policy"
                        done={listing.cancellationNoticeDays != null}
                        onEdit={() => {
                          setEditCancelNoticeDays(listing.cancellationNoticeDays ?? 30);
                          setEditCancelPenaltyMonths(listing.cancellationPenaltyMonths ?? 1);
                          setCancellationOpen(true);
                        }}
                      >
                        <p className="text-sm text-fg-muted">
                          {listing.cancellationNoticeDays ?? 30}-day notice · {listing.cancellationPenaltyMonths ?? 1} month penalty
                        </p>
                      </ListingSectionCard>

                      {/* 8. Safety & disclosures */}
                      {(() => {
                        const safety = [
                          listing.hasSmokeDetector && "Smoke detector",
                          listing.hasCODetector && "CO (carbon monoxide) detector",
                          listing.hasFireExtinguisher && "Fire extinguisher",
                          listing.hasFirstAidKit && "First aid kit",
                          listing.hasSecurityCamera && "Security cameras",
                        ].filter(Boolean) as string[];
                        return (
                          <ListingSectionCard
                            title="Safety features"
                            done={listing.hasSmokeDetector != null || listing.hasCODetector != null || listing.hasFireExtinguisher != null || listing.hasFirstAidKit != null || listing.hasSecurityCamera != null}
                            onEdit={() => {
                              setEditHasSmokeDetector(listing.hasSmokeDetector ?? false);
                              setEditHasCODetector(listing.hasCODetector ?? false);
                              setEditHasFireExtinguisher(listing.hasFireExtinguisher ?? false);
                              setEditHasFirstAid(listing.hasFirstAidKit ?? false);
                              setEditHasSecurityCamera(listing.hasSecurityCamera ?? false);
                              const safetySaved = listing.hasSmokeDetector != null || listing.hasCODetector != null || listing.hasFireExtinguisher != null || listing.hasFirstAidKit != null || listing.hasSecurityCamera != null;
                              setEditNoneOfAbove(safetySaved && !listing.hasSmokeDetector && !listing.hasCODetector && !listing.hasFireExtinguisher && !listing.hasFirstAidKit && !listing.hasSecurityCamera);
                              setSafetyOpen(true);
                            }}
                          >
                            <div className="flex flex-wrap gap-1.5">
                              {safety.length > 0 ? safety.map((s) => (
                                <span key={s} className="text-xs bg-success/10 text-success px-2 py-0.5 rounded-full border border-success/20">{s}</span>
                              )) : (
                                <span className="text-sm text-fg-muted">None</span>
                              )}
                            </div>
                          </ListingSectionCard>
                        );
                      })()}

                      {/* 9. Location context */}
                      <ListingSectionCard
                        title="Location & transport"
                        done={!!listing.transportInfo || !!listing.nearbyPlaces}
                        onEdit={() => {
                          const allTransportChips = TRANSPORT_PRESETS_BY_CITY[asset?.cityId ?? 0] ?? DEFAULT_TRANSPORT_PRESETS;
                          const tp = parseChipString(listing.transportInfo ?? "", allTransportChips);
                          setEditTransportChips(tp.chips); setEditTransportInfo(tp.custom);
                          const np = parseChipString(listing.nearbyPlaces ?? "", NEARBY_PRESETS);
                          setEditNearbyChips(np.chips); setEditNearbyPlaces(np.custom);
                          setLocationCtxOpen(true);
                        }}
                      >
                        {listing.transportInfo && <p className="text-xs text-fg-muted line-clamp-1">🚇 {listing.transportInfo}</p>}
                        {listing.nearbyPlaces && <p className="text-xs text-fg-muted mt-0.5 line-clamp-1">📍 {listing.nearbyPlaces}</p>}
                      </ListingSectionCard>

                    </div>
                  </div>
                );
              })()}
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

        </div>
      </div>

      {/* ── Setup listing dialog (when no listing exists yet) ── */}
      <Dialog open={setupOpen} onOpenChange={setSetupOpen}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>Set monthly rate</DialogTitle>
          </DialogHeader>
          <p className="text-sm text-fg-muted">Enter the rental price to activate this property.</p>
          <div className="space-y-3 py-1">
            <div className="space-y-1.5">
              <Label className="text-sm font-medium text-fg">Monthly rent (฿) <span className="text-danger">*</span></Label>
              <Input
                inputMode="numeric"
                placeholder="35,000"
                value={setupMonthlyRate}
                onChange={(e) => setSetupMonthlyRate(e.target.value)}
                autoFocus
              />
            </div>
            <div className="space-y-1.5">
              <Label className="text-sm font-medium text-fg">Security deposit (฿)</Label>
              <Input
                inputMode="numeric"
                placeholder="70,000"
                value={setupDeposit}
                onChange={(e) => setSetupDeposit(e.target.value)}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setSetupOpen(false)}>Cancel</Button>
            <Button
              className="bg-brand hover:bg-[var(--color-primary-hover)] text-white"
              disabled={!Number(setupMonthlyRate.replace(/[^0-9]/g, "")) || createListing.isPending}
              onClick={handleCreateListing}
            >
              {createListing.isPending ? "Setting up…" : "Confirm"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ── Dialogs (unchanged) ── */}

      {/* Location dialog */}
      {/* ── Property specs dialog ── */}
      <Dialog open={specsOpen} onOpenChange={setSpecsOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Property specs</DialogTitle>
          </DialogHeader>
          <div className="space-y-5 py-1">
            {/* 1. Property type — first, drives what fields appear */}
            <div className="space-y-2">
              <Label className="text-xs font-semibold text-fg-muted uppercase tracking-wide">What type of property is this?</Label>
              <div className="grid grid-cols-2 gap-2">
                {([
                  { value: "Highrise", label: "🏢 Apartment", sub: "Unit in a high-rise building" },
                  { value: "Lowrise",  label: "🏙️ Condo",     sub: "Unit in a low-rise building" },
                  { value: "Landed",   label: "🏠 House / Villa", sub: "Standalone or townhouse" },
                  { value: "Other",    label: "📦 Other",     sub: "Studio, shophouse, etc." },
                ] as { value: BuildingType; label: string; sub: string }[]).map(({ value, label, sub }) => (
                  <button
                    key={value}
                    type="button"
                    onClick={() => setSpecsBuildingType(value)}
                    className={cn(
                      "text-left rounded-xl border-2 px-3 py-2.5 transition-all",
                      specsBuildingType === value
                        ? "border-brand bg-brand/5 ring-1 ring-brand"
                        : "border-border bg-white hover:bg-bg-subtle"
                    )}
                  >
                    <p className={cn("text-sm font-semibold", specsBuildingType === value ? "text-brand" : "text-fg")}>{label}</p>
                    <p className="text-xs text-fg-muted">{sub}</p>
                  </button>
                ))}
              </div>
            </div>

            {/* 2. Size */}
            <div className="space-y-2">
              <Label className="text-xs font-semibold text-fg-muted uppercase tracking-wide">Size</Label>
              <div className="space-y-1">
                <Label className="text-xs text-fg-muted">Area (m²)</Label>
                <Input type="number" placeholder="45" value={specsArea} onChange={(e) => setSpecsArea(e.target.value)} />
              </div>
              {specsBuildingType !== "Landed" && (
                <div className="space-y-2 pt-1">
                  <Stepper label="Unit floor"        value={specsFloor}       onChange={setSpecsFloor}       min={1} max={200} allowDirectInput />
                  <Stepper label="Floors in building" value={specsTotalFloors} onChange={setSpecsTotalFloors} min={1} max={200} allowDirectInput />
                </div>
              )}
              {specsBuildingType === "Landed" && (
                <Stepper label="Floors in house" value={specsTotalFloors} onChange={setSpecsTotalFloors} min={1} max={10} />
              )}
            </div>

            {/* 3. Furnishing */}
            <div className="space-y-1">
              <Label className="text-xs font-semibold text-fg-muted uppercase tracking-wide">Furnishing</Label>
              <Select value={specsFurnished} onValueChange={(v) => setSpecsFurnished(v as FurnishedType | "")}>
                <SelectTrigger><SelectValue placeholder="Select…" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="Fully">Fully furnished</SelectItem>
                  <SelectItem value="Semi">Semi-furnished</SelectItem>
                  <SelectItem value="Unfurnished">Unfurnished</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* 4. Parking */}
            <div className="space-y-2">
              <Label className="text-xs font-semibold text-fg-muted uppercase tracking-wide">Parking</Label>
              <Stepper label="Parking spaces" value={specsParkingSpaces} onChange={setSpecsParkingSpaces} min={0} max={20} />
              <label className="flex items-center gap-2.5 cursor-pointer px-1">
                <input type="checkbox" className="h-4 w-4 rounded border-border" checked={specsParkingIncluded} onChange={(e) => setSpecsParkingIncluded(e.target.checked)} />
                <span className="text-sm text-fg">Included in rent</span>
              </label>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setSpecsOpen(false)}>Cancel</Button>
            <Button
              className="bg-brand hover:bg-[var(--color-primary-hover)] text-white"
              disabled={updateAsset.isPending}
              onClick={handleSaveSpecs}
            >
              {updateAsset.isPending ? "Saving…" : "Save specs"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={locationOpen} onOpenChange={(open) => { setLocationOpen(open); if (!open) setLocResults([]); }}>
        <DialogContent className="max-w-xl max-h-[90vh] flex flex-col p-0 gap-0">
          <DialogHeader className="px-6 pt-6 pb-4 border-b border-border shrink-0">
            <DialogTitle>Set location</DialogTitle>
          </DialogHeader>
          <div className="overflow-y-auto flex-1 px-6 py-4 space-y-4">

            {/* ── Step 1: City ── */}
            <div className="space-y-1.5">
              <Label className="text-xs font-semibold text-fg-muted uppercase tracking-wide">City</Label>
              <Select
                value={locCityId ? String(locCityId) : ""}
                onValueChange={(v) => {
                  const id = Number(v);
                  setLocCityId(id);
                  const city = (cities ?? []).find((c) => c.id === id);
                  if (city) {
                    setLocLat(city.latitude);
                    setLocLng(city.longitude);
                    setLocMapZoom(11);
                    setLocSearch("");
                    setLocResults([]);
                  }
                }}
              >
                <SelectTrigger className="h-10">
                  <SelectValue placeholder="Select a city…" />
                </SelectTrigger>
                <SelectContent>
                  {(cities ?? []).map((c) => (
                    <SelectItem key={c.id} value={String(c.id)}>
                      {typeof c.name === "string" ? c.name : (c.name as Record<string, string>).en}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* ── Step 2: Address search ── */}
            <div className="space-y-1.5 relative">
              <Label className="text-xs font-semibold text-fg-muted uppercase tracking-wide">Search address</Label>
              <div className="relative">
                <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-fg-muted pointer-events-none" />
                <Input
                  className="pl-9 pr-8"
                  placeholder="Street name, landmark…"
                  value={locSearch}
                  onChange={(e) => setLocSearch(e.target.value)}
                  autoComplete="off"
                />
                {locSearching && (
                  <Loader2 size={14} className="absolute right-3 top-1/2 -translate-y-1/2 text-fg-muted animate-spin" />
                )}
              </div>
              {locResults.length > 0 && (
                <div className="absolute z-[500] left-0 right-0 bg-white border border-border rounded-xl shadow-lg overflow-hidden mt-1">
                  {locResults.map((r) => (
                    <button
                      key={r.place_id}
                      type="button"
                      onClick={() => pickNominatimResult(r)}
                      className="w-full text-left px-4 py-2.5 text-sm hover:bg-bg-subtle flex items-start gap-2 border-b border-border last:border-0"
                    >
                      <MapPin size={13} className="text-fg-muted mt-0.5 shrink-0" />
                      <span className="text-fg line-clamp-2">{r.display_name}</span>
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* ── Map ── */}
            <div className="space-y-1.5">
              <Suspense fallback={<div className="rounded-xl bg-bg-subtle animate-pulse" style={{ height: 210 }} />}>
                <LocationPicker
                  lat={locLat}
                  lng={locLng}
                  zoom={locMapZoom}
                  onChange={(lat, lng) => {
                    setLocLat(lat);
                    setLocLng(lng);
                    setLocMapZoom(16);
                    setLocResults([]);
                    reverseGeocode(lat, lng);
                  }}
                />
              </Suspense>
              <p className="text-xs text-fg-muted">
                {locReverseLoading
                  ? "Detecting address…"
                  : locLat && locMapZoom >= 14
                  ? "Tap anywhere on the map to move the pin — address fills in automatically."
                  : locLat
                  ? "Zoom in or tap the map to place a precise pin."
                  : "Search above, or tap the map to drop a pin — address detects automatically."}
              </p>
            </div>

            {/* ── Step 3: Address details ── */}
            <div className="space-y-1.5">
              <Label className="text-xs font-semibold text-fg-muted uppercase tracking-wide">Address details</Label>
              <div className="bg-bg-subtle rounded-xl p-3 space-y-2.5">
                {/* User-entered fields */}
                <div className="grid grid-cols-2 gap-2">
                  <Input
                    placeholder="Soi / Alley (optional)"
                    value={locSoi}
                    onChange={(e) => setLocSoi(e.target.value)}
                    className="bg-white"
                  />
                  <Input
                    placeholder="Unit / Floor / Moo (optional)"
                    value={locUnit}
                    onChange={(e) => setLocUnit(e.target.value)}
                    className="bg-white"
                  />
                </div>
                {/* Auto-detected fields — read-only */}
                <div className="grid grid-cols-[1fr_auto] gap-2 items-center">
                  <div className="bg-white border border-border rounded-md px-3 py-2 text-sm truncate min-h-9 flex items-center gap-1.5">
                    {locReverseLoading ? (
                      <span className="text-fg-muted italic text-xs">Detecting address…</span>
                    ) : locStreet ? (
                      <>
                        <span className="text-fg-muted shrink-0">📍</span>
                        <span className="truncate">{locStreet}</span>
                      </>
                    ) : (
                      <span className="text-fg-muted italic text-xs">Road auto-detects from pin</span>
                    )}
                  </div>
                  <div className="bg-white border border-border rounded-md px-3 py-2 text-sm min-h-9 min-w-[90px] flex items-center gap-1.5">
                    {locZip ? (
                      <span className="font-mono tracking-wide">{locZip}</span>
                    ) : (
                      <span className="text-fg-muted italic text-xs">ZIP</span>
                    )}
                  </div>
                </div>
              </div>
            </div>

            {/* Legal address & Maps URL */}
            <div className="space-y-2.5">
              <div className="space-y-1.5">
                <Label className="text-xs font-semibold text-fg-muted uppercase tracking-wide">Legal address</Label>
                <Textarea
                  placeholder="Full legal address as it appears on TM-30 forms (Thai or English)"
                  value={locLegalAddress}
                  onChange={(e) => setLocLegalAddress(e.target.value)}
                  rows={2}
                  className="resize-none text-sm"
                />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs font-semibold text-fg-muted uppercase tracking-wide">Google Maps URL</Label>
                <Input
                  placeholder="https://maps.app.goo.gl/…"
                  value={locGoogleMapsUrl}
                  onChange={(e) => setLocGoogleMapsUrl(e.target.value)}
                />
              </div>
            </div>

          </div>

          <DialogFooter className="px-6 py-4 border-t border-border shrink-0">
            <Button variant="outline" onClick={() => setLocationOpen(false)}>Cancel</Button>
            <Button
              className="bg-brand hover:bg-[var(--color-primary-hover)] text-white"
              disabled={!locLat || !locLng || updateLocation.isPending}
              onClick={handleSaveLocation}
            >
              {updateLocation.isPending ? "Saving…" : "Save location"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

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
          <DialogHeader><DialogTitle>New reservation</DialogTitle></DialogHeader>
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

      {/* Focused listing section dialogs */}

      {/* Basics dialog */}
      <Dialog open={basicsOpen} onOpenChange={setBasicsOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader><DialogTitle>Title & description</DialogTitle></DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-1.5"><Label>Title</Label><Input value={editTitle} onChange={(e) => setEditTitle(e.target.value)} placeholder="Cozy 2BR in Sukhumvit" /></div>
            <div className="space-y-1.5"><Label>Description</Label><Textarea value={editDesc} onChange={(e) => setEditDesc(e.target.value)} className="min-h-[120px] resize-none" placeholder="Describe what makes your place special — neighbourhood, views, nearby transport…" /></div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setBasicsOpen(false)}>Cancel</Button>
            <Button disabled={saving} onClick={() => saveAndNext({ title: editTitle, description: editDesc }, () => setBasicsOpen(false), "basics")} className="bg-brand hover:bg-[var(--color-primary-hover)] text-white">
              {saving ? "Saving…" : "Save"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Pricing dialog */}
      <Dialog open={pricingOpen} onOpenChange={setPricingOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader><DialogTitle>Pricing</DialogTitle></DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-1.5">
              <Label>Monthly rate (฿)</Label>
              <Input type="number" value={editMonthlyPrice || ""} onChange={(e) => setEditMonthlyPrice(Number(e.target.value))} placeholder="18000" />
            </div>
            <div className="space-y-1.5">
              <Label>Security deposit (฿)</Label>
              <Input type="number" value={editDepositAmount || ""} onChange={(e) => setEditDepositAmount(Number(e.target.value))} placeholder="0" min={0} />
              <p className="text-xs text-fg-muted">Typically 1–2 months rent. 0 = no deposit.</p>
            </div>
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label>Long-stay discounts</Label>
                <button type="button" onClick={() => setEditDiscountTiers((prev) => [...prev, { minMonths: 3, discountPercent: 5 }])} className="text-xs font-semibold text-brand hover:underline flex items-center gap-1"><Plus size={12} />Add tier</button>
              </div>
              {editDiscountTiers.length === 0 && <p className="text-xs text-fg-muted">None — tenants pay full monthly rate.</p>}
              {editDiscountTiers.sort((a, b) => a.minMonths - b.minMonths).map((tier, i) => (
                <div key={i} className="flex items-center gap-2">
                  <Input type="number" min={1} max={24} value={tier.minMonths} onChange={(e) => setEditDiscountTiers((prev) => prev.map((t, j) => j === i ? { ...t, minMonths: Number(e.target.value) } : t))} className="w-20 text-center" />
                  <span className="text-xs text-fg-muted whitespace-nowrap">months →</span>
                  <Input type="number" min={1} max={50} value={tier.discountPercent} onChange={(e) => setEditDiscountTiers((prev) => prev.map((t, j) => j === i ? { ...t, discountPercent: Number(e.target.value) } : t))} className="w-20 text-center" />
                  <span className="text-xs text-fg-muted">% off</span>
                  <button type="button" onClick={() => setEditDiscountTiers((prev) => prev.filter((_, j) => j !== i))} className="w-7 h-7 rounded-lg hover:bg-danger/10 flex items-center justify-center text-fg-subtle hover:text-danger"><X size={13} /></button>
                </div>
              ))}
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setPricingOpen(false)}>Cancel</Button>
            <Button disabled={saving} onClick={() => saveAndNext({ baseMonthlyRate: editMonthlyPrice, basePrice: Math.round(editMonthlyPrice / 30), depositAmount: editDepositAmount, discountTiers: editDiscountTiers }, () => setPricingOpen(false), "pricing")} className="bg-brand hover:bg-[var(--color-primary-hover)] text-white">
              {saving ? "Saving…" : "Save"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Check-in dialog */}
      <Dialog open={checkInSectionOpen} onOpenChange={setCheckInSectionOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader><DialogTitle>Check-in</DialogTitle></DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-1.5">
              <Label>Check-in method</Label>
              <Select value={editCheckInMethod} onValueChange={setEditCheckInMethod}>
                <SelectTrigger><SelectValue placeholder="How do guests access the property?" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="KeyHandover">Key handover — meet in person</SelectItem>
                  <SelectItem value="Smartlock">Smartlock — code sent before arrival</SelectItem>
                  <SelectItem value="Keybox">Keybox — key left in a lockbox</SelectItem>
                  <SelectItem value="Reception">Reception / building management</SelectItem>
                  <SelectItem value="Other">Other</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label>Access instructions <span className="text-fg-muted font-normal text-xs">(optional)</span></Label>
              <Textarea value={editCheckInInstructions} onChange={(e) => setEditCheckInInstructions(e.target.value)} placeholder="Gate code: 1234 · Parking: B1 · Call +66 81 xxx if any issue" className="min-h-[80px] resize-none" />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setCheckInSectionOpen(false)}>Cancel</Button>
            <Button disabled={saving} onClick={() => saveAndNext({ checkInMethod: editCheckInMethod || null, checkInInstructions: editCheckInInstructions || null }, () => setCheckInSectionOpen(false), "checkin")} className="bg-brand hover:bg-[var(--color-primary-hover)] text-white">
              {saving ? "Saving…" : "Save"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Utilities dialog */}
      <Dialog open={utilitiesOpen} onOpenChange={setUtilitiesOpen}>
        <DialogContent className="max-w-sm">
          <DialogHeader><DialogTitle>Utilities included</DialogTitle></DialogHeader>
          <div className="py-2">
            <p className="text-sm text-fg-muted mb-4">Which utilities are included in the monthly rent?</p>
            <div className="space-y-3">
              {/* None included — clears all others */}
              {(() => {
                const noneSelected = !editUtilElec && !editUtilWater && !editUtilInternet && !editUtilGarbage;
                return (
                  <label className="flex items-center justify-between cursor-pointer p-3 rounded-xl border border-border hover:bg-bg-subtle transition-colors">
                    <span className="text-sm font-medium text-fg">None — tenant pays separately</span>
                    <input
                      type="checkbox"
                      className="h-4 w-4 rounded border-border"
                      checked={noneSelected}
                      onChange={() => { setEditUtilElec(false); setEditUtilWater(false); setEditUtilInternet(false); setEditUtilGarbage(false); }}
                    />
                  </label>
                );
              })()}
              <div className="border-t border-border" />
              {[
                { label: "Electricity", val: editUtilElec, set: setEditUtilElec },
                { label: "Water", val: editUtilWater, set: setEditUtilWater },
                { label: "Internet / WiFi", val: editUtilInternet, set: setEditUtilInternet },
                { label: "Garbage collection", val: editUtilGarbage, set: setEditUtilGarbage },
              ].map(({ label, val, set }) => (
                <label key={label} className="flex items-center justify-between cursor-pointer p-3 rounded-xl border border-border hover:bg-bg-subtle transition-colors">
                  <span className="text-sm font-medium text-fg">{label}</span>
                  <input type="checkbox" className="h-4 w-4 rounded border-border" checked={val} onChange={(e) => set(e.target.checked)} />
                </label>
              ))}
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setUtilitiesOpen(false)}>Cancel</Button>
            <Button disabled={saving} onClick={() => saveAndNext({ utilityElectricity: editUtilElec, utilityWater: editUtilWater, utilityInternet: editUtilInternet, utilityAircon: false, utilityGarbage: editUtilGarbage }, () => setUtilitiesOpen(false), "utilities")} className="bg-brand hover:bg-[var(--color-primary-hover)] text-white">
              {saving ? "Saving…" : "Save"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Rules & WiFi dialog */}
      <Dialog open={rulesOpen} onOpenChange={setRulesOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader><DialogTitle>House rules & WiFi</DialogTitle></DialogHeader>
          <div className="space-y-4 py-2">
            {/* Preset rule chips */}
            <div className="space-y-2">
              <Label>Common rules</Label>
              <div className="flex flex-wrap gap-2">
                {HOUSE_RULE_PRESETS.map((rule) => {
                  const active = editRulesPresets.includes(rule);
                  return (
                    <button
                      key={rule}
                      type="button"
                      onClick={() =>
                        setEditRulesPresets((prev) =>
                          active ? prev.filter((r) => r !== rule) : [...prev, rule]
                        )
                      }
                      className={cn(
                        "text-xs px-3 py-1.5 rounded-full border transition-colors",
                        active
                          ? "bg-brand text-white border-brand"
                          : "bg-white text-fg border-border hover:bg-bg-subtle"
                      )}
                    >
                      {rule}
                    </button>
                  );
                })}
              </div>
            </div>
            {/* Custom / additional rules */}
            <div className="space-y-1.5">
              <Label>Additional rules <span className="text-fg-muted font-normal">(optional)</span></Label>
              <Textarea
                value={editRules}
                onChange={(e) => setEditRules(e.target.value)}
                className="min-h-[72px] resize-none"
                placeholder="Any other rules specific to your property…"
              />
            </div>
            {/* WiFi */}
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5"><Label>WiFi name</Label><Input value={editWifiName} onChange={(e) => setEditWifiName(e.target.value)} placeholder="MyWiFi" /></div>
              <div className="space-y-1.5"><Label>WiFi password</Label><Input value={editWifiPwd} onChange={(e) => setEditWifiPwd(e.target.value)} placeholder="password" /></div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setRulesOpen(false)}>Cancel</Button>
            <Button
              disabled={saving}
              onClick={() => {
                const combined = [...editRulesPresets, editRules.trim()].filter(Boolean).join("\n");
                saveAndNext({ houseRules: combined || null, wifiName: editWifiName, wifiPassword: editWifiPwd }, () => setRulesOpen(false), "rules");
              }}
              className="bg-brand hover:bg-[var(--color-primary-hover)] text-white"
            >
              {saving ? "Saving…" : "Save"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Pets dialog */}
      <Dialog open={petsOpen} onOpenChange={setPetsOpen}>
        <DialogContent className="max-w-sm">
          <DialogHeader><DialogTitle>Pets policy</DialogTitle></DialogHeader>
          <div className="space-y-4 py-2">
            <label className="flex items-center justify-between cursor-pointer p-4 rounded-xl border border-border hover:bg-bg-subtle transition-colors">
              <div>
                <p className="text-sm font-medium text-fg">Pets allowed</p>
                <p className="text-xs text-fg-muted mt-0.5">Cats, dogs, and other pets</p>
              </div>
              <input type="checkbox" className="h-5 w-5 rounded border-border" checked={editPetsAllowed} onChange={(e) => setEditPetsAllowed(e.target.checked)} />
            </label>
            {editPetsAllowed && (
              <div className="space-y-1.5">
                <Label>Pet deposit (฿) <span className="text-fg-muted font-normal text-xs">0 = no extra deposit</span></Label>
                <Input type="number" min={0} value={editPetDeposit || ""} onChange={(e) => setEditPetDeposit(Number(e.target.value))} placeholder="0" />
              </div>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setPetsOpen(false)}>Cancel</Button>
            <Button disabled={saving} onClick={() => saveAndNext({ petsAllowed: editPetsAllowed, petDeposit: editPetDeposit }, () => setPetsOpen(false), "pets")} className="bg-brand hover:bg-[var(--color-primary-hover)] text-white">
              {saving ? "Saving…" : "Save"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Cancellation dialog */}
      <Dialog open={cancellationOpen} onOpenChange={setCancellationOpen}>
        <DialogContent className="max-w-sm">
          <DialogHeader><DialogTitle>Cancellation policy</DialogTitle></DialogHeader>
          <div className="py-2 space-y-4">
            {/* Always-true rules box */}
            <div className="bg-bg-subtle rounded-xl px-4 py-3 space-y-1 text-xs text-fg-muted">
              <p className="font-semibold text-fg text-sm mb-1">Always applies — regardless of option:</p>
              <p>💰 Tenant always pays for days they stayed <span className="text-fg font-medium">(pro-rata from first month)</span></p>
              <p>↩️ Unused days from first month are <span className="text-fg font-medium">refunded</span></p>
              <p>🔒 After grace period ends — early exit = <span className="text-fg font-medium">deposit kept</span></p>
            </div>

            {/* Grace period selector */}
            <div>
              <p className="text-sm font-medium text-fg mb-2">
                How long is the grace period? <span className="text-fg-muted font-normal">(leave without losing deposit)</span>
              </p>
              <div className="space-y-2">
                {CANCELLATION_PRESETS.map((preset) => {
                  const active = editCancelNoticeDays === preset.noticeDays;
                  return (
                    <button
                      key={preset.id}
                      type="button"
                      onClick={() => { setEditCancelNoticeDays(preset.noticeDays); setEditCancelPenaltyMonths(preset.penaltyMonths); }}
                      className={cn(
                        "w-full text-left rounded-xl border-2 px-4 py-3 transition-all",
                        active ? "border-brand bg-brand/5 ring-1 ring-brand" : "border-border bg-white hover:bg-bg-subtle"
                      )}
                    >
                      <div className="flex items-center justify-between mb-1.5">
                        <span className={cn("font-bold text-sm", active ? "text-brand" : "text-fg")}>{preset.label}</span>
                        <span className="text-xs text-fg-muted">{preset.note}</span>
                      </div>
                      <div className="space-y-0.5 text-xs">
                        <p className="text-fg-muted">
                          ✅ Leaves within {preset.noticeDays} days →{" "}
                          <span className="text-fg font-medium">deposit returned</span>
                          <span className="text-fg-muted"> · pays min {preset.minBillingDays} days from first month</span>
                        </p>
                        <p className="text-fg-muted">
                          🔒 Leaves after {preset.noticeDays} days →{" "}
                          <span className="text-fg font-medium">deposit kept</span>
                          <span className="text-fg-muted"> · days stayed deducted from first month</span>
                        </p>
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setCancellationOpen(false)}>Cancel</Button>
            <Button disabled={saving} onClick={() => saveAndNext({ cancellationNoticeDays: editCancelNoticeDays, cancellationPenaltyMonths: editCancelPenaltyMonths }, () => setCancellationOpen(false), "cancellation")} className="bg-brand hover:bg-[var(--color-primary-hover)] text-white">
              {saving ? "Saving…" : "Save"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Safety dialog */}
      <Dialog open={safetyOpen} onOpenChange={setSafetyOpen}>
        <DialogContent className="max-w-sm">
          <DialogHeader><DialogTitle>Safety features</DialogTitle></DialogHeader>
          <div className="py-2">
            <p className="text-sm text-fg-muted mb-4">Required disclosure under Thai law. Check all that apply.</p>
            <div className="space-y-2">
              {[
                { label: "Smoke detector", sub: "Installed and functional", val: editHasSmokeDetector, set: setEditHasSmokeDetector },
                { label: "CO (carbon monoxide) detector", sub: "Carbon monoxide detector", val: editHasCODetector, set: setEditHasCODetector },
                { label: "Fire extinguisher", sub: "On premises", val: editHasFireExtinguisher, set: setEditHasFireExtinguisher },
                { label: "First aid kit", sub: "Basic medical supplies available", val: editHasFirstAid, set: setEditHasFirstAid },
                { label: "Security cameras", sub: "Cameras on premises (must disclose)", val: editHasSecurityCamera, set: setEditHasSecurityCamera },
              ].map(({ label, sub, val, set }) => (
                <label key={label} className="flex items-center justify-between cursor-pointer p-3 rounded-xl border border-border hover:bg-bg-subtle transition-colors gap-3">
                  <div className="min-w-0">
                    <p className="text-sm font-medium text-fg">{label}</p>
                    <p className="text-xs text-fg-muted">{sub}</p>
                  </div>
                  <input type="checkbox" className="h-4 w-4 rounded border-border shrink-0" checked={val} onChange={(e) => { set(e.target.checked); if (e.target.checked) setEditNoneOfAbove(false); }} />
                </label>
              ))}

              {/* None option — clears all */}
              <label className="flex items-center justify-between cursor-pointer p-3 rounded-xl border border-border hover:bg-bg-subtle transition-colors gap-3">
                <div className="min-w-0">
                  <p className="text-sm font-medium text-fg">None of the above</p>
                  <p className="text-xs text-fg-muted">Property has none of these safety features</p>
                </div>
                <input
                  type="checkbox"
                  className="h-4 w-4 rounded border-border shrink-0"
                  checked={editNoneOfAbove}
                  onChange={(e) => {
                    setEditNoneOfAbove(e.target.checked);
                    if (e.target.checked) {
                      setEditHasSmokeDetector(false);
                      setEditHasCODetector(false);
                      setEditHasFireExtinguisher(false);
                      setEditHasFirstAid(false);
                      setEditHasSecurityCamera(false);
                    }
                  }}
                />
              </label>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setSafetyOpen(false)}>Cancel</Button>
            <Button
              disabled={saving || (!editHasSmokeDetector && !editHasCODetector && !editHasFireExtinguisher && !editHasFirstAid && !editHasSecurityCamera && !editNoneOfAbove)}
              onClick={() => saveAndNext({ hasSmokeDetector: editHasSmokeDetector, hasCODetector: editHasCODetector, hasFireExtinguisher: editHasFireExtinguisher, hasFirstAidKit: editHasFirstAid, hasSecurityCamera: editHasSecurityCamera }, () => setSafetyOpen(false), "safety")}
              className="bg-brand hover:bg-[var(--color-primary-hover)] text-white disabled:opacity-50"
            >
              {saving ? "Saving…" : "Save"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Location context dialog */}
      <Dialog open={locationCtxOpen} onOpenChange={setLocationCtxOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader><DialogTitle>Location & transport</DialogTitle></DialogHeader>
          <div className="space-y-5 py-2">
            {/* Transport chips */}
            <div className="space-y-2">
              <Label>Getting around</Label>
              <div className="flex flex-wrap gap-2">
                {(TRANSPORT_PRESETS_BY_CITY[asset?.cityId ?? 0] ?? DEFAULT_TRANSPORT_PRESETS).map((chip) => {
                  const active = editTransportChips.includes(chip);
                  return (
                    <button key={chip} type="button"
                      onClick={() => setEditTransportChips((prev) => active ? prev.filter((c) => c !== chip) : [...prev, chip])}
                      className={cn("text-xs px-3 py-1.5 rounded-full border transition-colors",
                        active ? "bg-brand text-white border-brand" : "bg-white text-fg border-border hover:bg-bg-subtle"
                      )}
                    >{chip}</button>
                  );
                })}
              </div>
              <Input
                value={editTransportInfo}
                onChange={(e) => setEditTransportInfo(e.target.value)}
                placeholder="Anything else — e.g. BTS Asok 5 min walk"
                className="mt-1"
              />
            </div>
            {/* Nearby places chips */}
            <div className="space-y-2">
              <Label>Nearby</Label>
              <div className="flex flex-wrap gap-2">
                {NEARBY_PRESETS.map((chip) => {
                  const active = editNearbyChips.includes(chip);
                  return (
                    <button key={chip} type="button"
                      onClick={() => setEditNearbyChips((prev) => active ? prev.filter((c) => c !== chip) : [...prev, chip])}
                      className={cn("text-xs px-3 py-1.5 rounded-full border transition-colors",
                        active ? "bg-brand text-white border-brand" : "bg-white text-fg border-border hover:bg-bg-subtle"
                      )}
                    >{chip}</button>
                  );
                })}
              </div>
              <Input
                value={editNearbyPlaces}
                onChange={(e) => setEditNearbyPlaces(e.target.value)}
                placeholder="Anything else — e.g. Terminal 21 10 min walk"
                className="mt-1"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setLocationCtxOpen(false)}>Cancel</Button>
            <Button
              disabled={saving}
              onClick={() => {
                const transport = [...editTransportChips, editTransportInfo.trim()].filter(Boolean).join(" · ") || null;
                const nearby = [...editNearbyChips, editNearbyPlaces.trim()].filter(Boolean).join(" · ") || null;
                saveAndNext({ transportInfo: transport, nearbyPlaces: nearby }, () => setLocationCtxOpen(false), "transport");
              }}
              className="bg-brand hover:bg-[var(--color-primary-hover)] text-white"
            >
              {saving ? "Saving…" : "Save"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={editOpen} onOpenChange={setEditOpen}>
        <DialogContent className="max-w-lg max-h-[85vh] flex flex-col">
          <DialogHeader><DialogTitle>Edit property details</DialogTitle></DialogHeader>
          <div className="space-y-4 py-2 overflow-y-auto flex-1 pr-1">
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

            {/* Check-in */}
            <div className="pt-2 border-t border-border">
              <p className="text-xs font-semibold text-fg-muted mb-3">Check-in</p>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label>Check-in method</Label>
                  <Select value={editCheckInMethod} onValueChange={setEditCheckInMethod}>
                    <SelectTrigger><SelectValue placeholder="Select method" /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="KeyHandover">Key handover</SelectItem>
                      <SelectItem value="Smartlock">Smartlock</SelectItem>
                      <SelectItem value="Keybox">Keybox</SelectItem>
                      <SelectItem value="Reception">Reception</SelectItem>
                      <SelectItem value="Other">Other</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div className="space-y-1.5 mt-3">
                <Label>Check-in instructions</Label>
                <Textarea value={editCheckInInstructions} onChange={(e) => setEditCheckInInstructions(e.target.value)} placeholder="Gate code, parking instructions, key location…" className="min-h-[60px] resize-none" />
              </div>
            </div>

            {/* Utilities included */}
            <div className="pt-2 border-t border-border">
              <p className="text-xs font-semibold text-fg-muted mb-3">Utilities included in rent</p>
              <div className="grid grid-cols-2 gap-2">
                {[
                  { label: "Electricity", val: editUtilElec, set: setEditUtilElec },
                  { label: "Water",       val: editUtilWater, set: setEditUtilWater },
                  { label: "Internet",    val: editUtilInternet, set: setEditUtilInternet },
                  { label: "Garbage",     val: editUtilGarbage, set: setEditUtilGarbage },
                ].map(({ label, val, set }) => (
                  <label key={label} className="flex items-center gap-2 cursor-pointer">
                    <input type="checkbox" className="h-4 w-4 rounded border-border" checked={val} onChange={(e) => set(e.target.checked)} />
                    <span className="text-sm text-fg">{label}</span>
                  </label>
                ))}
              </div>
            </div>

            {/* Pets */}
            <div className="pt-2 border-t border-border">
              <p className="text-xs font-semibold text-fg-muted mb-3">Pets</p>
              <label className="flex items-center gap-2 cursor-pointer mb-3">
                <input type="checkbox" className="h-4 w-4 rounded border-border" checked={editPetsAllowed} onChange={(e) => setEditPetsAllowed(e.target.checked)} />
                <span className="text-sm text-fg">Pets allowed</span>
              </label>
              {editPetsAllowed && (
                <div className="space-y-1.5">
                  <Label>Pet deposit (฿, 0 = none)</Label>
                  <Input type="number" min={0} value={editPetDeposit || ""} onChange={(e) => setEditPetDeposit(Number(e.target.value))} placeholder="0" />
                </div>
              )}
            </div>

            {/* Cancellation policy */}
            <div className="pt-2 border-t border-border">
              <p className="text-xs font-semibold text-fg-muted mb-3">Cancellation policy</p>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label>Notice period (days)</Label>
                  <Input type="number" min={0} value={editCancelNoticeDays} onChange={(e) => setEditCancelNoticeDays(Number(e.target.value))} />
                </div>
                <div className="space-y-1.5">
                  <Label>Penalty (months of rent)</Label>
                  <Input type="number" min={0} value={editCancelPenaltyMonths} onChange={(e) => setEditCancelPenaltyMonths(Number(e.target.value))} />
                </div>
              </div>
            </div>

            {/* Safety */}
            <div className="pt-2 border-t border-border">
              <p className="text-xs font-semibold text-fg-muted mb-3">Safety features</p>
              <div className="grid grid-cols-2 gap-2">
                {[
                  { label: "Smoke detector",     val: editHasSmokeDetector,    set: setEditHasSmokeDetector },
                  { label: "CO (carbon monoxide) detector", val: editHasCODetector, set: setEditHasCODetector },
                  { label: "Fire extinguisher",  val: editHasFireExtinguisher, set: setEditHasFireExtinguisher },
                  { label: "First aid kit",      val: editHasFirstAid,         set: setEditHasFirstAid },
                  { label: "Security cameras",   val: editHasSecurityCamera,   set: setEditHasSecurityCamera },
                ].map(({ label, val, set }) => (
                  <label key={label} className="flex items-center gap-2 cursor-pointer">
                    <input type="checkbox" className="h-4 w-4 rounded border-border" checked={val} onChange={(e) => set(e.target.checked)} />
                    <span className="text-sm text-fg">{label}</span>
                  </label>
                ))}
              </div>
            </div>

            {/* Location context */}
            <div className="pt-2 border-t border-border">
              <p className="text-xs font-semibold text-fg-muted mb-3">Location context</p>
              <div className="space-y-3">
                <div className="space-y-1.5">
                  <Label>Transport</Label>
                  <Input value={editTransportInfo} onChange={(e) => setEditTransportInfo(e.target.value)} placeholder="BTS Asok 5 min walk, Airport 45 min" />
                </div>
                <div className="space-y-1.5">
                  <Label>Nearby places</Label>
                  <Input value={editNearbyPlaces} onChange={(e) => setEditNearbyPlaces(e.target.value)} placeholder="Big C 200m, Samitivej Hospital 1km" />
                </div>
              </div>
            </div>
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
          <div className="bg-white px-6 pt-5 pb-4 space-y-5">

            {/* Blockers — shown before publish is allowed */}
            {(!readyAddress || !readyBasics || !readyPhotos) && (
              <div className="space-y-2">
                {!readyAddress && (
                  <div className="flex items-start gap-3 bg-red-50 rounded-xl p-3.5 border border-red-200">
                    <AlertTriangle size={16} className="text-red-500 mt-0.5 shrink-0" />
                    <div>
                      <p className="text-xs font-bold text-red-700">Address required</p>
                      <p className="text-xs text-red-600 mt-0.5">
                        <button onClick={() => { setPublishOpen(false); openLocationDialog(); }} className="underline font-semibold">Set your address</button>{" "}
                        so tenants can find your property in search.
                      </p>
                    </div>
                  </div>
                )}
                {!readyBasics && (
                  <div className="flex items-start gap-3 bg-red-50 rounded-xl p-3.5 border border-red-200">
                    <AlertTriangle size={16} className="text-red-500 mt-0.5 shrink-0" />
                    <div>
                      <p className="text-xs font-bold text-red-700">Title & price required</p>
                      <p className="text-xs text-red-600 mt-0.5">
                        <button onClick={() => { setPublishOpen(false); navigateSection("listing"); }} className="underline font-semibold">Add a title and monthly rate</button>{" "}
                        before publishing.
                      </p>
                    </div>
                  </div>
                )}
                {!readyPhotos && (
                  <div className="flex items-start gap-3 bg-amber-50 rounded-xl p-3.5 border border-amber-200">
                    <AlertTriangle size={16} className="text-amber-500 mt-0.5 shrink-0" />
                    <div>
                      <p className="text-xs font-bold text-amber-700">Photos required</p>
                      <p className="text-xs text-amber-600 mt-0.5">
                        <button onClick={() => { setPublishOpen(false); navigateSection("photos"); }} className="underline font-semibold">Add at least one photo</button>.{" "}
                        Listings with photos get 3× more views.
                      </p>
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* Available from */}
            <div>
              <p className="text-[11px] font-bold text-fg-muted uppercase tracking-widest mb-1.5">Available from</p>
              <DatePicker
                value={publishStartDate}
                onChange={setPublishStartDate}
                isDisabled={(d) => { const today = new Date(); today.setHours(0,0,0,0); return d < today; }}
              />
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
                          className="flex-1 py-2 rounded-xl text-xs font-bold transition-all duration-150 active:scale-95 leading-tight"
                          style={active ? {
                            background:"linear-gradient(135deg,#6366f1,#8b5cf6)",
                            color:"white",
                            boxShadow:"0 3px 10px rgba(139,92,246,.4)",
                          } : { background:"#f0f0f3", color:"#71717a" }}
                        >
                          {v === "∞" ? "∞" : `${v} month${Number(v) !== 1 ? "s" : ""}`}
                        </button>
                      );
                    })}
                  </div>
                </div>
              );
            })() : (
              <div>
                <p className="text-[11px] font-bold text-fg-muted uppercase tracking-widest mb-1.5">Available until</p>
                <DatePicker
                  value={publishEndDate}
                  onChange={setPublishEndDate}
                  isDisabled={(d) => {
                    const today = new Date(); today.setHours(0,0,0,0);
                    const minDate = publishStartDate ? new Date(publishStartDate + "T00:00:00") : today;
                    return d < minDate;
                  }}
                />
              </div>
            )}
          </div>

          {/* ── CTA ── */}
          <div className="bg-white px-6 pb-6 flex items-center gap-3">
            <button
              type="button"
              onClick={() => setPublishOpen(false)}
              className="px-4 py-3 rounded-xl text-sm font-semibold text-fg-muted hover:text-fg hover:bg-bg-subtle transition-colors whitespace-nowrap"
            >
              Not yet
            </button>
            <button
              type="button"
              disabled={!canPublish || !readyToPublish || isPublishing}
              onClick={handlePublish}
              className="flex-1 h-12 rounded-xl font-extrabold text-white text-base transition-all active:scale-[.98] disabled:opacity-40 disabled:cursor-not-allowed"
              style={{
                background:"linear-gradient(135deg,#6366f1 0%,#8b5cf6 50%,#a78bfa 100%)",
                backgroundSize:"200% auto",
                ...(canPublish && readyToPublish && !isPublishing
                  ? { animation:"pub-pulse 2s ease-in-out infinite" }
                  : {}),
              }}
            >
              {isPublishing ? "Launching…" : "🚀 Launch ad"}
            </button>
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={addUtilityOpen} onOpenChange={(v) => { setAddUtilityOpen(v); if (!v) resetUtilityDialog(); }}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>{peaStep === "confirm" ? "Confirm meter" : "Add utility"}</DialogTitle>
          </DialogHeader>

          {peaStep === "confirm" ? (
            /* ── Step 2: PEA confirmation ── */
            <div className="py-2 space-y-4">
              <div className="rounded-xl bg-bg-subtle border border-border px-4 py-3 space-y-2">
                <p className="text-xs text-fg-muted">Meter registered to</p>
                <p className="text-base font-semibold text-fg">{peaCustomerName}</p>
                <div className="pt-1 space-y-1 text-xs font-mono text-fg-muted">
                  <p>CA {accountNumber.trim()}</p>
                  <p>PEA No. {peaMeterNo.trim()}</p>
                </div>
              </div>
              <p className="text-xs text-fg-muted leading-relaxed">
                Is this the correct meter for this property? Only the CA number will be stored — PEA No. is used for verification only.
              </p>
            </div>
          ) : (
            /* ── Step 1: form ── */
            <div className="space-y-4 py-2">
              <div className="space-y-1.5">
                <Label>Type</Label>
                <Select value={utilType} onValueChange={(v) => { setUtilType(v as UtilityType); setProviderName(""); setPeaStep("form"); }}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>{Object.values(UtilityType).map((t) => <SelectItem key={t} value={t}>{t}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label>Provider</Label>
                <Select value={providerName} onValueChange={(v) => { setProviderName(v); setPeaStep("form"); }}>
                  <SelectTrigger><SelectValue placeholder="Select provider…" /></SelectTrigger>
                  <SelectContent>
                    {UTILITY_PROVIDERS[utilType].map((p) => <SelectItem key={p} value={p}>{p}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label>CA / REF No.</Label>
                <Input
                  value={accountNumber}
                  onChange={(e) => setAccountNumber(e.target.value)}
                  placeholder="Account number"
                  className="font-mono"
                />
              </div>
              {isPea && (
                <div className="space-y-1.5">
                  <Label>PEA No. (Meter No.)</Label>
                  <Input
                    value={peaMeterNo}
                    onChange={(e) => setPeaMeterNo(e.target.value)}
                    placeholder="Meter number"
                    className="font-mono"
                  />
                  <p className="text-[11px] text-fg-muted">Both numbers are printed on your electricity bill.</p>
                </div>
              )}
            </div>
          )}

          <DialogFooter>
            {peaStep === "confirm" ? (
              <>
                <Button variant="outline" onClick={() => setPeaStep("form")}>Back</Button>
                <Button
                  disabled={createUtility.isPending}
                  onClick={handleAddUtility}
                  className="bg-brand hover:bg-[var(--color-primary-hover)] text-white"
                >
                  {createUtility.isPending ? "Saving…" : "Confirm & save"}
                </Button>
              </>
            ) : isPea ? (
              <>
                <Button variant="outline" onClick={() => setAddUtilityOpen(false)}>Cancel</Button>
                <Button
                  disabled={!accountNumber.trim() || !peaMeterNo.trim() || peaValidating}
                  onClick={handlePeaVerify}
                  className="bg-brand hover:bg-[var(--color-primary-hover)] text-white"
                >
                  {peaValidating ? "Verifying…" : "Verify meter"}
                </Button>
              </>
            ) : (
              <>
                <Button variant="outline" onClick={() => setAddUtilityOpen(false)}>Cancel</Button>
                <Button
                  disabled={!providerName.trim() || !accountNumber.trim() || createUtility.isPending}
                  onClick={handleAddUtility}
                  className="bg-brand hover:bg-[var(--color-primary-hover)] text-white"
                >
                  {createUtility.isPending ? "Adding…" : "Add utility"}
                </Button>
              </>
            )}
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
