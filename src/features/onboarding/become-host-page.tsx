import { useState, useEffect, useRef } from "react";
import { Link } from "react-router-dom";
import {
  ArrowRight, CheckCircle2, Home, CalendarCheck, Banknote,
  ShieldCheck, FileText, ClipboardList, HeadphonesIcon,
  ChevronDown,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils/cn";
import { formatThb } from "@/lib/utils/format";

// ─── Animated counter ─────────────────────────────────────────────────────────

function useCountUp(target: number, duration = 650) {
  const [value, setValue] = useState(target);
  const fromRef = useRef(target);
  const rafRef  = useRef<number | null>(null);

  useEffect(() => {
    if (fromRef.current === target) return;
    const from  = fromRef.current;
    const start = performance.now();

    function tick(now: number) {
      const t = Math.min((now - start) / duration, 1);
      const eased = 1 - Math.pow(1 - t, 3);
      setValue(Math.round(from + (target - from) * eased));
      if (t < 1) {
        rafRef.current = requestAnimationFrame(tick);
      } else {
        fromRef.current = target;
      }
    }

    if (rafRef.current) cancelAnimationFrame(rafRef.current);
    rafRef.current = requestAnimationFrame(tick);
    return () => { if (rafRef.current) cancelAnimationFrame(rafRef.current); };
  }, [target, duration]);

  return value;
}

// ─── Earnings data ────────────────────────────────────────────────────────────

const CITIES = ["Bangkok", "Phuket", "Chiang Mai", "Pattaya", "Hua Hin"] as const;
type City = typeof CITIES[number];

const BED_LABELS = ["Studio", "1 BR", "2 BR", "3+ BR"] as const;
type BedLabel = typeof BED_LABELS[number];

const EARNINGS: Record<City, Record<BedLabel, { low: number; high: number }>> = {
  Bangkok:      { Studio: { low: 12_000, high: 18_000 }, "1 BR": { low: 22_000, high: 38_000 }, "2 BR": { low: 38_000, high: 60_000 }, "3+ BR": { low: 60_000, high: 95_000 } },
  Phuket:       { Studio: { low: 15_000, high: 25_000 }, "1 BR": { low: 28_000, high: 48_000 }, "2 BR": { low: 45_000, high: 80_000 }, "3+ BR": { low: 80_000, high: 145_000 } },
  "Chiang Mai": { Studio: { low: 8_000,  high: 14_000 }, "1 BR": { low: 14_000, high: 25_000 }, "2 BR": { low: 22_000, high: 40_000 }, "3+ BR": { low: 38_000, high: 65_000 } },
  Pattaya:      { Studio: { low: 10_000, high: 18_000 }, "1 BR": { low: 18_000, high: 32_000 }, "2 BR": { low: 30_000, high: 55_000 }, "3+ BR": { low: 52_000, high: 88_000 } },
  "Hua Hin":    { Studio: { low: 12_000, high: 20_000 }, "1 BR": { low: 20_000, high: 35_000 }, "2 BR": { low: 32_000, high: 58_000 }, "3+ BR": { low: 55_000, high: 100_000 } },
};

// ─── Earnings calculator card ─────────────────────────────────────────────────

function EarningsCalculator() {
  const [city, setCity] = useState<City>("Bangkok");
  const [bed,  setBed]  = useState<BedLabel>("1 BR");

  const range    = EARNINGS[city][bed];
  const midpoint = Math.round((range.low + range.high) / 2);
  const animated = useCountUp(midpoint);

  return (
    <div className="bg-white rounded-[28px] p-6 shadow-[0_24px_64px_rgba(0,0,0,0.28)]">

      {/* Header */}
      <p className="text-[11px] font-bold uppercase tracking-[0.12em] text-[#6B6B6B] mb-4">
        Estimate your monthly income
      </p>

      {/* City pills */}
      <div className="mb-4">
        <p className="text-[10px] font-semibold uppercase tracking-[0.08em] text-[#ADADAD] mb-2">City</p>
        <div className="flex flex-wrap gap-1.5">
          {CITIES.map((c) => (
            <button
              key={c}
              onClick={() => setCity(c)}
              className={cn(
                "px-3 py-1 rounded-full text-[12px] font-semibold transition-all duration-150",
                city === c
                  ? "bg-[#1A1A1A] text-white shadow-sm"
                  : "bg-[#F5F5F5] text-[#6B6B6B] hover:bg-[#EBEBEB] hover:text-[#1A1A1A]",
              )}
            >
              {c}
            </button>
          ))}
        </div>
      </div>

      {/* Bedroom pills */}
      <div className="mb-5">
        <p className="text-[10px] font-semibold uppercase tracking-[0.08em] text-[#ADADAD] mb-2">Property size</p>
        <div className="flex gap-1.5">
          {BED_LABELS.map((b) => (
            <button
              key={b}
              onClick={() => setBed(b)}
              className={cn(
                "flex-1 py-1.5 rounded-full text-[12px] font-semibold transition-all duration-150",
                bed === b
                  ? "bg-[#1A1A1A] text-white shadow-sm"
                  : "bg-[#F5F5F5] text-[#6B6B6B] hover:bg-[#EBEBEB] hover:text-[#1A1A1A]",
              )}
            >
              {b}
            </button>
          ))}
        </div>
      </div>

      {/* Earnings display */}
      <div className="rounded-2xl px-5 py-5 text-center mb-4"
        style={{ background: "linear-gradient(135deg, #FFF8F0 0%, #FFF3E5 100%)" }}>
        <p className="text-[11px] font-semibold text-[#9B6B3A] mb-1.5 uppercase tracking-[0.06em]">
          Estimated monthly
        </p>
        <p
          className="text-[44px] font-black leading-none tracking-[-0.04em] mb-1.5 tabular-nums"
          style={{ color: "#C26A1E" }}
        >
          {formatThb(animated)}
        </p>
        <p className="text-[12px] text-[#B08040]">
          {formatThb(range.low)} – {formatThb(range.high)} range
        </p>
        <p className="text-[11px] text-[#ADADAD] mt-1">
          Up to {formatThb(range.high * 12)} per year
        </p>
      </div>

      <Button
        asChild
        className="w-full rounded-xl h-11 font-bold text-[14px]"
        style={{ background: "#1A1A1A", color: "#fff" }}
      >
        <Link to="/me/host/properties/new" className="flex items-center justify-center gap-2">
          List your property free
          <ArrowRight size={15} strokeWidth={2.5} />
        </Link>
      </Button>

      <p className="text-[11px] text-center text-[#ADADAD] mt-2.5">
        Free to list · No hidden fees
      </p>
    </div>
  );
}

// ─── Steps data ───────────────────────────────────────────────────────────────

const STEPS = [
  {
    icon: <Home   size={22} strokeWidth={1.6} />,
    accent: "#3B82F6",
    bg: "#EFF6FF",
    number: "01",
    title: "List your property",
    body: "Add photos, set your price, and describe your space. Takes less than 10 minutes.",
  },
  {
    icon: <CalendarCheck size={22} strokeWidth={1.6} />,
    accent: "#8B5CF6",
    bg: "#F5F3FF",
    number: "02",
    title: "We manage bookings",
    body: "Siamo handles tenant screening, bilingual contracts, ID verification, and TM30 filings.",
  },
  {
    icon: <Banknote size={22} strokeWidth={1.6} />,
    accent: "#10B981",
    bg: "#ECFDF5",
    number: "03",
    title: "Receive rent every month",
    body: "Payments land directly in your account. Track everything from your dashboard.",
  },
];

// ─── Trust card data ──────────────────────────────────────────────────────────

const TRUST = [
  {
    icon: <FileText     size={20} strokeWidth={1.5} />,
    accent: "#3B82F6", bg: "#EFF6FF",
    title: "Bilingual contract",
    body: "Every rental comes with a legally-reviewed EN & TH contract — drafted by Siamo.",
  },
  {
    icon: <ShieldCheck  size={20} strokeWidth={1.5} />,
    accent: "#10B981", bg: "#ECFDF5",
    title: "Deposit protection",
    body: "Tenant deposits are held securely in escrow — released only when both parties agree.",
  },
  {
    icon: <ClipboardList size={20} strokeWidth={1.5} />,
    accent: "#F59E0B", bg: "#FFFBEB",
    title: "TM30 on autopilot",
    body: "Immigration notices filed within 24 hours of move-in. No paperwork for you.",
  },
  {
    icon: <HeadphonesIcon size={20} strokeWidth={1.5} />,
    accent: "#8B5CF6", bg: "#F5F3FF",
    title: "Real human support",
    body: "Bangkok-hours team, fluent in EN, TH & RU. We're here when things get complicated.",
  },
];

// ─── Social proof strip ───────────────────────────────────────────────────────

const STATS = [
  { value: "1,200+",  label: "Active hosts" },
  { value: "฿42,000", label: "Avg. monthly income" },
  { value: "98%",     label: "Host satisfaction" },
  { value: "24h",     label: "TM30 filing" },
];

// ─── Page ─────────────────────────────────────────────────────────────────────

export function BecomeHostPage() {
  const [faqOpen, setFaqOpen] = useState<number | null>(null);

  return (
    <div className="max-w-5xl mx-auto px-4 md:px-6 pb-20">

      {/* ── Hero ── */}
      <div
        className="relative overflow-hidden rounded-[32px] mt-2 mb-10"
        style={{
          background:
            "radial-gradient(circle at 20% 40%, rgba(240,164,85,0.10) 0%, transparent 50%)," +
            "radial-gradient(circle at 80% 60%, rgba(240,120,60,0.06) 0%, transparent 45%)," +
            "linear-gradient(145deg, #0A0A0A 0%, #141414 45%, #1D1D1D 100%)",
        }}
      >
        {/* Subtle dot grid */}
        <div
          className="absolute inset-0 pointer-events-none"
          style={{
            backgroundImage:
              "radial-gradient(circle, rgba(255,255,255,0.06) 1px, transparent 1px)",
            backgroundSize: "28px 28px",
            maskImage: "radial-gradient(ellipse at center, black 30%, transparent 80%)",
          }}
        />

        <div className="relative z-10 px-8 md:px-12 py-12 md:py-16 grid grid-cols-1 lg:grid-cols-[1fr_400px] gap-10 items-center">

          {/* Copy */}
          <div>
            <div className="inline-flex items-center gap-2 rounded-full px-3.5 py-1.5 mb-7 text-[12px] font-semibold"
              style={{ background: "rgba(255,255,255,0.08)", color: "rgba(255,255,255,0.75)" }}>
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse shrink-0" />
              1,200+ hosts earning passively in Thailand
            </div>

            <h1
              className="text-[38px] md:text-[52px] font-black leading-[1.04] tracking-[-0.035em] mb-5 text-white"
            >
              Your property.<br />
              <span style={{ color: "#F0A455" }}>Your income.</span><br />
              We handle everything.
            </h1>

            <p className="text-[15px] md:text-[16px] leading-relaxed mb-8 max-w-[440px]"
              style={{ color: "rgba(255,255,255,0.60)" }}>
              List in minutes. We manage bookings, contracts, ID checks, and TM30 filings — so you never have to.
            </p>

            {/* Social proof checkmarks */}
            <div className="flex flex-col gap-2.5 mb-9">
              {[
                "฿42,000 average monthly income",
                "Bilingual EN & TH contracts included",
                "Zero commission on your first 3 months",
              ].map((s) => (
                <div key={s} className="flex items-center gap-2.5 text-[13.5px]"
                  style={{ color: "rgba(255,255,255,0.70)" }}>
                  <CheckCircle2 size={15} className="text-emerald-400 shrink-0" strokeWidth={2.2} />
                  {s}
                </div>
              ))}
            </div>

            <div className="flex flex-wrap items-center gap-3">
              <Button
                asChild
                size="lg"
                className="rounded-xl font-bold px-7 h-12 text-[14px] shadow-lg"
                style={{ background: "#FFFFFF", color: "#1A1A1A" }}
              >
                <Link to="/me/host/properties/new" className="flex items-center gap-2">
                  Start for free
                  <ArrowRight size={16} strokeWidth={2.5} />
                </Link>
              </Button>
              <p className="text-[12px]" style={{ color: "rgba(255,255,255,0.40)" }}>
                No credit card · No commitment
              </p>
            </div>
          </div>

          {/* Calculator */}
          <EarningsCalculator />
        </div>
      </div>

      {/* ── Stats strip ── */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-12">
        {STATS.map(({ value, label }) => (
          <div
            key={label}
            className="rounded-2xl border border-border bg-bg-card px-5 py-4 text-center shadow-card"
          >
            <p className="text-[26px] font-black text-fg tracking-tight leading-none mb-1 tabular-nums">
              {value}
            </p>
            <p className="text-[12px] text-fg-muted font-medium">{label}</p>
          </div>
        ))}
      </div>

      {/* ── How it works ── */}
      <div className="mb-14">
        <div className="text-center mb-9">
          <p className="text-[11px] font-bold uppercase tracking-[0.12em] text-fg-muted mb-1.5">Process</p>
          <h2 className="text-[26px] md:text-[30px] font-black text-fg tracking-[-0.025em]">
            From listing to income in 3 steps
          </h2>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 relative">
          {/* connector */}
          <div className="hidden md:block absolute top-[28px] left-[calc(33.33%+4px)] right-[calc(33.33%+4px)] h-px"
            style={{ background: "linear-gradient(90deg, transparent, var(--color-border), transparent)" }} />

          {STEPS.map(({ icon, accent, bg, number, title, body }) => (
            <div key={number} className="relative rounded-2xl border border-border bg-bg-card p-6 shadow-card">
              <div className="flex items-start gap-4 mb-4">
                <div className="w-12 h-12 rounded-2xl flex items-center justify-center shrink-0"
                  style={{ background: bg, color: accent }}>
                  {icon}
                </div>
                <span className="text-[11px] font-black text-fg-subtle tabular-nums mt-4 tracking-[0.05em]">
                  {number}
                </span>
              </div>
              <h3 className="text-[16px] font-bold text-fg mb-2 leading-snug">{title}</h3>
              <p className="text-[13.5px] text-fg-muted leading-relaxed">{body}</p>
            </div>
          ))}
        </div>
      </div>

      {/* ── Why Siamo ── */}
      <div className="mb-14">
        <div className="text-center mb-9">
          <p className="text-[11px] font-bold uppercase tracking-[0.12em] text-fg-muted mb-1.5">Why Siamo</p>
          <h2 className="text-[26px] md:text-[30px] font-black text-fg tracking-[-0.025em]">
            Everything handled for you
          </h2>
          <p className="text-[14px] text-fg-muted mt-2 max-w-md mx-auto">
            We built the platform landlords in Thailand have always needed.
          </p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {TRUST.map(({ icon, accent, bg, title, body }) => (
            <div
              key={title}
              className="flex gap-4 p-5 rounded-2xl border border-border bg-bg-card shadow-card hover:shadow-hover transition-shadow"
            >
              <div className="w-11 h-11 rounded-xl flex items-center justify-center shrink-0"
                style={{ background: bg, color: accent }}>
                {icon}
              </div>
              <div>
                <p className="text-[15px] font-bold text-fg mb-1 leading-snug">{title}</p>
                <p className="text-[13px] text-fg-muted leading-relaxed">{body}</p>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* ── FAQ ── */}
      <div className="mb-14">
        <div className="text-center mb-7">
          <p className="text-[11px] font-bold uppercase tracking-[0.12em] text-fg-muted mb-1.5">FAQ</p>
          <h2 className="text-[24px] font-black text-fg tracking-[-0.02em]">Common questions</h2>
        </div>

        <div className="space-y-2 max-w-2xl mx-auto">
          {[
            {
              q: "How much does it cost to list?",
              a: "Listing is completely free. Siamo charges a service fee only when a booking is confirmed — there are no upfront costs.",
            },
            {
              q: "Do I need to speak Thai to use Siamo?",
              a: "Not at all. Siamo operates in English, Thai, and Russian. All contracts are bilingual (EN & TH) by default.",
            },
            {
              q: "What happens if a tenant doesn't pay?",
              a: "Rent is collected via Siamo before it reaches you. Tenants must pay before the monthly period begins — you're always protected.",
            },
            {
              q: "How is the deposit handled?",
              a: "Deposits are held in escrow by Siamo — not by you or the tenant. They're released only upon mutual agreement at move-out.",
            },
          ].map(({ q, a }, i) => (
            <div key={i} className="rounded-2xl border border-border bg-bg-card overflow-hidden">
              <button
                onClick={() => setFaqOpen(faqOpen === i ? null : i)}
                className="w-full flex items-center justify-between px-5 py-4 text-left"
              >
                <span className="text-[14px] font-semibold text-fg pr-4">{q}</span>
                <ChevronDown
                  size={16}
                  className={cn(
                    "text-fg-muted shrink-0 transition-transform duration-200",
                    faqOpen === i && "rotate-180",
                  )}
                />
              </button>
              {faqOpen === i && (
                <div className="px-5 pb-4">
                  <p className="text-[13.5px] text-fg-muted leading-relaxed">{a}</p>
                </div>
              )}
            </div>
          ))}
        </div>
      </div>

      {/* ── Final CTA ── */}
      <div
        className="rounded-[28px] px-8 py-12 text-center overflow-hidden relative"
        style={{
          background:
            "radial-gradient(circle at 50% 0%, rgba(240,164,85,0.12) 0%, transparent 60%)," +
            "linear-gradient(135deg, #0A0A0A 0%, #1A1A1A 100%)",
        }}
      >
        <div
          className="absolute inset-0 pointer-events-none"
          style={{
            backgroundImage:
              "radial-gradient(circle, rgba(255,255,255,0.05) 1px, transparent 1px)",
            backgroundSize: "24px 24px",
            maskImage: "radial-gradient(ellipse 70% 50% at 50% 50%, black 0%, transparent 100%)",
          }}
        />
        <div className="relative z-10">
          <p className="text-[13px] font-bold uppercase tracking-[0.12em] mb-3"
            style={{ color: "#F0A455" }}>
            Ready to start earning?
          </p>
          <h2 className="text-[30px] md:text-[38px] font-black text-white tracking-[-0.03em] leading-tight mb-4">
            Your first listing is<br />
            just 10 minutes away.
          </h2>
          <p className="text-[14px] mb-8 max-w-sm mx-auto"
            style={{ color: "rgba(255,255,255,0.55)" }}>
            Join 1,200+ hosts who turned their property into a passive income stream with Siamo.
          </p>
          <Button
            asChild
            size="lg"
            className="rounded-xl font-bold px-10 h-13 text-[15px] shadow-xl"
            style={{ background: "#FFFFFF", color: "#1A1A1A" }}
          >
            <Link to="/me/host/properties/new" className="flex items-center gap-2">
              List your property — it's free
              <ArrowRight size={16} strokeWidth={2.5} />
            </Link>
          </Button>
          <p className="text-[11px] mt-3" style={{ color: "rgba(255,255,255,0.35)" }}>
            No credit card · Cancel anytime
          </p>
        </div>
      </div>
    </div>
  );
}
