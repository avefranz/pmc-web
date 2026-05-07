import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { format, parseISO, addMonths } from "date-fns";
import { X, CheckCircle2, Zap, ArrowLeft, Eye, EyeOff, ExternalLink } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { formatThb } from "@/lib/utils/format";
import { useSubmitBookingRequest } from "@/lib/hooks/use-marketplace";
import { useAuthStore } from "@/lib/stores/auth.store";
import { authApi } from "@/lib/api/auth.api";
import type { DiscountTier, BookingRequestResult } from "@/lib/types/marketplace";

function effectiveRate(base: number, months: number, tiers: DiscountTier[]): number {
  const sorted = [...tiers].sort((a, b) => b.minMonths - a.minMonths);
  const tier = sorted.find((t) => months >= t.minMonths);
  return tier ? Math.round(base * (1 - tier.discountPercent / 100)) : base;
}

interface Props {
  listingId: string;
  listingTitle: string;
  moveInDate: string;
  durationMonths: number;
  monthlyRate: number;
  discountTiers: DiscountTier[];
  onClose: () => void;
}

type Step = "form" | "auth" | "success";
type AuthMode = "register" | "login";

export function BookingRequestModal({
  listingId,
  listingTitle,
  moveInDate,
  durationMonths,
  monthlyRate,
  discountTiers,
  onClose,
}: Props) {
  const submit = useSubmitBookingRequest();
  const { token, setToken } = useAuthStore();
  const navigate = useNavigate();

  // Form fields
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [message, setMessage] = useState("");

  // Multi-step state
  const [step, setStep] = useState<Step>("form");
  const [authMode, setAuthMode] = useState<AuthMode>("register");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [authLoading, setAuthLoading] = useState(false);
  const [authError, setAuthError] = useState("");
  const [bookingResult, setBookingResult] = useState<BookingRequestResult | null>(null);

  const rate = effectiveRate(monthlyRate, durationMonths, discountTiers);
  const total = rate * durationMonths;
  const moveOut = format(addMonths(parseISO(moveInDate), durationMonths), "MMMM d, yyyy");
  const moveInFormatted = format(parseISO(moveInDate), "MMMM d, yyyy");

  async function doSubmitBooking() {
    const result = await submit.mutateAsync({
      listingId,
      moveInDate,
      durationMonths,
      guestName: name.trim() || undefined,
      guestEmail: email.trim() || undefined,
      guestPhone: phone.trim() || undefined,
      message: message.trim() || undefined,
    });
    setBookingResult(result);
    if (result.isInstantBook && result.bookingId) {
      // Instant book — redirect straight to booking
      onClose();
      navigate(`/me/guest/bookings/${result.bookingId}`);
    } else {
      setStep("success");
    }
  }

  async function handleFormSubmit(e: React.FormEvent) {
    e.preventDefault();

    // Authenticated users don't need to fill name/email (backend takes from profile)
    if (token) {
      try {
        await doSubmitBooking();
      } catch (err: unknown) {
        const res = (err as { response?: { data?: { message?: string; errors?: Record<string, string[]> } } })?.response?.data;
        const msg = res?.errors
          ? Object.values(res.errors).flat().join(" · ")
          : res?.message ?? "Failed to send request. Please try again.";
        toast.error(msg);
      }
      return;
    }

    // Not authenticated — need name+email first, then auth
    if (!name.trim() || !email.trim()) return;
    setStep("auth");
  }

  async function handleAuthSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!password) return;
    setAuthError("");
    setAuthLoading(true);

    try {
      let result: { token: string };
      if (authMode === "register") {
        const firstName = name.trim().split(" ")[0];
        result = await authApi.register(email.trim(), password, firstName);
      } else {
        result = await authApi.login(email.trim(), password);
      }

      // Save token to both zustand store and localStorage (same as use-auth.ts)
      setToken(result.token);
      localStorage.setItem("pmc_token", result.token);

      // Auto-submit the booking request
      try {
        await doSubmitBooking();
      } catch (err: unknown) {
        const res = (err as { response?: { data?: { message?: string; errors?: Record<string, string[]> } } })?.response?.data;
        const msg = res?.errors
          ? Object.values(res.errors).flat().join(" · ")
          : res?.message ?? "Failed to send request. Please try again.";
        toast.error(msg);
        setStep("form");
      }
    } catch (err: unknown) {
      const res = (err as { response?: { data?: { message?: string; errors?: Record<string, string[]> } } })?.response?.data;
      if (authMode === "register") {
        const msg = res?.errors
          ? Object.values(res.errors).flat().join(" · ")
          : res?.message ?? "Could not create account. Try a different email.";
        setAuthError(msg);
      } else {
        setAuthError("Incorrect email or password.");
      }
    } finally {
      setAuthLoading(false);
    }
  }

  return (
    <div className="fixed inset-0 z-[100] flex items-end sm:items-center justify-center bg-black/60 backdrop-blur-sm px-0 sm:px-4">
      <div className="bg-bg-card w-full sm:max-w-lg rounded-t-3xl sm:rounded-2xl shadow-pop overflow-hidden">

        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-border">
          <div className="flex items-center gap-2">
            {step === "auth" && (
              <button
                onClick={() => { setStep("form"); setAuthError(""); setPassword(""); }}
                className="w-7 h-7 rounded-full flex items-center justify-center text-fg-muted hover:bg-bg-subtle transition-colors -ml-1 mr-0.5"
              >
                <ArrowLeft size={15} />
              </button>
            )}
            <h2 className="text-base font-semibold text-fg">
              {step === "form" && "Request to Book"}
              {step === "auth" && (authMode === "register" ? "Create your account" : "Sign in")}
              {step === "success" && (bookingResult?.isInstantBook ? "Booking confirmed!" : "Request sent!")}
            </h2>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-full flex items-center justify-center text-fg-muted hover:bg-bg-subtle transition-colors"
          >
            <X size={16} />
          </button>
        </div>

        {/* ─── Success state ─── */}
        {step === "success" && (
          <div className="px-6 py-10 text-center">
            {bookingResult?.isInstantBook ? (
              <div className="w-12 h-12 rounded-full bg-brand/10 flex items-center justify-center mx-auto mb-4">
                <Zap size={24} className="text-brand" />
              </div>
            ) : (
              <CheckCircle2 size={48} className="text-success mx-auto mb-4" />
            )}
            <h3 className="text-lg font-semibold text-fg mb-1">
              {bookingResult?.isInstantBook ? "Booking confirmed!" : "Request received!"}
            </h3>
            <p className="text-sm text-fg-muted mb-6">
              {bookingResult?.isInstantBook
                ? "Your booking is confirmed. Check your booking details below."
                : <>We've sent your request to the property manager. Expect a response within <strong>24 hours</strong>.</>}
            </p>
            <div className="bg-bg-subtle rounded-xl px-4 py-3 text-sm text-left space-y-1 mb-6">
              <div className="flex justify-between">
                <span className="text-fg-muted">Move-in</span>
                <span className="font-medium text-fg">{moveInFormatted}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-fg-muted">Move-out</span>
                <span className="font-medium text-fg">{moveOut}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-fg-muted">Duration</span>
                <span className="font-medium text-fg">{durationMonths} months</span>
              </div>
              <div className="flex justify-between font-semibold text-fg border-t border-border pt-1 mt-1">
                <span>Total estimate</span>
                <span>{formatThb(total)}</span>
              </div>
            </div>
            <div className="space-y-2">
              <Button asChild className="w-full bg-brand hover:bg-[var(--color-primary-hover)] text-white">
                <Link to="/me/guest/applications" onClick={onClose}>
                  <ExternalLink size={14} className="mr-1.5" />View my applications
                </Link>
              </Button>
              <Button variant="ghost" className="w-full text-fg-muted" onClick={onClose}>
                Continue browsing
              </Button>
            </div>
          </div>
        )}

        {/* ─── Booking form ─── */}
        {step === "form" && (
          <form onSubmit={handleFormSubmit}>
            {/* Booking summary */}
            <div className="px-6 py-4 bg-bg-subtle border-b border-border">
              <p className="text-xs font-semibold text-fg-muted uppercase tracking-wide mb-2">
                Your booking
              </p>
              <div className="text-sm space-y-0.5">
                <p className="font-medium text-fg line-clamp-1">{listingTitle}</p>
                <p className="text-fg-muted">
                  {moveInFormatted} → {moveOut} · {durationMonths} month{durationMonths !== 1 ? "s" : ""}
                </p>
                <p className="text-fg font-semibold pt-0.5">{formatThb(total)} total</p>
              </div>
            </div>

            {/* Form fields */}
            <div className="px-6 py-5 space-y-4">
              {!token && (
                <>
                  <div className="space-y-1.5">
                    <Label className="text-sm font-medium text-fg">Full name *</Label>
                    <Input
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      placeholder="Your full name"
                      required
                      autoFocus
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-sm font-medium text-fg">Email *</Label>
                    <Input
                      type="email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder="you@example.com"
                      required
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-sm font-medium text-fg">Phone</Label>
                    <Input
                      type="tel"
                      value={phone}
                      onChange={(e) => setPhone(e.target.value)}
                      placeholder="+66 81 234 5678"
                    />
                  </div>
                </>
              )}
              <div className="space-y-1.5">
                <Label className="text-sm font-medium text-fg">Message</Label>
                <Textarea
                  value={message}
                  onChange={(e) => setMessage(e.target.value)}
                  placeholder="Tell the host a bit about yourself and why you're looking for this place…"
                  className="min-h-[80px] resize-none"
                  autoFocus={!!token}
                />
              </div>
            </div>

            {/* Footer */}
            <div className="px-6 pb-6">
              <Button
                type="submit"
                className="w-full bg-brand hover:bg-[var(--color-primary-hover)] text-white h-12 text-base font-semibold rounded-xl"
                disabled={(!token && (!name.trim() || !email.trim())) || submit.isPending}
              >
                {submit.isPending ? "Sending…" : "Continue"}
              </Button>
              <p className="text-xs text-center text-fg-muted mt-3">
                You won't be charged now. The manager will review and respond.
              </p>
            </div>
          </form>
        )}

        {/* ─── Inline auth gate ─── */}
        {step === "auth" && (
          <form onSubmit={handleAuthSubmit}>
            <div className="px-6 py-5 space-y-5">
              {/* Context reminder */}
              <div className="bg-bg-subtle rounded-xl px-4 py-3 text-sm space-y-0.5">
                <p className="font-medium text-fg line-clamp-1">{listingTitle}</p>
                <p className="text-fg-muted">
                  {moveInFormatted} · {durationMonths} month{durationMonths !== 1 ? "s" : ""} · {formatThb(total)}
                </p>
              </div>

              <div className="space-y-1">
                <p className="text-sm text-fg-muted">
                  {authMode === "register"
                    ? "One last step — create a free account to send your request."
                    : "Welcome back! Sign in to send your request."}
                </p>
              </div>

              {/* Email (read-only, pre-filled) */}
              <div className="space-y-1.5">
                <Label className="text-sm font-medium text-fg">Email</Label>
                <Input
                  type="email"
                  value={email}
                  readOnly
                  className="bg-bg-subtle text-fg-muted cursor-default"
                />
              </div>

              {/* Password */}
              <div className="space-y-1.5">
                <Label className="text-sm font-medium text-fg">
                  {authMode === "register" ? "Choose a password" : "Password"}
                </Label>
                <div className="relative">
                  <Input
                    type={showPassword ? "text" : "password"}
                    value={password}
                    onChange={(e) => { setPassword(e.target.value); setAuthError(""); }}
                    placeholder="••••••••"
                    required
                    autoFocus
                    className="pr-10"
                  />
                  <button
                    type="button"
                    tabIndex={-1}
                    onClick={() => setShowPassword((v) => !v)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-fg-muted hover:text-fg transition-colors"
                  >
                    {showPassword ? <EyeOff size={15} /> : <Eye size={15} />}
                  </button>
                </div>
                {authError && <p className="text-xs text-destructive">{authError}</p>}
              </div>
            </div>

            <div className="px-6 pb-6 space-y-3">
              <Button
                type="submit"
                className="w-full bg-brand hover:bg-[var(--color-primary-hover)] text-white h-12 text-base font-semibold rounded-xl"
                disabled={!password || authLoading}
              >
                {authLoading
                  ? "Please wait…"
                  : authMode === "register"
                  ? "Create account & send request"
                  : "Sign in & send request"}
              </Button>

              <p className="text-sm text-center text-fg-muted">
                {authMode === "register" ? (
                  <>
                    Already have an account?{" "}
                    <button
                      type="button"
                      onClick={() => { setAuthMode("login"); setAuthError(""); setPassword(""); }}
                      className="text-brand hover:underline font-medium"
                    >
                      Sign in
                    </button>
                  </>
                ) : (
                  <>
                    New here?{" "}
                    <button
                      type="button"
                      onClick={() => { setAuthMode("register"); setAuthError(""); setPassword(""); }}
                      className="text-brand hover:underline font-medium"
                    >
                      Create account
                    </button>
                  </>
                )}
              </p>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}
