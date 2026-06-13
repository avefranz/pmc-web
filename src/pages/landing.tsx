import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import {
  Heart, ArrowRight, Wrench, Sparkles, Plug, Droplets, Wind,
  Hammer, CheckCircle2, Clock, ShieldCheck, MapPin,
  Home, Car, Camera, Building2, Settings2, Compass,
} from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { useAuthStore } from "@/lib/stores/auth.store";
import { useMarketplaceCities, useMarketplaceListings } from "@/lib/hooks/use-marketplace";
import { formatThb } from "@/lib/utils/format";
import { PhotoPlaceholder } from "@/components/shared/photo-placeholder";
import { cn } from "@/lib/utils/cn";
import type { MarketplaceListingPreviewDto } from "@/lib/types/marketplace";
import { SiamoLogo } from "@/components/layout/siamo-logo";
import { TopbarShell } from "@/components/layout/topbar-shell";
import { ThemeToggle } from "@/components/ui/theme-toggle";
import { LanguageSwitcher } from "@/components/layout/language-switcher";
import { useMe } from "@/lib/hooks/use-auth";
import { initials } from "@/lib/utils/format";
import { useQueryClient } from "@tanstack/react-query";

// ─── Static images ────────────────────────────────────────────────────────────
import villaImg    from "@/assets/asset-villa.jpg";
import vespaImg    from "@/assets/asset-vespa.jpg";
import studioImg   from "@/assets/asset-studio.jpg";
import defenderImg from "@/assets/asset-defender.jpg";
import mapImg      from "@/assets/map-preview.jpg";
import interiorImg from "@/assets/host-interior.jpg";
import plumbingImg    from "@/assets/service-plumbing.jpg";
import electricalImg  from "@/assets/service-electrical.jpg";
import airconImg      from "@/assets/service-aircon.jpg";
import handymanImg    from "@/assets/service-handyman.jpg";
import cleaningImg    from "@/assets/service-cleaning.jpg";
import maintenanceImg from "@/assets/service-maintenance.jpg";

// ─── Data ─────────────────────────────────────────────────────────────────────

const CATEGORIES = [
  { label: "Stays",       icon: Home      },
  { label: "Vehicles",    icon: Car       },
  { label: "Equipment",   icon: Camera    },
  { label: "Spaces",      icon: Building2 },
  { label: "Services",    icon: Settings2 },
  { label: "Experiences", icon: Compass   },
] as const;

type StaticAsset = {
  title: string;
  location: string;
  price: string;
  unit: string;
  rating: string;
  image: string;
  badge?: "verified" | "new";
};

const STATIC_ASSETS: StaticAsset[] = [
  { title: "The Pavilion House",      location: "Phuket, Thailand",     price: "฿12,400", unit: "/ day", rating: "4.92", image: villaImg,    badge: "verified" },
  { title: "1964 Vespa VBB",          location: "Bangkok, Thailand",    price: "฿850",    unit: "/ day", rating: "5.0",  image: vespaImg },
  { title: "Atelier Loft 04",         location: "Chiang Mai, Thailand", price: "฿4,200",  unit: "/ day", rating: "4.88", image: studioImg },
  { title: "Defender Heritage 110",   location: "Pai, Thailand",        price: "฿5,500",  unit: "/ day", rating: "4.97", image: defenderImg, badge: "new" },
];

type Service = {
  title: string;
  description: string;
  price: string;
  icon: React.ComponentType<{ className?: string }>;
  image: string;
  scope: string[];
  examples: string[];
  duration: string;
};

