import type React from "react";
import { useSearchParams, Link, useNavigate } from "react-router-dom";
import { useState, useMemo } from "react";
import { useAuthStore } from "@/lib/stores/auth.store";
import {
  Search, MapPin, ChevronLeft, ChevronRight,
  BedDouble, Bath, Users, Zap, Heart, Share2, ChevronDown,
} from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { useMarketplaceListings, useMarketplaceCities } from "@/lib/hooks/use-marketplace";
import { useMe } from "@/lib/hooks/use-auth";
import { formatThb } from "@/lib/utils/format";
import type {
  MarketplaceListingPreviewDto,
  MarketplaceListingsQuery,
  MarketplaceRentalType,
  MarketplaceSortOrder,
  MarketplaceCityDto,
} from "@/lib/types/marketplace";

// ── Design tokens ─────────────────────────────────────────────────────────────
const C = {
  ink:    "#1F1A14", ink2: "#463B2D", ink3: "#7A6E5B", ink4: "#A89B85",
  accent: "#E0945C", primary: "#7A4A2B",
  bg:     "#FFFCF7", surface: "#FFFFFF", surfaceWarm: "#F2E9DA",
  cream:  "#FFF8EC", line: "#E8DFCF",  line2: "#D9CCB4",
  dark:   "#1F1A14", darkFooter: "#0F0B07",
} as const;

const F = {
  serif: "'Fraunces', Georgia, serif",
  sans:  "'Plus Jakarta Sans', system-ui, sans-serif",
  mono:  "'JetBrains Mono', 'Courier New', monospace",
} as const;

// ── Photos ───────────────────────────────────────────────────────────────────
const UNS = (id: string, w = 1200, h = 800) =>
  `https://images.unsplash.com/photo-${id}?auto=format&fit=crop&w=${w}&h=${h}&q=80`;

const HERO_PHOTO   = UNS("1528181304800-259b08848526", 2000, 1200);
const LISTING_FALLBACKS = [
  UNS("1564013799919-ab600027ffc6"),
  UNS("1505691938895-1758d7feb511"),
  UNS("1522708323590-d24dbb6b0267"),
  UNS("1571896349842-33c89424de2d"),
  UNS("1502672260266-1c1ef2d93688"),
  UNS("1540541338287-41700207dee6"),
];
const CITY_PHOTOS: Record<string, string> = {
  "Chiang Mai": UNS("1563492065599-3520f775eeed", 800, 1000),
  "Bangkok":    UNS("1508009603885-50cf7c579365", 800, 1000),
  "Phuket":     UNS("1589394815804-964ed0be2eb5", 800, 1000),
  "Koh Samui":  UNS("1540541338287-41700207dee6", 800, 1000),
  "Ko Samui":   UNS("1540541338287-41700207dee6", 800, 1000),
};
const CITY_COORDS: Record<string, string> = {
  "Chiang Mai": "18.78°N", "Bangkok": "13.75°N",
  "Phuket": "7.88°N", "Koh Samui": "9.51°N", "Ko Samui": "9.51°N",
};
const CITY_SUB: Record<string, string> = {
  "Chiang Mai": "Lanna · highlands · cafés",
  "Bangkok":    "Sukhumvit · river · BTS",
  "Phuket":     "West coast · Patong · Kata",
  "Koh Samui":  "Chaweng · Bophut · Lamai",
  "Ko Samui":   "Chaweng · Bophut · Lamai",
};

// Static fallback city data (shown when API returns 0 cities)
const STATIC_CITIES: MarketplaceCityDto[] = [
  { id: 0, code: "CNX", name: { en: "Chiang Mai" }, latitude: 18.78, longitude: 98.98, activeListingsCount: 0 },
  { id: 0, code: "BKK", name: { en: "Bangkok"    }, latitude: 13.75, longitude: 100.5, activeListingsCount: 0 },
  { id: 0, code: "HKT", name: { en: "Phuket"     }, latitude: 7.88,  longitude: 98.39, activeListingsCount: 0 },
  { id: 0, code: "USM", name: { en: "Koh Samui"  }, latitude: 9.51,  longitude: 100.06, activeListingsCount: 0 },
];

const PAGE_SIZE = 12;

// ── Eyebrow ───────────────────────────────────────────────────────────────────
function Eyebrow({ children, style }: { children: React.ReactNode; style?: React.CSSProperties }) {
  return (
    <div style={{
      fontFamily: F.mono, fontWeight: 500, fontSize: 11,
      letterSpacing: "0.18em", color: C.ink3, textTransform: "uppercase",
      ...style,
    }}>
      {children}
    </div>
  );
}

// ── Wishlist heart ────────────────────────────────────────────────────────────
function WishHeart({ id }: { id: string }) {
  const key = "pmc_wishlist";
  const saved = (): string[] => JSON.parse(localStorage.getItem(key) ?? "[]");
  const [on, setOn] = useState(() => saved().includes(id));
  function toggle(e: React.MouseEvent) {
    e.preventDefault(); e.stopPropagation();
    const list = saved();
    const next = on ? list.filter((x) => x !== id) : [...list, id];
    localStorage.setItem(key, JSON.stringify(next));
    setOn(!on);
  }
  return (
    <button
      onClick={toggle}
      style={{
        width: 32, height: 32, borderRadius: "50%",
        background: "rgba(255,255,255,0.88)", border: "none", cursor: "pointer",
        display: "flex", alignItems: "center", justifyContent: "center",
        backdropFilter: "blur(4px)",
      }}
    >
      <Heart
        size={14}
        fill={on ? C.accent : "none"}
        stroke={on ? C.accent : C.ink}
        strokeWidth={2}
      />
    </button>
  );
}

