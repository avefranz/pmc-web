import type { ReactNode } from "react";
import type { BuildingType, CheckInMethod, ContactChannel, FurnishedType } from "@/lib/types";

// Single source of truth for the property editor state.
// Both create-mode (no IDs yet) and edit-mode (existing asset + listing)
// project into this shape.
export interface PropertyDraft {
  // ── Specs (asset)
  assetTypeId: number | null;
  bedrooms: number | null;
  bathrooms: number;
  beds: number;
  maxOccupancy: number;
  areaSqm: number | null;
  floor: number | null;
  totalFloors: number | null;
  furnished: FurnishedType | null;
  buildingType: BuildingType | null;
  parkingSpaces: number;
  parkingIncluded: boolean;
  minLeaseMonths: number | null;
  internalName: string;

  // ── Location (asset)
  cityId: number | null;
  streetAddress: string;
  unitNumber: string;
  zipCode: string;
  latitude: number | null;
  longitude: number | null;
  legalAddress: string;
  googleMapsUrl: string;

  // ── Listing — title & description
  title: string;
  description: string;

  // ── Pricing
  baseMonthlyRate: number;
  depositAmount: number;

  // ── Stay details
  checkInMethod: CheckInMethod | "";
  checkInInstructions: string;
  houseRules: string;
  wifiName: string;
  wifiPassword: string;
  petsAllowed: boolean;
  petsExplicitlySet: boolean;
  petDeposit: number;
  cancellationNoticeDays: number;
  cancellationPenaltyMonths: number;

  // ── Utilities included in rent
  utilityElectricity: boolean;
  utilityWater: boolean;
  utilityInternet: boolean;
  utilityAircon: boolean;
  utilityGarbage: boolean;
  /** UX-84: true once host has changed any spinner in the specs section. */
  specsTouched: boolean;
  /** UX-75: true once host has opened and interacted with the utilities section. */
  utilitiesTouched: boolean;

  // ── Cancellation policy touched flag (UX-76)
  /** UX-76: true once host has explicitly chosen a cancellation policy. */
  cancellationTouched: boolean;

  // ── Amenities (only commits in edit mode)
  amenityIds: number[];

  // ── Read-only signal for the photos section's completeness check.
  // Hydrated from listing.media.length in edit mode; 0 in create mode.
  photoCount: number;

  // ── Host contact & payment (lives on the user profile, NOT per-property).
  // Hydrated from `useMyProfile()`. We surface them as editor sections so that
  // landlords creating their first property can't skip them — bookings stall
  // without payment info, so the platform makes it impossible to publish
  // without these set globally.
  contactPhoneCountryCode: string;
  contactPhone: string;
  contactChannels: ContactChannel[];
  contactLineHandle: string;

  paymentPromptPayId: string;
  paymentBankName: string;
  paymentBankAccountNumber: string;
  paymentBankAccountName: string;
}

export const EMPTY_DRAFT: PropertyDraft = {
  assetTypeId: null,
  bedrooms: null,
  bathrooms: 1,
  beds: 1,
  maxOccupancy: 2,
  areaSqm: null,
  floor: null,
  totalFloors: null,
  furnished: null,
  buildingType: null,
  parkingSpaces: 0,
  parkingIncluded: false,
  minLeaseMonths: null,
  internalName: "",

  cityId: null,
  streetAddress: "",
  unitNumber: "",
  zipCode: "",
  latitude: null,
  longitude: null,
  legalAddress: "",
  googleMapsUrl: "",

  title: "",
  description: "",

  baseMonthlyRate: 0,
  depositAmount: 0,

  checkInMethod: "",
  checkInInstructions: "",
  houseRules: "",
  wifiName: "",
  wifiPassword: "",
  petsAllowed: false,
  petsExplicitlySet: false,
  petDeposit: 0,
  cancellationNoticeDays: 14,
  cancellationPenaltyMonths: 0,

  utilityElectricity: false,
  utilityWater: false,
  utilityInternet: false,
  utilityAircon: false,
  utilityGarbage: false,
  specsTouched: false,
  utilitiesTouched: false,
  cancellationTouched: false,

  amenityIds: [],
  photoCount: 0,

  contactPhoneCountryCode: "+66",
  contactPhone: "",
  contactChannels: [],
  contactLineHandle: "",

  paymentPromptPayId: "",
  paymentBankName: "",
  paymentBankAccountNumber: "",
  paymentBankAccountName: "",
};

export type DraftPatch = Partial<PropertyDraft>;

// What every section form receives. The form is mode-agnostic — it only
// mutates the draft via `patch`. The container (sections-list) handles the
// actual API commit when the user hits the section's "Continue" button.
export interface SectionFormProps {
  draft: PropertyDraft;
  patch: (p: DraftPatch) => void;
  mode: EditorMode;
  // Only present in edit mode — sections that need them (photos, amenities)
  // should declare editOnly: true.
  assetId?: string;
  listingId?: string;
  // Photos section uses these in create mode — files are buffered locally
  // and uploaded after the asset/listing is created (so the host fills
  // everything in one pass without a "save then come back for photos" trip).
  pendingPhotos?: File[];
  addPendingPhotos?: (files: File[]) => void;
  removePendingPhotoAt?: (index: number) => void;
  movePendingPhotoToCover?: (index: number) => void;
}

/** @deprecated kept as alias for older section files — use SectionFormProps */
export type SectionDialogProps = SectionFormProps;

export type EditorMode = "create" | "edit";

export type SectionGroupId = "basics" | "media" | "stay" | "included" | "host";

export interface SectionGroup {
  id: SectionGroupId;
  label: string;
}

export const SECTION_GROUPS: SectionGroup[] = [
  { id: "basics", label: "Basics" },
  { id: "media", label: "Media" },
  { id: "stay", label: "Stay details" },
  { id: "included", label: "What's included" },
  { id: "host", label: "Your details" },
];

// Each section is a self-contained module: id, where it lives in the list,
// when it counts as done, what to show in the collapsed row, and the dialog
// body. Adding a new section = create file + add to SECTIONS in sections/index.ts.
export interface SectionDef {
  id: string;
  label: string;
  group: SectionGroupId;
  required: boolean;
  estTime: string;
  // Pure predicate against the draft (no API calls).
  isComplete: (draft: PropertyDraft) => boolean;
  // Short summary shown in the collapsed row when complete.
  summary: (draft: PropertyDraft) => ReactNode;
  // The form body rendered inline when the section is active.
  Form: React.ComponentType<SectionFormProps>;
  // Skip in create mode (photos, amenities need a listingId to commit).
  editOnly?: boolean;
}

// Derive the list of unfilled required-section labels from a section list.
// Single source of truth: any SectionDef with `required: true` whose
// `isComplete(draft)` returns false ends up here. Adding a new required
// section automatically gates the save button — no separate registry.
export function missingRequiredSections(
  draft: PropertyDraft,
  sections: ReadonlyArray<SectionDef>,
): string[] {
  return sections.filter((s) => s.required && !s.isComplete(draft)).map((s) => s.label);
}
