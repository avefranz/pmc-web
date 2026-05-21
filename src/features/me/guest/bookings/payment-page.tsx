import { useState } from "react";
import { useParams, Link, useNavigate } from "react-router-dom";
import {
  ArrowLeft, Check, Lock, Smartphone, CreditCard, Loader2, ShieldCheck,
  AlertCircle, CalendarDays, Timer, Home, Coins,
} from "lucide-react";
import QRCode from "react-qr-code";
import generatePayload from "promptpay-qr";
import { toast } from "sonner";
import { Skeleton } from "@/components/ui/skeleton";
import { useBookingPayment, useBooking } from "@/lib/hooks/use-bookings";
import { useListing } from "@/lib/hooks/use-listings";
import { formatThb, formatDate } from "@/lib/utils/format";
import { cn } from "@/lib/utils/cn";
import type { PaymentRecordDto } from "@/lib/types";

function paymentLabel(p: PaymentRecordDto): string {
  if (p.type === "Deposit") return "Security deposit";
  if (p.type === "EarlyExitPenalty") return "Early exit penalty";
  if (p.type === "MonthlyRent") return p.monthIndex === 1 ? "First month's rent" : `Month ${p.monthIndex} rent`;
  return "Payment";
}

// ─── Simulated 2C2P Gateway ───────────────────────────────────────────────────

type GatewayStep = "select" | "processing" | "success";
type PayMethod = "promptpay" | "card";

