import { useState, useRef } from "react";
import { useParams, Link } from "react-router-dom";
import { ArrowLeft, Send, Plus, ChevronDown, Paperclip, X, ZoomIn } from "lucide-react";
import { Lightbox, useLightbox, type LightboxImage } from "@/components/ui/lightbox";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  useTicket,
  useUpdateTicketStatus,
  usePostTicketMessage,
  useToggleChecklistItem,
  useAddChecklistItem,
} from "@/lib/hooks/use-tickets";
import { ticketKeys } from "@/lib/hooks/use-tickets";
import { ticketsApi } from "@/lib/api/tickets.api";
import { useQueryClient } from "@tanstack/react-query";
import { ticketStatusColor, ticketPriorityColor, ticketKindIcon, ticketKindLabel } from "@/lib/utils/ticket-status";
import { formatDate, formatDateTime, formatRelative, formatThb } from "@/lib/utils/format";
import { MessageVisibility, TicketKind } from "@/lib/types/enums";
import { toast } from "sonner";

function TicketThread({ ticketId }: { ticketId: string }) {
  const { data } = useTicket(ticketId);
  const postMessage = usePostTicketMessage(ticketId);
  const qc = useQueryClient();
  const [body, setBody] = useState("");
  const [visibility, setVisibility] = useState<MessageVisibility>(MessageVisibility.Public);
  const [attachedImages, setAttachedImages] = useState<{ file: File; preview: string }[]>([]);
  const [uploading, setUploading] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);
  const [msgLightbox, setMsgLightbox] = useState<{ images: LightboxImage[]; index: number } | null>(null);

  const timeline = [
    ...(data?.messages ?? []).map((m) => ({ type: "message" as const, time: m.createdAt, data: m })),
    ...(data?.events ?? []).map((e) => ({ type: "event" as const, time: e.createdAt, data: e })),
  ].sort((a, b) => new Date(a.time).getTime() - new Date(b.time).getTime());

  function handleFileSelect(e: React.ChangeEvent<HTMLInputElement>) {
    const files = Array.from(e.target.files ?? []);
    const newImages = files.map((f) => ({ file: f, preview: URL.createObjectURL(f) }));
    setAttachedImages((prev) => [...prev, ...newImages]);
    e.target.value = "";
  }

  function removeImage(idx: number) {
    setAttachedImages((prev) => {
      URL.revokeObjectURL(prev[idx].preview);
      return prev.filter((_, i) => i !== idx);
    });
  }

  async function handleSend() {
    if (!body.trim() && attachedImages.length === 0) return;
    setUploading(true);
    const imagesToSend = [...attachedImages];
    try {
      // Post the message and get its ID
      const { id: messageId } = await postMessage.mutateAsync({
        body: body.trim() || "📎",
        visibility,
      });

      // Upload each image as an attachment to the message
      for (const img of imagesToSend) {
        await ticketsApi.uploadMessageAttachment(ticketId, messageId, img.file);
      }

      // Clear compose box only on success
      setBody("");

      // Invalidate once more to pick up attachments
      if (imagesToSend.length > 0) {
        qc.invalidateQueries({ queryKey: ticketKeys.detail(ticketId) });
      }
    } catch {
      toast.error("Failed to send message");
      // body is preserved so the user can retry
    } finally {
      // Always release blob URLs and clear attachments/uploading state
      imagesToSend.forEach((img) => URL.revokeObjectURL(img.preview));
      setAttachedImages([]);
      setUploading(false);
    }
  }

  return (
    <div>
      <h3 className="font-semibold text-sm mb-3">Thread</h3>
      <div className="space-y-3 mb-4">
        {timeline.map((item) => {
          if (item.type === "event") {
            const e = item.data;
            return (
              <div key={e.id} className="flex items-center gap-2 text-xs text-muted-foreground">
                <div className="h-px flex-1 bg-border" />
                <span>
                  {e.eventType === "StatusChanged"
                    ? `Status: ${e.fromValue} → ${e.toValue}`
                    : e.eventType === "AssigneeChanged"
                    ? `Assignee changed`
                    : e.eventType === "Created"
                    ? "Ticket created"
                    : e.eventType}
                </span>
                <span>{formatRelative(e.createdAt)}</span>
                <div className="h-px flex-1 bg-border" />
              </div>
            );
          }

          const msg = item.data;
          const isInternal = msg.visibility === MessageVisibility.Internal;
          return (
            <div
              key={msg.id}
              className={`rounded-lg p-3 text-sm ${
                isInternal ? "bg-amber-50 border border-amber-200" : "bg-muted"
              }`}
            >
              <div className="flex items-center justify-between mb-1">
                <span className="font-medium text-xs">{msg.authorName ?? "Unknown"}</span>
                <div className="flex items-center gap-2">
                  {isInternal && (
                    <Badge className="text-xs bg-amber-100 text-amber-700 border-0">Internal</Badge>
                  )}
                  <span className="text-xs text-muted-foreground">{formatRelative(msg.createdAt)}</span>
                </div>
              </div>
              <p className="whitespace-pre-wrap">{msg.body}</p>
              {msg.attachments.length > 0 && (
                <div className="flex gap-2 mt-2 flex-wrap">
                  {msg.attachments.map((a, ai) => (
                    <button
                      key={a.id}
                      type="button"
                      className="relative group rounded-md overflow-hidden border focus:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                      onClick={() => setMsgLightbox({
                        images: msg.attachments.map((x) => ({ url: x.url, name: x.fileName ?? undefined })),
                        index: ai,
                      })}
                    >
                      <img
                        src={a.url}
                        alt={a.fileName ?? "Attachment"}
                        className="h-24 w-24 object-cover transition-transform duration-200 group-hover:scale-105"
                      />
                      <div className="absolute inset-0 bg-black/0 group-hover:bg-black/30 transition-colors flex items-center justify-center">
                        <ZoomIn className="h-5 w-5 text-white opacity-0 group-hover:opacity-100 transition-opacity" />
                      </div>
                    </button>
                  ))}
                </div>
              )}
            </div>
          );
        })}

        {timeline.length === 0 && (
          <p className="text-xs text-muted-foreground">No messages yet.</p>
        )}
      </div>

      {/* Compose */}
      <div className="space-y-2">
        <Textarea
          placeholder="Write a message..."
          value={body}
          onChange={(e) => setBody(e.target.value)}
          className="min-h-[80px]"
        />

        {/* Image previews */}
        {attachedImages.length > 0 && (
          <div className="flex gap-2 flex-wrap">
            {attachedImages.map((img, idx) => (
              <div key={idx} className="relative group">
                <img src={img.preview} alt="" className="h-16 w-16 object-cover rounded-md border" />
                <button
                  onClick={() => removeImage(idx)}
                  className="absolute -top-1 -right-1 bg-red-500 text-white rounded-full w-4 h-4 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
                >
                  <X className="h-2.5 w-2.5" />
                </button>
              </div>
            ))}
          </div>
        )}

        <input ref={fileRef} type="file" accept="image/*" multiple className="hidden" onChange={handleFileSelect} />

        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline" size="sm">
                  {visibility === MessageVisibility.Public ? "Public" : "Internal"}
                  <ChevronDown className="ml-1 h-3 w-3" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent>
                <DropdownMenuItem onClick={() => setVisibility(MessageVisibility.Public)}>
                  Public — tenant can see
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => setVisibility(MessageVisibility.Internal)}>
                  Internal — managers only
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
            <Button variant="ghost" size="sm" onClick={() => fileRef.current?.click()}>
              <Paperclip className="h-3.5 w-3.5 mr-1" />
              Attach
            </Button>
          </div>
          <Button
            size="sm"
            onClick={handleSend}
            disabled={uploading || postMessage.isPending || (!body.trim() && attachedImages.length === 0)}
          >
            <Send className="h-3.5 w-3.5 mr-1" />
            {uploading ? "Sending..." : "Send"}
          </Button>
        </div>
      </div>
      {msgLightbox && (
        <Lightbox
          images={msgLightbox.images}
          initialIndex={msgLightbox.index}
          open={true}
          onClose={() => setMsgLightbox(null)}
        />
      )}
    </div>
  );
}

