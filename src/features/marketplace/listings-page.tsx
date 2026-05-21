import { useState, useMemo, useRef, useEffect } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { SlidersHorizontal, X } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import { useMarketplaceListings, useMarketplaceCities } from "@/lib/hooks/use-marketplace";
import { useAmenities } from "@/lib/hooks/use-references";
import { amenityIcon } from "@/lib/utils/amenity-icons";
import { formatThb } from "@/lib/utils/format";
import type { MarketplaceListingPreviewDto, MarketplaceSortOrder } from "@/lib/types/marketplace";
import { cn } from "@/lib/utils/cn";

const PAGE_SIZE = 12;

// Property category labels from /api/references/property-categories
const CATEGORY_LABEL: Record<number, string> = {
  1: "Apartment", 2: "House",    3: "Villa",     4: "Townhouse",
  5: "Loft",      6: "Condo",    7: "Cabin",      8: "Bungalow",
  9: "Cottage",  10: "Farm stay",11: "Dome",      12: "Tiny home",
  13: "Treehouse",14: "Boat",   15: "Yurt",
};

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
    localStorage.setItem(KEY, JSON.stringify(on ? saved().filter((x) => x !== id) : [...saved(), id]));
    setOn(!on);
  }
  return (
    <button
      onClick={toggle}
      className="absolute top-3 right-3 w-8 h-8 flex items-center justify-center rounded-full active:scale-90 transition-transform"
    >
      <svg viewBox="0 0 32 32" xmlns="http://www.w3.org/2000/svg" aria-hidden="true" focusable="false"
        style={{ display: "block", height: 26, width: 26, overflow: "visible",
          fill: on ? "#ff385c" : "rgba(0,0,0,0.5)",
          stroke: on ? "#ff385c" : "white",
          strokeWidth: 2,
        }}>
        <path d="m15.9998 28.6668c7.1667-4.8847 14.3334-10.8844 14.3334-18.1088 0-1.84951-.6993-3.69794-2.0988-5.10877-1.3996-1.4098-3.2332-2.11573-5.0679-2.11573-1.8336 0-3.6683.70593-5.0668 2.11573l-2.0999 2.11677-2.0988-2.11677c-1.3995-1.4098-3.2332-2.11573-5.06783-2.11573-1.83364 0-3.66831.70593-5.06683 2.11573-1.39955 1.41083-2.09984 3.25926-2.09984 5.10877 0 7.2244 7.16667 13.2241 14.3333 18.1088z" />
      </svg>
    </button>
  );
}



// ─── Listing card ─────────────────────────────────────────────────────────────

