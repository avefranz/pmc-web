import { useState, useId } from "react";
import { useParams, useNavigate, Link } from "react-router-dom";
import { useQueryClient } from "@tanstack/react-query";
import {
  ArrowLeft, Plus, Trash2, FileText, Upload,
  Copy, Check, Send, Eye, Pencil,
} from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
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

// ─── Passport form fields (reused in add + edit dialogs) ─────────────────────

function PassportFields({
  values,
  onChange,
}: {
  values: UpsertPassportRequest;
  onChange: (patch: Partial<UpsertPassportRequest>) => void;
}) {
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
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
          <p style={{ fontFamily: "var(--mono)", fontSize: 11, color: "var(--ink-4)" }}>Must be a future date</p>
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
      <div className="adm-card">
        <div style={{ padding: "16px 20px", display: "flex", flexDirection: "column", gap: 12 }}>
          {/* Name row */}
          <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 8 }}>
            <div style={{ minWidth: 0, flex: 1 }}>
              <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap", fontFamily: "var(--sans)", fontWeight: 600, fontSize: 13 }}>
                {guest.firstName || guest.lastName
                  ? `${guest.firstName ?? ""} ${guest.lastName ?? ""}`.trim()
                  : <span style={{ color: "var(--ink-3)", fontStyle: "italic" }}>No name</span>}
                {guest.isMainTenant && (
                  <span className="adm-tag adm-tag--ink">Main tenant</span>
                )}
                {guest.userId ? (
                  <span className="adm-tag adm-tag--success">Joined</span>
                ) : (
                  <span className="adm-tag adm-tag--neutral">Not joined</span>
                )}
              </div>
              {hasPassport && (
                <div style={{ fontFamily: "var(--mono)", fontSize: 11, color: "var(--ink-4)", marginTop: 2, display: "flex", flexDirection: "column", gap: 2 }}>
                  {guest.passportNumber && <p>Passport: {guest.passportNumber}{guest.passportExpiry ? ` · exp ${formatDate(guest.passportExpiry)}` : ""}</p>}
                  {(guest.nationality || guest.visaType) && (
                    <p>{[guest.nationality, guest.visaType].filter(Boolean).join(" · ")}</p>
                  )}
                  {guest.dateOfBirth && <p>DOB: {formatDate(guest.dateOfBirth)}</p>}
                  {guest.entryDate && <p>Entry: {formatDate(guest.entryDate)}{guest.entryPort ? ` via ${guest.entryPort}` : ""}</p>}
                </div>
              )}
            </div>
            <div style={{ display: "flex", alignItems: "center", gap: 4, flexShrink: 0 }}>
              <button className="adm-btn adm-btn--icon" onClick={openPassport} title="Edit passport">
                <Pencil style={{ width: 14, height: 14 }} />
              </button>
              <button
                className="adm-btn adm-btn--icon adm-btn--danger"
                onClick={() => setRemoveOpen(true)}
                title="Remove guest"
              >
                <Trash2 style={{ width: 14, height: 14 }} />
              </button>
            </div>
          </div>

          {/* TM-30 row */}
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", paddingTop: 8, borderTop: "1px solid var(--ink-6)", gap: 8 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
              <span style={{ fontFamily: "var(--mono)", fontSize: 11, color: "var(--ink-4)", fontWeight: 500 }}>TM-30</span>
              {tm30Filed ? (
                <span className="adm-tag adm-tag--success">
                  Filed{tm30?.filedAt ? ` ${formatDate(tm30.filedAt)}` : ""}
                </span>
              ) : (
                <span className="adm-tag adm-tag--warn">Pending</span>
              )}
              {tm30Filed && tm30?.documentUrl && (
                <a
                  href={tm30.documentUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  style={{ display: "inline-flex", alignItems: "center", gap: 2, fontFamily: "var(--mono)", fontSize: 11, color: "var(--ink-3)", textDecoration: "none" }}
                >
                  <Eye style={{ width: 12, height: 12 }} />View
                </a>
              )}
            </div>
            <label className={cn(
              "flex items-center gap-1.5 text-xs cursor-pointer transition-colors shrink-0",
              uploadTm30.isPending && "opacity-50 pointer-events-none",
            )} style={{ fontFamily: "var(--mono)", fontSize: 11, color: "var(--ink-3)" }}>
              <Upload style={{ width: 14, height: 14 }} />
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
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", paddingTop: 4 }}>
              <span style={{ fontFamily: "var(--mono)", fontSize: 11, color: "var(--ink-4)" }}>Portal access</span>
              <button
                className="adm-btn adm-btn--ghost adm-btn--sm"
                onClick={handleInvite}
                disabled={generateInvite.isPending}
              >
                <Send style={{ width: 12, height: 12, marginRight: 4 }} />
                {generateInvite.isPending ? "Generating…" : "Send invite"}
              </button>
            </div>
          ) : inviteLink ? (
            <div style={{ paddingTop: 4, display: "flex", flexDirection: "column", gap: 6 }}>
              <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                <div style={{ flex: 1, background: "var(--surface-muted)", borderRadius: 4, padding: "4px 8px", fontFamily: "var(--mono)", fontSize: 11, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                  {inviteLink}
                </div>
                <button className="adm-btn adm-btn--ghost adm-btn--sm" style={{ flexShrink: 0 }} onClick={handleCopy}>
                  {copied ? <Check style={{ width: 12, height: 12 }} /> : <Copy style={{ width: 12, height: 12 }} />}
                </button>
              </div>
              <button style={{ fontFamily: "var(--mono)", fontSize: 11, color: "var(--ink-4)", background: "none", border: "none", cursor: "pointer", textAlign: "left", padding: 0 }} onClick={() => setInviteLink(null)}>
                Dismiss
              </button>
            </div>
          ) : null}
        </div>
      </div>

      {/* Remove guest dialog */}
      <Dialog open={removeOpen} onOpenChange={setRemoveOpen}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>Remove guest</DialogTitle>
          </DialogHeader>
          <p style={{ fontFamily: "var(--sans)", fontSize: 13, color: "var(--ink-3)" }}>
            Remove{" "}
            <span style={{ fontWeight: 600, color: "var(--ink)" }}>
              {guest.firstName || guest.lastName
                ? `${guest.firstName ?? ""} ${guest.lastName ?? ""}`.trim()
                : "this guest"}
            </span>
            {guest.isMainTenant ? " (main tenant)" : ""}? This cannot be undone.
          </p>
          <DialogFooter>
            <button className="adm-btn adm-btn--ghost" onClick={() => setRemoveOpen(false)} disabled={removeGuest.isPending}>
              Cancel
            </button>
            <button
              className="adm-btn adm-btn--danger"
              disabled={removeGuest.isPending}
              onClick={() => {
                removeGuest.mutate(guest.id, {
                  onSuccess: () => { toast.success("Guest removed"); setRemoveOpen(false); },
                  onError: () => toast.error("Failed to remove guest"),
                });
              }}
            >
              {removeGuest.isPending ? "Removing…" : "Remove"}
            </button>
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
            <button className="adm-btn adm-btn--ghost" onClick={() => setPassportOpen(false)}>Cancel</button>
            <button className="adm-btn adm-btn--ink" onClick={handleSavePassport} disabled={updatePassport.isPending}>
              {updatePassport.isPending ? "Saving…" : "Save"}
            </button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}

