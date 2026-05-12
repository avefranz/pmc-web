import { useState, useId } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useQueryClient } from "@tanstack/react-query";
import {
  ArrowLeft, Plus, Trash2, FileText, Upload,
  Copy, Check, Send, Eye, Pencil,
} from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { DatePicker } from "@/components/ui/date-picker";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  useBooking,
  useBookingGuests,
  useBookingInvoices,
  useBookingTickets,
  useBookingTm30,
  useBookingContract,
  useAddGuest,
  useRemoveGuest,
  useUploadTm30,
  useUpdatePassport,
  useUnlinkTenant,
  useBookingPayment,
  useConfirmReceipt,
  useBookingCancellation,
  useConfirmCancellation,
} from "@/lib/hooks/use-bookings";
import { useGenerateInvite } from "@/lib/hooks/use-invites";
import { buildInviteUrl } from "@/lib/api/invites.api";
import { useCapabilities } from "@/lib/hooks/use-capabilities";
import { usePayInvoice } from "@/lib/hooks/use-finance";
import { bookingsApi } from "@/lib/api/bookings.api";
import { formatDate, formatThb } from "@/lib/utils/format";
import { ticketKindIcon } from "@/lib/utils/ticket-status";
import { PaymentMethod, InvoiceStatus, BookingStatus, Tm30Status, InviteType, VisaType } from "@/lib/types/enums";
import type { BookingGuestDto, UpsertPassportRequest } from "@/lib/types";
import { toast } from "sonner";
import { cn } from "@/lib/utils/cn";

// ─── Country select ───────────────────────────────────────────────────────────

const COUNTRIES: [string, string][] = [
  ["AF","Afghanistan"],["AL","Albania"],["DZ","Algeria"],["AD","Andorra"],["AO","Angola"],
  ["AR","Argentina"],["AM","Armenia"],["AU","Australia"],["AT","Austria"],["AZ","Azerbaijan"],
  ["BH","Bahrain"],["BD","Bangladesh"],["BY","Belarus"],["BE","Belgium"],["BZ","Belize"],
  ["BT","Bhutan"],["BO","Bolivia"],["BA","Bosnia and Herzegovina"],["BR","Brazil"],["BN","Brunei"],
  ["BG","Bulgaria"],["KH","Cambodia"],["CA","Canada"],["CL","Chile"],["CN","China"],
  ["CO","Colombia"],["HR","Croatia"],["CY","Cyprus"],["CZ","Czech Republic"],["DK","Denmark"],
  ["EG","Egypt"],["EE","Estonia"],["ET","Ethiopia"],["FI","Finland"],["FR","France"],
  ["GE","Georgia"],["DE","Germany"],["GH","Ghana"],["GR","Greece"],["HK","Hong Kong"],
  ["HU","Hungary"],["IS","Iceland"],["IN","India"],["ID","Indonesia"],["IR","Iran"],
  ["IQ","Iraq"],["IE","Ireland"],["IL","Israel"],["IT","Italy"],["JP","Japan"],
  ["JO","Jordan"],["KZ","Kazakhstan"],["KE","Kenya"],["KW","Kuwait"],["KG","Kyrgyzstan"],
  ["LA","Laos"],["LV","Latvia"],["LB","Lebanon"],["LT","Lithuania"],["LU","Luxembourg"],
  ["MO","Macau"],["MY","Malaysia"],["MV","Maldives"],["MT","Malta"],["MX","Mexico"],
  ["MD","Moldova"],["MC","Monaco"],["MN","Mongolia"],["ME","Montenegro"],["MA","Morocco"],
  ["MM","Myanmar"],["NP","Nepal"],["NL","Netherlands"],["NZ","New Zealand"],["NG","Nigeria"],
  ["NO","Norway"],["OM","Oman"],["PK","Pakistan"],["PS","Palestine"],["PA","Panama"],
  ["PH","Philippines"],["PL","Poland"],["PT","Portugal"],["QA","Qatar"],["RO","Romania"],
  ["RU","Russia"],["SA","Saudi Arabia"],["RS","Serbia"],["SG","Singapore"],["SK","Slovakia"],
  ["SI","Slovenia"],["ZA","South Africa"],["KR","South Korea"],["ES","Spain"],["LK","Sri Lanka"],
  ["SE","Sweden"],["CH","Switzerland"],["TW","Taiwan"],["TJ","Tajikistan"],["TH","Thailand"],
  ["TN","Tunisia"],["TR","Turkey"],["TM","Turkmenistan"],["UA","Ukraine"],["AE","United Arab Emirates"],
  ["GB","United Kingdom"],["US","United States"],["UZ","Uzbekistan"],["VN","Vietnam"],["YE","Yemen"],
];

const COUNTRY_MAP = new Map(COUNTRIES);