function ChecklistPanel({ ticketId }: { ticketId: string }) {
  const { data } = useTicket(ticketId);
  const toggle = useToggleChecklistItem(ticketId);
  const addItem = useAddChecklistItem(ticketId);
  const [newTitle, setNewTitle] = useState("");

  const items = data?.checklistItems ?? [];
  const done = items.filter((i) => i.done).length;

  return (
    <div>
      <div className="flex items-center justify-between mb-3">
        <h3 className="font-semibold text-sm">Checklist</h3>
        <span className="text-xs text-muted-foreground">{done}/{items.length}</span>
      </div>

      {items.length > 0 && (
        <div className="w-full bg-muted rounded-full h-1.5 mb-3">
          <div
            className="bg-primary h-1.5 rounded-full transition-all"
            style={{ width: `${items.length ? (done / items.length) * 100 : 0}%` }}
          />
        </div>
      )}

      <div className="space-y-2 mb-3">
        {items.map((item) => (
          <div key={item.id} className="flex items-start gap-2">
            <input
              type="checkbox"
              checked={item.done}
              onChange={(e) => toggle.mutate({ itemId: item.id, done: e.target.checked })}
              className="mt-0.5 h-4 w-4 rounded border-border cursor-pointer"
            />
            <span className={`text-sm flex-1 ${item.done ? "line-through text-muted-foreground" : ""}`}>
              {item.title}
            </span>
          </div>
        ))}
      </div>

      <div className="flex gap-2">
        <input
          className="flex-1 text-sm border border-input rounded-md px-2 py-1"
          placeholder="Add item..."
          value={newTitle}
          onChange={(e) => setNewTitle(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter" && newTitle.trim()) {
              addItem.mutate(newTitle.trim());
              setNewTitle("");
            }
          }}
        />
        <Button
          size="sm"
          variant="outline"
          disabled={!newTitle.trim() || addItem.isPending}
          onClick={() => { addItem.mutate(newTitle.trim()); setNewTitle(""); }}
        >
          <Plus className="h-3.5 w-3.5" />
        </Button>
      </div>
    </div>
  );
}

