import { useState } from "react";
import { useParams, Link } from "react-router-dom";
import {
  BedDouble, Bath, Users, LayoutGrid, X,
  ChevronLeft, ChevronRight, Home, Check, Lock,
  Trophy, Zap, Leaf, ShieldCheck, CalendarCheck,
  FileText, RotateCcw, ClipboardList, Tag,
  Ruler, Car, PawPrint, Train, MapPin as MapPinIcon,
  Key, KeySquare, Building2,
  ChevronDown, ChevronUp, AlertCircle,
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
    hits.push({ icon: <Zap size={20} strokeWidth={1.5} />, title: "Dive right in", body: `One of the few rentals in ${listing.cityName ?? "the area"} with a private pool.` });
  if (has("gym") || has("fitness"))
    hits.push({ icon: <Trophy size={20} strokeWidth={1.5} />, title: "Stay fit", body: "On-site gym — no membership needed. Work out on your schedule." });
  const bestTier = listing.discountTiers?.length
    ? [...listing.discountTiers].sort((a, b) => b.discountPercent - a.discountPercent)[0]
    : null;
  if (bestTier && bestTier.discountPercent >= 5)
    hits.push({ icon: <CalendarCheck size={20} strokeWidth={1.5} />, title: "Long-stay perks", body: `Save up to ${bestTier.discountPercent}% when you stay ${bestTier.minMonths}+ months — great for remote workers.` });
  if (has("wifi") || has("desk") || has("work"))
    hits.push({ icon: <ShieldCheck size={20} strokeWidth={1.5} />, title: "Remote-work ready", body: "Fast Wi-Fi and a dedicated workspace — everything you need to work from home." });
  if (has("balcony") || has("terrace") || has("garden"))
    hits.push({ icon: <Leaf size={20} strokeWidth={1.5} />, title: "Indoor-outdoor living", body: "Private outdoor space to unwind — rare in this price range." });
  if (hits.length < 2)
    hits.push({ icon: <ShieldCheck size={20} strokeWidth={1.5} />, title: "Verified property", body: "Reviewed and published by the Siamo team — every ad meets our quality standard." });

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
  if (method === "Smartlock") return <KeySquare size={13} strokeWidth={2} />;
  if (method === "Keybox")    return <Key size={13} strokeWidth={2} />;
  if (method === "Reception") return <Building2 size={13} strokeWidth={2} />;
  return <Key size={13} strokeWidth={2} />;
}

// ─── Chip parser ──────────────────────────────────────────────────────────────

function parseDisplayChips(raw: string): string[] {
  return raw.split(/\s*·\s*/).map((p) => p.trim()).filter(Boolean);
}

// ─── Section wrapper ──────────────────────────────────────────────────────────

function Section({ title, sub, children, className }: {
  title: string;
  sub?: string;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div className={cn("pb-8 border-b border-border", className)}>
      <div className="mb-4">
        <p className="text-[11px] font-bold text-fg-muted uppercase tracking-[0.1em]">{title}</p>
        {sub && <h2 className="text-[20px] font-semibold text-fg mt-0.5 tracking-tight leading-snug">{sub}</h2>}
      </div>
      {children}
    </div>
  );
}

// ─── Property map ─────────────────────────────────────────────────────────────