function CountryInput({ value, onChange }: { value?: string; onChange: (v: string) => void }) {
  const listId = useId();
  const [raw, setRaw] = useState(value ?? "");

  function handleChange(e: React.ChangeEvent<HTMLInputElement>) {
    const v = e.target.value;
    setRaw(v);
    const upper = v.trim().toUpperCase();
    if (upper.length === 2 && COUNTRY_MAP.has(upper)) onChange(upper);
    else if (v === "") onChange("");
  }

  function handleBlur(e: React.FocusEvent<HTMLInputElement>) {
    const v = e.target.value.trim();
    const upper = v.toUpperCase();
    if (upper.length === 2 && COUNTRY_MAP.has(upper)) { setRaw(upper); onChange(upper); return; }
    const found = COUNTRIES.find(([, name]) => name.toLowerCase() === v.toLowerCase());
    if (found) { setRaw(found[0]); onChange(found[0]); }
  }

  return (
    <>
      <Input list={listId} value={raw} onChange={handleChange} onBlur={handleBlur} placeholder="Type country name or code…" autoComplete="off" />
      <datalist id={listId}>
        {COUNTRIES.map(([code, name]) => <option key={code} value={code} label={`${name} (${code})`} />)}
      </datalist>
    </>
  );
}

// ─── Passport form fields ─────────────────────────────────────────────────────

