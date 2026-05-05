import { useState } from "react";
import { Link } from "react-router-dom";
import { ArrowLeft, Copy, Check } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useGenerateInvite } from "@/lib/hooks/use-invites";
import { useAssets } from "@/lib/hooks/use-assets";
import { buildInviteUrl } from "@/lib/api/invites.api";
import { InviteType } from "@/lib/types/enums";

export function InviteLandlordPage() {
  const { data: assets } = useAssets();
  const generateInvite = useGenerateInvite();
  const [selectedAssetId, setSelectedAssetId] = useState("");
  const [inviteLink, setInviteLink] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  async function handleGenerate() {
    if (!selectedAssetId) return;
    try {
      const r = await generateInvite.mutateAsync({ entityId: selectedAssetId, type: InviteType.OwnerInvite });
      setInviteLink(buildInviteUrl(r.token));
      toast.success("Invite link generated");
    } catch {
      toast.error("Failed to generate invite");
    }
  }

  function handleCopy() {
    if (!inviteLink) return;
    navigator.clipboard.writeText(inviteLink);
    setCopied(true);
    toast.success("Copied to clipboard");
    setTimeout(() => setCopied(false), 2000);
  }

  return (
    <div className="max-w-lg">
      {/* Back */}
      <div className="flex items-center gap-2 mb-6">
        <Link to="/me/host/managed" className="p-1.5 rounded-lg hover:bg-bg-subtle text-fg-muted hover:text-fg transition-colors">
          <ArrowLeft size={18} />
        </Link>
        <h1 className="text-2xl font-semibold text-fg">Invite landlord</h1>
      </div>

      <div className="bg-bg-card rounded-xl shadow-card p-6 space-y-5">
        <p className="text-sm text-fg-muted">
          Generate a link for a landlord to link their property to your management account. The link expires in 48 hours.
        </p>

        <div className="space-y-1.5">
          <Label className="text-sm font-medium text-fg">Property *</Label>
          <Select value={selectedAssetId} onValueChange={setSelectedAssetId}>
            <SelectTrigger>
              <SelectValue placeholder="Select a property" />
            </SelectTrigger>
            <SelectContent>
              {(assets ?? []).map((a: any) => (
                <SelectItem key={a.id} value={a.id}>{a.internalName}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <Button
          className="w-full bg-brand hover:bg-[var(--color-primary-hover)] text-white"
          disabled={!selectedAssetId || generateInvite.isPending}
          onClick={handleGenerate}
        >
          {generateInvite.isPending ? "Generating…" : "Generate invite link"}
        </Button>

        {inviteLink && (
          <div className="space-y-2">
            <Label className="text-sm font-medium text-fg">Invite link</Label>
            <div className="flex items-center gap-2 p-3 bg-bg-subtle rounded-lg">
              <p className="text-sm text-fg-muted truncate flex-1 font-mono">{inviteLink}</p>
              <Button variant="outline" size="sm" onClick={handleCopy}>
                {copied ? <Check size={14} className="text-success" /> : <Copy size={14} />}
                <span className="ml-1.5">{copied ? "Copied!" : "Copy"}</span>
              </Button>
            </div>
            <p className="text-xs text-fg-muted">Share this link with the landlord. It expires in 48 hours.</p>
          </div>
        )}
      </div>
    </div>
  );
}
