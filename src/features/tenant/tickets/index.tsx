import { useState } from "react";
import { Link } from "react-router-dom";
import { Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Card, CardContent } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { EmptyState } from "@/components/shared/empty-state";
import { useTickets, useCreateTicket } from "@/lib/hooks/use-tickets";
import { useMyBookings } from "@/lib/hooks/use-bookings";
import { ticketStatusColor, ticketKindIcon } from "@/lib/utils/ticket-status";
import { formatRelative } from "@/lib/utils/format";
import { TicketType, BookingStatus } from "@/lib/types/enums";
import { toast } from "sonner";
import { useNavigate } from "react-router-dom";

export default function TenantTickets() {
  const { data: tickets, isLoading } = useTickets();
  const { data: bookings } = useMyBookings();
  const createTicket = useCreateTicket();
  const navigate = useNavigate();

  const activeBooking = bookings?.find(
    (b) => b.status !== BookingStatus.Completed && b.status !== BookingStatus.Cancelled,
  );

  const [createOpen, setCreateOpen] = useState(false);
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [type, setType] = useState<TicketType>(TicketType.Maintenance);

  async function handleCreate() {
    if (!activeBooking || !title.trim()) return;
    try {
      const result = await createTicket.mutateAsync({
        assetId: activeBooking.assetId,
        bookingId: activeBooking.id,
        title: title.trim(),
        description,
        type,
        estimatedCost: 0,
      });
      toast.success("Ticket submitted");
      setCreateOpen(false);
      setTitle("");
      setDescription("");
      navigate(`/tenant/tickets/${result.id}`);
    } catch {
      toast.error("Failed to submit ticket");
    }
  }

  return (
    <div className="p-4 pb-6">
      <div className="flex items-center justify-between mb-4">
        <h1 className="text-xl font-bold">My Tickets</h1>
        {activeBooking && (
          <Button size="sm" onClick={() => setCreateOpen(true)}>
            <Plus className="h-4 w-4 mr-1" />New
          </Button>
        )}
      </div>

      {isLoading ? (
        <div className="space-y-3">
          {[1, 2, 3].map((i) => <Skeleton key={i} className="h-16" />)}
        </div>
      ) : !tickets?.length ? (
        <EmptyState
          icon="🎫"
          title="No tickets"
          description="Submit a request if you need help or have found an issue."
          action={activeBooking ? <Button onClick={() => setCreateOpen(true)}>Report issue</Button> : undefined}
        />
      ) : (
        <div className="space-y-2">
          {tickets.map((t) => (
            <Link key={t.id} to={`/tenant/tickets/${t.id}`}>
              <div className="bg-white border rounded-xl p-4 flex items-center gap-3 shadow-sm">
                <span className="text-2xl shrink-0">{ticketKindIcon(t.kind)}</span>
                <div className="flex-1 min-w-0">
                  <p className="font-semibold text-sm truncate">{t.title}</p>
                  <p className="text-xs text-muted-foreground">{formatRelative(t.createdAt)}</p>
                </div>
                <Badge className={`text-xs border-0 shrink-0 ${ticketStatusColor(t.status)}`}>{t.status}</Badge>
              </div>
            </Link>
          ))}
        </div>
      )}

      <Dialog open={createOpen} onOpenChange={setCreateOpen}>
        <DialogContent>
          <DialogHeader><DialogTitle>Report an issue</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <div className="space-y-1">
              <Label>Category</Label>
              <Select value={type} onValueChange={(v) => setType(v as TicketType)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value={TicketType.Maintenance}>Maintenance</SelectItem>
                  <SelectItem value={TicketType.Cleaning}>Cleaning</SelectItem>
                  <SelectItem value={TicketType.Utilities}>Utilities</SelectItem>
                  <SelectItem value={TicketType.Complaint}>Complaint</SelectItem>
                  <SelectItem value={TicketType.Request}>Request</SelectItem>
                  <SelectItem value={TicketType.Other}>Other</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1">
              <Label>Title *</Label>
              <Input placeholder="Brief description" value={title} onChange={(e) => setTitle(e.target.value)} />
            </div>
            <div className="space-y-1">
              <Label>Details</Label>
              <Textarea placeholder="What happened? When? Where?" value={description} onChange={(e) => setDescription(e.target.value)} rows={4} />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setCreateOpen(false)}>Cancel</Button>
            <Button onClick={handleCreate} disabled={createTicket.isPending || !title.trim()}>
              {createTicket.isPending ? "Submitting..." : "Submit"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
