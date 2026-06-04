import type { AssetDto, ListingDto, UpdateAssetRequest, UpdateLocationRequest, CreateAssetRequest, CreateListingRequest, UserProfileDto, UpdateProfileRequest } from "@/lib/types";
import type { UpdateListingRequest } from "@/lib/api/listings.api";
import type { PropertyDraft } from "./types";
import { EMPTY_DRAFT } from "./types";

// ── API → draft ────────────────────────────────────────────────────────────
export function draftFromAsset(asset: AssetDto | undefined, listing: ListingDto | undefined): PropertyDraft {
  if (!asset) return { ...EMPTY_DRAFT };
  return {
    ...EMPTY_DRAFT,
    assetTypeId: asset.assetTypeId ?? null,
    // ListingDto doesn't surface propertyCategoryId today — read it
    // defensively via a cast so we don't lose the choice if BE adds it
    // later. Null in edit mode falls back to the references[0] default at
    // commit time, same as before — but the host's earlier pick survives.
    propertyCategoryId:
      (listing as unknown as { propertyCategoryId?: number } | undefined)?.propertyCategoryId ?? null,
    bedrooms: asset.bedrooms ?? null,
    bathrooms: asset.bathrooms ?? 1,
    beds: asset.beds ?? 1,
    maxOccupancy: asset.maxOccupancy ?? 2,
    areaSqm: asset.areaSqm ?? null,
    floor: asset.floor ?? null,
    totalFloors: asset.totalFloors ?? null,
    furnished: asset.furnished ?? null,
    buildingType: asset.buildingType ?? null,
    parkingSpaces: asset.parkingSpaces ?? 0,
    parkingIncluded: asset.parkingIncluded ?? false,
    minLeaseMonths: asset.minLeaseMonths ?? null,
    internalName: asset.internalName ?? "",

    cityId: asset.cityId && asset.cityId > 0 ? asset.cityId : null,
    streetAddress: asset.addressLine ? Object.values(asset.addressLine).filter(Boolean).join(", ") : "",
    unitNumber: asset.unitNumber ?? "",
    zipCode: asset.zipCode ?? "",
    latitude: asset.exactLatitude ?? null,
    longitude: asset.exactLongitude ?? null,
    legalAddress: asset.legalAddress ?? "",
    street: asset.street ?? "",
    soi: asset.soi ?? "",
    subdistrict: asset.subdistrict ?? "",
    district: asset.district ?? "",
    province: asset.province ?? "",
    // If the asset already has a legalAddress saved, assume the host curated
    // it — don't let the autogenerator stomp on it when they re-open the
    // section.
    legalAddressTouched: !!asset.legalAddress,
    googleMapsUrl: asset.googleMapsUrl ?? "",

    title: listing?.title ?? asset.internalName ?? "",
    description: listing?.description ?? "",

    baseMonthlyRate: listing?.baseMonthlyRate ?? 0,
    depositAmount: listing?.depositAmount ?? 0,

    checkInMethod: listing?.checkInMethod ?? "",
    checkInInstructions: listing?.checkInInstructions ?? "",
    houseRules: listing?.houseRules ?? "",
    wifiName: listing?.wifiName ?? "",
    wifiPassword: listing?.wifiPassword ?? "",
    petsAllowed: listing?.petsAllowed ?? false,
    petsExplicitlySet: listing !== undefined,
    petDeposit: listing?.petDeposit ?? 0,
    cancellationNoticeDays: listing?.cancellationNoticeDays ?? 14,
    cancellationPenaltyMonths: listing?.cancellationPenaltyMonths ?? 0,

    utilityElectricity: listing?.utilityElectricity ?? false,
    utilityWater: listing?.utilityWater ?? false,
    utilityInternet: listing?.utilityInternet ?? false,
    utilityAircon: listing?.utilityAircon ?? false,
    utilityGarbage: listing?.utilityGarbage ?? false,
    // UX-84/75/76: if asset/listing exists the host already set these fields
    specsTouched: asset !== undefined,
    utilitiesTouched: listing !== undefined,
    cancellationTouched: listing !== undefined,

    amenityIds: (listing?.amenities ?? [])
      .filter((a) => a.isPresent)
      .map((a) => Number(a.amenityId))
      .filter((n) => !Number.isNaN(n)),
    photoCount: listing?.media?.length ?? 0,
  };
}

// ── draft → API ────────────────────────────────────────────────────────────
export function toCreateAssetRequest(d: PropertyDraft): CreateAssetRequest {
  return {
    internalName: d.title.trim() || d.internalName || "Untitled property",
    assetTypeId: d.assetTypeId!,
    bedrooms: d.bedrooms ?? 1,
    bathrooms: d.bathrooms,
    beds: d.beds || (d.bedrooms ?? 1),
    maxOccupancy: d.maxOccupancy || ((d.bedrooms ?? 1) * 2),
  };
}

export function toUpdateAssetRequest(d: PropertyDraft): UpdateAssetRequest {
  return {
    internalName: d.title.trim() || undefined,
    bedrooms: d.bedrooms ?? undefined,
    bathrooms: d.bathrooms,
    beds: d.beds,
    maxOccupancy: d.maxOccupancy,
    areaSqm: d.areaSqm,
    floor: d.floor,
    totalFloors: d.totalFloors,
    furnished: d.furnished,
    buildingType: d.buildingType,
    parkingSpaces: d.parkingSpaces,
    parkingIncluded: d.parkingIncluded,
    minLeaseMonths: d.minLeaseMonths,
  };
}