// ── Catalog card ──────────────────────────────────────────────────────────────
function CatalogCard({ listing, idx }: { listing: MarketplaceListingPreviewDto; idx: number }) {
  const isLT = listing.rentalType === "LongTerm";
  const price = isLT ? (listing.baseMonthlyRate ?? listing.basePrice * 30) : listing.basePrice;
  const photo = listing.coverImageUrl ?? LISTING_FALLBACKS[idx % LISTING_FALLBACKS.length];
  const num   = `N° ${String(idx + 1).padStart(4, "0")}`;

  return (
    <Link to={`/listings/${listing.id}`} className="v2-listing-card" style={{ display: "block", textDecoration: "none", color: "inherit" }}>
      {/* Photo */}
      <div className="v2-card-photo" style={{ position: "relative", aspectRatio: "4/3", overflow: "hidden", marginBottom: 14, background: "#EBDFC8" }}>
        <img src={photo} alt={listing.title} style={{ width: "100%", height: "100%", objectFit: "cover" }} loading="lazy" />
        {/* Instant tag */}
        {listing.instantBookEnabled && (
          <div style={{ position: "absolute", top: 12, left: 12, padding: "5px 9px", background: C.accent, color: C.ink, fontFamily: F.mono, fontWeight: 600, fontSize: 10, letterSpacing: "0.1em", display: "flex", alignItems: "center", gap: 4 }}>
            <Zap size={10} /> INSTANT
          </div>
        )}
        {/* Wishlist */}
        <div style={{ position: "absolute", top: 10, right: 10 }}>
          <WishHeart id={listing.id} />
        </div>
        {/* Reference number */}
        <div style={{ position: "absolute", bottom: 10, left: 12, fontFamily: F.mono, fontWeight: 500, fontSize: 10, color: "rgba(255,255,255,0.85)", letterSpacing: "0.1em" }}>
          {num}
        </div>
      </div>

      {/* Info */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 12 }}>
        <div style={{ flex: 1, minWidth: 0 }}>
          <Eyebrow style={{ marginBottom: 4 }}>
            {listing.cityName?.toUpperCase()} · {isLT ? "LONG-TERM" : "SHORT-TERM"}
          </Eyebrow>
          <div style={{ fontFamily: F.serif, fontSize: 19, lineHeight: 1.25, letterSpacing: "-0.01em", color: C.ink, marginTop: 6 }}>
            {listing.title}
          </div>
          <div style={{ marginTop: 6, fontSize: 12, color: C.ink3, fontFamily: F.sans }}>
            {[listing.bedrooms && `${listing.bedrooms} bd`, listing.bathrooms && `${listing.bathrooms} ba`, listing.maxOccupancy && `${listing.maxOccupancy} guests`].filter(Boolean).join(" · ")}
          </div>
        </div>
        <div style={{ textAlign: "right", flexShrink: 0 }}>
          <div style={{ fontWeight: 700, fontSize: 16, fontFamily: F.sans, color: C.ink }}>{formatThb(price)}</div>
          <div style={{ fontSize: 11, color: C.ink3, fontFamily: F.sans }}>/ {isLT ? "month" : "night"}</div>
        </div>
      </div>
    </Link>
  );
}

// ── Feature card (dark section on home) ───────────────────────────────────────
function FeatureCard({ listing, big, idx }: { listing: MarketplaceListingPreviewDto; big?: boolean; idx: number }) {
  const isLT = listing.rentalType === "LongTerm";
  const price = isLT ? (listing.baseMonthlyRate ?? listing.basePrice * 30) : listing.basePrice;
  const photo = listing.coverImageUrl ?? LISTING_FALLBACKS[idx % LISTING_FALLBACKS.length];

  return (
    <Link
      to={`/listings/${listing.id}`}
      className="v2-feature-card"
      style={{ display: "flex", flexDirection: "column", textDecoration: "none", color: "inherit", gridRow: big ? "span 2" : "auto" }}
    >
      <div className="v2-feature-photo" style={{ position: "relative", aspectRatio: big ? "4/5" : "4/3", overflow: "hidden", marginBottom: 14, flexShrink: 0 }}>
        <img src={photo} alt={listing.title} style={{ width: "100%", height: "100%", objectFit: "cover" }} loading="lazy" />
        {listing.instantBookEnabled && (
          <div style={{ position: "absolute", top: 14, left: 14, padding: "6px 10px", background: C.accent, color: C.ink, fontFamily: F.mono, fontWeight: 600, fontSize: 10, letterSpacing: "0.1em", display: "flex", alignItems: "center", gap: 4 }}>
            <Zap size={11} /> INSTANT BOOK
          </div>
        )}
        <div style={{ position: "absolute", top: 12, right: 12 }}>
          <WishHeart id={listing.id} />
        </div>
        <div style={{ position: "absolute", bottom: 12, left: 14, fontFamily: F.mono, fontWeight: 500, fontSize: 10, color: "rgba(255,255,255,0.85)", letterSpacing: "0.1em" }}>
          N° {String(idx + 1).padStart(4, "0")}
        </div>
      </div>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 12 }}>
        <div style={{ flex: 1, minWidth: 0 }}>
          <Eyebrow style={{ color: "rgba(255,235,200,0.6)", marginBottom: 6 }}>
            {listing.cityName?.toUpperCase()}
          </Eyebrow>
          <div style={{ fontFamily: F.serif, fontSize: big ? 24 : 17, lineHeight: 1.25, letterSpacing: "-0.015em", color: C.cream }}>
            {listing.title}
          </div>
          <div style={{ marginTop: 8, fontSize: 12, color: "rgba(255,235,200,0.5)", fontFamily: F.sans }}>
            {[listing.bedrooms && `${listing.bedrooms} bd`, listing.bathrooms && `${listing.bathrooms} ba`, listing.maxOccupancy && `${listing.maxOccupancy} guests`].filter(Boolean).join(" · ")}
          </div>
        </div>
        <div style={{ textAlign: "right", flexShrink: 0 }}>
          <div style={{ fontWeight: 700, fontSize: big ? 18 : 15, fontFamily: F.sans, color: C.cream }}>{formatThb(price)}</div>
          <div style={{ fontSize: 11, color: "rgba(255,235,200,0.5)", fontFamily: F.sans }}>/ {isLT ? "month" : "night"}</div>
        </div>
      </div>
    </Link>
  );
}

