import { useCallback, useEffect, useRef, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { useNavigate } from "react-router-dom";
import { useAsset } from "@/lib/hooks/use-assets";
import { useListingsByAsset } from "@/lib/hooks/use-listings";
import { useReferences } from "@/lib/hooks/use-references";
import { useMyProfile, stashProfileUpdate } from "@/lib/hooks/use-profile";
import { assetsApi } from "@/lib/api/assets.api";
import { listingsApi } from "@/lib/api/listings.api";
import { profileApi } from "@/lib/api/profile.api";
import { useAuthStore } from "@/lib/stores/auth.store";
import type { ListingDto } from "@/lib/types";
import type { DraftPatch, EditorMode, PropertyDraft, SectionDef, StagedPhoto } from "./types";
import { EMPTY_DRAFT, missingRequiredSections } from "./types";
import { SECTIONS } from "./sections";
import {
  applyProfileToDraft,
  draftFromAsset,
  isContactComplete,
  isPaymentComplete,
  isIdentityComplete,
  toContactProfileUpdate,
  toIdentityProfileUpdate,
  toCreateAssetRequest,
  toCreateListingRequest,
  toPaymentProfileUpdate,
  toUpdateAssetRequest,
  toUpdateListingRequest,
  toUpdateLocationRequest,
} from "./mappers";
import { celebrate } from "./celebrate";

// BUG-307: localStorage autosave key. Bumped suffix when the draft shape
// changes incompatibly so stale drafts from older builds don't crash on hydrate.
// BUG-354: the draft MUST be scoped per-user. The old global key leaked one
// host's in-progress draft into the editor of any OTHER user on the same
// browser (e.g. a freshly-registered account saw a stranger's pre-filled
// property). We now namespace the key by the authenticated user id (decoded
// from the JWT) so a draft can never cross accounts, and purge the legacy
// global key on first use.
const DRAFT_STORAGE_KEY_BASE = "pmc_property_draft_v1";
const LEGACY_DRAFT_STORAGE_KEY = "pmc_property_draft_v1";

/** Decode the user id from the persisted JWT synchronously (no network / no
 * async profile fetch needed on first render). Falls back to "anon" when there
 * is no token or it can't be parsed — anonymous users can't reach the host
 * editor, so "anon" never collides with a real account's draft. */
function currentUserKey(): string {
  try {
    const token = useAuthStore.getState().token;
    if (!token) return "anon";
    const payload = JSON.parse(
      atob(token.split(".")[1].replace(/-/g, "+").replace(/_/g, "/")),
    ) as Record<string, string>;
    return (
      payload["http://schemas.xmlsoap.org/ws/2005/05/identity/claims/nameidentifier"] ||
      payload.nameid ||
      payload.sub ||
      "anon"
    );
  } catch {
    return "anon";
  }
}

function draftStorageKey(): string {
  return `${DRAFT_STORAGE_KEY_BASE}::${currentUserKey()}`;
}

/** BUG-354: one-time cleanup — drop the un-scoped legacy key so a draft saved
 * before this fix can never be restored into a different account. We do NOT
 * migrate it to the current user (we can't prove whose draft it was). */
function purgeLegacyDraft() {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.removeItem(LEGACY_DRAFT_STORAGE_KEY);
  } catch {
    /* noop */
  }
}

interface StoredDraft {
  savedAt: number;
  draft: PropertyDraft;
  /** Names of pending photo files at save time — we can't persist Files in
   * localStorage, but we surface the names so the host knows what they still
   * need to re-pick after a tab reload. Only photos that hadn't finished
   * staging yet land here (staged ones survive via `stagedPhotos`). */
  pendingPhotoNames: string[];
  /** BUG-331: photos that finished staging to R2 — their id + url persist so
   * previews and the Photos-section completion survive a reload. */
  stagedPhotos?: StagedPhoto[];
}

