import { createFileRoute } from "@tanstack/react-router";
import React, { useState } from "react";
import { Heart, ArrowRight, Wrench, Sparkles, Plug, Droplets, Wind, Hammer, CheckCircle2, Clock, ShieldCheck } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import villaImg from "@/assets/asset-villa.jpg";
import vespaImg from "@/assets/asset-vespa.jpg";
import studioImg from "@/assets/asset-studio.jpg";
import defenderImg from "@/assets/asset-defender.jpg";
import mapImg from "@/assets/map-preview.jpg";
import interiorImg from "@/assets/host-interior.jpg";
import plumbingImg from "@/assets/service-plumbing.jpg";
import electricalImg from "@/assets/service-electrical.jpg";
import airconImg from "@/assets/service-aircon.jpg";
import handymanImg from "@/assets/service-handyman.jpg";
import cleaningImg from "@/assets/service-cleaning.jpg";
import maintenanceImg from "@/assets/service-maintenance.jpg";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Siamo — Rent Villas, Vehicles & Spaces in Thailand" },
      {
        name: "description",
        content:
          "Discover verified villas, classic vehicles, pro equipment, and creative spaces across Thailand. Book with confidence on Siamo, the premium asset marketplace.",
      },
      { property: "og:title", content: "Siamo — Premium Asset Marketplace" },
      {
        property: "og:description",
        content: "Rent and share premium assets across Thailand with verified hosts.",
      },
      { property: "og:url", content: "/" },
    ],
    links: [{ rel: "canonical", href: "/" }],
    scripts: [
      {
        type: "application/ld+json",
        children: JSON.stringify({
          "@context": "https://schema.org",
          "@type": "Organization",
          name: "Siamo",
          description:
            "Premium marketplace for asset sharing and management in Southeast Asia.",
          areaServed: "TH",
        }),
      },
    ],
  }),
  component: Landing,
});

type Asset = {
  title: string;
  location: string;
  price: string;
  unit: string;
  rating: string;
  image: string;
  badge?: "verified" | "new";
};

const assets: Asset[] = [
  {
    title: "The Pavilion House",
    location: "Phuket, Thailand",
    price: "฿12,400",
    unit: "/ day",
    rating: "4.92",
    image: villaImg,
    badge: "verified",
  },
  {
    title: "1964 Vespa VBB",
    location: "Bangkok, Thailand",
    price: "฿850",
    unit: "/ day",
    rating: "5.0",
    image: vespaImg,
  },
  {
    title: "Atelier Loft 04",
    location: "Chiang Mai, Thailand",
    price: "฿4,200",
    unit: "/ day",
    rating: "4.88",
    image: studioImg,
  },
  {
    title: "Defender Heritage 110",
    location: "Pai, Thailand",
    price: "฿5,500",
    unit: "/ day",
    rating: "4.97",
    image: defenderImg,
    badge: "new",
  },
];

const categories = ["Stays", "Vehicles", "Equipment", "Spaces", "Services", "Experiences"];

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

