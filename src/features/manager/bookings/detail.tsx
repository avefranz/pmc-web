import { useState, useId } from "react";
import { useParams, useNavigate, Link } from "react-router-dom";
import { useQueryClient } from "@tanstack/react-query";
import {
  ArrowLeft, Plus, Trash2, FileText, Upload,
  Copy, Check, Send, Eye, Pencil,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
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
} from "@/lib/hooks/use-bookings";
import { useGenerateInvite } from "@/lib/hooks/use-invites";
import { buildInviteUrl } from "@/lib/api/invites.api";
import { usePayInvoice } from "@/lib/hooks/use-finance";
import { bookingsApi } from "@/lib/api/bookings.api";
import { formatDate, formatThb } from "@/lib/utils/format";
import { ticketStatusColor, ticketKindIcon } from "@/lib/utils/ticket-status";
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
    if (upper.length === 2 && COUNTRY_MAP.has(upper)) {
      onChange(upper);
    } else if (v === "") {
      onChange("");
    }
  }

  function handleBlur(e: React.FocusEvent<HTMLInputElement>) {
    const v = e.target.value.trim();
    const upper = v.toUpperCase();
    if (upper.length === 2 && COUNTRY_MAP.has(upper)) {
      setRaw(upper);
      onChange(upper);
      return;
    }
    const found = COUNTRIES.find(([, name]) => name.toLowerCase() === v.toLowerCase());
    if (found) {
      setRaw(found[0]);
      onChange(found[0]);
    }
  }

  return (
    <>
      <Input
        list={listId}
        value={raw}
        onChange={handleChange}
        onBlur={handleBlur}
        placeholder="Type country name or code…"
        autoComplete="off"
      />
      <datalist id={listId}>
        {COUNTRIES.map(([code, name]) => (
          <option key={code} value={code} label={`${name} (${code})`} />
        ))}
      </datalist>
    </>
  );
}

// ─── Section wrapper ──────────────────────────────────────────────────────────

function Section({
  title, action, children, className,
}: {
  title: string;
  action?: React.ReactNode;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div className={className}>
      <div className="flex items-center justify-between mb-3">
        <h2 className="font-semibold text-base">{title}</h2>
        {action}
      </div>
      {children}
    </div>
  );
}

// ─── Passport form fields (reused in add + edit dialogs) ─────────────────────