const SERVICES: Service[] = [
  {
    title: "Plumbing & Leaks",
    description: "Certified plumbers for pipes, fittings, water heaters.",
    price: "from ฿450",
    icon: Droplets,
    image: plumbingImg,
    scope: ["Pipe leak detection & repair", "Faucet & shower replacement", "Water heater installation", "Toilet & sewage repair", "Drain unclogging"],
    examples: ["Fix dripping kitchen faucet", "Replace broken water heater", "Unclog bathroom drain", "Repair burst pipe"],
    duration: "1 – 3 hours",
  },
  {
    title: "Electrical Repairs",
    description: "Licensed electricians for wiring, outlets, lighting.",
    price: "from ฿500",
    icon: Plug,
    image: electricalImg,
    scope: ["Wiring inspection & repair", "Outlet & switch replacement", "Light fixture installation", "Circuit breaker troubleshooting", "Smart home device setup"],
    examples: ["Install new ceiling lights", "Fix non-working outlets", "Replace faulty circuit breaker", "Set up smart switches"],
    duration: "1 – 4 hours",
  },
  {
    title: "Aircon Service",
    description: "Cleaning, gas refill, and full A/C maintenance.",
    price: "from ฿650",
    icon: Wind,
    image: airconImg,
    scope: ["Deep coil & filter cleaning", "Refrigerant gas refill", "Compressor inspection", "Duct & vent maintenance", "Annual maintenance plan"],
    examples: ["Clean 3 bedroom A/C units", "Refill refrigerant gas", "Fix weak cooling issue", "Annual A/C health check"],
    duration: "1 – 2 hours",
  },
  {
    title: "Handyman & Carpentry",
    description: "Doors, locks, furniture assembly, small fixes.",
    price: "from ฿400",
    icon: Hammer,
    image: handymanImg,
    scope: ["Door & lock repair", "Furniture assembly", "Wall mounting (TV, shelves)", "Minor carpentry work", "General household fixes"],
    examples: ["Assemble IKEA wardrobe", "Mount 65\" TV on wall", "Fix squeaky door hinge", "Install new door lock"],
    duration: "1 – 3 hours",
  },
  {
    title: "Deep Cleaning",
    description: "Move-in/out and post-stay professional cleaning.",
    price: "from ฿800",
    icon: Sparkles,
    image: cleaningImg,
    scope: ["Move-in / move-out cleaning", "Post-rental deep clean", "Kitchen & bathroom sanitization", "Floor scrubbing & polishing", "Window & glass cleaning"],
    examples: ["Deep clean 3-bed villa after guest", "Move-out cleaning for deposit", "Sanitize kitchen & bathrooms", "Clean all windows inside & out"],
    duration: "3 – 6 hours",
  },
  {
    title: "Full Maintenance Plan",
    description: "Monthly inspections across every asset you own.",
    price: "from ฿2,400/mo",
    icon: Wrench,
    image: maintenanceImg,
    scope: ["Monthly property inspection", "Preventive maintenance schedule", "Vendor coordination", "Repair cost tracking", "Priority emergency response"],
    examples: ["Monthly check of Phuket villa", "Coordinate all repairs for owner", "Preventive A/C & plumbing care", "24/7 emergency hotline access"],
    duration: "Ongoing monthly",
  },
];

// ─── Nav ──────────────────────────────────────────────────────────────────────

