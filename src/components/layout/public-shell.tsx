import { useState, useRef, useEffect } from "react";
import { Outlet, Link, useSearchParams, useNavigate } from "react-router-dom";
import { Search, Menu, Home } from "lucide-react";
import { useAuthStore } from "@/lib/stores/auth.store";
import { useMe } from "@/lib/hooks/use-auth";
import { useMarketplaceCities } from "@/lib/hooks/use-marketplace";
import { useQueryClient } from "@tanstack/react-query";
import { initials } from "@/lib/utils/format";
import { cn } from "@/lib/utils/cn";

// ─── Search pill ──────────────────────────────────────────────────────────────

type PanelId = "where" | "type" | "beds" | null;

function SearchPill() {
  const [searchParams, setSearchParams] = useSearchParams();
  const { data: cities } = useMarketplaceCities();
  const navigate = useNavigate();

  const [active, setActive] = useState<PanelId>(null);
  const [draft, setDraft] = useState({
    cityId: searchParams.get("cityId") ?? "",
    rentalType: searchParams.get("rentalType") ?? "",
    bedrooms: searchParams.get("bedrooms") ?? "",
  });

  const pillRef = useRef<HTMLDivElement>(null);

  // Close on outside click or Escape
  useEffect(() => {
    function onDown(e: MouseEvent) {
      if (pillRef.current && !pillRef.current.contains(e.target as Node)) {
        setActive(null);
      }
    }
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") setActive(null);
    }
    document.addEventListener("mousedown", onDown);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onDown);
      document.removeEventListener("keydown", onKey);
    };
  }, []);

  function toggle(id: PanelId) {
    setActive((a) => (a === id ? null : id));
  }

  function handleSearch(e: React.MouseEvent) {
    e.stopPropagation();
    const next = new URLSearchParams();
    if (draft.cityId) next.set("cityId", draft.cityId);
    if (draft.rentalType) next.set("rentalType", draft.rentalType);
    if (draft.bedrooms) next.set("bedrooms", draft.bedrooms);
    // Navigate to listings if not already there
    const path = window.location.pathname === "/listings" ? undefined : "/listings";
    if (path) navigate(`/listings?${next.toString()}`);
    else setSearchParams(next);
    setActive(null);
  }

  const cityLabel = cities?.find((c) => String(c.id) === draft.cityId)?.name.en ?? "Where to?";
  const typeLabel = draft.rentalType === "LongTerm" ? "Long-term" : draft.rentalType === "ShortTerm" ? "Short-term" : "Any type";
  const bedsLabel = draft.bedrooms ? `${draft.bedrooms}+ beds` : "Any beds";

  const hasFilter = !!(draft.cityId || draft.rentalType || draft.bedrooms);

  return (
    <div ref={pillRef} className="relative">
      {/* Pill */}
      <div
        className={cn(
          "flex items-stretch divide-x divide-border rounded-full border border-border bg-white shadow-md transition-shadow",
          active && "shadow-lg",
        )}
      >
        {/* Where */}
        <button
          onClick={() => toggle("where")}
          className={cn(
            "flex flex-col justify-center px-5 py-2.5 rounded-l-full text-left min-w-[130px] hover:bg-bg transition-colors",
            active === "where" && "bg-white shadow-inner",
          )}
        >
          <span className="text-[11px] font-semibold text-fg leading-none">Where</span>
          <span className={cn("text-sm mt-0.5 leading-none", draft.cityId ? "text-fg" : "text-fg-muted")}>{cityLabel}</span>
        </button>

        {/* Type — hidden on small screens */}
        <button
          onClick={() => toggle("type")}
          className={cn(
            "hidden md:flex flex-col justify-center px-5 py-2.5 text-left min-w-[120px] hover:bg-bg transition-colors",
            active === "type" && "bg-white shadow-inner",
          )}
        >
          <span className="text-[11px] font-semibold text-fg leading-none">Type</span>
          <span className={cn("text-sm mt-0.5 leading-none", draft.rentalType ? "text-fg" : "text-fg-muted")}>{typeLabel}</span>
        </button>

        {/* Beds — hidden on small screens */}
        <button
          onClick={() => toggle("beds")}
          className={cn(
            "hidden md:flex flex-col justify-center px-5 py-2.5 text-left min-w-[110px] hover:bg-bg transition-colors",
            active === "beds" && "bg-white shadow-inner",
          )}
        >
          <span className="text-[11px] font-semibold text-fg leading-none">Bedrooms</span>
          <span className={cn("text-sm mt-0.5 leading-none", draft.bedrooms ? "text-fg" : "text-fg-muted")}>{bedsLabel}</span>
        </button>

        {/* Search button */}
        <button
          onClick={handleSearch}
          className="flex items-center gap-2 h-9 rounded-full bg-brand hover:bg-[var(--color-primary-hover)] transition-colors my-1.5 mr-1.5 px-3"
        >
          <Search size={15} className="text-white" strokeWidth={2.5} />
          {hasFilter && <span className="text-white text-xs font-semibold hidden sm:block">Search</span>}
        </button>
      </div>

      {/* Dropdown panels */}
      {active && (
        <div className="absolute top-[calc(100%+8px)] left-0 z-50 bg-white rounded-3xl shadow-xl border border-border p-4 min-w-64">
          {active === "where" && (
            <div>
              <p className="text-xs font-semibold text-fg mb-3 uppercase tracking-wide">Choose a city</p>
              <div className="space-y-1">
                <button
                  onClick={() => { setDraft((d) => ({ ...d, cityId: "" })); setActive(null); }}
                  className={cn("w-full text-left px-3 py-2 rounded-xl text-sm hover:bg-bg transition-colors", !draft.cityId && "font-semibold text-fg")}
                >
                  All cities
                </button>
                {(cities ?? []).map((c) => (
                  <button
                    key={c.id}
                    onClick={() => { setDraft((d) => ({ ...d, cityId: String(c.id) })); setActive(null); }}
                    className={cn("w-full text-left px-3 py-2 rounded-xl text-sm hover:bg-bg transition-colors", draft.cityId === String(c.id) && "font-semibold text-fg bg-bg")}
                  >
                    {c.name.en}
                    {c.activeListingsCount > 0 && (
                      <span className="ml-2 text-xs text-fg-muted">{c.activeListingsCount}</span>
                    )}
                  </button>
                ))}
              </div>
            </div>
          )}

          {active === "type" && (
            <div>
              <p className="text-xs font-semibold text-fg mb-3 uppercase tracking-wide">Rental type</p>
              <div className="space-y-1">
                {[
                  { val: "", label: "Any type" },
                  { val: "LongTerm", label: "Long-term" },
                  { val: "ShortTerm", label: "Short-term" },
                ].map((opt) => (
                  <button
                    key={opt.val}
                    onClick={() => { setDraft((d) => ({ ...d, rentalType: opt.val })); setActive(null); }}
                    className={cn("w-full text-left px-3 py-2 rounded-xl text-sm hover:bg-bg transition-colors", draft.rentalType === opt.val && "font-semibold text-fg bg-bg")}
                  >
                    {opt.label}
                  </button>
                ))}
              </div>
            </div>
          )}

          {active === "beds" && (
            <div>
              <p className="text-xs font-semibold text-fg mb-3 uppercase tracking-wide">Bedrooms</p>
              <div className="flex flex-wrap gap-2">
                {["", "1", "2", "3", "4", "5"].map((n) => (
                  <button
                    key={n}
                    onClick={() => { setDraft((d) => ({ ...d, bedrooms: n })); setActive(null); }}
                    className={cn(
                      "px-4 py-2 rounded-full border text-sm font-medium transition-colors",
                      draft.bedrooms === n
                        ? "border-fg bg-fg text-white"
                        : "border-border text-fg hover:border-fg",
                    )}
                  >
                    {n ? `${n}+` : "Any"}
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// ─── User button (hamburger + avatar) ─────────────────────────────────────────

function MarketplaceUserMenu() {
  const { token, clearAuth } = useAuthStore();
  const { data: me } = useMe();
  const qc = useQueryClient();
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function onDown(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener("mousedown", onDown);
    return () => document.removeEventListener("mousedown", onDown);
  }, []);

  const name = me?.firstName ?? me?.lineName ?? me?.email ?? "";

  function signOut() {
    clearAuth();
    localStorage.removeItem("pmc_token");
    qc.clear();
    navigate("/login", { replace: true });
    setOpen(false);
  }

  return (
    <div ref={ref} className="relative">
      <button
        onClick={() => setOpen((o) => !o)}
        className="flex items-center gap-2.5 rounded-full border border-border px-3 py-2 hover:shadow-md transition-shadow bg-white"
      >
        <Menu size={16} className="text-fg" />
        {token ? (
          <div className="w-7 h-7 rounded-full bg-brand flex items-center justify-center">
            <span className="text-white text-xs font-semibold leading-none">{initials(name) || "?"}</span>
          </div>
        ) : (
          <div className="w-7 h-7 rounded-full bg-[#717171] flex items-center justify-center">
            <svg viewBox="0 0 32 32" className="w-4 h-4 fill-white">
              <path d="M16 .7a15.3 15.3 0 100 30.6A15.3 15.3 0 0016 .7zm0 7a5.1 5.1 0 110 10.2A5.1 5.1 0 0116 7.7zm0 21.5a11.7 11.7 0 01-8.9-4.1c.1-2.9 5.9-4.6 8.9-4.6s8.8 1.7 8.9 4.6a11.7 11.7 0 01-8.9 4.1z" />
            </svg>
          </div>
        )}
      </button>

      {open && (
        <div className="absolute top-[calc(100%+8px)] right-0 z-50 bg-white rounded-2xl shadow-xl border border-border py-2 min-w-52">
          {token ? (
            <>
              {name && <div className="px-4 py-2 text-sm font-semibold text-fg border-b border-border mb-1">{name}</div>}
              <button onClick={() => { navigate("/me/trips"); setOpen(false); }} className="w-full text-left px-4 py-2.5 text-sm text-fg hover:bg-bg transition-colors">
                My trips
              </button>
              <button onClick={() => { navigate("/me/host"); setOpen(false); }} className="w-full text-left px-4 py-2.5 text-sm text-fg hover:bg-bg transition-colors">
                Host dashboard
              </button>
              <button onClick={() => { navigate("/me/profile"); setOpen(false); }} className="w-full text-left px-4 py-2.5 text-sm text-fg hover:bg-bg transition-colors">
                Account
              </button>
              <div className="border-t border-border mt-1 pt-1">
                <button onClick={signOut} className="w-full text-left px-4 py-2.5 text-sm text-fg hover:bg-bg transition-colors">
                  Sign out
                </button>
              </div>
            </>
          ) : (
            <>
              <button onClick={() => { navigate("/register"); setOpen(false); }} className="w-full text-left px-4 py-2.5 text-sm font-semibold text-fg hover:bg-bg transition-colors">
                Sign up
              </button>
              <button onClick={() => { navigate("/login"); setOpen(false); }} className="w-full text-left px-4 py-2.5 text-sm text-fg hover:bg-bg transition-colors">
                Log in
              </button>
            </>
          )}
        </div>
      )}
    </div>
  );
}

// ─── Shell ────────────────────────────────────────────────────────────────────

export function PublicShell() {
  const { token } = useAuthStore();

  return (
    <div className="min-h-screen flex flex-col bg-bg">
      <header className="sticky top-0 z-40 bg-white border-b border-border">
        <div className="w-full px-4 md:px-8 lg:px-12 h-20 grid grid-cols-[1fr_auto_1fr] items-center gap-4">
          {/* Logo — left */}
          <Link to="/listings" className="flex items-center gap-2 min-w-0">
            <div className="w-8 h-8 rounded-lg bg-brand flex items-center justify-center shrink-0">
              <span className="text-white font-bold text-sm leading-none">S</span>
            </div>
            <span className="font-bold text-lg text-brand hidden lg:block">siamo</span>
          </Link>

          {/* Search pill — truly centered */}
          <SearchPill />

          {/* Right actions */}
          <div className="flex items-center gap-2 justify-end">
            <Link
              to={token ? "/me/host" : "/login"}
              className="hidden md:flex items-center gap-1.5 text-sm font-semibold text-fg px-3 py-2 rounded-full hover:bg-bg-subtle transition-colors whitespace-nowrap"
            >
              <Home size={14} />
              {token ? "Switch to hosting" : "Siamo your home"}
            </Link>
            <MarketplaceUserMenu />
          </div>
        </div>
      </header>

      <main className="flex-1">
        <Outlet />
      </main>

      <footer className="border-t border-border mt-12 py-8">
        <div className="w-full px-4 md:px-8 lg:px-12 flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-2 text-sm text-fg-muted">
            <div className="w-5 h-5 rounded bg-brand flex items-center justify-center">
              <span className="text-white font-bold text-[10px] leading-none">S</span>
            </div>
            <span className="font-medium text-fg">Siamo</span>
            <span>· © {new Date().getFullYear()}</span>
          </div>
          <div className="flex items-center gap-5 text-xs text-fg-muted">
            <a href="#" className="hover:text-fg transition-colors">Support</a>
            <a href="#" className="hover:text-fg transition-colors">Privacy</a>
            <a href="#" className="hover:text-fg transition-colors">Terms</a>
          </div>
        </div>
      </footer>
    </div>
  );
}
