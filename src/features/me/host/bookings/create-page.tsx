import { useState } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { ArrowLeft } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { DatePicker } from "@/components/ui/date-picker";
import { useCreateBooking } from "@/lib/hooks/use-bookings";
import { useAssets } from "@/lib/hooks/use-assets";
import { cn } from "@/lib/utils/cn";
import { parseISO } from "date-fns";

export function CreateBookingPage() {
  const navigate = useNavigate();
  const [params] = useSearchParams();
  const presetAssetId = params.get("assetId") ?? "";

  const { data: assets } = useAssets();
  const createBooking = useCreateBooking();

  const [assetId, setAssetId] = useState(presetAssetId);
  const [checkIn, setCheckIn] = useState("");
  const [checkOut, setCheckOut] = useState("");
  const [deposit, setDeposit] = useState("");

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const canSubmit = assetId && checkIn && checkOut && !createBooking.isPending;

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!canSubmit) return;
    try {
      const booking = await createBooking.mutateAsync({
        assetId,
        checkInDate: checkIn,
        checkOutDate: checkOut,
        depositAmount: deposit ? Number(deposit) : 0,
      });
      toast.success("Booking created");
      navigate(`/me/host/bookings/${booking.id}`);
    } catch {
      toast.error("Failed to create booking");
    }
  }

  return (
    <div className="max-w-lg mx-auto">
      <div className="flex items-center gap-2 mb-6">
        <Link to="/me/host/properties" className="p-1.5 rounded-lg hover:bg-bg-subtle text-fg-muted hover:text-fg transition-colors">
          <ArrowLeft size={18} />
        </Link>
        <h1 className="text-2xl font-semibold text-fg">New booking</h1>
      </div>

      <form onSubmit={handleSubmit} className="bg-bg-card rounded-xl shadow-card p-6 space-y-5">
        {/* Asset */}
        <div className="space-y-1.5">
          <Label htmlFor="asset">Property</Label>
          {presetAssetId ? (
            <p className="text-sm font-medium text-fg py-2">
              {assets?.find((a) => a.id === presetAssetId)?.internalName ?? presetAssetId}
            </p>
          ) : (
            <select
              id="asset"
              value={assetId}
              onChange={(e) => setAssetId(e.target.value)}
              className="w-full text-sm rounded-lg border border-border bg-bg-card px-3 py-2 text-fg outline-none focus:ring-2 focus:ring-brand/30"
              required
            >
              <option value="">Select a property…</option>
              {(assets ?? []).map((a) => (
                <option key={a.id} value={a.id}>{a.internalName}</option>
              ))}
            </select>
          )}
        </div>

        {/* Dates */}
        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-1.5">
            <Label>Check-in date</Label>
            <DatePicker
              value={checkIn}
              onChange={(v) => {
                setCheckIn(v);
                if (checkOut && v >= checkOut) setCheckOut("");
              }}
              placeholder="Pick a date"
              isDisabled={(d) => d < today}
            />
          </div>
          <div className="space-y-1.5">
            <Label>Check-out date</Label>
            <DatePicker
              value={checkOut}
              onChange={setCheckOut}
              placeholder="Pick a date"
              isDisabled={(d) => {
                if (d < today) return true;
                if (checkIn) return d <= parseISO(checkIn);
                return false;
              }}
            />
          </div>
        </div>

        {/* Deposit */}
        <div className="space-y-1.5">
          <Label htmlFor="deposit">Security deposit (฿)</Label>
          <Input
            id="deposit"
            type="number"
            min="0"
            step="100"
            placeholder="0"
            value={deposit}
            onChange={(e) => setDeposit(e.target.value)}
          />
          <p className="text-xs text-fg-muted">Leave 0 if no deposit required.</p>
        </div>

        <div className="flex gap-3 pt-2">
          <Button
            type="button"
            variant="outline"
            className="flex-1"
            onClick={() => navigate(-1)}
          >
            Cancel
          </Button>
          <Button
            type="submit"
            disabled={!canSubmit}
            className={cn("flex-1 bg-brand hover:bg-[rgb(var(--color-primary-hover))] text-white", !canSubmit && "opacity-50")}
          >
            {createBooking.isPending ? "Creating…" : "Create booking"}
          </Button>
        </div>
      </form>
    </div>
  );
}
