import { useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { BedDouble, Bath, Users, Zap, ChevronLeft, ChevronRight, Heart, SlidersHorizontal } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useMarketplaceListings } from "@/lib/hooks/use-marketplace";
import { formatThb } from "@/lib/utils/format";
import type { MarketplaceListingPreviewDto, MarketplaceRentalType, MarketplaceSortOrder } from "@/lib/types/marketplace";
import { cn } from "@/lib/utils/cn";

const PAGE_SIZE = 12;

const FALLBACKS = [
  "https://images.unsplash.com/photo-1564013799919-ab600027ffc6?auto=format&fit=crop&w=800&h=600&q=80",
  "https://images.unsplash.com/photo-1505691938895-1758d7feb511?auto=format&fit=crop&w=800&h=600&q=80",
  "https://images.unsplash.com/photo-1522708323590-d24dbb6b0267?auto=format&fit=crop&w=800&h=600&q=80",
  "https://images.unsplash.com/photo-1502672260266-1c1ef2d93688?auto=format&fit=crop&w=800&h=600&q=80",
  "https://images.unsplash.com/photo-1571896349842-33c89424de2d?auto=format&fit=crop&w=800&h=600&q=80",
  "https://images.unsplash.com/photo-1540541338287-41700207dee6?auto=format&fit=crop&w=800&h=600&q=80",
];

// ─── Wishlist heart ───────────────────────────────────────────────────────────

function WishHeart({ id }: { id: string }) {
  const KEY = "pmc_wishlist";
  const saved = (): string[] => JSON.parse(localStorage.getItem(KEY) ?? "[]");
  const [on, setOn] = useState(() => saved().includes(id));
  function toggle(e: React.MouseEvent) {
    e.preventDefault(); e.stopPropagation();
    const list = saved();
    localStorage.setItem(KEY, JSON.stringify(on ? list.filter((x) => x !== id) : [...list, id]));
    setOn(!on);
  }
  return (
    <button
      onClick={toggle}
      className="w-8 h-8 rounded-full bg-white/90 backdrop-blur-sm flex items-center justify-center shadow-sm hover:scale-110 transition-transform"
    >
      <Heart size={14} fill={on ? "#E0945C" : "none"} stroke={on ? "#E0945C" : "#222"} strokeWidth={2} />
    </button>
  );
}

// ─── Card ─────────────────────────────────────────────────────────────────────

function ListingCard({ listing, idx }: { listing: MarketplaceListingPreviewDto; idx: number }) {
  const isLT = listing.rentalType === "LongTerm";
  const price = isLT ? (listing.baseMonthlyRate ?? listing.basePrice * 30) : listing.basePrice;
  const photo = listing.coverImageUrl ?? FALLBACKS[idx % FALLBACKS.length];

  return (
    <Link to={`/listings/${listing.id}`} className="group block">
      <div className="relative aspect-[4/3] rounded-2xl overflow-hidden bg-bg-subtle mb-3">
        <img
          src={photo}
          alt={listing.title}
          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
          loading="lazy"
        />
        {listing.instantBookEnabled && (
          <div className="absolute top-3 left-3 flex items-center gap-1 bg-brand text-white text-[11px] font-semibold px-2 py-1 rounded-full">
            <Zap size={9} />Instant
          </div>
        )}
        <div className="absolute top-3 right-3">
          <WishHeart id={listing.id} />
        </div>
      </div>

      <div className="flex items-start justify-between gap-2">
        <div className="flex-1 min-w-0">
          <p className="text-xs text-fg-muted mb-0.5">{listing.cityName} · {isLT ? "Long-term" : "Short-term"}</p>
          <p className="text-sm font-semibold text-fg line-clamp-2 leading-snug">{listing.title}</p>
          <div className="flex items-center gap-3 mt-1.5 text-xs text-fg-muted">
            {!!listing.bedrooms && <span className="flex items-center gap-1"><BedDouble size={11} />{listing.bedrooms} bd</span>}
            {!!listing.bathrooms && <span className="flex items-center gap-1"><Bath size={11} />{listing.bathrooms} ba</span>}
            {!!listing.maxOccupancy && <span className="flex items-center gap-1"><Users size={11} />{listing.maxOccupancy} guests</span>}
          </div>
        </div>
        <div className="text-right shrink-0">
          <p className="text-sm font-bold text-fg">{formatThb(price)}</p>
          <p className="text-xs text-fg-muted">/ {isLT ? "mo" : "night"}</p>
        </div>
      </div>
    </Link>
  );
}

