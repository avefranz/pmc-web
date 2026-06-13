import { Link } from "react-router-dom";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

// A person's name is entered once, at registration, and edited only on the
// profile page. Everywhere else it's shown read-only and pulled from the
// profile so the same name can't drift across forms. This renders the two
// read-only First/Last inputs plus the "change it in your profile" footnote.
export function ProfileNameReadonly({
  firstName,
  lastName,
  label = "Full name",
}: {
  firstName: string;
  lastName: string;
  label?: string;
}) {
  // When the profile has no name yet, the read-only fields are blank and any
  // section that requires the name (e.g. landlord identity) can't be completed.
  // Make that obvious with a warning + link instead of the neutral footnote, so
  // the user isn't left staring at an empty block wondering what's wrong.
  const isEmpty = !firstName.trim() && !lastName.trim();
  return (
    <div className="space-y-1.5">
      <Label className="text-sm font-medium text-fg">{label}</Label>
      <div className="grid grid-cols-2 gap-3">
        <Input
          value={firstName}
          readOnly
          tabIndex={-1}
          placeholder="First name"
          className="cursor-not-allowed bg-bg-subtle text-fg-muted"
        />
        <Input
          value={lastName}
          readOnly
          tabIndex={-1}
          placeholder="Last name"
          className="cursor-not-allowed bg-bg-subtle text-fg-muted"
        />
      </div>
      {isEmpty ? (
        <p className="text-xs text-warning">
          Your name isn't set yet —{" "}
          <Link to="/me/profile" className="font-medium underline underline-offset-2 hover:opacity-80">
            add it in your profile
          </Link>{" "}
          first.
        </p>
      ) : (
        <p className="text-xs text-fg-muted">
          From your profile. To change it,{" "}
          <Link to="/me/profile" className="text-brand underline underline-offset-2 hover:opacity-80">
            update your profile
          </Link>
          .
        </p>
      )}
    </div>
  );
}
