import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { ArrowLeft } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import { Checkbox } from "@/components/ui/checkbox";
import { useMyProfile, useUpdateProfile } from "@/lib/hooks/use-profile";
import type { ContactChannel } from "@/lib/types";

const CHANNELS: { value: ContactChannel; label: string; emoji: string }[] = [
  { value: "Call",     label: "Call",      emoji: "📞" },
  { value: "Sms",      label: "SMS",       emoji: "💬" },
  { value: "WhatsApp", label: "WhatsApp",  emoji: "🟢" },
  { value: "Telegram", label: "Telegram",  emoji: "✈️" },
  { value: "Line",     label: "LINE",      emoji: "🟩" },
  { value: "WeChat",   label: "WeChat",    emoji: "🟢" },
];

const COUNTRY_CODES = ["+66", "+7", "+1", "+44", "+49", "+33", "+81", "+82", "+86", "+91"];

export function ContactSettingsPage() {
  const { data: profile, isLoading } = useMyProfile();
  const updateProfile = useUpdateProfile();

  const [countryCode, setCountryCode] = useState("+66");
  const [phone, setPhone] = useState("");
  const [selected, setSelected] = useState<Set<ContactChannel>>(new Set());
  const [lineHandle, setLineHandle] = useState("");

  useEffect(() => {
    if (profile) {
      setCountryCode(profile.phoneCountryCode ?? "+66");
      setPhone(profile.phone ?? "");
      setSelected(new Set(profile.contactChannels ?? []));
      setLineHandle(profile.lineHandle ?? "");
    }
  }, [profile]);

  function toggle(ch: ContactChannel) {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(ch)) next.delete(ch);
      else next.add(ch);
      // Clear LINE handle if LINE deselected
      if (ch === "Line" && next.has("Line") === false) setLineHandle("");
      return next;
    });
  }

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    try {
      await updateProfile.mutateAsync({
        phoneCountryCode: countryCode,
        phone: phone.trim() || undefined,
        contactChannels: selected.size > 0 ? [...selected] : [],
        lineHandle: selected.has("Line") ? (lineHandle.trim() || null) : null,
      });
      toast.success("Contact details saved");
    } catch {
      toast.error("Failed to save");
    }
  }

  if (isLoading) {
    return (
      <div className="max-w-3xl space-y-4">
        <Skeleton className="h-8 w-48" />
        <Skeleton className="h-64 rounded-2xl" />
      </div>
    );
  }

  return (
    <div className="max-w-3xl">
      <div className="flex items-center gap-2 mb-6">
        <Link
          to="/me/profile"
          className="p-1.5 rounded-lg hover:bg-bg-subtle text-fg-muted hover:text-fg transition-colors"
        >
          <ArrowLeft size={18} />
        </Link>
        <h1 className="text-2xl font-semibold text-fg">Contact details</h1>
      </div>

      <form onSubmit={handleSave} className="space-y-4">
        <div className="bg-bg-card rounded-2xl shadow-card p-6 space-y-5">
          <p className="text-sm text-fg-muted">
            Your contact details are shared with tenants only after their booking is confirmed or active.
          </p>

          {/* Phone number */}
          <div className="space-y-1.5">
            <Label className="text-sm font-medium text-fg">Phone number</Label>
            <div className="flex gap-2">
              <select
                value={countryCode}
                onChange={(e) => setCountryCode(e.target.value)}
                className="h-10 rounded-lg border border-border bg-bg px-2 text-sm text-fg focus:outline-none focus:ring-2 focus:ring-brand/30 shrink-0"
              >
                {COUNTRY_CODES.map((c) => (
                  <option key={c} value={c}>{c}</option>
                ))}
              </select>
              <Input
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                placeholder="812345678"
                className="font-mono flex-1"
              />
            </div>
          </div>

          {/* Messaging apps */}
          <div className="space-y-3">
            <Label className="text-sm font-medium text-fg">Available on</Label>
            <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
              {CHANNELS.map(({ value, label, emoji }) => (
                <label
                  key={value}
                  className={`flex items-center gap-3 rounded-xl border px-4 py-3 cursor-pointer transition-colors select-none ${
                    selected.has(value)
                      ? "border-brand bg-brand/5 text-fg"
                      : "border-border bg-bg hover:bg-bg-subtle text-fg-muted"
                  }`}
                >
                  <Checkbox
                    checked={selected.has(value)}
                    onCheckedChange={() => toggle(value)}
                    className="shrink-0"
                  />
                  <span className="text-sm font-medium leading-none">
                    {emoji} {label}
                  </span>
                </label>
              ))}
            </div>

            {/* LINE handle — shown only when LINE is checked */}
            {selected.has("Line") && (
              <div className="space-y-1.5 pt-1">
                <Label className="text-sm font-medium text-fg">LINE ID</Label>
                <Input
                  value={lineHandle}
                  onChange={(e) => setLineHandle(e.target.value)}
                  placeholder="your_line_id"
                />
                <p className="text-xs text-fg-muted">
                  Your public LINE username (without @). Required to generate a contact link.
                </p>
              </div>
            )}
          </div>
        </div>

        <Button
          type="submit"
          className="w-full bg-brand hover:bg-[var(--color-primary-hover)] text-white rounded-2xl h-12 font-medium"
          disabled={updateProfile.isPending}
        >
          {updateProfile.isPending ? "Saving…" : "Save"}
        </Button>
      </form>
    </div>
  );
}
