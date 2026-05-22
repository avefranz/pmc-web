import { useCallback, useEffect, useRef, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { useNavigate } from "react-router-dom";
import { useAsset } from "@/lib/hooks/use-assets";
import { useListingsByAsset } from "@/lib/hooks/use-listings";
import { useReferences } from "@/lib/hooks/use-references";
import { useMyProfile } from "@/lib/hooks/use-profile";
import { assetsApi } from "@/lib/api/assets.api";
import { listingsApi } from "@/lib/api/listings.api";
import { profileApi } from "@/lib/api/profile.api";
import type { ListingDto } from "@/lib/types";
import type { DraftPatch, EditorMode, PropertyDraft } from "./types";
import { EMPTY_DRAFT, missingRequiredSections } from "./types";
import { SECTIONS } from "./sections";
import {
  applyProfileToDraft,
  draftFromAsset,
  isContactComplete,
  isPaymentComplete,
  toContactProfileUpdate,
  toCreateAssetRequest,
  toCreateListingRequest,
  toPaymentProfileUpdate,
  toUpdateAssetRequest,
  toUpdateListingRequest,
  toUpdateLocationRequest,
} from "./mappers";
import { celebrate } from "./celebrate";

interface UseEditorArgs {
  assetId?: string;
}

export interface EditorApi {
  mode: EditorMode;
  draft: PropertyDraft;
  patch: (p: DraftPatch) => void;
  isLoading: boolean;
  isPersisted: boolean;
  assetId?: string;
  listingId?: string;
  // Tells the sections-list whether to render contact / payment sections.
  // Hidden once the host has the data on their global profile.
  needsContactSection: boolean;
  needsPaymentSection: boolean;
  // Section-level commit (edit mode only — pushes the relevant slice to API).
  // Takes the next draft directly so callers don't race the state batch.
  commitSection: (sectionId: string, next: PropertyDraft) => Promise<void>;
  // First-time save in create mode — atomic create asset + listing.
  // Returns the new assetId for navigation.
  commitFirstSave: () => Promise<string | null>;
  missingForSave: string[];
  isSaving: boolean;
  // Wall-clock timestamp of the most recent successful commitSection, used
  // by the "Saved Xs ago" indicator in edit mode. Null until first commit.
  lastSavedAt: number | null;
  // Hard reset to fetched API state (cancel-all in edit mode).
  reset: () => void;
  // Publish the current listing (edit mode only).
  publishListing: (startDate?: string, endDate?: string) => Promise<void>;
  // Photos buffered during create — uploaded after the listing is created
  // so the host can complete everything in one pass without "save first".
  pendingPhotos: File[];
  addPendingPhotos: (files: File[]) => void;
  removePendingPhotoAt: (index: number) => void;
}

export function useEditorState({ assetId }: UseEditorArgs): EditorApi {
  const mode: EditorMode = assetId ? "edit" : "create";
  const qc = useQueryClient();
  const navigate = useNavigate();

  const { data: asset, isLoading: assetLoading } = useAsset(assetId ?? "");
  const { data: listings, isLoading: listingsLoading } = useListingsByAsset(assetId ?? "");
  const { data: refs } = useReferences();
  const { data: profile, isLoading: profileLoading } = useMyProfile();

  // For edit mode: take the latest/editable listing (the API returns versions).
  const listing: ListingDto | undefined = listings?.find((l) => l.isEditable) ?? listings?.[0];
  const listingId = listing?.id;

  const [draft, setDraft] = useState<PropertyDraft>(EMPTY_DRAFT);
  const [hydrated, setHydrated] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [lastSavedAt, setLastSavedAt] = useState<number | null>(null);
  // Files queued for upload during create — host can attach photos before
  // the first save instead of having to come back after "Save property".
  const [pendingPhotos, setPendingPhotos] = useState<File[]>([]);

  // Sync API → local editable draft. In edit mode we hydrate from asset +
  // listing + profile; in create mode only from profile (so the contact /
  // payment sections already show any globally-saved values).
  useEffect(() => {
    if (mode === "edit") {
      if (!asset) return;
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setDraft(applyProfileToDraft(draftFromAsset(asset, listing), profile));
      setHydrated(true);
    } else {
      if (!profile) return;
      setDraft((cur) => applyProfileToDraft(cur, profile));
      setHydrated(true);
    }
  }, [mode, asset, listing, profile]);

  const patch = useCallback((p: DraftPatch) => {
    setDraft((cur) => ({ ...cur, ...p }));
  }, []);

  // Sync draft.photoCount with the local buffer so the Photos section's
  // isComplete() and the progress counter both reflect pending uploads.
  useEffect(() => {
    if (mode !== "create") return;
    setDraft((cur) => cur.photoCount === pendingPhotos.length ? cur : { ...cur, photoCount: pendingPhotos.length });
  }, [pendingPhotos.length, mode]);

  const addPendingPhotos = useCallback((files: File[]) => {
    setPendingPhotos((cur) => [...cur, ...files]);
  }, []);

  const removePendingPhotoAt = useCallback((index: number) => {
    setPendingPhotos((cur) => cur.filter((_, i) => i !== index));
  }, []);

  const reset = useCallback(() => {
    if (mode === "edit" && asset) setDraft(applyProfileToDraft(draftFromAsset(asset, listing), profile));
    else setDraft(applyProfileToDraft(EMPTY_DRAFT, profile));
  }, [mode, asset, listing, profile]);

  // Hide contact / payment sections once the global profile has them set.
  const needsContactSection = !isContactComplete(profile);
  const needsPaymentSection = !isPaymentComplete(profile);

  // Compute the missing-required list from the section registry. Sections
  // hidden in create mode (editOnly + contact/payment when profile-filled)
  // are filtered out — same filter as the visible list in the UI.
  const missingForSave = (() => {
    if (mode !== "create") return [];
    const visible = SECTIONS.filter((s) => {
      if (s.editOnly) return false;
      if (s.id === "contact" && !needsContactSection) return false;
      if (s.id === "payment" && !needsPaymentSection) return false;
      return true;
    });
    return missingRequiredSections(draft, visible);
  })();

  // Track which sections have been pushed since the last hydrate so that we
  // can debounce double-saves (user opens dialog, hits save twice).
  const inflight = useRef<Set<string>>(new Set());

  const commitSection = useCallback(
    async (sectionId: string, next: PropertyDraft) => {
      if (inflight.current.has(sectionId)) return;
      inflight.current.add(sectionId);
      try {
        // Contact / payment commit to the user profile and are valid in BOTH
        // modes — host can update them whenever, regardless of asset state.
        if (sectionId === "contact") {
          await profileApi.update(toContactProfileUpdate(next));
          await qc.invalidateQueries({ queryKey: ["profile"] });
          return;
        }
        if (sectionId === "payment") {
          await profileApi.update(toPaymentProfileUpdate(next));
          await qc.invalidateQueries({ queryKey: ["profile"] });
          return;
        }
        // Everything else is per-property and only commits in edit mode.
        if (mode !== "edit" || !assetId) return;
        switch (sectionId) {
          case "specs":
            await assetsApi.update(assetId, toUpdateAssetRequest(next));
            break;
          case "location": {
            const req = toUpdateLocationRequest(next, assetId);
            if (req) await assetsApi.updateLocation(req);
            break;
          }
          case "title":
          case "pricing":
          case "checkin":
          case "rules":
          case "pets":
          case "cancel":
          case "utilities":
            if (listingId) await listingsApi.update(listingId, toUpdateListingRequest(next));
            break;
          case "amenities":
            if (listingId) {
              await listingsApi.updateAmenities(
                listingId,
                next.amenityIds.map((id) => ({ amenityId: id, isPresent: true })),
              );
            }
            break;
        }
        await Promise.all([
          qc.invalidateQueries({ queryKey: ["assets", assetId] }),
          qc.invalidateQueries({ queryKey: ["listings"] }),
        ]);
        setLastSavedAt(Date.now());
      } catch {
        toast.error("Couldn't save. Try again.");
      } finally {
        inflight.current.delete(sectionId);
      }
    },
    [mode, assetId, listingId, qc],
  );

  const commitFirstSave = useCallback(async (): Promise<string | null> => {
    if (mode !== "create") return null;
    if (missingForSave.length > 0) return null;
    setIsSaving(true);
    try {
      // Phase 0: profile (contact + payment, only if not yet set globally).
      // Run BEFORE the asset so a profile-write failure surfaces an error
      // without leaving an orphan asset behind.
      if (needsContactSection) {
        await profileApi.update(toContactProfileUpdate(draft));
      }
      if (needsPaymentSection) {
        await profileApi.update(toPaymentProfileUpdate(draft));
      }

      // Phase 1: asset (basic shape — backend CreateAssetRequest only takes
      // a handful of fields).
      const created = await assetsApi.create(toCreateAssetRequest(draft));
      const newAssetId = created.id;

      // Phase 1.5: write the remaining asset specs (area, floor, totalFloors,
      // furnished, parking, etc.) via PATCH. Without this, those fields were
      // silently dropped on first save and the host saw empty values after
      // reload — even though they were marked required in the editor.
      try {
        await assetsApi.update(newAssetId, toUpdateAssetRequest(draft));
      } catch {
        /* non-fatal — host can re-enter on edit page */
      }

      // Phase 2: location (best-effort — don't roll back asset on failure)
      const locReq = toUpdateLocationRequest(draft, newAssetId);
      if (locReq) {
        try {
          await assetsApi.updateLocation(locReq);
        } catch {
          /* surfaced by the location section if the host opens it again */
        }
      }

      // Phase 3: listing
      const propertyCategoryId = refs?.propertyCategories?.[0]?.id ?? 1;
      const createdListing = await listingsApi.create(toCreateListingRequest(draft, newAssetId, propertyCategoryId));
      const newListingId = createdListing.id;

      // Phase 4: amenities (best-effort — selected in draft before first save)
      if (draft.amenityIds.length > 0) {
        try {
          await listingsApi.updateAmenities(
            newListingId,
            draft.amenityIds.map((id) => ({ amenityId: id, isPresent: true })),
          );
        } catch {
          /* non-critical */
        }
      }

      // Phase 5: photos buffered during create — upload in order so the first
      // becomes the cover. Each upload is independent so a single failure
      // doesn't lose the rest. We don't block the redirect on partial photo
      // failures — the host can retry from the edit screen.
      const photoFailures: string[] = [];
      for (const file of pendingPhotos) {
        try {
          await listingsApi.uploadMedia(newListingId, file);
        } catch {
          photoFailures.push(file.name || "photo");
        }
      }
      if (photoFailures.length > 0) {
        toast.warning(`Some photos didn't upload: ${photoFailures.join(", ")}. You can retry from the edit screen.`);
      }
      setPendingPhotos([]);

      await qc.invalidateQueries({ queryKey: ["assets"] });
      await qc.invalidateQueries({ queryKey: ["listings"] });
      await qc.invalidateQueries({ queryKey: ["profile"] });

      celebrate({
        x: window.innerWidth / 2,
        y: window.innerHeight * 0.3,
        count: 140,
        scale: 1.4,
        spread: Math.PI * 1.4,
      });
      const photoMsg = pendingPhotos.length > 0 ? ` · ${pendingPhotos.length - photoFailures.length} photo${pendingPhotos.length - photoFailures.length === 1 ? "" : "s"} uploaded` : "";
      toast.success(`Property created${photoMsg}! Ready to publish 🚀`);
      // Reset before navigating — once the route changes, mode flips to
      // "edit" and the bottom-right capsule swaps to the Publish bar. If we
      // leave isSaving=true here, the brief moment between mode-flip and
      // listing-load shows a stale "Saving…" label on the create-mode pill.
      setIsSaving(false);
      navigate(`/me/host/properties/${newAssetId}`, { replace: true });
      return newAssetId;
    } catch {
      toast.error("Couldn't save. Try again.");
      setIsSaving(false);
      return null;
    }
  }, [mode, draft, pendingPhotos, missingForSave.length, needsContactSection, needsPaymentSection, qc, refs, navigate]);

  const publishListing = useCallback(async (startDate?: string, endDate?: string) => {
    if (!listingId) return;
    try {
      if (startDate || endDate) {
        await listingsApi.update(listingId, {
          startDate: startDate || null,
          endDate: endDate || null,
        });
      }
      await listingsApi.publish(listingId);
      toast.success("Your listing is now live! 🎉");
      await qc.invalidateQueries({ queryKey: ["listings"] });
    } catch {
      toast.error("Couldn't publish. Try again.");
    }
  }, [listingId, qc]);

  return {
    mode,
    draft,
    patch,
    isLoading: (mode === "edit" && (assetLoading || listingsLoading || !hydrated)) || profileLoading,
    isPersisted: mode === "edit",
    assetId,
    listingId,
    needsContactSection,
    needsPaymentSection,
    commitSection,
    commitFirstSave,
    missingForSave,
    isSaving,
    lastSavedAt,
    reset,
    publishListing,
    pendingPhotos,
    addPendingPhotos,
    removePendingPhotoAt,
  };
}
