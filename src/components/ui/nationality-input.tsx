import { useState, useEffect, useRef, useCallback } from "react";
import { ChevronDown, Search, X, AlertCircle } from "lucide-react";
import { cn } from "@/lib/utils/cn";

// ── Static fallback: [code, demonym] ─────────────────────────────────────
// Value sent to backend = ISO 3166-1 alpha-2 code
const FALLBACK: [string, string][] = [
  ["AF","Afghan"],["AL","Albanian"],["DZ","Algerian"],["AR","Argentinian"],
  ["AM","Armenian"],["AU","Australian"],["AT","Austrian"],["AZ","Azerbaijani"],
  ["BH","Bahraini"],["BD","Bangladeshi"],["BY","Belarusian"],["BE","Belgian"],
  ["BO","Bolivian"],["BA","Bosnian"],["BR","Brazilian"],["GB","British"],
  ["BG","Bulgarian"],["KH","Cambodian"],["CA","Canadian"],["CL","Chilean"],
  ["CN","Chinese"],["CO","Colombian"],["HR","Croatian"],["CZ","Czech"],
  ["DK","Danish"],["NL","Dutch"],["EG","Egyptian"],["EE","Estonian"],
  ["ET","Ethiopian"],["PH","Filipino"],["FI","Finnish"],["FR","French"],
  ["GE","Georgian"],["DE","German"],["GH","Ghanaian"],["GR","Greek"],
  ["GT","Guatemalan"],["HN","Honduran"],["HU","Hungarian"],["IN","Indian"],
  ["ID","Indonesian"],["IR","Iranian"],["IQ","Iraqi"],["IE","Irish"],
  ["IL","Israeli"],["IT","Italian"],["JP","Japanese"],["JO","Jordanian"],
  ["KZ","Kazakhstani"],["KE","Kenyan"],["KR","Korean"],["KW","Kuwaiti"],
  ["KG","Kyrgyz"],["LV","Latvian"],["LB","Lebanese"],["LT","Lithuanian"],
  ["MY","Malaysian"],["MX","Mexican"],["MN","Mongolian"],["MA","Moroccan"],
  ["NP","Nepalese"],["NZ","New Zealander"],["NG","Nigerian"],["NO","Norwegian"],
  ["PK","Pakistani"],["PS","Palestinian"],["PE","Peruvian"],["PL","Polish"],
  ["PT","Portuguese"],["QA","Qatari"],["RO","Romanian"],["RU","Russian"],
  ["SA","Saudi"],["RS","Serbian"],["SG","Singaporean"],["SK","Slovak"],
  ["ZA","South African"],["ES","Spanish"],["LK","Sri Lankan"],["SD","Sudanese"],
  ["SE","Swedish"],["CH","Swiss"],["SY","Syrian"],["TW","Taiwanese"],
  ["TJ","Tajik"],["TH","Thai"],["TN","Tunisian"],["TR","Turkish"],
  ["TM","Turkmen"],["UA","Ukrainian"],["AE","Emirati"],["US","American"],
  ["UY","Uruguayan"],["UZ","Uzbek"],["VE","Venezuelan"],["VN","Vietnamese"],
  ["YE","Yemeni"],["ZW","Zimbabwean"],
];

// ── Fetch demonyms from restcountries ─────────────────────────────────────
async function fetchNationalities(): Promise<[string, string][]> {
  const res = await fetch(
    "https://restcountries.com/v3.1/all?fields=cca2,demonyms",
    { signal: AbortSignal.timeout(4000) },
  );
  if (!res.ok) throw new Error("non-ok");
  const data: { cca2: string; demonyms?: { eng?: { m?: string } } }[] = await res.json();
  const pairs: [string, string][] = data
    .map((c): [string, string] | null => {
      const dem = c.demonyms?.eng?.m?.trim();
      return dem ? [c.cca2, dem] : null;
    })
    .filter((x): x is [string, string] => x !== null);
  return pairs.sort((a, b) => a[1].localeCompare(b[1]));
}

// ── Priority codes: these bubble to the top of search results when demonyms tie ──
// Prevents MP (Mariana Islands, demonym "American") from appearing before US (UX-106)
const PRIORITY_CODES = new Set(["US","GB","TH","AU","CA","DE","FR","JP","CN","IN","KR","SG","MY","ID","PH","VN"]);

