import { useState } from "react";
import { useNavigate, useSearchParams, Link } from "react-router-dom";
import { ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { DatePicker } from "@/components/ui/date-picker";
import { useAssets } from "@/lib/hooks/use-assets";
import { useListingsByAsset } from "@/lib/hooks/use-listings";
import { useCreateBooking, useBookingsByAsset } from "@/lib/hooks/use-bookings";
import { ListingStatus, RentalType } from "@/lib/types/enums";
import { formatThb } from "@/lib/utils/format";
import { toast } from "sonner";

export default function CreateBookingPage() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const preselectedAssetId = searchParams.get("assetId") ?? "";

  const { data: assets } = useAssets();
  const [assetId, setAssetId] = useState(preselectedAssetId);
  const { data: listings } = useListingsByAsset(assetId);
  const { data: existingBookings } = useBookingsByAsset(assetId);
  const createBooking = useCreateBooking();

  const [checkIn, setCheckIn] = useState("");
  const [checkOut, setCheckOut] = useState("");
  const [depositAmount, setDepositAmount] = useState("");

  function isDateDisabled(date: Date): boolean {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    if (date < today) return true;
    return (existingBookings ?? []).some((b) => {
      const start = new Date(b.checkInDate.length === 10 ? b.checkInDate + "T00:00:00" : b.checkInDate);
      const end = new Date(b.checkOutDate.length === 10 ? b.checkOutDate + "T00:00:00" : b.checkOutDate);
      start.setHours(0, 0, 0, 0);
      end.setHours(0, 0, 0, 0);
      return date >= start && date <= end;
    });
  }

  const activeListing = listings?.find((l) => l.status === ListingStatus.Active);
  const isShortTerm = activeListing?.rentalType === RentalType.ShortTerm;

  // Price preview
  const nights = (() => {
    if (!checkIn || !checkOut) return 0;
    const a = new Date(checkIn + "T00:00:00");
    const b = new Date(checkOut + "T00:00:00");
    return Math.max(0, Math.round((b.getTime() - a.getTime()) / 86_400_000));
  })();

  // basePrice is always the daily/nightly rate from the backend (LongTerm = baseMonthlyRate / 30)
  const dailyRate = activeListing?.basePrice ?? 0;
  const estimatedRent = nights > 0 ? Math.round(dailyRate * nights) : 0;

  async function handleSubmit() {
    if (!assetId || !checkIn || !checkOut || !depositAmount) {
      toast.error("Please fill in all required fields");
      return;
    }
    try {
      const result = await createBooking.mutateAsync({
        assetId,
        checkInDate: checkIn,
        checkOutDate: checkOut,
        depositAmount: parseFloat(depositAmount),
      });
      toast.success("Booking created — invoices generated automatically");
      navigate(`/manager/bookings/${result.id}`);
    } catch {
      toast.error("Failed to create booking");
    }
  }

  return (
    <div>
      <div className="flex items-center gap-2 mb-6">
        <Link to="/manager/bookings">
          <Button variant="ghost" size="sm">
            <ArrowLeft className="h-4 w-4 mr-1" /> Bookings
          </Button>
        </Link>
      </div>

      <h1 className="text-2xl font-bold mb-6">New Booking</h1>

      <Card className="max-w-2xl">
        <CardHeader><CardTitle>Booking details</CardTitle></CardHeader>
        <CardContent className="space-y-4">

          <div className="space-y-1">
            <Label>Property *</Label>
            <Select value={assetId} onValueChange={(v) => { setAssetId(v); setCheckIn(""); setCheckOut(""); }}>
              <SelectTrigger>
                <SelectValue placeholder="Select property..." />
              </SelectTrigger>
              <SelectContent>
                {assets?.map((a) => (
                  <SelectItem key={a.id} value={a.id}>{a.internalName}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Active listing info */}
          {activeListing && (
            <div className="rounded-md bg-muted px-3 py-2 text-sm space-y-0.5">
              <div className="flex items-center gap-2 flex-wrap">
                <span className="text-muted-foreground">Active listing:</span>
                <span className="font-medium">{activeListing.title}</span>
                <span className="text-muted-foreground">
                  · {isShortTerm
                    ? `${formatThb(activeListing.basePrice)}/night`
                    : activeListing.baseMonthlyRate != null
                      ? `${formatThb(activeListing.baseMonthlyRate)}/mo`
                      : `${formatThb(activeListing.basePrice)}/mo`}
                </span>
              </div>
              <p className="text-xs text-muted-foreground">
                Valid {activeListing.startDate} – {activeListing.endDate}
              </p>
            </div>
          )}
          {assetId && listings !== undefined && !activeListing && (
            <p className="text-sm text-destructive">
              No active listing found for this property. Please publish a listing first.
            </p>
          )}

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1">
              <Label>Check-in date *</Label>
              <DatePicker value={checkIn} onChange={setCheckIn} placeholder="Select date" isDisabled={isDateDisabled} />
            </div>
            <div className="space-y-1">
              <Label>Check-out date *</Label>
              <DatePicker value={checkOut} onChange={setCheckOut} placeholder="Select date" isDisabled={isDateDisabled} />
            </div>
          </div>

          {/* Price preview */}
          {activeListing && nights > 0 && (
            <div className="rounded-md border border-border bg-muted/40 px-4 py-3 text-sm space-y-1.5">
              <div className="flex justify-between text-muted-foreground">
                <span>
                  {isShortTerm
                    ? `${formatThb(dailyRate)}/night × ${nights} nights`
                    : `${formatThb(Math.round(dailyRate))}/day × ${nights} days`}
                </span>
                <span className="font-semibold text-foreground">{formatThb(estimatedRent)}</span>
              </div>
              <p className="text-xs text-muted-foreground">
                Estimated rent — exact amount confirmed by the system after booking.
              </p>
            </div>
          )}

          <div className="space-y-1">
            <Label>Security deposit (THB) *</Label>
            <Input
              type="number"
              min="0"
              value={depositAmount}
              onChange={(e) => setDepositAmount(e.target.value)}
              placeholder="e.g. 50000"
            />
            <p className="text-xs text-muted-foreground">
              Rent &amp; deposit invoices are generated automatically on creation.
            </p>
          </div>

          <div className="flex gap-3 pt-2">
            <Button variant="outline" onClick={() => navigate(-1)}>Cancel</Button>
            <Button onClick={handleSubmit} disabled={createBooking.isPending || !assetId || !activeListing}>
              {createBooking.isPending ? "Creating..." : "Create booking"}
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
