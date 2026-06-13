import { useState, useEffect, useRef } from "react";
import { useParams, useNavigate, Link } from "react-router-dom";
import { ArrowLeft, FileText, PenLine, CheckCircle2, AlertCircle, Shield, Camera, XCircle } from "lucide-react";
import { toast } from "sonner";
import { openAuthPdf } from "@/lib/utils/open-auth-pdf";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { VisaType } from "@/lib/types/enums";
import { VISA_LABELS } from "@/lib/utils/visa-labels";
import { SignatureCanvas } from "@/components/shared/signature-canvas";
import { PassportPageGuide } from "@/components/shared/passport-page-guide";
import { CoResidentsCard } from "@/components/shared/co-residents-card";
import { ProfileNameReadonly } from "@/components/shared/profile-name-readonly";
import { joinName } from "@/lib/utils/name";
import { DatePicker } from "@/components/ui/date-picker";

// UX-321: real calendar pickers (not free-form dd/mm/yyyy) with sane bounds.
// BUG-345: the tenant must be ≥18 (BE rejects younger with a 400 the user
// couldn't previously see). Disable any DOB more recent than 18 years ago so the
// invalid value can't be picked in the first place; inline error covers the rest.
const eighteenYearsAgo = () => {
  const t = new Date();
  t.setHours(0, 0, 0, 0);
  t.setFullYear(t.getFullYear() - 18);
  return t;
};
const DOB_UNDER_18 = (d: Date) => d > eighteenYearsAgo();
// UX-342: open the DOB year-grid on the 1990s, not the current decade.
const DOB_ANCHOR = new Date(1995, 0, 1);
const EXPIRY_NOT_PAST = (d: Date) => {
  const t = new Date();
  t.setHours(0, 0, 0, 0);
  return d < t;
};
import { NationalityInput } from "@/components/ui/nationality-input";
import { useBookingContract, useTenantSignContract, useBookingGuests, useUpdatePassport, useBookingInvoices, useBooking } from "@/lib/hooks/use-bookings";
import { useAsset } from "@/lib/hooks/use-assets";
import { useMyProfile } from "@/lib/hooks/use-profile";
import { bookingsApi } from "@/lib/api/bookings.api";
import { contractSigningDeadline } from "@/lib/types";
import { CountdownPill } from "@/components/shared/countdown-pill";
import { formatDate, formatThb } from "@/lib/utils/format";
import { cn } from "@/lib/utils/cn";

