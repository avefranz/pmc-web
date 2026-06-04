import { useState } from "react";
import { Check, Lock, Loader2, ShieldCheck, AlertCircle } from "lucide-react";
import { formatThb } from "@/lib/utils/format";
// BUG-69: PromptPay tab removed — card-only flow per product decision

type GatewayStep = "select" | "processing" | "success";

export function GatewayOverlay({
  amount,
  promptPayId: _promptPayId,
  onSuccess,
  onClose,
}: {
  amount: number;
  promptPayId?: string | null;
  onSuccess: () => Promise<void>;
  onClose: () => void;
}) {
  const [step, setStep] = useState<GatewayStep>("select");
  const [cardNum, setCardNum] = useState("");
  const [cardExp, setCardExp] = useState("");
  const [cardCvv, setCardCvv] = useState("");
  const [error, setError] = useState<string | null>(null);

  async function handlePay() {
    if (step !== "select") return; // guard against double-click while processing
    setStep("processing");
    setError(null);
    try {
      await new Promise((r) => setTimeout(r, 1800));
      // Cap the success callback so a hung backend doesn't strand the user
      // on a perpetual "Processing…" screen with no recourse.
      const timeout = new Promise<never>((_, reject) =>
        setTimeout(() => reject(new Error("Timed out waiting for confirmation")), 30_000),
      );
      await Promise.race([onSuccess(), timeout]);
      setStep("success");
      setTimeout(onClose, 2200);
    } catch (e) {
      const axiosMsg = (e as { response?: { data?: { message?: string } } })?.response?.data?.message;
      const msg = e instanceof Error && e.message.includes("Timed out")
        ? "We didn't get confirmation in time. Your payment may still go through — check your booking in a minute before retrying."
        : axiosMsg
        ?? "Payment could not be processed. Please try again.";
      setError(msg);
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

            {/* Card — BUG-69: PromptPay tab removed, card-only */}
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
                Sandbox · test card: <span className="font-mono text-fg-muted">4111 1111 1111 1111</span>
              </p>
            </div>

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
