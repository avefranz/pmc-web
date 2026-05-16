import { useState, useRef, useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";
import { format, parseISO, addMonths } from "date-fns";
import { X, CheckCircle2, Zap, ArrowLeft, Eye, EyeOff, ExternalLink, Camera } from "lucide-react";
import { toast } from "sonner";
import { useQuery } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { NationalityInput } from "@/components/ui/nationality-input";
import { DateInput } from "@/components/ui/date-input";
import { formatThb } from "@/lib/utils/format";
import { useSubmitBookingRequest } from "@/lib/hooks/use-marketplace";
import { useUpdateProfile } from "@/lib/hooks/use-profile";
import { useAuthStore } from "@/lib/stores/auth.store";
import { authApi } from "@/lib/api/auth.api";
import { profileApi } from "@/lib/api/profile.api";
import { bookingRequestsApi } from "@/lib/api/booking-requests.api";
import { PasswordHints, passwordValid } from "@/components/shared/password-hints";
import { PetsSelector, EMPTY_PETS, petSummary, totalPets, type PetCounts } from "@/components/shared/pets-selector";
import { cn } from "@/lib/utils/cn";
import { VisaType } from "@/lib/types/enums";
import type { DiscountTier, BookingRequestResult } from "@/lib/types/marketplace";

const VISA_LABELS: Record<VisaType, string> = {
  [VisaType.VisaExempt]: "Visa Exempt",
  [VisaType.Tourist]: "Tourist Visa",
  [VisaType.NonImmigrantB]: "Non-Immigrant B",
  [VisaType.NonImmigrantO]: "Non-Immigrant O",
  [VisaType.NonImmigrantOA]: "Non-Immigrant OA",
  [VisaType.Education]: "Education Visa",
  [VisaType.SpecialTourist]: "Special Tourist",
  [VisaType.Other]: "Other",
};

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
  discountTiers: DiscountTier[];
  petsAllowed?: boolean;
  petDeposit?: number;
  onClose: () => void;
}

type Step = "form" | "auth" | "passport" | "success";
type AuthMode = "register" | "login";