export function toUpdateLocationRequest(d: PropertyDraft, assetId: string): UpdateLocationRequest | null {
  if (!d.latitude || !d.longitude || !d.cityId) return null;
  return {
    assetId,
    cityId: d.cityId,
    streetAddress: d.streetAddress,
    unitNumber: d.unitNumber || undefined,
    zipCode: d.zipCode || undefined,
    latitude: d.latitude,
    longitude: d.longitude,
    legalAddress: d.legalAddress || undefined,
    googleMapsUrl: d.googleMapsUrl || undefined,
    // UX-254: send the structured Thai address fields so they round-trip
    // through edit mode and the BE has them for searchability / TM-30 etc.
    street: d.street || null,
    soi: d.soi || null,
    subdistrict: d.subdistrict || null,
    district: d.district || null,
    province: d.province || null,
  };
}

export function toCreateListingRequest(d: PropertyDraft, assetId: string, propertyCategoryId: number): CreateListingRequest {
  return {
    assetId,
    title: d.title.trim(),
    description: d.description,
    houseRules: d.houseRules,
    wifiName: d.wifiName,
    wifiPassword: d.wifiPassword,
    propertyCategoryId,
    instantBookEnabled: false,
    basePrice: 0,
    baseMonthlyRate: d.baseMonthlyRate,
    depositAmount: d.depositAmount || undefined,
    checkInMethod: d.checkInMethod || null,
    checkInInstructions: d.checkInInstructions || null,
    utilityElectricity: d.utilityElectricity,
    utilityWater: d.utilityWater,
    utilityInternet: d.utilityInternet,
    utilityAircon: d.utilityAircon,
    utilityGarbage: d.utilityGarbage,
    petsAllowed: d.petsAllowed,
    petDeposit: d.petDeposit || undefined,
    cancellationNoticeDays: d.cancellationNoticeDays,
    cancellationPenaltyMonths: d.cancellationPenaltyMonths,
  };
}

// ── Profile (host contact + payment) ──────────────────────────────────────
export function applyProfileToDraft(draft: PropertyDraft, profile: UserProfileDto | undefined): PropertyDraft {
  if (!profile) return draft;
  return {
    ...draft,
    contactPhoneCountryCode: profile.phoneCountryCode ?? draft.contactPhoneCountryCode,
    contactPhone: profile.phone ?? "",
    contactChannels: profile.contactChannels ?? [],
    contactLineHandle: profile.lineHandle ?? "",
    paymentPromptPayId: profile.promptPayId ?? "",
    paymentBankName: profile.bankName ?? "",
    paymentBankAccountNumber: profile.bankAccountNumber ?? "",
    paymentBankAccountName: profile.bankAccountName ?? "",
  };
}

export function toContactProfileUpdate(d: PropertyDraft): UpdateProfileRequest {
  return {
    phoneCountryCode: d.contactPhoneCountryCode,
    phone: d.contactPhone.trim() || undefined,
    contactChannels: d.contactChannels.length > 0 ? d.contactChannels : null,
    lineHandle: d.contactChannels.includes("Line") ? (d.contactLineHandle.trim() || null) : null,
  };
}

export function toPaymentProfileUpdate(d: PropertyDraft): UpdateProfileRequest {
  return {
    promptPayId: d.paymentPromptPayId.trim() || undefined,
    bankName: d.paymentBankName.trim() || undefined,
    bankAccountNumber: d.paymentBankAccountNumber.trim() || undefined,
    bankAccountName: d.paymentBankAccountName.trim() || undefined,
  };
}

// Profile-level completeness checks. These drive section visibility AND the
// required-for-save gate in create mode.
export function isContactComplete(profile: UserProfileDto | undefined): boolean {
  if (!profile) return false;
  return !!profile.phone && (profile.contactChannels?.length ?? 0) > 0;
}

export function isPaymentComplete(profile: UserProfileDto | undefined): boolean {
  if (!profile) return false;
  return !!profile.promptPayId || (!!profile.bankName && !!profile.bankAccountNumber && !!profile.bankAccountName);
}

export function toUpdateListingRequest(d: PropertyDraft): UpdateListingRequest {
  return {
    title: d.title.trim(),
    description: d.description,
    houseRules: d.houseRules,
    wifiName: d.wifiName,
    wifiPassword: d.wifiPassword,
    baseMonthlyRate: d.baseMonthlyRate,
    depositAmount: d.depositAmount,
    checkInMethod: d.checkInMethod || null,
    checkInInstructions: d.checkInInstructions || null,
    utilityElectricity: d.utilityElectricity,
    utilityWater: d.utilityWater,
    utilityInternet: d.utilityInternet,
    utilityAircon: d.utilityAircon,
    utilityGarbage: d.utilityGarbage,
    petsAllowed: d.petsAllowed,
    petDeposit: d.petDeposit || undefined,
    cancellationNoticeDays: d.cancellationNoticeDays,
    cancellationPenaltyMonths: d.cancellationPenaltyMonths,
  };
}
