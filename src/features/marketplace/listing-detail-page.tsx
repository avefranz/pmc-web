import { useState } from "react";
import { useParams, Link } from "react-router-dom";
import {
  BedDouble, Bath, Users, LayoutGrid, X,
  ChevronLeft, ChevronRight, Home, Check, Lock,
  Trophy, Zap, Leaf, ShieldCheck, CalendarCheck,
  FileText, RotateCcw, ClipboardList, Tag,
  Ruler, Car, PawPrint, Train, MapPin as MapPinIcon,
  Wifi, Droplets, Trash2, Key, KeySquare, Building2,
  ChevronDown, ChevronUp, AlertCircle, Flame,
} from "lucide-react";
import { amenityIcon } from "@/lib/utils/amenity-icons";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import { useMarketplaceListing, useListingAvailability } from "@/lib/hooks/use-marketplace";
import { formatDate } from "@/lib/utils/format";
import { cn } from "@/lib/utils/cn";
import { AvailabilityTimeline } from "./components/availability-timeline";
import { BookingWidget } from "./components/booking-widget";
import { BookingRequestModal } from "./components/booking-request-modal";
import type { ListingAvailabilityDto } from "@/lib/types/marketplace";

// ─── Gallery modal ────────────────────────────────────────────────────────────

type MediaItem = { id: string; url: string; caption: string | null };