function LandingNav() {
  const { t } = useTranslation();
  const { token, clearAuth } = useAuthStore();
  const { data: me } = useMe();
  const qc = useQueryClient();
  const navigate = useNavigate();
  const name = me?.firstName ?? me?.lineName ?? me?.email ?? "";

  function handleSignOut() {
    clearAuth();
    qc.clear();
    navigate("/login", { replace: true });
  }

  return (
    <TopbarShell
      variant="blur"
      left={
        <>
          <Link to="/" className="shrink-0">
            <SiamoLogo className="h-9" />
          </Link>
          <div className="hidden md:flex items-center gap-6 ml-6 text-sm font-medium text-fg-muted">
            <a href="#browse"   className="hover:text-fg transition-colors">{t("nav.browseRentals")}</a>
            <a href="#services" className="hover:text-fg transition-colors">{t("nav.services")}</a>
            {/* BUG-70: logged-in hosts go straight to their dashboard, not the marketing anchor */}
            {token ? (
              <Link to="/me/host/properties" className="hover:text-fg transition-colors">{t("nav.hosting")}</Link>
            ) : (
              <a href="#host" className="hover:text-fg transition-colors">{t("nav.hosting")}</a>
            )}
          </div>
        </>
      }
      right={
        <>
          <ThemeToggle />
          <LanguageSwitcher />
          {token ? (
            <>
              <Link
                to="/me"
                className="hidden md:flex items-center gap-2 text-sm font-medium px-4 py-2 rounded-full border border-border hover:bg-bg-subtle transition-colors"
              >
                <div className="w-6 h-6 rounded-full bg-brand flex items-center justify-center shrink-0">
                  <span className="text-white text-[10px] font-bold">{initials(name) || "?"}</span>
                </div>
                <span>{name || t("auth.myAccount")}</span>
              </Link>
              <button
                onClick={handleSignOut}
                className="text-sm font-medium px-4 py-2 text-fg-muted hover:text-fg transition-colors"
              >
                {t("auth.signOut")}
              </button>
            </>
          ) : (
            <>
              <Link
                to="/login"
                className="text-sm font-medium px-4 py-2 text-fg hover:text-brand transition-colors"
              >
                {t("auth.signIn")}
              </Link>
              <Link
                to="/register"
                className="bg-fg text-bg-card text-sm font-medium px-5 py-2.5 rounded-full hover:bg-fg/90 transition-colors"
              >
                {t("auth.signUp")}
              </Link>
            </>
          )}
        </>
      }
    />
  );
}

// ─── Featured listing card (real data) ───────────────────────────────────────

function ListingCard({ listing, index }: { listing: MarketplaceListingPreviewDto; index: number }) {
  const { t } = useTranslation();
  const rate  = listing.monthlyRate || listing.baseMonthlyRate || listing.basePrice || 0;
  // Real photo only — never a generic stock fallback that misrepresents
  // what's actually being rented.
  const photo = listing.coverImageUrl;

  return (
    <Link
      to={`/listings/${listing.id}`}
      className="group cursor-pointer animate-fade-up block"
      style={{ animationDelay: `${(index + 1) * 100}ms` }}
    >
      <div className="relative aspect-[4/5] rounded-2xl overflow-hidden mb-3 bg-secondary">
        {photo ? (
          <img
            src={photo}
            alt={listing.title}
            loading="lazy"
            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-700"
          />
        ) : (
          <PhotoPlaceholder />
        )}
        <button
          aria-label="Save to favorites"
          onClick={(e) => e.preventDefault()}
          className="absolute top-4 right-4 text-white drop-shadow-md hover:scale-110 transition-transform"
        >
          <Heart className="size-5" />
        </button>
      </div>
      <div className="flex justify-between items-start">
        <h3 className="text-sm font-semibold text-foreground line-clamp-1">{listing.title}</h3>
        <span className="text-xs font-mono text-foreground shrink-0 ml-2">★ 4.9</span>
      </div>
      <p className="text-sm text-muted-foreground">{listing.cityName ?? "Thailand"}</p>
      <p className="text-sm mt-1">
        <span className="font-semibold">{formatThb(rate)}</span>{" "}
        <span className="text-muted-foreground">{t("home.perMonth")}</span>
      </p>
    </Link>
  );
}

// ─── Static asset card ────────────────────────────────────────────────────────

