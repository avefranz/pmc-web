import { apiClient } from "./client";

export type AiPropertyType =
  | "Condo" | "House" | "Villa" | "Studio" | "Townhouse" | "Other";

export type AiProvider = "groq" | "pollinations" | "template";

export type SuggestListingTitleRequest = {
  propertyType: AiPropertyType;
  area:         string;
  bedrooms:     number;
  feature?:     string;
  variation?:   number;
};

export type SuggestListingTitleResponse = {
  title:    string;
  provider: AiProvider;
  cached:   boolean;
  tookMs:   number;
};

export type SuggestListingFeaturesRequest = {
  propertyType: AiPropertyType;
  area:         string;
  bedrooms:     number;
};

export type SuggestListingFeaturesResponse = {
  features: string[];
  provider: AiProvider;
  cached:   boolean;
  tookMs:   number;
};

export type NearbyHighlight = {
  name:           string;
  kind:           string;
  distanceMeters: number;
};

export type SuggestNearbyBlurbRequest = {
  area:       string;
  highlights: NearbyHighlight[];
};

export type SuggestNearbyBlurbResponse = {
  blurb:    string;
  provider: AiProvider;
  cached:   boolean;
  tookMs:   number;
};

const BANGKOK_DISTRICTS = new Set([
  "sukhumvit", "sathorn", "silom", "asok", "phrom phong", "thonglor",
  "ekkamai", "ari", "nana", "ratchada", "chatuchak", "on nut", "udomsuk",
  "lat phrao", "victory monument",
]);
const BEACH_DESTINATIONS = new Set(["phuket", "koh samui", "pattaya", "hua hin", "cha-am"]);
const MOUNTAIN_DESTINATIONS = new Set(["chiang mai", "chiang rai"]);

/**
 * Hard fallback for the title use case. Deterministic per inputs so "try another"
 * still cycles through visibly different shapes via the variation index.
 */
function localTitle(req: SuggestListingTitleRequest): string {
  const size = req.bedrooms === 0 ? "Studio" : `${req.bedrooms}-bed`;
  const v = req.variation ?? 0;
  const sep = v % 3 === 0 ? " | " : v % 3 === 1 ? " · " : " — ";
  const parts = [`${size} ${req.propertyType.toLowerCase()}`, req.area.trim()];
  if (req.feature) parts.push(req.feature);
  return parts.join(sep).slice(0, 60);
}

/**
 * Hard fallback for the features use case. Same rule-based logic the BFF runs
 * server-side when both AI providers fail — kept in sync so behaviour matches.
 */
function localFeatures(req: SuggestListingFeaturesRequest): string[] {
  const key = req.area.trim().toLowerCase();
  const isBkk = BANGKOK_DISTRICTS.has(key);
  const isBeach = BEACH_DESTINATIONS.has(key);
  const isMountain = MOUNTAIN_DESTINATIONS.has(key);

  const out: string[] = [];
  switch (req.propertyType) {
    case "Villa":     out.push("Private pool", "Garden", "Pool view"); break;
    case "House":     out.push("Garden", "Corner unit", "Pet friendly"); break;
    case "Townhouse": out.push("Garden", "Corner unit"); break;
    case "Condo":     out.push("High floor", "Pool view", "City view", "Corner unit"); break;
    case "Studio":    out.push("High floor", "City view"); break;
    default:          out.push("Corner unit");
  }
  if (isBkk) out.push("Near BTS", "Near MRT");
  if (isBeach) out.push("Sea view");
  if (isMountain) out.push("Mountain view");
  out.push("Fully furnished", "Pet friendly");

  // Dedupe case-insensitively, preserve first-seen casing, clamp to 8
  const seen = new Set<string>();
  const result: string[] = [];
  for (const f of out) {
    const k = f.toLowerCase();
    if (!seen.has(k)) { seen.add(k); result.push(f); }
  }
  return result.slice(0, 8);
}

export const aiApi = {
  /**
   * Suggest a marketplace listing title. Always resolves with a usable title
   * (falls back to a deterministic local template on 4xx/5xx so callers never
   * have to render an error state for this flow). 401 still bubbles so the
   * global auth interceptor can act.
   */
  async suggestListingTitle(
    req: SuggestListingTitleRequest,
  ): Promise<SuggestListingTitleResponse> {
    try {
      const resp = await apiClient.post<{ data: SuggestListingTitleResponse }>(
        "/api/ai/listings/suggest-title",
        req,
      );
      return resp.data.data;
    } catch (err: unknown) {
      const status = (err as { response?: { status?: number } })?.response?.status;
      if (status === 401) throw err; // let auth interceptor handle
      if (status === 400 && import.meta.env.DEV) {
        console.warn("[aiApi.suggestListingTitle] 400 from gateway, using local template", err);
      }
      return {
        title:    localTitle(req),
        provider: "template",
        cached:   false,
        tookMs:   0,
      };
    }
  },

  /**
   * Suggest standout-feature chips for the listing. Same graceful-degradation
   * contract as the title use case — always resolves with ≥6 chips.
   */
  async suggestFeatures(
    req: SuggestListingFeaturesRequest,
  ): Promise<SuggestListingFeaturesResponse> {
    try {
      const resp = await apiClient.post<{ data: SuggestListingFeaturesResponse }>(
        "/api/ai/listings/suggest-features",
        req,
      );
      return resp.data.data;
    } catch (err: unknown) {
      const status = (err as { response?: { status?: number } })?.response?.status;
      if (status === 401) throw err;
      if (status === 400 && import.meta.env.DEV) {
        console.warn("[aiApi.suggestFeatures] 400 from gateway, using local template", err);
      }
      return {
        features: localFeatures(req),
        provider: "template",
        cached:   false,
        tookMs:   0,
      };
    }
  },

  /**
   * Suggest a one-paragraph marketing blurb describing the neighborhood from a
   * caller-supplied set of POIs (the model isn't allowed to invent places).
   * On 429/5xx falls back to a dry "X, Y, Z nearby" template so the UI never
   * has to show an error for this flow.
   */
  async suggestNearbyBlurb(
    req: SuggestNearbyBlurbRequest,
  ): Promise<SuggestNearbyBlurbResponse> {
    try {
      const resp = await apiClient.post<{ data: SuggestNearbyBlurbResponse }>(
        "/api/ai/listings/suggest-nearby-blurb",
        req,
      );
      return resp.data.data;
    } catch (err: unknown) {
      const status = (err as { response?: { status?: number } })?.response?.status;
      if (status === 401) throw err;
      const nearest = [...req.highlights]
        .sort((a, b) => a.distanceMeters - b.distanceMeters)
        .slice(0, 3);
      const blurb = nearest.length
        ? `Right in ${req.area}, with ${nearest.map((h) => `${h.name} (${h.kind}, ${h.distanceMeters} m)`).join("; ")} nearby.`
        : `Right in ${req.area}.`;
      return { blurb: blurb.slice(0, 300), provider: "template", cached: false, tookMs: 0 };
    }
  },
};