function PropertyMap({ lat, lon, cityName }: { lat: number; lon: number; cityName?: string }) {
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
    listing.utilityElectricity && { label: "Electricity" },
    listing.utilityWater      && { label: "Water" },
    listing.utilityInternet   && { label: "Internet" },
    listing.utilityGarbage    && { label: "Garbage" },
  ].filter(Boolean) as { label: string }[];

  const utilsExcluded = [
    !listing.utilityElectricity && "Electricity",
    !listing.utilityWater       && "Water",
    !listing.utilityInternet    && "Internet",
    !listing.utilityGarbage     && "Garbage",
  ].filter(Boolean) as string[];

  // ── House rules
  const rawRules = listing.houseRules ?? "";
  const ruleLines = rawRules.split(/\n|·/).map((r) => r.trim()).filter(Boolean);
  const RULES_PREVIEW = 6; // 3 per column = 6 visible
  const rulesPreview = ruleLines.slice(0, RULES_PREVIEW);
  const hasMoreRules = ruleLines.length > RULES_PREVIEW;

  // ── Transport & nearby chips
  const transportChips = listing.transportInfo ? parseDisplayChips(listing.transportInfo) : [];
  const nearbyChips    = listing.nearbyPlaces  ? parseDisplayChips(listing.nearbyPlaces)  : [];

  // ── Safety
  const safetyOk   = [
    listing.hasSmokeDetector    && "Smoke detector",
    listing.hasCODetector       && "CO detector",
    listing.hasFireExtinguisher && "Fire extinguisher",
    listing.hasFirstAidKit      && "First aid kit",
  ].filter(Boolean) as string[];
  const hasCamera = listing.hasSecurityCamera;

  // ── Cancellation grace label
  const noticeDays = listing.cancellationNoticeDays ?? 0;
  const graceLabel = noticeDays <= 7 ? "First 7 days" : noticeDays <= 14 ? "First 2 weeks" : noticeDays <= 31 ? "First month" : `First ${noticeDays} days`;

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

          {/* 1. Property type & specs */}
          <div className="pb-8 border-b border-border">
            <h2 className="text-xl font-semibold text-fg tracking-tight mb-2">
              {buildingLabel}{listing.cityName ? ` in ${listing.cityName}, Thailand` : " in Thailand"}
            </h2>
            <div className="flex items-center flex-wrap gap-x-5 gap-y-1 text-[14.5px] text-fg">
              {!!listing.maxOccupancy && (
                <span className="flex items-center gap-2">
                  <Users size={15} className="text-fg-muted" />
                  <span><span className="text-fg-muted">Up to </span>{listing.maxOccupancy} guests</span>
                </span>
              )}
              {!!listing.bedrooms && (
                <span className="flex items-center gap-2 font-medium">
                  <BedDouble size={15} className="text-fg-muted" />
                  {listing.bedrooms} bedroom{listing.bedrooms !== 1 ? "s" : ""}
                </span>
              )}
              {!!listing.bathrooms && (
                <span className="flex items-center gap-2 font-medium">
                  <Bath size={15} className="text-fg-muted" />
                  {listing.bathrooms} bath{listing.bathrooms !== 1 ? "s" : ""}
                </span>
              )}
              {listing.areaSqm && (
                <span className="flex items-center gap-2 font-medium">
                  <Ruler size={15} className="text-fg-muted" />
                  {listing.areaSqm} m²
                </span>
              )}
              {listing.furnished && (
                <span className="font-medium">
                  {listing.furnished === "Fully" ? "Fully furnished" : listing.furnished === "Semi" ? "Semi-furnished" : "Unfurnished"}
                </span>
              )}
              {listing.floor != null && (
                <span className="flex items-center gap-2 font-medium">
                  <Building2 size={15} className="text-fg-muted" />
                  Floor {listing.floor}{listing.totalFloors ? `/${listing.totalFloors}` : ""}
                </span>
              )}
              {(listing.parkingSpaces && listing.parkingSpaces > 0) ? (
                <span className="flex items-center gap-2 font-medium">
                  <Car size={15} className="text-fg-muted" />
                  {listing.parkingSpaces} parking{listing.parkingIncluded ? " (incl.)" : ""}
                </span>
              ) : null}
            </div>
          </div>

          {/* 2. Key facts */}
          <div className="pb-8 border-b border-border">
            <div className="mb-4">
              <p className="text-[11px] font-bold text-fg-muted uppercase tracking-[0.1em]">Key facts</p>
              <h2 className="text-[20px] font-semibold text-fg mt-0.5 tracking-tight">Practical things you'll want to know</h2>
            </div>
            <div className="flex flex-col divide-y divide-border">
              {/* Check-in */}
              {listing.checkInMethod && (
                <div className="grid grid-cols-[28px_110px_1fr] items-center gap-3 py-3">
                  <div className="w-7 h-7 rounded-lg bg-bg-subtle border border-border flex items-center justify-center shrink-0">
                    <CheckInIcon method={listing.checkInMethod} />
                  </div>
                  <span className="text-[11.5px] font-bold text-fg-muted uppercase tracking-[0.06em]">Check-in</span>
                  <span className="text-sm font-medium text-fg">{checkInLabel(listing.checkInMethod)}</span>
                </div>
              )}
              {/* Utilities included */}
              <div className="grid grid-cols-[28px_110px_1fr] items-center gap-3 py-3">
                <div className="w-7 h-7 rounded-lg bg-bg-subtle border border-border flex items-center justify-center shrink-0">
                  <Check size={13} strokeWidth={2.5} className="text-emerald-500" />
                </div>
                <span className="text-[11.5px] font-bold text-fg-muted uppercase tracking-[0.06em]">Included</span>
                <div className="flex flex-wrap gap-1.5">
                  {utilsIncluded.length > 0
                    ? utilsIncluded.map(u => (
                        <span key={u.label} className="inline-flex items-center px-2.5 py-1 rounded-full bg-emerald-50 text-emerald-800 border border-emerald-100 text-[12.5px] font-semibold">
                          {u.label}
                        </span>
                      ))
                    : <span className="text-sm text-fg-muted">None — tenant pays all utilities separately</span>
                  }
                </div>
              </div>
              {/* Tenant pays — only if mixed */}
              {utilsExcluded.length > 0 && utilsIncluded.length > 0 && (
                <div className="grid grid-cols-[28px_110px_1fr] items-center gap-3 py-3">
                  <div className="w-7 h-7 rounded-lg bg-bg-subtle border border-border flex items-center justify-center shrink-0">
                    <AlertCircle size={13} className="text-fg-muted" />
                  </div>
                  <span className="text-[11.5px] font-bold text-fg-muted uppercase tracking-[0.06em]">Tenant pays</span>
                  <span className="text-sm text-fg-muted">{utilsExcluded.join(", ")}</span>
                </div>
              )}
              {/* Pets */}
              {listing.petsAllowed !== undefined && (
                <div className="grid grid-cols-[28px_110px_1fr] items-center gap-3 py-3">
                  <div className="w-7 h-7 rounded-lg bg-bg-subtle border border-border flex items-center justify-center shrink-0">
                    <PawPrint size={13} strokeWidth={1.8} className={listing.petsAllowed ? "text-amber-500" : "text-fg-muted"} />
                  </div>
                  <span className="text-[11.5px] font-bold text-fg-muted uppercase tracking-[0.06em]">Pets</span>
                  <span className="text-sm font-medium text-fg">
                    {listing.petsAllowed
                      ? `Welcome${listing.petDeposit ? ` · ฿${listing.petDeposit.toLocaleString()} deposit` : ""}`
                      : "Not allowed"}
                  </span>
                </div>
              )}
              {/* Safety */}
              {safetyOk.length > 0 && (
                <div className="grid grid-cols-[28px_110px_1fr] items-center gap-3 py-3">
                  <div className="w-7 h-7 rounded-lg bg-bg-subtle border border-border flex items-center justify-center shrink-0">
                    <ShieldCheck size={13} className="text-emerald-500" />
                  </div>
                  <span className="text-[11.5px] font-bold text-fg-muted uppercase tracking-[0.06em]">Safety</span>
                  <div className="flex flex-wrap gap-1.5">
                    {safetyOk.map(label => (
                      <span key={label} className="inline-flex items-center px-2.5 py-1 rounded-full bg-emerald-50 text-emerald-800 border border-emerald-100 text-[12.5px] font-semibold">
                        {label}
                      </span>
                    ))}
                  </div>
                </div>
              )}
              {/* Security camera notice */}
              {hasCamera && (
                <div className="grid grid-cols-[28px_110px_1fr] items-center gap-3 py-3 mt-1 px-3 rounded-xl bg-amber-50/60 border border-amber-100 !border-t-0 !divide-y-0">
                  <div className="w-7 h-7 rounded-lg bg-white border border-amber-100 flex items-center justify-center shrink-0">
                    <AlertCircle size={13} className="text-amber-500" />
                  </div>
                  <span className="text-[11.5px] font-bold text-amber-700 uppercase tracking-[0.06em]">Notice</span>
                  <span className="text-sm text-fg-muted">Security cameras on premises — locations disclosed on request.</span>
                </div>
              )}
            </div>
          </div>

          {/* 3. Description */}
          {listing.description && (
            <Section title="About this place" sub="In the host's words">
              <p className="text-[15px] text-fg-muted leading-relaxed whitespace-pre-line max-w-[60ch]">{listing.description}</p>
            </Section>
          )}

          {/* 5. Amenities */}
          {presentAmenities.length > 0 && (
            <Section title="What this place offers" sub={`${presentAmenities.length} amenities in total`}>
              <div className="grid grid-cols-2 gap-x-6">
                {presentAmenities.map((a) => {
                  const Icon = amenityIcon(a.name);
                  return (
                    <div key={a.amenityId} className="flex items-center gap-3.5 py-3 border-b border-border [&:nth-last-child(-n+2)]:border-b-0">
                      <div className="w-5 shrink-0 flex items-center justify-center text-fg">
                        {Icon ? <Icon size={19} strokeWidth={1.8} /> : <Check size={15} strokeWidth={2} className="text-fg-muted" />}
                      </div>
                      <span className="text-[14.5px] font-medium text-fg">{a.name}</span>
                    </div>
                  );
                })}
              </div>
            </Section>
          )}

          {/* 6. Where you'll be */}
          <Section title="Where you'll be" sub={listing.cityName ? `${listing.cityName} neighbourhood` : "Approximate location"}>
            {/* Map card */}
            <div className="rounded-2xl border border-border overflow-hidden">
              <div className="relative" style={{ height: 340 }}>
                <PropertyMap lat={listing.fuzzyLatitude} lon={listing.fuzzyLongitude} cityName={listing.cityName} />
              </div>
              <div className="px-4 py-3.5 border-t border-border flex items-center gap-2 text-[13.5px]">
                <MapPinIcon size={13} className="text-fg-muted shrink-0" />
                {listing.cityName && <span className="font-semibold text-fg">{listing.cityName}</span>}
                <span className="text-fg-muted">·</span>
                <span className="text-fg-muted">Approximate location — exact address shared after booking</span>
              </div>
            </div>
            {/* Transport & nearby in 2-col grid */}
            {(transportChips.length > 0 || nearbyChips.length > 0) && (
              <div className="grid grid-cols-2 gap-6 pt-5">
                {transportChips.length > 0 && (
                  <div>
                    <h4 className="text-[11px] font-bold text-fg-muted uppercase tracking-[0.08em] mb-2.5 flex items-center gap-2">
                      <Train size={13} className="text-fg" /> Getting around
                    </h4>
                    <div className="flex flex-wrap gap-2">
                      {transportChips.map((chip) => (
                        <span key={chip} className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-white border border-border text-[13px] text-fg">
                          🚇 {chip}
                        </span>
                      ))}
                    </div>
                  </div>
                )}
                {nearbyChips.length > 0 && (
                  <div>
                    <h4 className="text-[11px] font-bold text-fg-muted uppercase tracking-[0.08em] mb-2.5 flex items-center gap-2">
                      <MapPinIcon size={13} className="text-fg" /> Nearby
                    </h4>
                    <div className="flex flex-wrap gap-2">
                      {nearbyChips.map((chip) => (
                        <span key={chip} className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-white border border-border text-[13px] text-fg">
                          📍 {chip}
                        </span>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}
          </Section>

          {/* 7. House rules */}
          {ruleLines.length > 0 && (
            <Section title="House rules" sub="A few things to keep in mind">
              <div className="grid grid-cols-2 gap-x-8">
                {(rulesExpanded ? ruleLines : rulesPreview).map((rule, i) => (
                  <div key={i} className="flex items-start gap-3 py-2.5 border-b border-border [&:nth-last-child(-n+2)]:border-b-0">
                    <Check size={15} className="text-brand mt-0.5 shrink-0" strokeWidth={2.2} />
                    <span className="text-sm text-fg-muted leading-snug">{rule}</span>
                  </div>
                ))}
              </div>
              {hasMoreRules && (
                <button
                  onClick={() => setRulesExpanded((v) => !v)}
                  className="mt-4 flex items-center gap-1.5 text-sm font-semibold text-fg hover:underline"
                >
                  {rulesExpanded ? <><ChevronUp size={15} />Show less</> : <><ChevronDown size={15} />Show all {ruleLines.length} rules</>}
                </button>
              )}
            </Section>
          )}

          {/* 8. Cancellation policy */}
          {noticeDays > 0 && (
            <Section title="Cancellation policy" sub="Two windows. No surprises.">
              <div className="grid grid-cols-2 gap-3">
                <div className="rounded-2xl border border-emerald-100 bg-emerald-50/50 p-5">
                  <p className="text-[11px] font-bold text-fg-muted uppercase tracking-[0.08em] mb-2">Grace period</p>
                  <p className="text-[22px] font-bold text-emerald-700 tracking-tight leading-none mb-2">{graceLabel}</p>
                  <p className="text-sm font-semibold text-fg mb-2 leading-snug">Leave any time — full deposit returned</p>
                  <p className="text-[13px] text-fg-muted leading-relaxed">Give notice within {noticeDays} days of moving in. Siamo refunds your deposit in full, minus only the nights you stayed.</p>
                </div>
                <div className="rounded-2xl border border-amber-100 bg-amber-50/40 p-5">
                  <p className="text-[11px] font-bold text-fg-muted uppercase tracking-[0.08em] mb-2">After day {noticeDays}</p>
                  <p className="text-[22px] font-bold text-amber-700 tracking-tight leading-none mb-2">Deposit held</p>
                  <p className="text-sm font-semibold text-fg mb-2 leading-snug">Standard contract terms apply</p>
                  <p className="text-[13px] text-fg-muted leading-relaxed">The landlord keeps your deposit if you end the contract early. Notice period follows the signed rental agreement.</p>
                </div>
              </div>
              <div className="mt-2.5 flex items-center gap-2.5 px-4 py-3 rounded-xl bg-bg-subtle text-[13px] text-fg-muted">
                <AlertCircle size={13} className="shrink-0" />
                You always pay for the days you stayed — never for days you didn't.
              </div>
            </Section>
          )}

          {/* 9. Availability */}
          <Section title="Availability" sub="Next 12 months at a glance">
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

          {/* 10. What Siamo provides */}
          <Section title="What Siamo provides" sub="On every booking, end-to-end">
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              {([
                { icon: <FileText size={18} strokeWidth={1.5} />, iconClass: "bg-brand/10 text-brand", title: "Rental contract", sub: "Bilingual EN & TH, drafted by Siamo legal" },
                { icon: <Lock size={18} strokeWidth={1.5} />, iconClass: "bg-emerald-50 text-emerald-600", title: "Deposit protection", sub: "Held in escrow by Siamo, not the landlord" },
                { icon: <ClipboardList size={18} strokeWidth={1.5} />, iconClass: "bg-amber-50 text-amber-600", title: "TM30 filing", sub: "Immigration notice filed within 24 h" },
                { icon: <ShieldCheck size={18} strokeWidth={1.5} />, iconClass: "bg-violet-50 text-violet-600", title: "Dedicated support", sub: "Real human, Bangkok hours, EN/TH/RU" },
              ] as const).map(({ icon, iconClass, title, sub }) => (
                <div key={title} className="flex flex-col gap-2.5 p-4 rounded-2xl border border-border bg-bg-card hover:shadow-sm transition-shadow">
                  <div className={cn("w-9 h-9 rounded-xl flex items-center justify-center shrink-0", iconClass)}>{icon}</div>
                  <div>
                    <p className="text-[15px] font-semibold text-fg leading-snug">{title}</p>
                    <p className="text-[13px] text-fg-muted mt-1 leading-snug">{sub}</p>
                  </div>
                </div>
              ))}
            </div>
          </Section>

          {/* Highlights */}
          {(() => {
            const highlights = generateHighlights({ id: listing.id, amenities: listing.amenities, discountTiers: listing.discountTiers, maxOccupancy: listing.maxOccupancy, bedrooms: listing.bedrooms, cityName: listing.cityName });
            return (
              <div className="pb-8 border-b border-border">
                <div className="mb-4">
                  <p className="text-[11px] font-bold text-fg-muted uppercase tracking-[0.1em]">Why this place stands out</p>
                  <h2 className="text-[20px] font-semibold text-fg mt-0.5 tracking-tight">Three reasons it's a guest favourite</h2>
                </div>
                <div className="grid grid-cols-3 gap-3">
                  {highlights.map((h, i) => (
                    <div key={i} className="p-4 rounded-2xl border border-border bg-bg-card">
                      <div className="w-9 h-9 rounded-xl bg-brand/10 text-brand flex items-center justify-center mb-3 shrink-0">
                        {h.icon}
                      </div>
                      <p className="text-sm font-semibold text-fg leading-snug mb-1">{h.title}</p>
                      <p className="text-[13px] text-fg-muted leading-snug">{h.body}</p>
                    </div>
                  ))}
                </div>
              </div>
            );
          })()}

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

      {/* ── How booking works ── */}
      <div className="mt-12 pt-8 border-t border-border">
        <div className="mb-6">
          <p className="text-[11px] font-bold text-fg-muted uppercase tracking-[0.1em]">How it works</p>
          <h2 className="text-[20px] font-semibold text-fg mt-0.5 tracking-tight">From request to keys — in 3 steps</h2>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-0 relative">
          {/* connector line (desktop) */}
          <div className="hidden md:block absolute top-[22px] left-[calc(16.67%+16px)] right-[calc(16.67%+16px)] h-px bg-border z-0" />
          {([
            {
              step: "01",
              title: "Send a request",
              body: "Pick your move-in date and how many months you need. Submit the request — no payment yet, no commitment.",
            },
            {
              step: "02",
              title: "Manager confirms",
              body: "The property manager reviews your request and confirms availability. You'll hear back within 24 hours.",
            },
            {
              step: "03",
              title: "Sign & move in",
              body: "Sign the bilingual contract, pay the first month and deposit. We file TM30 and hand you the keys.",
            },
          ] as const).map(({ step, title, body }) => (
            <div key={step} className="relative z-10 flex flex-col items-start md:items-start gap-3 px-0 md:pr-8 pb-8 md:pb-0">
              <div className="flex items-center gap-3 md:gap-0 md:flex-col md:items-start">
                <div className="w-11 h-11 rounded-full border-2 border-border bg-bg flex items-center justify-center shrink-0">
                  <span className="text-[13px] font-bold text-fg-muted tabular-nums">{step}</span>
                </div>
              </div>
              <div className="md:mt-4">
                <p className="text-[15px] font-semibold text-fg mb-1">{title}</p>
                <p className="text-[13.5px] text-fg-muted leading-relaxed">{body}</p>
              </div>
            </div>
          ))}
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
          petsAllowed={listing.petsAllowed}
          petDeposit={listing.petDeposit}
          onClose={() => setBookingModal(null)}
        />
      )}
    </div>
  );
}