function StaticAssetCard({ asset, index }: { asset: StaticAsset; index: number }) {
  return (
    <Link
      to="/listings"
      className="group cursor-pointer animate-fade-up block"
      style={{ animationDelay: `${(index + 1) * 100}ms` }}
    >
      <div className="relative aspect-[4/5] rounded-2xl overflow-hidden mb-3 bg-secondary">
        <img
          src={asset.image}
          alt={`${asset.title} in ${asset.location}`}
          loading="lazy"
          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-700"
        />
        <button
          aria-label="Save to favorites"
          onClick={(e) => e.preventDefault()}
          className="absolute top-4 right-4 text-white drop-shadow-md hover:scale-110 transition-transform"
        >
          <Heart className="size-5" />
        </button>
        {asset.badge && (
          <span className={cn(
            "absolute top-4 left-4 px-2 py-1 rounded-full text-[10px] font-bold uppercase tracking-tight backdrop-blur-sm",
            asset.badge === "new"
              ? "bg-accent/90 text-accent-foreground"
              : "bg-white/90 text-foreground",
          )}>
            {asset.badge === "new" ? "New listing" : "Featured"}
          </span>
        )}
      </div>
      <div className="flex justify-between items-start">
        <h3 className="text-sm font-semibold text-foreground">{asset.title}</h3>
        <span className="text-xs font-mono text-foreground shrink-0 ml-2">★ {asset.rating}</span>
      </div>
      <p className="text-sm text-muted-foreground">{asset.location}</p>
      <p className="text-sm mt-1">
        <span className="font-semibold">{asset.price}</span>{" "}
        <span className="text-muted-foreground">{asset.unit}</span>
      </p>
    </Link>
  );
}

// ─── Service Detail Dialog ────────────────────────────────────────────────────

