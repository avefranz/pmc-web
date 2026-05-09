import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useUpdateProfile } from "@/lib/hooks/use-profile";
import { VisaType } from "@/lib/types/enums";
import { toast } from "sonner";

const COUNTRIES: [string, string][] = [
  ["AF","Afghanistan"],["AL","Albania"],["DZ","Algeria"],["AR","Argentina"],["AM","Armenia"],
  ["AU","Australia"],["AT","Austria"],["AZ","Azerbaijan"],["BH","Bahrain"],["BD","Bangladesh"],
  ["BY","Belarus"],["BE","Belgium"],["BR","Brazil"],["BG","Bulgaria"],["KH","Cambodia"],
  ["CA","Canada"],["CL","Chile"],["CN","China"],["CO","Colombia"],["HR","Croatia"],
  ["CY","Cyprus"],["CZ","Czech Republic"],["DK","Denmark"],["EG","Egypt"],["FI","Finland"],
  ["FR","France"],["GE","Georgia"],["DE","Germany"],["GR","Greece"],["HK","Hong Kong"],
  ["HU","Hungary"],["IN","India"],["ID","Indonesia"],["IE","Ireland"],["IL","Israel"],
  ["IT","Italy"],["JP","Japan"],["JO","Jordan"],["KZ","Kazakhstan"],["KW","Kuwait"],
  ["LA","Laos"],["LV","Latvia"],["LB","Lebanon"],["LT","Lithuania"],["MY","Malaysia"],
  ["MX","Mexico"],["MD","Moldova"],["MN","Mongolia"],["MA","Morocco"],["MM","Myanmar"],
  ["NP","Nepal"],["NL","Netherlands"],["NZ","New Zealand"],["NO","Norway"],["OM","Oman"],
  ["PK","Pakistan"],["PH","Philippines"],["PL","Poland"],["PT","Portugal"],["QA","Qatar"],
  ["RO","Romania"],["RU","Russia"],["SA","Saudi Arabia"],["RS","Serbia"],["SG","Singapore"],
  ["SK","Slovakia"],["ZA","South Africa"],["KR","South Korea"],["ES","Spain"],["LK","Sri Lanka"],
  ["SE","Sweden"],["CH","Switzerland"],["TW","Taiwan"],["TH","Thailand"],["TR","Turkey"],
  ["UA","Ukraine"],["AE","United Arab Emirates"],["GB","United Kingdom"],["US","United States"],
  ["UZ","Uzbekistan"],["VN","Vietnam"],
];

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

export function PassportOnboardingStep() {
  const navigate = useNavigate();
  const updateProfile = useUpdateProfile();

  const [nationality, setNationality] = useState("");
  const [passportNumber, setPassportNumber] = useState("");
  const [passportExpiry, setPassportExpiry] = useState("");
  const [visaType, setVisaType] = useState<VisaType | "">("");
  const [lastEntryDate, setLastEntryDate] = useState("");
  const [lastEntryPort, setLastEntryPort] = useState("");

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    try {
      await updateProfile.mutateAsync({
        nationality: nationality || undefined,
        passportNumber: passportNumber || undefined,
        passportExpiry: passportExpiry || undefined,
        visaType: (visaType as VisaType) || undefined,
        lastEntryDate: lastEntryDate || undefined,
        lastEntryPort: lastEntryPort || undefined,
      });
      navigate("/me", { replace: true });
    } catch {
      toast.error("Failed to save. Please try again.");
    }
  }

  function handleSkip() {
    navigate("/me", { replace: true });
  }

  return (
    <div className="max-w-3xl">
      {/* Header */}
      <div className="flex items-center gap-2 mb-6">
        <button
          onClick={() => navigate(-1)}
          className="p-1.5 rounded-lg hover:bg-bg-subtle text-fg-muted hover:text-fg transition-colors"
        >
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="m15 18-6-6 6-6"/></svg>
        </button>
        <h1 className="text-2xl font-semibold text-fg">Personal details</h1>
      </div>

      <div className="bg-bg-card rounded-2xl shadow-card p-6 mb-4">
        <p className="text-sm text-fg-muted mb-6">
          Passport details are required to generate your rental contract and TM30 filing.
        </p>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-1.5">
            <Label className="text-sm font-medium text-fg">Nationality</Label>
            <Select value={nationality} onValueChange={setNationality}>
              <SelectTrigger>
                <SelectValue placeholder="Select country" />
              </SelectTrigger>
              <SelectContent>
                {COUNTRIES.map(([code, name]) => (
                  <SelectItem key={code} value={code}>{name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-1.5">
            <Label className="text-sm font-medium text-fg">Passport number</Label>
            <Input
              value={passportNumber}
              onChange={(e) => setPassportNumber(e.target.value.toUpperCase())}
              placeholder="AB123456"
            />
          </div>

          <div className="space-y-1.5">
            <Label className="text-sm font-medium text-fg">Passport expiry</Label>
            <Input
              type="date"
              value={passportExpiry}
              onChange={(e) => setPassportExpiry(e.target.value)}
            />
          </div>

          <div className="space-y-1.5">
            <Label className="text-sm font-medium text-fg">Visa type</Label>
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

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label className="text-sm font-medium text-fg">Last entry date</Label>
              <Input
                type="date"
                value={lastEntryDate}
                onChange={(e) => setLastEntryDate(e.target.value)}
              />
            </div>
            <div className="space-y-1.5">
              <Label className="text-sm font-medium text-fg">Entry port</Label>
              <Input
                value={lastEntryPort}
                onChange={(e) => setLastEntryPort(e.target.value)}
                placeholder="Suvarnabhumi"
              />
            </div>
          </div>

          <div className="pt-2 flex flex-col gap-2">
            <Button
              type="submit"
              className="w-full bg-brand hover:bg-[var(--color-primary-hover)] text-white font-medium"
              disabled={updateProfile.isPending}
            >
              {updateProfile.isPending ? "Saving…" : "Save"}
            </Button>
            <Button
              type="button"
              variant="ghost"
              className="w-full text-fg-muted"
              onClick={handleSkip}
            >
              Skip for now
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}