export function BookingRequestModal({
  listingId,
  listingTitle,
  moveInDate,
  durationMonths,
  monthlyRate,
  discountTiers,
  petsAllowed,
  petDeposit,
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

  // Form fields
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [message, setMessage] = useState("");
  const [pets, setPets] = useState<PetCounts>(EMPTY_PETS);
  const [petPhotos, setPetPhotos] = useState<PetPhotoMap>(EMPTY_PHOTOS);
  const [petsExplicit, setPetsExplicit] = useState<boolean | null>(null); // null = not answered
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
  const [pLastEntryDate, setPLastEntryDate] = useState("");
  const [pLastEntryPort, setPLastEntryPort] = useState("");
  const [passportSaving, setPassportSaving] = useState(false);

  useEffect(() => {
    if (step === "passport" && profile) {
      setPNationality(profile.nationality ?? "");
      setPPassportNumber(profile.passportNumber ?? "");
      setPPassportExpiry(profile.passportExpiry ?? "");
      setPVisaType((profile.visaType as VisaType) ?? "");
      setPLastEntryDate(profile.lastEntryDate ?? "");
      setPLastEntryPort(profile.lastEntryPort ?? "");
    }
  }, [step, profile]);

  const hasPets = petsExplicit === true && totalPets(pets) > 0;
  const petPhotosReady = !hasPets || (["cats", "dogs", "other"] as PetKey[]).every(
    (key) => pets[key] === 0 || petPhotos[key].length > 0,
  );
  const petsAnswered = petsExplicit !== null;

  const rate = effectiveRate(monthlyRate, durationMonths, discountTiers);
  const total = rate * durationMonths;
  const moveOut = format(addMonths(parseISO(moveInDate), durationMonths), "MMMM d, yyyy");
  const moveInFormatted = format(parseISO(moveInDate), "MMMM d, yyyy");

  async function doSubmitBooking() {
    const result = await submit.mutateAsync({
      listingId,
      moveInDate,
      durationMonths,
      guestName: name.trim() || undefined,
      guestEmail: email.trim() || undefined,
      guestPhone: phone.trim() || undefined,
      message: message.trim() || undefined,
      petCatsCount:  (petsExplicit && pets.cats)  || undefined,
      petDogsCount:  (petsExplicit && pets.dogs)  || undefined,
      petOtherCount: (petsExplicit && pets.other) || undefined,
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

    if (!petsAnswered || !petPhotosReady) return;

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

    // Not authenticated — need name+email first, then auth
    if (!name.trim() || !email.trim()) return;
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
        const firstName = name.trim().split(" ")[0];
        result = await authApi.register(email.trim(), password, firstName);
      } else {
        result = await authApi.login(email.trim(), password);
      }

      // Zustand persist mirrors this into localStorage under "pmc_auth";
      // axios reads the token from the store on every request.
      setToken(result.token);

      // Auto-submit the booking request
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

  async function handlePassportSubmit(e: React.FormEvent) {
    e.preventDefault();
    const isThai = pNationality === "TH";
    setPassportSaving(true);
    try {
      await updateProfile.mutateAsync({
        nationality: pNationality || undefined,
        passportNumber: (!isThai && pPassportNumber) ? pPassportNumber : undefined,
        passportExpiry: (!isThai && pPassportExpiry) ? pPassportExpiry : undefined,
        visaType: (!isThai && pVisaType) ? (pVisaType as VisaType) : undefined,
        lastEntryDate: (!isThai && pLastEntryDate) ? pLastEntryDate : undefined,
        lastEntryPort: (!isThai && pLastEntryPort) ? pLastEntryPort : undefined,
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
              {bookingResult?.isInstantBook ? "Booking confirmed!" : "Request received!"}
            </h3>
            <p className="text-sm text-fg-muted mb-6">
              {bookingResult?.isInstantBook
                ? "Your booking is confirmed. Check your booking details below."
                : <>We've sent your request to the property manager. Expect a response within <strong>24 hours</strong>.</>}
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
                <span className="font-semibold text-fg">{formatThb(rate)}</span>
              </div>
            </div>
            <div className="space-y-2">
              <Button asChild className="w-full bg-brand hover:bg-[var(--color-primary-hover)] text-white">
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
                {!token && (
                  <>
                    <div className="space-y-1.5">
                      <Label className="text-sm font-medium text-fg">Full name *</Label>
                      <Input
                        value={name}
                        onChange={(e) => setName(e.target.value)}
                        placeholder="Your full name"
                        required
                        autoFocus
                      />
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
                    </div>
                    <div className="space-y-1.5">
                      <Label className="text-sm font-medium text-fg">Phone</Label>
                      <Input
                        type="tel"
                        value={phone}
                        onChange={(e) => setPhone(e.target.value)}
                        placeholder="+66 81 234 5678"
                      />
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
                      disabled={petsAllowed === false}
                      className={cn(
                        "flex-1 py-2.5 text-sm font-medium transition-colors",
                        petsExplicit === true
                          ? "bg-brand text-white"
                          : petsAllowed === false
                            ? "text-fg-muted opacity-40 cursor-not-allowed"
                            : "text-fg-muted hover:bg-bg-subtle"
                      )}
                    >
                      I have pets
                    </button>
                  </div>

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
                      onChange={(v) => {
                        setPets(v);
                        if (totalPets(v) === 0) setTriedSubmit(false);
                      }}
                    />
                    <PetPhotoUpload
                      pets={pets}
                      photos={petPhotos}
                      onChange={setPetPhotos}
                      showErrors={triedSubmit}
                    />
                  </>
                )}
              </div>
            </div>

            {/* Footer — always visible */}
            <div className="px-6 py-4 border-t border-border shrink-0">
              <Button
                type="submit"
                className="w-full bg-brand hover:bg-[var(--color-primary-hover)] text-white h-12 text-base font-semibold rounded-xl"
                disabled={(!token && (!name.trim() || !email.trim())) || submit.isPending || !petsAnswered || (hasPets && !petPhotosReady)}
              >
                {submit.isPending ? "Sending…" : "Continue"}
              </Button>
              <p className="text-xs text-center text-fg-muted mt-3">
                You won't be charged now. The manager will review and respond.
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
                    </div>

                    <div className="space-y-1.5">
                      <Label className="text-sm font-medium text-fg">Passport expiry</Label>
                      <DateInput value={pPassportExpiry} onChange={setPPassportExpiry} minYear={2000} maxYear={2060} />
                    </div>

                    <div className="space-y-1.5">
                      <Label className="text-sm font-medium text-fg">Visa type</Label>
                      <Select value={pVisaType} onValueChange={(v) => setPVisaType(v as VisaType)}>
                        <SelectTrigger>
                          <SelectValue placeholder="Select visa type" />
                        </SelectTrigger>
                        <SelectContent>
                          {Object.entries(VISA_LABELS).map(([val, label]) => (
                            <SelectItem key={val} value={val}>{label}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>

                    <div className="grid grid-cols-2 gap-3">
                      <div className="space-y-1.5">
                        <Label className="text-sm font-medium text-fg">Last entry date</Label>
                        <DateInput value={pLastEntryDate} onChange={setPLastEntryDate} minYear={2015} maxYear={new Date().getFullYear()} />
                      </div>
                      <div className="space-y-1.5">
                        <Label className="text-sm font-medium text-fg">Entry port</Label>
                        <Input
                          value={pLastEntryPort}
                          onChange={(e) => setPLastEntryPort(e.target.value)}
                          placeholder="Suvarnabhumi"
                        />
                      </div>
                    </div>
                  </>
                )}
              </div>
            </div>

            <div className="px-6 py-4 border-t border-border shrink-0 space-y-2">
              <Button
                type="submit"
                className="w-full bg-brand hover:bg-[var(--color-primary-hover)] text-white h-12 text-base font-semibold rounded-xl"
                disabled={!pNationality || passportSaving || submit.isPending}
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
                className="w-full bg-brand hover:bg-[var(--color-primary-hover)] text-white h-12 text-base font-semibold rounded-xl"
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