function readStoredDraft(): StoredDraft | null {
  if (typeof window === "undefined") return null;
  // BUG-354: always nuke the un-scoped legacy key first so it can't leak.
  purgeLegacyDraft();
  try {
    const raw = window.localStorage.getItem(draftStorageKey());
    if (!raw) return null;
    const parsed = JSON.parse(raw) as StoredDraft;
    if (!parsed || typeof parsed !== "object" || !parsed.draft) return null;
    // Merge over EMPTY_DRAFT so a draft persisted before a field existed still
    // carries every key. Without this, an older localStorage draft is missing
    // newly-added fields (e.g. identityFirstName) and section isComplete/summary
    // crash on `undefined.trim()`.
    return { ...parsed, draft: { ...EMPTY_DRAFT, ...parsed.draft } };
  } catch {
    return null;
  }
}

function writeStoredDraft(value: StoredDraft) {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(draftStorageKey(), JSON.stringify(value));
  } catch {
    /* quota / private mode — drop silently, autosave is best-effort */
  }
}

function clearStoredDraft() {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.removeItem(draftStorageKey());
    purgeLegacyDraft();
  } catch {
    /* noop */
  }
}

/** Detect whether the host has touched the draft at all — used to decide
 * whether to restore from localStorage on mount (don't overwrite a profile
 * pre-fill with a stale draft if the host hasn't started yet). */