function PassportFields({ values, onChange }: { values: UpsertPassportRequest; onChange: (patch: Partial<UpsertPassportRequest>) => void }) {
  return (
    <div className="space-y-3">
      <div className="grid grid-cols-2 gap-3">
        <div className="space-y-1">
          <Label>First name</Label>
          <Input value={values.firstName ?? ""} onChange={(e) => onChange({ firstName: e.target.value })} />
        </div>
        <div className="space-y-1">
          <Label>Last name</Label>
          <Input value={values.lastName ?? ""} onChange={(e) => onChange({ lastName: e.target.value })} />
        </div>
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div className="space-y-1">
          <Label>Date of birth</Label>
          <DatePicker value={values.dateOfBirth} onChange={(v) => onChange({ dateOfBirth: v })} />
        </div>
        <div className="space-y-1">
          <Label>Nationality</Label>
          <CountryInput value={values.nationality} onChange={(v) => onChange({ nationality: v || undefined })} />
        </div>
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div className="space-y-1">
          <Label>Passport number</Label>
          <Input value={values.passportNumber ?? ""} onChange={(e) => onChange({ passportNumber: e.target.value })} />
        </div>
        <div className="space-y-1">
          <Label>Passport expiry</Label>
          <DatePicker value={values.passportExpiry} onChange={(v) => onChange({ passportExpiry: v })} />
          <p className="text-xs text-fg-muted">Must be a future date</p>
        </div>
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div className="space-y-1">
          <Label>Visa type</Label>
          <Select value={values.visaType ?? ""} onValueChange={(v) => onChange({ visaType: v as VisaType })}>
            <SelectTrigger><SelectValue placeholder="Select…" /></SelectTrigger>
            <SelectContent>
              {Object.values(VisaType).map((v) => <SelectItem key={v} value={v}>{v}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-1">
          <Label>Entry date</Label>
          <DatePicker value={values.entryDate} onChange={(v) => onChange({ entryDate: v })} />
        </div>
      </div>
      <div className="space-y-1">
        <Label>Entry port</Label>
        <Input placeholder="Suvarnabhumi, Don Mueang…" value={values.entryPort ?? ""} onChange={(e) => onChange({ entryPort: e.target.value })} />
      </div>
    </div>
  );
}

// ─── Guest card ───────────────────────────────────────────────────────────────

function GuestCard({ guest, bookingId }: { guest: BookingGuestDto; bookingId: string }) {
  const { data: tm30 } = useBookingTm30(bookingId, guest.id);
  const uploadTm30 = useUploadTm30(bookingId, guest.id);
  const updatePassport = useUpdatePassport(bookingId);
  const removeGuest = useRemoveGuest(bookingId);
  const generateInvite = useGenerateInvite();
  const { data: caps } = useCapabilities();

  const [passportOpen, setPassportOpen] = useState(false);
  const [removeOpen, setRemoveOpen] = useState(false);
  const [passport, setPassport] = useState<UpsertPassportRequest>({});
  const [inviteLink, setInviteLink] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  function openPassport() {
    setPassport({
      firstName: guest.firstName,
      lastName: guest.lastName,
      dateOfBirth: guest.dateOfBirth,
      nationality: guest.nationality,
      passportNumber: guest.passportNumber,
      passportExpiry: guest.passportExpiry,
      visaType: guest.visaType,
      entryDate: guest.entryDate,
      entryPort: guest.entryPort,
    });
    setPassportOpen(true);
  }

  async function handleSavePassport() {
    try {
      await updatePassport.mutateAsync({ guestId: guest.id, data: passport });
      toast.success("Passport updated");
      setPassportOpen(false);
    } catch {
      toast.error("Failed to save passport data");
    }
  }

  async function handleInvite() {
    try {
      const result = await generateInvite.mutateAsync({ entityId: bookingId, type: InviteType.TenantInvite, guestId: guest.id });
      setInviteLink(buildInviteUrl(result.token));
    } catch {
      toast.error("Failed to generate invite link");
    }
  }

  function handleCopy() {
    if (!inviteLink) return;
    navigator.clipboard.writeText(inviteLink);
    setCopied(true);
    toast.success("Link copied");
    setTimeout(() => setCopied(false), 2000);
  }

  const hasPassport = !!(guest.passportNumber || guest.nationality || guest.visaType);
  const tm30Filed = tm30?.status === Tm30Status.Filed;

  return (
    <>
      <div className="bg-bg-card rounded-xl shadow-card p-4 space-y-3">
        {/* Name row */}
        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="text-sm font-semibold text-fg">
                {guest.firstName || guest.lastName
                  ? `${guest.firstName ?? ""} ${guest.lastName ?? ""}`.trim()
                  : <span className="text-fg-muted italic">No name</span>}
              </span>
              {guest.isMainTenant && (
                <span className="text-xs px-2 py-0.5 rounded-full bg-fg text-bg font-medium">Main tenant</span>
              )}
              {guest.userId
                ? <span className="text-xs px-2 py-0.5 rounded-full bg-success/10 text-success font-medium">Joined</span>
                : <span className="text-xs px-2 py-0.5 rounded-full bg-bg-subtle text-fg-muted font-medium">Not joined</span>
              }
            </div>
            {hasPassport && (
              <div className="mt-1 space-y-0.5 text-xs text-fg-muted font-mono">
                {guest.passportNumber && <p>Passport: {guest.passportNumber}{guest.passportExpiry ? ` · exp ${formatDate(guest.passportExpiry)}` : ""}</p>}
                {(guest.nationality || guest.visaType) && <p>{[guest.nationality, guest.visaType].filter(Boolean).join(" · ")}</p>}
                {guest.dateOfBirth && <p>DOB: {formatDate(guest.dateOfBirth)}</p>}
                {guest.entryDate && <p>Entry: {formatDate(guest.entryDate)}{guest.entryPort ? ` via ${guest.entryPort}` : ""}</p>}
              </div>
            )}
          </div>
          <div className="flex items-center gap-1 shrink-0">
            <button onClick={openPassport} className="p-1.5 rounded-lg hover:bg-bg-subtle text-fg-muted hover:text-fg transition-colors" title="Edit passport">
              <Pencil size={13} />
            </button>
            <button onClick={() => setRemoveOpen(true)} className="p-1.5 rounded-lg hover:bg-danger/10 text-fg-muted hover:text-danger transition-colors" title="Remove guest">
              <Trash2 size={13} />
            </button>
          </div>
        </div>

        {/* TM-30 row */}
        <div className="flex items-center justify-between pt-3 border-t border-border gap-2">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-xs font-mono text-fg-muted font-medium">TM-30</span>
            {tm30Filed
              ? <span className="text-xs px-2 py-0.5 rounded-full bg-success/10 text-success font-medium">Filed{tm30?.filedAt ? ` ${formatDate(tm30.filedAt)}` : ""}</span>
              : <span className="text-xs px-2 py-0.5 rounded-full bg-warning/10 text-warning font-medium">Pending</span>
            }
            {tm30Filed && tm30?.documentUrl && (
              <a href={tm30.documentUrl} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 text-xs text-fg-muted hover:text-fg transition-colors">
                <Eye size={11} />View
              </a>
            )}
          </div>
          <label className={cn("flex items-center gap-1.5 text-xs text-fg-muted hover:text-fg transition-colors cursor-pointer", uploadTm30.isPending && "opacity-50 pointer-events-none")}>
            <Upload size={13} />
            {uploadTm30.isPending ? "Uploading…" : tm30Filed ? "Replace" : "Upload PDF"}
            <input type="file" accept=".pdf,.jpg,.jpeg,.png" className="hidden" onChange={(e) => {
              const file = e.target.files?.[0];
              if (!file) return;
              uploadTm30.mutate(file, {
                onSuccess: () => toast.success("TM-30 uploaded"),
                onError: () => toast.error("Failed to upload TM-30"),
              });
              e.target.value = "";
            }} />
          </label>
        </div>

        {/* Portal invite row — only managers can generate invites */}
        {caps?.isManager && !guest.userId && !inviteLink ? (
          <div className="flex items-center justify-between pt-1">
            <span className="text-xs text-fg-muted">Portal access</span>
            <button
              className="flex items-center gap-1.5 text-xs text-fg-muted hover:text-fg transition-colors"
              onClick={handleInvite}
              disabled={generateInvite.isPending}
            >
              <Send size={12} />
              {generateInvite.isPending ? "Generating…" : "Send invite"}
            </button>
          </div>
        ) : inviteLink ? (
          <div className="pt-1 space-y-1.5">
            <div className="flex items-center gap-2">
              <p className="flex-1 text-xs font-mono text-fg-muted bg-bg-subtle rounded-lg px-2 py-1 truncate">{inviteLink}</p>
              <button className="p-1.5 rounded-lg hover:bg-bg-subtle text-fg-muted hover:text-fg transition-colors" onClick={handleCopy}>
                {copied ? <Check size={12} className="text-success" /> : <Copy size={12} />}
              </button>
            </div>
            <button className="text-xs text-fg-muted hover:text-fg transition-colors" onClick={() => setInviteLink(null)}>Dismiss</button>
          </div>
        ) : null}
      </div>

      {/* Remove dialog */}
      <Dialog open={removeOpen} onOpenChange={setRemoveOpen}>
        <DialogContent className="max-w-sm">
          <DialogHeader><DialogTitle>Remove guest</DialogTitle></DialogHeader>
          <p className="text-sm text-fg-muted">
            Remove{" "}
            <span className="font-semibold text-fg">
              {guest.firstName || guest.lastName ? `${guest.firstName ?? ""} ${guest.lastName ?? ""}`.trim() : "this guest"}
            </span>
            {guest.isMainTenant ? " (main tenant)" : ""}? This cannot be undone.
          </p>
          <DialogFooter>
            <Button variant="outline" onClick={() => setRemoveOpen(false)} disabled={removeGuest.isPending}>Cancel</Button>
            <Button
              className="bg-danger hover:bg-danger/90 text-white"
              disabled={removeGuest.isPending}
              onClick={() => removeGuest.mutate(guest.id, {
                onSuccess: () => { toast.success("Guest removed"); setRemoveOpen(false); },
                onError: () => toast.error("Failed to remove guest"),
              })}
            >
              {removeGuest.isPending ? "Removing…" : "Remove"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Passport dialog */}
      <Dialog open={passportOpen} onOpenChange={setPassportOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Passport — {guest.firstName ?? guest.lastName ?? "Guest"}</DialogTitle>
          </DialogHeader>
          <PassportFields values={passport} onChange={(patch) => setPassport((p) => ({ ...p, ...patch }))} />
          <DialogFooter>
            <Button variant="outline" onClick={() => setPassportOpen(false)}>Cancel</Button>
            <Button className="bg-brand hover:bg-[var(--color-primary-hover)] text-white" onClick={handleSavePassport} disabled={updatePassport.isPending}>
              {updatePassport.isPending ? "Saving…" : "Save"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}

// ─── Invoice type labels ──────────────────────────────────────────────────────

const INVOICE_TYPE_LABELS: Record<string, string> = {
  Rent: "Total rent",
  Deposit: "Security deposit",
  Utilities: "Utilities",
  Cleaning: "Cleaning fee",
  Damage: "Damage fee",
  Other: "Other",
};

// ─── Ticket status badge ──────────────────────────────────────────────────────

function ticketStatusClass(status: string): string {
  if (["Verified", "Completed"].includes(status)) return "bg-success/10 text-success";
  if (["Blocked", "Rejected"].includes(status)) return "bg-danger/10 text-danger";
  if (["PendingApproval", "Pending", "Triaging", "Quoted"].includes(status)) return "bg-warning/10 text-warning";
  return "bg-bg-subtle text-fg-muted";
}

const TICKET_STATUS_LABELS: Record<string, string> = {
  Triaging: "Under review",
  PendingApproval: "Pending approval",
  InProgress: "In progress",
  Verified: "Work done",
  Reopened: "Re-opened",
};

// ─── Main page ────────────────────────────────────────────────────────────────

export function BookingDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const qc = useQueryClient();

  const { data: booking, isLoading } = useBooking(id!);
  const { data: guests } = useBookingGuests(id!);
  const { data: invoices } = useBookingInvoices(id!);
  const { data: tickets } = useBookingTickets(id!);
  const { data: contractData } = useBookingContract(id!, !!booking?.hasContract);
  const { data: paymentData } = useBookingPayment(id!);
  const cancellationEnabled = booking?.status === BookingStatus.Active || booking?.status === BookingStatus.Confirmed;
  const { data: cancellation } = useBookingCancellation(id!, cancellationEnabled);
  const confirmReceipt = useConfirmReceipt(id!);
  const confirmCancellation = useConfirmCancellation(id!);
  const addGuest = useAddGuest(id!);
  const payInvoice = usePayInvoice();

  const [addGuestOpen, setAddGuestOpen] = useState(false);
  const [newGuest, setNewGuest] = useState<UpsertPassportRequest>({});

  const [payOpen, setPayOpen] = useState<string | null>(null);
  const [payAmount, setPayAmount] = useState("");
  const [payMethod, setPayMethod] = useState<PaymentMethod>(PaymentMethod.BankTransfer);

  const [contractUploading, setContractUploading] = useState(false);
  const [unlinkTenantOpen, setUnlinkTenantOpen] = useState(false);
  const unlinkTenant = useUnlinkTenant(id!);

  async function handleAddGuest() {
    try {
      await addGuest.mutateAsync(newGuest);
      toast.success("Guest added");
      setAddGuestOpen(false);
      setNewGuest({});
    } catch (err: unknown) {
      const apiErrors = (err as { response?: { data?: { errors?: Record<string, string[]> } } })?.response?.data?.errors;
      if (apiErrors) {
        toast.error(Object.values(apiErrors).flat().join(" · "));
      } else {
        toast.error("Failed to add guest");
      }
    }
  }

  async function handlePay() {
    if (!payOpen || !payAmount) return;
    try {
      await payInvoice.mutateAsync({ invoiceId: payOpen, data: { method: payMethod, amount: Number(payAmount) } });
      toast.success("Payment registered");
      setPayOpen(null);
      setPayAmount("");
    } catch {
      toast.error("Failed to register payment");
    }
  }

  async function handleUploadContract(file: File) {
    setContractUploading(true);
    try {
      await bookingsApi.uploadContract(id!, file);
      qc.invalidateQueries({ queryKey: ["bookings", id] });
      qc.invalidateQueries({ queryKey: ["bookings", id, "contract"] });
      toast.success("Contract uploaded");
    } catch {
      toast.error("Failed to upload contract");
    } finally {
      setContractUploading(false);
    }
  }

  if (isLoading) {
    return (
      <div className="space-y-4 max-w-3xl">
        <Skeleton className="h-8 w-64" />
        <div className="grid grid-cols-3 gap-4"><Skeleton className="h-24" /><Skeleton className="h-24" /><Skeleton className="h-24" /></div>
        <Skeleton className="h-48" />
      </div>
    );
  }
  if (!booking) return <p className="text-sm text-fg-muted">Booking not found.</p>;

  const statusClass: Record<string, string> = {
    [BookingStatus.Active]:         "bg-success/10 text-success",
    [BookingStatus.Confirmed]:      "bg-bg text-fg",
    [BookingStatus.PendingPayment]: "bg-warning/10 text-warning",
    [BookingStatus.Completed]:      "bg-bg-subtle text-fg-muted",
    [BookingStatus.Cancelled]:      "bg-danger/10 text-danger",
  };

  const pendingInvoices = (invoices ?? []).filter(
    (inv) => inv.status === InvoiceStatus.Pending || inv.status === InvoiceStatus.PartiallyPaid,
  );

  // Lease duration & monthly rate
  const checkInDate = new Date(booking.checkInDate);
  const checkOutDate = new Date(booking.checkOutDate);
  const durationMonths = (checkOutDate.getFullYear() - checkInDate.getFullYear()) * 12 + (checkOutDate.getMonth() - checkInDate.getMonth());
  const monthlyRate = durationMonths > 0 ? Math.round(booking.rentAmount / durationMonths) : booking.rentAmount;
  const totalDays = Math.round((checkOutDate.getTime() - checkInDate.getTime()) / 86_400_000);
  const daysLeft = booking.daysRemaining;
  const isActive = booking.status === BookingStatus.Active;
  const leaseProgress = (isActive && daysLeft != null && totalDays > 0)
    ? Math.min(100, Math.round(((totalDays - daysLeft) / totalDays) * 100))
    : null;
  const monthsLeft = (daysLeft != null && daysLeft > 0) ? Math.ceil(daysLeft / 30) : null;
  const openTickets = (tickets ?? []).filter(
    (t) => !["Closed", "Completed", "Cancelled", "Canceled", "Verified"].includes(t.status),
  );

  return (
    <div className="space-y-6">
      {/* Back */}
      <button
        className="flex items-center gap-1.5 text-sm text-fg-muted hover:text-fg transition-colors"
        onClick={() => navigate(booking ? `/me/host/properties/${booking.assetId}` : "/me/host/properties")}
      >
        <ArrowLeft size={16} />Back to property
      </button>

      {/* Header */}
      <div className="flex items-start justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-semibold text-fg">
              {booking.tenantName ?? booking.listingTitle ?? "Booking"}
            </h1>
            {booking.tenantName && (
              <button
                className="p-1.5 rounded-lg hover:bg-danger/10 text-fg-muted hover:text-danger transition-colors"
                title="Remove tenant"
                onClick={() => setUnlinkTenantOpen(true)}
              >
                <Trash2 size={14} />
              </button>
            )}
          </div>
          <p className="text-sm text-fg-muted mt-1">
            {formatDate(booking.checkInDate)} → {formatDate(booking.checkOutDate)}
          </p>
          {booking.listingTitle && (
            <p className="text-xs text-fg-muted">{booking.listingTitle}</p>
          )}
        </div>
        <span className={cn("text-xs px-2.5 py-1 rounded-full font-medium shrink-0", statusClass[booking.status] ?? "bg-bg-subtle text-fg-muted")}>
          {booking.status}
        </span>
      </div>

      {/* Key figures */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <div className="bg-bg-card rounded-xl shadow-card p-5">
          <p className="text-xs text-fg-muted mb-1">Monthly rent</p>
          <p className="text-xl font-semibold text-fg">{formatThb(monthlyRate)}</p>
          {durationMonths > 0 && <p className="text-xs text-fg-muted mt-1">{durationMonths} mo · {formatThb(booking.rentAmount)} total</p>}
        </div>
        <div className="bg-bg-card rounded-xl shadow-card p-5">
          <p className="text-xs text-fg-muted mb-1">Deposit</p>
          <p className="text-xl font-semibold text-fg">{formatThb(booking.depositAmount)}</p>
        </div>
        <div className="bg-bg-card rounded-xl shadow-card p-5">
          <p className="text-xs text-fg-muted mb-1">Contract</p>
          <div className="flex items-center justify-between gap-2 mt-1">
            <div className="flex items-center gap-2">
              {booking.hasContract
                ? <span className="flex items-center gap-1 text-xs font-medium text-success"><FileText size={12} />On file</span>
                : <span className="text-xs font-medium text-warning">Not uploaded</span>
              }
              {(contractData?.url ?? booking.contractUrl) && (
                <a href={contractData?.url ?? booking.contractUrl!} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 text-xs text-fg-muted hover:text-fg transition-colors">
                  <Eye size={11} />View
                </a>
              )}
            </div>
            <label className={cn("flex items-center gap-1 text-xs text-fg-muted hover:text-fg transition-colors cursor-pointer", contractUploading && "opacity-50 pointer-events-none")}>
              <Upload size={12} />
              {contractUploading ? "Uploading…" : booking.hasContract ? "Replace" : "Upload"}
              <input type="file" accept=".pdf,.doc,.docx" className="hidden" onChange={(e) => {
                const file = e.target.files?.[0];
                if (file) handleUploadContract(file);
                e.currentTarget.value = "";
              }} />
            </label>
          </div>
        </div>
        {/* Time remaining card */}
        <div className="bg-bg-card rounded-xl shadow-card p-5">
          {isActive && daysLeft != null && leaseProgress !== null ? (
            <>
              <p className="text-xs text-fg-muted mb-1">Time remaining</p>
              <p className={cn("text-xl font-semibold", daysLeft <= 14 ? "text-danger" : daysLeft <= 30 ? "text-warning" : "text-fg")}>
                {daysLeft}d
                {monthsLeft != null && monthsLeft > 0 && <span className="text-sm font-normal text-fg-muted ml-1">≈{monthsLeft}mo</span>}
              </p>
              <div className="mt-2 h-1.5 bg-bg-subtle rounded-full overflow-hidden">
                <div
                  className={cn("h-full rounded-full", daysLeft <= 14 ? "bg-danger" : daysLeft <= 30 ? "bg-warning" : "bg-success")}
                  style={{ width: `${leaseProgress}%` }}
                />
              </div>
            </>
          ) : (
            <>
              <p className="text-xs text-fg-muted mb-1">Duration</p>
              <p className="text-xl font-semibold text-fg">{durationMonths > 0 ? `${durationMonths} mo` : "—"}</p>
              <p className="text-xs text-fg-muted mt-1">{formatDate(booking.checkInDate)} → {formatDate(booking.checkOutDate)}</p>
            </>
          )}
        </div>
      </div>

      {/* Two-column body */}
      <div className="grid grid-cols-1 lg:grid-cols-[1fr_360px] gap-6 items-start">

        {/* LEFT: Payments timeline */}
        <div>
          <h2 className="text-sm font-semibold text-fg mb-3">Payments</h2>
          {!invoices?.length ? (
            <p className="text-sm text-fg-muted">No invoices yet.</p>
          ) : (
            <div className="space-y-3">
              {invoices.map((inv) => {
                const isFullRent = inv.type === "Rent" && inv.amount != null && inv.amount === booking.rentAmount && durationMonths > 1;

                // ── Monthly rent: date-aware timeline ──
                if (isFullRent) {
                  const today = new Date();
                  today.setHours(0, 0, 0, 0);
                  const isPaid = inv.status === InvoiceStatus.Paid;

                  const months: { label: string; date: Date; isPast: boolean; isCurrent: boolean }[] = [];
                  for (let m = 0; m < durationMonths; m++) {
                    const d = new Date(booking.checkInDate);
                    d.setDate(1);
                    d.setMonth(d.getMonth() + m);
                    const monthEnd = new Date(d.getFullYear(), d.getMonth() + 1, 0);
                    const isPast = monthEnd < today;
                    const isCurrent = d.getFullYear() === today.getFullYear() && d.getMonth() === today.getMonth();
                    months.push({
                      label: d.toLocaleString("en", { month: "long", year: "numeric" }),
                      date: d,
                      isPast,
                      isCurrent,
                    });
                  }

                  const paidMonths = isPaid ? durationMonths : 0;
                  const dueMonths = months.filter((m) => m.isPast || m.isCurrent).length;
                  const overduePending = !isPaid && dueMonths > 0;

                  return (
                    <div key={inv.id} className="bg-bg-card rounded-xl shadow-card overflow-hidden">
                      {/* Header */}
                      <div className="px-5 pt-4 pb-3.5 flex items-center justify-between border-b border-border">
                        <div>
                          <p className="text-sm font-semibold text-fg">Monthly rent</p>
                          <p className="text-xs text-fg-muted mt-0.5">{formatThb(monthlyRate)} / month · {durationMonths} months total</p>
                        </div>
                        {isPaid ? (
                          <span className="text-xs font-semibold text-success bg-success/10 px-2.5 py-1 rounded-full">✓ All paid</span>
                        ) : overduePending ? (
                          <span className="text-xs font-semibold text-warning bg-warning/10 px-2.5 py-1 rounded-full">{dueMonths - paidMonths} month{dueMonths - paidMonths !== 1 ? "s" : ""} due</span>
                        ) : (
                          <span className="text-xs font-semibold text-fg-muted bg-bg-subtle px-2.5 py-1 rounded-full">{paidMonths}/{durationMonths} paid</span>
                        )}
                      </div>

                      {/* Month rows */}
                      <div className="divide-y divide-border">
                        {months.map((m, i) => {
                          const rowPaid = isPaid;
                          const isDue = !isPaid && (m.isPast || m.isCurrent);
                          const isUpcoming = !isPaid && !m.isPast && !m.isCurrent;

                          return (
                            <div key={i} className={cn(
                              "px-5 py-3 flex items-center justify-between gap-3",
                              m.isCurrent && !isPaid && "bg-warning/5",
                            )}>
                              <div className="flex items-center gap-3">
                                <div className={cn(
                                  "w-2 h-2 rounded-full shrink-0",
                                  rowPaid ? "bg-success" : isDue ? "bg-warning" : "bg-fg-subtle/40",
                                )} />
                                <div>
                                  <p className={cn("text-sm font-medium", isUpcoming ? "text-fg-muted" : "text-fg")}>{m.label}</p>
                                  {m.isCurrent && !isPaid && <p className="text-[10px] text-warning font-medium">Due this month</p>}
                                  {m.isPast && !isPaid && <p className="text-[10px] text-danger font-medium">Overdue</p>}
                                  {isUpcoming && <p className="text-[10px] text-fg-subtle">Upcoming</p>}
                                </div>
                              </div>
                              <div className="flex items-center gap-2.5 shrink-0">
                                <span className={cn("text-sm font-semibold", isUpcoming ? "text-fg-muted" : "text-fg")}>
                                  {formatThb(monthlyRate)}
                                </span>
                                {rowPaid ? (
                                  <span className="text-[10px] px-1.5 py-0.5 rounded-full font-semibold bg-success/10 text-success">Paid</span>
                                ) : isDue ? (
                                  <Button
                                    size="sm"
                                    className="h-7 px-2.5 text-xs bg-brand hover:bg-[var(--color-primary-hover)] text-white rounded-lg"
                                    onClick={() => { setPayOpen(inv.id); setPayAmount(String(monthlyRate)); }}
                                  >
                                    Confirm
                                  </Button>
                                ) : (
                                  <span className="text-[10px] px-1.5 py-0.5 rounded-full font-semibold bg-bg-subtle text-fg-subtle">Pending</span>
                                )}
                              </div>
                            </div>
                          );
                        })}
                      </div>

                      {/* Footer summary */}
                      {isPaid && (
                        <div className="px-5 py-3 bg-success/5 border-t border-success/10 flex items-center gap-2">
                          <span className="text-xs text-success font-semibold">✓ Fully paid — {formatThb(inv.amount!)} received</span>
                        </div>
                      )}
                    </div>
                  );
                }

                // ── Other invoices (deposit, utilities, etc.) ──
                return (
                  <div key={inv.id} className="bg-bg-card rounded-xl shadow-card p-4 flex items-center justify-between gap-3">
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-medium text-fg">{inv.description || INVOICE_TYPE_LABELS[inv.type] || inv.type}</p>
                      {inv.dueDate && <p className="text-xs text-fg-muted">Due {formatDate(inv.dueDate)}</p>}
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      {inv.amount != null && <p className="text-sm font-semibold text-fg">{formatThb(inv.amount)}</p>}
                      <span className={cn("text-xs px-2 py-0.5 rounded-full font-medium", {
                        "bg-success/10 text-success": inv.status === InvoiceStatus.Paid,
                        "bg-bg text-fg": inv.status === InvoiceStatus.PartiallyPaid,
                        "bg-bg-subtle text-fg-muted": inv.status === InvoiceStatus.Cancelled,
                        "bg-warning/10 text-warning": inv.status === InvoiceStatus.Pending,
                      })}>
                        {inv.status}
                      </span>
                      {(inv.status === InvoiceStatus.Pending || inv.status === InvoiceStatus.PartiallyPaid) && (
                        <Button size="sm" variant="outline" onClick={() => { setPayOpen(inv.id); setPayAmount(String(inv.amount ?? "")); }}>Mark as paid</Button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* RIGHT: Guests + Tickets */}
        <div className="space-y-6">
          {/* Guests */}
          <div>
            <div className="flex items-center justify-between mb-3">
              <h2 className="text-sm font-semibold text-fg">Guests</h2>
              <Button size="sm" className="bg-brand hover:bg-[var(--color-primary-hover)] text-white" onClick={() => setAddGuestOpen(true)}>
                <Plus size={13} className="mr-1" />Add guest
              </Button>
            </div>
            {!guests?.length ? (
              <p className="text-sm text-fg-muted">No guests added yet. Add a guest to enable TM-30 filing and portal access.</p>
            ) : (
              <div className="space-y-3">
                {guests.map((g) => <GuestCard key={g.id} guest={g} bookingId={id!} />)}
              </div>
            )}
          </div>

          {/* Tickets */}
          <div>
            <h2 className="text-sm font-semibold text-fg mb-3">Tickets</h2>
            {!tickets?.length ? (
              <p className="text-sm text-fg-muted">No tickets for this booking.</p>
            ) : (
              <div className="space-y-2">
                {tickets.map((t) => (
                  <div key={t.id} className="bg-bg-card rounded-xl shadow-card p-3 flex items-center gap-3">
                    <span className="text-base shrink-0">{ticketKindIcon(t.kind)}</span>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-fg truncate">{t.title}</p>
                      <p className="text-xs text-fg-muted">{t.displayId}</p>
                    </div>
                    <span className={cn("text-xs px-2 py-0.5 rounded-full font-medium shrink-0", ticketStatusClass(t.status))}>
                      {TICKET_STATUS_LABELS[t.status] ?? t.status}
                    </span>
                  </div>
                ))}
                {openTickets.length > 0 && (
                  <p className="text-xs text-fg-muted">{openTickets.length} open ticket{openTickets.length > 1 ? "s" : ""}</p>
                )}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* ── Payment confirmation (PendingPayment) ── */}
      {paymentData && booking.status === BookingStatus.PendingPayment && (
        <div className="bg-warning/10 border border-warning/20 rounded-2xl p-5 space-y-3">
          <h3 className="text-sm font-semibold text-fg">Pending payments</h3>
          {(paymentData.payments ?? []).map((p) => (
            <div key={p.id} className="flex items-center justify-between gap-3">
              <div>
                <p className="text-sm text-fg">{p.type === "Deposit" ? "Security deposit" : p.type === "FirstMonth" ? "First month's rent" : "Early exit penalty"}</p>
                <p className="text-xs text-fg-muted">{formatThb(p.amount)}</p>
              </div>
              <div className="flex items-center gap-2">
                {p.status === "TenantConfirmed" && (
                  <>
                    <span className="text-xs bg-warning/10 text-warning font-medium px-2 py-0.5 rounded-full">Tenant confirmed</span>
                    <Button
                      size="sm"
                      className="h-8 px-3 text-xs bg-success hover:bg-success/90 text-white rounded-lg"
                      disabled={confirmReceipt.isPending}
                      onClick={async () => {
                        try {
                          await confirmReceipt.mutateAsync(p.id);
                          toast.success("Payment confirmed");
                        } catch {
                          toast.error("Failed to confirm");
                        }
                      }}
                    >
                      Confirm receipt
                    </Button>
                  </>
                )}
                {p.status === "LandlordConfirmed" && (
                  <span className="text-xs bg-success/10 text-success font-medium px-2 py-0.5 rounded-full">Confirmed</span>
                )}
                {p.status === "Pending" && (
                  <span className="text-xs bg-bg-subtle text-fg-muted font-medium px-2 py-0.5 rounded-full">Awaiting tenant</span>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* ── Early exit confirmation ── */}
      {cancellation && cancellation.status === "Requested" && (
        <div className="bg-danger/10 border border-danger/20 rounded-2xl p-5 space-y-3">
          <h3 className="text-sm font-semibold text-fg">Early exit request</h3>
          <div className="grid grid-cols-2 gap-3 text-sm">
            <div>
              <p className="text-xs text-fg-muted">Earliest exit</p>
              <p className="font-medium text-fg">{formatDate(cancellation.earliestExitDate)}</p>
            </div>
            <div>
              <p className="text-xs text-fg-muted">Penalty</p>
              <p className="font-medium text-fg">{formatThb(cancellation.penaltyAmount)}</p>
            </div>
            <div>
              <p className="text-xs text-fg-muted">Deposit refund</p>
              <p className="font-medium text-fg">{formatThb(cancellation.depositRefundAmount)}</p>
            </div>
            <div>
              <p className="text-xs text-fg-muted">Net refund to tenant</p>
              <p className="font-semibold text-fg">{formatThb(cancellation.netRefund)}</p>
            </div>
          </div>
          {cancellation.tenantNote && (
            <p className="text-xs text-fg-muted italic">"{cancellation.tenantNote}"</p>
          )}
          <Button
            className="w-full bg-danger hover:bg-danger/90 text-white rounded-xl h-10"
            disabled={confirmCancellation.isPending}
            onClick={async () => {
              try {
                await confirmCancellation.mutateAsync(cancellation.id);
                toast.success("Early exit confirmed — booking cancelled");
              } catch {
                toast.error("Failed to confirm");
              }
            }}
          >
            {confirmCancellation.isPending ? "Confirming…" : "Confirm early exit"}
          </Button>
        </div>
      )}

      {/* ── Dialogs ── */}

      {/* Add guest */}
      <Dialog open={addGuestOpen} onOpenChange={(v) => { setAddGuestOpen(v); if (!v) setNewGuest({}); }}>
        <DialogContent className="max-w-lg">
          <DialogHeader><DialogTitle>Add guest</DialogTitle></DialogHeader>
          <p className="text-xs text-fg-muted">All fields are optional — you can fill in passport details later.</p>
          <PassportFields values={newGuest} onChange={(patch) => setNewGuest((p) => ({ ...p, ...patch }))} />
          <DialogFooter>
            <Button variant="outline" onClick={() => { setAddGuestOpen(false); setNewGuest({}); }}>Cancel</Button>
            <Button className="bg-brand hover:bg-[var(--color-primary-hover)] text-white" onClick={handleAddGuest} disabled={addGuest.isPending}>
              {addGuest.isPending ? "Adding…" : "Add guest"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Unlink tenant */}
      <Dialog open={unlinkTenantOpen} onOpenChange={setUnlinkTenantOpen}>
        <DialogContent className="max-w-sm">
          <DialogHeader><DialogTitle>Remove tenant</DialogTitle></DialogHeader>
          <p className="text-sm text-fg-muted">
            Remove{" "}
            <span className="font-semibold text-fg">{booking.tenantName}</span>{" "}
            from this booking? The booking status will reset to <strong>Pending</strong>. You can send a new invite afterwards.
          </p>
          <DialogFooter>
            <Button variant="outline" onClick={() => setUnlinkTenantOpen(false)} disabled={unlinkTenant.isPending}>Cancel</Button>
            <Button
              className="bg-danger hover:bg-danger/90 text-white"
              disabled={unlinkTenant.isPending}
              onClick={async () => {
                try {
                  await unlinkTenant.mutateAsync();
                  toast.success("Tenant removed");
                  setUnlinkTenantOpen(false);
                } catch {
                  toast.error("Failed to remove tenant");
                }
              }}
            >
              {unlinkTenant.isPending ? "Removing…" : "Remove"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Pay invoice */}
      <Dialog open={!!payOpen} onOpenChange={(v) => !v && setPayOpen(null)}>
        <DialogContent>
          <DialogHeader><DialogTitle>Register payment</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <div className="space-y-1">
              <Label>Amount (THB)</Label>
              <Input type="number" value={payAmount} onChange={(e) => setPayAmount(e.target.value)} autoFocus />
            </div>
            <div className="space-y-1">
              <Label>Method</Label>
              <Select value={payMethod} onValueChange={(v) => setPayMethod(v as PaymentMethod)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {Object.values(PaymentMethod).map((m) => <SelectItem key={m} value={m}>{m}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setPayOpen(null)}>Cancel</Button>
            <Button className="bg-brand hover:bg-[var(--color-primary-hover)] text-white" onClick={handlePay} disabled={payInvoice.isPending || !payAmount}>
              {payInvoice.isPending ? "Saving…" : "Confirm payment"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
