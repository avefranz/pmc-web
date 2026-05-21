import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { ArrowRight, Heart, Search, Home, Car, Camera, Building2, Wrench, Compass } from "lucide-react";
import { SiamoLogo } from "@/components/layout/siamo-logo";
import villaImg from "@/assets/asset-villa.jpg";
import vespaImg from "@/assets/asset-vespa.jpg";
import studioImg from "@/assets/asset-studio.jpg";
import defenderImg from "@/assets/asset-defender.jpg";
import mapImg from "@/assets/map-preview.jpg";
import interiorImg from "@/assets/host-interior.jpg";
import serviceAirconImg from "@/assets/service-aircon.jpg";
import serviceCleaningImg from "@/assets/service-cleaning.jpg";
import serviceElectricalImg from "@/assets/service-electrical.jpg";
import serviceHandymanImg from "@/assets/service-handyman.jpg";
import serviceMaintenanceImg from "@/assets/service-maintenance.jpg";
import servicePlumbingImg from "@/assets/service-plumbing.jpg";

type FeaturedAsset = {
  title: string;
  location: string;
  price: string;
  unit: string;
  rating: string;
  image: string;
  badge?: "verified" | "new";
};

type Category = {
  label: string;
  icon: React.ComponentType<{ size?: number; className?: string }>;
  assets: FeaturedAsset[];
};

const categoryData: Category[] = [
  {
    label: "Stays",
    icon: Home,
    assets: [
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
        title: "Atelier Loft 04",
        location: "Chiang Mai, Thailand",
        price: "฿4,200",
        unit: "/ day",
        rating: "4.88",
        image: studioImg,
      },
      {
        title: "Garden Villa Suite",
        location: "Koh Samui, Thailand",
        price: "฿6,800",
        unit: "/ day",
        rating: "4.95",
        image: interiorImg,
        badge: "verified",
      },
      {
        title: "Riverside Penthouse",
        location: "Bangkok, Thailand",
        price: "฿8,900",
        unit: "/ day",
        rating: "4.91",
        image: villaImg,
        badge: "new",
      },
    ],
  },
  {
    label: "Vehicles",
    icon: Car,
    assets: [
      {
        title: "1964 Vespa VBB",
        location: "Bangkok, Thailand",
        price: "฿850",
        unit: "/ day",
        rating: "5.0",
        image: vespaImg,
        badge: "verified",
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
      {
        title: "Royal Enfield Meteor",
        location: "Chiang Mai, Thailand",
        price: "฿1,200",
        unit: "/ day",
        rating: "4.85",
        image: vespaImg,
      },
      {
        title: "Land Rover Discovery",
        location: "Khao Yai, Thailand",
        price: "฿4,800",
        unit: "/ day",
        rating: "4.90",
        image: defenderImg,
        badge: "verified",
      },
    ],
  },
  {
    label: "Equipment",
    icon: Camera,
    assets: [
      {
        title: "Sony FX3 Cinema Kit",
        location: "Bangkok, Thailand",
        price: "฿2,400",
        unit: "/ day",
        rating: "4.96",
        image: studioImg,
        badge: "verified",
      },
      {
        title: "DJI Mavic 3 Pro",
        location: "Phuket, Thailand",
        price: "฿1,800",
        unit: "/ day",
        rating: "4.88",
        image: serviceMaintenanceImg,
        badge: "new",
      },
      {
        title: "Nikon Z8 + Prime Set",
        location: "Bangkok, Thailand",
        price: "฿1,600",
        unit: "/ day",
        rating: "4.93",
        image: studioImg,
      },
      {
        title: "Lighting Studio Rig",
        location: "Chiang Mai, Thailand",
        price: "฿900",
        unit: "/ day",
        rating: "4.80",
        image: serviceHandymanImg,
        badge: "new",
      },
    ],
  },
  {
    label: "Spaces",
    icon: Building2,
    assets: [
      {
        title: "Creative Studio A",
        location: "Silom, Bangkok",
        price: "฿4,500",
        unit: "/ day",
        rating: "4.94",
        image: studioImg,
        badge: "verified",
      },
      {
        title: "Rooftop Event Deck",
        location: "Sathorn, Bangkok",
        price: "฿12,000",
        unit: "/ day",
        rating: "4.97",
        image: interiorImg,
        badge: "verified",
      },
      {
        title: "Loft Gallery Space",
        location: "Nimman, Chiang Mai",
        price: "฿3,800",
        unit: "/ day",
        rating: "4.89",
        image: studioImg,
        badge: "new",
      },
      {
        title: "Boardroom Suite 01",
        location: "Asok, Bangkok",
        price: "฿800",
        unit: "/ hr",
        rating: "4.85",
        image: interiorImg,
      },
    ],
  },
  {
    label: "Services",
    icon: Wrench,
    assets: [
      {
        title: "AC Deep Service",
        location: "Bangkok, Thailand",
        price: "฿1,800",
        unit: "/ visit",
        rating: "4.95",
        image: serviceAirconImg,
        badge: "verified",
      },
      {
        title: "Deep Clean Package",
        location: "Phuket, Thailand",
        price: "฿2,400",
        unit: "/ session",
        rating: "4.92",
        image: serviceCleaningImg,
        badge: "verified",
      },
      {
        title: "Electrical Inspection",
        location: "Bangkok, Thailand",
        price: "฿1,200",
        unit: "/ visit",
        rating: "4.88",
        image: serviceElectricalImg,
      },
      {
        title: "Handyman Pro",
        location: "Chiang Mai, Thailand",
        price: "฿900",
        unit: "/ day",
        rating: "4.83",
        image: serviceHandymanImg,
        badge: "new",
      },
    ],
  },
  {
    label: "Experiences",
    icon: Compass,
    assets: [
      {
        title: "Muay Thai Private Class",
        location: "Bangkok, Thailand",
        price: "฿2,500",
        unit: "/ person",
        rating: "5.0",
        image: servicePlumbingImg,
        badge: "verified",
      },
      {
        title: "Thai Cooking Masterclass",
        location: "Chiang Mai, Thailand",
        price: "฿1,800",
        unit: "/ person",
        rating: "4.96",
        image: serviceCleaningImg,
        badge: "new",
      },
      {
        title: "Longtail Boat Tour",
        location: "Krabi, Thailand",
        price: "฿3,200",
        unit: "/ group",
        rating: "4.93",
        image: villaImg,
        badge: "verified",
      },
      {
        title: "Sunset Sailing",
        location: "Phuket, Thailand",
        price: "฿4,800",
        unit: "/ person",
        rating: "4.98",
        image: interiorImg,
      },
    ],
  },
];

