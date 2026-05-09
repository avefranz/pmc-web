import { useState, useEffect, useRef } from "react";
import { useParams, Link } from "react-router-dom";
import {
  BedDouble, Bath, Users, LayoutGrid, X,
  ChevronLeft, ChevronRight, Home, Check, BadgeCheck, Lock,
  Trophy, Zap, Leaf, ShieldCheck, CalendarCheck,
  FileText, RotateCcw, ClipboardList, Tag,
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

  // Fallback: verified property badge (true for all published listings)
  if (hits.length < 2) {
    hits.push({ icon: <ShieldCheck size={22} strokeWidth={1.5} />, title: "Verified property", body: "Reviewed and published by the Siamo team — every listing meets our quality standard." });
  }

  return hits.slice(0, 3);
}


// ─── City map (Leaflet + OpenStreetMap tiles, no API key) ────────────────────

const THAI_CITY_COORDS: Record<string, { lat: number; lon: number }> = {
  "Bangkok":    { lat: 13.7563, lon: 100.5018 },
  "Chiang Mai": { lat: 18.7883, lon:  98.9853 },
  "Phuket":     { lat:  7.9519, lon:  98.3381 },
  "Pattaya":    { lat: 12.9236, lon: 100.8825 },
  "Hua Hin":    { lat: 12.5688, lon:  99.9580 },
  "Koh Samui":  { lat:  9.5120, lon: 100.0136 },
  "Samui":      { lat:  9.5120, lon: 100.0136 },
  "Chiang Rai": { lat: 19.9105, lon:  99.8406 },
  "Krabi":      { lat:  8.0863, lon:  98.9063 },
  "Ayutthaya":  { lat: 14.3532, lon: 100.5677 },
  "Nonthaburi": { lat: 13.8591, lon: 100.5159 },
};

function CityMap({ cityName }: { cityName: string }) {
  const key = Object.keys(THAI_CITY_COORDS).find(
    (k) => cityName.toLowerCase().includes(k.toLowerCase()) || k.toLowerCase().includes(cityName.toLowerCase()),
  );
  const { lat, lon } = key ? THAI_CITY_COORDS[key] : { lat: 13.7563, lon: 100.5018 };
  const d = 0.04;
  const bbox = `${lon - d},${lat - d},${lon + d},${lat + d}`;
  return (
    <iframe
      title="Property location"
      src={`https://www.openstreetmap.org/export/embed.html?bbox=${bbox}&layer=mapnik&marker=${lat},${lon}`}
      className="w-full h-full border-0"
      loading="lazy"
    />
  );
}

// ─── Fallback booking panel (no availability data yet) ────────────────────────

