import { useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { BedDouble, Zap, ChevronLeft, ChevronRight, Heart, SlidersHorizontal } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useMarketplaceListings, useMarketplaceCities } from "@/lib/hooks/use-marketplace";
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
      className="hover:scale-110 transition-transform p-0.5"
      style={{ filter: "drop-shadow(0 1px 3px rgba(0,0,0,0.45))" }}
    >
      <Heart
        size={20}
        fill={on ? "white" : "rgba(0,0,0,0.35)"}
        stroke="white"
        strokeWidth={2}
      />
    </button>
  );
}

// ─── Card ─────────────────────────────────────────────────────────────────────

function ListingCard({ listing, idx }: { listing: MarketplaceListingPreviewDto; idx: number }) {
  const isLT = listing.rentalType === "LongTerm";
  const price = isLT ? (listing.baseMonthlyRate ?? listing.basePrice * 30) : listing.basePrice;
  const photo = listing.coverImageUrl ?? FALLBACKS[idx % FALLBACKS.length];

  const specs = [
    listing.bedrooms ? `${listing.bedrooms} bed` : null,
    listing.bathrooms ? `${listing.bathrooms} bath` : null,
    listing.maxOccupancy ? `${listing.maxOccupancy} guests` : null,
  ].filter(Boolean).join(" · ");

  return (
    <Link to={`/listings/${listing.id}`} className="group block">
      {/* Photo */}
      <div className="relative aspect-square rounded-2xl overflow-hidden bg-bg-subtle mb-3">
        <img
          src={photo}
          alt={listing.title}
          className="w-full h-full object-cover group-hover:scale-[1.04] transition-transform duration-500"
          loading="lazy"
        />
        {/* Instant badge */}
        {listing.instantBookEnabled && (
          <div className="absolute top-3 left-3 flex items-center gap-1 bg-white/95 backdrop-blur-sm text-fg text-[11px] font-semibold px-2.5 py-1 rounded-full shadow-sm">
            <Zap size={10} className="text-brand" />Instant
          </div>
        )}
        <div className="absolute top-3 right-3">
          <WishHeart id={listing.id} />
        </div>
      </div>

      {/* Info stack */}
      <div className="space-y-0.5">
        <div className="flex items-center justify-between gap-2">
          <p className="text-sm font-semibold text-fg line-clamp-1 leading-snug">{listing.cityName}</p>
          {listing.instantBookEnabled && (
            <Zap size={11} className="text-brand shrink-0" />
          )}
        </div>
        <p className="text-sm text-fg-muted line-clamp-1 leading-snug">{listing.title}</p>
        {specs && (
          <p className="text-sm text-fg-muted">{specs}</p>
        )}
        <p className="text-sm text-fg pt-0.5">
          <span className="font-semibold">{formatThb(price)}</span>
          <span className="text-fg-muted font-normal"> / {isLT ? "month" : "night"}</span>
        </p>
      </div>
    </Link>
  );
}

function CardSkeleton() {
  return (
    <div>
      <Skeleton className="aspect-square rounded-2xl mb-3" />
      <Skeleton className="h-4 w-2/3 mb-1.5" />
      <Skeleton className="h-3.5 w-3/4 mb-1" />
      <Skeleton className="h-3.5 w-1/2 mb-1" />
      <Skeleton className="h-4 w-1/3 mt-1" />
    </div>
  );
}

// ─── Category filter bar ──────────────────────────────────────────────────────

const TYPE_FILTERS: { val: MarketplaceRentalType | ""; label: string; icon: string }[] = [
  { val: "",          label: "All homes",   icon: "🏠" },
  { val: "LongTerm",  label: "Long-term",   icon: "🏢" },
  { val: "ShortTerm", label: "Short-term",  icon: "🌴" },
];

const BED_FILTERS: { val: string; label: string }[] = [
  { val: "",  label: "Any" },
  { val: "1", label: "1+" },
  { val: "2", label: "2+" },
  { val: "3", label: "3+" },
  { val: "4", label: "4+" },
];

