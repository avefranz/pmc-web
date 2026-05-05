import { useState } from "react";
import { useParams, Link, useNavigate } from "react-router-dom";
import { ArrowLeft, BedDouble, Bath, Users, Zap, LayoutGrid, X, ChevronLeft, ChevronRight, Home, Check } from "lucide-react";
import { amenityIcon } from "@/lib/utils/amenity-icons";
import { toast } from "sonner";
import { differenceInCalendarDays, parseISO } from "date-fns";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import { DatePicker } from "@/components/ui/date-picker";
import { useMarketplaceListing } from "@/lib/hooks/use-marketplace";
import { useCreateBooking } from "@/lib/hooks/use-bookings";
import { useAuthStore } from "@/lib/stores/auth.store";
import { formatThb, formatDate } from "@/lib/utils/format";
import { cn } from "@/lib/utils/cn";

type MediaItem = { id: string; url: string; caption: string | null };

// ─── Fullscreen gallery modal ─────────────────────────────────────────────────

function GalleryModal({
  media,
  startAt,
  onClose,
}: {
  media: MediaItem[];
  startAt: number;
  onClose: () => void;
}) {
  const [idx, setIdx] = useState(startAt);
  const prev = () => setIdx((i) => (i - 1 + media.length) % media.length);
  const next = () => setIdx((i) => (i + 1) % media.length);

  return (
    <div
      className="fixed inset-0 z-[100] bg-black/95 flex flex-col"
      onClick={onClose}
    >
      {/* Header */}
      <div
        className="flex items-center justify-between px-6 py-4 shrink-0"
        onClick={(e) => e.stopPropagation()}
      >
        <span className="text-white/70 text-sm">{idx + 1} / {media.length}</span>
        <button
          onClick={onClose}
          className="w-9 h-9 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center transition-colors"
        >
          <X size={18} className="text-white" />
        </button>
      </div>

      {/* Main image */}
      <div
        className="flex-1 flex items-center justify-center relative px-16 min-h-0"
        onClick={(e) => e.stopPropagation()}
      >
        <button
          onClick={prev}
          className="absolute left-4 w-11 h-11 rounded-full bg-white/10 hover:bg-white/25 flex items-center justify-center transition-colors"
        >
          <ChevronLeft size={22} className="text-white" />
        </button>

        <img
          key={idx}
          src={media[idx].url}
          alt={media[idx].caption ?? ""}
          className="max-h-full max-w-full object-contain rounded-lg"
        />

        <button
          onClick={next}
          className="absolute right-4 w-11 h-11 rounded-full bg-white/10 hover:bg-white/25 flex items-center justify-center transition-colors"
        >
          <ChevronRight size={22} className="text-white" />
        </button>
      </div>

      {/* Thumbnail strip */}
      {media.length > 1 && (
        <div
          className="flex gap-2 overflow-x-auto px-6 py-4 shrink-0 scrollbar-hide justify-center"
          onClick={(e) => e.stopPropagation()}
        >
          {media.map((m, i) => (
            <button
              key={m.id}
              onClick={() => setIdx(i)}
              className={cn(
                "shrink-0 w-16 h-12 rounded-lg overflow-hidden border-2 transition-all",
                i === idx ? "border-white opacity-100" : "border-transparent opacity-40 hover:opacity-70",
              )}
            >
              <img src={m.url} alt="" className="w-full h-full object-cover" />
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

// ─── Photo grid (Airbnb-style) ────────────────────────────────────────────────

function ShowAllBtn({ onClick, count }: { onClick: () => void; count: number }) {
  return (
    <button
      onClick={onClick}
      className="absolute bottom-4 right-4 flex items-center gap-2 bg-white border border-border rounded-xl px-4 py-2.5 text-sm font-semibold text-fg shadow-sm hover:shadow-md transition-shadow"
    >
      <LayoutGrid size={15} />
      {count === 1 ? "View photo" : `Show all ${count} photos`}
    </button>
  );
}

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
      {/* Desktop: always 5-slot Airbnb grid */}
      <div className="hidden md:block relative">
        <div className="grid grid-cols-[2fr_1fr_1fr] grid-rows-2 gap-2 rounded-2xl overflow-hidden h-[420px]">
          {/* Main photo */}
          <button className="row-span-2 overflow-hidden group" onClick={() => open(0)}>
            <img src={main.url} alt={main.caption ?? ""} className="w-full h-full object-cover group-hover:scale-[1.02] transition-transform duration-500" />
          </button>

          {/* 4 side slots */}
          {[0, 1, 2, 3].map((i) => {
            const item = rest[i];
            return (
              <button
                key={i}
                className="overflow-hidden group relative"
                onClick={() => item && open(i + 1)}
                disabled={!item}
              >
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

        <ShowAllBtn onClick={() => open(0)} count={media.length} />
      </div>

      {/* Mobile: single photo + counter */}
      <div className="md:hidden relative aspect-[4/3] rounded-2xl overflow-hidden bg-bg-subtle">
        <img src={main.url} alt={main.caption ?? ""} className="w-full h-full object-cover" onClick={() => open(0)} />
        {media.length > 1 && (
          <button
            onClick={() => open(0)}
            className="absolute bottom-3 right-3 flex items-center gap-1.5 bg-white/90 backdrop-blur-sm border border-border rounded-full px-3 py-1.5 text-xs font-semibold text-fg shadow-sm"
          >
            <LayoutGrid size={12} />
            {media.length} photos
          </button>
        )}
      </div>

      {galleryOpen && (
        <GalleryModal media={media} startAt={galleryStart} onClose={() => setGalleryOpen(false)} />
      )}
    </>
  );
}

// ─── Booking panel ────────────────────────────────────────────────────────────

function BookingPanel({
  listing,
}: {
  listing: {
    id: string;
    assetId?: string;
    basePrice: number;
    baseMonthlyRate?: number | null;
    rentalType: string;
    instantBookEnabled: boolean;
  };
}) {
  const { token } = useAuthStore();
  const navigate = useNavigate();
  const createBooking = useCreateBooking();

  const isLT = listing.rentalType === "LongTerm";
  const price = isLT ? (listing.baseMonthlyRate ?? listing.basePrice * 30) : listing.basePrice;

  const [checkIn, setCheckIn] = useState<string>("");
  const [checkOut, setCheckOut] = useState<string>("");
  const [submitted, setSubmitted] = useState(false);

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const nights =
    checkIn && checkOut
      ? Math.max(0, differenceInCalendarDays(parseISO(checkOut), parseISO(checkIn)))
      : 0;

  async function handleBook() {
    if (!token) { navigate("/login"); return; }
    if (!checkIn || !checkOut) { toast.error("Please select check-in and check-out dates"); return; }
    setSubmitted(true);
    try {
      const booking = await createBooking.mutateAsync({
        assetId: listing.assetId,
        listingId: listing.id,
        checkInDate: checkIn,
        checkOutDate: checkOut,
        depositAmount: 0,
      });
      toast.success("Booking request sent!");
      navigate(`/me/trips/${booking.id}`);
    } catch {
      toast.error("Failed to submit booking request. Please try again.");
    } finally {
      setSubmitted(false);
    }
  }

  const canBook = !submitted && !createBooking.isPending;

  return (
    <div className="bg-white rounded-2xl border border-border shadow-pop p-6 space-y-4">
      {/* Price */}
      <div className="flex items-baseline gap-1.5">
        <span className="text-2xl font-bold text-fg">{formatThb(price)}</span>
        <span className="text-sm text-fg-muted">/ {isLT ? "month" : "night"}</span>
        {listing.instantBookEnabled && (
          <span className="ml-auto flex items-center gap-1 text-xs font-semibold text-brand">
            <Zap size={11} />Instant
          </span>
        )}
      </div>

      {/* Date pickers */}
      <div className="rounded-xl border border-border overflow-hidden divide-y divide-border">
        <div className="grid grid-cols-2 divide-x divide-border">
          <div className="p-3 space-y-1">
            <p className="text-[11px] font-bold text-fg uppercase tracking-wide">Check-in</p>
            <DatePicker
              value={checkIn}
              onChange={(v) => {
                setCheckIn(v);
                if (checkOut && v >= checkOut) setCheckOut("");
              }}
              placeholder="Add date"
              isDisabled={(d) => d < today}
              className="border-0 shadow-none h-8 px-0 text-sm bg-transparent hover:bg-transparent focus-visible:ring-0"
            />
          </div>
          <div className="p-3 space-y-1">
            <p className="text-[11px] font-bold text-fg uppercase tracking-wide">Check-out</p>
            <DatePicker
              value={checkOut}
              onChange={setCheckOut}
              placeholder="Add date"
              isDisabled={(d) => {
                if (d < today) return true;
                if (checkIn) {
                  const ci = parseISO(checkIn);
                  return d <= ci;
                }
                return false;
              }}
              className="border-0 shadow-none h-8 px-0 text-sm bg-transparent hover:bg-transparent focus-visible:ring-0"
            />
          </div>
        </div>
      </div>

      {/* CTA */}
      <Button
        className="w-full bg-brand hover:bg-[var(--color-primary-hover)] text-white rounded-xl h-12 text-base font-semibold shadow-sm"
        onClick={handleBook}
        disabled={!canBook}
      >
        {!token
          ? "Sign in to book"
          : submitted || createBooking.isPending
          ? "Sending…"
          : listing.instantBookEnabled
          ? "Book instantly"
          : "Request to book"}
      </Button>

      {!token && (
        <p className="text-xs text-center text-fg-muted">
          <Link to="/register" className="text-brand hover:underline font-medium">Create an account</Link>
          {" "}or{" "}
          <Link to="/login" className="text-brand hover:underline font-medium">log in</Link>
          {" "}to book
        </p>
      )}

      {/* Price breakdown */}
      {nights > 1 && !isLT && (
        <div className="space-y-2 pt-2 border-t border-border text-sm">
          <div className="flex justify-between text-fg-muted">
            <span>{formatThb(price)} × {nights} nights</span>
            <span>{formatThb(price * nights)}</span>
          </div>
          <div className="flex justify-between font-semibold text-fg pt-1 border-t border-border">
            <span>Total before taxes</span>
            <span>{formatThb(price * nights)}</span>
          </div>
        </div>
      )}

      <p className="text-xs text-center text-fg-muted">You won't be charged yet</p>
    </div>
  );
}

// ─── Main page ────────────────────────────────────────────────────────────────

export function ListingDetailPage() {
  const { id } = useParams<{ id: string }>();
  const { data: listing, isLoading } = useMarketplaceListing(id!);

  if (isLoading) {
    return (
      <div className="max-w-[1200px] mx-auto px-4 md:px-10 py-8">
        <Skeleton className="h-5 w-40 mb-5" />
        <Skeleton className="h-10 w-2/3 mb-2" />
        <Skeleton className="h-4 w-1/3 mb-6" />
        {/* Photo grid skeleton — always 5-slot */}
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

  const isLT = listing.rentalType === "LongTerm";
  const presentAmenities = listing.amenities.filter((a) => a.isPresent);

  return (
    <div className="max-w-[1200px] mx-auto px-4 md:px-10 py-8">

      {/* Breadcrumb */}
      <nav className="flex items-center gap-2 text-sm text-fg-muted mb-5">
        <Link to="/listings" className="flex items-center gap-1.5 hover:text-fg transition-colors">
          <ArrowLeft size={15} />
          Listings
        </Link>
        <span>/</span>
        <span className="text-fg font-medium line-clamp-1">{listing.title}</span>
      </nav>

      {/* Title */}
      <div className="mb-6">
        <h1 className="text-3xl md:text-4xl font-bold text-fg leading-snug mb-3">{listing.title}</h1>
        <div className="flex items-center gap-2 flex-wrap text-sm text-fg-muted">
          <span className="font-medium text-fg underline underline-offset-2">{listing.cityName}</span>
          <span>·</span>
          <span>{isLT ? "Long-term" : "Short-term"}</span>
          {!!listing.bedrooms && <><span>·</span><span>{listing.bedrooms} bed{listing.bedrooms !== 1 ? "s" : ""}</span></>}
          {!!listing.bathrooms && <><span>·</span><span>{listing.bathrooms} bath{listing.bathrooms !== 1 ? "s" : ""}</span></>}
          {!!listing.maxOccupancy && <><span>·</span><span>{listing.maxOccupancy} guests</span></>}
          {listing.instantBookEnabled && (
            <><span>·</span>
            <span className="flex items-center gap-1 font-semibold text-brand">
              <Zap size={12} />Instant book
            </span></>
          )}
        </div>
      </div>

      {/* Photo grid */}
      <div className="mb-10">
        <PhotoGrid media={listing.media} />
      </div>

      {/* Two-column layout */}
      <div className="grid grid-cols-1 lg:grid-cols-[1fr_380px] gap-16 items-start">

        {/* LEFT */}
        <div className="space-y-8">

          {/* Type & specs */}
          <div className="pb-6 border-b border-border">
            <h2 className="text-xl font-semibold text-fg mb-2">
              {isLT ? "Long-term rental" : "Short-term stay"}
            </h2>
            <div className="flex items-center gap-5 text-sm text-fg-muted flex-wrap">
              {!!listing.bedrooms && (
                <span className="flex items-center gap-1.5"><BedDouble size={16} />{listing.bedrooms} bedroom{listing.bedrooms !== 1 ? "s" : ""}</span>
              )}
              {!!listing.bathrooms && (
                <span className="flex items-center gap-1.5"><Bath size={16} />{listing.bathrooms} bathroom{listing.bathrooms !== 1 ? "s" : ""}</span>
              )}
              {!!listing.maxOccupancy && (
                <span className="flex items-center gap-1.5"><Users size={16} />{listing.maxOccupancy} guests max</span>
              )}
            </div>
          </div>

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
                        {Icon
                          ? <Icon size={20} strokeWidth={1.5} />
                          : <Check size={16} strokeWidth={2} className="text-fg-muted" />}
                      </div>
                      {a.name}
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* House rules */}
          {listing.houseRules && (
            <div className="pb-6 border-b border-border">
              <h2 className="text-lg font-semibold text-fg mb-3">House rules</h2>
              <p className="text-sm text-fg-muted leading-relaxed whitespace-pre-line">{listing.houseRules}</p>
            </div>
          )}

          {/* Availability */}
          {(listing.startDate || listing.endDate) && (
            <div className="pb-6 border-b border-border">
              <h2 className="text-lg font-semibold text-fg mb-2">Availability</h2>
              <p className="text-sm text-fg-muted">
                {listing.startDate && <>From <strong className="text-fg">{formatDate(listing.startDate)}</strong></>}
                {listing.endDate && <> until <strong className="text-fg">{formatDate(listing.endDate)}</strong></>}
              </p>
            </div>
          )}

          {/* Mobile booking panel */}
          <div className="lg:hidden">
            <BookingPanel listing={listing} />
          </div>
        </div>

        {/* RIGHT: sticky booking card */}
        <div className="hidden lg:block lg:sticky lg:top-28">
          <BookingPanel listing={listing} />
        </div>
      </div>

      <div className="pb-16" />
    </div>
  );
}