// ── City card ─────────────────────────────────────────────────────────────────
function CityCard({ city, onSelect }: { city: MarketplaceCityDto; onSelect: () => void }) {
  const photo = CITY_PHOTOS[city.name.en] ?? LISTING_FALLBACKS[0];
  const coord = CITY_COORDS[city.name.en] ?? "";
  const sub   = CITY_SUB[city.name.en]   ?? "";
  return (
    <button
      onClick={onSelect}
      className="v2-city-card"
      style={{ background: "none", border: "none", padding: 0, cursor: "pointer", textAlign: "left" }}
    >
      <div style={{ position: "relative", aspectRatio: "4/5", overflow: "hidden", marginBottom: 14 }}>
        <img src={photo} alt={city.name.en} className="v2-city-photo" style={{ width: "100%", height: "100%", objectFit: "cover" }} loading="lazy" />
        {coord && (
          <div style={{ position: "absolute", top: 12, left: 12, fontFamily: F.mono, fontWeight: 500, fontSize: 10, color: "#fff", letterSpacing: "0.1em", mixBlendMode: "difference" }}>
            {coord}
          </div>
        )}
        <div style={{ position: "absolute", bottom: 0, left: 0, right: 0, padding: "20px 16px 14px", background: "linear-gradient(180deg, transparent, rgba(0,0,0,0.6))", color: "#fff" }}>
          <div style={{ display: "flex", alignItems: "baseline", justifyContent: "space-between" }}>
            <span style={{ fontFamily: F.serif, fontSize: 28, lineHeight: 1, letterSpacing: "-0.02em" }}>{city.name.en}</span>
            {city.activeListingsCount > 0 && (
              <span style={{ fontFamily: F.mono, fontWeight: 500, fontSize: 12 }}>{city.activeListingsCount}</span>
            )}
          </div>
        </div>
      </div>
      {sub && <div style={{ fontSize: 12, color: C.ink3, fontFamily: F.sans }}>{sub}</div>}
    </button>
  );
}

// ── Filter group (catalog sidebar) ────────────────────────────────────────────
function FGroup({ title, children, last }: { title: string; children: React.ReactNode; last?: boolean }) {
  return (
    <div style={{ paddingBottom: 22, marginBottom: 22, borderBottom: last ? "none" : `1px solid ${C.line}` }}>
      <Eyebrow style={{ marginBottom: 14 }}>{title}</Eyebrow>
      {children}
    </div>
  );
}