function CategoryBar({
  rentalType,
  bedrooms,
  onType,
  onBeds,
}: {
  rentalType: string;
  bedrooms: string;
  onType: (v: string) => void;
  onBeds: (v: string) => void;
}) {
  return (
    <div className="sticky top-20 z-30 bg-white border-b border-border">
      <div className="w-full px-4 md:px-8 lg:px-12">
        <div className="flex items-center gap-1.5 overflow-x-auto py-2.5 scrollbar-hide">
          {/* Type filters — single-line, compact */}
          {TYPE_FILTERS.map((f) => (
            <button
              key={f.val}
              onClick={() => onType(f.val)}
              className={cn(
                "flex items-center gap-1.5 px-3 py-1.5 rounded-full border text-xs font-medium transition-all shrink-0 whitespace-nowrap",
                rentalType === f.val
                  ? "border-fg bg-fg text-white"
                  : "border-transparent text-fg-muted hover:text-fg hover:bg-bg-subtle",
              )}
            >
              <span className="text-sm leading-none">{f.icon}</span>
              {f.label}
            </button>
          ))}

          <div className="w-px h-5 bg-border mx-1 shrink-0" />

          {/* Beds */}
          <div className="flex items-center gap-1 shrink-0">
            <span className="text-xs text-fg-muted font-medium px-1 flex items-center gap-1">
              <BedDouble size={12} /> Beds:
            </span>
            {BED_FILTERS.map((f) => (
              <button
                key={f.val}
                onClick={() => onBeds(f.val)}
                className={cn(
                  "px-2.5 py-1 rounded-full border text-xs font-semibold transition-all shrink-0",
                  bedrooms === f.val
                    ? "border-fg bg-fg text-white"
                    : "border-border text-fg-muted hover:border-fg hover:text-fg",
                )}
              >
                {f.label}
              </button>
            ))}
          </div>
        </div>
      </div>
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
  const { data: cities } = useMarketplaceCities();

  function set(key: string, val: string) {
    const next = new URLSearchParams(params);
    if (!val) next.delete(key);
    else next.set(key, val);
    next.delete("page");
    setParams(next);
  }

  function setSort(v: string) {
    set("sort", v === "Newest" ? "" : v);
  }

  function setPage(p: number) {
    const next = new URLSearchParams(params);
    next.set("page", String(p));
    setParams(next);
  }

  function clearFilters() { setParams({}); }

  const total = data?.totalCount ?? 0;
  const totalPages = data?.totalPages ?? 1;
  const hasActiveFilters = !!(cityId || rentalType || bedrooms);
  const rentalTypeStr = params.get("rentalType") ?? "";
  const bedroomsStr = params.get("bedrooms") ?? "";

  return (
    <>
      <CategoryBar
        rentalType={rentalTypeStr}
        bedrooms={bedroomsStr}
        onType={(v) => set("rentalType", v)}
        onBeds={(v) => set("bedrooms", v)}
      />

      <div className="w-full px-4 md:px-8 lg:px-12 py-5">
        {/* Toolbar: active city chip + result count + sort */}
        {(hasActiveFilters || !isLoading) && (
          <div className="flex items-center gap-3 mb-4 flex-wrap">
            {cityId && (
              <span className="flex items-center gap-1.5 text-xs font-medium bg-fg text-white px-3 py-1.5 rounded-full">
                {cities?.find((c) => c.id === cityId)?.name.en ?? `City ${cityId}`}
                <button
                  onClick={() => set("cityId", "")}
                  className="hover:opacity-70 transition-opacity ml-0.5"
                >
                  ×
                </button>
              </span>
            )}
            {hasActiveFilters && (
              <button
                onClick={clearFilters}
                className="text-xs text-fg-muted underline underline-offset-2 hover:text-fg transition-colors"
              >
                Clear all
              </button>
            )}

            <div className="ml-auto flex items-center gap-3">
              {!isLoading && (
                <span className="text-sm text-fg-muted">
                  {total.toLocaleString()} {total === 1 ? "place" : "places"}
                </span>
              )}
              <Select value={sort ?? "Newest"} onValueChange={setSort}>
                <SelectTrigger className="w-44 h-9 rounded-full text-sm border-border bg-white shadow-sm">
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
        )}

        {/* Grid */}
        {isLoading ? (
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-x-4 gap-y-6">
            {Array.from({ length: PAGE_SIZE }).map((_, i) => <CardSkeleton key={i} />)}
          </div>
        ) : !data?.items.length ? (
          <div className="flex flex-col items-center justify-center py-32 text-center">
            <div className="text-5xl mb-4">🏠</div>
            <p className="text-xl font-semibold text-fg mb-1">No places found</p>
            <p className="text-sm text-fg-muted mb-4">Try adjusting your filters</p>
            {hasActiveFilters && (
              <button
                onClick={clearFilters}
                className="text-sm font-semibold text-fg underline underline-offset-2 hover:text-fg-muted transition-colors"
              >
                Clear filters
              </button>
            )}
          </div>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-x-4 gap-y-6">
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
                    p === page ? "bg-fg text-white" : "text-fg-muted hover:bg-bg hover:text-fg",
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
    </>
  );
}