function SearchPill() {
  const navigate = useNavigate();
  const fields = [
    { label: "Where", value: "Search destinations" },
    { label: "Type", value: "Stays & Spaces" },
    { label: "When", value: "Add dates" },
    { label: "Who", value: "Add guests" },
  ];

  return (
    <div className="mx-auto flex w-full max-w-[770px] items-center rounded-full border border-[#e8e2dc] bg-white p-2 shadow-[0_18px_38px_rgba(23,20,18,0.08)]">
      <div className="grid min-w-0 flex-1 grid-cols-2 divide-x divide-[#eee8e2] sm:grid-cols-4">
        {fields.map((field, index) => (
          <button
            key={field.label}
            onClick={() => navigate("/listings")}
            className={[
              "min-w-0 px-5 py-3 text-left transition-colors hover:bg-[#f4f1ed]",
              index === 0 ? "rounded-l-full" : "",
              index === fields.length - 1 ? "rounded-r-full" : "",
              index > 1 ? "hidden sm:block" : "",
            ].join(" ")}
          >
            <span className="block text-[10px] font-bold uppercase tracking-wide text-[#009e66]">
              {field.label}
            </span>
            <span className="block truncate text-sm leading-5 text-[#5e5954]">{field.value}</span>
          </button>
        ))}
      </div>
      <button
        aria-label="Search listings"
        onClick={() => navigate("/listings")}
        className="ml-2 flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-[#009e66] text-white transition-transform hover:scale-105"
      >
        <ArrowRight size={18} />
      </button>
    </div>
  );
}