function CardSkeleton() {
  return (
    <div>
      <Skeleton className="aspect-[4/3] rounded-2xl mb-3" />
      <Skeleton className="h-3.5 w-1/3 mb-1.5" />
      <Skeleton className="h-4 w-3/4 mb-1" />
      <Skeleton className="h-3 w-1/2" />
    </div>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export function ListingsPage() {
  const [params, setParams] = useSearchParams();

  const cityId     = params.get("cityId")     ? Number(params.get("cityId"))   : undefined;
  const rentalType = (params.get("rentalType") as MarketplaceRentalType | null) ?? undefined;
  const sort       = (params.get("sort")       as MarketplaceSortOrder | null)  ?? undefined;
  const bedrooms   = params.get("bedrooms")    ? Number(params.get("bedrooms")) : undefined;
  const page       = params.get("page")        ? Number(params.get("page"))     : 1;

  const { data, isLoading } = useMarketplaceListings({ cityId, rentalType, sort, bedrooms, page, pageSize: PAGE_SIZE });

  function setSort(v: string) {
    const next = new URLSearchParams(params);
    if (!v || v === "Newest") next.delete("sort");
    else next.set("sort", v);
    next.delete("page");
    setParams(next);
  }

  function setPage(p: number) {
    const next = new URLSearchParams(params);
    next.set("page", String(p));
    setParams(next);
  }

  function clearFilters() {
    setParams({});
  }

  const total = data?.totalCount ?? 0;
  const totalPages = data?.totalPages ?? 1;
  const hasActiveFilters = !!(cityId || rentalType || bedrooms);

  return (
    <div className="max-w-[var(--container)] mx-auto px-4 md:px-6 py-6">
      {/* Toolbar: active filters summary + sort + count */}
      <div className="flex items-center gap-3 mb-6 flex-wrap">
        {/* Active filter chips */}
        {hasActiveFilters && (
          <div className="flex items-center gap-2 flex-wrap">
            {cityId && (
              <span className="flex items-center gap-1.5 text-xs font-medium bg-fg text-white px-3 py-1.5 rounded-full">
                {params.get("cityId")}
                <button onClick={() => { const n = new URLSearchParams(params); n.delete("cityId"); setParams(n); }} className="hover:opacity-70 transition-opacity">×</button>
              </span>
            )}
            {rentalType && (
              <span className="flex items-center gap-1.5 text-xs font-medium bg-fg text-white px-3 py-1.5 rounded-full">
                {rentalType === "LongTerm" ? "Long-term" : "Short-term"}
                <button onClick={() => { const n = new URLSearchParams(params); n.delete("rentalType"); setParams(n); }} className="hover:opacity-70 transition-opacity">×</button>
              </span>
            )}
            {bedrooms && (
              <span className="flex items-center gap-1.5 text-xs font-medium bg-fg text-white px-3 py-1.5 rounded-full">
                {bedrooms}+ beds
                <button onClick={() => { const n = new URLSearchParams(params); n.delete("bedrooms"); setParams(n); }} className="hover:opacity-70 transition-opacity">×</button>
              </span>
            )}
            <button onClick={clearFilters} className="text-xs text-fg-muted underline underline-offset-2 hover:text-fg transition-colors">
              Clear all
            </button>
          </div>
        )}

        <div className="ml-auto flex items-center gap-3">
          {!isLoading && (
            <span className="text-sm text-fg-muted">
              {total} {total === 1 ? "place" : "places"}
            </span>
          )}
          <Select value={sort ?? "Newest"} onValueChange={setSort}>
            <SelectTrigger className="w-40 h-9 rounded-full text-sm border-border bg-white shadow-sm">
              <SlidersHorizontal size={13} className="mr-1.5 text-fg-muted" />
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="Newest">Newest</SelectItem>
              <SelectItem value="PriceAsc">Price: low → high</SelectItem>
              <SelectItem value="PriceDesc">Price: high → low</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Grid */}
      {isLoading ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
          {Array.from({ length: PAGE_SIZE }).map((_, i) => <CardSkeleton key={i} />)}
        </div>
      ) : !data?.items.length ? (
        <div className="flex flex-col items-center justify-center py-32 text-center">
          <div className="text-5xl mb-4">🏠</div>
          <p className="text-xl font-semibold text-fg mb-1">No places found</p>
          <p className="text-sm text-fg-muted mb-4">Try adjusting your search filters</p>
          {hasActiveFilters && (
            <button onClick={clearFilters} className="text-sm font-semibold text-fg underline underline-offset-2 hover:text-fg-muted transition-colors">
              Clear filters
            </button>
          )}
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-x-6 gap-y-8">
          {data.items.map((listing, idx) => (
            <ListingCard key={listing.id} listing={listing} idx={(page - 1) * PAGE_SIZE + idx} />
          ))}
        </div>
      )}

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-center gap-1.5 mt-12">
          <Button
            variant="outline"
            size="sm"
            className="rounded-full w-9 h-9 p-0"
            disabled={page <= 1}
            onClick={() => setPage(page - 1)}
          >
            <ChevronLeft size={14} />
          </Button>
          {Array.from({ length: Math.min(totalPages, 7) }, (_, i) => {
            const p = i + 1;
            return (
              <button
                key={p}
                onClick={() => setPage(p)}
                className={cn(
                  "w-9 h-9 rounded-full text-sm font-medium transition-colors",
                  p === page ? "bg-fg text-white" : "text-fg-muted hover:bg-[#f7f7f7] hover:text-fg",
                )}
              >
                {p}
              </button>
            );
          })}
          <Button
            variant="outline"
            size="sm"
            className="rounded-full w-9 h-9 p-0"
            disabled={page >= totalPages}
            onClick={() => setPage(page + 1)}
          >
            <ChevronRight size={14} />
          </Button>
        </div>
      )}
    </div>
  );
}
