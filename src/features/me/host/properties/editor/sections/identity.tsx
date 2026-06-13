import { useEffect } from "react";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { DatePicker } from "@/components/ui/date-picker";
import { useMyProfile } from "@/lib/hooks/use-profile";
import { ProfileNameReadonly } from "@/components/shared/profile-name-readonly";
import type { LandlordIdType } from "@/lib/types";
import type { SectionDef, SectionDialogProps } from "../types";
import { Field } from "../ui";

const NOT_IN_PAST = (d: Date) => {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  return d < today;
};

// Host legal identity — printed verbatim on the rental contract. Collected here
// during the first property so that contract signing later only needs a
// signature (the legal name / ID / address are already on file).
function IdentityDialog({ draft, patch }: SectionDialogProps) {
  const isPassport = draft.identityIdType === "passport";
  const { data: profile } = useMyProfile();
  const profileFirst = profile?.firstName ?? "";
  const profileLast = profile?.lastName ?? "";

  // Name is owned by the profile (edited there only). Keep the draft in sync so
  // the legal name we join for the contract always matches the profile.
  useEffect(() => {
    if (draft.identityFirstName !== profileFirst || draft.identityLastName !== profileLast) {
      patch({ identityFirstName: profileFirst, identityLastName: profileLast });
    }
  }, [profileFirst, profileLast, draft.identityFirstName, draft.identityLastName, patch]);

  return (
    <div>
      {/* Name comes from the profile, read-only — change it there. */}
      <div className="mb-4">
        <ProfileNameReadonly firstName={profileFirst} lastName={profileLast} label="Legal name" />
      </div>

      <Field label="ID type" required>
        <Select
          value={draft.identityIdType}
          onValueChange={(v) => patch({ identityIdType: v as LandlordIdType })}
        >
          <SelectTrigger>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="passport">Passport</SelectItem>
            <SelectItem value="thai_id">Thai national ID</SelectItem>
          </SelectContent>
        </Select>
      </Field>

      <Field label={isPassport ? "Passport number" : "Thai ID number"} required>
        <Input
          className="font-mono"
          value={draft.identityIdNumber}
          onChange={(e) => patch({ identityIdNumber: e.target.value })}
          placeholder={isPassport ? "e.g. AA1234567" : "1234567890123"}
        />
      </Field>

      {/* Passports expire; a Thai national ID doesn't — only ask when relevant. */}
      {isPassport && (
        <Field label="Passport expiry" hint="Optional, but recommended.">
          <DatePicker
            value={draft.identityIdExpiry}
            onChange={(v) => patch({ identityIdExpiry: v })}
            placeholder="Select expiry date"
            isDisabled={NOT_IN_PAST}
            startView="year"
            contentClassName="z-[200]"
          />
        </Field>
      )}

      <Field
        label="Residential address"
        required
        hint="Your registered residential address — printed on the contract."
      >
        <textarea
          value={draft.identityResidentialAddress}
          onChange={(e) => patch({ identityResidentialAddress: e.target.value })}
          placeholder="House no., street, subdistrict, district, province, postcode"
          rows={3}
          className="w-full rounded-lg border border-border bg-bg-card px-3 py-2 text-sm text-fg placeholder:text-fg-subtle focus:outline-none focus:ring-2 focus:ring-brand/30 resize-none"
        />
      </Field>
    </div>
  );
}

export const identitySection: SectionDef = {
  id: "identity",
  label: "Your legal identity",
  group: "host",
  required: true,
  estTime: "1 min",
  isComplete: (d) =>
    d.identityFirstName.trim().length > 0 &&
    d.identityLastName.trim().length > 0 &&
    d.identityIdNumber.trim().length > 0 &&
    d.identityResidentialAddress.trim().length > 0,
  summary: (d) => {
    const fullName = [d.identityFirstName.trim(), d.identityLastName.trim()].filter(Boolean).join(" ");
    if (!fullName) return "—";
    const idLabel = d.identityIdType === "passport" ? "Passport" : "Thai ID";
    return `${fullName} · ${idLabel}`;
  },
  Form: IdentityDialog,
};