export function GuestContractSignPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();

  const { data: contract, isLoading, error } = useBookingContract(id!);
  const signContract = useTenantSignContract(id!);
  const { data: guests } = useBookingGuests(id!);
  const updatePassport = useUpdatePassport(id!);
  const { data: profile } = useMyProfile();
  // The ContractDto only carries the security deposit, but the tenant is also
  // charged a pet deposit when they booked "with pets". It lives as a
  // PetDeposit invoice (same source the booking detail sidebar uses), so pull
  // it in and show it in the summary — otherwise the deposit they sign for here
  // looks smaller than what they'll actually pay.
  const { data: invoices } = useBookingInvoices(id!);
  const petDepositTotal = (invoices ?? [])
    .filter((inv) => inv.type === "PetDeposit")
    .reduce((sum, inv) => sum + (inv.amount ?? 0), 0);
  // Co-residents (everyone on the booking except the main tenant). When the
  // tenant booked "with others" these are materialised as guests, so this is a
  // reliable signal to surface the co-residents roster on the signing page.
  const hasCoResidents = (guests ?? []).some((g) => !g.isMainTenant);
  // Occupancy cap for the co-residents roster — the host's max guests, read off
  // the asset (booking -> asset). Lets the card hide "Add co-resident" once the
  // unit is full (tenant + co-residents reach maxOccupancy).
  const { data: booking } = useBooking(id!);
  const { data: asset } = useAsset(booking?.assetId ?? "");
  const maxOccupancy = asset?.maxOccupancy;

  // Name comes from the profile (single source of truth), read-only here.
  const nameFirst = profile?.firstName ?? "";
  const nameLast = profile?.lastName ?? "";

  // Passport data (name excluded — it's the profile name above)
  const [passportNumber, setPassportNumber] = useState("");
  const [passportNationality, setPassportNationality] = useState("");
  const [passportDob, setPassportDob] = useState("");
  const [passportExpiry, setPassportExpiry] = useState("");
  const [passportVisaType, setPassportVisaType] = useState("");
  // BUG-345: field-level errors from the BE (e.g. dateOfBirth "must be ≥18"),
  // rendered inline under the offending input instead of only as a banner.
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  // UX-321: signal that the identity fields below were auto-filled from the
  // user's profile (not asked again from scratch). Fields stay editable.
  const [prefilledFromProfile, setPrefilledFromProfile] = useState(false);

  // UX-101 / BUG-272: pre-populate passport fields from user profile once loaded.
  // Only applied once so subsequent manual edits are not overwritten. Empty
  // values in profile still write through "" so the input renders empty rather
  // than uncontrolled — keeps the form deterministic.
  const profileApplied = useRef(false);
  useEffect(() => {
    if (!profile || profileApplied.current) return;
    profileApplied.current = true;
    // UX-321: did the profile actually carry any identity data we can reuse?
    // If so, show the "pre-filled from your profile" hint so the user knows
    // they aren't being asked to re-enter — they just verify/edit.
    const anyPrefilled = !!(
      profile.firstName || profile.lastName || profile.nationality ||
      profile.dateOfBirth || profile.passportNumber || profile.passportExpiry
    );
    /* eslint-disable react-hooks/set-state-in-effect */
    setPrefilledFromProfile(anyPrefilled);
    setPassportNationality(profile.nationality ?? "");
    setPassportDob(profile.dateOfBirth ?? "");
    setPassportNumber(profile.passportNumber ?? "");
    setPassportExpiry(profile.passportExpiry ?? "");
    if (profile.visaType) setPassportVisaType(profile.visaType);
    /* eslint-enable react-hooks/set-state-in-effect */
  }, [profile]);

  // BUG-363: visa type (and a few other identity fields) is captured at booking
  // time and stored on the booking-guest record, NOT the user profile — so the
  // profile pre-fill above leaves "Visa type" empty even though the tenant
  // already entered it. Backfill from the main guest record for any field the
  // profile didn't already provide, so identity is pre-filled from a single
  // effective source (profile first, booking-guest as fallback).
  const guestApplied = useRef(false);
  useEffect(() => {
    if (!guests || guestApplied.current) return;
    // Resolve the tenant's own guest record robustly: the `isMainTenant` flag
    // isn't always set on a self-booked reservation, which previously left
    // `main` undefined and the visa backfill silently skipped (BUG-363 — visa
    // lives only on the booking-guest, not the profile, so it stayed empty).
    // Fall back to the record owned by the signed-in user, then to the sole
    // guest when there's only one.
    const main =
      guests.find((g) => g.isMainTenant) ??
      (profile ? guests.find((g) => g.userId && g.userId === profile.id) : undefined) ??
      (guests.length === 1 ? guests[0] : undefined);
    if (!main) return;
    guestApplied.current = true;
    /* eslint-disable react-hooks/set-state-in-effect */
    setPassportNationality((v) => v || (main.nationality ?? ""));
    setPassportDob((v) => v || (main.dateOfBirth ?? ""));
    setPassportNumber((v) => v || (main.passportNumber ?? ""));
    setPassportExpiry((v) => v || (main.passportExpiry ?? ""));
    setPassportVisaType((v) => v || (main.visaType ?? ""));
    /* eslint-enable react-hooks/set-state-in-effect */
  }, [guests, profile]);

  const [passportPhotos, setPassportPhotos] = useState<File[]>([]);

  const [agreedTerms, setAgreedTerms] = useState(false);
  const [agreedEta, setAgreedEta] = useState(false);
  const [agreedPdpa, setAgreedPdpa] = useState(false);
  const [agreedPenalty, setAgreedPenalty] = useState(false);
  const [signatureFile, setSignatureFile] = useState<File | null>(null);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // UX-273: Entry date / Entry port are TM-30 fields, NOT contract fields —
  // exclude them from the contract completeness check. They're collected
  // separately during TM-30 filing (and remain on the user profile for reuse).
  const passportComplete =
    nameFirst.trim().length > 0 &&
    nameLast.trim().length > 0 &&
    passportNumber.trim().length > 0 &&
    passportNationality.trim().length > 0 &&
    passportDob.trim().length > 0 &&
    passportExpiry.trim().length > 0;

  const canSubmit =
    passportComplete &&
    passportPhotos.length > 0 &&
    agreedTerms && agreedEta && agreedPdpa && agreedPenalty &&
    !isSubmitting;

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!canSubmit) return;
    setSubmitError(null);
    setFieldErrors({});
    setIsSubmitting(true);
    try {
      // 1. Save passport data to the main tenant guest record
      const mainGuest = (guests ?? []).find((g) => g.isMainTenant);
      if (mainGuest) {
        await updatePassport.mutateAsync({
          guestId: mainGuest.id,
          data: {
            firstName: nameFirst.trim(),
            lastName: nameLast.trim(),
            passportNumber: passportNumber.trim(),
            nationality: passportNationality.trim(),
            dateOfBirth: passportDob,
            passportExpiry: passportExpiry,
            visaType: passportVisaType as VisaType || undefined,
            // BE-ENTRY: entry date / port removed — not used downstream.
          },
        });
        if (passportPhotos.length > 0) {
          await bookingsApi.uploadPassportPhotos(id!, mainGuest.id, passportPhotos);
        }
      }

      // 2. Sign the contract
      await signContract.mutateAsync({
        typedName: joinName(nameFirst, nameLast),
        signatureImage: signatureFile ?? undefined,
      });
      toast.success("Agreement signed!");
      navigate(`/me/guest/bookings/${id}`);
    } catch (err: unknown) {
      const status = (err as { response?: { status?: number } } | null)?.response?.status;
      const data = (err as { response?: { data?: { message?: string; title?: string; errors?: Record<string, string[] | string> } } })?.response?.data;
      // BUG-345: surface field-level validation errors (e.g. dateOfBirth
      // "must be at least 18 years old") inline under each input. BE returns
      // camelCase keys in `errors`; flatten arrays to the first message.
      const errs = data?.errors;
      if (errs && typeof errs === "object") {
        const flat: Record<string, string> = {};
        for (const [k, v] of Object.entries(errs)) {
          const key = k.charAt(0).toLowerCase() + k.slice(1);
          flat[key] = Array.isArray(v) ? v[0] : String(v);
        }
        setFieldErrors(flat);
      }
      // 409/422 here almost always means the signing deadline passed between
      // the form mount and submit — the contract was voided server-side.
      // Tell the tenant exactly that instead of a generic failure.
      const isExpired = status === 409 || status === 410 || status === 422;
      const msg = isExpired
        ? "The signing window closed while you were filling this in. This booking is cancelled and any payment will be refunded — you'll need a new booking to proceed."
        : errs && typeof errs === "object" && Object.keys(errs).length > 0
          ? "Please correct the highlighted fields and try again."
          : data?.message ?? data?.title ?? "Failed to sign agreement. Please try again.";
      setSubmitError(msg);
    } finally {
      setIsSubmitting(false);
    }
  }

  if (isLoading) {
    return (
      <div className="max-w-2xl mx-auto px-4 py-6 space-y-4">
        <Skeleton className="h-6 w-32" />
        <Skeleton className="h-48 rounded-2xl" />
        <Skeleton className="h-64 rounded-2xl" />
      </div>
    );
  }

  if (error || !contract) {
    const status = (error as { response?: { status?: number } } | null)?.response?.status;
    const isMissing = status === 404;
    return (
      <div className="max-w-2xl mx-auto px-4 py-6">
        <Link
          to={`/me/guest/bookings/${id}`}
          className="inline-flex items-center gap-1.5 text-sm text-fg-muted hover:text-fg transition-colors mb-6"
        >
          <ArrowLeft size={16} />Back
        </Link>
        <div className="bg-warning/10 border border-warning/20 rounded-2xl p-5 flex items-start gap-3">
          <AlertCircle size={18} className="text-warning shrink-0 mt-0.5" />
          <div>
            <p className="text-sm font-semibold text-fg">Contract not available</p>
            <p className="text-xs text-fg-muted mt-1">
              {isMissing
                ? "Your rental agreement isn't ready yet. Your host is preparing it — please check back shortly."
                : "We couldn't load your agreement. Check your connection and try again."}
            </p>
          </div>
        </div>
      </div>
    );
  }

  if (contract.status === "Voided") {
    return (
      <div className="max-w-2xl mx-auto px-4 py-6">
        <Link
          to={`/me/guest/bookings/${id}`}
          className="inline-flex items-center gap-1.5 text-sm text-fg-muted hover:text-fg transition-colors mb-6"
        >
          <ArrowLeft size={16} />Back to booking
        </Link>
        <div className="bg-danger/10 border border-danger/20 rounded-2xl p-5 space-y-3">
          <div className="flex items-start gap-3">
            <XCircle size={18} className="text-danger shrink-0 mt-0.5" />
            <div>
              <p className="text-sm font-semibold text-fg">This agreement was voided</p>
              <p className="text-xs text-fg-muted mt-1 leading-relaxed">
                The signing window closed before both parties signed, so the contract was cancelled.
                Any payments you made will be refunded — no action needed from you.
              </p>
            </div>
          </div>
          <Button
            asChild
            variant="outline"
            className="w-full rounded-xl h-9 text-sm font-medium"
          >
            <Link to="/listings">Browse other properties</Link>
          </Button>
        </div>
      </div>
    );
  }

  const alreadySigned =
    contract.status === "PendingLandlordSignature" || contract.status === "FullySigned";

  return (
    <div className="max-w-2xl mx-auto px-4 py-6 space-y-5 pb-12">
      {/* Back */}
      <Link
        to={`/me/guest/bookings/${id}`}
        className="inline-flex items-center gap-1.5 text-sm text-fg-muted hover:text-fg transition-colors"
      >
        <ArrowLeft size={16} />Back to booking
      </Link>

      {/* Title */}
      <div>
        <div className="flex flex-wrap items-start justify-between gap-2">
          <h1 className="text-xl font-semibold text-fg">Sign your rental agreement</h1>
          {!alreadySigned && (
            <CountdownPill
              deadline={contractSigningDeadline(contract)}
              prefix="Expires in"
              expiredLabel="Expired — booking cancelled"
            />
          )}
        </div>
        <p className="text-sm text-fg-muted mt-1">
          Review the key terms below and sign electronically.
          {!alreadySigned && " Your form data isn't saved server-side until you submit, so finish in one go."}
        </p>
      </div>

      {/* Already signed notice */}
      {alreadySigned && (
        <div className="bg-success/10 border border-success/20 rounded-2xl p-4 flex items-start gap-3">
          <CheckCircle2 size={18} className="text-success shrink-0 mt-0.5" />
          <div>
            <p className="text-sm font-semibold text-success">You've already signed this agreement</p>
            {contract.tenantSignedAt && (
              <p className="text-xs text-fg-muted mt-0.5">Signed on {formatDate(contract.tenantSignedAt)}</p>
            )}
          </div>
        </div>
      )}

      {/* Contract preview card */}
      <div className="bg-bg-card rounded-2xl shadow-card overflow-hidden">
        <div className="px-5 pt-4 pb-3 border-b border-border flex items-center gap-2">
          <FileText size={15} className="text-fg-muted" />
          <h2 className="text-sm font-semibold text-fg">Rental agreement summary</h2>
        </div>

        {/* View PDF button */}
        {contract.draftPdfUrl && (
          <div className="px-5 py-3 border-b border-border">
            <button
              type="button"
              onClick={() => openAuthPdf(contract.draftPdfUrl!).catch(() => toast.error("Couldn't open PDF"))}
              className="inline-flex items-center gap-2 text-sm font-semibold text-brand hover:underline"
            >
              <FileText size={14} />View contract (PDF)
            </button>
            <p className="text-xs text-fg-muted mt-1">Review the full agreement before signing.</p>
          </div>
        )}

        {/* Key terms */}
        <div className="divide-y divide-border">
          <div className="flex justify-between px-5 py-3 text-sm">
            <span className="text-fg-muted">Property</span>
            <span className="font-medium text-fg text-right max-w-[60%] leading-snug">{contract.propertyAddress}</span>
          </div>
          <div className="flex justify-between px-5 py-3 text-sm">
            <span className="text-fg-muted">Start date</span>
            <span className="font-medium text-fg">{formatDate(contract.startDate)}</span>
          </div>
          <div className="flex justify-between px-5 py-3 text-sm">
            <span className="text-fg-muted">End date</span>
            <span className="font-medium text-fg">{formatDate(contract.endDate)}</span>
          </div>
          <div className="flex justify-between px-5 py-3 text-sm">
            <span className="text-fg-muted">Duration</span>
            <span className="font-medium text-fg">{contract.durationMonths} month{contract.durationMonths !== 1 ? "s" : ""}</span>
          </div>
          <div className="flex justify-between px-5 py-3 text-sm">
            <span className="text-fg-muted">Monthly rent</span>
            <span className="font-semibold text-fg">{formatThb(contract.monthlyRate)}</span>
          </div>
          <div className="flex justify-between px-5 py-3 text-sm">
            <span className="text-fg-muted">Security deposit</span>
            <span className="font-medium text-fg">{formatThb(contract.depositAmount)}</span>
          </div>
          {petDepositTotal > 0 && (
            <div className="flex justify-between px-5 py-3 text-sm">
              <span className="text-fg-muted">Pet deposit</span>
              <span className="font-medium text-fg">{formatThb(petDepositTotal)}</span>
            </div>
          )}
        </div>
      </div>

      {/* Signing form */}
      {!alreadySigned && (
        <form onSubmit={handleSubmit} className="space-y-5">

        {/* ── Passport / identity data ── */}
        <div className="bg-bg-card rounded-2xl shadow-card overflow-hidden">
          <div className="px-5 pt-4 pb-3 border-b border-border flex items-center gap-2">
            <Shield size={15} className="text-fg-muted" />
            <h2 className="text-sm font-semibold text-fg">Your identity details</h2>
            <span className="ml-auto text-xs text-danger font-medium">Required to sign</span>
          </div>
          {/* The name is read-only (from the profile) with its own
              "update your profile" note; the passport fields below are
              editable inline and pre-filled from the profile — so no separate
              "your profile is incomplete" banner is needed here. */}
          <div className="p-5 space-y-4">
            <p className="text-xs text-fg-muted leading-relaxed">
              Required for TM-30 immigration reporting. Stored encrypted and shared only with your landlord.
            </p>
            {/* UX-321: reassure that these aren't being asked from scratch —
                they're carried over from the profile and just need a glance. */}
            {prefilledFromProfile && (
              <div className="flex items-center gap-2 text-xs text-brand bg-brand/5 border border-brand/15 rounded-lg px-3 py-2">
                <CheckCircle2 size={13} className="shrink-0" />
                <p>Pre-filled from your profile — edit if anything's changed.</p>
              </div>
            )}
            <ProfileNameReadonly firstName={nameFirst} lastName={nameLast} label="Name" />
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label className="text-xs text-fg-muted">Nationality <span className="text-danger">*</span></Label>
                <NationalityInput value={passportNationality} onChange={setPassportNationality} />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs text-fg-muted">Date of birth <span className="text-danger">*</span></Label>
                <DatePicker value={passportDob} onChange={(v) => { setPassportDob(v); setFieldErrors((e) => ({ ...e, dateOfBirth: "" })); }} placeholder="Select date of birth" isDisabled={DOB_UNDER_18} startView="year" yearAnchor={DOB_ANCHOR} />
                {fieldErrors.dateOfBirth && (
                  <p className="text-xs text-danger">{fieldErrors.dateOfBirth}</p>
                )}
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label className="text-xs text-fg-muted">Passport number <span className="text-danger">*</span></Label>
                <Input value={passportNumber} onChange={(e) => setPassportNumber(e.target.value)} placeholder="e.g. 7123456789" className="font-mono" />
                {fieldErrors.passportNumber && <p className="text-xs text-danger">{fieldErrors.passportNumber}</p>}
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs text-fg-muted">Passport expiry <span className="text-danger">*</span></Label>
                <DatePicker value={passportExpiry} onChange={setPassportExpiry} placeholder="Select expiry date" isDisabled={EXPIRY_NOT_PAST} startView="year" />
                {fieldErrors.passportExpiry && <p className="text-xs text-danger">{fieldErrors.passportExpiry}</p>}
              </div>
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs text-fg-muted">Visa type</Label>
              <Select value={passportVisaType} onValueChange={setPassportVisaType}>
                <SelectTrigger><SelectValue placeholder="Select visa type…" /></SelectTrigger>
                <SelectContent>
                  {Object.entries(VISA_LABELS).map(([val, label]) => (
                    <SelectItem key={val} value={val}>{label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            {/* UX-273: Entry date / Entry port live in TM-30 flow, not in the contract.
                They're collected separately when filing TM-30 (and persist on profile). */}

            {/* Passport photo guide + upload */}
            <PassportPageGuide />
            <div className="space-y-1.5">
              <Label className="text-xs text-fg-muted">Upload passport pages (up to 3 photos) <span className="text-danger">*</span></Label>
              <label className={cn(
                "flex items-center gap-3 border-2 border-dashed rounded-xl px-4 py-3 cursor-pointer transition-colors",
                passportPhotos.length > 0 ? "border-success bg-success/5" : "border-border hover:border-brand hover:bg-brand/5"
              )}>
                <Camera size={16} className={passportPhotos.length > 0 ? "text-success" : "text-fg-muted"} />
                <div className="flex-1 min-w-0">
                  {passportPhotos.length > 0 ? (
                    <p className="text-sm font-medium text-success">{passportPhotos.length} photo{passportPhotos.length > 1 ? "s" : ""} selected</p>
                  ) : (
                    <p className="text-sm text-fg-muted">Select multiple files at once</p>
                  )}
                  <p className="text-xs text-fg-muted mt-0.5">Smartphone quality is fine</p>
                </div>
                <input
                  type="file"
                  accept="image/*"
                  multiple
                  className="hidden"
                  onChange={(e) => setPassportPhotos(Array.from(e.target.files ?? []))}
                />
              </label>
            </div>
          </div>
        </div>

        {/* Co-residents — surfaced here so the tenant can add/complete every
            occupant's details (required for the contract + TM-30) without
            leaving the signing page. Only shown when the booking actually has
            co-residents. */}
        {hasCoResidents && (
          <CoResidentsCard bookingId={id!} guests={guests} maxOccupancy={maxOccupancy} />
        )}

        <div className="bg-bg-card rounded-2xl shadow-card overflow-hidden">
          <div className="px-5 pt-4 pb-3 border-b border-border flex items-center gap-2">
            <PenLine size={15} className="text-fg-muted" />
            <h2 className="text-sm font-semibold text-fg">Sign agreement</h2>
          </div>

          <div className="p-5 space-y-5">
            {/* ── Legal checkboxes ── */}
            <div className="space-y-4">

              {/* 1 — Agree to terms */}
              <div className="flex items-start gap-3">
                <Checkbox
                  id="agreedTerms"
                  checked={agreedTerms}
                  onCheckedChange={(v) => setAgreedTerms(!!v)}
                  className="mt-0.5 shrink-0"
                />
                <Label htmlFor="agreedTerms" className="text-sm text-fg leading-snug cursor-pointer">
                  I have read the full{" "}
                  <a href="/legal/rental-terms" target="_blank" rel="noopener noreferrer" className="text-brand underline underline-offset-2 hover:opacity-80">
                    Rental Agreement
                  </a>{" "}
                  and agree to all its terms and conditions. <span className="text-danger">*</span>
                </Label>
              </div>

              {/* 2 — Electronic signature / ETA */}
              <div className="flex items-start gap-3">
                <Checkbox
                  id="agreedEta"
                  checked={agreedEta}
                  onCheckedChange={(v) => setAgreedEta(!!v)}
                  className="mt-0.5 shrink-0"
                />
                <Label htmlFor="agreedEta" className="text-sm text-fg leading-snug cursor-pointer">
                  I understand that by typing my full name below, I am providing an{" "}
                  <a href="/legal/e-signature" target="_blank" rel="noopener noreferrer" className="text-brand underline underline-offset-2 hover:opacity-80">
                    electronic signature
                  </a>{" "}
                  that is legally binding under Thailand's Electronic Transactions Act B.E. 2544 (2001). <span className="text-danger">*</span>
                </Label>
              </div>

              {/* 3 — PDPA consent */}
              <div className="flex items-start gap-3">
                <Checkbox
                  id="agreedPdpa"
                  checked={agreedPdpa}
                  onCheckedChange={(v) => setAgreedPdpa(!!v)}
                  className="mt-0.5 shrink-0"
                />
                <Label htmlFor="agreedPdpa" className="text-sm text-fg leading-snug cursor-pointer">
                  I consent to the collection and secure storage of my personal data, including passport details, for the purposes of this tenancy and mandatory TM-30 immigration reporting, in accordance with Thailand's{" "}
                  <a href="/legal/privacy" target="_blank" rel="noopener noreferrer" className="text-brand underline underline-offset-2 hover:opacity-80">
                    Personal Data Protection Act (PDPA) B.E. 2562
                  </a>. <span className="text-danger">*</span>
                </Label>
              </div>

              {/* 4 — Early exit penalty */}
              <div className="flex items-start gap-3">
                <Checkbox
                  id="agreedPenalty"
                  checked={agreedPenalty}
                  onCheckedChange={(v) => setAgreedPenalty(!!v)}
                  className="mt-0.5 shrink-0"
                />
                <Label htmlFor="agreedPenalty" className="text-sm text-fg leading-snug cursor-pointer">
                  I acknowledge that early termination of this lease before{" "}
                  <span className="font-semibold">{contract?.endDate ? formatDate(contract.endDate) : "the end date"}</span>{" "}
                  is subject to a penalty of one (1) month's rent, as set out in the{" "}
                  <a href="/legal/early-exit" target="_blank" rel="noopener noreferrer" className="text-brand underline underline-offset-2 hover:opacity-80">
                    early termination clause
                  </a>. <span className="text-danger">*</span>
                </Label>
              </div>

            </div>

            {/* Typed name — electronic signature, taken from the profile name */}
            <ProfileNameReadonly firstName={nameFirst} lastName={nameLast} label="Full name (as electronic signature)" />

            {/* Signature canvas */}
            <div className="space-y-1.5">
              <Label className="text-sm font-medium text-fg">
                Draw your signature <span className="text-fg-muted font-normal">(optional)</span>
              </Label>
              <SignatureCanvas onChange={setSignatureFile} />
            </div>

            {/* Error message */}
            {submitError && (
              <div className={cn(
                "flex items-start gap-2 rounded-xl px-4 py-3",
                "bg-danger/10 border border-danger/20",
              )}>
                <AlertCircle size={15} className="text-danger shrink-0 mt-0.5" />
                <p className="text-sm text-danger">{submitError}</p>
              </div>
            )}

            {/* Security note */}
            <div className="flex items-start gap-2 text-xs text-fg-muted bg-bg-subtle rounded-xl px-3 py-2.5">
              <Shield size={13} className="shrink-0 mt-0.5" />
              <p>Your full name, IP address, and timestamp are cryptographically recorded at the moment of signing. All fields marked <span className="text-danger">*</span> are required.</p>
            </div>

            {/* Submit */}
            <Button
              type="submit"
              disabled={!canSubmit}
              className="w-full bg-brand hover:bg-[rgb(var(--color-primary-hover))] text-white rounded-xl h-11 text-sm font-semibold disabled:opacity-50"
            >
              {isSubmitting ? "Saving…" : "Sign agreement"}
            </Button>
          </div>
        </div>
        </form>
      )}
    </div>
  );
}
