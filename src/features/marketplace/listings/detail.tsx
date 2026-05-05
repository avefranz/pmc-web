import type React from "react";
import { useState, useMemo } from "react";
import { useParams, Link, useNavigate } from "react-router-dom";
import {
  ArrowLeft, BedDouble, Bath, Users, Share2, Heart,
  Wifi, Wind, Tv, Car, Dumbbell, Waves, Shield, Coffee,
  Zap, Droplets, ChevronLeft, ChevronRight, X, MapPin,
} from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { useMarketplaceListing, useListingAvailability } from "@/lib/hooks/use-marketplace";
import { formatThb } from "@/lib/utils/format";
import type { CalendarDayDto, MarketplaceListingAmenityDto } from "@/lib/types/marketplace";

// ── Design tokens ─────────────────────────────────────────────────────────────
const C = {
  ink:    "#1F1A14", ink2: "#463B2D", ink3: "#7A6E5B", ink4: "#A89B85",
  accent: "#E0945C", primary: "#7A4A2B",
  bg:     "#FFFCF7", surface: "#FFFFFF", surfaceWarm: "#F2E9DA",
  cream:  "#FFF8EC", line: "#E8DFCF",  line2: "#D9CCB4",
  dark:   "#1F1A14",
} as const;
const F = {
  serif: "'Fraunces', Georgia, serif",
  sans:  "'Plus Jakarta Sans', system-ui, sans-serif",
  mono:  "'JetBrains Mono', 'Courier New', monospace",
} as const;

const UNS = (id: string, w = 1200, h = 800) =>
  `https://images.unsplash.com/photo-${id}?auto=format&fit=crop&w=${w}&h=${h}&q=80`;

const DETAIL_FALLBACK = [
  UNS("1564013799919-ab600027ffc6", 1600, 1200),
  UNS("1600585154340-be6161a56a0c", 800, 1000),
  UNS("1522771739844-6a9f6d5f14af", 800, 600),
  UNS("1556909114-f6e7ad7d3136", 800, 600),
  UNS("1552321554-5fefe8c9ef14", 800, 600),
];

// ── Eyebrow ───────────────────────────────────────────────────────────────────
function Eyebrow({ children, style }: { children: React.ReactNode; style?: React.CSSProperties }) {
  return (
    <div style={{ fontFamily: F.mono, fontWeight: 500, fontSize: 11, letterSpacing: "0.18em", color: C.ink3, textTransform: "uppercase", ...style }}>
      {children}
    </div>
  );
}

// ── Amenity icon map ──────────────────────────────────────────────────────────
const AMENITY_ICONS: Record<string, React.ReactNode> = {
  wifi:              <Wifi size={20} />,
  "air conditioning":<Wind size={20} />,
  ac:                <Wind size={20} />,
  tv:                <Tv size={20} />,
  "smart tv":        <Tv size={20} />,
  parking:           <Car size={20} />,
  gym:               <Dumbbell size={20} />,
  pool:              <Waves size={20} />,
  security:          <Shield size={20} />,
  kitchen:           <Coffee size={20} />,
  electricity:       <Zap size={20} />,
  water:             <Droplets size={20} />,
};
function amenityIcon(name: string) {
  const k = name.toLowerCase();
  for (const [key, icon] of Object.entries(AMENITY_ICONS)) {
    if (k.includes(key)) return icon;
  }
  return <div style={{ width: 20, height: 20, border: `1px solid ${C.line2}`, borderRadius: 2 }} />;
}