// ─── Ticket status → adm-tag variant ─────────────────────────────────────────

function ticketStatusTagVariant(status: string): string {
  switch (status) {
    case "Draft":
    case "Closed":
    case "Cancelled":
    case "Canceled":
      return "adm-tag--neutral";
    case "Reported":
      return "adm-tag--ink";
    case "PendingApproval":
    case "Pending":
    case "Triaging":
    case "Quoted":
      return "adm-tag--warn";
    case "InProgress":
    case "Approved":
      return "adm-tag--ink";
    case "Blocked":
    case "Rejected":
      return "adm-tag--danger";
    case "Verified":
    case "Completed":
      return "adm-tag--success";
    default:
      return "adm-tag--neutral";
  }
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
      <div style={{ display: "flex", flexDirection: "column", gap: 16, maxWidth: 672 }}>
        <Skeleton className="h-8 w-64" />
        <Skeleton className="h-24 w-full" />
        <Skeleton className="h-48 w-full" />
      </div>
    );
  }
  if (!booking) return <div style={{ fontFamily: "var(--sans)", fontSize: 13, color: "var(--ink-3)" }}>Booking not found.</div>;

  const statusTagVariant: Record<string, string> = {
    [BookingStatus.Active]: "adm-tag--success",
    [BookingStatus.Confirmed]: "adm-tag--ink",
    [BookingStatus.Draft]: "adm-tag--neutral",
    [BookingStatus.Completed]: "adm-tag--neutral",
    [BookingStatus.Cancelled]: "adm-tag--danger",
  };

  const pendingInvoices = (invoices ?? []).filter(
    (inv) => inv.status === InvoiceStatus.Pending || inv.status === InvoiceStatus.PartiallyPaid,
  );
  const openTickets = (tickets ?? []).filter(
    (t) => !["Closed", "Completed", "Cancelled", "Canceled", "Verified"].includes(t.status),
  );

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 24 }}>
      {/* Back */}
      <div>
        <button className="adm-btn adm-btn--ghost adm-btn--sm" onClick={() => navigate(booking ? `/manager/assets/${booking.assetId}` : "/manager/assets")}>
          <ArrowLeft style={{ width: 16, height: 16, marginRight: 4 }} />Back to property
        </button>
      </div>

      {/* ── Header ── */}
      <div className="adm-pagehead">
        <div>
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <h1 className="adm-pagehead__title">
              {booking.tenantName ?? booking.listingTitle ?? "Booking"}
            </h1>
            {booking.tenantName && (
              <button
                className="adm-btn adm-btn--icon adm-btn--danger"
                title="Unlink tenant"
                onClick={() => setUnlinkTenantOpen(true)}
              >
                <Trash2 style={{ width: 14, height: 14 }} />
              </button>
            )}
          </div>
          <p style={{ fontFamily: "var(--mono)", fontSize: 12, color: "var(--ink-3)", marginTop: 4 }}>
            {formatDate(booking.checkInDate)} → {formatDate(booking.checkOutDate)}
            {booking.daysRemaining != null && (
              <span style={{ marginLeft: 8, color: "var(--ink)", fontWeight: 500 }}>
                {booking.daysRemaining}d remaining
              </span>
            )}
          </p>
          {booking.listingTitle && (
            <p style={{ fontFamily: "var(--mono)", fontSize: 11, color: "var(--ink-4)", marginTop: 2 }}>{booking.listingTitle}</p>
          )}
        </div>
        <div className="adm-pagehead__actions">
          <span className={`adm-tag ${statusTagVariant[booking.status] ?? "adm-tag--neutral"}`}>
            {booking.status}
          </span>
        </div>
      </div>

      {/* ── Key figures ── */}
      <div className="adm-kpi-row">
        <div className="adm-kpi">
          <div className="adm-kpi__label">Total rent</div>
          <div className="adm-kpi__value">{formatThb(booking.rentAmount)}</div>
        </div>
        <div className="adm-kpi">
          <div className="adm-kpi__label">Deposit</div>
          <div className="adm-kpi__value">{formatThb(booking.depositAmount)}</div>
        </div>

        {/* Contract */}
        <div className="adm-kpi">
          <div className="adm-kpi__label">Contract</div>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 8, marginTop: 4 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
              {booking.hasContract ? (
                <span className="adm-tag adm-tag--success">
                  <FileText style={{ width: 12, height: 12, marginRight: 4 }} />On file
                </span>
              ) : (
                <span className="adm-tag adm-tag--warn">Not uploaded</span>
              )}
              {(contractData?.url ?? booking.contractUrl) && (
                <a
                  href={contractData?.url ?? booking.contractUrl!}
                  target="_blank"
                  rel="noopener noreferrer"
                  style={{ display: "inline-flex", alignItems: "center", gap: 2, fontFamily: "var(--mono)", fontSize: 11, color: "var(--ink-3)", textDecoration: "none" }}
                >
                  <Eye style={{ width: 12, height: 12 }} />View
                </a>
              )}
            </div>
            <label className={cn(
              "inline-flex items-center gap-1 text-xs cursor-pointer shrink-0 transition-colors",
              contractUploading && "opacity-50 pointer-events-none",
            )} style={{ fontFamily: "var(--mono)", fontSize: 11, color: "var(--ink-3)" }}>
              <Upload style={{ width: 12, height: 12 }} />
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
        </div>
      </div>

      {/* ── Two-column body ── */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 380px", gap: 24, alignItems: "start" }}>

        {/* ── LEFT: Guests ── */}
        <div>
          <div className="adm-card__head">
            <div className="adm-card__title">Guests</div>
            <button className="adm-btn adm-btn--ink adm-btn--sm" onClick={() => setAddGuestOpen(true)}>
              <Plus style={{ width: 16, height: 16, marginRight: 4 }} />Add guest
            </button>
          </div>
          <div style={{ marginTop: 12 }}>
            {!guests?.length ? (
              <p style={{ fontFamily: "var(--sans)", fontSize: 13, color: "var(--ink-3)" }}>
                No guests added yet. Add a guest to enable TM-30 filing and portal access.
              </p>
            ) : (
              <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
                {guests.map((g) => (
                  <GuestCard
                    key={g.id}
                    guest={g}
                    bookingId={id!}
                  />
                ))}
              </div>
            )}
          </div>
        </div>

        {/* ── RIGHT: Invoices + Tickets ── */}
        <div style={{ display: "flex", flexDirection: "column", gap: 24 }}>

          {/* Invoices */}
          <div>
            <div className="adm-card__head">
              <div className="adm-card__title">Invoices</div>
            </div>
            <div style={{ marginTop: 12 }}>
              {!invoices?.length ? (
                <p style={{ fontFamily: "var(--sans)", fontSize: 13, color: "var(--ink-3)" }}>No invoices yet.</p>
              ) : (
                <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                  {invoices.map((inv) => (
                    <div key={inv.id} className="adm-card">
                      <div style={{ padding: "16px 20px", display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12 }}>
                        <div style={{ minWidth: 0, flex: 1 }}>
                          <p style={{ fontFamily: "var(--sans)", fontWeight: 500, fontSize: 13 }}>{inv.type}</p>
                          {inv.description && (
                            <p style={{ fontFamily: "var(--mono)", fontSize: 11, color: "var(--ink-4)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{inv.description}</p>
                          )}
                          {inv.dueDate && (
                            <p style={{ fontFamily: "var(--mono)", fontSize: 11, color: "var(--ink-4)" }}>Due {formatDate(inv.dueDate)}</p>
                          )}
                        </div>
                        <div style={{ display: "flex", alignItems: "center", gap: 8, flexShrink: 0 }}>
                          {inv.amount != null && (
                            <p style={{ fontFamily: "var(--sans)", fontWeight: 600, fontSize: 13 }}>{formatThb(inv.amount)}</p>
                          )}
                          <span className={cn("adm-tag", {
                            "adm-tag--success": inv.status === InvoiceStatus.Paid,
                            "adm-tag--ink": inv.status === InvoiceStatus.PartiallyPaid,
                            "adm-tag--neutral": inv.status === InvoiceStatus.Cancelled,
                            "adm-tag--warn": inv.status === InvoiceStatus.Pending,
                          })}>
                            {inv.status}
                          </span>
                          {(inv.status === InvoiceStatus.Pending ||
                            inv.status === InvoiceStatus.PartiallyPaid) && (
                            <button
                              className="adm-btn adm-btn--ghost adm-btn--sm"
                              onClick={() => {
                                setPayOpen(inv.id);
                                setPayAmount(String(inv.amount ?? ""));
                              }}
                            >
                              Pay
                            </button>
                          )}
                        </div>
                      </div>
                    </div>
                  ))}
                  {pendingInvoices.length > 0 && (
                    <p style={{ fontFamily: "var(--mono)", fontSize: 11, color: "var(--warning)", fontWeight: 500 }}>
                      {pendingInvoices.length} invoice{pendingInvoices.length > 1 ? "s" : ""} awaiting payment
                    </p>
                  )}
                </div>
              )}
            </div>
          </div>

          {/* Tickets */}
          <div>
            <div className="adm-card__head">
              <div className="adm-card__title">Tickets</div>
              <Link to={`/manager/tickets/new?assetId=${booking.assetId}&bookingId=${id}`}>
                <button className="adm-btn adm-btn--ghost adm-btn--sm">
                  <Plus style={{ width: 16, height: 16, marginRight: 4 }} />New ticket
                </button>
              </Link>
            </div>
            <div style={{ marginTop: 12 }}>
              {!tickets?.length ? (
                <p style={{ fontFamily: "var(--sans)", fontSize: 13, color: "var(--ink-3)" }}>No tickets for this booking.</p>
              ) : (
                <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                  {tickets.map((t) => (
                    <Link key={t.id} to={`/manager/tickets/${t.id}`} style={{ textDecoration: "none" }}>
                      <div className="adm-card" style={{ cursor: "pointer" }}>
                        <div style={{ padding: "12px 16px", display: "flex", alignItems: "center", gap: 12 }}>
                          <span style={{ fontSize: 16 }}>{ticketKindIcon(t.kind)}</span>
                          <div style={{ flex: 1, minWidth: 0 }}>
                            <p style={{ fontFamily: "var(--sans)", fontWeight: 500, fontSize: 13, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{t.title}</p>
                            <p style={{ fontFamily: "var(--mono)", fontSize: 11, color: "var(--ink-4)" }}>{t.displayId}</p>
                          </div>
                          <span className={`adm-tag ${ticketStatusTagVariant(t.status)}`}>
                            {t.status}
                          </span>
                        </div>
                      </div>
                    </Link>
                  ))}
                  {openTickets.length > 0 && (
                    <p style={{ fontFamily: "var(--mono)", fontSize: 11, color: "var(--ink-4)" }}>
                      {openTickets.length} open ticket{openTickets.length > 1 ? "s" : ""}
                    </p>
                  )}
                </div>
              )}
            </div>
          </div>

        </div>{/* end right column */}
      </div>{/* end grid */}

      {/* ══ Dialogs ══════════════════════════════════════════════════════════ */}

      {/* Add guest */}
      <Dialog open={addGuestOpen} onOpenChange={(v) => { setAddGuestOpen(v); if (!v) setNewGuest({}); }}>
        <DialogContent className="max-w-lg">
          <DialogHeader><DialogTitle>Add guest</DialogTitle></DialogHeader>
          <p style={{ fontFamily: "var(--mono)", fontSize: 11, color: "var(--ink-4)", marginTop: -8 }}>
            All fields are optional — you can fill in passport details later.
          </p>
          <PassportFields
            values={newGuest}
            onChange={(patch) => setNewGuest((p) => ({ ...p, ...patch }))}
          />
          <DialogFooter>
            <button className="adm-btn adm-btn--ghost" onClick={() => { setAddGuestOpen(false); setNewGuest({}); }}>Cancel</button>
            <button className="adm-btn adm-btn--ink" onClick={handleAddGuest} disabled={addGuest.isPending}>
              {addGuest.isPending ? "Adding…" : "Add guest"}
            </button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Unlink tenant */}
      <Dialog open={unlinkTenantOpen} onOpenChange={setUnlinkTenantOpen}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>Unlink tenant</DialogTitle>
          </DialogHeader>
          <p style={{ fontFamily: "var(--sans)", fontSize: 13, color: "var(--ink-3)" }}>
            Remove{" "}
            <span style={{ fontWeight: 600, color: "var(--ink)" }}>{booking.tenantName}</span>{" "}
            from this booking? The booking status will reset to <strong>Pending</strong>. You can send a new invite afterwards.
          </p>
          <DialogFooter>
            <button className="adm-btn adm-btn--ghost" onClick={() => setUnlinkTenantOpen(false)} disabled={unlinkTenant.isPending}>
              Cancel
            </button>
            <button
              className="adm-btn adm-btn--danger"
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
            </button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Register payment */}
      <Dialog open={!!payOpen} onOpenChange={(v) => !v && setPayOpen(null)}>
        <DialogContent>
          <DialogHeader><DialogTitle>Register payment</DialogTitle></DialogHeader>
          <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
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
            <button className="adm-btn adm-btn--ghost" onClick={() => setPayOpen(null)}>Cancel</button>
            <button className="adm-btn adm-btn--ink" onClick={handlePay} disabled={payInvoice.isPending || !payAmount}>
              {payInvoice.isPending ? "Saving…" : "Confirm payment"}
            </button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