const services: Service[] = [
  {
    title: "Plumbing & Leaks",
    description: "Certified plumbers for pipes, fittings, water heaters.",
    price: "from ฿450",
    icon: Droplets,
    image: plumbingImg,
    scope: [
      "Pipe leak detection & repair",
      "Faucet & shower replacement",
      "Water heater installation",
      "Toilet & sewage repair",
      "Drain unclogging",
    ],
    examples: [
      "Fix dripping kitchen faucet",
      "Replace broken water heater",
      "Unclog bathroom drain",
      "Repair burst pipe",
    ],
    duration: "1 – 3 hours",
  },
  {
    title: "Electrical Repairs",
    description: "Licensed electricians for wiring, outlets, lighting.",
    price: "from ฿500",
    icon: Plug,
    image: electricalImg,
    scope: [
      "Wiring inspection & repair",
      "Outlet & switch replacement",
      "Light fixture installation",
      "Circuit breaker troubleshooting",
      "Smart home device setup",
    ],
    examples: [
      "Install new ceiling lights",
      "Fix non-working outlets",
      "Replace faulty circuit breaker",
      "Set up smart switches",
    ],
    duration: "1 – 4 hours",
  },
  {
    title: "Aircon Service",
    description: "Cleaning, gas refill, and full A/C maintenance.",
    price: "from ฿650",
    icon: Wind,
    image: airconImg,
    scope: [
      "Deep coil & filter cleaning",
      "Refrigerant gas refill",
      "Compressor inspection",
      "Duct & vent maintenance",
      "Annual maintenance plan",
    ],
    examples: [
      "Clean 3 bedroom A/C units",
      "Refill refrigerant gas",
      "Fix weak cooling issue",
      "Annual A/C health check",
    ],
    duration: "1 – 2 hours",
  },
  {
    title: "Handyman & Carpentry",
    description: "Doors, locks, furniture assembly, small fixes.",
    price: "from ฿400",
    icon: Hammer,
    image: handymanImg,
    scope: [
      "Door & lock repair",
      "Furniture assembly",
      "Wall mounting (TV, shelves)",
      "Minor carpentry work",
      "General household fixes",
    ],
    examples: [
      "Assemble IKEA wardrobe",
      "Mount 65\" TV on wall",
      "Fix squeaky door hinge",
      "Install new door lock",
    ],
    duration: "1 – 3 hours",
  },
  {
    title: "Deep Cleaning",
    description: "Move-in/out and post-stay professional cleaning.",
    price: "from ฿800",
    icon: Sparkles,
    image: cleaningImg,
    scope: [
      "Move-in / move-out cleaning",
      "Post-rental deep clean",
      "Kitchen & bathroom sanitization",
      "Floor scrubbing & polishing",
      "Window & glass cleaning",
    ],
    examples: [
      "Deep clean 3-bed villa after guest",
      "Move-out cleaning for deposit",
      "Sanitize kitchen & bathrooms",
      "Clean all windows inside & out",
    ],
    duration: "3 – 6 hours",
  },
  {
    title: "Full Maintenance Plan",
    description: "Monthly inspections across every asset you own.",
    price: "from ฿2,400/mo",
    icon: Wrench,
    image: maintenanceImg,
    scope: [
      "Monthly property inspection",
      "Preventive maintenance schedule",
      "Vendor coordination",
      "Repair cost tracking",
      "Priority emergency response",
    ],
    examples: [
      "Monthly check of Phuket villa",
      "Coordinate all repairs for owner",
      "Preventive A/C & plumbing care",
      "24/7 emergency hotline access",
    ],
    duration: "Ongoing monthly",
  },
];