// ── BUG-361: country-name search ─────────────────────────────────────────
// The list stores demonyms ("American", "British"), but most people type
// their *country* ("United States", "United Kingdom", "Germany"). Resolve the
// English country name for each alpha-2 code via Intl.DisplayNames so the
// query matches the country name too. Cached — Intl lookups aren't free per
// keystroke. Falls back to "" when the runtime lacks DisplayNames.
const regionNames = (() => {
  try {
    return new Intl.DisplayNames(["en"], { type: "region" });
  } catch {
    return null;
  }
})();
const countryNameCache = new Map<string, string>();
function countryName(code: string): string {
  const hit = countryNameCache.get(code);
  if (hit !== undefined) return hit;
  let name = "";
  try {
    name = (regionNames?.of(code) ?? "").toLowerCase();
    if (name === code.toLowerCase()) name = ""; // DisplayNames echoes unknown codes
  } catch {
    name = "";
  }
  countryNameCache.set(code, name);
  return name;
}

// Common abbreviations / informal names that aren't substrings of the country
// name or demonym, so they need an explicit alias to match.
const SYNONYMS: Record<string, string[]> = {
  US: ["usa", "us", "united states of america", "states"],
  GB: ["uk", "britain", "great britain", "england", "scotland", "wales"],
  AE: ["uae"],
  KR: ["south korea", "rok"],
  NL: ["holland"],
  CZ: ["czechia"],
  RU: ["russian federation"],
};
function matchesQuery(code: string, dem: string, q: string): { starts: boolean; has: boolean } {
  const d = dem.toLowerCase();
  const c = code.toLowerCase();
  const name = countryName(code);
  const syn = (SYNONYMS[code] ?? []).join(" ");
  const starts = d.startsWith(q) || c.startsWith(q) || name.startsWith(q);
  const has = starts || d.includes(q) || c.includes(q) || name.includes(q) || syn.includes(q);
  return { starts, has };
}

// ── Component ─────────────────────────────────────────────────────────────
interface NationalityInputProps {
  /** ISO 3166-1 alpha-2 code, e.g. "RU", "TH" */
  value?: string;
  onChange?: (code: string) => void;
  placeholder?: string;
  disabled?: boolean;
  className?: string;
}