export default function TicketDetailPage() {
  const { id } = useParams<{ id: string }>();
  const { data: ticket, isLoading } = useTicket(id!);
  const updateStatus = useUpdateTicketStatus();
  const mediaImages = (ticket?.mediaUrls ?? []).map((url) => ({ url }));
  const { openAt: openMedia, lightbox: mediaLightbox } = useLightbox(mediaImages);

  async function handleStatusChange(status: string) {
    try {
      await updateStatus.mutateAsync({ id: id!, status: status as never });
      toast.success(`Status updated to ${status}`);
    } catch {
      toast.error("Failed to update status");
    }
  }

  if (isLoading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-8 w-64" />
        <Skeleton className="h-48 w-full" />
      </div>
    );
  }

  if (!ticket) return <div className="text-muted-foreground">Ticket not found.</div>;

  return (
    <div>
      <div className="flex items-center gap-2 mb-4">
        <Link to="/manager/tickets">
          <Button variant="ghost" size="sm">
            <ArrowLeft className="h-4 w-4 mr-1" />Tickets
          </Button>
        </Link>
      </div>

      {/* Header */}
      <div className="flex items-start gap-3 mb-6">
        <span className="text-3xl">{ticketKindIcon(ticket.kind)}</span>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1 flex-wrap">
            <span className="text-xs font-mono text-muted-foreground">{ticket.displayId}</span>
            <Badge className="text-xs border-0">{ticketKindLabel(ticket.kind)}</Badge>
            <Badge className={`text-xs border-0 ${ticketStatusColor(ticket.status)}`}>{ticket.status}</Badge>
            <Badge className={`text-xs border-0 ${ticketPriorityColor(ticket.priority)}`}>{ticket.priority}</Badge>
          </div>
          <h1 className="text-xl font-bold">{ticket.title}</h1>
          {ticket.assetName && <p className="text-sm text-muted-foreground mt-1">{ticket.assetName}</p>}
        </div>

        {/* Status transition */}
        {ticket.allowedNextStatuses.length > 0 && (
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button size="sm" disabled={updateStatus.isPending}>
                Change status <ChevronDown className="ml-1 h-3.5 w-3.5" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              {ticket.allowedNextStatuses.map((s) => (
                <DropdownMenuItem key={s} onClick={() => handleStatusChange(s)}>
                  <span className={`inline-block w-2 h-2 rounded-full mr-2 ${ticketStatusColor(s)}`} />
                  {s}
                </DropdownMenuItem>
              ))}
            </DropdownMenuContent>
          </DropdownMenu>
        )}
      </div>

      <div className="grid lg:grid-cols-3 gap-6">
        {/* Left: meta */}
        <div className="space-y-4">
          <Card>
            <CardContent className="p-4 space-y-3 text-sm">
              <div>
                <p className="text-xs text-muted-foreground">Description</p>
                <p className="mt-1 whitespace-pre-wrap">{ticket.description || "—"}</p>
              </div>
              <Separator />
              {ticket.estimatedCost > 0 && (
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Estimated cost</span>
                  <span className="font-medium">{formatThb(ticket.estimatedCost)}</span>
                </div>
              )}
              {ticket.actualCost != null && (
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Actual cost</span>
                  <span className="font-medium">{formatThb(ticket.actualCost)}</span>
                </div>
              )}
              {ticket.dueDate && (
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Due date</span>
                  <span>{formatDate(ticket.dueDate)}</span>
                </div>
              )}
              {ticket.scheduledFor && (
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Scheduled</span>
                  <span>{formatDateTime(ticket.scheduledFor)}</span>
                </div>
              )}
              <div className="flex justify-between">
                <span className="text-muted-foreground">Created</span>
                <span>{formatDate(ticket.createdAt)}</span>
              </div>
              {ticket.bookingId && (
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Booking</span>
                  <Link to={`/manager/bookings/${ticket.bookingId}`} className="text-primary hover:underline text-xs">
                    View booking
                  </Link>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Child tickets */}
          {ticket.children.length > 0 && (
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm">Sub-tickets</CardTitle>
              </CardHeader>
              <CardContent className="p-4 pt-0 space-y-2">
                {ticket.children.map((c) => (
                  <Link key={c.id} to={`/manager/tickets/${c.id}`} className="flex items-center gap-2 text-sm hover:underline">
                    <span className="text-xs">{ticketKindIcon(c.kind)}</span>
                    <span className="flex-1 truncate">{c.title}</span>
                    <Badge className={`text-xs border-0 ${ticketStatusColor(c.status)}`}>{c.status}</Badge>
                  </Link>
                ))}
              </CardContent>
            </Card>
          )}

          {/* Media */}
          {ticket.mediaUrls.length > 0 && (
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm">Media</CardTitle>
              </CardHeader>
              <CardContent className="p-4 pt-0">
                <div className="grid grid-cols-3 gap-2">
                  {ticket.mediaUrls.map((url, i) => (
                    <button
                      key={i}
                      type="button"
                      className="relative group rounded-md overflow-hidden aspect-square focus:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                      onClick={() => openMedia(i)}
                    >
                      <img src={url} alt="" className="w-full h-full object-cover transition-transform duration-200 group-hover:scale-105" />
                      <div className="absolute inset-0 bg-black/0 group-hover:bg-black/30 transition-colors flex items-center justify-center">
                        <ZoomIn className="h-4 w-4 text-white opacity-0 group-hover:opacity-100 transition-opacity" />
                      </div>
                    </button>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}
          {mediaLightbox}
        </div>

        {/* Right: thread + checklist */}
        <div className="lg:col-span-2 space-y-6">
          {ticket.kind === TicketKind.Checklist && (
            <Card>
              <CardContent className="p-5">
                <ChecklistPanel ticketId={id!} />
              </CardContent>
            </Card>
          )}
          <Card>
            <CardContent className="p-5">
              <TicketThread ticketId={id!} />
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