// ── Gallery ───────────────────────────────────────────────────────────────────
function Gallery({ photos }: { photos: string[] }) {
  const [open, setOpen] = useState(false);
  const [cur, setCur] = useState(0);

  const grid = [
    photos[0] ?? DETAIL_FALLBACK[0],
    photos[1] ?? DETAIL_FALLBACK[1],
    photos[2] ?? DETAIL_FALLBACK[2],
    photos[3] ?? DETAIL_FALLBACK[3],
    photos[4] ?? DETAIL_FALLBACK[4],
  ];

  return (
    <>
      {/* 5-cell mosaic: 2fr hero (row-span 2) + 2×2 grid */}
      <div style={{ display: "grid", gridTemplateColumns: "2fr 1fr 1fr", gridTemplateRows: "200px 200px", gap: 6 }}>
        {grid.map((src, i) => (
          <div
            key={i}
            onClick={() => { setCur(i); setOpen(true); }}
            style={{ gridRow: i === 0 ? "span 2" : "auto", overflow: "hidden", cursor: "pointer", position: "relative", background: "#EBDFC8" }}
          >
            <img
              src={src}
              alt=""
              style={{ width: "100%", height: "100%", objectFit: "cover", transition: "transform .4s", display: "block" }}
              onMouseEnter={(e) => (e.currentTarget.style.transform = "scale(1.03)")}
              onMouseLeave={(e) => (e.currentTarget.style.transform = "scale(1)")}
            />
            {i === 4 && photos.length > 5 && (
              <div
                style={{ position: "absolute", bottom: 12, right: 12, background: C.dark, color: C.cream, border: "none", padding: "8px 14px", fontFamily: F.sans, fontWeight: 600, fontSize: 11, cursor: "pointer", display: "flex", alignItems: "center", gap: 6 }}
              >
                Show all {photos.length}
              </div>
            )}
          </div>
        ))}
      </div>

      {/* Lightbox */}
      {open && (
        <div style={{ position: "fixed", inset: 0, background: "rgba(20,15,10,.92)", zIndex: 1000, display: "flex", alignItems: "center", justifyContent: "center" }}>
          <button
            onClick={() => setOpen(false)}
            style={{ position: "absolute", top: 24, right: 24, width: 44, height: 44, border: `1px solid rgba(255,235,200,.3)`, background: "transparent", color: C.cream, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center" }}
          >
            <X size={18} />
          </button>
          <button
            onClick={() => setCur((c) => (c - 1 + photos.length) % photos.length)}
            style={{ position: "absolute", left: 24, top: "50%", transform: "translateY(-50%)", width: 44, height: 44, border: `1px solid rgba(255,235,200,.3)`, background: "transparent", color: C.cream, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center" }}
          >
            <ChevronLeft size={18} />
          </button>
          <img
            src={photos[cur] ?? DETAIL_FALLBACK[cur % DETAIL_FALLBACK.length]}
            alt=""
            style={{ maxWidth: "80vw", maxHeight: "80vh", objectFit: "contain" }}
          />
          <button
            onClick={() => setCur((c) => (c + 1) % photos.length)}
            style={{ position: "absolute", right: 24, top: "50%", transform: "translateY(-50%)", width: 44, height: 44, border: `1px solid rgba(255,235,200,.3)`, background: "transparent", color: C.cream, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center" }}
          >
            <ChevronRight size={18} />
          </button>
          <div style={{ position: "absolute", bottom: 24, left: "50%", transform: "translateX(-50%)", fontFamily: F.mono, fontSize: 11, color: "rgba(255,235,200,.6)", letterSpacing: "0.1em" }}>
            {cur + 1} / {photos.length}
          </div>
        </div>
      )}
    </>
  );
}

// ── Calendar ──────────────────────────────────────────────────────────────────
function AvailCalendar({ days, month, year, onPrev, onNext }: {
  days: CalendarDayDto[];
  month: number; year: number;
  onPrev: () => void; onNext: () => void;
}) {
  const monthName = new Date(year, month, 1).toLocaleString("en", { month: "long" });
  const firstDay  = (new Date(year, month, 1).getDay() + 6) % 7; // Mon-first
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const byDate = useMemo(() => {
    const m: Record<string, CalendarDayDto> = {};
    days.forEach((d) => { m[d.date] = d; });
    return m;
  }, [days]);

  const today = new Date().toISOString().slice(0, 10);

  function pad(n: number) { return String(n).padStart(2, "0"); }

  const cells: (number | null)[] = [...Array(firstDay).fill(null), ...Array.from({ length: daysInMonth }, (_, i) => i + 1)];

  return (
    <div style={{ fontFamily: F.sans }}>
      {/* Month header */}
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 16 }}>
        <button onClick={onPrev} style={{ background: "transparent", border: `1px solid ${C.line2}`, width: 32, height: 32, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", color: C.ink }}>
          <ChevronLeft size={14} />
        </button>
        <div style={{ fontFamily: F.serif, fontSize: 17, letterSpacing: "-0.01em" }}>{monthName} {year}</div>
        <button onClick={onNext} style={{ background: "transparent", border: `1px solid ${C.line2}`, width: 32, height: 32, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", color: C.ink }}>
          <ChevronRight size={14} />
        </button>
      </div>

      {/* Weekday labels */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(7, 1fr)", gap: 2, marginBottom: 4 }}>
        {["Mo", "Tu", "We", "Th", "Fr", "Sa", "Su"].map((d) => (
          <div key={d} style={{ textAlign: "center", fontFamily: F.mono, fontSize: 10, letterSpacing: "0.1em", color: C.ink3, padding: "4px 0" }}>{d}</div>
        ))}
      </div>

      {/* Day grid */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(7, 1fr)", gap: 2 }}>
        {cells.map((day, i) => {
          if (!day) return <div key={`e${i}`} />;
          const dateStr = `${year}-${pad(month + 1)}-${pad(day)}`;
          const info = byDate[dateStr];
          const status = info?.status;
          const isPast = dateStr < today;
          const isAvail = status === "Available" && !isPast;
          const isBooked = status === "Booked";
          const isBlocked = status === "Blocked" || isPast;

          return (
            <div
              key={day}
              style={{
                aspectRatio: "1",
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
                justifyContent: "center",
                fontSize: 12,
                fontWeight: 500,
                cursor: isAvail ? "pointer" : "default",
                background: isAvail ? C.bg : "transparent",
                color: isBooked || isBlocked || isPast ? C.ink4 : C.ink,
                textDecoration: isBooked ? "line-through" : "none",
                opacity: isBlocked || isPast ? 0.4 : 1,
                border: isAvail ? `1px solid ${C.line}` : "1px solid transparent",
                position: "relative",
              }}
            >
              {day}
              {isAvail && info?.price && (
                <div style={{ fontSize: 8, fontFamily: F.mono, color: C.ink3, lineHeight: 1, marginTop: 1 }}>
                  ฿{Math.round(info.price / 100) * 100 < 10000
                    ? `${Math.round(info.price / 100) * 100}`
                    : `${(info.price / 1000).toFixed(0)}k`}
                </div>
              )}
              {isBlocked && !isPast && (
                <div style={{ position: "absolute", inset: 0, backgroundImage: "repeating-linear-gradient(-45deg, transparent, transparent 4px, rgba(0,0,0,.04) 4px, rgba(0,0,0,.04) 5px)" }} />
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ── Booking widget ────────────────────────────────────────────────────────────
function BookingCard({ listing }: { listing: ReturnType<typeof useMarketplaceListing>["data"] }) {
  const [checkIn, setCheckIn]  = useState("");
  const [checkOut, setCheckOut]= useState("");
  const [showEnquire, setShowEnquire] = useState(false);

  if (!listing) return null;

  const isLT = listing.rentalType === "LongTerm";
  const price = isLT ? (listing.baseMonthlyRate ?? listing.basePrice * 30) : listing.basePrice;

  const nights = useMemo(() => {
    if (!checkIn || !checkOut) return 0;
    const d = (new Date(checkOut).getTime() - new Date(checkIn).getTime()) / 86400000;
    return Math.max(0, Math.round(d));
  }, [checkIn, checkOut]);

  const total = isLT ? price * Math.ceil(nights / 30) : price * nights;

  return (
    <div style={{ position: "sticky", top: 24, border: `1px solid ${C.ink}`, background: C.surface, fontFamily: F.sans }}>
      {/* Price header — dark */}
      <div style={{ padding: "20px 24px", background: C.dark, color: C.cream }}>
        <Eyebrow style={{ color: "rgba(255,235,200,.55)" }}>FROM</Eyebrow>
        <div style={{ display: "flex", alignItems: "baseline", gap: 6, marginTop: 4 }}>
          <span style={{ fontFamily: F.serif, fontSize: 44, lineHeight: 1, letterSpacing: "-0.02em" }}>{formatThb(price)}</span>
          <span style={{ color: "rgba(255,235,200,.65)", fontSize: 14 }}>/ {isLT ? "month" : "night"}</span>
        </div>
        <div style={{ fontSize: 12, color: "rgba(255,235,200,.4)", marginTop: 4, fontFamily: F.mono, letterSpacing: "0.05em" }}>
          {isLT ? `AVAILABLE ${listing.startDate}` : "INSTANT BOOK AVAILABLE"}
        </div>
      </div>

      <div style={{ padding: 24 }}>
        {/* Date boxes */}
        <div style={{ border: `1px solid ${C.ink}` }}>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", borderBottom: `1px solid ${C.ink}` }}>
            <div style={{ padding: "12px 16px" }}>
              <div style={{ fontFamily: F.mono, fontWeight: 600, fontSize: 9, letterSpacing: "0.18em", color: C.ink3, marginBottom: 4 }}>CHECK-IN</div>
              <input
                type="date"
                value={checkIn}
                min={listing.startDate}
                onChange={(e) => setCheckIn(e.target.value)}
                style={{ background: "transparent", border: "none", fontFamily: F.sans, fontWeight: 600, fontSize: 14, color: C.ink, width: "100%", cursor: "pointer", outline: "none" }}
              />
            </div>
            <div style={{ padding: "12px 16px", borderLeft: `1px solid ${C.ink}` }}>
              <div style={{ fontFamily: F.mono, fontWeight: 600, fontSize: 9, letterSpacing: "0.18em", color: C.ink3, marginBottom: 4 }}>CHECK-OUT</div>
              <input
                type="date"
                value={checkOut}
                min={checkIn || listing.startDate}
                onChange={(e) => setCheckOut(e.target.value)}
                style={{ background: "transparent", border: "none", fontFamily: F.sans, fontWeight: 600, fontSize: 14, color: C.ink, width: "100%", cursor: "pointer", outline: "none" }}
              />
            </div>
          </div>
          <div style={{ padding: "12px 16px" }}>
            <div style={{ fontFamily: F.mono, fontWeight: 600, fontSize: 9, letterSpacing: "0.18em", color: C.ink3, marginBottom: 4 }}>GUESTS</div>
            <div style={{ fontWeight: 600, fontSize: 14, color: C.ink }}>Up to {listing.maxOccupancy} guests</div>
          </div>
        </div>

        {/* CTA */}
        <button
          onClick={() => setShowEnquire(true)}
          style={{ width: "100%", height: 52, marginTop: 16, background: listing.instantBookEnabled ? C.accent : C.ink, color: listing.instantBookEnabled ? C.ink : C.cream, border: "none", cursor: "pointer", fontFamily: F.sans, fontWeight: 600, fontSize: 14, display: "flex", alignItems: "center", justifyContent: "center", gap: 8 }}
        >
          {listing.instantBookEnabled ? <><Zap size={16} /> Instant Book →</> : "Request to Book →"}
        </button>

        <div style={{ textAlign: "center", fontSize: 11, color: C.ink3, marginTop: 8, fontFamily: F.mono, letterSpacing: "0.05em" }}>
          {listing.instantBookEnabled ? "NO WAITING · NO CHARGE UNTIL CHECK-IN" : "HOST RESPONDS WITHIN 24H"}
        </div>

        {/* Price breakdown */}
        {nights > 0 && (
          <div style={{ display: "grid", gap: 8, fontSize: 14, paddingTop: 20, marginTop: 20, borderTop: `1px solid ${C.line}` }}>
            {[
              [isLT ? `${formatThb(price)} × ${Math.ceil(nights / 30)} month${Math.ceil(nights / 30) > 1 ? "s" : ""}` : `${formatThb(price)} × ${nights} night${nights > 1 ? "s" : ""}`, formatThb(total)],
              ["Service fee", formatThb(Math.round(total * 0.05))],
            ].map(([k, v]) => (
              <div key={k} style={{ display: "flex", justifyContent: "space-between", color: C.ink3 }}>
                <span>{k}</span><span style={{ color: C.ink }}>{v}</span>
              </div>
            ))}
            <div style={{ display: "flex", justifyContent: "space-between", fontWeight: 700, fontSize: 17, paddingTop: 12, borderTop: `1px solid ${C.ink}` }}>
              <span>Total</span><span>{formatThb(Math.round(total * 1.05))}</span>
            </div>
          </div>
        )}
      </div>

      {/* Enquire modal */}
      {showEnquire && (
        <div style={{ position: "fixed", inset: 0, background: "rgba(20,15,10,.7)", backdropFilter: "blur(12px)", zIndex: 1000, display: "flex", alignItems: "center", justifyContent: "center", padding: 32 }}>
          <div style={{ width: 480, background: C.surface, padding: 36, boxShadow: "0 30px 80px rgba(0,0,0,.4)" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 24 }}>
              <div>
                <Eyebrow>—— TO BOOK</Eyebrow>
                <div style={{ fontFamily: F.serif, fontSize: 32, lineHeight: 1, letterSpacing: "-0.02em", marginTop: 8 }}>
                  Create an <span style={{ fontStyle: "italic" }}>account.</span>
                </div>
              </div>
              <button onClick={() => setShowEnquire(false)} style={{ width: 40, height: 40, border: `1px solid ${C.ink}`, background: "transparent", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center" }}>
                <X size={16} />
              </button>
            </div>
            <p style={{ fontSize: 15, lineHeight: 1.6, color: C.ink2, marginBottom: 24 }}>
              Sign up to request a booking or use Instant Book. It only takes a minute.
            </p>
            <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
              <Link
                to="/register"
                style={{ height: 52, background: C.ink, color: C.cream, display: "flex", alignItems: "center", justifyContent: "center", textDecoration: "none", fontFamily: F.sans, fontWeight: 600, fontSize: 14 }}
              >
                Create account →
              </Link>
              <Link
                to="/login"
                style={{ height: 52, background: "transparent", border: `1px solid ${C.ink}`, color: C.ink, display: "flex", alignItems: "center", justifyContent: "center", textDecoration: "none", fontFamily: F.sans, fontWeight: 600, fontSize: 14 }}
              >
                Sign in
              </Link>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// ── Main detail page ──────────────────────────────────────────────────────────
export default function MarketplaceListingDetailPage() {
  const { id = "" } = useParams<{ id: string }>();
  const navigate = useNavigate();

  const { data: listing, isLoading } = useMarketplaceListing(id);

  // Calendar state — 2 months
  const now = new Date();
  const [calYear,  setCalYear]  = useState(now.getFullYear());
  const [calMonth, setCalMonth] = useState(now.getMonth());

  const fromStr = `${calYear}-${String(calMonth + 1).padStart(2, "0")}-01`;
  const lastDay = new Date(calYear, calMonth + 2, 0);
  const toStr   = `${lastDay.getFullYear()}-${String(lastDay.getMonth() + 1).padStart(2, "0")}-${String(lastDay.getDate()).padStart(2, "0")}`;

  const { data: calDays = [] } = useListingAvailability(id, fromStr, toStr);

  const [showMore, setShowMore] = useState(false);
  const amenities: MarketplaceListingAmenityDto[] = listing?.amenities ?? [];
  const presented = amenities.filter((a) => a.isPresent);
  const visible   = showMore ? presented : presented.slice(0, 8);

  const photos = listing?.media?.map((m) => m.url) ?? [];

  function prevMonth() {
    if (calMonth === 0) { setCalYear((y) => y - 1); setCalMonth(11); }
    else setCalMonth((m) => m - 1);
  }
  function nextMonth() {
    if (calMonth === 11) { setCalYear((y) => y + 1); setCalMonth(0); }
    else setCalMonth((m) => m + 1);
  }

  if (isLoading) return (
    <div style={{ background: C.bg, minHeight: "100vh", fontFamily: F.sans, color: C.ink }}>
      <div style={{ padding: "18px 40px", borderBottom: `1px solid ${C.ink}`, display: "flex", justifyContent: "space-between" }}>
        <Skeleton className="h-7 w-32 rounded-none" />
        <Skeleton className="h-7 w-48 rounded-none" />
        <Skeleton className="h-7 w-32 rounded-none" />
      </div>
      <div style={{ padding: "32px 40px" }}>
        <Skeleton className="h-12 w-2/3 mb-4 rounded-none" />
        <Skeleton className="h-6 w-1/3 mb-8 rounded-none" />
        <Skeleton className="rounded-none mb-10" style={{ aspectRatio: "16/9" }} />
        <div style={{ display: "grid", gridTemplateColumns: "1fr 420px", gap: 80 }}>
          <div>
            {[1,2,3,4].map((i) => <Skeleton key={i} className="h-5 mb-3 rounded-none" />)}
          </div>
          <Skeleton className="h-80 rounded-none" />
        </div>
      </div>
    </div>
  );

  if (!listing) return (
    <div style={{ background: C.bg, minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center", fontFamily: F.sans }}>
      <div style={{ textAlign: "center" }}>
        <div style={{ fontFamily: F.serif, fontSize: 48, letterSpacing: "-0.025em", marginBottom: 16 }}>Not <span style={{ fontStyle: "italic" }}>found.</span></div>
        <button onClick={() => navigate(-1)} style={{ background: "transparent", border: `1px solid ${C.ink}`, padding: "10px 20px", cursor: "pointer", fontFamily: F.sans, fontWeight: 600 }}>← Go back</button>
      </div>
    </div>
  );

  const isLT  = listing.rentalType === "LongTerm";
  const price = isLT ? (listing.baseMonthlyRate ?? listing.basePrice * 30) : listing.basePrice;

  return (
    <div style={{ background: C.bg, minHeight: "100vh", fontFamily: F.sans, color: C.ink }}>

      {/* ── Header ─────────────────────────────────────────────────────── */}
      <header style={{ position: "sticky", top: 0, zIndex: 40, display: "flex", alignItems: "center", justifyContent: "space-between", padding: "18px 40px", borderBottom: `1px solid ${C.ink}`, background: C.bg }}>
        <button onClick={() => navigate("/listings?browse=1")} style={{ background: "none", border: "none", cursor: "pointer", display: "flex", alignItems: "center", gap: 8, color: C.ink, fontFamily: F.sans, fontWeight: 600, fontSize: 14 }}>
          <ArrowLeft size={16} /> Back
        </button>
        <Eyebrow>N° {id.slice(0, 4).toUpperCase()} · {listing.cityName?.toUpperCase()}</Eyebrow>
        <div style={{ display: "flex", gap: 6 }}>
          <button style={{ padding: "9px 16px", border: `1px solid ${C.ink}`, background: "transparent", color: C.ink, borderRadius: 999, cursor: "pointer", fontFamily: F.mono, fontSize: 11, letterSpacing: "0.1em", display: "flex", alignItems: "center", gap: 6 }}>
            <Share2 size={12} /> Share
          </button>
          <button style={{ padding: "9px 16px", border: `1px solid ${C.ink}`, background: "transparent", color: C.ink, borderRadius: 999, cursor: "pointer", fontFamily: F.mono, fontSize: 11, letterSpacing: "0.1em", display: "flex", alignItems: "center", gap: 6 }}>
            <Heart size={12} /> Save
          </button>
        </div>
      </header>

      {/* ── Title block ────────────────────────────────────────────────── */}
      <div style={{ padding: "32px 40px 24px" }}>
        <Eyebrow style={{ marginBottom: 12 }}>
          —— {isLT ? "LONG-TERM · " : "SHORT-TERM · "}{listing.cityName?.toUpperCase()} · {listing.locationAccuracy?.toUpperCase()}
        </Eyebrow>
        <h1 style={{ fontFamily: F.serif, fontWeight: 400, fontSize: "clamp(40px, 5vw, 72px)", lineHeight: 0.95, letterSpacing: "-0.025em", margin: 0, maxWidth: 1100 }}>
          {listing.title}
        </h1>
        <div style={{ display: "flex", gap: 24, marginTop: 16, fontSize: 14, color: C.ink2, flexWrap: "wrap" }}>
          {listing.bedrooms   > 0 && <span style={{ display: "flex", alignItems: "center", gap: 6 }}><BedDouble size={16} /> {listing.bedrooms} bed{listing.bedrooms > 1 ? "s" : ""}</span>}
          {listing.bathrooms  > 0 && <span style={{ display: "flex", alignItems: "center", gap: 6 }}><Bath size={16} /> {listing.bathrooms} bath{listing.bathrooms > 1 ? "s" : ""}</span>}
          {listing.maxOccupancy > 0 && <span style={{ display: "flex", alignItems: "center", gap: 6 }}><Users size={16} /> {listing.maxOccupancy} guests</span>}
          {listing.instantBookEnabled && (
            <span style={{ background: C.accent, color: C.ink, padding: "3px 10px", fontFamily: F.mono, fontWeight: 600, fontSize: 10, letterSpacing: "0.1em", display: "flex", alignItems: "center", gap: 4 }}>
              <Zap size={10} /> INSTANT BOOK
            </span>
          )}
        </div>
      </div>

      {/* ── Gallery ────────────────────────────────────────────────────── */}
      <div style={{ padding: "0 40px 56px" }}>
        <Gallery photos={photos.length ? photos : DETAIL_FALLBACK} />
      </div>

      {/* ── Two-column body ────────────────────────────────────────────── */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 420px", gap: 80, padding: "0 40px 80px" }}>

        {/* LEFT */}
        <div>

          {/* Description */}
          {listing.description && (
            <div style={{ paddingBottom: 32, marginBottom: 32, borderBottom: `1px solid ${C.line}` }}>
              <p style={{ fontSize: 18, lineHeight: 1.65, color: C.ink, marginTop: 0 }}>
                <span style={{ fontFamily: F.serif, fontWeight: 400, fontSize: 52, float: "left", marginRight: 10, marginTop: 4, lineHeight: 0.8, color: C.primary }}>
                  {listing.description.charAt(0)}
                </span>
                {listing.description.slice(1)}
              </p>
            </div>
          )}

          {/* Amenities */}
          {presented.length > 0 && (
            <div style={{ paddingBottom: 32, marginBottom: 32, borderBottom: `1px solid ${C.line}` }}>
              <Eyebrow style={{ marginBottom: 24 }}>—— What this place offers</Eyebrow>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "18px 32px" }}>
                {visible.map((a) => (
                  <div key={a.amenityId} style={{ display: "flex", alignItems: "flex-start", gap: 14 }}>
                    <span style={{ color: C.ink, marginTop: 2, flexShrink: 0 }}>{amenityIcon(a.name)}</span>
                    <div>
                      <div style={{ fontSize: 15, fontWeight: 600, color: C.ink }}>{a.name}</div>
                    </div>
                  </div>
                ))}
              </div>
              {presented.length > 8 && (
                <button
                  onClick={() => setShowMore((v) => !v)}
                  style={{ marginTop: 20, background: "transparent", border: `1px solid ${C.ink}`, padding: "10px 20px", cursor: "pointer", fontFamily: F.sans, fontWeight: 600, fontSize: 13, color: C.ink }}
                >
                  {showMore ? "Show less" : `Show all ${presented.length} amenities`}
                </button>
              )}
            </div>
          )}

          {/* Availability calendar */}
          <div style={{ paddingBottom: 32, marginBottom: 32, borderBottom: `1px solid ${C.line}` }}>
            <Eyebrow style={{ marginBottom: 24 }}>—— Availability</Eyebrow>
            <AvailCalendar
              days={calDays}
              month={calMonth}
              year={calYear}
              onPrev={prevMonth}
              onNext={nextMonth}
            />
          </div>

          {/* Location */}
          <div>
            <Eyebrow style={{ marginBottom: 16 }}>—— Where you'll be</Eyebrow>
            <p style={{ fontSize: 14, color: C.ink3, marginBottom: 20, fontFamily: F.mono, letterSpacing: "0.05em" }}>
              {listing.cityName?.toUpperCase()} · EXACT LOCATION SHARED AFTER BOOKING
            </p>
            <div style={{ height: 280, border: `1px solid ${C.ink}`, background: "#EDE5D8", position: "relative", overflow: "hidden", display: "flex", alignItems: "center", justifyContent: "center" }}>
              {/* Fuzzy location circle */}
              <div style={{ width: 180, height: 180, borderRadius: "50%", background: `rgba(122,74,43,.12)`, border: `1px dashed rgba(122,74,43,.5)`, display: "flex", alignItems: "center", justifyContent: "center" }}>
                <div style={{ display: "flex", alignItems: "center", gap: 6, fontFamily: F.mono, fontSize: 10, color: C.primary, letterSpacing: "0.1em" }}>
                  <MapPin size={12} /> ~500m RADIUS
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* RIGHT — sticky booking card */}
        <div>
          <BookingCard listing={listing} />
        </div>
      </div>
    </div>
  );
}