function GatewayOverlay({
  amount,
  promptPayId,
  onSuccess,
  onClose,
}: {
  amount: number;
  promptPayId?: string | null;
  onSuccess: () => Promise<void>;
  onClose: () => void;
}) {
  const [step, setStep] = useState<GatewayStep>("select");
  const [method, setMethod] = useState<PayMethod>(promptPayId ? "promptpay" : "card");
  const [cardNum, setCardNum] = useState("");
  const [cardExp, setCardExp] = useState("");
  const [cardCvv, setCardCvv] = useState("");
  const [error, setError] = useState<string | null>(null);

  let qrPayload: string | null = null;
  if (promptPayId) {
    try { qrPayload = generatePayload(promptPayId, { amount }); } catch { /* noop */ }
  }

  async function handlePay() {
    setStep("processing");
    setError(null);
    try {
      await new Promise((r) => setTimeout(r, 1800));
      await onSuccess();
      setStep("success");
      setTimeout(onClose, 2200);
    } catch {
      setError("Payment could not be processed. Please try again.");
      setStep("select");
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/60 backdrop-blur-sm p-0 sm:p-4">
      <div className="bg-bg-card dark:bg-zinc-900 rounded-t-3xl sm:rounded-3xl shadow-2xl w-full sm:max-w-sm overflow-hidden">

        {/* Header */}
        <div className="bg-gradient-to-r from-[#1a1a2e] to-[#16213e] px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Lock size={13} className="text-white/70" />
            <span className="text-white text-sm font-semibold">Secure Payment</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-[10px] font-bold bg-yellow-400 text-black px-1.5 py-0.5 rounded-full tracking-wide">SANDBOX</span>
            <span className="text-white/40 text-xs font-medium">2C2P</span>
          </div>
        </div>

        {/* Processing */}
        {step === "processing" && (
          <div className="px-6 py-14 flex flex-col items-center gap-4 text-center">
            <div className="relative w-16 h-16">
              <div className="absolute inset-0 rounded-full border-4 border-blue-100 dark:border-blue-900" />
              <Loader2 size={28} className="absolute inset-0 m-auto text-blue-600 animate-spin" />
            </div>
            <div>
              <p className="text-base font-semibold text-fg dark:text-white">Processing…</p>
              <p className="text-sm text-fg-subtle mt-1">Please don't close this window</p>
            </div>
          </div>
        )}

        {/* Success */}
        {step === "success" && (
          <div className="px-6 py-14 flex flex-col items-center gap-4 text-center">
            <div className="w-16 h-16 rounded-full bg-green-100 dark:bg-green-900/40 flex items-center justify-center">
              <Check size={30} className="text-green-600 dark:text-green-400" />
            </div>
            <div>
              <p className="text-base font-semibold text-fg dark:text-white">Payment successful!</p>
              <p className="text-sm text-fg-subtle mt-1">Redirecting…</p>
            </div>
          </div>
        )}

        {/* Select method */}
        {step === "select" && (
          <>
            {/* Amount */}
            <div className="px-6 pt-5 pb-4 border-b border-border dark:border-zinc-800 text-center">
              <p className="text-xs text-fg-subtle uppercase tracking-widest mb-1">Total due</p>
              <p className="text-4xl font-bold text-fg dark:text-white tabular-nums">{formatThb(amount)}</p>
            </div>

            {/* Method switcher */}
            {promptPayId && (
              <div className="px-6 pt-4">
                <div className="flex rounded-xl bg-bg-subtle dark:bg-zinc-800 p-1 gap-1">
                  <button
                    onClick={() => setMethod("promptpay")}
                    className={cn(
                      "flex-1 flex items-center justify-center gap-1.5 py-2 rounded-lg text-sm font-medium transition-all",
                      method === "promptpay"
                        ? "bg-bg-card dark:bg-zinc-700 text-fg dark:text-white shadow-sm"
                        : "text-fg-muted hover:text-fg"
                    )}
                  >
                    <Smartphone size={14} /> PromptPay
                  </button>
                  <button
                    onClick={() => setMethod("card")}
                    className={cn(
                      "flex-1 flex items-center justify-center gap-1.5 py-2 rounded-lg text-sm font-medium transition-all",
                      method === "card"
                        ? "bg-bg-card dark:bg-zinc-700 text-fg dark:text-white shadow-sm"
                        : "text-fg-muted hover:text-fg"
                    )}
                  >
                    <CreditCard size={14} /> Card
                  </button>
                </div>
              </div>
            )}

            {/* PromptPay */}
            {method === "promptpay" && promptPayId && (
              <div className="px-6 py-4 flex flex-col items-center gap-3">
                <div className="p-3 bg-white rounded-2xl border border-border shadow-sm">
                  {qrPayload
                    ? <QRCode value={qrPayload} size={160} />
                    : <div className="w-40 h-40 bg-bg-subtle rounded-xl flex items-center justify-center"><Smartphone size={32} className="text-fg-subtle" /></div>
                  }
                </div>
                <p className="text-xs text-fg-subtle text-center max-w-[220px]">
                  Scan with any Thai banking app, then tap <strong className="text-fg-muted">Confirm</strong> below
                </p>
              </div>
            )}

            {/* Card */}
            {method === "card" && (
              <div className="px-6 py-4 space-y-3">
                <div>
                  <label className="text-xs font-medium text-fg-muted block mb-1">Card number</label>
                  <input
                    type="text" placeholder="4111 1111 1111 1111" value={cardNum} maxLength={19}
                    onChange={(e) => {
                      const v = e.target.value.replace(/\D/g, "").slice(0, 16);
                      setCardNum(v.replace(/(.{4})/g, "$1 ").trim());
                    }}
                    className="w-full px-3 py-2.5 text-sm rounded-xl border border-border dark:border-zinc-700 bg-bg-card dark:bg-zinc-800 text-fg dark:text-white font-mono focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                <div className="flex gap-3">
                  <div className="flex-1">
                    <label className="text-xs font-medium text-fg-muted block mb-1">Expiry</label>
                    <input
                      type="text" placeholder="MM / YY" value={cardExp} maxLength={7}
                      onChange={(e) => {
                        const v = e.target.value.replace(/\D/g, "").slice(0, 4);
                        setCardExp(v.length > 2 ? `${v.slice(0, 2)} / ${v.slice(2)}` : v);
                      }}
                      className="w-full px-3 py-2.5 text-sm rounded-xl border border-border dark:border-zinc-700 bg-bg-card dark:bg-zinc-800 font-mono focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                  <div className="w-24">
                    <label className="text-xs font-medium text-fg-muted block mb-1">CVV</label>
                    <input
                      type="text" placeholder="123" value={cardCvv} maxLength={4}
                      onChange={(e) => setCardCvv(e.target.value.replace(/\D/g, "").slice(0, 4))}
                      className="w-full px-3 py-2.5 text-sm rounded-xl border border-border dark:border-zinc-700 bg-bg-card dark:bg-zinc-800 font-mono focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                </div>
                <p className="text-[11px] text-fg-subtle text-center">
                  Sandbox — test card: <span className="font-mono text-fg-muted">4111 1111 1111 1111</span>
                </p>
              </div>
            )}

            {error && (
              <div className="mx-6 mb-1 px-3 py-2.5 bg-red-50 dark:bg-red-900/20 rounded-xl flex items-center gap-2">
                <AlertCircle size={14} className="text-red-500 shrink-0" />
                <p className="text-xs text-red-600 dark:text-red-400">{error}</p>
              </div>
            )}

            <div className="px-6 pb-5 pt-3 space-y-2">
              <button
                onClick={handlePay}
                className="w-full bg-blue-600 hover:bg-blue-700 active:scale-[0.99] text-white font-semibold rounded-xl py-3.5 text-sm transition-all flex items-center justify-center gap-2"
              >
                <Lock size={13} />
                Confirm payment · {formatThb(amount)}
              </button>
              <button onClick={onClose} className="w-full text-sm text-fg-subtle hover:text-fg-muted py-2 transition-colors">
                Cancel
              </button>
            </div>

            <div className="px-6 pb-4 flex items-center justify-center gap-1.5 text-[11px] text-fg-subtle dark:text-zinc-600">
              <ShieldCheck size={11} />
              <span>PCI DSS Level 1 · SSL encrypted</span>
            </div>
          </>
        )}
      </div>
    </div>
  );
}

// ─── Payment status badge ─────────────────────────────────────────────────────

function StatusBadge({ status }: { status: PaymentRecordDto["status"] }) {
  if (status === "Paid") return (
    <span className="inline-flex items-center gap-1 text-xs font-semibold text-success bg-success/10 px-2.5 py-1 rounded-full">
      <Check size={10} strokeWidth={3} /> Paid
    </span>
  );
  return (
    <span className="text-xs font-semibold text-warning bg-warning/10 px-2.5 py-1 rounded-full">Due</span>
  );
}

// ─── Main page ────────────────────────────────────────────────────────────────

export function GuestPaymentPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { data: payment, isLoading: paymentLoading, refetch } = useBookingPayment(id!);
  const { data: booking, isLoading: bookingLoading } = useBooking(id!);
  const { data: listing } = useListing(booking?.listingId);
  const [gatewayOpen, setGatewayOpen] = useState(false);

  const isLoading = paymentLoading || bookingLoading;

  if (isLoading) {
    return (
      <div className="max-w-4xl space-y-4">
        <Skeleton className="h-8 w-48" />
        <div className="grid grid-cols-1 lg:grid-cols-[1fr_420px] gap-6">
          <Skeleton className="h-80 rounded-2xl" />
          <Skeleton className="h-80 rounded-2xl" />
        </div>
      </div>
    );
  }

  if (!payment || !booking) {
    return (
      <div className="max-w-4xl">
        <div className="flex items-center gap-2 mb-6">
          <Link to={`/me/guest/bookings/${id}`} className="p-1.5 rounded-lg hover:bg-bg-subtle text-fg-muted hover:text-fg">
            <ArrowLeft size={18} />
          </Link>
          <h1 className="text-xl font-semibold text-fg">Payment</h1>
        </div>
        <div className="bg-bg-card rounded-2xl shadow-card p-8 text-center">
          <AlertCircle size={32} className="text-fg-muted mx-auto mb-3" />
          <p className="text-fg-muted">Payment information not available.</p>
        </div>
      </div>
    );
  }

  // Show only initial payment items (Deposit + MonthlyRent[1] + EarlyExitPenalty)
  const allPayments = (payment.payments ?? []).filter(
    (p) => p.type === "Deposit" || p.type === "EarlyExitPenalty" || (p.type === "MonthlyRent" && (p.monthIndex === 1 || p.monthIndex == null)),
  );
  const pendingPayments = allPayments.filter((p) => p.status === "Pending");
  const totalPending = pendingPayments.reduce((sum, p) => sum + p.amount, 0);
  const heroUrl = listing?.media?.[0]?.url ?? booking.primaryImageUrl;

  const checkIn = new Date(booking.checkInDate);
  const checkOut = new Date(booking.checkOutDate);
  const durationMonths = (checkOut.getFullYear() - checkIn.getFullYear()) * 12 + (checkOut.getMonth() - checkIn.getMonth());

  async function handleGatewaySuccess() {
    // Payment is confirmed automatically by the gateway webhook on the backend
    await refetch();
    toast.success("Payment confirmed — your booking is now active!");
    setTimeout(() => navigate(`/me/guest/bookings/${id}`), 800);
  }

  return (
    <div className="max-w-4xl pb-8">
      {/* Back */}
      <div className="flex items-center gap-2 mb-6">
        <Link
          to={`/me/guest/bookings/${id}`}
          className="p-1.5 rounded-xl hover:bg-bg-subtle text-fg-muted hover:text-fg transition-colors"
        >
          <ArrowLeft size={18} />
        </Link>
        <h1 className="text-xl font-semibold text-fg">Complete payment</h1>
      </div>

      {/* Two-column layout */}
      <div className="grid grid-cols-1 lg:grid-cols-[1fr_380px] gap-6 items-start">

        {/* LEFT — property context */}
        <div className="space-y-4">

          {/* Hero */}
          <div className="h-56 sm:h-72 rounded-2xl overflow-hidden bg-bg-subtle relative">
            {heroUrl
              ? <img src={heroUrl} alt="Property" className="w-full h-full object-cover" style={{ imageOrientation: "from-image" }} />
              : <div className="w-full h-full flex items-center justify-center"><Home size={48} className="text-fg-subtle" /></div>
            }
            {payment.isFullyPaid && (
              <div className="absolute inset-0 bg-success/30 flex items-center justify-center">
                <div className="bg-bg-card/95 rounded-2xl px-6 py-4 flex items-center gap-3 shadow-lg">
                  <div className="w-10 h-10 rounded-full bg-success flex items-center justify-center shrink-0">
                    <Check size={20} className="text-white" />
                  </div>
                  <div>
                    <p className="font-semibold text-success text-sm">All paid</p>
                    <p className="text-xs text-fg-muted">Booking confirmed</p>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Property name */}
          <div className="bg-bg-card rounded-2xl shadow-card px-5 py-4">
            <h2 className="text-base font-semibold text-fg mb-3">
              {listing?.title ?? booking.assetName ?? "Your stay"}
            </h2>
            <div className="grid grid-cols-2 gap-3">
              <div className="flex items-center gap-2 text-sm">
                <CalendarDays size={14} className="text-fg-muted shrink-0" />
                <div>
                  <p className="text-xs text-fg-muted">Check-in</p>
                  <p className="font-medium text-fg">{formatDate(booking.checkInDate)}</p>
                </div>
              </div>
              <div className="flex items-center gap-2 text-sm">
                <CalendarDays size={14} className="text-fg-muted shrink-0" />
                <div>
                  <p className="text-xs text-fg-muted">Check-out</p>
                  <p className="font-medium text-fg">{formatDate(booking.checkOutDate)}</p>
                </div>
              </div>
              {durationMonths > 0 && (
                <div className="flex items-center gap-2 text-sm">
                  <Timer size={14} className="text-fg-muted shrink-0" />
                  <div>
                    <p className="text-xs text-fg-muted">Duration</p>
                    <p className="font-medium text-fg">{durationMonths} month{durationMonths !== 1 ? "s" : ""}</p>
                  </div>
                </div>
              )}
              <div className="flex items-center gap-2 text-sm">
                <Coins size={14} className="text-fg-muted shrink-0" />
                <div>
                  <p className="text-xs text-fg-muted">Monthly rent</p>
                  <p className="font-medium text-fg">
                    {formatThb(durationMonths > 0 ? Math.round(booking.rentAmount / durationMonths) : booking.rentAmount)}
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* What you're paying */}
          <div className="bg-bg-card rounded-2xl shadow-card overflow-hidden">
            <div className="px-5 pt-4 pb-3 border-b border-border">
              <h3 className="text-sm font-semibold text-fg">What you're paying</h3>
            </div>
            {allPayments.map((p) => (
              <div key={p.id} className="flex items-center justify-between px-5 py-3.5 border-b border-border last:border-none">
                <div>
                  <p className="text-sm font-medium text-fg">{paymentLabel(p)}</p>
                  <p className="text-xs text-fg-muted mt-0.5">{formatThb(p.amount)}</p>
                </div>
                <StatusBadge status={p.status} />
              </div>
            ))}
            <div className="px-5 py-3.5 bg-bg-subtle flex items-center justify-between">
              <span className="text-sm font-semibold text-fg">Total</span>
              <span className="text-lg font-bold text-fg tabular-nums">{formatThb(payment.totalDue)}</span>
            </div>
          </div>
        </div>

        {/* RIGHT — payment action */}
        <div className="lg:sticky lg:top-8 space-y-4">

          {/* All paid */}
          {payment.isFullyPaid ? (
            <div className="bg-success/10 border border-success/20 rounded-2xl p-6 flex flex-col items-center text-center gap-3">
              <div className="w-14 h-14 rounded-full bg-success flex items-center justify-center">
                <Check size={26} className="text-white" />
              </div>
              <div>
                <p className="font-semibold text-success text-base">All payments confirmed</p>
                <p className="text-xs text-fg-muted mt-1">Your booking is now active</p>
              </div>
              <button
                onClick={() => navigate(`/me/guest/bookings/${id}`)}
                className="mt-1 text-sm font-semibold text-brand hover:underline"
              >
                View my stay →
              </button>
            </div>
          ) : (
            <>
              {/* Payment summary card */}
              <div className="bg-bg-card rounded-2xl shadow-card p-5">
                <div className="flex items-baseline justify-between mb-4">
                  <p className="text-sm font-semibold text-fg">Amount due</p>
                  <p className="text-3xl font-bold text-fg tabular-nums">{formatThb(totalPending || payment.totalDue)}</p>
                </div>

                {/* What's included */}
                <div className="space-y-2 mb-5">
                  {pendingPayments.map((p) => (
                    <div key={p.id} className="flex justify-between text-sm">
                      <span className="text-fg-muted">{paymentLabel(p)}</span>
                      <span className="font-medium text-fg">{formatThb(p.amount)}</span>
                    </div>
                  ))}
                </div>

                {/* Pay button */}
                {pendingPayments.length > 0 && (
                  <button
                    onClick={() => setGatewayOpen(true)}
                    className="w-full bg-brand hover:bg-[rgb(var(--color-primary-hover))] active:scale-[0.99] text-white font-semibold rounded-xl py-4 text-base transition-all flex items-center justify-center gap-2 shadow-sm"
                  >
                    <Lock size={15} />
                    Pay securely
                  </button>
                )}

                <div className="mt-3 flex items-center justify-center gap-1.5 text-xs text-fg-muted">
                  <ShieldCheck size={12} />
                  <span>Secured by 2C2P · SSL encrypted</span>
                </div>
              </div>

              {/* Why pay now */}
              <div className="bg-warning/8 border border-warning/20 rounded-2xl px-5 py-4">
                <p className="text-xs font-semibold text-warning mb-1">Payment required to activate booking</p>
                <p className="text-xs text-fg-muted leading-relaxed">
                  Your reservation is held pending payment. If payment is not completed before check-in, the booking will be automatically released.
                </p>
              </div>

              {/* Accepted methods */}
              <div className="bg-bg-card rounded-2xl shadow-card px-5 py-4">
                <p className="text-xs font-semibold text-fg-muted uppercase tracking-wide mb-3">Accepted methods</p>
                <div className="flex items-center gap-3 flex-wrap">
                  {payment.promptPayId && (
                    <div className="flex items-center gap-1.5 text-xs text-fg-muted">
                      <Smartphone size={14} /> PromptPay
                    </div>
                  )}
                  {payment.bankAccountNumber && (
                    <div className="flex items-center gap-1.5 text-xs text-fg-muted">
                      <CreditCard size={14} /> Bank transfer
                    </div>
                  )}
                  <div className="flex items-center gap-1.5 text-xs text-fg-muted">
                    <CreditCard size={14} /> Visa / Mastercard
                  </div>
                </div>
                {!payment.promptPayId && !payment.bankAccountNumber && (
                  <p className="text-[11px] text-fg-muted mt-2 leading-relaxed">
                    Your host hasn't shared a PromptPay or bank account yet, so only card payment is available.
                  </p>
                )}
              </div>
            </>
          )}
        </div>
      </div>

      {/* Gateway overlay */}
      {gatewayOpen && (
        <GatewayOverlay
          amount={totalPending}
          promptPayId={payment.promptPayId}
          onSuccess={handleGatewaySuccess}
          onClose={() => setGatewayOpen(false)}
        />
      )}
    </div>
  );
}
