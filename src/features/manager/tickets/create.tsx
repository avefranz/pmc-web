import { useState } from "react";
import { useNavigate, useSearchParams, Link } from "react-router-dom";
import { ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useCreateTicket } from "@/lib/hooks/use-tickets";
import { useAssets } from "@/lib/hooks/use-assets";
import { TicketKind, TicketType, TicketPriority } from "@/lib/types/enums";
import { toast } from "sonner";

export default function CreateTicketPage() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { data: assets } = useAssets();
  const createTicket = useCreateTicket();

  const [assetId, setAssetId] = useState(searchParams.get("assetId") ?? "");
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [type, setType] = useState<TicketType>(TicketType.Maintenance);
  const [kind, setKind] = useState<TicketKind>(TicketKind.Incident);
  const [priority, setPriority] = useState<TicketPriority>(TicketPriority.Normal);
  const [estimatedCost, setEstimatedCost] = useState(0);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!assetId || !title.trim()) return;
    try {
      const result = await createTicket.mutateAsync({
        assetId,
        title: title.trim(),
        description,
        type,
        kind,
        priority,
        estimatedCost,
      });
      toast.success("Ticket created");
      navigate(`/manager/tickets/${result.id}`);
    } catch {
      toast.error("Failed to create ticket");
    }
  }

  return (
    <div className="max-w-2xl">
      <div className="flex items-center gap-2 mb-6">
        <Link to="/manager/tickets">
          <Button variant="ghost" size="sm">
            <ArrowLeft className="h-4 w-4 mr-1" />Back
          </Button>
        </Link>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>New Ticket</CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-1">
              <Label>Property *</Label>
              <Select value={assetId} onValueChange={setAssetId} required>
                <SelectTrigger><SelectValue placeholder="Select property..." /></SelectTrigger>
                <SelectContent>
                  {assets?.map((a) => (
                    <SelectItem key={a.id} value={a.id}>{a.internalName}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <Label>Kind</Label>
                <Select value={kind} onValueChange={(v) => setKind(v as TicketKind)}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {Object.values(TicketKind).map((k) => (
                      <SelectItem key={k} value={k}>{k}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1">
                <Label>Type</Label>
                <Select value={type} onValueChange={(v) => setType(v as TicketType)}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {Object.values(TicketType).map((t) => (
                      <SelectItem key={t} value={t}>{t}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <Label>Priority</Label>
                <Select value={priority} onValueChange={(v) => setPriority(v as TicketPriority)}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {Object.values(TicketPriority).map((p) => (
                      <SelectItem key={p} value={p}>{p}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1">
                <Label>Est. cost (THB)</Label>
                <Input
                  type="number"
                  min={0}
                  value={estimatedCost}
                  onChange={(e) => setEstimatedCost(Number(e.target.value))}
                />
              </div>
            </div>

            <div className="space-y-1">
              <Label>Title *</Label>
              <Input
                placeholder="Brief description of the issue"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                required
              />
            </div>

            <div className="space-y-1">
              <Label>Description</Label>
              <Textarea
                placeholder="Additional details..."
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                rows={4}
              />
            </div>

            <div className="flex justify-end gap-2">
              <Button type="button" variant="outline" onClick={() => navigate(-1)}>Cancel</Button>
              <Button type="submit" disabled={createTicket.isPending || !assetId || !title.trim()}>
                {createTicket.isPending ? "Creating..." : "Create ticket"}
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