function GalleryModal({ media, startAt, onClose }: {
  media: MediaItem[];
  startAt: number;
  onClose: () => void;
}) {
  const [idx, setIdx] = useState(startAt);
  const prev = () => setIdx((i) => (i - 1 + media.length) % media.length);
  const next = () => setIdx((i) => (i + 1) % media.length);

  return (
    <div className="fixed inset-0 z-[100] bg-black/95 flex flex-col" onClick={onClose}>
      <div className="flex items-center justify-between px-6 py-4 shrink-0" onClick={(e) => e.stopPropagation()}>
        <span className="text-white/70 text-sm">{idx + 1} / {media.length}</span>
        <button onClick={onClose} className="w-9 h-9 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center transition-colors">
          <X size={18} className="text-white" />
        </button>
      </div>
      <div className="flex-1 flex items-center justify-center relative px-16 min-h-0" onClick={(e) => e.stopPropagation()}>
        <button onClick={prev} className="absolute left-4 w-11 h-11 rounded-full bg-white/10 hover:bg-white/25 flex items-center justify-center transition-colors">
          <ChevronLeft size={22} className="text-white" />
        </button>
        <img key={idx} src={media[idx].url} alt={media[idx].caption ?? ""} className="max-h-full max-w-full object-contain rounded-lg" />
        <button onClick={next} className="absolute right-4 w-11 h-11 rounded-full bg-white/10 hover:bg-white/25 flex items-center justify-center transition-colors">
          <ChevronRight size={22} className="text-white" />
        </button>
      </div>
      {media.length > 1 && (
        <div className="flex gap-2 overflow-x-auto px-6 py-4 shrink-0 scrollbar-hide justify-center" onClick={(e) => e.stopPropagation()}>
          {media.map((m, i) => (
            <button key={m.id} onClick={() => setIdx(i)}
              className={cn("shrink-0 w-16 h-12 rounded-lg overflow-hidden border-2 transition-all",
                i === idx ? "border-white opacity-100" : "border-transparent opacity-40 hover:opacity-70")}>
              <img src={m.url} alt="" className="w-full h-full object-cover" />
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

// ─── Photo grid ───────────────────────────────────────────────────────────────

function PhotoGrid({ media }: { media: MediaItem[] }) {
  const [galleryOpen, setGalleryOpen] = useState(false);
  const [galleryStart, setGalleryStart] = useState(0);
  function open(i: number) { setGalleryStart(i); setGalleryOpen(true); }

  if (!media.length) {
    return (
      <div className="h-[480px] bg-bg-subtle rounded-2xl flex items-center justify-center text-fg-subtle">
        <Home size={56} />
      </div>
    );
  }

  const [main, ...rest] = media;

  return (
    <>
      <div className="hidden md:block relative">
        <div className="grid grid-cols-[2fr_1fr_1fr] grid-rows-2 gap-2 rounded-2xl overflow-hidden h-[420px]">
          <button className="row-span-2 overflow-hidden group" onClick={() => open(0)}>
            <img src={main.url} alt={main.caption ?? ""} className="w-full h-full object-cover group-hover:scale-[1.02] transition-transform duration-500" />
          </button>
          {[0, 1, 2, 3].map((i) => {
            const item = rest[i];
            return (
              <button key={i} className="overflow-hidden group relative" onClick={() => item && open(i + 1)} disabled={!item}>
                {item ? (
                  <img src={item.url} alt={item.caption ?? ""} className="w-full h-full object-cover group-hover:scale-[1.02] transition-transform duration-500" />
                ) : (
                  <div className="w-full h-full bg-bg-subtle" />
                )}
                {i === 3 && media.length > 5 && (
                  <div className="absolute inset-0 bg-black/40 flex items-center justify-center">
                    <span className="text-white font-semibold text-sm">+{media.length - 5} more</span>
                  </div>
                )}
              </button>
            );
          })}
        </div>
        <button
          onClick={() => open(0)}
          className="absolute bottom-4 right-4 flex items-center gap-2 bg-white border border-border rounded-xl px-4 py-2.5 text-sm font-semibold text-fg shadow-sm hover:shadow-md transition-shadow"
        >
          <LayoutGrid size={15} />
          {media.length === 1 ? "View photo" : `Show all ${media.length} photos`}
        </button>
      </div>

      <div className="md:hidden relative aspect-[4/3] rounded-2xl overflow-hidden bg-bg-subtle">
        <img src={main.url} alt={main.caption ?? ""} className="w-full h-full object-cover" onClick={() => open(0)} />
        {media.length > 1 && (
          <button onClick={() => open(0)} className="absolute bottom-3 right-3 flex items-center gap-1.5 bg-white/90 backdrop-blur-sm border border-border rounded-full px-3 py-1.5 text-xs font-semibold text-fg shadow-sm">
            <LayoutGrid size={12} />{media.length} photos
          </button>
        )}
      </div>

      {galleryOpen && <GalleryModal media={media} startAt={galleryStart} onClose={() => setGalleryOpen(false)} />}
    </>
  );
}

// ─── AI Highlights ────────────────────────────────────────────────────────────

type Highlight = { icon: React.ReactNode; title: string; body: string };

function generateHighlights(listing: {
  id: string;
  amenities: { name: string; isPresent: boolean }[];
  discountTiers?: { minMonths: number; discountPercent: number }[];
  maxOccupancy?: number;
  bedrooms?: number;
  cityName?: string;
}): Highlight[] {
  const hits: Highlight[] = [];
  const amenityNames = listing.amenities.filter(a => a.isPresent).map(a => a.name.toLowerCase());
  const has = (kw: string) => amenityNames.some(n => n.includes(kw));

  if (has("pool"))
    hits.push({ icon: <Zap size={22} strokeWidth={1.5} />, title: "Dive right in", body: `One of the few rentals in ${listing.cityName ?? "the area"} with a private pool.` });
  if (has("gym") || has("fitness"))
    hits.push({ icon: <Trophy size={22} strokeWidth={1.5} />, title: "Stay fit", body: "On-site gym — no membership needed. Work out on your schedule." });
  const bestTier = listing.discountTiers?.length
    ? [...listing.discountTiers].sort((a, b) => b.discountPercent - a.discountPercent)[0]
    : null;
  if (bestTier && bestTier.discountPercent >= 5)
    hits.push({ icon: <CalendarCheck size={22} strokeWidth={1.5} />, title: "Long-stay perks", body: `Save up to ${bestTier.discountPercent}% when you stay ${bestTier.minMonths}+ months — great for remote workers.` });
  if (has("wifi") || has("desk") || has("work"))
    hits.push({ icon: <ShieldCheck size={22} strokeWidth={1.5} />, title: "Remote-work ready", body: "Fast Wi-Fi and a dedicated workspace — everything you need to work from home." });
  if (has("balcony") || has("terrace") || has("garden"))
    hits.push({ icon: <Leaf size={22} strokeWidth={1.5} />, title: "Indoor-outdoor living", body: "Private outdoor space to unwind — rare in this price range." });
  if (hits.length < 2)
    hits.push({ icon: <ShieldCheck size={22} strokeWidth={1.5} />, title: "Verified property", body: "Reviewed and published by the Siamo team — every ad meets our quality standard." });

  return hits.slice(0, 3);
}

// ─── Check-in method helpers ──────────────────────────────────────────────────

function checkInLabel(method: string): string {
  const map: Record<string, string> = {
    KeyHandover: "Key handover",
    Smartlock: "Smart lock",
    Keybox: "Key box",
    Reception: "Reception / building management",
    Other: "Arranged with host",
  };
  return map[method] ?? method.replace(/([A-Z])/g, " $1").trim();
}

function CheckInIcon({ method }: { method: string }) {
  if (method === "Smartlock") return <KeySquare size={20} strokeWidth={1.5} />;
  if (method === "Keybox")    return <Key size={20} strokeWidth={1.5} />;
  if (method === "Reception") return <Building2 size={20} strokeWidth={1.5} />;
  return <Key size={20} strokeWidth={1.5} />;
}

// ─── Chip parser (reconstruct chip array from saved · string) ─────────────────

function parseDisplayChips(raw: string): { chips: string[]; custom: string } {
  const parts = raw.split(/\s*·\s*/).map((p) => p.trim()).filter(Boolean);
  return { chips: parts, custom: "" };
}

// ─── Cancellation policy box ──────────────────────────────────────────────────

function CancellationBox({ noticeDays, penaltyMonths }: { noticeDays: number; penaltyMonths: number }) {
  const days = noticeDays;
  const graceLabel = days <= 7 ? "1 week" : days <= 14 ? "2 weeks" : days <= 31 ? "1 month" : `${days} days`;

  return (
    <div className="rounded-2xl border border-border overflow-hidden">
      {/* Grace period */}
      <div className="p-4 border-b border-border bg-emerald-50/50">
        <div className="flex items-start gap-3">
          <div className="w-8 h-8 rounded-xl bg-emerald-100 flex items-center justify-center shrink-0 mt-0.5">
            <Check size={15} className="text-emerald-600" strokeWidth={2.5} />
          </div>
          <div>
            <p className="text-sm font-semibold text-fg">Grace period — {graceLabel}</p>
            <p className="text-xs text-fg-muted mt-0.5 leading-relaxed">
              Changed your mind? Leave within <strong className="text-fg">{days} days</strong> of move-in and get your full deposit back. You only pay for the days you actually stayed.
            </p>
          </div>
        </div>
      </div>
      {/* After grace */}
      <div className="p-4 bg-amber-50/40">
        <div className="flex items-start gap-3">
          <div className="w-8 h-8 rounded-xl bg-amber-100 flex items-center justify-center shrink-0 mt-0.5">
            <Lock size={15} className="text-amber-700" strokeWidth={2} />
          </div>
          <div>
            <p className="text-sm font-semibold text-fg">Early exit after grace period</p>
            <p className="text-xs text-fg-muted mt-0.5 leading-relaxed">
              Leaving after {days} days means <strong className="text-fg">the deposit is kept</strong> by the landlord. Days already paid for are deducted from your first month pro-rata.
            </p>
          </div>
        </div>
      </div>
      {/* Always */}
      <div className="px-4 py-3 bg-bg-subtle border-t border-border">
        <p className="text-xs text-fg-muted">
          <AlertCircle size={11} className="inline mr-1 -mt-0.5 text-fg-muted" />
          In all cases you pay for every day you stayed — deposits are never used to cover rent.
        </p>
      </div>
    </div>
  );
}

// ─── Section wrapper ──────────────────────────────────────────────────────────

function Section({ title, children, className }: { title: string; children: React.ReactNode; className?: string }) {
  return (
    <div className={cn("pb-8 border-b border-border", className)}>
      <h2 className="text-lg font-bold text-fg mb-4">{title}</h2>
      {children}
    </div>
  );
}

// ─── Property map (uses actual fuzzy coordinates from listing) ───────────────

function PropertyMap({ lat, lon, cityName }: { lat: number; lon: number; cityName?: string }) {
  // d = half-side of the bbox in degrees:
  //   0.008 ≈ ~900 m  → neighbourhood view (shows a few streets around the pin)
  const d = 0.008;
  const bbox = `${lon - d},${lat - d},${lon + d},${lat + d}`;
  return (
    <iframe
      title={`Location in ${cityName ?? "Thailand"}`}
      src={`https://www.openstreetmap.org/export/embed.html?bbox=${bbox}&layer=mapnik&marker=${lat},${lon}`}
      className="w-full h-full border-0"
      loading="lazy"
    />
  );
}

// ─── Fallback booking panel ───────────────────────────────────────────────────

function BookingPanelFallback({
  listing,
  onRequestBook,
}: {
  listing: { id: string; monthlyRate?: number; baseMonthlyRate?: number | null };
  onRequestBook: (moveIn: string, months: number) => void;
}) {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const todayStr = today.toISOString().slice(0, 10);

  const fallbackAvailability: ListingAvailabilityDto = {
    availableFrom: todayStr,
    availableUntil: null,
    availableTo: null,
    minMonths: 1,
    maxMonths: 12,
    occupiedRanges: [],
    nextAvailableDate: todayStr,
  };

  return (
    <BookingWidget
      listing={{ id: listing.id, monthlyRate: listing.monthlyRate || listing.baseMonthlyRate || 0, discountTiers: [] }}
      availability={fallbackAvailability}
      onRequestBook={onRequestBook}
    />
  );
}

// ─── Main page ────────────────────────────────────────────────────────────────

export function ListingDetailPage() {
  const { id } = useParams<{ id: string }>();
  const { data: listing, isLoading } = useMarketplaceListing(id!);
  const { data: availability } = useListingAvailability(id!, !!id);
  const [bookingModal, setBookingModal] = useState<{ moveIn: string; months: number } | null>(null);
  const [rulesExpanded, setRulesExpanded] = useState(false);

  const monthlyRate = listing?.monthlyRate || listing?.baseMonthlyRate || 0;
  const discountTiers = listing?.discountTiers ?? [];

  if (isLoading) {
    return (
      <div className="max-w-[1200px] mx-auto px-4 md:px-10 py-8">
        <Skeleton className="h-5 w-40 mb-5" />
        <Skeleton className="h-10 w-2/3 mb-2" />
        <Skeleton className="h-4 w-1/3 mb-6" />
        <div className="hidden md:grid grid-cols-[2fr_1fr_1fr] grid-rows-2 gap-2 rounded-2xl overflow-hidden h-[420px] mb-10">
          <Skeleton className="row-span-2 rounded-none" />
          <Skeleton className="rounded-none" /><Skeleton className="rounded-none" />
          <Skeleton className="rounded-none" /><Skeleton className="rounded-none" />
        </div>
        <Skeleton className="md:hidden aspect-[4/3] rounded-2xl mb-10" />
        <div className="grid grid-cols-1 lg:grid-cols-[1fr_380px] gap-16">
          <div className="space-y-4">
            <Skeleton className="h-6 w-1/2" /><Skeleton className="h-4 w-full" />
            <Skeleton className="h-4 w-full" /><Skeleton className="h-4 w-3/4" />
          </div>
          <Skeleton className="h-80 rounded-2xl" />
        </div>
      </div>
    );
  }

  if (!listing) {
    return (
      <div className="flex flex-col items-center justify-center py-32 text-center">
        <p className="text-2xl font-bold text-fg mb-2">Ad not found</p>
        <p className="text-sm text-fg-muted mb-6">This rental ad may have been removed or is no longer available.</p>
        <Button asChild variant="outline" className="rounded-full px-6"><Link to="/listings">Browse all ads</Link></Button>
      </div>
    );
  }

  const presentAmenities = listing.amenities.filter((a) => a.isPresent);
  const CATEGORY_LABEL: Record<number, string> = { 1: "Apartment", 2: "House", 3: "Villa", 4: "Studio", 5: "Townhouse", 6: "Home" };
  const typeLabel = listing.bedrooms === 0 ? "Studio" : (CATEGORY_LABEL[listing.propertyCategoryId] ?? "Home");
  const buildingLabel = listing.buildingType === "Highrise" ? "Apartment" : listing.buildingType === "Lowrise" ? "Condo" : listing.buildingType === "Landed" ? "House / Villa" : listing.buildingType ?? typeLabel;

  function handleRequestBook(moveIn: string, months: number) { setBookingModal({ moveIn, months }); }

  const bookingPanel = availability ? (
    <BookingWidget listing={{ id: listing.id, monthlyRate, discountTiers }} availability={availability} onRequestBook={handleRequestBook} />
  ) : (
    <BookingPanelFallback listing={listing} onRequestBook={handleRequestBook} />
  );

  // ── Utilities
  const utilsIncluded = [
    listing.utilityElectricity && { label: "Electricity", icon: <Flame size={14} /> },
    listing.utilityWater      && { label: "Water",        icon: <Droplets size={14} /> },
    listing.utilityInternet   && { label: "Internet",     icon: <Wifi size={14} /> },
    listing.utilityGarbage    && { label: "Garbage",      icon: <Trash2 size={14} /> },
  ].filter(Boolean) as { label: string; icon: React.ReactNode }[];

  const utilsExcluded = [
    !listing.utilityElectricity && "Electricity",
    !listing.utilityWater       && "Water",
    !listing.utilityInternet    && "Internet",
    !listing.utilityGarbage     && "Garbage",
  ].filter(Boolean) as string[];

  // Backend always returns utility booleans now — always show the section
  const anyUtilityDefined = true;

  // ── House rules
  const rawRules = listing.houseRules ?? "";
  const ruleLines = rawRules.split(/\n|·/).map((r) => r.trim()).filter(Boolean);
  const rulesPreview = ruleLines.slice(0, 4);
  const hasMoreRules = ruleLines.length > 4;

  // ── Transport & nearby chips
  const transportChips = listing.transportInfo ? parseDisplayChips(listing.transportInfo).chips : [];
  const nearbyChips    = listing.nearbyPlaces  ? parseDisplayChips(listing.nearbyPlaces).chips  : [];

  // ── Safety
  const safetyItems = [
    listing.hasSmokeDetector    && { label: "Smoke detector",         warn: false },
    listing.hasCODetector       && { label: "CO detector",            warn: false },
    listing.hasFireExtinguisher && { label: "Fire extinguisher",      warn: false },
    listing.hasFirstAidKit      && { label: "First aid kit",          warn: false },
    listing.hasSecurityCamera   && { label: "Security cameras on premises", warn: true },
  ].filter(Boolean) as { label: string; warn: boolean }[];

  return (
    <div className="max-w-[1200px] mx-auto px-4 md:px-10 py-8">

      {/* ── Title ── */}
      <div className="mb-6">
        <h1 className="text-2xl md:text-[28px] font-bold text-fg leading-snug mb-2">
          {listing.title}
          <span className={cn(
            "group/badge inline-flex align-middle items-center justify-center ml-3",
            "rounded-full cursor-default select-none overflow-hidden bg-brand",
            "shadow-[0_2px_8px_-1px_rgba(0,0,0,0.20)] hover:shadow-[0_3px_14px_-2px_rgba(0,0,0,0.28)]",
            "h-[22px] w-[22px] hover:w-[138px] hover:justify-start hover:pl-[7px] hover:pr-[11px]",
            "transition-[width,padding,box-shadow] duration-300 ease-out",
          )}>
            <Check size={11} strokeWidth={2.8} className="shrink-0 text-white" />
            <span className="ml-[7px] flex items-center gap-1 opacity-0 group-hover/badge:opacity-100 transition-opacity duration-200 delay-100">
              <span className="whitespace-nowrap text-[10px] font-medium text-white/75 leading-none">Verified by</span>
              <span className="whitespace-nowrap text-[11px] font-black text-white leading-none tracking-[0.04em]">Siamo</span>
            </span>
          </span>
        </h1>
        {listing.cityName && (
          <p className="text-sm text-fg-muted">
            <span className="text-fg font-medium underline underline-offset-2">{listing.cityName}</span>
            <span>, Thailand</span>
          </p>
        )}
      </div>

      {/* ── Photos ── */}
      <div className="mb-10"><PhotoGrid media={listing.media} /></div>

      {/* ── Two-column ── */}
      <div className="grid grid-cols-1 lg:grid-cols-[1fr_380px] gap-16 items-start">

        {/* LEFT */}
        <div className="space-y-8">

          {/* 1. Property type & quick specs */}
          <div className="pb-8 border-b border-border">
            <h2 className="text-xl font-bold text-fg mb-1">
              {buildingLabel}{listing.cityName ? ` in ${listing.cityName}, Thailand` : " in Thailand"}
            </h2>
            <div className="flex items-center flex-wrap gap-x-4 gap-y-1 text-sm text-fg-muted mt-1.5">
              {!!listing.maxOccupancy && <span className="flex items-center gap-1.5"><Users size={14} />{listing.maxOccupancy} guest{listing.maxOccupancy !== 1 ? "s" : ""}</span>}
              {!!listing.bedrooms    && <span className="flex items-center gap-1.5"><BedDouble size={14} />{listing.bedrooms} bedroom{listing.bedrooms !== 1 ? "s" : ""}</span>}
              {!!listing.bathrooms   && <span className="flex items-center gap-1.5"><Bath size={14} />{listing.bathrooms} bath{listing.bathrooms !== 1 ? "s" : ""}</span>}
              {listing.areaSqm       && <span className="flex items-center gap-1.5"><Ruler size={14} />{listing.areaSqm} m²</span>}
              {listing.furnished     && <span>{listing.furnished === "Fully" ? "Fully furnished" : listing.furnished === "Semi" ? "Semi-furnished" : "Unfurnished"}</span>}
              {listing.floor != null && <span className="flex items-center gap-1.5"><Building2 size={14} />Floor {listing.floor}{listing.totalFloors ? `/${listing.totalFloors}` : ""}</span>}
              {(listing.parkingSpaces && listing.parkingSpaces > 0) ? <span className="flex items-center gap-1.5"><Car size={14} />{listing.parkingSpaces} parking{listing.parkingIncluded ? " (incl.)" : ""}</span> : null}
            </div>
          </div>

          {/* 2. Quick info strip — check-in · utilities · wifi · pets · safety */}
          {(() => {
            const quickRows: { icon: React.ReactNode; label: string; value: string; accent?: string }[] = [];

            if (listing.checkInMethod)
              quickRows.push({ icon: <CheckInIcon method={listing.checkInMethod} />, label: "Check-in", value: checkInLabel(listing.checkInMethod) });

            if (listing.wifiName)
              quickRows.push({ icon: <Wifi size={16} strokeWidth={1.5} className="text-brand" />, label: "WiFi", value: listing.wifiName });

            const inclList = utilsIncluded.map((u) => u.label);
            if (inclList.length > 0)
              quickRows.push({ icon: <Check size={16} strokeWidth={2.5} className="text-emerald-500" />, label: "Included in rent", value: inclList.join(", "), accent: "emerald" });
            else
              quickRows.push({ icon: <AlertCircle size={16} className="text-fg-muted" />, label: "Included in rent", value: "None — tenant pays utilities separately" });

            if (utilsExcluded.length > 0 && inclList.length > 0)
              quickRows.push({ icon: <AlertCircle size={16} className="text-fg-muted" />, label: "Paid by tenant", value: utilsExcluded.join(", ") });

            if (listing.petsAllowed !== undefined)
              quickRows.push({
                icon: <PawPrint size={16} className={listing.petsAllowed ? "text-amber-500" : "text-fg-muted"} />,
                label: "Pets",
                value: listing.petsAllowed ? `Welcome${listing.petDeposit ? ` · ฿${listing.petDeposit.toLocaleString()} deposit` : ""}` : "Not allowed",
              });

            safetyItems.forEach(({ label, warn }) =>
              quickRows.push({ icon: <ShieldCheck size={16} className={warn ? "text-amber-500" : "text-emerald-500"} />, label: warn ? "Notice" : "Safety", value: label })
            );

            if (quickRows.length === 0) return null;
            return (
              <div className="pb-8 border-b border-border">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-8 gap-y-3.5">
                  {quickRows.map((row, i) => (
                    <div key={i} className="flex items-center gap-3">
                      <span className="shrink-0 text-fg-muted w-4 flex items-center justify-center">{row.icon}</span>
                      <span className="text-sm text-fg-muted min-w-[90px] shrink-0">{row.label}</span>
                      <span className="text-sm font-medium text-fg truncate">{row.value}</span>
                    </div>
                  ))}
                </div>
              </div>
            );
          })()}

          {/* 3. Highlights */}
          {(() => {
            const highlights = generateHighlights({ id: listing.id, amenities: listing.amenities, discountTiers: listing.discountTiers, maxOccupancy: listing.maxOccupancy, bedrooms: listing.bedrooms, cityName: listing.cityName });
            return (
              <div className="pb-8 border-b border-border space-y-6">
                {highlights.map((h, i) => (
                  <div key={i} className="flex items-start gap-4">
                    <div className="text-fg mt-0.5 shrink-0">{h.icon}</div>
                    <div>
                      <p className="text-[14px] font-semibold text-fg leading-snug">{h.title}</p>
                      <p className="text-[13px] text-fg-muted mt-0.5 leading-relaxed">{h.body}</p>
                    </div>
                  </div>
                ))}
              </div>
            );
          })()}

          {/* 4. Description */}
          {listing.description && (
            <Section title="About this place">
              <p className="text-sm text-fg-muted leading-relaxed whitespace-pre-line">{listing.description}</p>
            </Section>
          )}

          {/* 5. Amenities — what this place offers */}
          {presentAmenities.length > 0 && (
            <Section title="What this place offers">
              <div className="grid grid-cols-2 gap-x-8 gap-y-4">
                {presentAmenities.map((a) => {
                  const Icon = amenityIcon(a.name);
                  return (
                    <div key={a.amenityId} className="flex items-center gap-3 text-sm text-fg">
                      <div className="w-6 h-6 shrink-0 flex items-center justify-center text-fg">
                        {Icon ? <Icon size={20} strokeWidth={1.5} /> : <Check size={16} strokeWidth={2} className="text-fg-muted" />}
                      </div>
                      {a.name}
                    </div>
                  );
                })}
              </div>
            </Section>
          )}

          {/* 8. Where you'll be — map + transport chips */}
          <Section title="Where you'll be">
            {/* Map — uses actual fuzzy coordinates from the listing */}
            <div className="rounded-2xl overflow-hidden border border-border mb-1" style={{ height: 300 }}>
              <PropertyMap lat={listing.fuzzyLatitude} lon={listing.fuzzyLongitude} cityName={listing.cityName} />
            </div>
            <p className="text-xs text-fg-muted mb-4 flex items-center gap-1">
              <MapPinIcon size={11} className="shrink-0" />
              {listing.cityName && <><span className="font-medium text-fg">{listing.cityName}</span>, </>}
              Thailand · Approximate location — exact address shared after booking
            </p>

            {/* Transport & nearby chips below the map */}
            {(transportChips.length > 0 || nearbyChips.length > 0) && (
              <div className="space-y-4">
                {transportChips.length > 0 && (
                  <div>
                    <p className="text-xs font-semibold text-fg-muted uppercase tracking-wide mb-2 flex items-center gap-1.5">
                      <Train size={13} />Getting around
                    </p>
                    <div className="flex flex-wrap gap-2">
                      {transportChips.map((chip) => (
                        <span key={chip} className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-blue-50 text-blue-700 border border-blue-100 text-xs font-medium">
                          🚇 {chip}
                        </span>
                      ))}
                    </div>
                  </div>
                )}
                {nearbyChips.length > 0 && (
                  <div>
                    <p className="text-xs font-semibold text-fg-muted uppercase tracking-wide mb-2 flex items-center gap-1.5">
                      <MapPinIcon size={13} />Nearby
                    </p>
                    <div className="flex flex-wrap gap-2">
                      {nearbyChips.map((chip) => (
                        <span key={chip} className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-violet-50 text-violet-700 border border-violet-100 text-xs font-medium">
                          📍 {chip}
                        </span>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}
          </Section>

          {/* 9. House rules */}
          {ruleLines.length > 0 && (
            <Section title="House rules">
              <div className="space-y-2.5">
                {(rulesExpanded ? ruleLines : rulesPreview).map((rule, i) => (
                  <div key={i} className="flex items-start gap-3">
                    <div className="w-5 h-5 rounded-full bg-fg-subtle/10 flex items-center justify-center shrink-0 mt-0.5">
                      <Check size={11} strokeWidth={2.5} className="text-fg-muted" />
                    </div>
                    <p className="text-sm text-fg-muted leading-snug">{rule}</p>
                  </div>
                ))}
              </div>
              {hasMoreRules && (
                <button
                  onClick={() => setRulesExpanded((v) => !v)}
                  className="mt-3 flex items-center gap-1.5 text-sm font-semibold text-fg hover:underline"
                >
                  {rulesExpanded ? <><ChevronUp size={16} />Show less</> : <><ChevronDown size={16} />Show all {ruleLines.length} rules</>}
                </button>
              )}
            </Section>
          )}

          {/* 9. Cancellation policy */}
          {listing.cancellationNoticeDays != null && listing.cancellationNoticeDays > 0 && (
            <Section title="Cancellation policy">
              <CancellationBox
                noticeDays={listing.cancellationNoticeDays}
                penaltyMonths={listing.cancellationPenaltyMonths ?? 1}
              />
            </Section>
          )}

          {/* 10. Availability */}
          <Section title="Availability">
            {availability ? (
              <AvailabilityTimeline availability={availability} />
            ) : listing.startDate ? (
              <p className="text-sm text-fg-muted">
                Available from <strong className="text-fg">{formatDate(listing.startDate)}</strong>
                {listing.endDate && <> until <strong className="text-fg">{formatDate(listing.endDate)}</strong></>}
              </p>
            ) : (
              <p className="text-sm text-fg-muted">Contact the manager for availability details.</p>
            )}
          </Section>

          {/* 12. What Siamo provides */}
          <Section title="What Siamo provides">
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              {([
                { icon: <FileText size={20} strokeWidth={1.5} />, iconClass: "bg-blue-50 text-blue-600", title: "Rental contract", sub: "EN & TH bilingual" },
                { icon: <Lock size={20} strokeWidth={1.5} />, iconClass: "bg-emerald-50 text-emerald-600", title: "Deposit protected", sub: "Held by Siamo" },
                { icon: <ClipboardList size={20} strokeWidth={1.5} />, iconClass: "bg-amber-50 text-amber-600", title: "TM30 filing", sub: "Handled for you" },
                { icon: <ShieldCheck size={20} strokeWidth={1.5} />, iconClass: "bg-violet-50 text-violet-600", title: "Real support", sub: "Start to move-out" },
              ] as const).map(({ icon, iconClass, title, sub }) => (
                <div key={title} className="flex flex-col items-center text-center gap-2 p-4 rounded-2xl border border-border bg-bg-card hover:shadow-sm transition-shadow">
                  <div className={cn("w-10 h-10 rounded-xl flex items-center justify-center shrink-0", iconClass)}>{icon}</div>
                  <div>
                    <p className="text-xs font-semibold text-fg leading-snug">{title}</p>
                    <p className="text-[11px] text-fg-muted mt-0.5">{sub}</p>
                  </div>
                </div>
              ))}
            </div>
          </Section>

          {/* Mobile booking */}
          <div className="lg:hidden">{bookingPanel}</div>
        </div>

        {/* RIGHT: sticky booking */}
        <div className="hidden lg:block lg:sticky lg:top-28 space-y-3">
          <div className="flex items-center gap-3 rounded-2xl border border-emerald-100 bg-white px-4 py-3.5 shadow-sm">
            <div className="w-9 h-9 rounded-xl bg-emerald-50 flex items-center justify-center shrink-0">
              <Tag size={16} strokeWidth={1.75} className="text-emerald-600" />
            </div>
            <div>
              <p className="text-[13px] font-semibold text-fg leading-snug">Prices include all fees</p>
              <p className="text-[11px] text-fg-muted mt-0.5 leading-snug">No hidden charges — what you see is what you pay</p>
            </div>
          </div>
          {bookingPanel}
          <p className="text-[12px] text-center text-fg-muted px-2">
            <RotateCcw size={11} className="inline mr-1 -mt-0.5" />
            Free cancellation before signing the contract
          </p>
        </div>
      </div>

      {/* ── Things to know ── */}
      <div className="mt-10">
        <h2 className="text-xl font-bold text-fg mb-6">Things to know</h2>
        <div className="border border-border rounded-2xl overflow-hidden">
          <div className="grid grid-cols-1 md:grid-cols-3 divide-y md:divide-y-0 md:divide-x divide-border">
            <div className="p-6">
              <RotateCcw size={20} strokeWidth={1.5} className="text-fg mb-4" />
              <h3 className="font-semibold text-fg mb-3">Cancellation</h3>
              <div className="text-sm text-fg-muted space-y-2">
                {listing.cancellationNoticeDays != null && listing.cancellationNoticeDays > 0 ? (
                  <>
                    <p>Grace period: <strong className="text-fg">{listing.cancellationNoticeDays} days</strong></p>
                    <p>Leave within grace → deposit returned in full.</p>
                    <p>Leave after grace → deposit kept by landlord.</p>
                  </>
                ) : (
                  <>
                    <p>Free cancellation before the rental contract is signed.</p>
                    <p>After signing, terms are defined in the agreement.</p>
                  </>
                )}
              </div>
            </div>
            <div className="p-6">
              <FileText size={20} strokeWidth={1.5} className="text-fg mb-4" />
              <h3 className="font-semibold text-fg mb-3">Rental terms</h3>
              <div className="text-sm text-fg-muted space-y-2">
                <p>Min stay: {availability?.minMonths ?? 1} month{(availability?.minMonths ?? 1) !== 1 ? "s" : ""}</p>
                <p>Max stay: {availability?.maxMonths ?? 12} months</p>
                <p>Deposit held securely by Siamo.</p>
                <p>Contract in English &amp; Thai.</p>
              </div>
            </div>
            <div className="p-6">
              <Home size={20} strokeWidth={1.5} className="text-fg mb-4" />
              <h3 className="font-semibold text-fg mb-3">House rules</h3>
              <div className="text-sm text-fg-muted space-y-2">
                {ruleLines.length > 0
                  ? ruleLines.slice(0, 4).map((r, i) => <p key={i}>{r}</p>)
                  : (<><p>No smoking inside the property.</p><p>Quiet hours 22:00 – 08:00.</p><p>Coordinate check-in with the manager.</p></>)}
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="pb-16" />

      {bookingModal && (
        <BookingRequestModal
          listingId={listing.id}
          listingTitle={listing.title}
          moveInDate={bookingModal.moveIn}
          durationMonths={bookingModal.months}
          monthlyRate={monthlyRate}
          discountTiers={discountTiers}
          onClose={() => setBookingModal(null)}
        />
      )}
    </div>
  );
}