function AssetCard({ asset }: { asset: FeaturedAsset }) {
  return (
    <Link to="/listings" className="group block">
      <div className="relative mb-3 aspect-[4/5] overflow-hidden rounded-2xl bg-[#ebe7e1]">
        <img
          src={asset.image}
          alt={`${asset.title} in ${asset.location}`}
          className="h-full w-full object-cover transition-transform duration-700 group-hover:scale-105"
          loading="lazy"
        />
        <button
          aria-label="Save to favorites"
          className="absolute right-4 top-4 text-white drop-shadow-md transition-transform hover:scale-110"
        >
          <Heart size={22} />
        </button>
        {asset.badge && (
          <span
            className={[
              "absolute left-4 top-4 rounded-full px-2.5 py-1 text-[10px] font-bold uppercase tracking-tight",
              asset.badge === "new" ? "bg-[#009e66] text-white" : "bg-white text-[#171412]",
            ].join(" ")}
          >
            {asset.badge === "new" ? "New listing" : "Verified host"}
          </span>
        )}
      </div>
      <div className="flex items-start justify-between gap-3">
        <h3 className="text-sm font-semibold text-[#171412]">{asset.title}</h3>
        <span className="whitespace-nowrap text-xs text-[#171412]">★ {asset.rating}</span>
      </div>
      <p className="mt-0.5 text-sm text-[#6b655f]">{asset.location}</p>
      <p className="mt-1 text-sm text-[#171412]">
        <span className="font-semibold">{asset.price}</span>{" "}
        <span className="text-[#6b655f]">{asset.unit}</span>
      </p>
    </Link>
  );
}