function PassportFields({
  values,
  onChange,
}: {
  values: UpsertPassportRequest;
  onChange: (patch: Partial<UpsertPassportRequest>) => void;
}) {
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
          <p className="text-xs text-muted-foreground">Must be a future date</p>
        </div>
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div className="space-y-1">
          <Label>Visa type</Label>
          <Select value={values.visaType ?? ""} onValueChange={(v) => onChange({ visaType: v as VisaType })}>
            <SelectTrigger><SelectValue placeholder="Select…" /></SelectTrigger>
            <SelectContent>
              {Object.values(VisaType).map((v) => (
                <SelectItem key={v} value={v}>{v}</SelectItem>
              ))}
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

// ─── Guest card (with TM-30 + passport + invite inline) ──────────────────────

function GuestCard({
  guest,
  bookingId,
}: {
  guest: BookingGuestDto;
  bookingId: string;
}) {
  const { data: tm30 } = useBookingTm30(bookingId, guest.id);
  const uploadTm30 = useUploadTm30(bookingId, guest.id);
  const updatePassport = useUpdatePassport(bookingId);
  const removeGuest = useRemoveGuest(bookingId);
  const generateInvite = useGenerateInvite();

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
      const result = await generateInvite.mutateAsync({
        entityId: bookingId,
        type: InviteType.TenantInvite,
        guestId: guest.id,
      });
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
      <Card>
        <CardContent className="p-4 space-y-3">
          {/* Name row */}
          <div className="flex items-start justify-between gap-2">
            <div className="min-w-0 flex-1">
              <div className="font-semibold text-sm flex items-center gap-2 flex-wrap">
                {guest.firstName || guest.lastName
                  ? `${guest.firstName ?? ""} ${guest.lastName ?? ""}`.trim()
                  : <span className="text-muted-foreground italic">No name</span>}
                {guest.isMainTenant && (
                  <Badge className="bg-blue-100 text-blue-700 border-0 text-xs">Main tenant</Badge>
                )}
                {guest.userId ? (
                  <Badge className="bg-green-100 text-green-700 border-0 text-xs">Joined</Badge>
                ) : (
                  <Badge className="bg-gray-100 text-gray-500 border-0 text-xs">Not joined</Badge>
                )}
              </div>
              {hasPassport && (
                <div className="text-xs text-muted-foreground mt-0.5 space-y-0.5">
                  {guest.passportNumber && <p>Passport: {guest.passportNumber}{guest.passportExpiry ? ` · exp ${formatDate(guest.passportExpiry)}` : ""}</p>}
                  {(guest.nationality || guest.visaType) && (
                    <p>{[guest.nationality, guest.visaType].filter(Boolean).join(" · ")}</p>
                  )}
                  {guest.dateOfBirth && <p>DOB: {formatDate(guest.dateOfBirth)}</p>}
                  {guest.entryDate && <p>Entry: {formatDate(guest.entryDate)}{guest.entryPort ? ` via ${guest.entryPort}` : ""}</p>}
                </div>
              )}
            </div>
            <div className="flex items-center gap-1 shrink-0">
              <Button variant="ghost" size="icon" className="h-8 w-8" onClick={openPassport} title="Edit passport">
                <Pencil className="h-3.5 w-3.5" />
              </Button>
              <Button
                variant="ghost"
                size="icon"
                className="text-destructive hover:text-destructive h-8 w-8"
                onClick={() => setRemoveOpen(true)}
                title="Remove guest"
              >
                <Trash2 className="h-3.5 w-3.5" />
              </Button>
            </div>
          </div>

          {/* TM-30 row */}
          <div className="flex items-center justify-between pt-2 border-t gap-2">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="text-xs font-medium text-muted-foreground">TM-30</span>
              {tm30Filed ? (
                <Badge className="bg-green-100 text-green-700 border-0 text-xs">
                  Filed{tm30?.filedAt ? ` ${formatDate(tm30.filedAt)}` : ""}
                </Badge>
              ) : (
                <Badge className="bg-amber-100 text-amber-700 border-0 text-xs">Pending</Badge>
              )}
              {tm30Filed && tm30?.documentUrl && (
                <a
                  href={tm30.documentUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-0.5 text-xs text-primary hover:underline"
                >
                  <Eye className="h-3 w-3" />View
                </a>
              )}
            </div>
            <label className={cn(
              "flex items-center gap-1.5 text-xs cursor-pointer text-muted-foreground hover:text-foreground transition-colors shrink-0",
              uploadTm30.isPending && "opacity-50 pointer-events-none",
            )}>
              <Upload className="h-3.5 w-3.5" />
              {uploadTm30.isPending ? "Uploading…" : tm30Filed ? "Replace" : "Upload PDF"}
              <input
                type="file"
                accept=".pdf,.jpg,.jpeg,.png"
                className="hidden"
                onChange={(e) => {
                  const file = e.target.files?.[0];
                  if (!file) return;
                  uploadTm30.mutate(file, {
                    onSuccess: () => toast.success("TM-30 uploaded"),
                    onError: () => toast.error("Failed to upload TM-30"),
                  });
                  e.target.value = "";
                }}
              />
            </label>
          </div>

          {/* Portal invite row */}
          {!guest.userId && !inviteLink ? (
            <div className="flex items-center justify-between pt-1">
              <span className="text-xs text-muted-foreground">Portal access</span>
              <Button
                size="sm"
                variant="outline"
                className="h-7 text-xs"
                onClick={handleInvite}
                disabled={generateInvite.isPending}
              >
                <Send className="h-3 w-3 mr-1" />
                {generateInvite.isPending ? "Generating…" : "Send invite"}
              </Button>
            </div>
          ) : inviteLink ? (
            <div className="pt-1 space-y-1.5">
              <div className="flex items-center gap-1.5">
                <div className="flex-1 bg-muted rounded px-2 py-1 text-xs font-mono truncate">
                  {inviteLink}
                </div>
                <Button size="sm" variant="outline" className="h-7 shrink-0" onClick={handleCopy}>
                  {copied ? <Check className="h-3 w-3" /> : <Copy className="h-3 w-3" />}
                </Button>
              </div>
              <button className="text-xs text-muted-foreground hover:text-foreground" onClick={() => setInviteLink(null)}>
                Dismiss
              </button>
            </div>
          ) : null}
        </CardContent>
      </Card>

      {/* Remove guest dialog */}
      <Dialog open={removeOpen} onOpenChange={setRemoveOpen}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>Remove guest</DialogTitle>
          </DialogHeader>
          <p className="text-sm text-muted-foreground">
            Remove{" "}
            <span className="font-semibold text-foreground">
              {guest.firstName || guest.lastName
                ? `${guest.firstName ?? ""} ${guest.lastName ?? ""}`.trim()
                : "this guest"}
            </span>
            {guest.isMainTenant ? " (main tenant)" : ""}? This cannot be undone.
          </p>
          <DialogFooter>
            <Button variant="outline" onClick={() => setRemoveOpen(false)} disabled={removeGuest.isPending}>
              Cancel
            </Button>
            <Button
              variant="destructive"
              disabled={removeGuest.isPending}
              onClick={() => {
                removeGuest.mutate(guest.id, {
                  onSuccess: () => { toast.success("Guest removed"); setRemoveOpen(false); },
                  onError: () => toast.error("Failed to remove guest"),
                });
              }}
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
            <DialogTitle>
              Passport details — {guest.firstName ?? guest.lastName ?? "Guest"}
            </DialogTitle>
          </DialogHeader>
          <PassportFields
            values={passport}
            onChange={(patch) => setPassport((p) => ({ ...p, ...patch }))}
          />
          <DialogFooter>
            <Button variant="outline" onClick={() => setPassportOpen(false)}>Cancel</Button>
            <Button onClick={handleSavePassport} disabled={updatePassport.isPending}>
              {updatePassport.isPending ? "Saving…" : "Save"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}

// ─── Main page ────────────────────────────────────────────────────────────────

export default function BookingDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const qc = useQueryClient();

  const { data: booking, isLoading } = useBooking(id!);
  const { data: guests } = useBookingGuests(id!);
  const { data: invoices } = useBookingInvoices(id!);
  const { data: tickets } = useBookingTickets(id!);
  const { data: contractData } = useBookingContract(id!, !!booking?.hasContract);
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
        const messages = Object.values(apiErrors).flat().join(" · ");
        toast.error(messages);
      } else {
        toast.error("Failed to add guest");
      }
    }
  }

  async function handlePay() {
    if (!payOpen || !payAmount) return;
    try {
      await payInvoice.mutateAsync({
        invoiceId: payOpen,
        data: { method: payMethod, amount: Number(payAmount) },
      });
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
      <div className="space-y-4 max-w-2xl">
        <Skeleton className="h-8 w-64" />
        <Skeleton className="h-24 w-full" />
        <Skeleton className="h-48 w-full" />
      </div>
    );
  }
  if (!booking) return <div className="text-muted-foreground">Booking not found.</div>;

  const statusColors: Record<string, string> = {
    [BookingStatus.Active]: "bg-green-100 text-green-700",
    [BookingStatus.Confirmed]: "bg-blue-100 text-blue-700",
    [BookingStatus.Draft]: "bg-gray-100 text-gray-500",
    [BookingStatus.Completed]: "bg-slate-100 text-slate-600",
    [BookingStatus.Cancelled]: "bg-red-100 text-red-600",
  };

  const pendingInvoices = (invoices ?? []).filter(
    (inv) => inv.status === InvoiceStatus.Pending || inv.status === InvoiceStatus.PartiallyPaid,
  );
  const openTickets = (tickets ?? []).filter(
    (t) => !["Closed", "Completed", "Cancelled", "Canceled", "Verified"].includes(t.status),
  );

  return (
    <div className="max-w-5xl space-y-6">
      {/* Back */}
      <div>
        <Button variant="ghost" size="sm" onClick={() => navigate(-1)}>
          <ArrowLeft className="h-4 w-4 mr-1" />Back
        </Button>
      </div>

      {/* ── Header ── */}
      <div className="flex items-start justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-bold">
              {booking.tenantName ?? booking.listingTitle ?? "Booking"}
            </h1>
            {booking.tenantName && (
              <Button
                variant="ghost"
                size="icon"
                className="h-7 w-7 text-muted-foreground hover:text-destructive"
                title="Unlink tenant"
                onClick={() => setUnlinkTenantOpen(true)}
              >
                <Trash2 className="h-3.5 w-3.5" />
              </Button>
            )}
          </div>
          <p className="text-muted-foreground text-sm mt-1">
            {formatDate(booking.checkInDate)} → {formatDate(booking.checkOutDate)}
            {booking.daysRemaining != null && (
              <span className="ml-2 text-foreground font-medium">
                {booking.daysRemaining}d remaining
              </span>
            )}
          </p>
          {booking.listingTitle && (
            <p className="text-xs text-muted-foreground mt-0.5">{booking.listingTitle}</p>
          )}
        </div>
        <Badge className={`text-sm border-0 shrink-0 ${statusColors[booking.status] ?? "bg-gray-100 text-gray-500"}`}>
          {booking.status}
        </Badge>
      </div>

      {/* ── Key figures ── */}
      <div className="grid grid-cols-3 gap-3">
        <Card>
          <CardContent className="p-4">
            <p className="text-xs text-muted-foreground mb-0.5">Total rent</p>
            <p className="text-lg font-bold">{formatThb(booking.rentAmount)}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <p className="text-xs text-muted-foreground mb-0.5">Deposit</p>
            <p className="text-lg font-bold">{formatThb(booking.depositAmount)}</p>
          </CardContent>
        </Card>

        {/* Contract */}
        <Card>
          <CardContent className="p-4">
            <p className="text-xs text-muted-foreground mb-1">Contract</p>
            <div className="flex items-center justify-between gap-2">
              <div className="flex items-center gap-2 flex-wrap">
                {booking.hasContract ? (
                  <Badge className="bg-green-100 text-green-700 border-0 text-xs">
                    <FileText className="h-3 w-3 mr-1" />On file
                  </Badge>
                ) : (
                  <Badge className="bg-amber-100 text-amber-700 border-0 text-xs">Not uploaded</Badge>
                )}
                {(contractData?.url ?? booking.contractUrl) && (
                  <a
                    href={contractData?.url ?? booking.contractUrl!}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-0.5 text-xs text-primary hover:underline"
                  >
                    <Eye className="h-3 w-3" />View
                  </a>
                )}
              </div>
              <label className={cn(
                "inline-flex items-center gap-1 text-xs cursor-pointer shrink-0 transition-colors",
                booking.hasContract
                  ? "text-muted-foreground hover:text-foreground"
                  : "text-primary hover:underline",
                contractUploading && "opacity-50 pointer-events-none",
              )}>
                <Upload className="h-3 w-3" />
                {contractUploading ? "Uploading…" : booking.hasContract ? "Replace" : "Upload"}
                <input
                  type="file"
                  accept=".pdf,.doc,.docx"
                  className="hidden"
                  onChange={(e) => {
                    const file = e.target.files?.[0];
                    if (file) handleUploadContract(file);
                    e.currentTarget.value = "";
                  }}
                />
              </label>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* ── Two-column body ── */}
      <div className="grid grid-cols-[1fr_380px] gap-6 items-start">

        {/* ── LEFT: Guests ── */}
        <Section
          title="Guests"
          action={
            <Button size="sm" onClick={() => setAddGuestOpen(true)}>
              <Plus className="h-4 w-4 mr-1" />Add guest
            </Button>
          }
        >
          {!guests?.length ? (
            <p className="text-sm text-muted-foreground">
              No guests added yet. Add a guest to enable TM-30 filing and portal access.
            </p>
          ) : (
            <div className="space-y-3">
              {guests.map((g) => (
                <GuestCard
                  key={g.id}
                  guest={g}
                  bookingId={id!}
                />
              ))}
            </div>
          )}
        </Section>

        {/* ── RIGHT: Invoices + Tickets ── */}
        <div className="space-y-6">

          {/* Invoices */}
          <Section title="Invoices">
            {!invoices?.length ? (
              <p className="text-sm text-muted-foreground">No invoices yet.</p>
            ) : (
              <div className="space-y-2">
                {invoices.map((inv) => (
                  <Card key={inv.id}>
                    <CardContent className="p-4 flex items-center justify-between gap-3">
                      <div className="min-w-0 flex-1">
                        <p className="font-medium text-sm">{inv.type}</p>
                        {inv.description && (
                          <p className="text-xs text-muted-foreground truncate">{inv.description}</p>
                        )}
                        {inv.dueDate && (
                          <p className="text-xs text-muted-foreground">Due {formatDate(inv.dueDate)}</p>
                        )}
                      </div>
                      <div className="flex items-center gap-2 shrink-0">
                        {inv.amount != null && (
                          <p className="font-semibold text-sm">{formatThb(inv.amount)}</p>
                        )}
                        <Badge className={cn("text-xs border-0", {
                          "bg-green-100 text-green-700": inv.status === InvoiceStatus.Paid,
                          "bg-blue-100 text-blue-700": inv.status === InvoiceStatus.PartiallyPaid,
                          "bg-gray-100 text-gray-500": inv.status === InvoiceStatus.Cancelled,
                          "bg-amber-100 text-amber-700": inv.status === InvoiceStatus.Pending,
                        })}>
                          {inv.status}
                        </Badge>
                        {(inv.status === InvoiceStatus.Pending ||
                          inv.status === InvoiceStatus.PartiallyPaid) && (
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => {
                              setPayOpen(inv.id);
                              setPayAmount(String(inv.amount ?? ""));
                            }}
                          >
                            Pay
                          </Button>
                        )}
                      </div>
                    </CardContent>
                  </Card>
                ))}
                {pendingInvoices.length > 0 && (
                  <p className="text-xs text-amber-600 font-medium">
                    {pendingInvoices.length} invoice{pendingInvoices.length > 1 ? "s" : ""} awaiting payment
                  </p>
                )}
              </div>
            )}
          </Section>

          {/* Tickets */}
          <Section
            title="Tickets"
            action={
              <Link to={`/manager/tickets/new?assetId=${booking.assetId}&bookingId=${id}`}>
                <Button size="sm" variant="outline">
                  <Plus className="h-4 w-4 mr-1" />New ticket
                </Button>
              </Link>
            }
          >
            {!tickets?.length ? (
              <p className="text-sm text-muted-foreground">No tickets for this booking.</p>
            ) : (
              <div className="space-y-2">
                {tickets.map((t) => (
                  <Link key={t.id} to={`/manager/tickets/${t.id}`}>
                    <Card className="hover:shadow-sm transition-shadow">
                      <CardContent className="p-3 flex items-center gap-3">
                        <span className="text-base">{ticketKindIcon(t.kind)}</span>
                        <div className="flex-1 min-w-0">
                          <p className="font-medium text-sm truncate">{t.title}</p>
                          <p className="text-xs text-muted-foreground">{t.displayId}</p>
                        </div>
                        <Badge className={`text-xs border-0 ${ticketStatusColor(t.status)}`}>
                          {t.status}
                        </Badge>
                      </CardContent>
                    </Card>
                  </Link>
                ))}
                {openTickets.length > 0 && (
                  <p className="text-xs text-muted-foreground">
                    {openTickets.length} open ticket{openTickets.length > 1 ? "s" : ""}
                  </p>
                )}
              </div>
            )}
          </Section>

        </div>{/* end right column */}
      </div>{/* end grid */}

      {/* ══ Dialogs ══════════════════════════════════════════════════════════ */}

      {/* Add guest */}
      <Dialog open={addGuestOpen} onOpenChange={(v) => { setAddGuestOpen(v); if (!v) setNewGuest({}); }}>
        <DialogContent className="max-w-lg">
          <DialogHeader><DialogTitle>Add guest</DialogTitle></DialogHeader>
          <p className="text-xs text-muted-foreground -mt-2">
            All fields are optional — you can fill in passport details later.
          </p>
          <PassportFields
            values={newGuest}
            onChange={(patch) => setNewGuest((p) => ({ ...p, ...patch }))}
          />
          <DialogFooter>
            <Button variant="outline" onClick={() => { setAddGuestOpen(false); setNewGuest({}); }}>Cancel</Button>
            <Button onClick={handleAddGuest} disabled={addGuest.isPending}>
              {addGuest.isPending ? "Adding…" : "Add guest"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Unlink tenant */}
      <Dialog open={unlinkTenantOpen} onOpenChange={setUnlinkTenantOpen}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>Unlink tenant</DialogTitle>
          </DialogHeader>
          <p className="text-sm text-muted-foreground">
            Remove{" "}
            <span className="font-semibold text-foreground">{booking.tenantName}</span>{" "}
            from this booking? The booking status will reset to <strong>Pending</strong>. You can send a new invite afterwards.
          </p>
          <DialogFooter>
            <Button variant="outline" onClick={() => setUnlinkTenantOpen(false)} disabled={unlinkTenant.isPending}>
              Cancel
            </Button>
            <Button
              variant="destructive"
              disabled={unlinkTenant.isPending}
              onClick={async () => {
                try {
                  await unlinkTenant.mutateAsync();
                  toast.success("Tenant unlinked");
                  setUnlinkTenantOpen(false);
                } catch {
                  toast.error("Failed to unlink tenant");
                }
              }}
            >
              {unlinkTenant.isPending ? "Removing…" : "Remove"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Register payment */}
      <Dialog open={!!payOpen} onOpenChange={(v) => !v && setPayOpen(null)}>
        <DialogContent>
          <DialogHeader><DialogTitle>Register payment</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <div className="space-y-1">
              <Label>Amount (THB)</Label>
              <Input
                type="number"
                value={payAmount}
                onChange={(e) => setPayAmount(e.target.value)}
                autoFocus
              />
            </div>
            <div className="space-y-1">
              <Label>Method</Label>
              <Select value={payMethod} onValueChange={(v) => setPayMethod(v as PaymentMethod)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {Object.values(PaymentMethod).map((m) => (
                    <SelectItem key={m} value={m}>{m}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setPayOpen(null)}>Cancel</Button>
            <Button onClick={handlePay} disabled={payInvoice.isPending || !payAmount}>
              {payInvoice.isPending ? "Saving…" : "Confirm payment"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