function BookingPanelFallback({
  listing,
  onRequestBook,
}: {
  listing: { id: string; monthlyRate?: number; baseMonthlyRate?: number | null };
  onRequestBook: (moveIn: string, months: number) => void;
}) {
  // Build a minimal availability DTO from listing data so BookingWidget still works
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const todayStr = today.toISOString().slice(0, 10);

  const fallbackAvailability: ListingAvailabilityDto = {
    availableFrom: todayStr,
    availableUntil: null,
    minMonths: 1,
    maxMonths: 12,
    occupiedRanges: [],
    nextAvailableDate: todayStr,
  };

  return (
    <BookingWidget
      listing={{
        id: listing.id,
        monthlyRate: listing.monthlyRate || listing.baseMonthlyRate || 0,
        discountTiers: [],
      }}
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

  const [bookingModal, setBookingModal] = useState<{
    moveIn: string;
    months: number;
  } | null>(null);

  // Derived fields — graceful fallback between old and new API shapes
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
          <Skeleton className="rounded-none" />
          <Skeleton className="rounded-none" />
          <Skeleton className="rounded-none" />
          <Skeleton className="rounded-none" />
        </div>
        <Skeleton className="md:hidden aspect-[4/3] rounded-2xl mb-10" />
        <div className="grid grid-cols-1 lg:grid-cols-[1fr_380px] gap-16">
          <div className="space-y-4">
            <Skeleton className="h-6 w-1/2" />
            <Skeleton className="h-4 w-full" />
            <Skeleton className="h-4 w-full" />
            <Skeleton className="h-4 w-3/4" />
          </div>
          <Skeleton className="h-80 rounded-2xl" />
        </div>
      </div>
    );
  }

  if (!listing) {
    return (
      <div className="flex flex-col items-center justify-center py-32 text-center">
        <p className="text-2xl font-bold text-fg mb-2">Listing not found</p>
        <p className="text-sm text-fg-muted mb-6">This listing may have been removed or is no longer available.</p>
        <Button asChild variant="outline" className="rounded-full px-6">
          <Link to="/listings">Browse all listings</Link>
        </Button>
      </div>
    );
  }

  const presentAmenities = listing.amenities.filter((a) => a.isPresent);

  const CATEGORY_LABEL: Record<number, string> = {
    1: "Apartment", 2: "House", 3: "Villa", 4: "Condo",
    5: "Studio", 6: "Townhouse", 7: "Penthouse", 8: "Room",
  };
  const catId = (listing as Record<string, unknown>).propertyCategoryId as number | undefined;
  const typeLabel = listing.bedrooms === 0 ? "Studio" : (catId ? (CATEGORY_LABEL[catId] ?? "Home") : "Home");

  function handleRequestBook(moveIn: string, months: number) {
    setBookingModal({ moveIn, months });
  }

  const bookingPanel = availability ? (
    <BookingWidget
      listing={{ id: listing.id, monthlyRate, discountTiers }}
      availability={availability}
      onRequestBook={handleRequestBook}
    />
  ) : (
    <BookingPanelFallback listing={listing} onRequestBook={handleRequestBook} />
  );

  return (
    <div className="max-w-[1200px] mx-auto px-4 md:px-10 py-8">

      {/* Title */}
      <div className="mb-6">
        <h1 className="text-2xl md:text-[26px] font-semibold text-fg leading-snug mb-2">
          {listing.title}
          {/* Verified badge — inline, vertically centered via align-middle */}
          <span
            className={cn(
              "group/badge inline-flex align-middle items-center ml-3",
              "rounded-full cursor-default select-none overflow-hidden",
              "bg-brand",
              "shadow-[0_2px_8px_-1px_rgba(0,0,0,0.20)] hover:shadow-[0_3px_14px_-2px_rgba(0,0,0,0.28)]",
              "h-[22px] w-[22px] hover:w-[138px]",
              "pl-[4px] pr-[4px] hover:pl-[6px] hover:pr-[11px]",
              "transition-[width,padding,box-shadow] duration-300 ease-out",
            )}
          >
            <BadgeCheck size={12} strokeWidth={2.2} className="shrink-0 text-white" />
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

      {/* Photos */}
      <div className="mb-10">
        <PhotoGrid media={listing.media} />
      </div>

      {/* Two-column layout */}
      <div className="grid grid-cols-1 lg:grid-cols-[1fr_380px] gap-16 items-start">

        {/* LEFT */}
        <div className="space-y-8">

          {/* Type & specs */}
          <div className="pb-6 border-b border-border">
            <h2 className="text-xl font-semibold text-fg mb-1">
              {typeLabel}{listing.cityName ? ` in ${listing.cityName}, Thailand` : " in Thailand"}
            </h2>
            <div className="flex items-center gap-3 text-sm text-fg-muted flex-wrap">
              {!!listing.maxOccupancy && <span>{listing.maxOccupancy} guest{listing.maxOccupancy !== 1 ? "s" : ""}</span>}
              {!!listing.bedrooms && <><span>·</span><span>{listing.bedrooms} bedroom{listing.bedrooms !== 1 ? "s" : ""}</span></>}
              {!!listing.bathrooms && <><span>·</span><span>{listing.bathrooms} bathroom{listing.bathrooms !== 1 ? "s" : ""}</span></>}
            </div>
          </div>

          {/* Highlights */}
          {(() => {
            const highlights = generateHighlights({
              id: listing.id,
              amenities: listing.amenities,
              discountTiers: listing.discountTiers,
              maxOccupancy: listing.maxOccupancy,
              bedrooms: listing.bedrooms,
              cityName: listing.cityName,
            });
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

          {/* Description */}
          {listing.description && (
            <div className="pb-6 border-b border-border">
              <h2 className="text-lg font-semibold text-fg mb-3">About this place</h2>
              <p className="text-sm text-fg-muted leading-relaxed whitespace-pre-line">{listing.description}</p>
            </div>
          )}

          {/* Amenities */}
          {presentAmenities.length > 0 && (
            <div className="pb-6 border-b border-border">
              <h2 className="text-lg font-semibold text-fg mb-4">What this place offers</h2>
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
            </div>
          )}

          {/* What Siamo provides */}
          <div className="pb-8 border-b border-border">
            <h2 className="text-lg font-semibold text-fg mb-5">What Siamo provides</h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {([
                {
                  icon: <FileText size={18} strokeWidth={1.5} />,
                  iconClass: "bg-blue-50 text-blue-600",
                  title: "Rental contract",
                  body: "Bilingual agreement (EN & TH) — prepared and signed before you move in.",
                  accent: false,
                },
                {
                  icon: <Lock size={18} strokeWidth={1.5} />,
                  iconClass: "bg-emerald-50 text-emerald-600",
                  title: "Deposit protection",
                  body: "Your deposit is held by Siamo — not the landlord. Returned in full after checkout per your contract.",
                  accent: true,
                },
                {
                  icon: <ClipboardList size={18} strokeWidth={1.5} />,
                  iconClass: "bg-amber-50 text-amber-600",
                  title: "TM30 filing",
                  body: "We handle the immigration notification required by Thai law — automatically.",
                  accent: false,
                },
                {
                  icon: <ShieldCheck size={18} strokeWidth={1.5} />,
                  iconClass: "bg-violet-50 text-violet-600",
                  title: "Dedicated support",
                  body: "A real person on your side — from first message to move-out.",
                  accent: false,
                },
              ] as const).map(({ icon, iconClass, title, body, accent }) => (
                <div
                  key={title}
                  className={cn(
                    "flex gap-3.5 p-4 rounded-2xl border transition-shadow hover:shadow-sm",
                    accent
                      ? "border-emerald-200 bg-emerald-50/40"
                      : "border-border bg-bg-card",
                  )}
                >
                  <div className={cn("w-8 h-8 rounded-xl flex items-center justify-center shrink-0 mt-0.5", iconClass)}>
                    {icon}
                  </div>
                  <div>
                    <p className="text-sm font-semibold text-fg leading-snug">{title}</p>
                    <p className="text-xs text-fg-muted mt-1 leading-relaxed">{body}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Availability timeline */}
          <div className="pb-6 border-b border-border">
            <h2 className="text-lg font-semibold text-fg mb-4">Availability</h2>
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
          </div>

          {/* House rules */}
          {listing.houseRules && (
            <div className="pb-6 border-b border-border">
              <h2 className="text-lg font-semibold text-fg mb-3">House rules</h2>
              <p className="text-sm text-fg-muted leading-relaxed whitespace-pre-line">{listing.houseRules}</p>
            </div>
          )}

          {/* Mobile booking panel */}
          <div className="lg:hidden">{bookingPanel}</div>
        </div>

        {/* RIGHT: sticky booking */}
        <div className="hidden lg:block lg:sticky lg:top-28 space-y-3">
          {/* All-fees badge */}
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
          {/* Free cancellation note */}
          <p className="text-[12px] text-center text-fg-muted px-2">
            <RotateCcw size={11} className="inline mr-1 -mt-0.5" />
            Free cancellation before signing the contract
          </p>
        </div>
      </div>

      {/* Things to know */}
      <div className="mt-12 pt-10 border-t border-border">
        <h2 className="text-xl font-semibold text-fg mb-6">Things to know</h2>
        <div className="border border-border rounded-2xl overflow-hidden">
          <div className="grid grid-cols-1 md:grid-cols-3 divide-y md:divide-y-0 md:divide-x divide-border">
            {/* Cancellation */}
            <div className="p-6">
              <RotateCcw size={20} strokeWidth={1.5} className="text-fg mb-4" />
              <h3 className="font-semibold text-fg mb-3">Cancellation policy</h3>
              <div className="text-sm text-fg-muted space-y-2">
                <p>Free cancellation before the rental contract is signed.</p>
                <p>After signing, cancellation terms are defined in the agreement.</p>
              </div>
            </div>
            {/* Rental terms */}
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
            {/* House rules */}
            <div className="p-6">
              <Home size={20} strokeWidth={1.5} className="text-fg mb-4" />
              <h3 className="font-semibold text-fg mb-3">House rules</h3>
              <div className="text-sm text-fg-muted space-y-2">
                {listing.houseRules
                  ? listing.houseRules.split("\n").slice(0, 4).map((r, i) => <p key={i}>{r}</p>)
                  : (
                    <>
                      <p>No smoking inside the property.</p>
                      <p>Quiet hours 22:00 – 08:00.</p>
                      <p>Coordinate check-in with the manager.</p>
                    </>
                  )}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Where you'll be */}
      {listing.cityName && (
        <div className="mt-12 pt-10 border-t border-border">
          <h2 className="text-xl font-semibold text-fg mb-1">Where you'll be</h2>
          <p className="text-sm text-fg-muted mb-5">{listing.cityName}, Thailand</p>
          <div className="rounded-2xl overflow-hidden border border-border h-[420px]">
            <CityMap cityName={listing.cityName} />
          </div>
        </div>
      )}

      <div className="pb-16" />

      {/* Booking request modal */}
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
