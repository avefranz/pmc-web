import { useState } from "react";
import { useParams, useNavigate, Link } from "react-router-dom";
import { ArrowLeft, FileText, PenLine, CheckCircle2, AlertCircle, Shield, Camera, XCircle } from "lucide-react";
import { toast } from "sonner";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { VisaType } from "@/lib/types/enums";
import { SignatureCanvas } from "@/components/shared/signature-canvas";
import { PassportPageGuide } from "@/components/shared/passport-page-guide";
import { DateInput } from "@/components/ui/date-input";
import { NationalityInput } from "@/components/ui/nationality-input";
import { useBookingContract, useTenantSignContract, useBookingGuests, useUpdatePassport } from "@/lib/hooks/use-bookings";
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

  // Passport data
  const [passportFirstName, setPassportFirstName] = useState("");
  const [passportLastName, setPassportLastName] = useState("");
  const [passportNumber, setPassportNumber] = useState("");
  const [passportNationality, setPassportNationality] = useState("");
  const [passportDob, setPassportDob] = useState("");
  const [passportExpiry, setPassportExpiry] = useState("");
  const [passportVisaType, setPassportVisaType] = useState("");
  const [passportEntryDate, setPassportEntryDate] = useState("");
  const [passportEntryPort, setPassportEntryPort] = useState("");
  const [passportPhotos, setPassportPhotos] = useState<File[]>([]);

  const [agreedTerms, setAgreedTerms] = useState(false);
  const [agreedEta, setAgreedEta] = useState(false);
  const [agreedPdpa, setAgreedPdpa] = useState(false);
  const [agreedPenalty, setAgreedPenalty] = useState(false);
  const [typedName, setTypedName] = useState("");
  const [signatureFile, setSignatureFile] = useState<File | null>(null);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const passportComplete =
    passportFirstName.trim().length > 0 &&
    passportLastName.trim().length > 0 &&
    passportNumber.trim().length > 0 &&
    passportNationality.trim().length > 0 &&
    passportDob.trim().length > 0 &&
    passportExpiry.trim().length > 0 &&
    passportEntryDate.trim().length > 0 &&
    passportEntryPort.trim().length > 0;

  const canSubmit =
    passportComplete &&
    agreedTerms && agreedEta && agreedPdpa && agreedPenalty &&
    typedName.trim().length > 0 &&
    !isSubmitting;

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!canSubmit) return;
    setSubmitError(null);
    setIsSubmitting(true);
    try {
      // 1. Save passport data to the main tenant guest record
      const mainGuest = (guests ?? []).find((g) => g.isMainTenant);
      if (mainGuest) {
        await updatePassport.mutateAsync({
          guestId: mainGuest.id,
          data: {
            firstName: passportFirstName.trim(),
            lastName: passportLastName.trim(),
            passportNumber: passportNumber.trim(),
            nationality: passportNationality.trim(),
            dateOfBirth: passportDob,
            passportExpiry: passportExpiry,
            visaType: passportVisaType || undefined,
            entryDate: passportEntryDate,
            entryPort: passportEntryPort.trim(),
          },
        });
        if (passportPhotos.length > 0) {
          await bookingsApi.uploadPassportPhotos(id!, mainGuest.id, passportPhotos);
        }
      }

      // 2. Sign the contract
      await signContract.mutateAsync({
        typedName: typedName.trim(),
        signatureImage: signatureFile ?? undefined,
      });
      toast.success("Agreement signed!");
      navigate(`/me/guest/bookings/${id}`);
    } catch (err: unknown) {
      const status = (err as { response?: { status?: number } } | null)?.response?.status;
      // 409/422 here almost always means the signing deadline passed between
      // the form mount and submit — the contract was voided server-side.
      // Tell the tenant exactly that instead of a generic failure.
      const isExpired = status === 409 || status === 410 || status === 422;
      const apiMsg =
        (err as { response?: { data?: { message?: string; title?: string } } })?.response?.data?.message ??
        (err as { response?: { data?: { message?: string; title?: string } } })?.response?.data?.title;
      const msg = isExpired
        ? "The signing window closed while you were filling this in. This booking is cancelled and any payment will be refunded — you'll need a new booking to proceed."
        : apiMsg ?? "Failed to sign agreement. Please try again.";
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
            <a
              href={contract.draftPdfUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2 text-sm font-semibold text-brand hover:underline"
            >
              <FileText size={14} />View contract (PDF)
            </a>
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
        </div>
      </div>

      {/* Signing form — only shown when pending tenant signature */}
      {!alreadySigned && (
        <form onSubmit={handleSubmit} className="space-y-5">

        {/* ── Passport / identity data ── */}
        <div className="bg-bg-card rounded-2xl shadow-card overflow-hidden">
          <div className="px-5 pt-4 pb-3 border-b border-border flex items-center gap-2">
            <Shield size={15} className="text-fg-muted" />
            <h2 className="text-sm font-semibold text-fg">Your identity details</h2>
            <span className="ml-auto text-xs text-danger font-medium">Required to sign</span>
          </div>
          <div className="p-5 space-y-4">
            <p className="text-xs text-fg-muted leading-relaxed">
              Required for TM-30 immigration reporting. Stored encrypted and shared only with your landlord.
            </p>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label className="text-xs text-fg-muted">First name <span className="text-danger">*</span></Label>
                <Input value={passportFirstName} onChange={(e) => setPassportFirstName(e.target.value)} placeholder="As on passport" />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs text-fg-muted">Last name <span className="text-danger">*</span></Label>
                <Input value={passportLastName} onChange={(e) => setPassportLastName(e.target.value)} placeholder="As on passport" />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label className="text-xs text-fg-muted">Nationality <span className="text-danger">*</span></Label>
                <NationalityInput value={passportNationality} onChange={setPassportNationality} />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs text-fg-muted">Date of birth <span className="text-danger">*</span></Label>
                <DateInput value={passportDob} onChange={setPassportDob} maxYear={new Date().getFullYear()} />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label className="text-xs text-fg-muted">Passport number <span className="text-danger">*</span></Label>
                <Input value={passportNumber} onChange={(e) => setPassportNumber(e.target.value)} placeholder="e.g. 7123456789" className="font-mono" />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs text-fg-muted">Passport expiry <span className="text-danger">*</span></Label>
                <DateInput value={passportExpiry} onChange={setPassportExpiry} minYear={2000} maxYear={2060} />
              </div>
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs text-fg-muted">Visa type</Label>
              <Select value={passportVisaType} onValueChange={setPassportVisaType}>
                <SelectTrigger><SelectValue placeholder="Select visa type…" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value={VisaType.VisaExempt}>Visa Exempt (30 days)</SelectItem>
                  <SelectItem value={VisaType.Tourist}>Tourist Visa (TR)</SelectItem>
                  <SelectItem value={VisaType.NonImmigrantB}>Non-Immigrant B (Business)</SelectItem>
                  <SelectItem value={VisaType.NonImmigrantO}>Non-Immigrant O (Family/Retirement)</SelectItem>
                  <SelectItem value={VisaType.NonImmigrantOA}>Non-Immigrant O-A (Long Stay)</SelectItem>
                  <SelectItem value={VisaType.Education}>Education Visa (ED)</SelectItem>
                  <SelectItem value={VisaType.SpecialTourist}>Special Tourist Visa (STV)</SelectItem>
                  <SelectItem value={VisaType.Other}>Other</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label className="text-xs text-fg-muted">Entry date <span className="text-danger">*</span></Label>
                <DateInput value={passportEntryDate} onChange={setPassportEntryDate} minYear={2015} maxYear={new Date().getFullYear()} />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs text-fg-muted">Entry port <span className="text-danger">*</span></Label>
                <Input value={passportEntryPort} onChange={(e) => setPassportEntryPort(e.target.value)} placeholder="Suvarnabhumi…" />
              </div>
            </div>
            <p className="text-[11px] text-fg-muted leading-relaxed">
              Entry date &amp; port come from the immigration stamp in your passport — the date and airport/border crossing of your most recent Thai entry.
            </p>

            {/* Passport photo guide + upload */}
            <PassportPageGuide />
            <div className="space-y-1.5">
              <Label className="text-xs text-fg-muted">Upload passport pages (up to 3 photos)</Label>
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

            {/* Typed name */}
            <div className="space-y-1.5">
              <Label htmlFor="typedName" className="text-sm font-medium text-fg">
                Full name <span className="text-fg-muted font-normal">(as electronic signature)</span>
              </Label>
              <Input
                id="typedName"
                placeholder="Your full legal name"
                value={typedName}
                onChange={(e) => setTypedName(e.target.value)}
                autoComplete="name"
              />
            </div>

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
              className="w-full bg-brand hover:bg-[var(--color-primary-hover)] text-white rounded-xl h-11 text-sm font-semibold disabled:opacity-50"
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
