import { useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { Search, BedDouble, Bath, Users, Zap, ChevronLeft, ChevronRight, Heart } from "lucide-react";
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

function WishHeart({ id }: { id: string }) {
  const KEY = "pmc_wishlist";
  const saved = (): string[] => JSON.parse(localStorage.getItem(KEY) ?? "[]");
  const [on, setOn] = useState(() => saved().includes(id));
  function toggle(e: React.MouseEvent) {
    e.preventDefault(); e.stopPropagation();
    const list = saved();
    const next = on ? list.filter((x) => x !== id) : [...list, id];
    localStorage.setItem(KEY, JSON.stringify(next));
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

function ListingCard({ listing, idx }: { listing: MarketplaceListingPreviewDto; idx: number }) {
  const isLT = listing.rentalType === "LongTerm";
  const price = isLT ? (listing.baseMonthlyRate ?? listing.basePrice * 30) : listing.basePrice;
  const photo = listing.coverImageUrl ?? FALLBACKS[idx % FALLBACKS.length];

  return (
    <Link to={`/listings/${listing.id}`} className="group block">
      <div className="relative aspect-[4/3] rounded-xl overflow-hidden bg-bg-subtle mb-3">
        <img
          src={photo}
          alt={listing.title}
          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
          loading="lazy"
        />
        {listing.instantBookEnabled && (
          <div className="absolute top-3 left-3 flex items-center gap-1 bg-brand text-white text-xs font-semibold px-2 py-1 rounded-full">
            <Zap size={10} />Instant
          </div>
        )}
        <div className="absolute top-3 right-3">
          <WishHeart id={listing.id} />
        </div>
      </div>

      <div className="flex items-start justify-between gap-2">
        <div className="flex-1 min-w-0">
          <p className="text-xs text-fg-muted mb-1">{listing.cityName} · {isLT ? "Long-term" : "Short-term"}</p>
          <p className="text-sm font-semibold text-fg line-clamp-2 leading-snug">{listing.title}</p>
          <div className="flex items-center gap-3 mt-1.5 text-xs text-fg-muted">
            {!!listing.bedrooms && <span className="flex items-center gap-1"><BedDouble size={11} />{listing.bedrooms} bd</span>}
            {!!listing.bathrooms && <span className="flex items-center gap-1"><Bath size={11} />{listing.bathrooms} ba</span>}
            {!!listing.maxOccupancy && <span className="flex items-center gap-1"><Users size={11} />{listing.maxOccupancy}</span>}
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
      <Skeleton className="aspect-[4/3] rounded-xl mb-3" />
      <Skeleton className="h-4 w-3/4 mb-2" />
      <Skeleton className="h-3 w-1/2" />
    </div>
  );
}

export function ListingsPage() {
  const [params, setParams] = useSearchParams();
  const cityId       = params.get("cityId")      ? Number(params.get("cityId"))      : undefined;
  const rentalType   = (params.get("rentalType")  as MarketplaceRentalType | null)   ?? undefined;
  const sort         = (params.get("sort")        as MarketplaceSortOrder | null)     ?? undefined;
  const bedrooms     = params.get("bedrooms")     ? Number(params.get("bedrooms"))    : undefined;
  const page         = params.get("page")         ? Number(params.get("page"))        : 1;

  const query = { cityId, rentalType, sort, bedrooms, page, pageSize: PAGE_SIZE };
  const { data, isLoading } = useMarketplaceListings(query);
  const { data: cities } = useMarketplaceCities();

  function set(key: string, val: string | undefined) {
    const next = new URLSearchParams(params);
    if (!val) next.delete(key);
    else next.set(key, val);
    next.delete("page");
    setParams(next);
  }

  function setPage(p: number) {
    const next = new URLSearchParams(params);
    next.set("page", String(p));
    setParams(next);
  }

  const total = data?.totalCount ?? 0;
  const totalPages = data?.totalPages ?? 1;

  return (
    <div className="min-h-screen bg-bg">
      {/* Hero */}
      <div
        className="relative h-64 md:h-80 overflow-hidden"
        style={{ background: "linear-gradient(135deg, #1a1a1a 0%, #3a2a1a 100%)" }}
      >
        <img
          src="https://images.unsplash.com/photo-1528181304800-259b08848526?auto=format&fit=crop&w=2000&h=1200&q=80"
          alt="Chiang Mai"
          className="absolute inset-0 w-full h-full object-cover opacity-40"
        />
        <div className="relative z-10 flex flex-col items-center justify-center h-full px-4 text-center">
          <p className="text-xs font-semibold text-brand uppercase tracking-widest mb-2">Siamo · Thailand Rentals</p>
          <h1 className="text-3xl md:text-4xl font-bold text-white mb-2">Find your place in Thailand</h1>
          <p className="text-white/70 text-sm">Long-term rentals in Chiang Mai and beyond</p>
        </div>
      </div>

      <div className="max-w-[var(--container)] mx-auto px-4 md:px-6 py-8">
        {/* Filter bar */}
        <div className="flex flex-wrap items-center gap-3 mb-8">
          <div className="flex items-center gap-2 flex-1 min-w-48 bg-bg-card border border-border rounded-pill px-4 py-2 shadow-card">
            <Search size={14} className="text-fg-muted shrink-0" />
            <select
              className="flex-1 bg-transparent text-sm text-fg outline-none appearance-none cursor-pointer"
              value={cityId ?? ""}
              onChange={(e) => set("cityId", e.target.value || undefined)}
            >
              <option value="">All cities</option>
              {(cities ?? []).map((c) => (
                <option key={c.id} value={c.id}>{c.name.en}</option>
              ))}
            </select>
          </div>

          <Select value={rentalType ?? "all"} onValueChange={(v) => set("rentalType", v === "all" ? undefined : v)}>
            <SelectTrigger className="w-36 rounded-pill bg-bg-card border-border shadow-card">
              <SelectValue placeholder="Type" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All types</SelectItem>
              <SelectItem value="LongTerm">Long-term</SelectItem>
              <SelectItem value="ShortTerm">Short-term</SelectItem>
            </SelectContent>
          </Select>

          <Select value={bedrooms ? String(bedrooms) : "any"} onValueChange={(v) => set("bedrooms", v === "any" ? undefined : v)}>
            <SelectTrigger className="w-32 rounded-pill bg-bg-card border-border shadow-card">
              <SelectValue placeholder="Beds" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="any">Any beds</SelectItem>
              {[1, 2, 3, 4, 5].map((n) => <SelectItem key={n} value={String(n)}>{n}+ bd</SelectItem>)}
            </SelectContent>
          </Select>

          <Select value={sort ?? "Newest"} onValueChange={(v) => set("sort", v === "Newest" ? undefined : v)}>
            <SelectTrigger className="w-36 rounded-pill bg-bg-card border-border shadow-card">
              <SelectValue placeholder="Sort" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="Newest">Newest</SelectItem>
              <SelectItem value="PriceAsc">Price: low→high</SelectItem>
              <SelectItem value="PriceDesc">Price: high→low</SelectItem>
            </SelectContent>
          </Select>

          {(cityId || rentalType || bedrooms || sort) && (
            <button
              className="text-sm text-fg-muted hover:text-fg transition-colors"
              onClick={() => setParams({})}
            >
              Clear
            </button>
          )}

          {!isLoading && (
            <span className="ml-auto text-sm text-fg-muted">{total} listing{total !== 1 ? "s" : ""}</span>
          )}
        </div>

        {/* Grid */}
        {isLoading ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
            {Array.from({ length: PAGE_SIZE }).map((_, i) => <CardSkeleton key={i} />)}
          </div>
        ) : !data?.items.length ? (
          <div className="flex flex-col items-center justify-center py-24 text-center">
            <div className="text-5xl mb-4">🏠</div>
            <p className="text-lg font-semibold text-fg mb-1">No listings found</p>
            <p className="text-sm text-fg-muted">Try adjusting your filters</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
            {data.items.map((listing, idx) => (
              <ListingCard key={listing.id} listing={listing} idx={(page - 1) * PAGE_SIZE + idx} />
            ))}
          </div>
        )}

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="flex items-center justify-center gap-2 mt-10">
            <Button
              variant="outline"
              size="sm"
              className="rounded-pill"
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
                    "w-8 h-8 rounded-full text-sm font-medium transition-colors",
                    p === page
                      ? "bg-brand text-white"
                      : "text-fg-muted hover:text-fg hover:bg-bg-subtle",
                  )}
                >
                  {p}
                </button>
              );
            })}
            <Button
              variant="outline"
              size="sm"
              className="rounded-pill"
              disabled={page >= totalPages}
              onClick={() => setPage(page + 1)}
            >
              <ChevronRight size={14} />
            </Button>
          </div>
        )}
      </div>
    </div>
  );
}