export function NationalityInput({
  value = "",
  onChange,
  placeholder = "Select nationality…",
  disabled,
  className,
}: NationalityInputProps) {
  const [options, setOptions] = useState<[string, string][]>(FALLBACK);
  const [apiDown, setApiDown] = useState(false);
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  // UX-94: start at -1 so no item is pre-highlighted on open
  const [highlighted, setHighlighted] = useState(-1);
  const inputRef = useRef<HTMLInputElement>(null);
  const listRef = useRef<HTMLUListElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  // Display label for current code value
  const currentLabel = options.find(([code]) => code === value)?.[1] ?? value;

  // Fetch on mount
  useEffect(() => {
    fetchNationalities()
      .then(setOptions)
      .catch(() => setApiDown(true));
  }, []);

  const filtered = (() => {
    const q = query.trim().toLowerCase();
    if (!q) return options;
    // BUG-361: match demonym, code, OR country name (+ synonyms like "uk"/"usa")
    const starts = options.filter(([code, dem]) => matchesQuery(code, dem, q).starts);
    const contains = options.filter(([code, dem]) => {
      const m = matchesQuery(code, dem, q);
      return !m.starts && m.has;
    });
    // UX-106: within starts-group, sort by (1) exact demonym match, (2) priority codes, (3) original order
    // This prevents MP ("American") from appearing before US ("American") in search results
    const sortedStarts = [...starts].sort((a, b) => {
      const aExact = a[1].toLowerCase() === q ? 0 : 1;
      const bExact = b[1].toLowerCase() === q ? 0 : 1;
      if (aExact !== bExact) return aExact - bExact;
      const aPrio = PRIORITY_CODES.has(a[0]) ? 0 : 1;
      const bPrio = PRIORITY_CODES.has(b[0]) ? 0 : 1;
      return aPrio - bPrio;
    });
    return [...sortedStarts, ...contains];
  })();

  const select = useCallback((code: string) => {
    onChange?.(code);
    setQuery("");
    setOpen(false);
    setHighlighted(0);
  }, [onChange]);

  // Close on outside click
  useEffect(() => {
    function handle(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false);
        setQuery("");
      }
    }
    document.addEventListener("mousedown", handle);
    return () => document.removeEventListener("mousedown", handle);
  }, []);

  // Scroll highlighted item into view
  useEffect(() => {
    const item = listRef.current?.children[highlighted] as HTMLElement | undefined;
    item?.scrollIntoView({ block: "nearest" });
  }, [highlighted]);

  function handleKeyDown(e: React.KeyboardEvent) {
    if (!open) {
      if (e.key === "ArrowDown" || e.key === "Enter") { setOpen(true); e.preventDefault(); }
      return;
    }
    if (e.key === "ArrowDown") { setHighlighted((h) => Math.min(h + 1, filtered.length - 1)); e.preventDefault(); }
    else if (e.key === "ArrowUp") { setHighlighted((h) => Math.max(h - 1, -1)); e.preventDefault(); }
    else if (e.key === "Enter") { if (highlighted >= 0 && filtered[highlighted]) select(filtered[highlighted][0]); e.preventDefault(); }
    else if (e.key === "Escape") { setOpen(false); setQuery(""); setHighlighted(-1); }
  }

  return (
    <div ref={containerRef} className={cn("relative", className)}>
      <div
        className={cn(
          "flex h-10 items-center w-full rounded-md border border-input bg-background px-3 text-sm gap-2",
          "ring-offset-background cursor-pointer",
          open && "ring-2 ring-ring ring-offset-2",
          disabled && "opacity-50 cursor-not-allowed",
        )}
        onClick={() => { if (!disabled) { setOpen((v) => !v); setHighlighted(-1); setTimeout(() => inputRef.current?.focus(), 0); } }}
      >
        {open ? (
          <Search size={13} className="shrink-0 text-muted-foreground" />
        ) : (
          <Search size={13} className="shrink-0 text-muted-foreground" />
        )}

        {open ? (
          <input
            ref={inputRef}
            type="text"
            value={query}
            placeholder="Type to search…"
            onChange={(e) => { setQuery(e.target.value); setHighlighted(-1); }}
            onKeyDown={handleKeyDown}
            onClick={(e) => e.stopPropagation()}
            className="flex-1 bg-transparent outline-none placeholder:text-muted-foreground"
            autoComplete="off"
          />
        ) : (
          <span className={cn("flex-1 truncate", !value && "text-muted-foreground")}>
            {value ? currentLabel : placeholder}
          </span>
        )}

        {value && !open ? (
          <button
            type="button"
            tabIndex={-1}
            onMouseDown={(e) => { e.stopPropagation(); onChange?.(""); }}
            className="shrink-0 text-muted-foreground hover:text-fg transition-colors"
          >
            <X size={13} />
          </button>
        ) : (
          <ChevronDown size={13} className={cn("shrink-0 text-muted-foreground transition-transform", open && "rotate-180")} />
        )}
      </div>

      {/* Dropdown */}
      {open && (
        <ul
          ref={listRef}
          className="absolute z-50 mt-1 w-full max-h-52 overflow-auto rounded-xl border border-border bg-background shadow-lg py-1 text-sm"
        >
          {apiDown && (
            <li className="flex items-center gap-1.5 px-3 py-1.5 text-[11px] text-fg-muted border-b border-border mb-1">
              <AlertCircle size={11} className="text-warning shrink-0" />
              Showing offline list
            </li>
          )}
          {filtered.length === 0 ? (
            <li className="px-3 py-2 text-fg-muted text-xs">No results</li>
          ) : filtered.map(([code, dem], i) => (
            <li
              key={code}
              onMouseDown={(e) => { e.preventDefault(); select(code); }}
              onMouseEnter={() => setHighlighted(i)}
              className={cn(
                "flex items-center justify-between px-3 py-2 cursor-pointer transition-colors",
                highlighted >= 0 && i === highlighted ? "bg-accent text-accent-foreground" : "hover:bg-accent/50",
                code === value && "font-semibold",
              )}
            >
              <span>{dem}</span>
              <span className="text-[11px] text-fg-muted font-mono">{code}</span>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
