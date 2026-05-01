import { useState } from "react";
import { Copy, Check, Users, Building2, BookOpen } from "lucide-react";
import { PageHeader } from "@/components/shared/page-header";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useGenerateInvite } from "@/lib/hooks/use-invites";
import { useAssets } from "@/lib/hooks/use-assets";
import { useBookings } from "@/lib/hooks/use-bookings";
import { InviteType } from "@/lib/types/enums";
import { formatDate } from "@/lib/utils/format";
import { toast } from "sonner";
import { cn } from "@/lib/utils/cn";

type InviteMode = "landlord" | "tenant";

export default function TeamPage() {
  const generate = useGenerateInvite();
  const { data: assets } = useAssets();
  const { data: bookings } = useBookings();

  const [mode, setMode] = useState<InviteMode>("landlord");
  const [assetId, setAssetId] = useState("");
  const [bookingId, setBookingId] = useState("");
  const [recipientEmail, setRecipientEmail] = useState("");
  const [recipientName, setRecipientName] = useState("");
  const [generated, setGenerated] = useState<{ link: string; expiresAt: string } | null>(null);
  const [copied, setCopied] = useState(false);

  const canSubmit = mode === "landlord" ? !!assetId : !!bookingId;

  async function handleGenerate() {
    const entityId = mode === "landlord" ? assetId : bookingId;
    const type = mode === "landlord" ? InviteType.OwnerInvite : InviteType.TenantInvite;
    if (!entityId) {
      toast.error(mode === "landlord" ? "Select a property first" : "Select a booking first");
      return;
    }
    try {
      const result = await generate.mutateAsync({ entityId, type } as never);
      setGenerated({ link: result.link, expiresAt: result.expiresAt });
    } catch {
      toast.error("Failed to generate invite");
    }
  }

  function handleCopy() {
    if (!generated) return;
    navigator.clipboard.writeText(generated.link);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
    toast.success("Link copied");
  }

  function handleModeChange(m: InviteMode) {
    setMode(m);
    setAssetId("");
    setBookingId("");
    setGenerated(null);
  }

  return (
    <div>
      <PageHeader
        title="Team & Access"
        description="Invite landlords and tenants to access properties."
      />

      <div className="grid lg:grid-cols-2 gap-6 items-start">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Users className="h-5 w-5" />
              Generate invite link
            </CardTitle>
            <CardDescription>
              Landlords get property-level access. Tenants get access to a specific booking.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-5">
            {/* Mode toggle */}
            <div className="grid grid-cols-2 gap-3">
              <button
                onClick={() => handleModeChange("landlord")}
                className={cn(
                  "flex flex-col items-center gap-1.5 p-3 rounded-xl border-2 transition-all text-sm font-medium",
                  mode === "landlord"
                    ? "border-primary bg-primary/5 text-primary"
                    : "border-border text-muted-foreground hover:border-primary/50"
                )}
              >
                <Building2 className="h-5 w-5" />
                Landlord
                <span className="text-xs font-normal opacity-70">Property access</span>
              </button>
              <button
                onClick={() => handleModeChange("tenant")}
                className={cn(
                  "flex flex-col items-center gap-1.5 p-3 rounded-xl border-2 transition-all text-sm font-medium",
                  mode === "tenant"
                    ? "border-primary bg-primary/5 text-primary"
                    : "border-border text-muted-foreground hover:border-primary/50"
                )}
              >
                <BookOpen className="h-5 w-5" />
                Tenant
                <span className="text-xs font-normal opacity-70">Booking access</span>
              </button>
            </div>

            {/* Selector */}
            {mode === "landlord" ? (
              <div className="space-y-1.5">
                <Label>Property</Label>
                {!assets?.length ? (
                  <p className="text-sm text-muted-foreground">No properties yet.</p>
                ) : (
                  <Select value={assetId} onValueChange={setAssetId}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select a property…" />
                    </SelectTrigger>
                    <SelectContent>
                      {assets.map((a) => (
                        <SelectItem key={a.id} value={a.id}>
                          {a.internalName}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                )}
              </div>
            ) : (
              <div className="space-y-1.5">
                <Label>Booking</Label>
                {!bookings?.length ? (
                  <p className="text-sm text-muted-foreground">No bookings yet.</p>
                ) : (
                  <Select value={bookingId} onValueChange={setBookingId}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select a booking…" />
                    </SelectTrigger>
                    <SelectContent>
                      {bookings.map((b) => (
                        <SelectItem key={b.id} value={b.id}>
                          {b.listingTitle ?? "Booking"} — {b.checkInDate?.slice(0, 10)}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                )}
              </div>
            )}

            {/* Optional recipient info */}
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <Label>
                  Name <span className="text-xs text-muted-foreground">(optional)</span>
                </Label>
                <Input
                  placeholder="John Doe"
                  value={recipientName}
                  onChange={(e) => setRecipientName(e.target.value)}
                />
              </div>
              <div className="space-y-1">
                <Label>
                  Email <span className="text-xs text-muted-foreground">(optional)</span>
                </Label>
                <Input
                  type="email"
                  placeholder="john@example.com"
                  value={recipientEmail}
                  onChange={(e) => setRecipientEmail(e.target.value)}
                />
              </div>
            </div>

            <Button
              className="w-full"
              onClick={handleGenerate}
              disabled={generate.isPending || !canSubmit}
            >
              {generate.isPending ? "Generating…" : "Generate invite link"}
            </Button>
          </CardContent>
        </Card>

        {/* Result card */}
        {generated ? (
          <Card className="border-green-200 bg-green-50">
            <CardHeader>
              <CardTitle className="text-green-800 text-base">Invite link ready</CardTitle>
              <CardDescription className="text-green-700">
                Expires {formatDate(generated.expiresAt)}
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="bg-white rounded-md p-3 border border-green-200 break-all">
                <p className="text-xs font-mono text-gray-700">{generated.link}</p>
              </div>
              <Button onClick={handleCopy} className="w-full bg-green-700 hover:bg-green-800">
                {copied ? (
                  <>
                    <Check className="h-4 w-4 mr-1" />
                    Copied!
                  </>
                ) : (
                  <>
                    <Copy className="h-4 w-4 mr-1" />
                    Copy link
                  </>
                )}
              </Button>
            </CardContent>
          </Card>
        ) : (
          <div className="hidden lg:flex flex-col items-center justify-center text-center p-8 rounded-xl border-2 border-dashed border-muted h-full min-h-[200px]">
            <Users className="h-8 w-8 text-muted-foreground/40 mb-3" />
            <p className="text-sm text-muted-foreground">
              Generated link will appear here
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