function draftHasUserEdits(d: PropertyDraft): boolean {
  return (
    d.assetTypeId !== null ||
    d.propertyCategoryId !== null ||
    d.bedrooms !== null ||
    d.areaSqm !== null ||
    d.furnished !== null ||
    d.cityId !== null ||
    d.title.trim().length > 0 ||
    d.description.trim().length > 0 ||
    d.baseMonthlyRate > 0 ||
    d.amenityIds.length > 0 ||
    d.specsTouched
  );
}

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
  needsIdentitySection: boolean;
  // Section-level commit (edit mode only — pushes the relevant slice to API).
  // Takes the next draft directly so callers don't race the state batch.
  commitSection: (sectionId: string, next: PropertyDraft) => Promise<boolean>;
  // First-time save in create mode — atomic create asset + listing.
  // Returns the new assetId for navigation.
  commitFirstSave: () => Promise<string | null>;
  /** BUG-293: required sections still missing for a publishable property.
   * Different from `missingForPartialSave` — the host can save a draft even
   * with this list non-empty. Drives the sticky-bar "{N}/M required" copy. */
  missingForSave: string[];
  /** BUG-293: the absolute minimum the BE needs to create asset+listing.
   * Until this is empty the Save button stays disabled (we can't POST
   * without these fields no matter how forgiving the partial flow is). */
  missingForPartialSave: string[];
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
  movePendingPhotoToCover: (index: number) => void;
  /** BUG-331: photos staged in a prior session, restored from localStorage.
   * Preview-only — rendered before the freshly-picked pending photos. */
  stagedPhotos: StagedPhoto[];
  removeStagedPhotoAt: (index: number) => void;
  /** BUG-307: epoch-ms of the localStorage draft we restored on mount.
   * Null in edit mode or when nothing was restored. Drives the "Draft
   * restored {ago}" banner in sections-list. */
  restoredAt: number | null;
  /** BUG-307: file names buffered before the tab closed. We can't rehydrate
   * the actual File objects from localStorage; surface the names so the host
   * knows what they still need to re-attach. */
  restoredPhotoNames: string[];
  /** BUG-307: throw away the restored draft and start from EMPTY_DRAFT + profile. */
  discardRestoredDraft: () => void;
  /** BUG-307: dismiss the banner without discarding the draft. */
  dismissRestoredBanner: () => void;
  /** BE-14: derived from API listing.status === "Active". Was returned by the
   * hook but missing from this interface — declaring it so `editor.isPublished`
   * type-checks in sections-list. */
  isPublished: boolean;
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

  // BUG-307: read the localStorage draft synchronously on first render so the
  // initial render shows restored data (no flash of empty defaults).
  const [restored] = useState<StoredDraft | null>(() =>
    mode === "create" ? readStoredDraft() : null,
  );
  const [draft, setDraft] = useState<PropertyDraft>(() =>
    restored?.draft ?? EMPTY_DRAFT,
  );
  const [hydrated, setHydrated] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [lastSavedAt, setLastSavedAt] = useState<number | null>(null);
  // Files queued for upload during create — host can attach photos before
  // the first save instead of having to come back after "Save property".
  const [pendingPhotos, setPendingPhotos] = useState<File[]>([]);
  // BUG-331: photos that completed staging in a PRIOR session, restored from
  // localStorage. Preview-only (no File); persisted across reloads so the
  // host's uploads aren't silently lost when the draft tab reloads.
  const [restoredStagedPhotos, setRestoredStagedPhotos] = useState<StagedPhoto[]>(
    () => (mode === "create" ? restored?.stagedPhotos ?? [] : []),
  );
  // BUG-331: staging results for THIS session's pending files, keyed by File
  // identity. Lets us (a) persist them to localStorage as they resolve and
  // (b) send their ids on first save without re-awaiting the promises.
  const [resolvedStaging, setResolvedStaging] = useState<Map<File, StagedPhoto>>(() => new Map());
  // BUG-307: surface restored draft timestamp so sections-list can render the
  // "Draft restored {ago}" banner. Cleared after the host discards or commits.
  const [restoredAt, setRestoredAt] = useState<number | null>(restored?.savedAt ?? null);
  const [restoredPhotoNames] = useState<string[]>(restored?.pendingPhotoNames ?? []);
  // Guard so the autosave effect doesn't immediately overwrite the file we
  // just restored with the empty draft React paints during initial mount.
  const autosaveReadyRef = useRef(false);

  // Sync API → local editable draft. In edit mode we hydrate from asset +
  // listing + profile; in create mode only from profile (so the contact /
  // payment sections already show any globally-saved values). BUG-307: in
  // create mode the localStorage draft (if any) is already in state — we
  // only overlay profile fields on top so server-side contact/payment
  // changes still flow in, without clobbering anything the host typed.
  useEffect(() => {
    if (mode === "edit") {
      if (!asset) return;
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setDraft(applyProfileToDraft(draftFromAsset(asset, listing), profile));
      setHydrated(true);
      autosaveReadyRef.current = false;
    } else {
      if (!profile) return;
      setDraft((cur) => applyProfileToDraft(cur, profile));
      setHydrated(true);
      // Allow autosave to start AFTER profile has been overlaid so the very
      // first persisted snapshot already includes the host's phone / bank
      // values from their profile.
      autosaveReadyRef.current = true;
    }
  }, [mode, asset, listing, profile]);

  // BUG-307: persist draft to localStorage on every change (debounced).
  // Only runs in create mode and only after the profile overlay landed — so
  // we never write an empty pre-profile snapshot over a richer restored draft.
  useEffect(() => {
    if (mode !== "create") return;
    if (!autosaveReadyRef.current) return;
    // If the host hasn't actually edited anything, skip persisting — keeps the
    // restored snapshot intact when they only opened the page to look around.
    // BUG-331: uploading photos IS an edit even when no text/specs changed —
    // count staged/pending photos so a "photos-only" draft is persisted (and
    // survives reload) instead of being lost on refresh.
    const hasPhotoWork = pendingPhotos.length > 0 || restoredStagedPhotos.length > 0;
    if (!draftHasUserEdits(draft) && !restored && !hasPhotoWork) return;
    const t = setTimeout(() => {
      // BUG-331: persist staged photos (id + url survive reload) plus the
      // restored ones. Only files that haven't finished staging go into
      // pendingPhotoNames as "you'll need to re-add these".
      const sessionStaged = pendingPhotos
        .map((f) => resolvedStaging.get(f))
        .filter((s): s is StagedPhoto => Boolean(s));
      writeStoredDraft({
        savedAt: Date.now(),
        draft,
        pendingPhotoNames: pendingPhotos
          .filter((f) => !resolvedStaging.has(f))
          .map((f) => f.name)
          .filter(Boolean),
        stagedPhotos: [...restoredStagedPhotos, ...sessionStaged],
      });
    }, 500);
    return () => clearTimeout(t);
  }, [mode, draft, pendingPhotos, resolvedStaging, restoredStagedPhotos, restored]);

  const discardRestoredDraft = useCallback(() => {
    clearStoredDraft();
    setRestoredAt(null);
    autosaveReadyRef.current = false;
    setDraft(applyProfileToDraft(EMPTY_DRAFT, profile));
    setPendingPhotos([]);
    setRestoredStagedPhotos([]);
    setResolvedStaging(new Map());
    stagingRef.current.clear();
    // Re-enable autosave on the next tick so the post-discard empty state
    // overwrites localStorage immediately (instead of waiting for the next edit).
    setTimeout(() => { autosaveReadyRef.current = true; }, 0);
  }, [profile]);

  const dismissRestoredBanner = useCallback(() => {
    setRestoredAt(null);
  }, []);

  const patch = useCallback((p: DraftPatch) => {
    setDraft((cur) => ({ ...cur, ...p }));
  }, []);

  // Sync draft.photoCount with the local buffer so the Photos section's
  // isComplete() and the progress counter both reflect pending uploads.
  // BUG-331: count restored staged photos too so completion survives a reload.
  useEffect(() => {
    if (mode !== "create") return;
    const total = pendingPhotos.length + restoredStagedPhotos.length;
    setDraft((cur) => cur.photoCount === total ? cur : { ...cur, photoCount: total });
  }, [pendingPhotos.length, restoredStagedPhotos.length, mode]);

  // UX-312: stage each chosen photo to R2 the moment it's added, so by the
  // time the host clicks Save the upload is already done and we just send the
  // stagedMediaIds in CreateListingRequest. Keyed by File identity; resolves to
  // the staging result or null on failure (→ fall back to a post-create upload).
  const stagingRef = useRef<Map<File, Promise<{ stagedMediaId: string; url: string } | null>>>(new Map());

  const addPendingPhotos = useCallback((files: File[]) => {
    if (mode === "create") {
      for (const f of files) {
        if (!stagingRef.current.has(f)) {
          const p = listingsApi.stageMedia(f).catch(() => null);
          stagingRef.current.set(f, p);
          // BUG-331: when staging resolves, record the id+url so it gets
          // persisted to localStorage and survives a reload.
          void p.then((res) => {
            if (res?.stagedMediaId) {
              setResolvedStaging((cur) => {
                const next = new Map(cur);
                next.set(f, { stagedMediaId: res.stagedMediaId, url: res.url, name: f.name || "photo" });
                return next;
              });
            }
          });
        }
      }
    }
    setPendingPhotos((cur) => [...cur, ...files]);
  }, [mode]);

  const removePendingPhotoAt = useCallback((index: number) => {
    setPendingPhotos((cur) => {
      const removed = cur[index];
      if (removed) {
        stagingRef.current.delete(removed);
        setResolvedStaging((m) => {
          if (!m.has(removed)) return m;
          const next = new Map(m);
          next.delete(removed);
          return next;
        });
      }
      return cur.filter((_, i) => i !== index);
    });
  }, []);

  // BUG-331: drop a restored (prior-session) staged photo.
  const removeStagedPhotoAt = useCallback((index: number) => {
    setRestoredStagedPhotos((cur) => cur.filter((_, i) => i !== index));
  }, []);

  const movePendingPhotoToCover = useCallback((index: number) => {
    setPendingPhotos((cur) => {
      if (index <= 0 || index >= cur.length) return cur;
      const target = cur[index];
      return [target, ...cur.slice(0, index), ...cur.slice(index + 1)];
    });
  }, []);

  const reset = useCallback(() => {
    if (mode === "edit" && asset) setDraft(applyProfileToDraft(draftFromAsset(asset, listing), profile));
    else setDraft(applyProfileToDraft(EMPTY_DRAFT, profile));
  }, [mode, asset, listing, profile]);

  // Hide contact / payment / identity sections once the global profile has them set.
  const needsContactSection = !isContactComplete(profile);
  const needsPaymentSection = !isPaymentComplete(profile);
  const needsIdentitySection = !isIdentityComplete(profile);

  // Compute the missing-required list from the section registry. Sections
  // hidden in create mode (editOnly + contact/payment when profile-filled)
  // are filtered out — same filter as the visible list in the UI.
  const missingForSave = (() => {
    if (mode !== "create") return [];
    const visible = SECTIONS.filter((s) => {
      if (s.editOnly) return false;
      if (s.id === "contact" && !needsContactSection) return false;
      if (s.id === "payment" && !needsPaymentSection) return false;
      if (s.id === "identity" && !needsIdentitySection) return false;
      return true;
    });
    return missingRequiredSections(draft, visible);
  })();

  // BUG-293: the BE needs at minimum a property type / category and a title
  // to materialise a draft asset+listing. Anything beyond that the editor
  // skips gracefully (location only POSTs when coords+city are set, photos
  // and amenities are already best-effort, profile pushes are gated below).
  // The hero promise ("save anytime") only kicks in after these are filled —
  // otherwise the POST cascade has nothing to send.
  const missingForPartialSave = (() => {
    if (mode !== "create") return [];
    const missing: string[] = [];
    const find = (id: string): SectionDef | undefined => SECTIONS.find((s) => s.id === id);
    if (draft.assetTypeId === null || draft.propertyCategoryId === null) {
      const specs = find("specs");
      if (specs) missing.push(specs.label);
    }
    if (draft.title.trim().length < 3) {
      const title = find("title");
      if (title) missing.push(title.label);
    }
    return missing;
  })();

  // Track which sections have been pushed since the last hydrate so that we
  // can debounce double-saves (user opens dialog, hits save twice).
  const inflight = useRef<Set<string>>(new Set());

  const commitSection = useCallback(
    async (sectionId: string, next: PropertyDraft): Promise<boolean> => {
      if (inflight.current.has(sectionId)) return false;
      inflight.current.add(sectionId);
      try {
        // Contact / payment commit to the user profile and are valid in BOTH
        // modes — host can update them whenever, regardless of asset state.
        if (sectionId === "contact") {
          await profileApi.update(toContactProfileUpdate(next));
          await qc.invalidateQueries({ queryKey: ["profile"] });
          return true;
        }
        if (sectionId === "payment") {
          await profileApi.update(toPaymentProfileUpdate(next));
          await qc.invalidateQueries({ queryKey: ["profile"] });
          return true;
        }
        // Legal identity commits to the user profile too (separate endpoint),
        // valid in both modes — printed on the contract, entered once.
        if (sectionId === "identity") {
          await profileApi.updateLandlordIdentity(toIdentityProfileUpdate(next));
          await qc.invalidateQueries({ queryKey: ["profile"] });
          return true;
        }
        // Everything else is per-property and only commits in edit mode.
        if (mode !== "edit" || !assetId) return false;
        switch (sectionId) {
          case "specs":
            await assetsApi.update(assetId, toUpdateAssetRequest(next));
            break;
          case "location": {
            const req = toUpdateLocationRequest(next, assetId);
            if (req) await assetsApi.updateLocation(req);
            await qc.invalidateQueries({ queryKey: ["listings", "asset", assetId] });
            break;
          }
          case "title":
          case "pricing":
          case "checkin":
          case "rules":
          case "pets":
          case "cancel":
          case "utilities": {
            // BUG-115: if the listing was never created (e.g. Phase 3 failed
            // during initial save), auto-create it now so subsequent edits
            // and photo uploads don't silently no-op.
            let effectiveLid = listingId;
            if (!effectiveLid) {
              const propertyCategoryId = next.propertyCategoryId ?? refs?.propertyCategories?.[0]?.id ?? 1;
              const created = await listingsApi.create(
                toCreateListingRequest(next, assetId, propertyCategoryId),
              );
              effectiveLid = created.id;
              await qc.invalidateQueries({ queryKey: ["listings"] });
            }
            await listingsApi.update(effectiveLid, toUpdateListingRequest(next));
            break;
          }
          case "amenities": {
            let effectiveLid = listingId;
            if (!effectiveLid) {
              const propertyCategoryId = next.propertyCategoryId ?? refs?.propertyCategories?.[0]?.id ?? 1;
              const created = await listingsApi.create(
                toCreateListingRequest(next, assetId, propertyCategoryId),
              );
              effectiveLid = created.id;
              await qc.invalidateQueries({ queryKey: ["listings"] });
            }
            await listingsApi.updateAmenities(
              effectiveLid,
              next.amenityIds.map((id) => ({ amenityId: id, isPresent: true })),
            );
            break;
          }
        }
        await Promise.all([
          qc.invalidateQueries({ queryKey: ["assets", assetId] }),
          qc.invalidateQueries({ queryKey: ["listings"] }),
        ]);
        setLastSavedAt(Date.now());
        return true;
      } catch (err) {
        // Surface the real failure in the console so a "Couldn't save" report
        // is diagnosable — distinguishes a network-layer drop (no err.response,
        // e.g. backend restarting / proxy timeout on the FIRST write of the
        // create flow) from a backend rejection (err.response.status).
        const status = (err as { response?: { status?: number } })?.response?.status;
        console.error(
          `[editor] commit "${sectionId}" failed`,
          status ? `(HTTP ${status})` : "(network/no response)",
          err,
        );
        toast.error("Couldn't save. Try again.");
        return false;
      } finally {
        inflight.current.delete(sectionId);
      }
    },
    [mode, assetId, listingId, refs, qc],
  );

  const commitFirstSave = useCallback(async (): Promise<string | null> => {
    if (mode !== "create") return null;
    // BUG-293: gate on partial-save minimum (specs + title), not on the full
    // publish requirements. The remaining required sections show up in the
    // edit-mode sidebar where the host can finish them at their own pace.
    if (missingForPartialSave.length > 0) return null;
    // Capture once at the entrypoint so the toast/redirect at the bottom can
    // tell whether this was a draft save or a publish-ready save without
    // re-deriving from a draft that may have churned during the awaits.
    const isFullySaveable = missingForSave.length === 0;
    setIsSaving(true);
    try {
      // Phase 0: profile (contact + payment, only if not yet set globally
      // AND the section's data is actually present in the draft — pushing
      // a half-empty patch can violate BE validators in odd ways).
      // Run BEFORE the asset so a profile-write failure surfaces an error
      // without leaving an orphan asset behind.
      // Optimistically merge into ["profile"] cache so the next render sees
      // the new contact/payment values even if backend's GET /me/profile
      // doesn't include them yet (BE-10).
      const mergeProfileCache = (patch: Record<string, unknown>) => {
        qc.setQueryData(["profile"], (cur: unknown) => {
          if (!cur || typeof cur !== "object") return cur;
          const merged = { ...(cur as Record<string, unknown>) };
          for (const [k, v] of Object.entries(patch)) if (v !== undefined) merged[k] = v;
          return merged;
        });
      };
      const draftContactReady =
        draft.contactPhone.trim().length > 0 && draft.contactChannels.length > 0;
      const draftPaymentReady =
        draft.paymentPromptPayId.trim().length > 0 ||
        (draft.paymentBankName.trim().length > 0 &&
          draft.paymentBankAccountNumber.trim().length > 0 &&
          draft.paymentBankAccountName.trim().length > 0);
      if (needsContactSection && draftContactReady) {
        const patch = toContactProfileUpdate(draft);
        await profileApi.update(patch);
        mergeProfileCache(patch as unknown as Record<string, unknown>);
        stashProfileUpdate(patch as unknown as Record<string, unknown>);
      }
      if (needsPaymentSection && draftPaymentReady) {
        const patch = toPaymentProfileUpdate(draft);
        await profileApi.update(patch);
        mergeProfileCache(patch as unknown as Record<string, unknown>);
        stashProfileUpdate(patch as unknown as Record<string, unknown>);
      }
      const draftIdentityReady =
        draft.identityFirstName.trim().length > 0 &&
        draft.identityLastName.trim().length > 0 &&
        draft.identityIdNumber.trim().length > 0 &&
        draft.identityResidentialAddress.trim().length > 0;
      if (needsIdentitySection && draftIdentityReady) {
        await profileApi.updateLandlordIdentity(toIdentityProfileUpdate(draft));
        // Merge into the ["profile"] cache so the signing page sees the identity
        // immediately (mirrors the nested landlordIdentity shape GET returns).
        mergeProfileCache({ landlordIdentity: toIdentityProfileUpdate(draft) });
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

      // UX-312: resolve background staging BEFORE creating the listing, so
      // already-uploaded photos ride in on CreateListingRequest.stagedMediaIds
      // (index 0 = cover) and the host doesn't wait for uploads on Save. Any
      // photo whose staging failed/never finished falls back to a normal
      // post-create upload so nothing is silently lost.
      // BUG-331: restored (prior-session) staged photos go first so they keep
      // their cover ordering, then this session's freshly-staged files.
      const restoredIds: string[] = restoredStagedPhotos.map((s) => s.stagedMediaId);
      const sessionIds: string[] = [];
      const fallbackFiles: File[] = [];
      for (const file of pendingPhotos) {
        const stagePromise = stagingRef.current.get(file);
        const staged = stagePromise ? await stagePromise : null;
        if (staged?.stagedMediaId) sessionIds.push(staged.stagedMediaId);
        else fallbackFiles.push(file);
      }
      const stagedMediaIds = [...restoredIds, ...sessionIds];

      // Phase 3: listing (with staged photos attached atomically)
      const propertyCategoryId = draft.propertyCategoryId ?? refs?.propertyCategories?.[0]?.id ?? 1;
      const createReq = toCreateListingRequest(draft, newAssetId, propertyCategoryId);
      if (stagedMediaIds.length > 0) createReq.stagedMediaIds = stagedMediaIds;
      let createdListing;
      try {
        createdListing = await listingsApi.create(createReq);
      } catch (err) {
        // BUG-331: a restored staging id can expire server-side between
        // sessions. Rather than failing the whole save (and dropping the
        // listing), retry once without the restored ids and tell the host to
        // re-add those photos — never silently lose data.
        if (restoredIds.length > 0) {
          const retryReq = toCreateListingRequest(draft, newAssetId, propertyCategoryId);
          if (sessionIds.length > 0) retryReq.stagedMediaIds = sessionIds;
          createdListing = await listingsApi.create(retryReq);
          toast.warning("Couldn't restore the photos from your earlier draft — please re-add them from the edit screen.");
        } else {
          throw err;
        }
      }
      const newListingId = createdListing.id;

      // BE-11 fixed: CreateListingRequest now includes all 11 fields — no PATCH needed.

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

      // Phase 5: ONLY photos that failed staging — uploaded the old way as a
      // safety net. With staging working this list is normally empty, so Save
      // returns instantly. BUG-283: 30 s timeout per upload so a stalled R2
      // connection never hangs the button.
      const uploadWithTimeout = (file: File) =>
        Promise.race([
          listingsApi.uploadMedia(newListingId, file),
          new Promise<never>((_, reject) =>
            setTimeout(() => reject(new Error("upload timeout")), 30_000),
          ),
        ]);
      const photoFailures: string[] = [];
      const uploadOne = async (file: File) => {
        try {
          await uploadWithTimeout(file);
        } catch {
          photoFailures.push(file.name || "photo");
        }
      };
      if (fallbackFiles.length > 0) {
        await uploadOne(fallbackFiles[0]);
        await Promise.all(fallbackFiles.slice(1).map(uploadOne));
      }
      if (photoFailures.length > 0) {
        toast.warning(`Some photos didn't upload: ${photoFailures.join(", ")}. You can retry from the edit screen.`);
      }
      setPendingPhotos([]);
      setRestoredStagedPhotos([]);
      setResolvedStaging(new Map());
      stagingRef.current.clear();

      await qc.invalidateQueries({ queryKey: ["assets"] });
      await qc.invalidateQueries({ queryKey: ["listings"] });
      await qc.invalidateQueries({ queryKey: ["profile"] });

      // BUG-307: the localStorage draft is no longer needed once the asset
      // exists server-side. Clear before navigation so a follow-up "create
      // another property" starts fresh.
      clearStoredDraft();

      // staged (attached on create) + fallback uploads that succeeded
      const successCount = stagedMediaIds.length + (fallbackFiles.length - photoFailures.length);
      const photoMsg = successCount > 0 ? ` · ${successCount} photo${successCount === 1 ? "" : "s"} uploaded` : "";
      // BUG-293: scale celebration + copy to the state the host is actually
      // in. Partial save = "Draft saved, keep going"; publish-ready = full
      // confetti + "Ready to publish".
      if (isFullySaveable) {
        celebrate({
          x: window.innerWidth / 2,
          y: window.innerHeight * 0.3,
          count: 140,
          scale: 1.4,
          spread: Math.PI * 1.4,
        });
        toast.success(`Property created${photoMsg}! Ready to publish 🚀`);
      } else {
        celebrate({
          x: window.innerWidth / 2,
          y: window.innerHeight * 0.35,
          count: 50,
          scale: 0.9,
        });
        toast.success(
          `Draft saved${photoMsg} — continue whenever you're ready.`,
        );
      }
      // Reset before navigating — once the route changes, mode flips to
      // "edit" and the bottom-right capsule swaps to the Publish bar. If we
      // leave isSaving=true here, the brief moment between mode-flip and
      // listing-load shows a stale "Saving…" label on the create-mode pill.
      setIsSaving(false);
      // ?publish=1 tells the edit page to auto-open the Publish dialog once
      // the asset+listing hydrate. Keeps the create flow a single iteration:
      // fill → Save → confirm dates → live. Only attach it on publish-ready
      // saves — for drafts we land on edit-mode without nagging the host to
      // publish something that's still missing required sections.
      const navUrl = isFullySaveable
        ? `/me/host/properties/${newAssetId}?publish=1`
        : `/me/host/properties/${newAssetId}`;
      navigate(navUrl, { replace: true });
      return newAssetId;
    } catch {
      toast.error("Couldn't save. Try again.");
      setIsSaving(false);
      return null;
    }
  }, [mode, draft, pendingPhotos, restoredStagedPhotos, missingForSave.length, missingForPartialSave.length, needsContactSection, needsPaymentSection, needsIdentitySection, qc, refs, navigate]);

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
    needsIdentitySection,
    commitSection,
    commitFirstSave,
    missingForSave,
    missingForPartialSave,
    isSaving,
    lastSavedAt,
    reset,
    publishListing,
    pendingPhotos,
    addPendingPhotos,
    removePendingPhotoAt,
    movePendingPhotoToCover,
    stagedPhotos: restoredStagedPhotos,
    removeStagedPhotoAt,
    restoredAt,
    restoredPhotoNames,
    discardRestoredDraft,
    dismissRestoredBanner,
    /** BE-14 fixed: derived from API listing.status — replaces justPublished session flag */
    isPublished: listing?.status === "Active",
  };
}
