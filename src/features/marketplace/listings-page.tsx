import { useState, useMemo, useRef, useEffect } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { SlidersHorizontal, X } from "lucide-react";
import { useTranslation } from "react-i18next";
import { Skeleton } from "@/components/ui/skeleton";

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

  // Badge — white pill, like Airbnb's "Guest favorite"
  const badge = hasDiscount
    ? `-${discountPct}% off`
    : bestTier
    ? `Save up to ${bestTier.discountPercent}%`
    : null;

  const photo = listing.coverImageUrl ?? FALLBACKS[idx % FALLBACKS.length];

  return (
    <Link to={`/listings/${listing.id}`} className="group block" style={style}>

      {/* Photo */}
      <div className="relative aspect-square rounded-[18px] overflow-hidden" style={{ background: "var(--color-bg-subtle)" }}>
        <img
          src={photo}
          alt={listing.title}
          className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-[1.03]"
          loading="lazy"
        />

        {/* White pill badge — top left */}
        {badge && (
          <div className="absolute top-3 left-3 bg-white text-[#171412] text-[11px] font-bold px-2.5 py-1 rounded-full shadow-[0_2px_8px_rgba(0,0,0,0.15)] leading-none tracking-tight">
            {badge}
          </div>
        )}

        <WishHeart id={listing.id} />
      </div>

      {/* Info */}
      <div className="mt-2.5 px-0.5">
        <p className="text-[13px] font-semibold leading-snug line-clamp-1" style={{ color: "#171412" }}>
          {cardTitle}
        </p>
        <p className="text-[12px] leading-snug mt-0.5" style={{ color: "#6b6560" }}>
          {hasDiscount ? (
            <>
              <span className="line-through opacity-60">{formatThb(baseRate)}</span>
              {" "}
              <span style={{ color: "#171412", fontWeight: 600 }}>{formatThb(effectiveRate)}</span>
              {" / mo"}
            </>
          ) : (
            <>
              <span style={{ color: "#171412", fontWeight: 600 }}>{formatThb(effectiveRate)}</span>
              {" / mo"}
            </>
          )}
          <span className="ml-1.5" style={{ color: "#B0AAA4" }}>· ★ New</span>
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
    "shrink-0 whitespace-nowrap text-[12px] font-medium transition-all duration-150 cursor-pointer";

  const pillInactive = cn(
    pillBase,
    "px-3 py-1.5 rounded-full border flex items-center gap-1.5",
    "bg-white text-[#6b6560] hover:text-[#171412] hover:border-[#171412]/30 hover:shadow-sm",
  );
  const pillActive = cn(
    pillBase,
    "px-3 py-1.5 rounded-full border flex items-center gap-1.5",
    "border-[#171412] bg-[#171412] text-white shadow-sm",
  );

  return (
    <div ref={wrapRef} className="relative">
      {/* ── Main bar ── */}
      <div className="overflow-x-auto" style={{ scrollbarWidth: "none" }}>
        <style>{`.filter-bar::-webkit-scrollbar{display:none}`}</style>
        <div className="filter-bar flex items-center gap-2 w-max">

          {/* Pinned amenities */}
          {pinned.map((amenity) => {
            const Icon = amenityIcon(amenity.name);
            const active = activeAmenityIds.includes(amenity.id as number);
            return (
              <button
                key={amenity.id as number}
                onClick={() => onToggleAmenity(amenity.id as number)}
                style={{ borderColor: active ? "#171412" : "var(--color-border)" }}
                className={active ? pillActive : pillInactive}
              >
                {Icon && <Icon size={11} className="shrink-0" strokeWidth={2} />}
                {amenity.name}
              </button>
            );
          })}

          {pinned.length > 0 && <span className="mx-0.5 h-4 w-px bg-border shrink-0" />}

          {/* More filters button — always has a visible border */}
          <button
            onClick={() => setPanelOpen((v) => !v)}
            className={cn(
              pillBase,
              "px-3.5 py-1.5 rounded-full border flex items-center gap-1.5",
              panelOpen || extraActive > 0
                ? "border-[#171412] bg-[#171412] text-white shadow-sm"
                : "border-[#171412]/25 bg-white text-[#171412] hover:border-[#171412]/50 hover:shadow-sm",
            )}
          >
            <SlidersHorizontal size={11} strokeWidth={2.2} />
            Filters
            {extraActive > 0 && (
              <span className={cn(
                "inline-flex items-center justify-center w-4 h-4 rounded-full text-[10px] font-bold leading-none",
                panelOpen ? "bg-white text-[#171412]" : "bg-[#009e66] text-white",
              )}>
                {extraActive}
              </span>
            )}
          </button>
        </div>
      </div>

      {/* ── Expanded panel ── */}
      {panelOpen && (
        <div className="absolute left-0 top-[calc(100%+10px)] z-50 w-[min(540px,calc(100vw-2rem))] bg-white rounded-3xl shadow-[0_12px_48px_rgba(23,20,18,0.16)] border overflow-hidden" style={{ borderColor: "var(--color-border)" }}>
          {/* Header */}
          <div className="flex items-center justify-between px-6 py-4 border-b" style={{ borderColor: "var(--color-border)" }}>
            <span className="text-sm font-bold text-[#171412] tracking-tight">Filters</span>
            <button
              onClick={() => setPanelOpen(false)}
              className="w-7 h-7 rounded-full flex items-center justify-center text-[#6b6560] hover:bg-[#f2ede8] transition-colors"
            >
              <X size={14} />
            </button>
          </div>

          <div className="px-6 py-5 space-y-6 max-h-[70vh] overflow-y-auto">
            {/* Bedrooms */}
            <div>
              <p className="text-[11px] font-bold text-[#6b6560] uppercase tracking-[0.12em] mb-3">Bedrooms</p>
              <div className="flex flex-wrap gap-2">
                {BEDROOM_OPTIONS.map(({ label, value }, i) => {
                  const active = activeBedrooms === value;
                  return (
                    <button
                      key={i}
                      onClick={() => onSetBedrooms(active ? undefined : value)}
                      className={cn(
                        "px-4 py-1.5 rounded-full border text-[12px] font-semibold transition-all",
                        active
                          ? "border-[#171412] bg-[#171412] text-white shadow-sm"
                          : "bg-white text-[#6b6560] hover:text-[#171412] hover:border-[#171412]/30",
                      )}
                      style={{ borderColor: active ? "#171412" : "var(--color-border)" }}
                    >
                      {label === "Any" ? "Any" : label === "Studio" ? "Studio" : `${label} BR`}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Amenities */}
            <div>
              <p className="text-[11px] font-bold text-[#6b6560] uppercase tracking-[0.12em] mb-3">Amenities</p>
              <div className="flex flex-wrap gap-2">
                {panelAmenities.map((amenity) => {
                  const Icon = amenityIcon(amenity.name);
                  const active = activeAmenityIds.includes(amenity.id as number);
                  return (
                    <button
                      key={amenity.id as number}
                      onClick={() => onToggleAmenity(amenity.id as number)}
                      className={cn(
                        "px-3 py-1.5 rounded-full border text-[12px] font-medium flex items-center gap-1.5 transition-all",
                        active
                          ? "border-[#171412] bg-[#171412] text-white shadow-sm"
                          : "bg-white text-[#6b6560] hover:text-[#171412] hover:border-[#171412]/30",
                      )}
                      style={{ borderColor: active ? "#171412" : "var(--color-border)" }}
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
            <div className="px-6 py-3.5 flex justify-between items-center" style={{ borderTop: "1px solid var(--color-border)" }}>
              <span className="text-xs text-[#6b6560]">
                {activeAmenityIds.length + (activeBedrooms !== undefined ? 1 : 0)} filter{activeAmenityIds.length + (activeBedrooms !== undefined ? 1 : 0) !== 1 ? "s" : ""} active
              </span>
              <button
                onClick={() => {
                  activeAmenityIds.forEach((id) => onToggleAmenity(id));
                  onSetBedrooms(undefined);
                }}
                className="text-xs font-semibold text-[#171412] hover:text-[#009e66] underline underline-offset-2 transition-colors"
              >
                Clear all
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
    var(--color-bg-subtle) 0%,
    var(--color-bg-subtle) 35%,
    color-mix(in srgb, var(--color-fg) 7%, var(--color-bg-subtle)) 50%,
    var(--color-bg-subtle) 65%,
    var(--color-bg-subtle) 100%
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
  const { t, i18n } = useTranslation();
  const lang = i18n.language as "en" | "th";
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
  void (data?.totalCount ?? 0);

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

  const cityName = cities?.find((c) => c.id === cityId)?.name[lang]
    ?? cities?.find((c) => c.id === cityId)?.name.en
    ?? "Thailand";

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
        <div className="flex items-center gap-2 mb-4 flex-wrap">
          {!isLoading && !!data?.items.length && (
            <h2 className="text-[#171412] mr-2 font-bold tracking-tight" style={{ fontSize: "20px", letterSpacing: "-0.03em", lineHeight: "1.2" }}>
              {t("listing.stayIn", { city: cityName })}
            </h2>
          )}

          {/* Active filter chips */}
          {cityId && (
            <span className="inline-flex items-center gap-1 text-xs font-semibold bg-[#171412] text-white px-3 py-1.5 rounded-full">
              {cityName}
              <button onClick={() => set("cityId", "")} className="hover:opacity-70 ml-0.5 leading-none">×</button>
            </span>
          )}
          {durationMonths && (
            <span className="inline-flex items-center gap-1 text-xs font-semibold bg-[#171412] text-white px-3 py-1.5 rounded-full">
              {durationMonths} month{durationMonths !== 1 ? "s" : ""}
              <button onClick={() => set("durationMonths", "")} className="hover:opacity-70 ml-0.5 leading-none">×</button>
            </span>
          )}
          {moveInFrom && (
            <span className="inline-flex items-center gap-1 text-xs font-semibold bg-[#171412] text-white px-3 py-1.5 rounded-full">
              {new Date(moveInFrom + "T00:00:00").toLocaleDateString("en-US", { month: "short", day: "numeric" })}
              <button onClick={() => set("moveInFrom", "")} className="hover:opacity-70 ml-0.5 leading-none">×</button>
            </span>
          )}
          {hasFilters && (
            <button onClick={clearFilters} className="text-xs font-medium text-[#6b6560] hover:text-[#171412] underline underline-offset-2 transition-colors">
              {t("listing.clearAllFilters")}
            </button>
          )}

          {/* Sort */}
          <div className="ml-auto flex items-center gap-1 rounded-full border p-0.5" style={{ borderColor: "var(--color-border)", background: "var(--color-bg-subtle)" }}>
            {([
              { label: "Best match", value: "" },
              { label: "Price ↑", value: "PriceAsc" },
              { label: "Price ↓", value: "PriceDesc" },
            ] as const).map(({ label, value }) => {
              const active = (sort ?? "") === value;
              return (
                <button
                  key={value}
                  onClick={() => setSort(value === "" ? "Newest" : value)}
                  className={cn(
                    "text-[11px] font-semibold px-3 py-1.5 rounded-full transition-all duration-150",
                    active
                      ? "bg-white text-[#171412] shadow-sm"
                      : "text-[#6b6560] hover:text-[#171412]",
                  )}
                >
                  {label}
                </button>
              );
            })}
          </div>
        </div>
      )}

      {/* ─── Grid ─── */}
      {isLoading && page === 1 ? (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-x-4 gap-y-7">
          {Array.from({ length: PAGE_SIZE }).map((_, i) => <CardSkeleton key={i} />)}
        </div>
      ) : !allItems.length ? (
        <div className="flex flex-col items-center justify-center py-16 text-center">
          {/* Illustration — dark orb with layered property photos */}
          <div className="relative flex items-center justify-center mb-8" style={{ width: 260, height: 260 }}>
            {/* Outer glow */}
            <div className="absolute inset-0 rounded-full" style={{ background: "radial-gradient(circle, rgba(0,158,102,0.15) 0%, transparent 70%)", transform: "scale(1.18)" }} />

            {/* Dark circle base */}
            <div
              className="relative rounded-full overflow-hidden flex items-center justify-center"
              style={{
                width: 240,
                height: 240,
                background: "linear-gradient(160deg, #1a1f2e 0%, #0d1117 60%, #1a1a2e 100%)",
                boxShadow: "0 24px 64px rgba(0,0,0,0.45), 0 4px 16px rgba(0,0,0,0.3)",
              }}
            >
              {/* Stars */}
              {[
                { top: "12%", left: "18%", size: 2.5, opacity: 0.9 },
                { top: "8%",  left: "60%", size: 1.5, opacity: 0.7 },
                { top: "20%", left: "75%", size: 2,   opacity: 0.8 },
                { top: "15%", left: "42%", size: 1.5, opacity: 0.6 },
                { top: "6%",  left: "32%", size: 1,   opacity: 0.5 },
                { top: "22%", left: "55%", size: 1,   opacity: 0.6 },
              ].map((s, i) => (
                <div key={i} className="absolute rounded-full bg-white" style={{ top: s.top, left: s.left, width: s.size, height: s.size, opacity: s.opacity }} />
              ))}

              {/* Main villa image — bottom 65% */}
              <div className="absolute bottom-0 left-0 right-0" style={{ height: "65%" }}>
                <img
                  src="https://images.unsplash.com/photo-1540541338287-41700207dee6?auto=format&fit=crop&w=480&h=320&q=80"
                  alt=""
                  className="w-full h-full object-cover"
                  style={{ objectPosition: "center 30%" }}
                />
                {/* Gradient fade to dark at top */}
                <div className="absolute inset-0" style={{ background: "linear-gradient(to bottom, #0d1117 0%, transparent 40%)" }} />
              </div>

              {/* Small circle — city skyline, top-left */}
              <div
                className="absolute rounded-full overflow-hidden"
                style={{
                  width: 72, height: 72,
                  top: "10%", left: "8%",
                  border: "3px solid #1a1f2e",
                  boxShadow: "0 4px 16px rgba(0,0,0,0.5)",
                }}
              >
                <img
                  src="https://images.unsplash.com/photo-1477959858617-67f85cf4f1df?auto=format&fit=crop&w=150&h=150&q=80"
                  alt=""
                  className="w-full h-full object-cover"
                />
              </div>

              {/* Small circle — mountain/snow, top-right */}
              <div
                className="absolute rounded-full overflow-hidden"
                style={{
                  width: 64, height: 64,
                  top: "8%", right: "10%",
                  border: "3px solid #1a1f2e",
                  boxShadow: "0 4px 16px rgba(0,0,0,0.5)",
                }}
              >
                <img
                  src="https://images.unsplash.com/photo-1520175480921-4edfa2983e0f?auto=format&fit=crop&w=150&h=150&q=80"
                  alt=""
                  className="w-full h-full object-cover"
                />
              </div>

              {/* Lantern accent dots */}
              <div className="absolute" style={{ bottom: "28%", left: "14%", width: 6, height: 6, borderRadius: "50%", background: "#e8a430", boxShadow: "0 0 8px 3px rgba(232,164,48,0.6)" }} />
              <div className="absolute" style={{ bottom: "32%", left: "22%", width: 4, height: 4, borderRadius: "50%", background: "#c0392b", boxShadow: "0 0 6px 2px rgba(192,57,43,0.6)" }} />
              <div className="absolute" style={{ bottom: "26%", right: "16%", width: 5, height: 5, borderRadius: "50%", background: "#2980b9", boxShadow: "0 0 7px 3px rgba(41,128,185,0.6)" }} />
            </div>
          </div>

          <h2
            className="font-bold mb-2.5 tracking-tight"
            style={{ fontSize: "22px", color: "#171412", letterSpacing: "-0.03em" }}
          >
            {t("listing.noPlacesFound")}
          </h2>
          <p className="text-sm leading-relaxed mb-7 max-w-[260px]" style={{ color: "#6b6560" }}>
            {t("listing.tryAdjusting")}
          </p>

          {hasFilters ? (
            <button
              onClick={clearFilters}
              className="rounded-full font-semibold text-sm px-7 h-11 transition-all shadow-sm hover:shadow-md hover:scale-[1.02]"
              style={{ background: "#171412", color: "white" }}
            >
              {t("listing.clearAllFilters")}
            </button>
          ) : (
            <p className="text-sm" style={{ color: "#6b6560" }}>
              {t("listing.noRentalsYet")} —{" "}
              <span className="underline underline-offset-2" style={{ color: "#009e66" }}>
                {t("listing.checkBackSoon")}
              </span>
            </p>
          )}
        </div>
      ) : (
        <>
          <style>{`
            @keyframes cardIn{from{opacity:0;transform:translateY(10px)}to{opacity:1;transform:translateY(0)}}
            ${SHIMMER_CSS}
          `}</style>
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-x-4 gap-y-7">
            {allItems.map((listing, idx) => (
              <ListingCard
                key={listing.id}
                listing={listing}
                idx={idx}
                durationMonths={durationMonths}
                style={{ animation: "cardIn 0.35s cubic-bezier(0.16,1,0.3,1) both", animationDelay: `${Math.min(idx, 11) * 30}ms` }}
              />
            ))}
            {isFetching && page > 1 && Array.from({ length: PAGE_SIZE }).map((_, i) => (
              <ShimmerCard key={`shim-${i}`} />
            ))}
          </div>

          {hasMore && !isFetching && <ScrollSentinel onVisible={() => setPage((p) => p + 1)} />}
        </>
      )}

    </div>
  );
}