export default function HomePage() {
  const [activeCategory, setActiveCategory] = useState(0);
  const current = categoryData[activeCategory];

  return (
    <div className="min-h-screen bg-[#f8f6f3] text-[#171412]">
      <header className="sticky top-0 z-50 border-b border-[#e6dfd8] bg-[#f8f6f3]/95 backdrop-blur-md">
        <nav className="mx-auto flex h-[68px] max-w-7xl items-center justify-between px-5">
          <div className="flex items-center gap-10">
            <Link to="/" aria-label="Siamo home" className="shrink-0">
              <SiamoLogo className="h-8" />
            </Link>
            <div className="hidden items-center gap-8 text-sm font-medium text-[#5e5954] md:flex">
              <a href="#browse" className="transition-colors hover:text-[#171412]">
                Browse
              </a>
              <a href="#how" className="transition-colors hover:text-[#171412]">
                How it works
              </a>
              <a href="#host" className="transition-colors hover:text-[#171412]">
                List your asset
              </a>
            </div>
          </div>

          <div className="flex items-center gap-4">
            <Link to="/login" className="hidden text-sm font-medium text-[#171412] sm:inline">
              Sign in
            </Link>
            <Link
              to="/login"
              className="rounded-full bg-[#171412] px-5 py-3 text-sm font-semibold leading-none text-white transition-colors hover:bg-black"
            >
              Start sharing
            </Link>
          </div>
        </nav>
      </header>

      <main>
        <section className="px-5 pb-9 pt-16 md:pb-10 md:pt-20">
          <div className="mx-auto max-w-4xl text-center">
            <h1 className="mb-10 text-[42px] font-bold leading-[0.98] tracking-[-0.01em] text-[#111] md:text-[64px]">
              Rent <em className="font-serif font-semibold italic">extraordinary</em> assets
              <br className="hidden sm:block" /> across Thailand.
            </h1>
            <SearchPill />
          </div>
        </section>

        <section id="browse" className="overflow-x-auto border-b border-[#e6dfd8]">
          <div className="mx-auto flex max-w-7xl items-center gap-2 px-5 sm:gap-8">
            {categoryData.map((cat, index) => {
              const Icon = cat.icon;
              const isActive = index === activeCategory;
              return (
                <button
                  key={cat.label}
                  onClick={() => setActiveCategory(index)}
                  className={[
                    "flex shrink-0 flex-col items-center gap-1.5 border-b-2 pb-3 pt-5 transition-colors",
                    isActive
                      ? "border-[#171412] text-[#171412]"
                      : "border-transparent text-[#8a847e] hover:text-[#171412]",
                  ].join(" ")}
                >
                  <Icon size={20} className={isActive ? "text-[#009e66]" : ""} />
                  <span className="text-[10px] font-semibold uppercase tracking-wider">
                    {cat.label}
                  </span>
                </button>
              );
            })}
          </div>
        </section>

        <section className="mx-auto max-w-7xl px-5 py-12">
          <div
            key={activeCategory}
            className="grid grid-cols-1 gap-x-6 gap-y-10 sm:grid-cols-2 lg:grid-cols-4"
            style={{ animation: "fadeIn 0.25s ease" }}
          >
            {current.assets.map((asset) => (
              <AssetCard key={asset.title} asset={asset} />
            ))}
          </div>
        </section>

        <section id="how" className="mx-auto max-w-7xl px-5 pb-20">
          <div className="relative h-[380px] overflow-hidden rounded-3xl">
            <img
              src={mapImg}
              alt="Map preview of verified Siamo listings across Bangkok"
              className="h-full w-full object-cover"
              loading="lazy"
            />
            <div className="absolute inset-0 flex items-end bg-gradient-to-t from-black/45 to-transparent p-6 md:p-10">
              <div className="max-w-sm rounded-2xl bg-white p-6 shadow-2xl">
                <h2 className="font-serif text-2xl italic text-[#171412]">Explore visually</h2>
                <p className="mt-2 text-sm leading-6 text-[#6b655f]">
                  Discover villas, vehicles, studios, and services with a calmer map-first browse
                  experience.
                </p>
                <Link
                  to="/listings"
                  className="mt-5 inline-flex h-11 w-full items-center justify-center gap-2 rounded-xl bg-[#009e66] text-sm font-semibold text-white"
                >
                  <Search size={15} />
                  Open listings
                </Link>
              </div>
            </div>
          </div>
        </section>

        <section id="host" className="bg-[#171412] px-5 py-20 text-white">
          <div className="mx-auto grid max-w-7xl items-center gap-12 md:grid-cols-2">
            <div>
              <p className="mb-5 text-xs font-semibold uppercase tracking-[0.22em] text-[#009e66]">
                Host on Siamo
              </p>
              <h2 className="font-serif text-5xl italic leading-tight md:text-6xl">
                Turn idle assets into revenue.
              </h2>
              <p className="mt-6 max-w-md text-base leading-7 text-white/65">
                Whether it is a coastal villa, a classic vehicle, or a creative studio, Siamo gives
                owners a polished place to share safely.
              </p>
              <Link
                to="/login"
                className="mt-9 inline-flex h-12 items-center rounded-full border border-white/20 px-7 text-sm font-semibold transition-colors hover:bg-white hover:text-[#171412]"
              >
                Calculate your potential
              </Link>
            </div>
            <div className="relative">
              <img
                src={interiorImg}
                alt="Luxury Bangkok apartment interior"
                className="aspect-[3/4] w-full rounded-3xl object-cover opacity-75"
                loading="lazy"
              />
              <div className="absolute -bottom-8 left-4 max-w-[300px] rounded-2xl bg-[#009e66] p-6 text-white shadow-xl md:-left-8">
                <p className="text-xs uppercase tracking-widest text-white/75">Verified host</p>
                <p className="mt-2 font-serif text-xl italic leading-snug">
                  "Siamo handles the trust, I just provide the key."
                </p>
                <p className="mt-4 text-xs">Malee K., Bangkok</p>
              </div>
            </div>
          </div>
        </section>
      </main>

      <style>{`
        @keyframes fadeIn {
          from { opacity: 0; transform: translateY(8px); }
          to { opacity: 1; transform: translateY(0); }
        }
      `}</style>
    </div>
  );
}
