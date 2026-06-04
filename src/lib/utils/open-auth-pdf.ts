import { apiClient } from "@/lib/api/client";

/**
 * Open a PDF in a new browser tab with authentication.
 *
 * - API-gated paths (/api/…): fetched via axios (includes Authorization: Bearer)
 *   → Blob URL → window.open. Required after BE-38: contract PDFs are now
 *   served through a backend proxy endpoint instead of presigned R2 URLs.
 *
 * - Legacy direct URLs (https://…): opened via window.open directly.
 *   Handles old records stored before the BE-38 migration.
 */
export async function openAuthPdf(url: string): Promise<void> {
  if (url.startsWith("/api/")) {
    const response = await apiClient.get<Blob>(url, { responseType: "blob" });
    const blobUrl = URL.createObjectURL(response.data);
    window.open(blobUrl, "_blank");
    // Blob URLs persist for the tab lifetime; the browser frees them on unload.
    // We intentionally do NOT revoke immediately — the new tab needs the URL.
  } else {
    window.open(url, "_blank", "noopener,noreferrer");
  }
}
