import { useState, useRef } from "react";
import { useParams, Link, useNavigate } from "react-router-dom";
import {
  ArrowLeft, Plus, Trash2, Pencil, Wifi, Zap,
  ImagePlus, BedDouble, Bath, Users, X, AlertTriangle, Copy, Check, Link2,
} from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
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

// ─── Sub-components ──────────────────────────────────────────────────────────

function OccupancyBadge({ status }: { status: string }) {
  const variant =
    status === "Occupied" ? "adm-tag--success" :
    status === "ActionRequired" ? "adm-tag--danger" :
    "adm-tag--neutral";
  return <span className={`adm-tag ${variant}`}>{status}</span>;
}

function Section({
  title, action, children,
}: { title: string; action?: React.ReactNode; children: React.ReactNode }) {
  return (
    <div>
      <div className="adm-card__head" style={{ marginBottom: 12 }}>
        <div className="adm-card__title">{title}</div>
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
            <div key={m.id} style={{ aspectRatio: "16/9", overflow: "hidden", background: "var(--surface-muted)", position: "relative" }} className="group">
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
                style={{ position: "absolute", top: 4, right: 4, width: 22, height: 22, background: "rgba(0,0,0,0.65)", color: "white", border: "none", display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer", opacity: 0 }}
                className="group-hover:opacity-100"
              >
                {deleting === m.id
                  ? <div style={{ width: 10, height: 10, border: "1.5px solid white", borderTopColor: "transparent", borderRadius: "50%" }} />
                  : <X size={12} />}
              </button>
            </div>
          ))}

          {/* Upload button */}
          <label
            style={{
              opacity: uploading ? 0.5 : 1,
              pointerEvents: uploading ? "none" : undefined,
            }}
            style={{ aspectRatio: "16/9", border: "1px dashed var(--ink-5)", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 6, cursor: "pointer" }}
          >
            {uploading ? (
              <div style={{ width: 18, height: 18, border: "2px solid var(--ink)", borderTopColor: "transparent", borderRadius: "50%" }} />
            ) : (
              <ImagePlus size={18} style={{ color: "var(--ink-4)" }} />
            )}
            <span style={{ fontFamily: "var(--mono)", fontSize: 11, color: "var(--ink-4)" }}>
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
          <p style={{ fontFamily: "var(--mono)", fontSize: 11, color: "var(--ink-4)", marginTop: 8 }}>
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
            style={{ position: "absolute", right: 16, top: 16, background: "rgba(255,255,255,0.12)", border: "1px solid rgba(255,255,255,0.3)", color: "white", padding: 6, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center" }}
            onClick={() => setLightboxUrl(null)}
          >
            <X size={18} />
          </button>
          <img
            src={lightboxUrl}
            alt="Full size preview"
            style={{ maxHeight: "90vh", maxWidth: "90vw", objectFit: "contain" }}
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
          <p style={{ fontFamily: "var(--sans)", fontSize: 13, color: "var(--ink-3)" }}>
            This action cannot be undone.
          </p>
          <DialogFooter>
            <button
              className="adm-btn adm-btn--ghost"
              onClick={() => setConfirmId(null)}
              disabled={!!deleting}
            >
              Cancel
            </button>
            <button
              className="adm-btn adm-btn--danger"
              disabled={!!deleting}
              onClick={() => confirmId && handleDelete(confirmId)}
            >
              {deleting ? "Deleting…" : "Delete"}
            </button>
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

  if (isLoading) return <p style={{ fontFamily: "var(--sans)", fontSize: 13, color: "var(--ink-3)" }}>Loading amenities…</p>;
  if (!refAmenities?.length) return <p style={{ fontFamily: "var(--sans)", fontSize: 13, color: "var(--ink-3)" }}>No amenities configured.</p>;

  const presentList = refAmenities.filter((a) => presentSet.has(a.id));

  return (
    <>
      <div>
        {presentList.length === 0 ? (
          <p style={{ fontFamily: "var(--sans)", fontSize: 13, color: "var(--ink-3)" }}>No amenities selected.</p>
        ) : (
          <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
            {presentList.map((a) => (
              <span
                key={a.id}
                style={{
                  display: "inline-flex",
                  alignItems: "center",
                  gap: 4,
                  borderRadius: 4,
                  background: "var(--surface-muted)",
                  padding: "3px 8px",
                  fontFamily: "var(--sans)",
                  fontSize: 12,
                  fontWeight: 500,
                  color: "var(--ink)",
                }}
              >
                {a.icon && [...a.icon].length <= 2 && (
                  <span style={{ fontSize: 14, lineHeight: 1 }}>{a.icon}</span>
                )}
                {a.name}
              </span>
            ))}
          </div>
        )}
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginTop: 12 }}>
          <p style={{ fontFamily: "var(--mono)", fontSize: 11, color: "var(--ink-4)" }}>
            {presentList.length} of {refAmenities.length} selected
          </p>
          <button className="adm-btn adm-btn--ghost adm-btn--sm" onClick={() => setEditOpen(true)}>
            Edit amenities
          </button>
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
      <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
        <Skeleton className="h-8 w-64" />
        <Skeleton className="h-48 w-full" />
        <Skeleton className="h-32 w-full" />
      </div>
    );
  }

  if (!asset) return <div style={{ fontFamily: "var(--sans)", fontSize: 13, color: "var(--ink-3)" }}>Property not found.</div>;

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
          <button
            className="adm-btn adm-btn--ghost adm-btn--sm"
            onClick={handleGenerateLandlordInvite}
            disabled={generateInvite.isPending}
          >
            <Link2 className="h-3.5 w-3.5 mr-1" />
            {generateInvite.isPending ? "Generating…" : "Invite"}
          </button>
        ) : undefined
      }
    >
      {landlord ? (
        <div className="adm-card">
          <div style={{ padding: 16 }}>
            <div style={{ display: "flex", alignItems: "flex-start", gap: 12 }}>
              <div style={{
                height: 36, width: 36, borderRadius: "50%",
                background: "var(--surface-muted)",
                display: "flex", alignItems: "center", justifyContent: "center",
                fontFamily: "var(--sans)", fontSize: 13, fontWeight: 700,
                flexShrink: 0,
              }}>
                {((landlord.firstName ?? landlord.lineName ?? landlord.email ?? "?")[0]).toUpperCase()}
              </div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <p style={{ fontFamily: "var(--sans)", fontWeight: 600, fontSize: 13, marginBottom: 2 }}>
                  {landlord.firstName && landlord.lastName
                    ? `${landlord.firstName} ${landlord.lastName}`
                    : landlord.lineName ?? landlord.email ?? "Landlord"}
                </p>
                {landlord.email && <p style={{ fontFamily: "var(--mono)", fontSize: 11, color: "var(--ink-4)" }}>{landlord.email}</p>}
                {landlord.lineName && <p style={{ fontFamily: "var(--mono)", fontSize: 11, color: "var(--ink-4)" }}>LINE: {landlord.lineName}</p>}
                <p style={{ fontFamily: "var(--mono)", fontSize: 11, color: "var(--ink-4)" }}>{landlord.userId.slice(0, 8)}…</p>
              </div>
              <button
                className="adm-btn adm-btn--icon adm-btn--danger"
                style={{ height: 28, width: 28, flexShrink: 0 }}
                onClick={() => setUnlinkLandlordOpen(true)}
                title="Unlink"
              >
                <Trash2 className="h-3.5 w-3.5" />
              </button>
            </div>
          </div>
        </div>
      ) : !landlordLink ? (
        <p style={{ fontFamily: "var(--sans)", fontSize: 13, color: "var(--ink-3)" }}>No landlord linked.</p>
      ) : null}
      {landlordLink && (
        <div className="adm-card" style={{ borderColor: "var(--success)", background: "color-mix(in srgb, var(--success) 8%, white)" }}>
          <div style={{ padding: 12, display: "flex", flexDirection: "column", gap: 10 }}>
            <p style={{ fontFamily: "var(--mono)", fontSize: 11, color: "var(--ink-4)" }}>Expires {formatDate(landlordLink.expiresAt)}</p>
            <div style={{
              background: "white",
              borderRadius: 4,
              padding: "6px 8px",
              border: "1px solid color-mix(in srgb, var(--success) 30%, transparent)",
              wordBreak: "break-all",
            }}>
              <p style={{ fontFamily: "var(--mono)", fontSize: 11, color: "var(--ink-3)" }}>{landlordLink.link}</p>
            </div>
            <div style={{ display: "flex", gap: 8 }}>
              <button
                className="adm-btn adm-btn--ink adm-btn--sm"
                style={{ flex: 1 }}
                onClick={handleCopyLandlordLink}
              >
                {linkCopied ? <><Check className="h-3 w-3 mr-1" />Copied!</> : <><Copy className="h-3 w-3 mr-1" />Copy link</>}
              </button>
              <button className="adm-btn adm-btn--ghost adm-btn--sm" onClick={() => setLandlordLink(null)}>Dismiss</button>
            </div>
          </div>
        </div>
      )}
    </Section>
  );

  return (
    <div style={{ maxWidth: 1152, display: "flex", flexDirection: "column", gap: 24 }}>
      {/* Back */}
      <div>
        <Link to="/manager/assets">
          <button className="adm-btn adm-btn--ghost adm-btn--sm">
            <ArrowLeft className="h-4 w-4 mr-1" />Properties
          </button>
        </Link>
      </div>

      {/* ── Header ── */}
      <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 16 }}>
        <div>
          <h1 style={{ fontFamily: "var(--sans)", fontSize: 22, fontWeight: 700, color: "var(--ink)" }}>{asset.internalName}</h1>
          <div style={{ display: "flex", alignItems: "center", gap: 16, fontFamily: "var(--sans)", fontSize: 13, color: "var(--ink-3)", marginTop: 6 }}>
            <span style={{ display: "flex", alignItems: "center", gap: 4 }}><BedDouble className="h-3.5 w-3.5" />{asset.bedrooms} bed</span>
            <span style={{ display: "flex", alignItems: "center", gap: 4 }}><Bath className="h-3.5 w-3.5" />{asset.bathrooms} bath</span>
            <span style={{ display: "flex", alignItems: "center", gap: 4 }}><Users className="h-3.5 w-3.5" />max {asset.maxOccupancy}</span>
          </div>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <OccupancyBadge status={asset.occupancyStatus} />
          <button
            className="adm-btn adm-btn--icon adm-btn--danger"
            onClick={() => setDeleteOpen(true)}
          >
            <Trash2 className="h-4 w-4" />
          </button>
        </div>
      </div>

      {/* ── Photos — full width ── */}
      {listing && (
        <Section
          title="Photos"
          action={
            <span style={{ fontFamily: "var(--mono)", fontSize: 11, color: "var(--ink-4)" }}>
              {listing.media.length} photo{listing.media.length !== 1 ? "s" : ""}
            </span>
          }
        >
          <MediaSection listingId={listing.id} media={listing.media} />
        </Section>
      )}

      {/* ── Two-column body ── */}
      <div className="grid grid-cols-[3fr_2fr] gap-6 items-start">

        {/* ── LEFT: operational ── */}
        <div style={{ display: "flex", flexDirection: "column", gap: 24 }}>

          {/* Booking */}
          <Section
            title="Booking"
            action={
              landlord ? (
                <Link to={`/manager/bookings/new?assetId=${id}`}>
                  <button className="adm-btn adm-btn--ink adm-btn--sm">
                    <Plus className="h-4 w-4 mr-1" />New booking
                  </button>
                </Link>
              ) : (
                <span style={{ fontFamily: "var(--mono)", fontSize: 11, color: "var(--ink-4)" }}>No landlord linked</span>
              )
            }
          >
            {activeBooking ? (
              <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                <Link to={`/manager/bookings/${activeBooking.id}`}>
                  <div className="adm-card" style={{ borderColor: "var(--success)", background: "color-mix(in srgb, var(--success) 8%, white)", cursor: "pointer" }}>
                    <div style={{ padding: 16 }}>
                      <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 12 }}>
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 4 }}>
                            <span className="adm-tag adm-tag--success" style={{ fontSize: 11, flexShrink: 0 }}>Active</span>
                            <span style={{ fontFamily: "var(--sans)", fontWeight: 600, fontSize: 13, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{activeBooking.tenantName ?? "No tenant"}</span>
                          </div>
                          <p style={{ fontFamily: "var(--mono)", fontSize: 11, color: "var(--ink-4)" }}>
                            {formatDate(activeBooking.checkInDate)} → {formatDate(activeBooking.checkOutDate)}
                          </p>
                          {activeBooking.daysRemaining != null && (
                            <p style={{ fontFamily: "var(--sans)", fontWeight: 500, fontSize: 12, color: "var(--success)", marginTop: 2 }}>{activeBooking.daysRemaining} days remaining</p>
                          )}
                        </div>
                        <div style={{ textAlign: "right", flexShrink: 0 }}>
                          <p style={{ fontFamily: "var(--sans)", fontWeight: 700, fontSize: 16 }}>{formatThb(activeBooking.rentAmount)}</p>
                          <p style={{ fontFamily: "var(--mono)", fontSize: 11, color: "var(--ink-4)" }}>total</p>
                        </div>
                      </div>
                    </div>
                  </div>
                </Link>
                {upcomingBookings.length > 0 && (
                  <div>
                    <p style={{ fontFamily: "var(--sans)", fontWeight: 500, fontSize: 12, color: "var(--ink-3)", marginBottom: 6, marginTop: 8 }}>Upcoming</p>
                    <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                      {upcomingBookings.map((b) => (
                        <Link key={b.id} to={`/manager/bookings/${b.id}`}>
                          <div className="adm-card" style={{ cursor: "pointer" }}>
                            <div style={{ padding: 12, display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                              <div>
                                <p style={{ fontFamily: "var(--sans)", fontWeight: 500, fontSize: 13 }}>{b.tenantName ?? "No tenant"}</p>
                                <p style={{ fontFamily: "var(--mono)", fontSize: 11, color: "var(--ink-4)" }}>{formatDate(b.checkInDate)} → {formatDate(b.checkOutDate)}</p>
                              </div>
                              <div style={{ textAlign: "right" }}>
                                <span className="adm-tag adm-tag--ink" style={{ fontSize: 11 }}>{b.status}</span>
                                <p style={{ fontFamily: "var(--mono)", fontSize: 11, color: "var(--ink-4)", marginTop: 2 }}>{formatThb(b.rentAmount)} total</p>
                              </div>
                            </div>
                          </div>
                        </Link>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            ) : upcomingBookings.length > 0 ? (
              <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                {upcomingBookings.map((b) => (
                  <Link key={b.id} to={`/manager/bookings/${b.id}`}>
                    <div className="adm-card" style={{ cursor: "pointer" }}>
                      <div style={{ padding: 12, display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                        <div>
                          <p style={{ fontFamily: "var(--sans)", fontWeight: 500, fontSize: 13 }}>{b.tenantName ?? "No tenant"}</p>
                          <p style={{ fontFamily: "var(--mono)", fontSize: 11, color: "var(--ink-4)" }}>{formatDate(b.checkInDate)} → {formatDate(b.checkOutDate)}</p>
                        </div>
                        <div style={{ textAlign: "right" }}>
                          <span className="adm-tag adm-tag--ink" style={{ fontSize: 11 }}>{b.status}</span>
                          <p style={{ fontFamily: "var(--mono)", fontSize: 11, color: "var(--ink-4)", marginTop: 2 }}>{formatThb(b.rentAmount)}/mo</p>
                        </div>
                      </div>
                    </div>
                  </Link>
                ))}
              </div>
            ) : (
              <p style={{ fontFamily: "var(--sans)", fontSize: 13, color: "var(--ink-3)" }}>No bookings yet.</p>
            )}
          </Section>

          {/* Financial */}
          {summary && (
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 12 }}>
              <div className="adm-card">
                <div style={{ padding: 16 }}>
                  <p style={{ fontFamily: "var(--mono)", fontSize: 11, color: "var(--ink-4)", marginBottom: 4 }}>Revenue</p>
                  <p style={{ fontFamily: "var(--sans)", fontWeight: 700, fontSize: 18 }}>{formatThb(summary.totalRevenue)}</p>
                </div>
              </div>
              <div className="adm-card">
                <div style={{ padding: 16 }}>
                  <p style={{ fontFamily: "var(--mono)", fontSize: 11, color: "var(--ink-4)", marginBottom: 4 }}>Expenses</p>
                  <p style={{ fontFamily: "var(--sans)", fontWeight: 700, fontSize: 18 }}>{formatThb(summary.totalExpenses)}</p>
                </div>
              </div>
              <div className="adm-card">
                <div style={{ padding: 16 }}>
                  <p style={{ fontFamily: "var(--mono)", fontSize: 11, color: "var(--ink-4)", marginBottom: 4 }}>Net profit</p>
                  <p style={{ fontFamily: "var(--sans)", fontWeight: 700, fontSize: 18, color: summary.netProfit >= 0 ? "var(--success)" : "var(--danger)" }}>
                    {formatThb(summary.netProfit)}
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* Tickets */}
          <Section
            title="Tickets"
            action={
              <Link to={`/manager/tickets/new?assetId=${id}`}>
                <button className="adm-btn adm-btn--ghost adm-btn--sm">
                  <Plus className="h-4 w-4 mr-1" />New ticket
                </button>
              </Link>
            }
          >
            {!openTickets.length ? (
              <p style={{ fontFamily: "var(--sans)", fontSize: 13, color: "var(--ink-3)" }}>No open tickets.</p>
            ) : (
              <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                {openTickets.slice(0, 5).map((t) => (
                  <Link key={t.id} to={`/manager/tickets/${t.id}`}>
                    <div className="adm-card" style={{ cursor: "pointer" }}>
                      <div style={{ padding: 12, display: "flex", alignItems: "center", gap: 12 }}>
                        <span style={{ fontSize: 16 }}>{ticketKindIcon(t.kind)}</span>
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <p style={{ fontFamily: "var(--sans)", fontWeight: 500, fontSize: 13, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{t.title}</p>
                          <p style={{ fontFamily: "var(--mono)", fontSize: 11, color: "var(--ink-4)" }}>{t.displayId}</p>
                        </div>
                        <span className={`adm-tag ${ticketStatusColor(t.status)}`} style={{ fontSize: 11 }}>{t.status}</span>
                      </div>
                    </div>
                  </Link>
                ))}
                {openTickets.length > 5 && (
                  <p style={{ fontFamily: "var(--mono)", fontSize: 11, color: "var(--ink-4)", textAlign: "center", paddingTop: 4 }}>+{openTickets.length - 5} more</p>
                )}
              </div>
            )}
          </Section>
        </div>

        {/* ── RIGHT: property info ── */}
        <div style={{ display: "flex", flexDirection: "column", gap: 24 }}>

          {/* Rental details */}
          <Section
            title="Rental details"
            action={listing && (
              listing.status === ListingStatus.Draft
                ? (
                  <button className="adm-btn adm-btn--ink adm-btn--sm" onClick={openPublishDialog}>
                    Publish listing
                  </button>
                )
                : listing.isEditable
                ? (
                  <button className="adm-btn adm-btn--ghost adm-btn--sm" onClick={openEditSettings}>
                    <Pencil className="h-3.5 w-3.5 mr-1" />Edit
                  </button>
                )
                : (
                  <div style={{ display: "flex", gap: 6 }}>
                    <button className="adm-btn adm-btn--ghost adm-btn--sm" onClick={() => setNewVersionConfirmOpen(true)}>
                      <Plus className="h-3.5 w-3.5 mr-1" />New version
                    </button>
                    {activeBooking && (
                      <button className="adm-btn adm-btn--ghost adm-btn--sm" onClick={() => setHotfixOpen(true)}>
                        Hotfix
                      </button>
                    )}
                  </div>
                )
            )}
          >
            {listing ? (
              <div className="adm-card">
                <div style={{ padding: 16, display: "flex", flexDirection: "column", gap: 12 }}>
                  <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 8 }}>
                    <div>
                      {listing.rentalType === RentalType.ShortTerm ? (
                        <>
                          <p style={{ fontFamily: "var(--mono)", fontSize: 11, color: "var(--ink-4)", marginBottom: 2 }}>Nightly rate</p>
                          <p style={{ fontFamily: "var(--sans)", fontWeight: 700, fontSize: 20 }}>
                            {formatThb(listing.basePrice)}
                            <span style={{ fontFamily: "var(--sans)", fontWeight: 400, fontSize: 13, color: "var(--ink-3)" }}>/night</span>
                          </p>
                        </>
                      ) : (
                        <>
                          <p style={{ fontFamily: "var(--mono)", fontSize: 11, color: "var(--ink-4)", marginBottom: 2 }}>Monthly rent</p>
                          <p style={{ fontFamily: "var(--sans)", fontWeight: 700, fontSize: 20 }}>
                            {listing.baseMonthlyRate != null ? formatThb(listing.baseMonthlyRate) : formatThb(listing.basePrice)}
                            <span style={{ fontFamily: "var(--sans)", fontWeight: 400, fontSize: 13, color: "var(--ink-3)" }}>/mo</span>
                          </p>
                        </>
                      )}
                    </div>
                    <span className="adm-tag adm-tag--neutral" style={{ fontSize: 11, flexShrink: 0 }}>
                      {listing.rentalType === RentalType.ShortTerm ? "Short term" : "Long term"}
                    </span>
                  </div>
                  {(!isRealDate(listing.startDate) || !isRealDate(listing.endDate)) && (
                    <div style={{
                      borderRadius: 6,
                      background: "color-mix(in srgb, var(--warning) 10%, white)",
                      border: "1px solid color-mix(in srgb, var(--warning) 40%, transparent)",
                      padding: "8px 12px",
                    }}>
                      <p style={{ fontFamily: "var(--sans)", fontWeight: 500, fontSize: 12, color: "var(--warning)" }}>No validity period set</p>
                      <p style={{ fontFamily: "var(--mono)", fontSize: 11, color: "var(--ink-3)", marginTop: 2 }}>Bookings cannot be created until a validity period is set. Dates are set when you publish.</p>
                    </div>
                  )}
                  {isRealDate(listing.startDate) && isRealDate(listing.endDate) && (
                    <div className="adm-kv">
                      <span className="adm-kv__k">Valid</span>
                      <span className="adm-kv__v">{formatDate(listing.startDate)} → {formatDate(listing.endDate)}</span>
                    </div>
                  )}
                  {listing.status === ListingStatus.Draft && (
                    <p style={{ fontFamily: "var(--sans)", fontWeight: 500, fontSize: 12, color: "var(--warning)" }}>Draft — publish to make available for bookings.</p>
                  )}
                  {listing.description && (
                    <div>
                      <p style={{ fontFamily: "var(--mono)", fontSize: 11, color: "var(--ink-4)", marginBottom: 2 }}>Description</p>
                      <p style={{ fontFamily: "var(--sans)", fontSize: 12, color: "var(--ink-3)", lineHeight: 1.5, display: "-webkit-box", WebkitLineClamp: 3, WebkitBoxOrient: "vertical", overflow: "hidden" }}>{listing.description}</p>
                    </div>
                  )}
                  {(listing.wifiName || listing.wifiPassword) && (
                    <div style={{
                      display: "flex", alignItems: "flex-start", gap: 8,
                      padding: 10, borderRadius: 6, background: "var(--surface-muted)",
                    }}>
                      <Wifi className="h-3.5 w-3.5" style={{ flexShrink: 0, marginTop: 2, color: "var(--ink-3)" }} />
                      <div>
                        <p style={{ fontFamily: "var(--sans)", fontWeight: 500, fontSize: 12 }}>{listing.wifiName}</p>
                        {listing.wifiPassword && <p style={{ fontFamily: "var(--mono)", fontSize: 11, color: "var(--ink-4)" }}>{listing.wifiPassword}</p>}
                      </div>
                    </div>
                  )}
                </div>
              </div>
            ) : (
              <p style={{ fontFamily: "var(--sans)", fontSize: 13, color: "var(--ink-3)" }}>Not configured.</p>
            )}
          </Section>

          {/* Landlord */}
          {LandlordSection}

          {/* Utilities */}
          <Section
            title="Utilities"
            action={
              <button className="adm-btn adm-btn--ghost adm-btn--sm" onClick={() => setAddUtilityOpen(true)}>
                <Plus className="h-4 w-4 mr-1" />Add
              </button>
            }
          >
            {!utilities?.length ? (
              <p style={{ fontFamily: "var(--sans)", fontSize: 13, color: "var(--ink-3)" }}>No utility contracts.</p>
            ) : (
              <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                {utilities.map((u) => (
                  <div key={u.id} className="adm-card">
                    <div style={{ padding: 12, display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                      <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                        <Zap className="h-3.5 w-3.5" style={{ color: "var(--ink-3)" }} />
                        <div>
                          <p style={{ fontFamily: "var(--sans)", fontWeight: 500, fontSize: 13 }}>{u.utilityType}</p>
                          <p style={{ fontFamily: "var(--mono)", fontSize: 11, color: "var(--ink-4)" }}>{u.providerName} · {u.accountNumber}</p>
                        </div>
                      </div>
                      <button
                        className="adm-btn adm-btn--icon adm-btn--danger"
                        style={{ height: 28, width: 28 }}
                        onClick={() => deleteUtility.mutate(u.id)}
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  </div>
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
          <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
            {listings
              .filter((l) => l.id !== listing?.id)
              .map((l) => {
                const tagVariant =
                  l.status === ListingStatus.Active ? "adm-tag--success" :
                  l.status === ListingStatus.Draft ? "adm-tag--warn" :
                  "adm-tag--neutral";
                return (
                  <div key={l.id} className="adm-card">
                    <div style={{ padding: 12, display: "flex", alignItems: "center", gap: 16, fontSize: 13 }}>
                      <span className={`adm-tag ${tagVariant}`} style={{ fontSize: 11, flexShrink: 0 }}>{l.status}</span>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <p style={{ fontFamily: "var(--sans)", fontWeight: 500, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{l.title}</p>
                        <p style={{ fontFamily: "var(--mono)", fontSize: 11, color: "var(--ink-4)" }}>
                          {l.rentalType === RentalType.ShortTerm
                            ? `${formatThb(l.basePrice)}/night`
                            : l.baseMonthlyRate != null
                              ? `${formatThb(l.baseMonthlyRate)}/mo`
                              : `${formatThb(l.basePrice)}/mo`}
                          {isRealDate(l.startDate) && isRealDate(l.endDate) && ` · ${formatDate(l.startDate)} → ${formatDate(l.endDate)}`}
                        </p>
                      </div>
                      {l.publishedAt && (
                        <p style={{ fontFamily: "var(--mono)", fontSize: 11, color: "var(--ink-4)", flexShrink: 0 }}>Published {formatDate(l.publishedAt)}</p>
                      )}
                    </div>
                  </div>
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
                    <p style={{ fontFamily: "var(--mono)", fontSize: 11, color: "var(--ink-4)" }}>Price per night × number of nights = rent</p>
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
                    <p style={{ fontFamily: "var(--mono)", fontSize: 11, color: "var(--ink-4)" }}>Divided by 30 to calculate daily rate</p>
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
            <button className="adm-btn adm-btn--ghost" onClick={() => setEditSettingsOpen(false)}>Cancel</button>
            <button className="adm-btn adm-btn--ink" onClick={handleSaveSettings} disabled={saving}>
              {saving ? "Saving…" : "Save"}
            </button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Publish confirm */}
      <Dialog open={publishConfirmOpen} onOpenChange={setPublishConfirmOpen}>
        <DialogContent className="max-w-sm">
          <DialogHeader><DialogTitle>Publish listing?</DialogTitle></DialogHeader>
          <div className="space-y-3" style={{ fontFamily: "var(--sans)", fontSize: 13, color: "var(--ink-3)" }}>
            <p>Publishing makes this listing <span style={{ fontWeight: 500, color: "var(--ink)" }}>active</span> — it becomes available for new bookings immediately.</p>
            <p>If there is already an active listing for this property, it will be <span style={{ fontWeight: 500, color: "var(--ink)" }}>superseded</span> (archived) and replaced by this version.</p>
            <div className="space-y-2">
              <Label className="text-foreground">Validity period <span className="text-destructive">*</span></Label>
              {isListingLongTerm ? (
                <>
                  <div className="grid grid-cols-2 gap-2">
                    <div className="space-y-1">
                      <p style={{ fontFamily: "var(--mono)", fontSize: 11, color: "var(--ink-4)" }}>Start date</p>
                      <DatePicker value={publishStartDate} onChange={setPublishStartDate} placeholder="Start date" />
                    </div>
                    <div className="space-y-1">
                      <p style={{ fontFamily: "var(--mono)", fontSize: 11, color: "var(--ink-4)" }}>Duration</p>
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
                    <p style={{ fontFamily: "var(--mono)", fontSize: 11, color: "var(--ink-4)" }}>
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
              <p style={{ fontFamily: "var(--mono)", fontSize: 11, color: "var(--ink-4)" }}>Bookings can only be created within this window.</p>
            </div>
          </div>
          <DialogFooter>
            <button className="adm-btn adm-btn--ghost" onClick={() => setPublishConfirmOpen(false)}>Cancel</button>
            <button
              className="adm-btn adm-btn--ink"
              onClick={handlePublish}
              disabled={publishListing.isPending || !publishStartDate || (isListingLongTerm ? !publishDurationMonths : !publishEndDate)}
            >
              {publishListing.isPending ? "Publishing…" : "Publish"}
            </button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* New version confirm */}
      <Dialog open={newVersionConfirmOpen} onOpenChange={setNewVersionConfirmOpen}>
        <DialogContent className="max-w-sm">
          <DialogHeader><DialogTitle>Create new version?</DialogTitle></DialogHeader>
          <div className="space-y-2" style={{ fontFamily: "var(--sans)", fontSize: 13, color: "var(--ink-3)" }}>
            <p>This creates a <span style={{ fontWeight: 500, color: "var(--ink)" }}>draft copy</span> of the current listing that you can freely edit.</p>
            <p>The current listing stays active until you publish the new version. Once published, the new version replaces the old one for future bookings.</p>
            <p>Existing bookings are <span style={{ fontWeight: 500, color: "var(--ink)" }}>not affected</span>.</p>
          </div>
          <DialogFooter>
            <button className="adm-btn adm-btn--ghost" onClick={() => setNewVersionConfirmOpen(false)}>Cancel</button>
            <button className="adm-btn adm-btn--ink" onClick={handleCreateNewVersion} disabled={createNewVersion.isPending}>
              {createNewVersion.isPending ? "Creating…" : "Create draft"}
            </button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Hotfix listing */}
      <Dialog open={hotfixOpen} onOpenChange={setHotfixOpen}>
        <DialogContent className="max-w-sm">
          <DialogHeader><DialogTitle>Apply hotfix</DialogTitle></DialogHeader>
          <p style={{ fontFamily: "var(--sans)", fontSize: 13, color: "var(--ink-3)" }}>
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
            <button className="adm-btn adm-btn--ghost" onClick={() => setHotfixOpen(false)}>Cancel</button>
            <button className="adm-btn adm-btn--ink" onClick={handleHotfix} disabled={hotfixSaving || !hotfixReason.trim()}>
              {hotfixSaving ? "Applying…" : "Apply"}
            </button>
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
            <button className="adm-btn adm-btn--ghost" onClick={() => setAddUtilityOpen(false)}>Cancel</button>
            <button className="adm-btn adm-btn--ink" onClick={handleAddUtility} disabled={createUtility.isPending}>
              {createUtility.isPending ? "Adding…" : "Add"}
            </button>
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
          <p style={{ fontFamily: "var(--sans)", fontSize: 13, color: "var(--ink-3)" }}>
            Remove{" "}
            <span style={{ fontWeight: 600, color: "var(--ink)" }}>
              {landlord?.firstName && landlord?.lastName
                ? `${landlord.firstName} ${landlord.lastName}`
                : landlord?.email ?? "this landlord"}
            </span>{" "}
            from the property? They will lose access. You can re-invite them afterwards.
          </p>
          <DialogFooter>
            <button className="adm-btn adm-btn--ghost" onClick={() => setUnlinkLandlordOpen(false)} disabled={unlinkLandlord.isPending}>
              Cancel
            </button>
            <button
              className="adm-btn adm-btn--danger"
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
            </button>
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
          <p style={{ fontFamily: "var(--sans)", fontSize: 13, color: "var(--ink-3)" }}>
            Are you sure you want to delete{" "}
            <span style={{ fontWeight: 600, color: "var(--ink)" }}>{asset.internalName}</span>?
            This action cannot be undone.
          </p>
          <DialogFooter>
            <button className="adm-btn adm-btn--ghost" onClick={() => setDeleteOpen(false)} disabled={deleteAsset.isPending}>
              Cancel
            </button>
            <button
              className="adm-btn adm-btn--danger"
              onClick={handleDeleteAsset}
              disabled={deleteAsset.isPending}
            >
              {deleteAsset.isPending ? "Deleting…" : "Delete"}
            </button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
