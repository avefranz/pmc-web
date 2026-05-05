import { useState, useMemo, useEffect } from "react";
import { useNavigate, useSearchParams, Navigate } from "react-router-dom";
import { ArrowLeft } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { DatePicker } from "@/components/ui/date-picker";
import { useAsset } from "@/lib/hooks/use-assets";
import { useListingsByAsset } from "@/lib/hooks/use-listings";
import { useCreateBooking, useBookingsByAsset } from "@/lib/hooks/use-bookings";
import { ListingStatus, RentalType } from "@/lib/types/enums";
import { formatThb, formatDate } from "@/lib/utils/format";
import { toast } from "sonner";

const LONG_TERM_DURATIONS = [1, 2, 3, 6, 12, 18, 24];
const SHORT_TERM_MAX_DAYS = 90;
const LONG_TERM_MOVE_IN_WINDOW_DAYS = 30;

function toDateStr(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

function addMonths(dateStr: string, months: number): string {
  const d = new Date(dateStr + "T00:00:00");
  d.setMonth(d.getMonth() + months);
  return toDateStr(d);
}

function addDays(dateStr: string, days: number): string {
  const d = new Date(dateStr + "T00:00:00");
  d.setDate(d.getDate() + days);
  return toDateStr(d);
}

export default function CreateBookingPage() {
  const [searchParams] = useSearchParams();
  const assetId = searchParams.get("assetId") ?? "";
  if (!assetId) return <Navigate to="/manager/assets" replace />;
  return <CreateBookingForm assetId={assetId} />;
}

const fieldLabelStyle: React.CSSProperties = {
  fontFamily: "var(--mono)",
  fontSize: 10,
  letterSpacing: "0.1em",
  textTransform: "uppercase" as const,
  color: "var(--ink-4)",
  display: "block",
  marginBottom: 6,
};

function CreateBookingForm({ assetId }: { assetId: string }) {
  const navigate = useNavigate();

  const { data: asset } = useAsset(assetId);
  const { data: listings } = useListingsByAsset(assetId);
  const { data: existingBookings } = useBookingsByAsset(assetId);
  const createBooking = useCreateBooking();

  const [checkIn, setCheckIn] = useState("");
  const [checkOut, setCheckOut] = useState("");
  const [durationMonths, setDurationMonths] = useState("");
  const [depositAmount, setDepositAmount] = useState("");
  const [windowFullyBooked, setWindowFullyBooked] = useState(false);

  const activeListing = listings?.find((l) => l.status === ListingStatus.Active);
  const isShortTerm = activeListing?.rentalType === RentalType.ShortTerm;

  // Auto-default check-in for long-term
  useEffect(() => {
    if (isShortTerm || !activeListing?.startDate || checkIn !== "") return;
    if (existingBookings === undefined) return;

    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const listingStart = new Date(activeListing.startDate + "T00:00:00");
    listingStart.setHours(0, 0, 0, 0);
    const windowStart = listingStart > today ? listingStart : today;
    const windowEndStr = addDays(activeListing.startDate, LONG_TERM_MOVE_IN_WINDOW_DAYS);
    const windowEnd = new Date(windowEndStr + "T00:00:00");
    windowEnd.setHours(0, 0, 0, 0);

    const cursor = new Date(windowStart);
    while (cursor <= windowEnd) {
      const dateStr = toDateStr(cursor);
      const occupied = (existingBookings ?? []).some((b) => {
        const start = new Date(b.checkInDate.length === 10 ? b.checkInDate + "T00:00:00" : b.checkInDate);
        const end = new Date(b.checkOutDate.length === 10 ? b.checkOutDate + "T00:00:00" : b.checkOutDate);
        start.setHours(0, 0, 0, 0);
        end.setHours(0, 0, 0, 0);
        return cursor >= start && cursor <= end;
      });
      if (!occupied) {
        setCheckIn(dateStr);
        setWindowFullyBooked(false);
        return;
      }
      cursor.setDate(cursor.getDate() + 1);
    }
    setWindowFullyBooked(true);
  }, [activeListing, existingBookings, isShortTerm, checkIn]);

  const computedCheckOut = useMemo(() => {
    if (!isShortTerm && checkIn && durationMonths) return addMonths(checkIn, parseInt(durationMonths));
    return isShortTerm ? checkOut : "";
  }, [isShortTerm, checkIn, durationMonths, checkOut]);

  function isCheckInDisabled(date: Date): boolean {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const listingStart = activeListing?.startDate
      ? new Date(activeListing.startDate + "T00:00:00")
      : today;
    listingStart.setHours(0, 0, 0, 0);
    const minDate = listingStart > today ? listingStart : today;
    if (date < minDate) return true;
    if (activeListing?.endDate) {
      const listingEnd = new Date(activeListing.endDate + "T00:00:00");
      listingEnd.setHours(0, 0, 0, 0);
      if (date > listingEnd) return true;
    }
    if (!isShortTerm && activeListing?.startDate) {
      const windowEnd = new Date(activeListing.startDate + "T00:00:00");
      windowEnd.setDate(windowEnd.getDate() + LONG_TERM_MOVE_IN_WINDOW_DAYS);
      windowEnd.setHours(0, 0, 0, 0);
      if (date > windowEnd) return true;
    }
    return (existingBookings ?? []).some((b) => {
      const start = new Date(b.checkInDate.length === 10 ? b.checkInDate + "T00:00:00" : b.checkInDate);
      const end = new Date(b.checkOutDate.length === 10 ? b.checkOutDate + "T00:00:00" : b.checkOutDate);
      start.setHours(0, 0, 0, 0);
      end.setHours(0, 0, 0, 0);
      return date >= start && date <= end;
    });
  }

  function isCheckOutDisabled(date: Date): boolean {
    if (isCheckInDisabled(date)) return true;
    if (!checkIn) return true;
    const checkInDate = new Date(checkIn + "T00:00:00");
    checkInDate.setHours(0, 0, 0, 0);
    if (date <= checkInDate) return true;
    const maxDate = new Date(checkIn + "T00:00:00");
    maxDate.setDate(maxDate.getDate() + SHORT_TERM_MAX_DAYS);
    maxDate.setHours(0, 0, 0, 0);
    if (date > maxDate) return true;
    return false;
  }

  const monthlyRate = activeListing?.baseMonthlyRate ?? (activeListing ? activeListing.basePrice * 30 : 0);
  const dailyRate = activeListing?.basePrice ?? 0;

  const nights = useMemo(() => {
    if (!checkIn || !computedCheckOut) return 0;
    const a = new Date(checkIn + "T00:00:00");
    const b = new Date(computedCheckOut + "T00:00:00");
    return Math.max(0, Math.round((b.getTime() - a.getTime()) / 86_400_000));
  }, [checkIn, computedCheckOut]);

  const estimatedRent = useMemo(() => {
    if (!activeListing || !nights) return 0;
    if (!isShortTerm && durationMonths) return Math.round(monthlyRate * parseInt(durationMonths));
    return Math.round(dailyRate * nights);
  }, [activeListing, isShortTerm, durationMonths, monthlyRate, dailyRate, nights]);

  function handleCheckInChange(val: string) {
    setCheckIn(val);
    setCheckOut("");
  }

  async function handleSubmit() {
    const hasCheckOut = isShortTerm ? !!checkOut : !!durationMonths;
    if (!checkIn || !hasCheckOut || !depositAmount) {
      toast.error("Please fill in all required fields");
      return;
    }
    try {
      const result = await createBooking.mutateAsync({
        assetId,
        checkInDate: checkIn,
        checkOutDate: computedCheckOut,
        depositAmount: parseFloat(depositAmount),
      });
      toast.success("Booking created — invoices generated automatically");
      navigate(`/manager/bookings/${result.id}`);
    } catch {
      toast.error("Failed to create booking");
    }
  }

  const canSubmit = !!checkIn && (isShortTerm ? !!checkOut : !!durationMonths) && !!depositAmount && !!activeListing && !windowFullyBooked;

  return (
    <div>
      {/* Back */}
      <div style={{ marginBottom: 20 }}>
        <button
          className="bm-pagehead__back"
          onClick={() => navigate(`/manager/assets/${assetId}`)}
          style={{ display: "flex", alignItems: "center", gap: 4 }}
        >
          <ArrowLeft size={12} /> Back to property
        </button>
      </div>

      <div className="adm-pagehead" style={{ marginBottom: 24 }}>
        <div>
          <div className="adm-pagehead__eyebrow">
            {asset?.internalName ?? "Property"} · Bookings
          </div>
          <h1 className="adm-pagehead__title">New Booking</h1>
        </div>
      </div>

      <div className="adm-card" style={{ maxWidth: 600 }}>
        <div className="adm-card__head">
          <div className="adm-card__title">Booking details</div>
        </div>
        <div style={{ padding: "0 20px 20px", display: "flex", flexDirection: "column", gap: 16 }}>

          {/* Property */}
          <div>
            <label style={fieldLabelStyle}>Property</label>
            <p style={{ fontFamily: "var(--sans)", fontSize: 14, fontWeight: 600 }}>
              {asset?.internalName ?? "—"}
            </p>
          </div>

          {/* Listing info */}
          {activeListing && (
            <div style={{ border: "1px solid var(--ink-5)", padding: "10px 12px", background: "var(--surface-muted)" }}>
              <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap", marginBottom: 4 }}>
                <span style={{ fontFamily: "var(--mono)", fontSize: 11, color: "var(--ink-3)" }}>Active listing:</span>
                <span style={{ fontFamily: "var(--sans)", fontSize: 13, fontWeight: 600 }}>{activeListing.title}</span>
                <span style={{ fontFamily: "var(--mono)", fontSize: 11, color: "var(--ink-3)" }}>
                  · {isShortTerm
                    ? `${formatThb(activeListing.basePrice)}/night`
                    : activeListing.baseMonthlyRate != null
                      ? `${formatThb(activeListing.baseMonthlyRate)}/mo`
                      : `${formatThb(activeListing.basePrice)}/mo`}
                </span>
              </div>
              <p style={{ fontFamily: "var(--mono)", fontSize: 10, color: "var(--ink-4)", letterSpacing: "0.04em" }}>
                Valid {activeListing.startDate} – {activeListing.endDate}
              </p>
            </div>
          )}
          {listings !== undefined && !activeListing && (
            <p style={{ fontFamily: "var(--sans)", fontSize: 13, color: "var(--danger)" }}>
              No active listing found. Please publish a listing first.
            </p>
          )}
          {windowFullyBooked && (
            <div style={{ border: "1px solid var(--danger)", padding: "10px 12px" }}>
              <p style={{ fontFamily: "var(--sans)", fontSize: 13, color: "var(--danger)" }}>
                No available move-in dates — fully booked for the next {LONG_TERM_MOVE_IN_WINDOW_DAYS} days.
              </p>
            </div>
          )}

          {/* Check-in */}
          <div>
            <Label style={fieldLabelStyle as React.CSSProperties}>Check-in date *</Label>
            <DatePicker value={checkIn} onChange={handleCheckInChange} placeholder="Select date" isDisabled={isCheckInDisabled} />
            {!isShortTerm && (
              <p style={{ fontFamily: "var(--mono)", fontSize: 10, color: "var(--ink-4)", letterSpacing: "0.04em", marginTop: 6 }}>
                Move-in flexibility: up to {LONG_TERM_MOVE_IN_WINDOW_DAYS} days from listing start. First month prorated by day.
              </p>
            )}
          </div>

          {/* Check-out / Duration */}
          {isShortTerm ? (
            <div>
              <Label style={fieldLabelStyle as React.CSSProperties}>
                Check-out date * (max {SHORT_TERM_MAX_DAYS} days)
              </Label>
              <DatePicker
                value={checkOut}
                onChange={setCheckOut}
                placeholder="Select date"
                isDisabled={isCheckOutDisabled}
              />
            </div>
          ) : (
            <div>
              <Label style={fieldLabelStyle as React.CSSProperties}>Duration *</Label>
              <Select value={durationMonths} onValueChange={setDurationMonths}>
                <SelectTrigger>
                  <SelectValue placeholder="Select number of months…" />
                </SelectTrigger>
                <SelectContent>
                  {LONG_TERM_DURATIONS.map((m) => (
                    <SelectItem key={m} value={String(m)}>
                      {m} {m === 1 ? "month" : "months"}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {checkIn && durationMonths && (
                <p style={{ fontFamily: "var(--mono)", fontSize: 10, color: "var(--ink-4)", letterSpacing: "0.04em", marginTop: 6 }}>
                  Check-out: {formatDate(computedCheckOut)}
                </p>
              )}
            </div>
          )}

          {/* Rent preview */}
          {activeListing && estimatedRent > 0 && (
            <div style={{ border: "1px solid var(--ink-5)", padding: "10px 12px", background: "var(--surface-muted)" }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <span style={{ fontFamily: "var(--mono)", fontSize: 11, color: "var(--ink-3)" }}>
                  {isShortTerm
                    ? `${formatThb(dailyRate)}/night × ${nights} nights`
                    : `${formatThb(monthlyRate)}/mo × ${durationMonths} ${parseInt(durationMonths) === 1 ? "month" : "months"}`}
                </span>
                <span style={{ fontFamily: "var(--mono)", fontSize: 14, fontWeight: 700 }}>
                  {formatThb(estimatedRent)}
                </span>
              </div>
              <p style={{ fontFamily: "var(--mono)", fontSize: 10, color: "var(--ink-4)", marginTop: 4 }}>
                Estimated — exact amount confirmed after booking.
              </p>
            </div>
          )}

          {/* Deposit */}
          <div>
            <Label style={fieldLabelStyle as React.CSSProperties}>Security deposit (THB) *</Label>
            <Input
              type="number"
              min="0"
              value={depositAmount}
              onChange={(e) => setDepositAmount(e.target.value)}
              placeholder="e.g. 50000"
            />
            <p style={{ fontFamily: "var(--mono)", fontSize: 10, color: "var(--ink-4)", letterSpacing: "0.04em", marginTop: 6 }}>
              Rent &amp; deposit invoices are generated automatically on creation.
            </p>
          </div>

          {/* Actions */}
          <div style={{ display: "flex", gap: 10, paddingTop: 4 }}>
            <button
              className="adm-btn adm-btn--ghost"
              onClick={() => navigate(`/manager/assets/${assetId}`)}
            >
              Cancel
            </button>
            <button
              className="adm-btn adm-btn--ink"
              onClick={handleSubmit}
              disabled={createBooking.isPending || !canSubmit}
            >
              {createBooking.isPending ? "Creating…" : "Create booking"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