// ── Card skeleton ─────────────────────────────────────────────────────────────
function CardSkeleton() {
  return (
    <div>
      <Skeleton className="rounded-none mb-3" style={{ aspectRatio: "4/3" }} />
      <Skeleton className="h-3 w-1/3 mb-2 rounded-none" />
      <Skeleton className="h-5 w-3/4 mb-1.5 rounded-none" />
      <Skeleton className="h-3 w-1/2 rounded-none" />
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// HOME VIEW
// ── Auth-aware nav buttons ────────────────────────────────────────────────────
function NavAuthButtons({ dark }: { dark?: boolean }) {
  const { token, user } = useAuthStore();
  // useMe fills in the user when Zustand store is empty (e.g. hard refresh)
  const { data: meData } = useMe();
  const resolvedUser = user ?? meData;

  const border = dark
    ? "1px solid rgba(255,255,255,0.4)"
    : `1px solid ${C.ink}`;
  const color  = dark ? "#fff" : C.ink;
  const shared: React.CSSProperties = {
    padding: "9px 16px", border, color, borderRadius: 999,
    fontFamily: F.mono, fontSize: 12, fontWeight: 500,
    textDecoration: "none", letterSpacing: "0.05em",
  };

  if (token) {
    // Resolve portal path from role (use resolvedUser so it works on hard refresh)
    const role  = resolvedUser?.roles?.[0];
    const portal =
      role === "Admin"    ? "/manager" :
      role === "Landlord" ? "/landlord" :
      role === "Tenant"   ? "/tenant"   : "/role-router";
    return (
      <div style={{ display: "flex", gap: 6 }}>
        <Link to={portal} style={{ ...shared, background: dark ? "rgba(255,255,255,0.12)" : C.dark, color: dark ? "#fff" : C.cream, borderColor: "transparent" }}>
          My portal →
        </Link>
      </div>
    );
  }
  return (
    <div style={{ display: "flex", gap: 6 }}>
      <Link to="/login"    style={shared}>Sign in</Link>
      <Link to="/register" style={{ ...shared, background: dark ? "rgba(255,255,255,0.08)" : "transparent" }}>
        List your property
      </Link>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
function HomeView() {
  const navigate = useNavigate();
  const [cityId, setCityId] = useState<number | undefined>();
  const [rentalType, setRentalType] = useState<MarketplaceRentalType | undefined>();

  const { data: cities, isLoading: citiesLoading } = useMarketplaceCities();
  const displayCities = citiesLoading ? undefined : (cities && cities.length > 0 ? cities : STATIC_CITIES);
  const { data: featured, isLoading: featLoading } = useMarketplaceListings({
    pageSize: 5, sort: "Newest",
  });

  function doSearch() {
    const p = new URLSearchParams();
    if (cityId)     p.set("cityId",     String(cityId));
    if (rentalType) p.set("rentalType", rentalType);
    p.set("browse", "1");
    navigate(`/listings?${p.toString()}`);
  }

  function browseCity(id: number) {
    navigate(`/listings?cityId=${id}&browse=1`);
  }

  return (
    <div style={{ background: C.bg, fontFamily: F.sans, color: C.ink, overflowX: "hidden" }}>

      {/* ── HERO (nav lives inside so it overlays the photo) ─────────────── */}
      <section style={{ position: "relative", height: 780, color: "#fff", background: "#1A1410" }}>
        <div style={{ position: "absolute", inset: 0, overflow: "hidden" }}>
          <img src={HERO_PHOTO} alt="" style={{ width: "100%", height: "100%", objectFit: "cover" }} loading="eager" />
          <div style={{ position: "absolute", inset: 0, background: "linear-gradient(180deg, rgba(20,15,10,.55) 0%, rgba(20,15,10,.1) 30%, rgba(20,15,10,.6) 100%)" }} />
        </div>

        {/* NAV — inside hero, overlays photo */}
        <nav style={{ position: "absolute", top: 0, left: 0, right: 0, zIndex: 10, display: "flex", alignItems: "center", justifyContent: "space-between", padding: "20px 40px" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <div style={{ width: 28, height: 28, background: "#fff", borderRadius: 8, display: "flex", alignItems: "center", justifyContent: "center" }}>
              <span style={{ fontWeight: 900, fontSize: 13, color: C.ink }}>P</span>
            </div>
            <span style={{ fontWeight: 700, fontSize: 16, color: "#fff", letterSpacing: "-0.02em" }}>PMC</span>
          </div>
          <NavAuthButtons dark />
        </nav>

        {/* Meta strip */}
        <div style={{ position: "absolute", top: 88, left: 40, right: 40, zIndex: 2, display: "flex", justifyContent: "space-between", fontFamily: F.mono, fontWeight: 500, fontSize: 11, color: "rgba(255,255,255,0.75)", letterSpacing: "0.1em" }}>
          <span>PMC · ISSUE 04 · {new Date().toLocaleString("en", { month: "short", year: "numeric" }).toUpperCase()}</span>
          <span style={{ display: "flex", gap: 24 }}>
            <span>THAILAND</span>
            <span>VERIFIED HOSTS · {featured?.totalCount ?? "—"}</span>
          </span>
        </div>

        {/* Headline */}
        <div style={{ position: "absolute", top: 148, left: 40, right: 40, zIndex: 2 }}>
          <h1 style={{ fontFamily: F.serif, fontWeight: 400, fontSize: "clamp(88px, 13vw, 200px)", lineHeight: 0.88, letterSpacing: "-0.04em", margin: 0, fontVariationSettings: '"opsz" 144' }}>
            Live<br />
            <span style={{ fontStyle: "italic" }}>elsewhere.</span>
          </h1>
          <div style={{ marginTop: 24, maxWidth: 460, fontSize: 17, lineHeight: 1.5, opacity: 0.92, fontFamily: F.sans }}>
            Independent rentals across Thailand — hand-verified. From a teakwood villa in Chiang Mai to a hillside in Samui. Browse anonymously.
          </div>
        </div>

        {/* Photo credit */}
        <div style={{ position: "absolute", bottom: 130, right: 40, zIndex: 2, textAlign: "right" }}>
          <Eyebrow style={{ color: "rgba(255,255,255,0.6)" }}>NOW SHOWING</Eyebrow>
          <div style={{ fontFamily: F.serif, fontStyle: "italic", fontSize: 24, lineHeight: 1.1, marginTop: 6 }}>Wat Phra Singh,</div>
          <div style={{ fontFamily: F.serif, fontStyle: "italic", fontSize: 24, lineHeight: 1.1 }}>Chiang Mai · 18:42</div>
        </div>

        {/* Search bar — overhangs */}
        <div style={{ position: "absolute", bottom: -40, left: 40, right: 40, zIndex: 2, background: C.dark, color: C.cream, borderRadius: 80, display: "grid", gridTemplateColumns: "1.4fr 1fr 1fr auto", padding: 8, alignItems: "center", boxShadow: "0 30px 80px -20px rgba(0,0,0,.55), 0 8px 16px -4px rgba(0,0,0,.3)" }}>
          {/* WHERE */}
          <div style={{ padding: "14px 24px", borderRight: `1px solid rgba(255,255,255,0.12)`, cursor: "pointer" }}>
            <div style={{ fontFamily: F.mono, fontWeight: 600, fontSize: 9, letterSpacing: "0.18em", color: "rgba(255,235,200,.55)", marginBottom: 4 }}>WHERE</div>
            <select
              value={cityId ?? ""}
              onChange={(e) => setCityId(e.target.value ? Number(e.target.value) : undefined)}
              style={{ background: "transparent", border: "none", color: C.cream, fontWeight: 600, fontSize: 15, fontFamily: F.sans, cursor: "pointer", width: "100%", outline: "none" }}
            >
              <option value="">Any city</option>
              {(cities ?? []).filter(c => c.id > 0).map((c) => <option key={c.id} value={c.id}>{c.name.en}</option>)}
            </select>
            <div style={{ fontSize: 12, color: "rgba(255,235,200,.55)" }}>Thailand</div>
          </div>

          {/* STAY TYPE */}
          <div style={{ padding: "14px 24px", borderRight: `1px solid rgba(255,255,255,0.12)`, cursor: "pointer" }}>
            <div style={{ fontFamily: F.mono, fontWeight: 600, fontSize: 9, letterSpacing: "0.18em", color: "rgba(255,235,200,.55)", marginBottom: 4 }}>STAY TYPE</div>
            <select
              value={rentalType ?? ""}
              onChange={(e) => setRentalType(e.target.value as MarketplaceRentalType || undefined)}
              style={{ background: "transparent", border: "none", color: C.cream, fontWeight: 600, fontSize: 15, fontFamily: F.sans, cursor: "pointer", width: "100%", outline: "none" }}
            >
              <option value="">Any</option>
              <option value="ShortTerm">Short-term</option>
              <option value="LongTerm">Long-term</option>
            </select>
            <div style={{ fontSize: 12, color: "rgba(255,235,200,.55)" }}>Per night or month</div>
          </div>

          {/* GUESTS placeholder */}
          <div style={{ padding: "14px 24px", cursor: "pointer" }}>
            <div style={{ fontFamily: F.mono, fontWeight: 600, fontSize: 9, letterSpacing: "0.18em", color: "rgba(255,235,200,.55)", marginBottom: 4 }}>GUESTS</div>
            <div style={{ fontWeight: 600, fontSize: 15 }}>Any</div>
            <div style={{ fontSize: 12, color: "rgba(255,235,200,.55)" }}>Adults · Children</div>
          </div>

          {/* Search button */}
          <button
            onClick={doSearch}
            style={{ background: C.accent, color: C.ink, border: "none", width: 64, height: 64, borderRadius: "50%", cursor: "pointer", margin: "0 8px", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}
          >
            <Search size={22} />
          </button>
        </div>
      </section>

      {/* ── TICKER ───────────────────────────────────────────────────────── */}
      <div style={{ marginTop: 56, borderTop: `1px solid ${C.ink}`, borderBottom: `1px solid ${C.ink}`, background: C.bg, padding: "16px 0", overflow: "hidden" }}>
        <div className="v2-ticker-track" style={{ display: "flex", gap: 40, whiteSpace: "nowrap", fontFamily: F.mono, fontWeight: 500, fontSize: 13, letterSpacing: "0.05em", color: C.ink }}>
          {[0, 1].map((k) => (
            <span key={k} style={{ paddingRight: 40 }}>
              · Verified rentals · Anonymous booking · No platform login · {featured?.totalCount ?? "940"} properties live · Instant Book available · Hosts respond in &lt;6h · Direct host payment ·
            </span>
          ))}
        </div>
      </div>

      {/* ── CITIES ───────────────────────────────────────────────────────── */}
      <section style={{ padding: "120px 40px 80px" }}>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 48, marginBottom: 56, alignItems: "flex-end" }}>
          <div>
            <Eyebrow style={{ marginBottom: 16 }}>—— 01 / Cities</Eyebrow>
            <h2 style={{ fontFamily: F.serif, fontWeight: 400, fontSize: "clamp(48px, 6vw, 88px)", lineHeight: 0.95, letterSpacing: "-0.025em", margin: 0 }}>
              Four corners.<br />
              <span style={{ fontStyle: "italic" }}>One country.</span>
            </h2>
          </div>
          <div style={{ paddingBottom: 12 }}>
            <p style={{ fontSize: 16, lineHeight: 1.6, color: C.ink2, maxWidth: 440, margin: 0, fontFamily: F.sans }}>
              Every listing is walked through by a local curator before going live. No third-party imports, no scraped inventory.
            </p>
          </div>
        </div>

        {displayCities ? (
          <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 24 }}>
            {displayCities.slice(0, 4).map((c, i) => (
              <CityCard key={c.id || i} city={c} onSelect={() => c.id ? browseCity(c.id) : navigate(`/listings?browse=1`)} />
            ))}
          </div>
        ) : (
          <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 24 }}>
            {[0,1,2,3].map((i) => <Skeleton key={i} className="rounded-none" style={{ aspectRatio: "4/5" }} />)}
          </div>
        )}
      </section>

      {/* ── FEATURED (dark) ──────────────────────────────────────────────── */}
      <section style={{ background: C.dark, color: C.cream, padding: "100px 40px" }}>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 64, marginBottom: 56, alignItems: "flex-end" }}>
          <div>
            <Eyebrow style={{ color: "rgba(255,235,200,.55)", marginBottom: 16 }}>—— 02 / This week</Eyebrow>
            <h2 style={{ fontFamily: F.serif, fontWeight: 400, fontSize: "clamp(48px, 6vw, 88px)", lineHeight: 0.95, letterSpacing: "-0.025em", margin: 0 }}>
              Stays our<br />
              curators <span style={{ fontStyle: "italic" }}>noticed</span>.
            </h2>
          </div>
          <div style={{ paddingBottom: 12, display: "flex", justifyContent: "flex-end", gap: 8, flexWrap: "wrap" }}>
            {[
              { label: "All", type: undefined },
              { label: "Short-term", type: "ShortTerm" as MarketplaceRentalType },
              { label: "Long-term", type: "LongTerm" as MarketplaceRentalType },
            ].map(({ label, type }) => (
              <button key={label} onClick={() => navigate(`/listings?${type ? `rentalType=${type}&` : ""}browse=1`)} style={{ background: "transparent", border: "1px solid rgba(255,235,200,.25)", color: "rgba(255,235,200,.85)", padding: "9px 18px", borderRadius: 999, fontFamily: F.mono, fontSize: 12, letterSpacing: "0.05em", cursor: "pointer" }}>
                {label}
              </button>
            ))}
          </div>
        </div>

        {featLoading ? (
          <div style={{ display: "grid", gridTemplateColumns: "1.4fr 1fr 1fr", gap: 32 }}>
            {[0,1,2,3,4].map((i) => <Skeleton key={i} className="rounded-none" style={{ aspectRatio: i === 0 ? "4/5" : "4/3", gridRow: i === 0 ? "span 2" : "auto" }} />)}
          </div>
        ) : featured?.items.length ? (
          <div style={{ display: "grid", gridTemplateColumns: "1.4fr 1fr 1fr", gridTemplateRows: "auto auto", gap: 32 }}>
            {featured.items.slice(0, 5).map((l, i) => (
              <FeatureCard key={l.id} listing={l} big={i === 0} idx={i} />
            ))}
          </div>
        ) : (
          <div style={{ textAlign: "center", padding: "60px 0", color: "rgba(255,235,200,.4)", fontFamily: F.mono, fontSize: 12, letterSpacing: "0.1em" }}>
            NO LISTINGS AVAILABLE
          </div>
        )}

        <div style={{ marginTop: 56, display: "flex", justifyContent: "center" }}>
          <button
            onClick={() => navigate("/listings?browse=1")}
            style={{ background: C.accent, color: C.ink, border: "none", padding: "18px 32px", borderRadius: 999, cursor: "pointer", fontFamily: F.sans, fontWeight: 600, fontSize: 14, letterSpacing: "-0.01em", display: "inline-flex", alignItems: "center", gap: 12 }}
          >
            Browse all {featured?.totalCount ?? ""} stays →
          </button>
        </div>
      </section>

      {/* ── MANIFESTO ────────────────────────────────────────────────────── */}
      <section style={{ padding: "120px 40px", background: C.bg }}>
        <Eyebrow style={{ marginBottom: 56 }}>—— 03 / How it works</Eyebrow>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 56 }}>
          {[
            ["Browse without leaving a trace.", "No account, no email harvest, no retargeting. Open a listing, close the tab. We don't care who you are until you book."],
            ["Book with one secret link.", "Submit the form, save the URL. That URL is your ticket — bookmarkable, shareable with whoever's coming."],
            ["Pay your host, not a platform.", "PMC doesn't hold your money. Booking goes direct to verified hosts; we charge a flat curator fee at the end of the stay."],
          ].map(([h, p], i) => (
            <div key={i} style={{ position: "relative", paddingTop: 32, borderTop: `1px solid ${C.ink}` }}>
              <span style={{ position: "absolute", top: 32, right: 0, fontFamily: F.mono, fontWeight: 500, fontSize: 11, color: C.ink3 }}>0{i + 1}</span>
              <h3 style={{ fontFamily: F.serif, fontWeight: 400, fontSize: 28, lineHeight: 1.1, letterSpacing: "-0.02em", margin: "0 0 16px", maxWidth: 280 }}>{h}</h3>
              <p style={{ fontSize: 15, lineHeight: 1.6, color: C.ink2, margin: 0, maxWidth: 320, fontFamily: F.sans }}>{p}</p>
            </div>
          ))}
        </div>
      </section>

      {/* ── FOOTER ───────────────────────────────────────────────────────── */}
      <footer style={{ background: C.darkFooter, color: C.ink4, padding: "60px 40px 32px" }}>
        <div style={{ display: "grid", gridTemplateColumns: "2fr 1fr 1fr 1fr", gap: 48, paddingBottom: 48, borderBottom: "1px solid rgba(255,235,200,.1)" }}>
          <div>
            <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 16 }}>
              <div style={{ width: 28, height: 28, background: "rgba(255,248,236,.15)", borderRadius: 8, display: "flex", alignItems: "center", justifyContent: "center" }}>
                <span style={{ fontWeight: 900, fontSize: 13, color: C.cream }}>P</span>
              </div>
              <span style={{ fontWeight: 700, fontSize: 15, color: C.cream, fontFamily: F.sans }}>PMC Properties</span>
            </div>
            <p style={{ fontSize: 13, lineHeight: 1.6, maxWidth: 300, margin: 0 }}>
              Verified independent rentals across Thailand. Anonymous to browse, secure to book.
            </p>
          </div>
          {[
            ["Stay",    ["How booking works", "Cancellation", "Trust & safety"]],
            ["Hosting", ["List your property", "Host guidelines", "Manager portal"]],
            ["Company", ["Manifesto", "Contact", "Press"]],
          ].map(([h, items]) => (
            <div key={h as string}>
              <div style={{ fontFamily: F.mono, fontWeight: 600, fontSize: 10, color: C.cream, letterSpacing: "0.18em", marginBottom: 14 }}>{h as string}</div>
              {(items as string[]).map((it) => (
                <div key={it} style={{ fontSize: 13, padding: "5px 0", cursor: "pointer" }}>{it}</div>
              ))}
            </div>
          ))}
        </div>
        <div style={{ display: "flex", justifyContent: "space-between", paddingTop: 24, fontFamily: F.mono, fontSize: 11, fontWeight: 500 }}>
          <span>© {new Date().getFullYear()} PMC PROPERTIES CO.</span>
          <span>MADE WITH 🌿 IN CHIANG MAI</span>
        </div>
      </footer>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// CATALOG VIEW
