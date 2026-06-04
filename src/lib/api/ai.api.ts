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
  // BE Round 12 (UX-257): three style variants per call — Location / Action
  // / Lifestyle — so the host picks the shape that fits, not just rolls dice
  // on punctuation.
  titles:   string[];
  provider: AiProvider;
  cached:   boolean;
  tookMs:   number;
};

export type AiDescriptionStyle = "Professional" | "Emotional" | "Playful";

export type SuggestListingDescriptionRequest = {
  propertyType: AiPropertyType;
  area:         string;
  // UX-324: neighbourhood context. BE builds "the {subdistrict/district}
  // neighbourhood of {city}" from these and centres paragraph 2 on the
  // district instead of repeating the city. Both optional — BE only uses them
  // when present.
  district?:    string;
  subdistrict?: string;
  bedrooms:     number;
  features?:    string[];
  style:        AiDescriptionStyle;
  // 0..99 — incremented on Regenerate so the BE's cache key changes and the
  // host actually gets fresh prose instead of the same paragraph again.
  nonce:        number;
};

export type SuggestListingDescriptionResponse = {
  description: string;
  provider:    AiProvider;
  cached:      boolean;
  tookMs:      number;
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
 * Hard fallback for the title use case. Returns 3 visibly different shapes —
 * Location / Action / Lifestyle — so the picker still gives the host a real
 * choice even when both AI providers are down.
 */
function localTitles(req: SuggestListingTitleRequest): string[] {
  const size  = req.bedrooms === 0 ? "Studio" : `${req.bedrooms}-bed`;
  const type  = req.propertyType.toLowerCase();
  const area  = req.area.trim();
  const feat  = req.feature?.trim();
  const v     = (req.variation ?? 0) % 3;
  // Three distinct structural shapes — rotated by variation so Regenerate
  // cycles them.
  const shapes: ((parts: { size: string; type: string; area: string; feat?: string }) => string)[] = [
    ({ size, type, area, feat }) => [`${size} ${type}`, area, feat].filter(Boolean).join(" · "),
    ({ size, type, area, feat }) => `${feat ? feat + " " : ""}${size} ${type} in ${area}`.trim(),
    ({ size, type, area }) => `Quiet ${size} ${type} for monthly stays in ${area}`,
  ];
  const rotated = [...shapes.slice(v), ...shapes.slice(0, v)];
  return rotated.map((fn) => fn({ size, type, area, feat }).slice(0, 60));
}

/**
 * Hard fallback for the description use case — 4 paragraphs (Space /
 * Neighborhood / Amenities / Perfect for) matching the BE prompt structure.
 * BUG-315: every paragraph now has a small pool of variants picked by
 * (nonce + style) so Regenerate AND a Tone switch visibly change the WHOLE
 * description, not just the opening line.
 */
function localDescription(req: SuggestListingDescriptionRequest): string {
  const size = req.bedrooms === 0 ? "studio" : `${req.bedrooms}-bedroom`;
  const type = req.propertyType.toLowerCase();
  const area = req.area.trim();
  const n = req.nonce ?? 0;
  // Style shifts the index too, so Professional / Emotional / Playful each
  // start from a different variant of every paragraph.
  const styleShift = req.style === "Playful" ? 2 : req.style === "Emotional" ? 1 : 0;
  const pick = <T,>(pool: T[], salt: number): T => pool[(n + styleShift + salt) % pool.length];

  const openers = [
    `A comfortable ${size} ${type} in ${area}, set up for longer stays.`,
    `Step inside a ${size} ${type} that already feels like home, right in the heart of ${area}.`,
    `Welcome to your ${size} ${type} in ${area} — bags down, kettle on, you're set.`,
    `Looking for a real base in ${area}? This ${size} ${type} is made for month-after-month living.`,
  ];
  // UX-347: do NOT assert specific furnishings/appliances as fact — the host
  // may not have them, and inventing them ("a real bed", "a kitchen ready for
  // cooking") is exactly the fabrication the owner flagged. Keep these about
  // layout/feel, which is safe for any unit. Concrete amenities only appear via
  // `req.features` (the host's own selections) below.
  const spaces = [
    `The space is thoughtfully laid out for day-to-day living, with defined zones for sleeping, working and unwinding.`,
    `The layout just works — comfortable, uncluttered, and easy to settle into for a longer stay.`,
    `Calm and genuinely livable, it's set up for the rhythm of real life rather than a quick visit.`,
    `Every metre earns its keep, with a sensible layout that suits both downtime and a focused work week.`,
  ];
  const neighborhoods = [
    `${area} blends everyday convenience with character — markets, cafés and casual dining are an easy walk away, with transit links to reach the rest of the city.`,
    `Right outside, ${area} hums along: coffee in the morning, street food at night, and quiet streets in between when you want to switch off.`,
    `You're plugged into the best of ${area} — the good cafés, the local market, the late-night bites — without the noise following you home.`,
    `${area} is the kind of neighbourhood you settle into fast: friendly, walkable, and well-connected when you feel like exploring further.`,
  ];
  // UX-347: the old pool stated Wi-Fi / A/C / equipped kitchen / hot water as
  // fact regardless of what the host actually offers. When the host has told us
  // their real features (`req.features`), describe THOSE; otherwise stay generic
  // and don't claim amenities we can't verify.
  const amenitiesList = req.features?.length
    ? [
        `What's on offer here: ${req.features.slice(0, 6).join(", ")}.`,
        `Among the highlights: ${req.features.slice(0, 6).join(", ")}.`,
        `Features include ${req.features.slice(0, 6).join(", ")} — everything geared towards an easy long stay.`,
        `You'll find ${req.features.slice(0, 6).join(", ")} on hand.`,
      ]
    : [
        `It's set up for comfortable monthly living, so you can move in and get straight on with your stay.`,
        `Everything's geared towards a hassle-free long stay — settle in and make it yours.`,
        `Designed for month-after-month living rather than a quick stop-over.`,
        `Move-in ready for a relaxed, longer stay.`,
      ];
  const fits = [
    `Best for remote workers, slow travellers and anyone who'd rather rent a real home for a month than juggle hotel keycards.`,
    `Ideal if you're here to live, not just visit — digital nomads, long-stay couples and solo explorers all fit right in.`,
    `Perfect for a focused work month, a relaxed long stay, or simply trying ${area} on for size before committing.`,
    `Made for people who want a calm, ready-to-go base — work all week, wander all weekend.`,
  ];
  const opener = pick(openers, 0);
  const space = pick(spaces, 1);
  const neighborhood = pick(neighborhoods, 2);
  const amenities = pick(amenitiesList, 3);
  // UX-347: features now live in the amenities paragraph (grounded in the host's
  // real selections), so don't repeat them as a tail on the audience line.
  const fit = pick(fits, 4).trim();
  return [opener, space, neighborhood, amenities, fit].filter(Boolean).join("\n\n");
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
      const resp = await apiClient.post<{ data: SuggestListingTitleResponse | { title: string } & Partial<SuggestListingTitleResponse> }>(
        "/api/ai/listings/suggest-title",
        req,
      );
      const data = resp.data.data as SuggestListingTitleResponse & { title?: string };
      // Tolerate older BE responses that still return a single `title` string
      // — promote it to a one-element `titles` array so callers don't crash.
      if (!data.titles && data.title) {
        return { ...data, titles: [data.title] };
      }
      return data;
    } catch (err: unknown) {
      const status = (err as { response?: { status?: number } })?.response?.status;
      if (status === 401) throw err; // let auth interceptor handle
      if (status === 400 && import.meta.env.MODE !== "production") {
        console.warn("[aiApi.suggestListingTitle] 400 from gateway, using local template", err);
      }
      return {
        titles:   localTitles(req),
        provider: "template",
        cached:   false,
        tookMs:   0,
      };
    }
  },

  /**
   * Suggest a 4-paragraph listing description. Style parameter switches the
   * tone (Professional / Emotional / Playful); nonce bumps the BE cache key
   * so Regenerate truly returns fresh prose. Falls back to a structured
   * local template on 4xx/5xx — never errors.
   */
  async suggestListingDescription(
    req: SuggestListingDescriptionRequest,
  ): Promise<SuggestListingDescriptionResponse> {
    try {
      const resp = await apiClient.post<{ data: SuggestListingDescriptionResponse }>(
        "/api/ai/listings/suggest-description",
        req,
      );
      return resp.data.data;
    } catch (err: unknown) {
      const status = (err as { response?: { status?: number } })?.response?.status;
      if (status === 401) throw err;
      if (status === 400 && import.meta.env.MODE !== "production") {
        console.warn("[aiApi.suggestListingDescription] 400 from gateway, using local template", err);
      }
      return {
        description: localDescription(req),
        provider:    "template",
        cached:      false,
        tookMs:      0,
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
      if (status === 400 && import.meta.env.MODE !== "production") {
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
