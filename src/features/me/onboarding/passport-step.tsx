import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { ArrowLeft, AlertTriangle, Check } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { DateInput } from "@/components/ui/date-input";
import { NationalityInput } from "@/components/ui/nationality-input";
import { useMyProfile, useUpdateProfile } from "@/lib/hooks/use-profile";
import { VisaType } from "@/lib/types/enums";
import { cn } from "@/lib/utils/cn";
import { toast } from "sonner";

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

function FieldLabel({ children, optional }: { children: React.ReactNode; optional?: boolean }) {
  return (
    <Label className="text-xs font-medium text-fg flex items-center gap-1.5">
      {children}
      {optional && <span className="text-fg-subtle font-normal">optional</span>}
    </Label>
  );
}

export function PassportOnboardingStep({ embedded = false }: { embedded?: boolean } = {}) {
  const navigate = useNavigate();
  const { data: profile } = useMyProfile();
  const updateProfile = useUpdateProfile();

  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [dateOfBirth, setDateOfBirth] = useState("");
  const [nationality, setNationality] = useState("");
  const [passportNumber, setPassportNumber] = useState("");
  const [passportExpiry, setPassportExpiry] = useState("");
  const [visaType, setVisaType] = useState<VisaType | "">("");
  const [lastEntryDate, setLastEntryDate] = useState("");
  const [lastEntryPort, setLastEntryPort] = useState("");

  useEffect(() => {
    if (!profile) return;
    setFirstName(profile.firstName ?? "");
    setLastName(profile.lastName ?? "");
    setDateOfBirth(profile.dateOfBirth ?? "");
    setNationality(profile.nationality ?? "");
    setPassportNumber(profile.passportNumber ?? "");
    setPassportExpiry(profile.passportExpiry ?? "");
    setVisaType(profile.visaType ?? "");
    setLastEntryDate(profile.lastEntryDate ?? "");
    setLastEntryPort(profile.lastEntryPort ?? "");
  }, [profile]);

  const required = [firstName, lastName, dateOfBirth, nationality, passportNumber, passportExpiry, visaType];
  const isComplete = required.every((v) => !!v);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    try {
      await updateProfile.mutateAsync({
        firstName: firstName || undefined,
        lastName: lastName || undefined,
        dateOfBirth: dateOfBirth || undefined,
        nationality: nationality || undefined,
        passportNumber: passportNumber || undefined,
        passportExpiry: passportExpiry || undefined,
        visaType: (visaType as VisaType) || undefined,
        lastEntryDate: lastEntryDate || undefined,
        lastEntryPort: lastEntryPort || undefined,
      });
      toast.success("Saved");
      navigate("/me", { replace: true });
    } catch {
      toast.error("Failed to save. Please try again.");
    }
  }

  return (
    <div className={embedded ? "" : "max-w-4xl"}>
      {!embedded && (
        <div className="flex items-center gap-2 mb-6">
          <button
            onClick={() => navigate(-1)}
            className="p-1.5 rounded-lg hover:bg-bg-subtle text-fg-muted hover:text-fg transition-colors"
            aria-label="Back"
          >
            <ArrowLeft size={18} />
          </button>
        </div>
      )}

      <form onSubmit={handleSubmit} className="bg-bg-card rounded-2xl shadow-card p-6 md:p-8">
        {/* Section head: title+sub on left, status pill on right */}
        <div className="flex items-start justify-between gap-4 mb-6">
          <div>
            <h2 className="text-xl font-semibold text-fg">Personal details &amp; passport</h2>
            <p className="text-sm text-fg-muted mt-1 max-w-2xl">
              We need these to generate your rental contract and for your host to file TM30 with Thai immigration.
            </p>
          </div>
          <span className={cn(
            "shrink-0 inline-flex items-center gap-1.5 px-3 py-1 rounded-pill text-xs font-medium border",
            isComplete
              ? "bg-success/10 text-success border-success/30"
              : "bg-warning/10 text-warning border-warning/30",
          )}>
            {isComplete ? <Check size={12} /> : <AlertTriangle size={12} />}
            {isComplete ? "Complete" : "Incomplete"}
          </span>
        </div>

        <div className="flex flex-col gap-4">
          {/* Row: legal names */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3 md:gap-4">
            <div className="space-y-1.5">
              <FieldLabel>Legal first name</FieldLabel>
              <Input value={firstName} onChange={(e) => setFirstName(e.target.value)} placeholder="Nikita" />
            </div>
            <div className="space-y-1.5">
              <FieldLabel>Legal last name</FieldLabel>
              <Input value={lastName} onChange={(e) => setLastName(e.target.value)} placeholder="Kuzin" />
            </div>
          </div>

          {/* Row: nationality + DOB */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3 md:gap-4">
            <div className="space-y-1.5">
              <FieldLabel>Nationality</FieldLabel>
              <NationalityInput value={nationality} onChange={setNationality} placeholder="Select nationality…" />
            </div>
            <div className="space-y-1.5">
              <FieldLabel>Date of birth</FieldLabel>
              <DateInput value={dateOfBirth} onChange={setDateOfBirth} minYear={1920} maxYear={new Date().getFullYear()} />
            </div>
          </div>

          {/* Row: passport number + expiry + visa */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3 md:gap-4">
            <div className="space-y-1.5">
              <FieldLabel>Passport number</FieldLabel>
              <Input
                value={passportNumber}
                onChange={(e) => setPassportNumber(e.target.value.toUpperCase())}
                placeholder="AB123456"
              />
            </div>
            <div className="space-y-1.5">
              <FieldLabel>Passport expiry</FieldLabel>
              <DateInput value={passportExpiry} onChange={setPassportExpiry} minYear={2000} maxYear={2060} />
            </div>
            <div className="space-y-1.5">
              <FieldLabel>Visa type</FieldLabel>
              <Select value={visaType} onValueChange={(v) => setVisaType(v as VisaType)}>
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
          </div>

          {/* Row: last entry (optional) */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3 md:gap-4">
            <div className="space-y-1.5">
              <FieldLabel optional>Last entry to Thailand</FieldLabel>
              <DateInput value={lastEntryDate} onChange={setLastEntryDate} minYear={2015} maxYear={new Date().getFullYear()} />
            </div>
            <div className="space-y-1.5">
              <FieldLabel optional>Entry port</FieldLabel>
              <Input
                value={lastEntryPort}
                onChange={(e) => setLastEntryPort(e.target.value)}
                placeholder="Suvarnabhumi"
              />
            </div>
          </div>
        </div>

        {/* Foot: cancel + save */}
        <div className="flex items-center justify-end gap-2 mt-6 pt-5 border-t border-border">
          <Button
            type="button"
            variant="ghost"
            className="text-fg-muted"
            onClick={() => navigate(-1)}
          >
            Cancel
          </Button>
          <Button
            type="submit"
            className="bg-brand hover:bg-[var(--color-primary-hover)] text-white font-medium px-5"
            disabled={updateProfile.isPending}
          >
            {updateProfile.isPending ? "Saving…" : "Save changes"}
          </Button>
        </div>
      </form>
    </div>
  );
}