// ─────────────────────────────────────────────────────────────────────────────
function CatalogView() {
  const [params, setParams] = useSearchParams();
  const navigate = useNavigate();

  const rentalType = (params.get("rentalType") as MarketplaceRentalType) || undefined;
  const cityId     = params.get("cityId") ? Number(params.get("cityId")) : undefined;
  const bedrooms   = params.get("bedrooms") ? Number(params.get("bedrooms")) : undefined;
  const sort       = (params.get("sort") as MarketplaceSortOrder) || "Newest";
  const page       = Number(params.get("page") || "1");

  const query: MarketplaceListingsQuery = useMemo(
    () => ({ rentalType, cityId, bedrooms, sort, page, pageSize: PAGE_SIZE }),
    [rentalType, cityId, bedrooms, sort, page]
  );

  const { data, isLoading } = useMarketplaceListings(query);
  const { data: rawCities, isLoading: citiesLoadingC } = useMarketplaceCities();
  // Only real API cities for filtering (static fallbacks have no real IDs)
  const cities = citiesLoadingC ? undefined : (rawCities ?? []);
  const selectedCity = cities?.find((c) => c.id === cityId);
  const totalCount          = data?.totalCount ?? 0;
  const totalPages          = data?.totalPages ?? 1;

  function set(key: string, value: string | undefined) {
    setParams((prev) => {
      const next = new URLSearchParams(prev);
      if (value) next.set(key, value); else next.delete(key);
      next.delete("page");
      return next;
    });
  }
  function setPage(p: number) {
    setParams((prev) => { const n = new URLSearchParams(prev); n.set("page", String(p)); return n; });
  }

  return (
    <div style={{ background: C.bg, minHeight: "100vh", fontFamily: F.sans, color: C.ink }}>

      {/* ── Sticky header ────────────────────────────────────────────────── */}
      <header style={{ position: "sticky", top: 0, zIndex: 40, display: "flex", alignItems: "center", justifyContent: "space-between", padding: "18px 32px", borderBottom: `1px solid ${C.ink}`, background: C.bg }}>
        <button onClick={() => navigate("/listings")} style={{ background: "none", border: "none", cursor: "pointer", display: "flex", alignItems: "center", gap: 8 }}>
          <div style={{ width: 26, height: 26, background: C.dark, borderRadius: 7, display: "flex", alignItems: "center", justifyContent: "center" }}>
            <span style={{ fontWeight: 900, fontSize: 12, color: C.cream }}>P</span>
          </div>
          <span style={{ fontWeight: 700, fontSize: 15, color: C.ink, fontFamily: F.sans }}>PMC</span>
        </button>

        {/* Dark search pill */}
        <div style={{ display: "flex", alignItems: "center", background: C.dark, color: C.cream, borderRadius: 999, padding: 4, gap: 0 }}>
          {[
            selectedCity?.name.en ?? "All cities",
            rentalType === "LongTerm" ? "Long-term" : rentalType === "ShortTerm" ? "Short-term" : "Any type",
          ].map((it, i) => (
            <div key={i} style={{ padding: "8px 18px", fontSize: 13, fontWeight: 600, borderRight: i < 1 ? "1px solid rgba(255,235,200,.15)" : "none", fontFamily: F.sans }}>
              {it}
            </div>
          ))}
          <button onClick={() => navigate("/listings")} style={{ background: C.accent, color: C.ink, border: "none", width: 32, height: 32, borderRadius: "50%", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", marginLeft: 4 }}>
            <Search size={14} />
          </button>
        </div>

        <NavAuthButtons />
      </header>

      {/* ── Page header ──────────────────────────────────────────────────── */}
      <div style={{ padding: "24px 32px 20px", borderBottom: `1px solid ${C.line}`, background: C.bg, display: "flex", justifyContent: "space-between", alignItems: "flex-end" }}>
        <div>
          <Eyebrow style={{ marginBottom: 6 }}>
            {totalCount > 0 ? `${totalCount} STAYS` : "SEARCHING"}{selectedCity ? ` · ${selectedCity.name.en.toUpperCase()}` : " · ALL CITIES"}
          </Eyebrow>
          <h1 style={{ fontFamily: F.serif, fontWeight: 400, fontSize: 48, lineHeight: 1, letterSpacing: "-0.02em", margin: 0 }}>
            {selectedCity ? <>Stays in <span style={{ fontStyle: "italic" }}>{selectedCity.name.en}</span></> : <>All <span style={{ fontStyle: "italic" }}>stays</span></>}
          </h1>
        </div>
        <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
          <select
            value={sort}
            onChange={(e) => set("sort", e.target.value)}
            style={{ padding: "9px 18px", border: `1px solid ${C.ink}`, background: "transparent", color: C.ink, borderRadius: 999, fontFamily: F.mono, fontSize: 12, fontWeight: 500, cursor: "pointer", letterSpacing: "0.05em", outline: "none" }}
          >
            <option value="Newest">Sort: Newest</option>
            <option value="PriceAsc">Sort: Price ↑</option>
            <option value="PriceDesc">Sort: Price ↓</option>
          </select>
        </div>
      </div>

      {/* ── Main grid: sidebar + listings ────────────────────────────────── */}
      <div style={{ display: "grid", gridTemplateColumns: "280px 1fr", minHeight: "calc(100vh - 160px)" }}>

        {/* Filter sidebar */}
        <aside style={{ borderRight: `1px solid ${C.line}`, padding: 28, background: C.bg, overflowY: "auto" }}>

          <FGroup title="STAY TYPE">
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", border: `1px solid ${C.ink}` }}>
              {([undefined, "ShortTerm", "LongTerm"] as (MarketplaceRentalType | undefined)[]).slice(0, 2).map((v, i) => {
                const labels = ["SHORT-TERM", "LONG-TERM"];
                const types: (MarketplaceRentalType | undefined)[] = ["ShortTerm", "LongTerm"];
                const active = rentalType === types[i];
                return (
                  <button
                    key={i}
                    onClick={() => set("rentalType", active ? undefined : types[i])}
                    style={{ background: active ? C.ink : "transparent", color: active ? C.cream : C.ink3, border: "none", padding: 12, fontFamily: F.mono, fontWeight: 600, fontSize: 11, letterSpacing: "0.05em", cursor: "pointer", borderRight: i === 0 ? `1px solid ${C.ink}` : "none" }}
                  >
                    {labels[i]}
                  </button>
                );
              })}
            </div>
          </FGroup>

          <FGroup title="BEDROOMS">
            <div style={{ display: "flex", border: `1px solid ${C.ink}` }}>
              {["Any", "1", "2", "3", "4+"].map((b, i) => {
                const val = i === 0 ? undefined : i < 4 ? i : 4;
                const active = bedrooms === val;
                return (
                  <button
                    key={b}
                    onClick={() => set("bedrooms", active || val === undefined ? undefined : String(val))}
                    style={{ flex: 1, padding: "10px 0", border: "none", cursor: "pointer", borderRight: i < 4 ? `1px solid ${C.ink}` : "none", background: active ? C.ink : "transparent", color: active ? C.cream : C.ink, fontFamily: F.sans, fontWeight: 500, fontSize: 13 }}
                  >
                    {b}
                  </button>
                );
              })}
            </div>
          </FGroup>

          <FGroup title="CITY" last>
            <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
              <button
                onClick={() => set("cityId", undefined)}
                style={{ textAlign: "left", background: !cityId ? C.ink : "transparent", color: !cityId ? C.cream : C.ink2, border: `1px solid ${!cityId ? C.ink : C.line2}`, padding: "8px 14px", cursor: "pointer", fontFamily: F.sans, fontSize: 13, fontWeight: 500 }}
              >
                All cities
              </button>
              {cities?.map((c) => (
                <button
                  key={c.id}
                  onClick={() => set("cityId", String(c.id))}
                  style={{ textAlign: "left", background: cityId === c.id ? C.ink : "transparent", color: cityId === c.id ? C.cream : C.ink2, border: `1px solid ${cityId === c.id ? C.ink : C.line2}`, padding: "8px 14px", cursor: "pointer", fontFamily: F.sans, fontSize: 13, fontWeight: 500, display: "flex", justifyContent: "space-between" }}
                >
                  <span>{c.name.en}</span>
                  {c.activeListingsCount > 0 && <span style={{ fontFamily: F.mono, fontSize: 11, color: C.ink3 }}>{c.activeListingsCount}</span>}
                </button>
              ))}
            </div>
          </FGroup>

          <button
            onClick={() => setParams(new URLSearchParams({ browse: "1" }))}
            style={{ width: "100%", height: 52, background: C.ink, color: C.cream, border: "none", cursor: "pointer", fontFamily: F.sans, fontWeight: 600, fontSize: 14, marginTop: 8 }}
          >
            Clear filters
          </button>
        </aside>

        {/* Listings grid */}
        <main style={{ padding: 28, background: C.bg }}>
          {isLoading ? (
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 32 }}>
              {Array.from({ length: 6 }).map((_, i) => <CardSkeleton key={i} />)}
            </div>
          ) : !data?.items.length ? (
            <div style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", minHeight: 400, textAlign: "center" }}>
              <div style={{ fontFamily: F.mono, fontSize: 11, letterSpacing: "0.15em", color: C.ink3, marginBottom: 16 }}>NO RESULTS FOUND</div>
              <div style={{ fontFamily: F.serif, fontSize: 32, letterSpacing: "-0.02em", marginBottom: 16 }}>Nothing here <span style={{ fontStyle: "italic" }}>yet.</span></div>
              <p style={{ fontSize: 15, color: C.ink2, maxWidth: 340 }}>Try adjusting your filters — new listings are added regularly.</p>
              <button onClick={() => setParams(new URLSearchParams({ browse: "1" }))} style={{ marginTop: 20, background: "transparent", border: `1px solid ${C.ink}`, padding: "10px 20px", cursor: "pointer", fontFamily: F.sans, fontWeight: 600, fontSize: 13 }}>
                Clear all filters
              </button>
            </div>
          ) : (
            <>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 32 }}>
                {data.items.map((l, i) => <CatalogCard key={l.id} listing={l} idx={(page - 1) * PAGE_SIZE + i} />)}
              </div>

              {/* Pagination */}
              {totalPages > 1 && (
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginTop: 40, paddingTop: 24, borderTop: `1px solid ${C.ink}` }}>
                  <div style={{ fontFamily: F.mono, fontWeight: 500, fontSize: 12, color: C.ink3 }}>
                    SHOWING {(page - 1) * PAGE_SIZE + 1}—{Math.min(page * PAGE_SIZE, totalCount)} OF {totalCount}
                  </div>
                  <div style={{ display: "flex", gap: 0 }}>
                    <button
                      onClick={() => setPage(page - 1)}
                      disabled={page <= 1}
                      style={{ width: 36, height: 36, border: `1px solid ${C.ink}`, background: "transparent", color: C.ink, cursor: page > 1 ? "pointer" : "not-allowed", opacity: page > 1 ? 1 : 0.3, fontFamily: F.sans, fontWeight: 500, fontSize: 13 }}
                    >‹</button>
                    {Array.from({ length: Math.min(totalPages, 7) }, (_, i) => i + 1).map((p) => (
                      <button
                        key={p}
                        onClick={() => setPage(p)}
                        style={{ width: 36, height: 36, border: `1px solid ${C.ink}`, borderLeft: "none", background: page === p ? C.ink : "transparent", color: page === p ? C.cream : C.ink, cursor: "pointer", fontFamily: F.sans, fontWeight: 500, fontSize: 13 }}
                      >
                        {p}
                      </button>
                    ))}
                    <button
                      onClick={() => setPage(page + 1)}
                      disabled={page >= totalPages}
                      style={{ width: 36, height: 36, border: `1px solid ${C.ink}`, borderLeft: "none", background: "transparent", color: C.ink, cursor: page < totalPages ? "pointer" : "not-allowed", opacity: page < totalPages ? 1 : 0.3, fontFamily: F.sans, fontWeight: 500, fontSize: 13 }}
                    >›</button>
                  </div>
                </div>
              )}
            </>
          )}
        </main>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Entry — Home vs Catalog based on URL params
// ─────────────────────────────────────────────────────────────────────────────
export default function MarketplaceListingsPage() {
  const [params] = useSearchParams();
  // Any meaningful filter param → catalog mode
  const isCatalog = ["browse", "cityId", "rentalType", "bedrooms", "sort"].some((k) => params.has(k));
  return isCatalog ? <CatalogView /> : <HomeView />;
}