function ListingCard({
  listing,
  idx,
  durationMonths,
  style,
}: {
  listing: MarketplaceListingPreviewDto;
  idx: number;
  durationMonths?: number;
  style?: React.CSSProperties;
}) {
  const baseRate = listing.monthlyRate || listing.baseMonthlyRate || listing.basePrice || 0;

  const effectiveRate = (() => {
    if (!durationMonths || !listing.discountTiers?.length) return baseRate;
    const sorted = [...listing.discountTiers].sort((a, b) => b.minMonths - a.minMonths);
    const tier = sorted.find((t) => durationMonths >= t.minMonths);
    return tier ? Math.round(baseRate * (1 - tier.discountPercent / 100)) : baseRate;
  })();

  const hasDiscount = effectiveRate < baseRate;
  const discountPct = hasDiscount
    ? (listing.discountTiers?.find((t) => durationMonths && durationMonths >= t.minMonths)?.discountPercent ?? 0)
    : 0;
  const bestTier = listing.discountTiers?.length
    ? [...listing.discountTiers].sort((a, b) => b.discountPercent - a.discountPercent)[0]
    : null;

  // Title: "[type] in [city]" — Airbnb style
  const city = listing.cityName || "Thailand";
  const typeLabel = listing.bedrooms === 0
    ? "Studio"
    : CATEGORY_LABEL[listing.propertyCategoryId] ?? "Home";
  const cardTitle = `${typeLabel} in ${city}`;

  // Price line: "฿12,300 for month · ★ New"  or  "฿10,000 for month  (was ฿12,300)"
  const priceLabel = hasDiscount
    ? `${formatThb(effectiveRate)} for month`
    : `${formatThb(effectiveRate)} for month`;

  // Badge — white pill, like Airbnb's "Guest favorite"
  const badge = hasDiscount
    ? `-${discountPct}% off`
    : bestTier
    ? `Save up to ${bestTier.discountPercent}%`
    : null;

  const photo = listing.coverImageUrl ?? FALLBACKS[idx % FALLBACKS.length];

  return (
    <Link to={`/listings/${listing.id}`} className="group block" style={style}>

      {/* Photo — no zoom, exact Airbnb style */}
      <div className="relative aspect-square rounded-2xl overflow-hidden bg-bg-subtle">
        <img
          src={photo}
          alt={listing.title}
          className="w-full h-full object-cover"
          loading="lazy"
        />

        {/* White pill badge — top left */}
        {badge && (
          <div className="absolute top-3 left-3 bg-bg-card text-fg text-[12px] font-semibold px-3 py-1.5 rounded-full shadow-sm leading-none">
            {badge}
          </div>
        )}

        <WishHeart id={listing.id} />
      </div>

      {/* Info — exact Airbnb layout */}
      <div className="mt-2 px-0.5">
        {/* Line 1: regular weight, dark gray — NOT bold */}
        <p className="text-[12px] font-semibold text-fg leading-snug line-clamp-1">
          {cardTitle}
        </p>

        {/* Line 2: slightly smaller, muted gray */}
        <p className="text-[11px] text-fg-muted leading-snug mt-0.5">
          {hasDiscount ? (
            <>
              <span className="line-through">{formatThb(baseRate)}</span>
              {" "}{formatThb(effectiveRate)}{" for month"}
            </>
          ) : (
            <>{priceLabel}</>
          )}
          {" · ★ New"}
        </p>
      </div>
    </Link>
  );
}

// ─── Filter bar ───────────────────────────────────────────────────────────────

// Top 3 pinned by amenity id (pool=23, parking=26, gym=30)
// When pet-friendly is added to DB, prepend its id here
const PINNED_IDS = [31, 23, 26]; // Pet-friendly, Pool, Parking

// Full priority order — amenity IDs sorted by how commonly users search for them
// Pet-friendly (missing in DB) goes first once added
const AMENITY_PRIORITY: number[] = [
  31, // Pet-friendly
  23, // Pool
  26, // Free parking
  30, // Gym
   9, // Air conditioning
   2, // Wi-Fi
  11, // Washer
   4, // Kitchen
  24, // Patio or balcony
   3, // Dedicated workspace
  27, // EV charger
  25, // BBQ grill
  18, // TV
   8, // Coffee maker
   5, // Refrigerator
  12, // Dryer
  13, // Iron
  15, // Hair dryer
   6, // Microwave
   7, // Dishwasher
  28, // Oven
  29, // Stove
  10, // Heating
  17, // Hot water
   1, // Essentials
  14, // Hangers
  16, // Shampoo
  19, // Smoke alarm
  20, // Carbon monoxide alarm
  21, // Fire extinguisher
  22, // First aid kit
];

const BEDROOM_OPTIONS = [
  { label: "Any",    value: undefined as number | undefined },
  { label: "Studio", value: 0 },
  { label: "1",      value: 1 },
  { label: "2",      value: 2 },
  { label: "3+",     value: 3 },
];

