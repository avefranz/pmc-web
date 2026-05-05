import { useState } from "react";
import { useParams, Link } from "react-router-dom";
import { ArrowLeft, BedDouble, Bath, Users, Zap, ChevronLeft, ChevronRight, Home } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import { useMarketplaceListing } from "@/lib/hooks/use-marketplace";
import { formatThb, formatDate } from "@/lib/utils/format";
import { cn } from "@/lib/utils/cn";

function PhotoGallery({ media }: { media: { id: string; url: string; caption: string | null }[] }) {
  const [active, setActive] = useState(0);
  if (!media.length) {
    return (
      <div className="aspect-[16/9] bg-bg-subtle rounded-2xl flex items-center justify-center text-fg-muted">
        <Home size={48} />
      </div>
    );
  }

  const prev = () => setActive((a) => (a - 1 + media.length) % media.length);
  const next = () => setActive((a) => (a + 1) % media.length);

  return (
    <div className="space-y-2">
      <div className="relative aspect-[16/9] rounded-2xl overflow-hidden bg-bg-subtle">
        <img
          src={media[active].url}
          alt={media[active].caption ?? ""}
          className="w-full h-full object-cover"
        />
        {media.length > 1 && (
          <>
            <button
              onClick={prev}
              className="absolute left-3 top-1/2 -translate-y-1/2 w-9 h-9 rounded-full bg-white/90 backdrop-blur-sm flex items-center justify-center shadow-md hover:bg-white transition-colors"
            >
              <ChevronLeft size={16} />
            </button>
            <button
              onClick={next}
              className="absolute right-3 top-1/2 -translate-y-1/2 w-9 h-9 rounded-full bg-white/90 backdrop-blur-sm flex items-center justify-center shadow-md hover:bg-white transition-colors"
            >
              <ChevronRight size={16} />
            </button>
            <div className="absolute bottom-3 right-3 bg-black/50 text-white text-xs font-medium px-2 py-1 rounded-full">
              {active + 1} / {media.length}
            </div>
          </>
        )}
      </div>
      {media.length > 1 && (
        <div className="flex gap-2 overflow-x-auto pb-1">
          {media.map((m, i) => (
            <button
              key={m.id}
              onClick={() => setActive(i)}
              className={cn(
                "shrink-0 w-16 h-12 rounded-lg overflow-hidden border-2 transition-colors",
                i === active ? "border-brand" : "border-transparent opacity-60 hover:opacity-100",
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

export function ListingDetailPage() {
  const { id } = useParams<{ id: string }>();
  const { data: listing, isLoading } = useMarketplaceListing(id!);

  if (isLoading) {
    return (
      <div className="max-w-4xl mx-auto space-y-6">
        <Skeleton className="h-8 w-48" />
        <Skeleton className="aspect-[16/9] rounded-2xl" />
        <div className="grid grid-cols-2 gap-4">
          <Skeleton className="h-48" />
          <Skeleton className="h-48" />
        </div>
      </div>
    );
  }

  if (!listing) {
    return (
      <div className="flex flex-col items-center justify-center py-24 text-center">
        <p className="text-lg font-semibold text-fg mb-1">Listing not found</p>
        <Button asChild variant="outline" className="mt-4">
          <Link to="/listings">Back to listings</Link>
        </Button>
      </div>
    );
  }

  const isLT = listing.rentalType === "LongTerm";
  const price = isLT ? (listing.baseMonthlyRate ?? listing.basePrice * 30) : listing.basePrice;
  const presentAmenities = listing.amenities.filter((a) => a.isPresent);

  return (
    <div className="max-w-4xl mx-auto space-y-8">
      {/* Back */}
      <div className="flex items-center gap-2">
        <Link
          to="/listings"
          className="p-1.5 rounded-lg hover:bg-bg-subtle text-fg-muted hover:text-fg transition-colors"
        >
          <ArrowLeft size={18} />
        </Link>
        <nav className="text-sm text-fg-muted">
          <Link to="/listings" className="hover:text-fg transition-colors">Listings</Link>
          <span className="mx-1.5">/</span>
          <span className="text-fg line-clamp-1">{listing.title}</span>
        </nav>
      </div>

      {/* Gallery */}
      <PhotoGallery media={listing.media} />

      {/* Two-column layout */}
      <div className="grid grid-cols-1 lg:grid-cols-[1fr_320px] gap-8 items-start">

        {/* LEFT: Info */}
        <div className="space-y-6">
          {/* Header */}
          <div>
            <div className="flex items-center gap-2 mb-2 flex-wrap">
              <span className="text-xs text-fg-muted">{listing.cityName}</span>
              <span className="text-fg-muted">·</span>
              <span className="text-xs text-fg-muted">{isLT ? "Long-term" : "Short-term"}</span>
              {listing.instantBookEnabled && (
                <span className="flex items-center gap-1 text-xs font-semibold text-brand">
                  <Zap size={11} />Instant book
                </span>
              )}
            </div>
            <h1 className="text-2xl font-bold text-fg leading-snug">{listing.title}</h1>
            <div className="flex items-center gap-4 mt-3 text-sm text-fg-muted">
              {!!listing.bedrooms && (
                <span className="flex items-center gap-1.5"><BedDouble size={14} />{listing.bedrooms} bedroom{listing.bedrooms !== 1 ? "s" : ""}</span>
              )}
              {!!listing.bathrooms && (
                <span className="flex items-center gap-1.5"><Bath size={14} />{listing.bathrooms} bath{listing.bathrooms !== 1 ? "s" : ""}</span>
              )}
              {!!listing.maxOccupancy && (
                <span className="flex items-center gap-1.5"><Users size={14} />{listing.maxOccupancy} guests</span>
              )}
            </div>
          </div>

          {/* Description */}
          {listing.description && (
            <div>
              <h2 className="text-sm font-semibold text-fg mb-2">About this place</h2>
              <p className="text-sm text-fg-muted leading-relaxed whitespace-pre-line">{listing.description}</p>
            </div>
          )}

          {/* Amenities */}
          {presentAmenities.length > 0 && (
            <div>
              <h2 className="text-sm font-semibold text-fg mb-3">Amenities</h2>
              <div className="flex flex-wrap gap-2">
                {presentAmenities.map((a) => (
                  <span
                    key={a.amenityId}
                    className="inline-flex items-center gap-1 bg-bg-subtle rounded-full px-3 py-1.5 text-xs font-medium text-fg"
                  >
                    {a.name}
                  </span>
                ))}
              </div>
            </div>
          )}

          {/* House rules */}
          {listing.houseRules && (
            <div>
              <h2 className="text-sm font-semibold text-fg mb-2">House rules</h2>
              <p className="text-sm text-fg-muted leading-relaxed whitespace-pre-line">{listing.houseRules}</p>
            </div>
          )}

          {/* Availability */}
          {(listing.startDate || listing.endDate) && (
            <div>
              <h2 className="text-sm font-semibold text-fg mb-2">Availability</h2>
              <p className="text-sm text-fg-muted">
                {listing.startDate && <>From {formatDate(listing.startDate)}</>}
                {listing.endDate && <> · Until {formatDate(listing.endDate)}</>}
              </p>
            </div>
          )}
        </div>

        {/* RIGHT: Price card (sticky) */}
        <div className="lg:sticky lg:top-24">
          <div className="bg-bg-card rounded-2xl shadow-card p-6 space-y-4">
            <div>
              <span className="text-2xl font-bold text-fg">{formatThb(price)}</span>
              <span className="text-sm text-fg-muted ml-1">/ {isLT ? "month" : "night"}</span>
            </div>

            <div className="pt-2 border-t border-border space-y-2 text-sm">
              {!!listing.bedrooms && (
                <div className="flex justify-between">
                  <span className="text-fg-muted">Bedrooms</span>
                  <span className="font-medium text-fg">{listing.bedrooms}</span>
                </div>
              )}
              {!!listing.bathrooms && (
                <div className="flex justify-between">
                  <span className="text-fg-muted">Bathrooms</span>
                  <span className="font-medium text-fg">{listing.bathrooms}</span>
                </div>
              )}
              {!!listing.maxOccupancy && (
                <div className="flex justify-between">
                  <span className="text-fg-muted">Max guests</span>
                  <span className="font-medium text-fg">{listing.maxOccupancy}</span>
                </div>
              )}
            </div>

            <Button
              asChild
              className="w-full bg-brand hover:bg-[var(--color-primary-hover)] text-white rounded-pill h-11"
            >
              <Link to="/login">
                {listing.instantBookEnabled ? "Book instantly" : "Request to book"}
              </Link>
            </Button>

            {listing.instantBookEnabled && (
              <p className="text-xs text-center text-fg-muted">
                <Zap size={10} className="inline mr-1 text-brand" />
                This listing supports instant booking
              </p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