function ServiceDialog({ service, open, onClose }: { service: Service | null; open: boolean; onClose: () => void }) {
  if (!service) return null;
  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto p-0 gap-0">
        <div className="relative h-56 sm:h-72">
          <img
            src={service.image}
            alt={service.title}
            className="w-full h-full object-cover"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent" />
          <div className="absolute bottom-4 left-6 right-6 text-white">
            <span className="text-[10px] uppercase tracking-widest font-mono opacity-80">Siamo Service</span>
            <h3 className="font-display text-2xl sm:text-3xl mt-1">{service.title}</h3>
          </div>
        </div>

        <div className="p-6 sm:p-8 space-y-8">
          <DialogHeader className="text-left space-y-3">
            {/* Required by Radix for aria-labelledby — visually hidden since h3 above serves as visual title */}
            <DialogTitle className="sr-only">{service.title}</DialogTitle>
            <DialogDescription className="text-base text-muted-foreground leading-relaxed">
              {service.description}
            </DialogDescription>
            <div className="flex flex-wrap items-center gap-4 pt-2">
              <div className="flex items-center gap-2 text-sm font-mono bg-secondary px-3 py-1.5 rounded-lg">
                <Clock className="size-4 text-accent" />
                {service.duration}
              </div>
              <div className="flex items-center gap-2 text-sm font-mono bg-secondary px-3 py-1.5 rounded-lg">
                <ShieldCheck className="size-4 text-accent" />
                Fully insured
              </div>
            </div>
          </DialogHeader>

          <div>
            <h4 className="text-sm font-semibold uppercase tracking-widest mb-4 flex items-center gap-2">
              <CheckCircle2 className="size-4 text-accent" />
              What&apos;s included
            </h4>
            <ul className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {service.scope.map((item) => (
                <li key={item} className="flex items-start gap-2 text-sm text-muted-foreground">
                  <span className="size-1.5 rounded-full bg-accent mt-2 shrink-0" />
                  {item}
                </li>
              ))}
            </ul>
          </div>

          <div>
            <h4 className="text-sm font-semibold uppercase tracking-widest mb-4">Common jobs</h4>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {service.examples.map((ex) => (
                <div
                  key={ex}
                  className="flex items-center gap-3 p-3 rounded-xl bg-secondary/50 border border-border"
                >
                  <service.icon className="size-4 text-accent shrink-0" />
                  <span className="text-sm">{ex}</span>
                </div>
              ))}
            </div>
          </div>

          <div className="flex flex-col sm:flex-row items-center justify-between gap-4 pt-4 border-t border-border">
            <div>
              <span className="text-xs text-muted-foreground uppercase tracking-wider">Starting from</span>
              <p className="text-2xl font-display font-semibold">{service.price}</p>
            </div>
            <button
              onClick={onClose}
              className="w-full sm:w-auto bg-accent text-accent-foreground px-8 py-3 rounded-full font-medium hover:bg-accent/90 transition-colors"
            >
              Book this service
            </button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

// ─── Footer ───────────────────────────────────────────────────────────────────

function LandingFooter() {
  const { t } = useTranslation();
  return (
    <footer className="border-t border-border py-12 px-6">
      <div className="max-w-7xl mx-auto flex flex-col md:flex-row justify-between gap-12">
        <div className="max-w-xs">
          <Link to="/" aria-label="Siamo home">
            <SiamoLogo className="h-7 mb-4" />
          </Link>
          <p className="text-sm text-muted-foreground leading-relaxed">
            The premier marketplace for asset sharing and luxury management in Southeast Asia.
          </p>
        </div>
        <div className="grid grid-cols-2 md:grid-cols-3 gap-12">
          <div className="flex flex-col gap-4 text-sm">
            <span className="font-semibold">Discover</span>
            <Link to="/listings" className="text-muted-foreground hover:text-foreground transition-colors">Luxury Villas</Link>
            <Link to="/listings" className="text-muted-foreground hover:text-foreground transition-colors">Classic Cars</Link>
            <Link to="/listings" className="text-muted-foreground hover:text-foreground transition-colors">Pro Equipment</Link>
          </div>
          <div className="flex flex-col gap-4 text-sm">
            <span className="font-semibold">{t("nav.hosting")}</span>
            <Link to="/login"   className="text-muted-foreground hover:text-foreground transition-colors">List an Asset</Link>
            <a href="#services" className="text-muted-foreground hover:text-foreground transition-colors">Safety First</a>
            <a href="#services" className="text-muted-foreground hover:text-foreground transition-colors">Insurance</a>
          </div>
          <div className="flex flex-col gap-4 text-sm">
            <span className="font-semibold">Company</span>
            <a href="#" className="text-muted-foreground hover:text-foreground transition-colors">About</a>
            <a href="#" className="text-muted-foreground hover:text-foreground transition-colors">{t("footer.terms")}</a>
            <a href="#" className="text-muted-foreground hover:text-foreground transition-colors">{t("footer.privacy")}</a>
          </div>
        </div>
      </div>
      <div className="max-w-7xl mx-auto mt-12 pt-8 border-t border-border flex flex-col sm:flex-row justify-between items-center gap-2 text-[10px] font-mono uppercase tracking-widest text-muted-foreground">
        <span>© {new Date().getFullYear()} Siamo Collective</span>
        <span>Based in Bangkok</span>
      </div>
    </footer>
  );
}

// ─── Landing Page ─────────────────────────────────────────────────────────────

export default function LandingPage() {
  const { t, i18n } = useTranslation();
  const { token } = useAuthStore();
  const navigate = useNavigate();
  const { data: cities } = useMarketplaceCities();
  const { data: featuredData } = useMarketplaceListings({ page: 1, pageSize: 4, sort: "Newest" });

  const [selectedService, setSelectedService] = useState<Service | null>(null);
  const [dialogOpen, setDialogOpen]           = useState(false);
  const [activeCategory, setActiveCategory]   = useState(0);

  const featured  = featuredData?.items ?? [];
  const topCities = (cities ?? []).slice(0, 4);
  const lang      = i18n.language as "en" | "th";

  function openService(s: Service) {
    setSelectedService(s);
    setDialogOpen(true);
  }

  return (
    <div className="min-h-screen bg-background text-foreground font-sans selection:bg-accent/10 selection:text-accent">

      {/* ── Navigation ── */}
      <LandingNav />

      {/* ── Hero ── */}
      <header className="pt-16 pb-6 px-6">
        <div className="max-w-3xl mx-auto animate-fade-up text-center">

          {/* Eyebrow badge — creates anticipation (per UX philosophy) */}
          <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-secondary border border-border text-[11px] font-mono uppercase tracking-widest text-muted-foreground mb-6">
            <span className="size-1.5 rounded-full bg-accent animate-pulse" />
            Premium · Long-stay · Thailand
          </div>

          <h1 className="font-display text-4xl md:text-6xl tracking-tight leading-[1.05] mb-6">
            Rent <em className="italic font-normal">extraordinary</em> assets across Thailand.
          </h1>

          {/* UX-284: explicit landlord on-ramp in the hero — the tenant
              search bar dominates the fold and a cold-visiting host could
              easily miss that Siamo also works for hosting. Anchors down
              to the existing Host CTA section so the value-prop is one
              click away. */}
          <p className="text-sm text-muted-foreground mb-8">
            Listing your place instead?{" "}
            <a
              href="#host"
              className="font-semibold text-accent hover:underline underline-offset-2"
            >
              See how hosting works →
            </a>
          </p>

          <div className="bg-card rounded-full p-2 ring-1 ring-black/5 shadow-xl shadow-black/[0.04] flex items-center">
            <div className="flex-1 grid grid-cols-2 sm:grid-cols-4 divide-x divide-border">
              <button
                onClick={() => navigate("/listings")}
                className="px-4 sm:px-6 py-3 text-left hover:bg-secondary rounded-l-full transition-colors"
              >
                <p className="text-[10px] uppercase tracking-wider font-bold text-accent">{t("search.where")}</p>
                <p className="text-sm text-muted-foreground truncate">{t("search.whereTo")}</p>
              </button>
              <button
                onClick={() => navigate("/listings")}
                className="px-4 sm:px-6 py-3 text-left hover:bg-secondary transition-colors"
              >
                <p className="text-[10px] uppercase tracking-wider font-bold text-accent">Type</p>
                <p className="text-sm text-muted-foreground truncate">Stays &amp; Spaces</p>
              </button>
              <button
                onClick={() => navigate("/listings")}
                className="hidden sm:block px-6 py-3 text-left hover:bg-secondary transition-colors"
              >
                <p className="text-[10px] uppercase tracking-wider font-bold text-accent">{t("search.moveIn")}</p>
                <p className="text-sm text-muted-foreground">{t("search.flexible")}</p>
              </button>
              <button
                onClick={() => navigate("/listings")}
                className="hidden sm:block px-6 py-3 text-left hover:bg-secondary rounded-r-full transition-colors"
              >
                <p className="text-[10px] uppercase tracking-wider font-bold text-accent">{t("search.duration")}</p>
                <p className="text-sm text-muted-foreground">{t("search.anyLength")}</p>
              </button>
            </div>
            <button
              aria-label={t("search.search")}
              onClick={() => navigate("/listings")}
              className="bg-accent size-12 rounded-full flex items-center justify-center text-accent-foreground ml-2 shrink-0 hover:scale-105 transition-transform"
            >
              <ArrowRight className="size-4" />
            </button>
          </div>
        </div>
      </header>

      {/* ── Category chips ── */}
      <div className="overflow-x-auto no-scrollbar py-4 border-b border-border" id="browse">
        <div className="max-w-7xl mx-auto px-6 flex items-center gap-8 sm:gap-10">
          {CATEGORIES.map(({ label, icon: Icon }, i) => (
            <button
              key={label}
              onClick={() => setActiveCategory(i)}
              className={cn(
                "flex flex-col items-center gap-1.5 pb-3 border-b-2 transition-all shrink-0",
                i === activeCategory
                  ? "border-foreground text-foreground"
                  : "border-transparent text-muted-foreground hover:text-foreground",
              )}
            >
              <Icon className="size-5" />
              <span className="text-[11px] font-medium uppercase tracking-tighter">{label}</span>
            </button>
          ))}
        </div>
      </div>

      {/* ── Featured grid — real listings ── */}
      {featured.length > 0 && (
        <main className="max-w-7xl mx-auto px-6 py-12">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-x-6 gap-y-10">
            {featured.map((listing, i) => (
              <ListingCard key={listing.id} listing={listing} index={i} />
            ))}
          </div>
          <div className="mt-10 flex justify-center">
            <Link
              to="/listings"
              className="inline-flex items-center gap-2 px-8 h-12 rounded-full border-2 border-foreground text-foreground text-sm font-semibold hover:bg-foreground hover:text-background transition-all duration-200"
            >
              {t("home.browseAllRentals")} <ArrowRight className="size-4" />
            </Link>
          </div>
        </main>
      )}

      {/* ── Fallback: static showcase assets (when API has no data yet) ── */}
      {featured.length === 0 && (
        <main className="max-w-7xl mx-auto px-6 py-12">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-x-6 gap-y-10">
            {STATIC_ASSETS.map((asset, i) => (
              <StaticAssetCard key={asset.title} asset={asset} index={i} />
            ))}
          </div>
          <div className="mt-10 flex justify-center">
            <Link
              to="/listings"
              className="inline-flex items-center gap-2 px-8 h-12 rounded-full border-2 border-foreground text-foreground text-sm font-semibold hover:bg-foreground hover:text-background transition-all duration-200"
            >
              {t("home.browseAllRentals")} <ArrowRight className="size-4" />
            </Link>
          </div>
        </main>
      )}

      {/* ── Popular cities ── */}
      {topCities.length > 0 && (
        <section className="max-w-7xl mx-auto px-6 pb-16">
          <h2 className="font-display text-2xl md:text-3xl italic mb-6">{t("home.popularDestinations")}</h2>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            {topCities.map((city, idx) => (
              <Link
                key={city.id}
                to={`/listings?cityId=${city.id}`}
                className="group relative aspect-[3/2] rounded-2xl overflow-hidden bg-secondary hover:ring-2 hover:ring-accent/30 hover:scale-[1.02] transition-all duration-200"
              >
                {/* Faint MapPin watermark — adds visual texture without images */}
                <MapPin
                  className={cn(
                    "absolute inset-0 m-auto size-16 opacity-[0.06] transition-opacity group-hover:opacity-[0.10]",
                    idx % 2 === 0 ? "text-accent" : "text-foreground",
                  )}
                />
                <div className="absolute inset-0 bg-gradient-to-t from-black/25 via-transparent to-transparent" />
                <div className="absolute bottom-0 left-0 right-0 p-3">
                  <p className="text-foreground text-sm font-bold leading-tight drop-shadow-sm">
                    {city.name[lang] ?? city.name.en}
                  </p>
                  {city.activeListingsCount > 0 && (
                    <p className="text-muted-foreground text-[11px] mt-0.5">
                      {city.activeListingsCount} places
                    </p>
                  )}
                </div>
              </Link>
            ))}
          </div>
        </section>
      )}

      {/* ── Map teaser ── */}
      <section className="max-w-7xl mx-auto px-6 mb-24" id="map">
        <div className="relative h-[400px] rounded-3xl overflow-hidden">
          <img
            src={mapImg}
            alt="Map preview of Siamo listings across Bangkok"
            loading="lazy"
            className="w-full h-full object-cover"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-black/40 to-transparent flex items-end p-6 md:p-12">
            <div className="bg-card rounded-2xl p-6 max-w-sm shadow-2xl">
              <h2 className="font-display text-xl mb-2 italic">Explore Siamo visually</h2>
              <p className="text-sm text-muted-foreground mb-4">
                Discover listings nearby with our interactive map.
              </p>
              <Link
                to="/listings"
                className="block w-full bg-accent text-accent-foreground py-3 rounded-xl font-medium text-center hover:bg-accent/90 transition-colors"
              >
                Open Map View
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* ── Services ── */}
      <section className="max-w-7xl mx-auto px-6 mb-24" id="services">
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 mb-10">
          <div className="max-w-xl">
            <span className="font-mono text-xs uppercase tracking-widest text-accent mb-3 block">
              On-demand services
            </span>
            <h2 className="font-display text-4xl md:text-5xl tracking-tight leading-tight italic">
              Book a technician for any maintenance need.
            </h2>
            <p className="text-muted-foreground mt-4">
              From a leaking pipe to a full villa tune-up — Siamo dispatches insured
              professionals to keep every asset in showroom condition.
            </p>
          </div>
          <button
            onClick={() => navigate("/listings")}
            className="self-start md:self-end bg-foreground text-background text-sm font-medium px-6 py-3 rounded-full hover:bg-foreground/90 transition-colors shrink-0"
          >
            Browse all services
          </button>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {SERVICES.map((service, i) => (
            <article
              key={service.title}
              className="group p-6 rounded-2xl border border-border bg-card hover:border-foreground/40 hover:shadow-lg transition-all cursor-pointer animate-fade-up"
              style={{ animationDelay: `${i * 80}ms` }}
              onClick={() => openService(service)}
            >
              <div className="size-12 rounded-xl bg-secondary flex items-center justify-center mb-5 group-hover:bg-accent group-hover:text-accent-foreground transition-colors">
                <service.icon className="size-5" />
              </div>
              <h3 className="font-semibold text-base mb-2">{service.title}</h3>
              <p className="text-sm text-muted-foreground mb-5 leading-relaxed">{service.description}</p>
              <div className="flex items-center justify-between pt-4 border-t border-border">
                <span className="text-sm font-mono">{service.price}</span>
                <span className="text-xs font-medium text-accent flex items-center gap-1 group-hover:gap-2 transition-all">
                  View details <ArrowRight className="size-3" />
                </span>
              </div>
            </article>
          ))}
        </div>
      </section>

      {/* ── Service detail dialog ── */}
      <ServiceDialog service={selectedService} open={dialogOpen} onClose={() => setDialogOpen(false)} />

      {/* ── Host CTA ── */}
      <section className="bg-secondary border-y border-border py-24 px-6 overflow-hidden" id="host">
        <div className="max-w-7xl mx-auto grid md:grid-cols-2 gap-16 items-center">
          <div>
            <span className="font-mono text-xs uppercase tracking-widest text-accent mb-6 block">
              {t("nav.hosting")} on Siamo
            </span>
            <h2 className="font-display text-5xl md:text-6xl text-balance leading-tight mb-8 italic text-foreground">
              Turn your idle assets into{" "}
              <span className="text-[#D97706]">{t("home.revenueWord")}</span>.
            </h2>
            <p className="text-lg text-muted-foreground max-w-md mb-10">
              Whether it&apos;s a coastal villa or a vintage camera, Siamo provides the trust layer to
              share safely.
            </p>
            <div className="flex items-baseline gap-4 mb-12">
              <span className="text-6xl font-display text-foreground">฿64k</span>
              <span className="text-muted-foreground font-mono text-sm">avg. monthly potential</span>
            </div>
            <Link
              to={token ? "/me/host/properties" : "/login"}
              className="inline-flex items-center border border-border hover:bg-foreground hover:text-background transition-all px-8 py-4 rounded-full font-medium text-foreground"
            >
              {t("home.startHosting")}
            </Link>
          </div>
          <div className="relative">
            <img
              src={interiorImg}
              alt="Luxury Bangkok apartment interior at golden hour"
              loading="lazy"
              className="aspect-[3/4] w-full object-cover rounded-3xl opacity-80"
            />
            <div className="absolute -bottom-8 -left-2 md:-left-8 bg-[#F0A455] text-[#1A1A1A] p-6 md:p-8 rounded-2xl shadow-xl max-w-[300px]">
              <p className="text-xs uppercase tracking-widest mb-2 opacity-70">Host story</p>
              <p className="text-lg md:text-xl font-display italic leading-snug">
                &ldquo;Siamo handles the trust, I just provide the key.&rdquo;
              </p>
              <p className="mt-4 text-xs font-mono opacity-60">— Malee K., Bangkok</p>
            </div>
          </div>
        </div>
      </section>

      {/* ── Footer ── */}
      <LandingFooter />
    </div>
  );
}