function FilterBar({
  activeAmenityIds,
  onToggleAmenity,
  activeBedrooms,
  onSetBedrooms,
}: {
  activeAmenityIds: number[];
  onToggleAmenity: (id: number) => void;
  activeBedrooms?: number;
  onSetBedrooms: (v: number | undefined) => void;
}) {
  const { data: allAmenities } = useAmenities();
  const [panelOpen, setPanelOpen] = useState(false);
  const wrapRef = useRef<HTMLDivElement>(null);

  // Close on outside click
  useEffect(() => {
    if (!panelOpen) return;
    function handler(e: MouseEvent) {
      if (wrapRef.current && !wrapRef.current.contains(e.target as Node)) {
        setPanelOpen(false);
      }
    }
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [panelOpen]);

  const pinned = useMemo(() => {
    if (!allAmenities?.length) return [];
    return PINNED_IDS.flatMap((id) => {
      const a = allAmenities.find((x) => x.id === id);
      return a ? [a] : [];
    });
  }, [allAmenities]);

  const panelAmenities = useMemo(() => {
    if (!allAmenities?.length) return [];
    const byId = new Map(allAmenities.map((a) => [a.id as number, a]));
    // Prioritised first
    const result = AMENITY_PRIORITY.flatMap((id) => {
      const a = byId.get(id);
      return a ? [a] : [];
    });
    // Any unknown/new amenities from DB appended at the end
    const seen = new Set(AMENITY_PRIORITY);
    for (const a of allAmenities) {
      if (!seen.has(a.id as number)) result.push(a);
    }
    return result;
  }, [allAmenities]);

  // Count of "extra" active filters (amenities not pinned + non-default bedrooms)
  const extraActive =
    activeAmenityIds.filter((id) => !pinned.some((p) => p.id === id)).length +
    (activeBedrooms !== undefined ? 1 : 0);

  const pillBase =
    "shrink-0 whitespace-nowrap text-[12px] font-medium transition-colors duration-150 cursor-pointer";

  return (
    <div ref={wrapRef} className="relative">
      {/* ── Main bar ── */}
      <div className="overflow-x-auto" style={{ scrollbarWidth: "none" }}>
        <style>{`.filter-bar::-webkit-scrollbar{display:none}`}</style>
        <div className="filter-bar flex items-center gap-1.5 w-max">

          {/* Pinned amenities */}
          {pinned.map((amenity) => {
            const Icon = amenityIcon(amenity.name);
            const active = activeAmenityIds.includes(amenity.id as number);
            return (
              <button
                key={amenity.id as number}
                onClick={() => onToggleAmenity(amenity.id as number)}
                className={cn(
                  pillBase,
                  "px-3 py-1.5 rounded-full border flex items-center gap-1.5",
                  active
                    ? "border-fg bg-fg text-bg-card"
                    : "border-transparent bg-bg-subtle text-fg-muted hover:text-fg hover:border-fg/20",
                )}
              >
                {Icon && <Icon size={11} className="shrink-0" strokeWidth={2} />}
                {amenity.name}
              </button>
            );
          })}

          {pinned.length > 0 && <span className="mx-1 h-4 w-px bg-border shrink-0" />}

          {/* More filters button */}
          <button
            onClick={() => setPanelOpen((v) => !v)}
            className={cn(
              pillBase,
              "px-3 py-1.5 rounded-full border flex items-center gap-1.5",
              panelOpen || extraActive > 0
                ? "border-fg bg-fg text-bg-card"
                : "border-border bg-bg-card text-fg-muted hover:text-fg hover:border-fg/30",
            )}
          >
            <SlidersHorizontal size={11} strokeWidth={2.2} />
            Filters
            {extraActive > 0 && (
              <span className={cn(
                "inline-flex items-center justify-center w-4 h-4 rounded-full text-[10px] font-bold leading-none",
                panelOpen ? "bg-white text-fg" : "bg-brand text-white",
              )}>
                {extraActive}
              </span>
            )}
          </button>
        </div>
      </div>

      {/* ── Expanded panel ── */}
      {panelOpen && (
        <div className="absolute left-0 top-[calc(100%+8px)] z-50 w-[min(520px,calc(100vw-2rem))] bg-bg-card rounded-2xl shadow-[0_8px_40px_rgba(0,0,0,0.14)] border border-border overflow-hidden">
          {/* Header */}
          <div className="flex items-center justify-between px-5 py-4 border-b border-border">
            <span className="text-sm font-semibold text-fg">Filters</span>
            <button
              onClick={() => setPanelOpen(false)}
              className="w-7 h-7 rounded-full flex items-center justify-center text-fg-muted hover:bg-bg-subtle transition-colors"
            >
              <X size={14} />
            </button>
          </div>

          <div className="px-5 py-4 space-y-5 max-h-[70vh] overflow-y-auto">
            {/* Bedrooms */}
            <div>
              <p className="text-xs font-semibold text-fg-muted uppercase tracking-wide mb-2.5">Bedrooms</p>
              <div className="flex flex-wrap gap-2">
                {BEDROOM_OPTIONS.map(({ label, value }, i) => {
                  const active = activeBedrooms === value;
                  return (
                    <button
                      key={i}
                      onClick={() => onSetBedrooms(active ? undefined : value)}
                      className={cn(
                        "px-4 py-1.5 rounded-full border text-[12px] font-medium transition-colors",
                        active
                          ? "border-fg bg-fg text-bg-card"
                          : "border-border text-fg-muted hover:text-fg hover:border-fg/30",
                      )}
                    >
                      {label === "Any" ? "Any" : label === "Studio" ? "Studio" : `${label} BR`}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Amenities */}
            <div>
              <p className="text-xs font-semibold text-fg-muted uppercase tracking-wide mb-2.5">Amenities</p>
              <div className="flex flex-wrap gap-2">
                {panelAmenities.map((amenity) => {
                  const Icon = amenityIcon(amenity.name);
                  const active = activeAmenityIds.includes(amenity.id as number);
                  return (
                    <button
                      key={amenity.id as number}
                      onClick={() => onToggleAmenity(amenity.id as number)}
                      className={cn(
                        "px-3 py-1.5 rounded-full border text-[12px] font-medium flex items-center gap-1.5 transition-colors",
                        active
                          ? "border-fg bg-fg text-bg-card"
                          : "border-border text-fg-muted hover:text-fg hover:border-fg/30",
                      )}
                    >
                      {Icon && <Icon size={11} className="shrink-0" strokeWidth={2} />}
                      {amenity.name}
                    </button>
                  );
                })}
              </div>
            </div>
          </div>

          {/* Footer */}
          {(activeAmenityIds.length > 0 || activeBedrooms !== undefined) && (
            <div className="px-5 py-3 border-t border-border flex justify-end">
              <button
                onClick={() => {
                  activeAmenityIds.forEach((id) => onToggleAmenity(id));
                  onSetBedrooms(undefined);
                }}
                className="text-xs font-medium text-fg-muted hover:text-fg underline underline-offset-2 transition-colors"
              >
                Clear all filters
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

const SHIMMER_CSS = `
@keyframes shimmer {
  0%   { background-position: -600px 0; }
  100% { background-position:  600px 0; }
}
.shimmer {
  background: linear-gradient(
    90deg,
    rgb(var(--color-bg-subtle)) 0%,
    rgb(var(--color-bg-subtle)) 35%,
    color-mix(in srgb, rgb(var(--color-fg)) 7%, rgb(var(--color-bg-subtle))) 50%,
    rgb(var(--color-bg-subtle)) 65%,
    rgb(var(--color-bg-subtle)) 100%
  );
  background-size: 600px 100%;
  animation: shimmer 1.6s ease-in-out infinite;
}
`;

function ShimmerCard() {
  return (
    <div>
      <div className="shimmer aspect-square rounded-2xl mb-3" />
      <div className="space-y-2">
        <div className="shimmer h-[13px] w-3/5 rounded-full" />
        <div className="shimmer h-[12px] w-4/5 rounded-full" />
        <div className="shimmer h-[12px] w-2/5 rounded-full" />
      </div>
    </div>
  );
}

function ScrollSentinel({ onVisible }: { onVisible: () => void }) {
  const ref = useRef<HTMLDivElement>(null);
  const fired = useRef(false);

  useEffect(() => {
    fired.current = false;
    const el = ref.current;
    if (!el) return;
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting && !fired.current) {
          fired.current = true;
          onVisible();
        }
      },
      { rootMargin: "150px" },
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, [onVisible]);

  return <div ref={ref} className="h-px" />;
}

function CardSkeleton() {
  return (
    <div>
      <Skeleton className="aspect-square rounded-2xl mb-3" />
      <div className="space-y-1.5">
        <Skeleton className="h-[14px] w-2/3 rounded-full" />
        <Skeleton className="h-[13px] w-3/4 rounded-full" />
        <Skeleton className="h-[13px] w-1/3 rounded-full" />
      </div>
    </div>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export function ListingsPage() {
  const [params, setParams] = useSearchParams();

  const cityId         = params.get("cityId")         ? Number(params.get("cityId"))         : undefined;
  const moveInFrom     = params.get("moveInFrom")     ?? undefined;
  const durationMonths = params.get("durationMonths") ? Number(params.get("durationMonths")) : undefined;
  const sort           = (params.get("sort") as MarketplaceSortOrder | null) ?? undefined;
  const amenityIds     = params.getAll("amenity").map(Number).filter(Boolean);
  const bedrooms       = params.get("bedrooms") !== null ? Number(params.get("bedrooms")) : undefined;

  // Internal page counter — not in URL, resets when filters change
  const [page, setPage] = useState(1);
  const [allItems, setAllItems] = useState<MarketplaceListingPreviewDto[]>([]);

  // Reset accumulated items + page whenever filters/sort change
  const filterKey = JSON.stringify({ cityId, moveInFrom, durationMonths, amenityIds, bedrooms, sort });
  const prevFilterKey = useRef(filterKey);
  if (prevFilterKey.current !== filterKey) {
    prevFilterKey.current = filterKey;
    if (page !== 1) setPage(1);
    setAllItems([]);
  }

  const { data, isLoading, isFetching } = useMarketplaceListings({
    cityId, moveInFrom, durationMonths, sort, page, pageSize: PAGE_SIZE,
    amenityIds: amenityIds.length ? amenityIds : undefined,
    bedrooms,
  });
  const { data: cities } = useMarketplaceCities();

  // Accumulate items as pages load
  useEffect(() => {
    if (!data?.items.length) return;
    if (page === 1) {
      setAllItems(data.items);
    } else {
      setAllItems((prev) => {
        const ids = new Set(prev.map((x) => x.id));
        return [...prev, ...data.items.filter((x) => !ids.has(x.id))];
      });
    }
  }, [data]);

  const hasMore = data ? page < data.totalPages : false;

  function set(key: string, val: string) {
    const next = new URLSearchParams(params);
    if (!val) next.delete(key); else next.set(key, val);
    setParams(next);
  }

  function toggleAmenity(id: number) {
    const next = new URLSearchParams(params);
    const current = next.getAll("amenity").map(Number);
    next.delete("amenity");
    const updated = current.includes(id) ? current.filter((x) => x !== id) : [...current, id];
    updated.forEach((v) => next.append("amenity", String(v)));
    setParams(next);
  }

  function setSort(v: string) { set("sort", v); }
  function clearFilters() { setParams(new URLSearchParams()); }
  const hasFilters = !!(cityId || moveInFrom || durationMonths || amenityIds.length || bedrooms !== undefined);

  function setBedrooms(v: number | undefined) {
    const next = new URLSearchParams(params);
    next.delete("page");
    if (v === undefined) next.delete("bedrooms"); else next.set("bedrooms", String(v));
    setParams(next);
  }

  return (
    <div className="w-full px-4 md:px-8 lg:px-12 py-6">

      {/* ─── Filter bar ─── */}
      <div className="mb-5">
        <FilterBar
          activeAmenityIds={amenityIds}
          onToggleAmenity={toggleAmenity}
          activeBedrooms={bedrooms}
          onSetBedrooms={setBedrooms}
        />
      </div>

      {/* ─── Toolbar ─── */}
      {(hasFilters || (!isLoading && !!data)) && (
        <div className="flex items-center gap-2 mb-3 flex-wrap">
          {!isLoading && !!data?.items.length && (
            <h2 style={{ fontSize: "21px", fontWeight: 600, letterSpacing: "-0.025rem", lineHeight: "25px" }} className="text-fg mr-2">
              Stay in {cities?.find((c) => c.id === cityId)?.name.en ?? "Thailand"}
            </h2>
          )}
          {cityId && (
            <span className="inline-flex items-center gap-1 text-xs font-medium bg-fg text-bg-card px-3 py-1.5 rounded-full">
              {cities?.find((c) => c.id === cityId)?.name.en ?? `City ${cityId}`}
              <button onClick={() => set("cityId", "")} className="hover:opacity-70 ml-0.5">×</button>
            </span>
          )}
          {durationMonths && (
            <span className="inline-flex items-center gap-1 text-xs font-medium bg-fg text-bg-card px-3 py-1.5 rounded-full">
              {durationMonths} month{durationMonths !== 1 ? "s" : ""}
              <button onClick={() => set("durationMonths", "")} className="hover:opacity-70 ml-0.5">×</button>
            </span>
          )}
          {moveInFrom && (
            <span className="inline-flex items-center gap-1 text-xs font-medium bg-fg text-bg-card px-3 py-1.5 rounded-full">
              From {new Date(moveInFrom + "T00:00:00").toLocaleDateString("en-US", { month: "short", day: "numeric" })}
              <button onClick={() => set("moveInFrom", "")} className="hover:opacity-70 ml-0.5">×</button>
            </span>
          )}
          {hasFilters && (
            <button onClick={clearFilters} className="text-xs text-fg-muted underline underline-offset-2 hover:text-fg transition-colors">
              Clear all
            </button>
          )}
          <div className="ml-auto flex items-center gap-5">
            <div className="flex items-center gap-4">
              {([
                { label: "Recommended", value: "" },
                { label: "Price ↑", value: "PriceAsc" },
                { label: "Price ↓", value: "PriceDesc" },
              ] as const).map(({ label, value }) => {
                const active = (sort ?? "") === value;
                return (
                  <button
                    key={value}
                    onClick={() => setSort(value === "" ? "Newest" : value)}
                    className={cn(
                      "text-xs transition-colors duration-150 pb-0.5",
                      active
                        ? "text-fg font-semibold border-b-2 border-fg"
                        : "text-fg-muted hover:text-fg border-b-2 border-transparent",
                    )}
                  >
                    {label}
                  </button>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {/* ─── Grid ─── */}
      {isLoading && page === 1 ? (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-x-4 gap-y-7">
          {Array.from({ length: PAGE_SIZE }).map((_, i) => <CardSkeleton key={i} />)}
        </div>
      ) : !allItems.length ? (
        <div className="flex flex-col items-center justify-center py-32 text-center">
          <p className="text-6xl mb-5">🏠</p>
          <p className="text-xl font-semibold text-fg mb-2">No places found</p>
          <p className="text-sm text-fg-muted mb-5">Try adjusting your filters or move-in date</p>
          {hasFilters && (
            <Button variant="outline" onClick={clearFilters} className="rounded-full">
              Clear filters
            </Button>
          )}
        </div>
      ) : (
        <>
          <style>{`
            @keyframes cardIn{from{opacity:0;transform:translateY(8px)}to{opacity:1;transform:translateY(0)}}
            ${SHIMMER_CSS}
          `}</style>
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-x-4 gap-y-7">
            {allItems.map((listing, idx) => (
              <ListingCard
                key={listing.id}
                listing={listing}
                idx={idx}
                durationMonths={durationMonths}
                style={{ animation: "cardIn 0.3s ease both", animationDelay: `${Math.min(idx, 11) * 35}ms` }}
              />
            ))}
            {isFetching && page > 1 && Array.from({ length: PAGE_SIZE }).map((_, i) => (
              <ShimmerCard key={`shim-${i}`} />
            ))}
          </div>

          {/* Infinite scroll sentinel — sits below visible cards */}
          {hasMore && !isFetching && <ScrollSentinel onVisible={() => setPage((p) => p + 1)} />}
        </>
      )}

    </div>
  );
}
