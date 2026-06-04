// Wikipedia REST API — public, no key, no rate limits for reads.
// We use it to fetch a short paragraph describing the neighbourhood / district
// the booking is in, so the tenant gets a "what is this place?" blurb.
//
// Docs: https://en.wikipedia.org/api/rest_v1/

export interface WikipediaSummary {
  title: string;
  extract: string;          // plain-text summary, usually 1-3 sentences
  thumbnailUrl?: string;
  pageUrl: string;
}

const SUMMARY_BASE = "https://en.wikipedia.org/api/rest_v1/page/summary";

/**
 * Fetch a short summary for a place. Returns null if no article matches.
 * Wikipedia follows redirects automatically, so "Thonglor" finds "Thong Lo".
 *
 * @param title  Place name to look up (e.g. "Thong Lo", "Sukhumvit", "Chiang Mai")
 */
export async function getWikipediaSummary(title: string): Promise<WikipediaSummary | null> {
  if (!title.trim()) return null;
  const encoded = encodeURIComponent(title.trim());

  const ctrl = new AbortController();
  const timeout = setTimeout(() => ctrl.abort(), 6000);

  try {
    const res = await fetch(`${SUMMARY_BASE}/${encoded}`, {
      signal: ctrl.signal,
      headers: { Accept: "application/json" },
    });
    if (!res.ok) return null;
    const data = await res.json();
    // Disambiguation pages have no useful extract — skip.
    if (data.type === "disambiguation") return null;
    if (!data.extract || typeof data.extract !== "string") return null;

    return {
      title: data.title ?? title,
      extract: data.extract,
      thumbnailUrl: data.thumbnail?.source,
      pageUrl: data.content_urls?.desktop?.page ?? `https://en.wikipedia.org/wiki/${encoded}`,
    };
  } catch {
    return null;
  } finally {
    clearTimeout(timeout);
  }
}

/**
 * Try a list of candidate titles in order, return the first one that yields
 * a non-empty summary. Useful when we have several name candidates
 * (suburb → neighbourhood → city) and want the most specific match.
 */
export async function getFirstWikipediaSummary(
  candidates: (string | null | undefined)[],
): Promise<WikipediaSummary | null> {
  for (const c of candidates) {
    if (!c) continue;
    const summary = await getWikipediaSummary(c);
    if (summary) return summary;
  }
  return null;
}
