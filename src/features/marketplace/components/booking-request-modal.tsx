import { useState, useRef, useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";
import { format, parseISO, addMonths } from "date-fns";
import { X, CheckCircle2, Zap, ArrowLeft, Eye, EyeOff, ExternalLink, Camera, Shield } from "lucide-react";
import { toast } from "sonner";
import { useQuery } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { NationalityInput } from "@/components/ui/nationality-input";
import { DatePicker } from "@/components/ui/date-picker";
import { formatThb } from "@/lib/utils/format";
import { useSubmitBookingRequest } from "@/lib/hooks/use-marketplace";
import { useUpdateProfile } from "@/lib/hooks/use-profile";
import { useAuthStore } from "@/lib/stores/auth.store";
import { authApi } from "@/lib/api/auth.api";
import { profileApi } from "@/lib/api/profile.api";
import { bookingRequestsApi } from "@/lib/api/booking-requests.api";
import { PasswordHints, passwordValid } from "@/components/shared/password-hints";
import { PetsSelector, EMPTY_PETS, petSummary as _petSummary, totalPets, type PetCounts } from "@/components/shared/pets-selector";
import { cn } from "@/lib/utils/cn";
import { VisaType } from "@/lib/types/enums";
import { VISA_LABELS } from "@/lib/utils/visa-labels";
import type { DiscountTier, BookingRequestResult, AdditionalResidentInput } from "@/lib/types/marketplace";

// ─── Pet photo upload ─────────────────────────────────────────────────────────

type PetKey = "cats" | "dogs" | "other";
type PetPhotoMap = Record<PetKey, File[]>;
const EMPTY_PHOTOS: PetPhotoMap = { cats: [], dogs: [], other: [] };

const PET_TYPE_META: { key: PetKey; emoji: string; singular: string; plural: string }[] = [
  { key: "cats",  emoji: "🐱", singular: "cat",       plural: "cats"       },
  { key: "dogs",  emoji: "🐶", singular: "dog",       plural: "dogs"       },
  { key: "other", emoji: "🐾", singular: "other pet", plural: "other pets" },
];

function PetPhotoUpload({
  pets,
  photos,
  onChange,
  showErrors,
}: {
  pets: PetCounts;
  photos: PetPhotoMap;
  onChange: (p: PetPhotoMap) => void;
  showErrors: boolean;
}) {
  const inputRefs = useRef<Partial<Record<PetKey, HTMLInputElement>>>({});
  const active = PET_TYPE_META.filter((t) => pets[t.key] > 0);
  if (!active.length) return null;

  function addFiles(key: PetKey, files: FileList | null) {
    if (!files) return;
    const valid = Array.from(files).filter((f) => f.type.startsWith("image/"));
    onChange({ ...photos, [key]: [...photos[key], ...valid].slice(0, 6) });
  }

  function remove(key: PetKey, idx: number) {
    onChange({ ...photos, [key]: photos[key].filter((_, i) => i !== idx) });
  }

  return (
    <div className="rounded-xl border-2 border-border overflow-hidden">
      {/* Header */}
      <div className="px-4 py-3 bg-bg-subtle border-b border-border flex items-center gap-2">
        <Camera size={14} className="text-fg-muted shrink-0" />
        <p className="text-sm font-medium text-fg">
          Pet photos <span className="text-danger">*</span>
        </p>
        <span className="text-xs text-fg-muted ml-auto">1 photo minimum per type</span>
      </div>

      <div className="divide-y divide-border">
        {active.map(({ key, emoji, singular, plural }) => {
          const count = pets[key];
          const label = count === 1 ? `1 ${singular}` : `${count} ${plural}`;
          const missing = showErrors && photos[key].length === 0;

          return (
            <div key={key} className={cn("px-4 py-4", missing && "bg-danger/3")}>
              <p className={cn("text-xs font-semibold mb-2.5 flex items-center gap-1.5", missing ? "text-danger" : "text-fg-muted")}>
                <span>{emoji}</span>
                {label}
                {missing && <span className="ml-auto normal-case font-normal">Add at least 1 photo</span>}
              </p>

              <div className="flex flex-wrap gap-2">
                {/* Previews */}
                {photos[key].map((file, idx) => (
                  <div key={idx} className="relative w-[72px] h-[72px] rounded-xl overflow-hidden bg-bg-subtle shrink-0 group">
                    <img
                      src={URL.createObjectURL(file)}
                      alt=""
                      className="w-full h-full object-cover"
                    />
                    <button
                      type="button"
                      onClick={() => remove(key, idx)}
                      className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center"
                    >
                      <X size={14} className="text-white" />
                    </button>
                  </div>
                ))}

                {/* Upload slot */}
                {photos[key].length < 6 && (
                  <button
                    type="button"
                    onClick={() => inputRefs.current[key]?.click()}
                    className={cn(
                      "w-[72px] h-[72px] rounded-xl border-2 border-dashed flex flex-col items-center justify-center transition-colors shrink-0 gap-1",
                      missing
                        ? "border-danger text-danger hover:bg-danger/5"
                        : "border-border text-fg-muted hover:border-brand hover:text-brand hover:bg-brand/5",
                    )}
                  >
                    <Camera size={16} />
                    <span className="text-[10px] font-medium">Add</span>
                    <input
                      ref={(el) => { if (el) inputRefs.current[key] = el; }}
                      type="file"
                      accept="image/*"
                      multiple
                      className="hidden"
                      onChange={(e) => addFiles(key, e.target.files)}
                    />
                  </button>
                )}
              </div>
            </div>
          );
        })}
      </div>

      <div className="px-4 py-2.5 bg-bg-subtle border-t border-border">
        <p className="text-[11px] text-fg-muted">
          Photos are stored on your device and will be shared with the host upon request.
        </p>
      </div>
    </div>
  );
}

function effectiveRate(base: number, months: number, tiers: DiscountTier[]): number {
  const sorted = [...tiers].sort((a, b) => b.minMonths - a.minMonths);
  const tier = sorted.find((t) => months >= t.minMonths);
  return tier ? Math.round(base * (1 - tier.discountPercent / 100)) : base;
}

interface Props {
  listingId: string;
  listingTitle: string;
  moveInDate: string;
  durationMonths: number;
  monthlyRate: number;
  /** Actual security deposit (BE-16 fix: was wrongly displayed as monthlyRate). */
  depositAmount?: number;
  discountTiers: DiscountTier[];
  petsAllowed?: boolean;
  petDeposit?: number;
  /** UX-268: hard ceiling so the form can warn before submit (BE also enforces). */
  maxOccupancy?: number;
  onClose: () => void;
}

// UX-268: blank co-resident row used when host adds a new entry.
// BUG-325: no `relationship` — it isn't relevant to the lease / TM-30.
const EMPTY_RESIDENT: AdditionalResidentInput = {
  firstName: "",
  lastName: "",
  dateOfBirth: "",
};

// BUG-325: DOB can't be in the future.
const DOB_NOT_FUTURE = (d: Date) => d > new Date();
// UX-342: open DOB year-grid on plausible birth years (1990s) instead of the
// current decade, so the user doesn't have to page back ~3 decades.
const DOB_ANCHOR = new Date(1995, 0, 1);

type Step = "form" | "auth" | "passport" | "success";
type AuthMode = "register" | "login";

export function BookingRequestModal({
  listingId,
  listingTitle,
  moveInDate,
  durationMonths,
  monthlyRate,
  depositAmount,
  discountTiers,
  petsAllowed,
  petDeposit,
  maxOccupancy,
  onClose,
}: Props) {
  const submit = useSubmitBookingRequest();
  const updateProfile = useUpdateProfile();
  const { token, setToken } = useAuthStore();
  const navigate = useNavigate();

  const { data: profile } = useQuery({
    queryKey: ["profile"],
    queryFn: profileApi.get,
    enabled: !!token,
    staleTime: 60_000,
  });

  // Form fields — UX-328: collect First/Last separately so they map cleanly
  // onto the profile (firstName/lastName) and the register payload, instead of
  // the old single "Full name" we had to split on whitespace.
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  // BUG-329: set when register succeeded but the booking-request failed, so we
  // can tell the (now signed-in) user their account exists and they only need
  // to fix the request + retry — not register again.
  const [postRegisterError, setPostRegisterError] = useState<string | null>(null);
  const [message, setMessage] = useState("");
  const [pets, setPets] = useState<PetCounts>(EMPTY_PETS);
  const [petPhotos, setPetPhotos] = useState<PetPhotoMap>(EMPTY_PHOTOS);
  const [petsExplicit, setPetsExplicit] = useState<boolean | null>(null); // null = not answered
  // UX-268: who else will live in the unit? Collected up-front so the host
  // sees the count before they approve.
  const [othersExplicit, setOthersExplicit] = useState<boolean | null>(null);
  const [residents, setResidents] = useState<AdditionalResidentInput[]>([]);
  const [triedSubmit, setTriedSubmit] = useState(false);

  // Multi-step state
  const [step, setStep] = useState<Step>("form");
  const [authMode, setAuthMode] = useState<AuthMode>("register");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [passwordBlurred, setPasswordBlurred] = useState(false);
  const [authLoading, setAuthLoading] = useState(false);
  const [authError, setAuthError] = useState("");
  const [bookingResult, setBookingResult] = useState<BookingRequestResult | null>(null);

  // Passport step state
  const [pNationality, setPNationality] = useState("");
  const [pPassportNumber, setPPassportNumber] = useState("");
  const [pPassportExpiry, setPPassportExpiry] = useState("");
  const [pVisaType, setPVisaType] = useState<VisaType | "">("");
  const [passportSaving, setPassportSaving] = useState(false);
  // BUG-366: the identity ("Your details") step had NO inline validation — a
  // missing/invalid field just silently disabled the CTA (whose text even lied
  // "Fill all fields" when every field WAS filled but, e.g., the passport had
  // expired). Surface per-field errors after a submit attempt instead.
  const [passportTried, setPassportTried] = useState(false);

  useEffect(() => {
    if (step === "passport" && profile) {
      setPNationality(profile.nationality ?? "");
      setPPassportNumber(profile.passportNumber ?? "");
      setPPassportExpiry(profile.passportExpiry ?? "");
      setPVisaType((profile.visaType as VisaType) ?? "");
      // BE-ENTRY: last entry date / port no longer collected.
    }
  }, [step, profile]);

  // UX-268: someone-else-lives-here flow.
  const hasOthers = othersExplicit === true;
  const othersAnswered = othersExplicit !== null;
  const residentsValid = !hasOthers
    ? true
    : residents.length > 0 &&
      residents.every((r) =>
        r.firstName.trim().length > 0 &&
        r.lastName.trim().length > 0 &&
        r.dateOfBirth.length > 0,
      );
  const overOccupancy =
    typeof maxOccupancy === "number" && residents.length + 1 > maxOccupancy;
  // UX-351: once tenant (1) + residents fills maxOccupancy, stop spawning more
  // empty person forms. Without this the user could add 9 forms on a maxOcc=6
  // listing and then has to delete them by hand (submit was already blocked).
  const residentsAtCapacity =
    typeof maxOccupancy === "number" && residents.length + 1 >= maxOccupancy;

  function addResident() {
    setResidents((rs) => {
      // UX-351: never exceed maxOccupancy (tenant counts as 1).
      if (typeof maxOccupancy === "number" && rs.length + 1 >= maxOccupancy) return rs;
      return [...rs, { ...EMPTY_RESIDENT }];
    });
  }
  function patchResident(idx: number, patch: Partial<AdditionalResidentInput>) {
    setResidents((rs) => rs.map((r, i) => (i === idx ? { ...r, ...patch } : r)));
  }
  function removeResident(idx: number) {
    setResidents((rs) => rs.filter((_, i) => i !== idx));
  }

  // hasPets = user explicitly said "yes" (regardless of counts — counts may still be 0)
  const hasPets = petsExplicit === true;
  // At least one pet must be added when user selects "I have pets"
  const petCountFilled = !hasPets || totalPets(pets) > 0;
  // Every pet type that has a count must have at least 1 photo
  const petPhotosReady = !hasPets || totalPets(pets) === 0 || (["cats", "dogs", "other"] as PetKey[]).every(
    (key) => pets[key] === 0 || petPhotos[key].length > 0,
  );
  const petsAnswered = petsExplicit !== null;

  // UX-328 / BUG-328: cold-path field validity. Name split into First/Last,
  // phone now mandatory with a light format check (host needs a reachable
  // contact). Authenticated users skip these — the backend takes them from the
  // profile.
  const fullName = `${firstName.trim()} ${lastName.trim()}`.trim();
  const phoneDigits = phone.replace(/[^\d]/g, "");
  const phoneValid = phoneDigits.length >= 7 && /^[+\d][\d\s()-]*$/.test(phone.trim());
  // BUG-366: light email format check so a typo'd address surfaces inline
  // rather than silently blocking the (anonymous) Continue button.
  const emailValid = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim());
  const coldFieldsValid = !!firstName.trim() && !!lastName.trim() && emailValid && phoneValid;

  const rate = effectiveRate(monthlyRate, durationMonths, discountTiers);
  const moveOut = format(addMonths(parseISO(moveInDate), durationMonths), "MMMM d, yyyy");
  const moveInFormatted = format(parseISO(moveInDate), "MMMM d, yyyy");

  async function doSubmitBooking() {
    const result = await submit.mutateAsync({
      listingId,
      moveInDate,
      durationMonths,
      guestName: fullName || undefined,
      guestEmail: email.trim() || undefined,
      guestPhone: phone.trim() || undefined,
      message: message.trim() || undefined,
      petCatsCount:  (petsExplicit && pets.cats)  || undefined,
      petDogsCount:  (petsExplicit && pets.dogs)  || undefined,
      petOtherCount: (petsExplicit && pets.other) || undefined,
      // UX-268: pass the host the co-resident snapshot up-front.
      additionalResidents: hasOthers && residents.length > 0
        ? residents.map((r) => ({
            firstName:    r.firstName.trim(),
            lastName:     r.lastName.trim(),
            dateOfBirth:  r.dateOfBirth,
          }))
        : undefined,
    });

    // Upload pet photos if any — fire and forget (don't block success flow)
    const allPhotos = [...petPhotos.cats, ...petPhotos.dogs, ...petPhotos.other];
    if (allPhotos.length > 0) {
      bookingRequestsApi.uploadPetPhotos(result.id, allPhotos).catch(() => {
        toast.warning("Request sent, but pet photos failed to upload. You can resend them later.");
      });
    }

    setBookingResult(result);
    if (result.isInstantBook && result.bookingId) {
      onClose();
      navigate(`/me/guest/bookings/${result.bookingId}`);
    } else {
      setStep("success");
    }
  }

  async function handleFormSubmit(e: React.FormEvent) {
    e.preventDefault();
    setTriedSubmit(true);

    // BUG-366: the Continue button is no longer silently disabled for these
    // conditions — it stays clickable so the inline errors below render. Bail
    // here (after surfacing them) so an invalid form never submits.
    if (petsExplicit === true && petsAllowed === false) return;
    if (!petsAnswered || !petCountFilled || !petPhotosReady) return;
    if (!othersAnswered || !residentsValid || overOccupancy) return;

    // Authenticated users don't need to fill name/email (backend takes from profile)
    if (token) {
      // If profile loaded and passport not set (and not Thai national), collect passport first
      const needsPassport = profile !== undefined && !profile.passportNumber && profile.nationality !== "TH";
      if (needsPassport) {
        setStep("passport");
        return;
      }
      try {
        await doSubmitBooking();
      } catch (err: unknown) {
        const res = (err as { response?: { data?: { message?: string; errors?: Record<string, string[]> } } })?.response?.data;
        const msg = res?.errors
          ? Object.values(res.errors).flat().join(" · ")
          : res?.message ?? "Failed to send request. Please try again.";
        toast.error(msg);
      }
      return;
    }

    // Not authenticated — need name + email + phone first, then auth
    if (!coldFieldsValid) return;
    setStep("auth");
  }

  async function handleAuthSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!password) return;
    if (authMode === "register" && !passwordValid(password)) {
      setPasswordBlurred(true);
      return;
    }
    setAuthError("");
    setAuthLoading(true);

    try {
      let result: { token: string };
      if (authMode === "register") {
        result = await authApi.register(email.trim(), password, firstName.trim() || undefined, lastName.trim() || undefined);
      } else {
        result = await authApi.login(email.trim(), password);
      }

      // Zustand persist mirrors this into localStorage under "pmc_auth";
      // axios reads the token from the store on every request.
      setToken(result.token);

      // Auto-submit the booking request
      try {
        setPostRegisterError(null);
        await doSubmitBooking();
      } catch (err: unknown) {
        // BUG-329: register already succeeded, so the user IS signed in now.
        // Don't drop them with a bare "Failed" toast that reads like nothing
        // happened — surface that the account exists and they only need to fix
        // the request and retry (the Continue button now takes the authed path,
        // no second registration). Without this the user thinks they're an
        // "orphan account" and the request is lost.
        const res = (err as { response?: { data?: { message?: string; errors?: Record<string, string[]> } } })?.response?.data;
        const msg = res?.errors
          ? Object.values(res.errors).flat().join(" · ")
          : res?.message ?? "Failed to send request. Please try again.";
        setPostRegisterError(msg);
        toast.error(msg);
        setStep("form");
      }
    } catch (err: unknown) {
      const res = (err as { response?: { data?: { message?: string; errors?: Record<string, string[]> } } })?.response?.data;
      if (authMode === "register") {
        const msg = res?.errors
          ? Object.values(res.errors).flat().join(" · ")
          : res?.message ?? "Could not create account. Try a different email.";
        setAuthError(msg);
      } else {
        setAuthError("Incorrect email or password.");
      }
    } finally {
      setAuthLoading(false);
    }
  }

  // Passport validation — TM-30 immigration filing requires a valid passport.
  // Expiry must be in the future (ideally 6+ months out — Thai immigration
  // sometimes refuses entry on passports near expiry). Number must be a real
  // alphanumeric of at least 6 chars (the international minimum).
  function validatePassport(): string | null {
    if (pNationality === "TH") return null;
    if (!pPassportNumber.trim() && !pPassportExpiry) return null; // user chose to fill nothing → handled by separate Skip flow
    const num = pPassportNumber.trim().toUpperCase();
    if (num.length < 6 || !/^[A-Z0-9]+$/.test(num)) {
      return "Passport number should be at least 6 letters/digits (e.g. AB123456).";
    }
    if (!pPassportExpiry) {
      return "Passport expiry is required.";
    }
    const expiry = new Date(pPassportExpiry);
    const today = new Date(); today.setHours(0, 0, 0, 0);
    if (expiry.getTime() < today.getTime()) {
      return "Passport has expired — Thai immigration won't accept it for TM30.";
    }
    const sixMonthsFromNow = new Date(); sixMonthsFromNow.setMonth(sixMonthsFromNow.getMonth() + 6);
    if (expiry.getTime() < sixMonthsFromNow.getTime()) {
      return "Passport expires within 6 months — Thai immigration may refuse. Consider renewing first.";
    }
    return null;
  }

  // Full passport step validation — for non-TH all immigration fields are
  // required (visa type, last entry, entry port) — otherwise backend rejects
  // with a generic 4xx that the user can't act on. Validate up-front and
  // disable Save & send until everything's in order.
  function passportStepReady(): boolean {
    if (!pNationality) return false;
    if (pNationality === "TH") return true;
    if (validatePassport()) return false;
    if (!pPassportNumber.trim()) return false;
    if (!pPassportExpiry) return false;
    if (!pVisaType) return false;
    // BE-ENTRY: last entry date / port no longer collected.
    return true;
  }

  // BUG-366: per-field error messages for the identity step. "Filled but
  // invalid" errors (bad passport format, expired/near-expiry passport) show as
  // soon as the field has a value; "required but empty" errors show only after
  // a submit attempt (passportTried) so the form doesn't shout before the user
  // has had a chance to fill it.
  const isThaiNat = pNationality === "TH";
  const passportNumberError =
    !isThaiNat && pPassportNumber.trim() && !/^[A-Z0-9]{6,}$/.test(pPassportNumber.trim().toUpperCase())
      ? "Passport number should be at least 6 letters/digits (e.g. AB123456)."
      : passportTried && !isThaiNat && !pPassportNumber.trim()
        ? "Passport number is required."
        : null;
  const passportExpiryError = (() => {
    if (isThaiNat) return null;
    if (!pPassportExpiry) return passportTried ? "Passport expiry is required." : null;
    const expiry = new Date(pPassportExpiry);
    const today = new Date(); today.setHours(0, 0, 0, 0);
    if (expiry.getTime() < today.getTime()) {
      return "Passport has already expired — Thai immigration won't accept it for TM30.";
    }
    const sixMonthsFromNow = new Date(); sixMonthsFromNow.setMonth(sixMonthsFromNow.getMonth() + 6);
    if (expiry.getTime() < sixMonthsFromNow.getTime()) {
      return "Passport expires within 6 months — Thai immigration may refuse. Consider renewing first.";
    }
    return null;
  })();
  const nationalityError = passportTried && !pNationality ? "Select your nationality." : null;
  const visaTypeError = passportTried && !isThaiNat && !pVisaType ? "Select your visa type." : null;

  async function handlePassportSubmit(e: React.FormEvent) {
    e.preventDefault();
    const isThai = pNationality === "TH";
    // BUG-366: reveal any required-but-empty errors, then bail if the step
    // isn't ready. The per-field inline messages now explain what's wrong
    // (expired passport, missing visa, etc.) instead of a silently-dead CTA.
    setPassportTried(true);
    if (!passportStepReady()) return;
    setPassportSaving(true);
    try {
      await updateProfile.mutateAsync({
        nationality: pNationality || undefined,
        passportNumber: (!isThai && pPassportNumber) ? pPassportNumber : undefined,
        passportExpiry: (!isThai && pPassportExpiry) ? pPassportExpiry : undefined,
        visaType: (!isThai && pVisaType) ? (pVisaType as VisaType) : undefined,
      });
    } catch {
      toast.error("Failed to save details. Proceeding with booking.");
    } finally {
      setPassportSaving(false);
    }
    try {
      await doSubmitBooking();
    } catch (err: unknown) {
      const res = (err as { response?: { data?: { message?: string; errors?: Record<string, string[]> } } })?.response?.data;
      const msg = res?.errors
        ? Object.values(res.errors).flat().join(" · ")
        : res?.message ?? "Failed to send request. Please try again.";
      toast.error(msg);
      setStep("form");
    }
  }

  async function handlePassportSkip() {
    // Foreign nationals: skipping passport blocks TM-30 filing for the host.
    // Surface the consequence before letting the user move on.
    if (pNationality && pNationality !== "TH") {
      const confirmed = window.confirm(
        "Without passport details, the host cannot file your TM-30 with Thai immigration — required by law for foreign tenants.\n\nYou can add this later in your profile. Continue without it?",
      );
      if (!confirmed) return;
    }
    try {
      await doSubmitBooking();
    } catch (err: unknown) {
      const res = (err as { response?: { data?: { message?: string; errors?: Record<string, string[]> } } })?.response?.data;
      const msg = res?.errors
        ? Object.values(res.errors).flat().join(" · ")
        : res?.message ?? "Failed to send request. Please try again.";
      toast.error(msg);
      setStep("form");
    }
  }

  return (
    <div className="fixed inset-0 z-[100] flex items-end sm:items-center justify-center bg-black/60 backdrop-blur-sm px-0 sm:px-4">
      <div className="bg-bg-card w-full sm:max-w-lg rounded-t-3xl sm:rounded-2xl shadow-pop flex flex-col max-h-[92dvh] sm:max-h-[90dvh]">

        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-border shrink-0">
          <div className="flex items-center gap-2">
            {(step === "auth" || step === "passport") && (
              <button
                onClick={() => {
                  if (step === "auth") { setAuthError(""); setPassword(""); }
                  setStep("form");
                }}
                className="w-7 h-7 rounded-full flex items-center justify-center text-fg-muted hover:bg-bg-subtle transition-colors -ml-1 mr-0.5"
              >
                <ArrowLeft size={15} />
              </button>
            )}
            <h2 className="text-base font-semibold text-fg">
              {step === "form" && "Request to Book"}
              {step === "auth" && (authMode === "register" ? "Create your account" : "Sign in")}
              {step === "passport" && "Your details"}
              {step === "success" && (bookingResult?.isInstantBook ? "Booking confirmed!" : "Request sent!")}
            </h2>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-full flex items-center justify-center text-fg-muted hover:bg-bg-subtle transition-colors"
          >
            <X size={16} />
          </button>
        </div>

        {/* ─── Success state ─── */}
        {step === "success" && (
          <div className="overflow-y-auto overscroll-contain">
          <div className="px-6 py-10 text-center">
            {bookingResult?.isInstantBook ? (
              <div className="w-12 h-12 rounded-full bg-brand/10 flex items-center justify-center mx-auto mb-4">
                <Zap size={24} className="text-brand" />
              </div>
            ) : (
              <CheckCircle2 size={48} className="text-success mx-auto mb-4" />
            )}
            <h3 className="text-lg font-semibold text-fg mb-1">
              {bookingResult?.isInstantBook ? "Booking confirmed!" : "Request sent!"}
            </h3>
            <p className="text-sm text-fg-muted mb-6">
              {bookingResult?.isInstantBook
                ? "Your booking is confirmed. Check your booking details below."
                : <>We've sent your request to the host. Expect a response within <strong>24 hours</strong>.</>}
            </p>
            <div className="bg-bg-subtle rounded-xl px-4 py-3 text-sm text-left space-y-1 mb-6">
              <div className="flex justify-between">
                <span className="text-fg-muted">Move-in</span>
                <span className="font-medium text-fg">{moveInFormatted}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-fg-muted">Move-out</span>
                <span className="font-medium text-fg">{moveOut}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-fg-muted">Duration</span>
                <span className="font-medium text-fg">{durationMonths} month{durationMonths !== 1 ? "s" : ""}</span>
              </div>
              <div className="flex justify-between border-t border-border pt-1 mt-1">
                <span className="text-fg-muted">Monthly rent</span>
                <span className="font-semibold text-fg">{formatThb(rate)} per month</span>
              </div>
              <div className="flex justify-between">
                <div>
                  <span className="text-fg-muted">Refundable deposit</span>
                  <div className="text-[11px] text-fg-muted">held securely by Siamo</div>
                </div>
                <span className="font-semibold text-fg">{formatThb(depositAmount ?? rate)}</span>
              </div>
              {/* BUG-263: when the request includes a pet, the pet deposit must
                  appear on the confirmation too — it was previously omitted, so
                  the tenant left "Request sent!" unaware of the extra deposit. */}
              {hasPets && (petDeposit ?? 0) > 0 && (
                <div className="flex justify-between">
                  <div>
                    <span className="text-fg-muted">Pet deposit</span>
                    <div className="text-[11px] text-fg-muted">refunded on check-out if no damage</div>
                  </div>
                  <span className="font-semibold text-fg">{formatThb(petDeposit!)}</span>
                </div>
              )}
            </div>
            <div className="space-y-2">
              <Button asChild className="w-full bg-brand hover:bg-[rgb(var(--color-primary-hover))] text-white">
                <Link to="/me/guest/applications" onClick={onClose}>
                  <ExternalLink size={14} className="mr-1.5" />View my applications
                </Link>
              </Button>
              <Button variant="ghost" className="w-full text-fg-muted" onClick={onClose}>
                Continue browsing
              </Button>
            </div>
          </div>
          </div>
        )}

        {/* ─── Booking form ─── */}
        {step === "form" && (
          <form onSubmit={handleFormSubmit} className="flex flex-col min-h-0 flex-1">
            {/* Booking summary — sticky top */}
            <div className="px-6 py-4 bg-bg-subtle border-b border-border shrink-0">
              <p className="text-xs font-semibold text-fg-muted uppercase tracking-wide mb-2">
                Your booking
              </p>
              <div className="text-sm space-y-0.5">
                <p className="font-medium text-fg line-clamp-1">{listingTitle}</p>
                <p className="text-fg-muted">
                  {moveInFormatted} → {moveOut} · {durationMonths} month{durationMonths !== 1 ? "s" : ""}
                </p>
                <p className="text-fg font-semibold pt-0.5">{formatThb(rate)} per month</p>
              </div>
            </div>

            {/* Scrollable form fields */}
            <div className="overflow-y-auto overscroll-contain flex-1">
              <div className="px-6 py-5 space-y-4">
                {/* BUG-329: account exists, only the request failed — tell the
                    now signed-in user so they don't think it was all lost. */}
                {postRegisterError && (
                  <div className="rounded-xl border border-warning/30 bg-warning/10 px-4 py-3 text-sm">
                    <p className="font-medium text-fg">Your account is ready — you're signed in ✓</p>
                    <p className="text-xs text-fg-muted mt-0.5">
                      We couldn't send the request: {postRegisterError} Adjust the
                      details below and tap Continue to try again — no need to
                      register again.
                    </p>
                  </div>
                )}
                {!token && (
                  <>
                    {/* UX-328: First / Last name instead of one "Full name". */}
                    <div className="grid grid-cols-2 gap-3">
                      <div className="space-y-1.5">
                        <Label className="text-sm font-medium text-fg">First name *</Label>
                        <Input
                          value={firstName}
                          onChange={(e) => setFirstName(e.target.value)}
                          placeholder="Sarah"
                          required
                          autoFocus
                        />
                        {/* BUG-366: inline required errors so the (anonymous)
                            Continue button never sits silently disabled. */}
                        {triedSubmit && !firstName.trim() && (
                          <p className="text-xs text-danger">First name is required.</p>
                        )}
                      </div>
                      <div className="space-y-1.5">
                        <Label className="text-sm font-medium text-fg">Last name *</Label>
                        <Input
                          value={lastName}
                          onChange={(e) => setLastName(e.target.value)}
                          placeholder="Chen"
                          required
                        />
                        {triedSubmit && !lastName.trim() && (
                          <p className="text-xs text-danger">Last name is required.</p>
                        )}
                      </div>
                    </div>
                    <div className="space-y-1.5">
                      <Label className="text-sm font-medium text-fg">Email *</Label>
                      <Input
                        type="email"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        placeholder="you@example.com"
                        required
                      />
                      {triedSubmit && !email.trim() && (
                        <p className="text-xs text-danger">Email is required.</p>
                      )}
                      {triedSubmit && email.trim() && !emailValid && (
                        <p className="text-xs text-danger">Enter a valid email address.</p>
                      )}
                    </div>
                    <div className="space-y-1.5">
                      <Label className="text-sm font-medium text-fg">Phone *</Label>
                      <Input
                        type="tel"
                        value={phone}
                        onChange={(e) => setPhone(e.target.value)}
                        placeholder="+66 81 234 5678"
                        required
                      />
                      {/* BUG-328: phone is mandatory — the host needs a way to
                          reach the tenant. Show the format hint only once the
                          user has typed something invalid. */}
                      {triedSubmit && phone.trim() && !phoneValid && (
                        <p className="text-xs text-danger">Enter a valid phone number (at least 7 digits).</p>
                      )}
                      {triedSubmit && !phone.trim() && (
                        <p className="text-xs text-danger">Phone number is required.</p>
                      )}
                    </div>
                  </>
                )}
                <div className="space-y-1.5">
                  <Label className="text-sm font-medium text-fg">Message</Label>
                  <Textarea
                    value={message}
                    onChange={(e) => setMessage(e.target.value)}
                    placeholder="Tell the host a bit about yourself and why you're looking for this place…"
                    className="min-h-[80px] resize-none"
                    autoFocus={!!token}
                  />
                </div>

                {/* UX-268: composition — host must know who lives in the unit
                    before approving the request, not after move-in. */}
                <div className={cn(
                  "rounded-2xl border overflow-hidden",
                  triedSubmit && (!othersAnswered || !residentsValid || overOccupancy) ? "border-danger" : "border-border"
                )}>
                  <div className="px-4 py-3 bg-bg-subtle flex items-start gap-3">
                    <span className="text-xl mt-0.5">👥</span>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-semibold text-fg">Will anyone else live with you?</p>
                      <p className="text-xs text-fg-muted mt-0.5">
                        {typeof maxOccupancy === "number"
                          ? `Max occupancy is ${maxOccupancy}. Names + dates of birth — passports can come after the host approves.`
                          : "Names + dates of birth — passports can come after the host approves."}
                      </p>
                    </div>
                  </div>

                  <div className="flex border-t border-border divide-x divide-border">
                    <button
                      type="button"
                      onClick={() => { setOthersExplicit(false); setResidents([]); }}
                      className={cn(
                        "flex-1 py-2.5 text-sm font-medium transition-colors",
                        othersExplicit === false
                          ? "bg-brand text-white"
                          : "text-fg-muted hover:bg-bg-subtle",
                      )}
                    >
                      Just me
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setOthersExplicit(true);
                        if (residents.length === 0) addResident();
                      }}
                      className={cn(
                        "flex-1 py-2.5 text-sm font-medium transition-colors",
                        othersExplicit === true
                          ? "bg-brand text-white"
                          : "text-fg-muted hover:bg-bg-subtle",
                      )}
                    >
                      Me + others
                    </button>
                  </div>

                  {/* UX-329: redesigned occupancy block. Anchors on a visible
                      "You + others" roster — the tenant is shown as the first
                      occupant card, co-residents follow as person cards with an
                      initials avatar, and a spot counter makes capacity legible.
                      Data contract unchanged (residents = First/Last + DOB). */}
                  {hasOthers && (
                    <div className="px-4 py-4 space-y-3 border-t border-border">
                      {/* Spot counter — who's accounted for vs. the listing cap */}
                      <div className="flex items-center justify-between gap-2">
                        <p className="text-xs font-medium text-fg">
                          Who's moving in
                        </p>
                        <span className="text-[11px] font-semibold text-fg-muted tabular-nums">
                          {typeof maxOccupancy === "number"
                            ? `${residents.length + 1} of ${maxOccupancy} ${maxOccupancy === 1 ? "spot" : "spots"}`
                            : `${residents.length + 1} ${residents.length + 1 === 1 ? "person" : "people"}`}
                        </span>
                      </div>

                      {/* You — the primary tenant, always first, read-only */}
                      <div className="flex items-center gap-3 rounded-xl border border-brand/20 bg-brand/5 px-3 py-2.5">
                        <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-brand text-[11px] font-bold text-white">
                          You
                        </span>
                        <div className="min-w-0">
                          <p className="text-sm font-medium text-fg leading-tight">You</p>
                          <p className="text-[11px] text-fg-muted">Primary tenant — signs the lease</p>
                        </div>
                      </div>

                      {residents.map((r, i) => {
                        const ri =
                          ((r.firstName?.[0] ?? "") + (r.lastName?.[0] ?? "")).toUpperCase() ||
                          String(i + 2);
                        const fullName = `${r.firstName} ${r.lastName}`.trim();
                        return (
                          <div key={i} className="rounded-xl border border-border bg-bg-subtle/40 p-3 space-y-2.5">
                            <div className="flex items-center gap-3">
                              <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-bg-subtle text-[11px] font-bold text-fg-muted">
                                {ri}
                              </span>
                              <p className="flex-1 min-w-0 truncate text-sm font-medium text-fg">
                                {fullName || `Guest ${i + 2}`}
                              </p>
                              <button
                                type="button"
                                onClick={() => removeResident(i)}
                                aria-label={`Remove guest ${i + 2}`}
                                className="shrink-0 rounded-md p-1 text-fg-muted hover:bg-danger/10 hover:text-danger transition-colors"
                              >
                                <X size={15} />
                              </button>
                            </div>
                            <div className="grid grid-cols-2 gap-2">
                              <Input
                                value={r.firstName}
                                onChange={(e) => patchResident(i, { firstName: e.target.value })}
                                placeholder="First name"
                                aria-label={`First name #${i + 2}`}
                                className={cn(triedSubmit && !r.firstName.trim() && "border-danger")}
                              />
                              <Input
                                value={r.lastName}
                                onChange={(e) => patchResident(i, { lastName: e.target.value })}
                                placeholder="Last name"
                                aria-label={`Last name #${i + 2}`}
                                className={cn(triedSubmit && !r.lastName.trim() && "border-danger")}
                              />
                            </div>
                            {/* BUG-325: Relationship dropdown removed — not
                                relevant to the lease / TM-30. UX-322: DOB uses the
                                custom DatePicker (year-first) for parity with the
                                contract form, not a native date input. */}
                            <div className="space-y-1">
                              <Label className="text-xs text-fg-muted">Date of birth</Label>
                              <DatePicker
                                value={r.dateOfBirth}
                                onChange={(v) => patchResident(i, { dateOfBirth: v })}
                                placeholder="Select date of birth"
                                isDisabled={DOB_NOT_FUTURE}
                                startView="year"
                                yearAnchor={DOB_ANCHOR}
                                contentClassName="z-[200]"
                              />
                            </div>
                          </div>
                        );
                      })}
                      <button
                        type="button"
                        onClick={addResident}
                        disabled={residentsAtCapacity}
                        title={residentsAtCapacity ? "Maximum reached" : undefined}
                        className="w-full rounded-xl border border-dashed border-border py-2 text-xs font-medium text-fg-muted hover:border-brand hover:text-brand transition-colors disabled:cursor-not-allowed disabled:opacity-50 disabled:hover:border-border disabled:hover:text-fg-muted"
                      >
                        {residentsAtCapacity
                          ? `Maximum reached — this listing fits ${maxOccupancy} people`
                          : "+ Add another person"}
                      </button>
                      {/* Reassurance — lowers the data-entry burden up front */}
                      <p className="flex items-center gap-1.5 text-[11px] text-fg-muted">
                        <Shield size={12} className="shrink-0" />
                        Just names + dates of birth for now. Passports can be added after the host approves.
                      </p>
                    </div>
                  )}

                  {triedSubmit && !othersAnswered && (
                    <div className="px-4 py-2 bg-danger/5 border-t border-danger/20">
                      <p className="text-xs text-danger">Please tell the host who'll be living in the unit.</p>
                    </div>
                  )}
                  {triedSubmit && hasOthers && !residentsValid && (
                    <div className="px-4 py-2 bg-danger/5 border-t border-danger/20">
                      <p className="text-xs text-danger">Each person needs a first name, last name, and date of birth.</p>
                    </div>
                  )}
                  {overOccupancy && (
                    <div className="px-4 py-2 bg-danger/5 border-t border-danger/20">
                      <p className="text-xs text-danger">
                        Over capacity — this listing fits {maxOccupancy} people (you + {(maxOccupancy ?? 1) - 1} others).
                      </p>
                    </div>
                  )}
                </div>

                {/* Pets — explicit yes/no required */}
                <div className={cn(
                  "rounded-2xl border overflow-hidden",
                  triedSubmit && !petsAnswered ? "border-danger" : "border-border"
                )}>
                  <div className="px-4 py-3 bg-bg-subtle flex items-start gap-3">
                    <span className="text-xl mt-0.5">🐾</span>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-semibold text-fg">Travelling with pets?</p>
                      {petsAllowed === false ? (
                        <p className="text-xs text-danger mt-0.5">Pets are not allowed at this property.</p>
                      ) : petsAllowed === true ? (
                        <p className="text-xs text-fg-muted mt-0.5">
                          Pets welcome{petDeposit ? ` · ${formatThb(petDeposit)} pet deposit` : ""}.
                          Having pets may affect the landlord's decision.
                        </p>
                      ) : (
                        <p className="text-xs text-fg-muted mt-0.5">
                          Having pets may affect the landlord's decision.
                        </p>
                      )}
                    </div>
                  </div>

                  <div className="flex border-t border-border divide-x divide-border">
                    <button
                      type="button"
                      onClick={() => { setPetsExplicit(false); setPets(EMPTY_PETS); }}
                      className={cn(
                        "flex-1 py-2.5 text-sm font-medium transition-colors",
                        petsExplicit === false
                          ? "bg-brand text-white"
                          : "text-fg-muted hover:bg-bg-subtle"
                      )}
                    >
                      No pets
                    </button>
                    <button
                      type="button"
                      onClick={() => setPetsExplicit(true)}
                      className={cn(
                        "flex-1 py-2.5 text-sm font-medium transition-colors",
                        petsExplicit === true
                          ? petsAllowed === false ? "bg-danger text-white" : "bg-brand text-white"
                          : "text-fg-muted hover:bg-bg-subtle"
                      )}
                    >
                      I have pets
                    </button>
                  </div>

                  {/* UX-109: clear blocking message when tenant selects pets on a no-pets listing */}
                  {petsExplicit === true && petsAllowed === false && (
                    <div className="px-4 py-2.5 bg-danger/8 border-t border-danger/20 flex items-start gap-2">
                      <span className="text-danger text-sm mt-0.5">✕</span>
                      <p className="text-xs text-danger font-medium">
                        This listing does not accept pets. Please select "No pets" to continue, or search for a pet-friendly property.
                      </p>
                    </div>
                  )}
                  {triedSubmit && !petsAnswered && (
                    <div className="px-4 py-2 bg-danger/5 border-t border-danger/20">
                      <p className="text-xs text-danger">Please indicate whether you're travelling with pets.</p>
                    </div>
                  )}
                </div>

                {/* Pet details — only when user said yes */}
                {petsExplicit === true && (
                  <>
                    <PetsSelector
                      value={pets}
                      onChange={(v) => setPets(v)}
                    />
                    {triedSubmit && !petCountFilled && (
                      <p className="text-xs text-danger -mt-2">
                        Please add the number of pets using the + buttons above.
                      </p>
                    )}
                    <PetPhotoUpload
                      pets={pets}
                      photos={petPhotos}
                      onChange={setPetPhotos}
                      // Surface the per-type "Add at least 1 photo" hint as soon
                      // as counts are set (not only after a Continue click), so
                      // the now-disabled Continue button has a visible reason.
                      showErrors={triedSubmit || (petCountFilled && !petPhotosReady)}
                    />
                  </>
                )}
              </div>
            </div>

            {/* Footer — always visible */}
            <div className="px-6 py-4 border-t border-border shrink-0">
              {/* BUG-366: keep the button enabled even when the form is
                  incomplete — clicking runs handleFormSubmit, which sets
                  triedSubmit and renders the inline errors above (so the user
                  sees WHAT is blocking them instead of a dead button at the
                  bottom of a long modal). Only disabled while sending.

                  Exception: pet photos are a HARD upload requirement. Once the
                  user has entered pet counts the photo card is already visible
                  right above the footer with its "Pet photos *" label, so a
                  disabled Continue here is self-explanatory (not a dead button)
                  — and it must be impossible to submit a "with pets" request
                  with no photos. We only block once counts are filled so the
                  count-missing case still gets the inline error via a click. */}
              <Button
                type="submit"
                className="w-full bg-brand hover:bg-[rgb(var(--color-primary-hover))] text-white h-12 text-base font-semibold rounded-xl"
                disabled={submit.isPending || (hasPets && petCountFilled && !petPhotosReady)}
              >
                {submit.isPending ? "Sending…" : "Continue"}
              </Button>
              <p className="text-xs text-center text-fg-muted mt-3">
                You won't be charged now. The host will review and respond.
              </p>
            </div>
          </form>
        )}

        {/* ─── Passport step ─── */}
        {step === "passport" && (
          <form onSubmit={handlePassportSubmit} className="flex flex-col min-h-0 flex-1">
            <div className="overflow-y-auto overscroll-contain flex-1">
              <div className="px-6 py-5 space-y-4">
                <p className="text-sm text-fg-muted">
                  {pNationality === "TH"
                    ? "Please confirm your nationality to complete your booking."
                    : "Required for your rental contract and TM30 immigration filing."}
                </p>

                <div className="space-y-1.5">
                  <Label className="text-sm font-medium text-fg">Nationality</Label>
                  <NationalityInput value={pNationality} onChange={setPNationality} placeholder="Select nationality…" />
                  {nationalityError && <p className="text-xs text-danger">{nationalityError}</p>}
                </div>

                {pNationality !== "TH" && (
                  <>
                    <div className="space-y-1.5">
                      <Label className="text-sm font-medium text-fg">Passport number</Label>
                      <Input
                        value={pPassportNumber}
                        onChange={(e) => setPPassportNumber(e.target.value.toUpperCase())}
                        placeholder="AB123456"
                      />
                      {passportNumberError && <p className="text-xs text-danger">{passportNumberError}</p>}
                    </div>

                    <div className="space-y-1.5">
                      <Label className="text-sm font-medium text-fg">Passport expiry</Label>
                      {/* UX-322: custom DatePicker everywhere; year-first so the
                          expiry year is immediately selectable. */}
                      <DatePicker value={pPassportExpiry} onChange={setPPassportExpiry} placeholder="Select expiry date" startView="year" contentClassName="z-[200]" />
                      {/* BUG-366: expired / near-expiry passport now flags inline
                          instead of silently keeping the CTA disabled. */}
                      {passportExpiryError && <p className="text-xs text-danger">{passportExpiryError}</p>}
                    </div>

                    <div className="space-y-1.5">
                      <Label className="text-sm font-medium text-fg">Visa type</Label>
                      <Select value={pVisaType} onValueChange={(v) => setPVisaType(v as VisaType)}>
                        <SelectTrigger>
                          <SelectValue placeholder="Select visa type" />
                        </SelectTrigger>
                        {/* z-[9999] ensures dropdown appears above the Dialog overlay (BUG-57) */}
                        {/* @ts-ignore — onOpenAutoFocus is a valid Radix prop at runtime (UX-93) */}
                        <SelectContent className="z-[9999]" onOpenAutoFocus={(e: Event) => e.preventDefault()}>
                          {Object.entries(VISA_LABELS).map(([val, label]) => (
                            <SelectItem key={val} value={val}>{label}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      {visaTypeError && <p className="text-xs text-danger">{visaTypeError}</p>}
                    </div>

                    {/* BE-ENTRY: "Last entry date" / "Entry port" removed —
                        they were never used downstream (and previously broke
                        signing as hidden required fields, BUG-320). */}
                  </>
                )}
              </div>
            </div>

            <div className="px-6 py-4 border-t border-border shrink-0 space-y-2">
              {/* BUG-366: the button stays clickable even when fields are
                  incomplete/invalid — clicking surfaces the per-field errors
                  above (setPassportTried) rather than sitting dead with a
                  misleading "Fill all fields" label while everything IS filled
                  (e.g. an expired passport). Only disabled while a request is
                  actually in flight. */}
              <Button
                type="submit"
                className="w-full bg-brand hover:bg-[rgb(var(--color-primary-hover))] text-white h-12 text-base font-semibold rounded-xl"
                disabled={passportSaving || submit.isPending}
              >
                {(passportSaving || submit.isPending) ? "Please wait…" : "Save & send request"}
              </Button>
              <Button
                type="button"
                variant="ghost"
                className="w-full text-fg-muted text-sm"
                onClick={handlePassportSkip}
                disabled={passportSaving || submit.isPending}
              >
                Skip for now
              </Button>
            </div>
          </form>
        )}

        {/* ─── Inline auth gate ─── */}
        {step === "auth" && (
          <form onSubmit={handleAuthSubmit} className="flex flex-col min-h-0 flex-1">
            <div className="overflow-y-auto overscroll-contain flex-1">
            <div className="px-6 py-5 space-y-5">
              {/* Context reminder */}
              <div className="bg-bg-subtle rounded-xl px-4 py-3 text-sm space-y-0.5">
                <p className="font-medium text-fg line-clamp-1">{listingTitle}</p>
                <p className="text-fg-muted">
                  {moveInFormatted} · {durationMonths} month{durationMonths !== 1 ? "s" : ""} · <span className="text-fg font-semibold">{formatThb(rate)} per month</span>
                </p>
              </div>

              <div className="space-y-1">
                <p className="text-sm text-fg-muted">
                  {authMode === "register"
                    ? "One last step — create a free account to send your request."
                    : "Welcome back! Sign in to send your request."}
                </p>
              </div>

              {/* Email (editable — this becomes their login) */}
              <div className="space-y-1.5">
                <Label className="text-sm font-medium text-fg">Email</Label>
                <Input
                  type="email"
                  value={email}
                  onChange={(e) => { setEmail(e.target.value); setAuthError(""); }}
                  placeholder="you@example.com"
                  required
                  autoFocus
                />
                <p className="text-[11px] text-fg-muted">This will be your login — make sure it's correct</p>
              </div>

              {/* Password */}
              <div className="space-y-1.5">
                <Label className="text-sm font-medium text-fg">
                  {authMode === "register" ? "Choose a password" : "Password"}
                </Label>
                <div className="relative">
                  <Input
                    type={showPassword ? "text" : "password"}
                    value={password}
                    onChange={(e) => { setPassword(e.target.value); setAuthError(""); }}
                    onBlur={() => setPasswordBlurred(true)}
                    placeholder="••••••••"
                    required
                    className="pr-10"
                  />
                  <button
                    type="button"
                    tabIndex={-1}
                    onClick={() => setShowPassword((v) => !v)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-fg-muted hover:text-fg transition-colors"
                  >
                    {showPassword ? <EyeOff size={15} /> : <Eye size={15} />}
                  </button>
                </div>
                {authError
                  ? <p className="text-xs text-destructive">{authError}</p>
                  : authMode === "register" && <PasswordHints password={password} showErrors={passwordBlurred} />}
              </div>
            </div>
            </div>

            <div className="px-6 py-4 border-t border-border shrink-0 space-y-3">
              <Button
                type="submit"
                className="w-full bg-brand hover:bg-[rgb(var(--color-primary-hover))] text-white h-12 text-base font-semibold rounded-xl"
                disabled={!password || authLoading || (authMode === "register" && !passwordValid(password))}
              >
                {authLoading
                  ? "Please wait…"
                  : authMode === "register"
                  ? "Create account & send request"
                  : "Sign in & send request"}
              </Button>

              <p className="text-sm text-center text-fg-muted">
                {authMode === "register" ? (
                  <>
                    Already have an account?{" "}
                    <button
                      type="button"
                      onClick={() => { setAuthMode("login"); setAuthError(""); setPassword(""); }}
                      className="text-brand hover:underline font-medium"
                    >
                      Sign in
                    </button>
                  </>
                ) : (
                  <>
                    New here?{" "}
                    <button
                      type="button"
                      onClick={() => { setAuthMode("register"); setAuthError(""); setPassword(""); }}
                      className="text-brand hover:underline font-medium"
                    >
                      Create account
                    </button>
                  </>
                )}
              </p>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}