function Landing() {
  const [selectedService, setSelectedService] = useState<Service | null>(null);
  const [dialogOpen, setDialogOpen] = useState(false);

  const openServiceDetail = (service: Service) => {
    setSelectedService(service);
    setDialogOpen(true);
  };

  return (
    <div className="min-h-screen bg-background text-foreground font-sans selection:bg-accent/10 selection:text-accent">
      {/* Navigation */}
      <nav className="sticky top-0 z-50 bg-background/80 backdrop-blur-md border-b border-border">
        <div className="max-w-7xl mx-auto px-6 h-20 flex items-center justify-between">
          <div className="flex items-center gap-12">
            <a href="/" className="font-display text-2xl font-bold tracking-tight text-foreground">
              Siamo
            </a>
            <div className="hidden md:flex items-center gap-8 text-sm font-medium text-muted-foreground">
              <a href="#browse" className="hover:text-foreground transition-colors">Browse</a>
              <a href="#how" className="hover:text-foreground transition-colors">How it works</a>
              <a href="#host" className="hover:text-foreground transition-colors">List your asset</a>
            </div>
          </div>
          <div className="flex items-center gap-4">
            <button className="text-sm font-medium px-4 py-2 hover:text-accent transition-colors">
              Sign in
            </button>
            <button className="bg-foreground text-background text-sm font-medium px-5 py-2.5 rounded-full hover:bg-foreground/90 transition-colors">
              Start sharing
            </button>
          </div>
        </div>
      </nav>

      {/* Hero heading + pill search */}
      <header className="pt-16 pb-6 px-6">
        <div className="max-w-3xl mx-auto animate-fade-up text-center">
          <h1 className="font-display text-4xl md:text-6xl tracking-tight leading-[1.05] mb-10">
            Rent <em className="italic font-normal">extraordinary</em> assets across Thailand.
          </h1>

          <div className="bg-card rounded-full p-2 ring-1 ring-black/5 shadow-xl shadow-black/[0.04] flex items-center">
            <div className="flex-1 grid grid-cols-2 sm:grid-cols-4 divide-x divide-border">
              <button className="px-4 sm:px-6 py-3 text-left hover:bg-secondary rounded-l-full transition-colors">
                <p className="text-[10px] uppercase tracking-wider font-bold text-accent">Where</p>
                <p className="text-sm text-muted-foreground truncate">Search destinations</p>
              </button>
              <button className="px-4 sm:px-6 py-3 text-left hover:bg-secondary transition-colors">
                <p className="text-[10px] uppercase tracking-wider font-bold text-accent">Type</p>
                <p className="text-sm text-muted-foreground truncate">Stays & Spaces</p>
              </button>
              <button className="hidden sm:block px-6 py-3 text-left hover:bg-secondary transition-colors">
                <p className="text-[10px] uppercase tracking-wider font-bold text-accent">When</p>
                <p className="text-sm text-muted-foreground">Add dates</p>
              </button>
              <button className="hidden sm:block px-6 py-3 text-left hover:bg-secondary rounded-r-full transition-colors">
                <p className="text-[10px] uppercase tracking-wider font-bold text-accent">Who</p>
                <p className="text-sm text-muted-foreground">Add guests</p>
              </button>
            </div>
            <button
              aria-label="Search"
              className="bg-accent size-12 rounded-full flex items-center justify-center text-accent-foreground ml-2 shrink-0 hover:scale-105 transition-transform"
            >
              <ArrowRight className="size-4" />
            </button>
          </div>
        </div>
      </header>

      {/* Category chips */}
      <div className="overflow-x-auto no-scrollbar py-4 border-b border-border" id="browse">
        <div className="max-w-7xl mx-auto px-6 flex items-center gap-10">
          {categories.map((cat, i) => (
            <button
              key={cat}
              className={`flex flex-col items-center gap-2 pb-3 border-b-2 transition-all shrink-0 ${
                i === 0
                  ? "border-foreground text-foreground"
                  : "border-transparent text-muted-foreground hover:text-foreground"
              }`}
            >
              <span className="text-xs font-medium uppercase tracking-tighter">{cat}</span>
            </button>
          ))}
        </div>
      </div>

      {/* Featured grid */}
      <main className="max-w-7xl mx-auto px-6 py-12">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-x-6 gap-y-10">
          {assets.map((asset, i) => (
            <article
              key={asset.title}
              className="group cursor-pointer animate-fade-up"
              style={{ animationDelay: `${(i + 1) * 100}ms` }}
            >
              <div className="relative aspect-[4/5] rounded-2xl overflow-hidden mb-3 bg-secondary">
                <img
                  src={asset.image}
                  alt={`${asset.title} in ${asset.location}`}
                  width={800}
                  height={1000}
                  loading="lazy"
                  className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-700"
                />
                <button
                  aria-label="Save to favorites"
                  className="absolute top-4 right-4 text-white drop-shadow-md hover:scale-110 transition-transform"
                >
                  <Heart className="size-5" />
                </button>
                {asset.badge && (
                  <span
                    className={`absolute top-4 left-4 px-2 py-1 rounded-full text-[10px] font-bold uppercase tracking-tight backdrop-blur-sm ${
                      asset.badge === "new"
                        ? "bg-accent/90 text-accent-foreground"
                        : "bg-white/90 text-foreground"
                    }`}
                  >
                    {asset.badge === "new" ? "New listing" : "Verified host"}
                  </span>
                )}
              </div>
              <div className="flex justify-between items-start">
                <h3 className="text-sm font-semibold">{asset.title}</h3>
                <span className="text-xs font-mono">★ {asset.rating}</span>
              </div>
              <p className="text-sm text-muted-foreground">{asset.location}</p>
              <p className="text-sm mt-1">
                <span className="font-semibold">{asset.price}</span>{" "}
                <span className="text-muted-foreground">{asset.unit}</span>
              </p>
            </article>
          ))}
        </div>
      </main>

      {/* Map preview teaser */}
      <section className="max-w-7xl mx-auto px-6 mb-24" id="how">
        <div className="relative h-[400px] rounded-3xl overflow-hidden">
          <img
            src={mapImg}
            alt="Map preview of verified Siamo listings across Bangkok"
            width={1920}
            height={640}
            loading="lazy"
            className="w-full h-full object-cover"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-black/40 to-transparent flex items-end p-6 md:p-12">
            <div className="bg-card rounded-2xl p-6 max-w-sm shadow-2xl">
              <h2 className="font-display text-xl mb-2 italic">Explore Siamo visually</h2>
              <p className="text-sm text-muted-foreground mb-4">
                Discover verified assets nearby with our interactive map.
              </p>
              <button className="w-full bg-accent text-accent-foreground py-3 rounded-xl font-medium hover:bg-accent/90 transition-colors">
                Open Map View
              </button>
            </div>
          </div>
        </div>
      </section>

      {/* Services — on-demand maintenance */}
      <section className="max-w-7xl mx-auto px-6 mb-24" id="services">
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 mb-10">
          <div className="max-w-xl">
            <span className="font-mono text-xs uppercase tracking-widest text-accent mb-3 block">
              On-demand services
            </span>
            <h2 className="font-display text-4xl md:text-5xl tracking-tight leading-tight italic">
              Book a vetted technician for any maintenance need.
            </h2>
            <p className="text-muted-foreground mt-4">
              From a leaking pipe to a full villa tune-up — Siamo dispatches insured
              professionals to keep every asset in showroom condition.
            </p>
          </div>
          <button className="self-start md:self-end bg-foreground text-background text-sm font-medium px-6 py-3 rounded-full hover:bg-foreground/90 transition-colors shrink-0">
            Browse all services
          </button>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {services.map((service, i) => (
            <article
              key={service.title}
              className="group p-6 rounded-2xl border border-border bg-card hover:border-foreground/40 hover:shadow-lg transition-all cursor-pointer animate-fade-up"
              style={{ animationDelay: `${i * 80}ms` }}
              onClick={() => openServiceDetail(service)}
            >
              <div className="size-12 rounded-xl bg-secondary flex items-center justify-center mb-5 group-hover:bg-accent group-hover:text-accent-foreground transition-colors">
                <service.icon className="size-5" />
              </div>
              <h3 className="font-semibold text-base mb-2">{service.title}</h3>
              <p className="text-sm text-muted-foreground mb-5 leading-relaxed">
                {service.description}
              </p>
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

      {/* Service Detail Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        {selectedService && (
          <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto p-0 gap-0">
            <div className="relative h-56 sm:h-72">
              <img
                src={selectedService.image}
                alt={selectedService.title}
                width={800}
                height={600}
                className="w-full h-full object-cover"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent" />
              <div className="absolute bottom-4 left-6 right-6 text-white">
                <span className="text-[10px] uppercase tracking-widest font-mono opacity-80">Siamo Service</span>
                <h3 className="font-display text-2xl sm:text-3xl mt-1">{selectedService.title}</h3>
              </div>
            </div>

            <div className="p-6 sm:p-8 space-y-8">
              <DialogHeader className="text-left space-y-3">
                <DialogDescription className="text-base text-muted-foreground leading-relaxed">
                  {selectedService.description}
                </DialogDescription>
                <div className="flex flex-wrap items-center gap-4 pt-2">
                  <div className="flex items-center gap-2 text-sm font-mono bg-secondary px-3 py-1.5 rounded-lg">
                    <Clock className="size-4 text-accent" />
                    {selectedService.duration}
                  </div>
                  <div className="flex items-center gap-2 text-sm font-mono bg-secondary px-3 py-1.5 rounded-lg">
                    <ShieldCheck className="size-4 text-accent" />
                    Insured & verified
                  </div>
                </div>
              </DialogHeader>

              {/* Scope of Work */}
              <div>
                <h4 className="text-sm font-semibold uppercase tracking-widest mb-4 flex items-center gap-2">
                  <CheckCircle2 className="size-4 text-accent" />
                  What's included
                </h4>
                <ul className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {selectedService.scope.map((item) => (
                    <li key={item} className="flex items-start gap-2 text-sm text-muted-foreground">
                      <span className="size-1.5 rounded-full bg-accent mt-2 shrink-0" />
                      {item}
                    </li>
                  ))}
                </ul>
              </div>

              {/* Examples */}
              <div>
                <h4 className="text-sm font-semibold uppercase tracking-widest mb-4">
                  Common jobs
                </h4>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {selectedService.examples.map((ex) => (
                    <div
                      key={ex}
                      className="flex items-center gap-3 p-3 rounded-xl bg-secondary/50 border border-border"
                    >
                      <selectedService.icon className="size-4 text-accent shrink-0" />
                      <span className="text-sm">{ex}</span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Price & CTA */}
              <div className="flex flex-col sm:flex-row items-center justify-between gap-4 pt-4 border-t border-border">
                <div>
                  <span className="text-xs text-muted-foreground uppercase tracking-wider">Starting from</span>
                  <p className="text-2xl font-display font-semibold">{selectedService.price}</p>
                </div>
                <button className="w-full sm:w-auto bg-accent text-accent-foreground px-8 py-3 rounded-full font-medium hover:bg-accent/90 transition-colors">
                  Book this service
                </button>
              </div>
            </div>
          </DialogContent>
        )}
      </Dialog>

      {/* Owner conversion */}
      <section className="bg-foreground text-background py-24 px-6 overflow-hidden" id="host">
        <div className="max-w-7xl mx-auto grid md:grid-cols-2 gap-16 items-center">
          <div>
            <span className="font-mono text-xs uppercase tracking-widest text-accent mb-6 block">
              Host on Siamo
            </span>
            <h2 className="font-display text-5xl md:text-6xl text-balance leading-tight mb-8 italic">
              Turn your idle assets into <span className="text-accent">revenue</span>.
            </h2>
            <p className="text-lg text-background/60 max-w-md mb-10">
              Whether it's a coastal villa or a vintage camera, Siamo provides the trust layer to
              share safely.
            </p>
            <div className="flex items-baseline gap-4 mb-12">
              <span className="text-6xl font-display">฿64k</span>
              <span className="text-background/40 font-mono text-sm">avg. monthly potential</span>
            </div>
            <button className="border border-background/20 hover:bg-background hover:text-foreground transition-all px-8 py-4 rounded-full font-medium">
              Calculate your potential
            </button>
          </div>
          <div className="relative">
            <img
              src={interiorImg}
              alt="Luxury Bangkok apartment interior at golden hour"
              width={1024}
              height={1216}
              loading="lazy"
              className="aspect-[3/4] w-full object-cover rounded-3xl opacity-70"
            />
            <div className="absolute -bottom-8 -left-2 md:-left-8 bg-accent text-accent-foreground p-6 md:p-8 rounded-2xl shadow-xl max-w-[300px]">
              <p className="text-xs uppercase tracking-widest mb-2 opacity-80">Verified host</p>
              <p className="text-lg md:text-xl font-display italic leading-snug">
                "Siamo handles the trust, I just provide the key."
              </p>
              <p className="mt-4 text-xs font-mono">— Malee K., Bangkok</p>
            </div>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-border py-12 px-6">
        <div className="max-w-7xl mx-auto flex flex-col md:flex-row justify-between gap-12">
          <div className="max-w-xs">
            <span className="font-display text-2xl font-bold block mb-4">Siamo</span>
            <p className="text-sm text-muted-foreground">
              The premier marketplace for asset sharing and luxury management in Southeast Asia.
            </p>
          </div>
          <div className="grid grid-cols-2 md:grid-cols-3 gap-12">
            <div className="flex flex-col gap-4 text-sm">
              <span className="font-semibold">Discover</span>
              <a href="#" className="text-muted-foreground hover:text-foreground">Luxury Villas</a>
              <a href="#" className="text-muted-foreground hover:text-foreground">Classic Cars</a>
              <a href="#" className="text-muted-foreground hover:text-foreground">Pro Equipment</a>
            </div>
            <div className="flex flex-col gap-4 text-sm">
              <span className="font-semibold">Hosting</span>
              <a href="#" className="text-muted-foreground hover:text-foreground">List an Asset</a>
              <a href="#" className="text-muted-foreground hover:text-foreground">Safety First</a>
              <a href="#" className="text-muted-foreground hover:text-foreground">Insurance</a>
            </div>
            <div className="flex flex-col gap-4 text-sm">
              <span className="font-semibold">Company</span>
              <a href="#" className="text-muted-foreground hover:text-foreground">About</a>
              <a href="#" className="text-muted-foreground hover:text-foreground">Terms</a>
              <a href="#" className="text-muted-foreground hover:text-foreground">Privacy</a>
            </div>
          </div>
        </div>
        <div className="max-w-7xl mx-auto mt-12 pt-8 border-t border-border flex flex-col sm:flex-row justify-between items-center gap-2 text-[10px] font-mono uppercase tracking-widest text-muted-foreground">
          <span>© 2026 Siamo Collective</span>
          <span>Based in Bangkok</span>
        </div>
      </footer>
    </div>
  );
}