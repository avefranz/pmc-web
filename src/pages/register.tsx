import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Eye, EyeOff } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useRegister } from "@/lib/hooks/use-auth";
import { useAuthStore } from "@/lib/stores/auth.store";
import { SiamoLogo } from "@/components/layout/siamo-logo";
import { PasswordHints } from "@/components/shared/password-hints";

const LINE_CLIENT_ID = import.meta.env.VITE_LINE_CLIENT_ID;
const LINE_REDIRECT_URI = import.meta.env.VITE_LINE_REDIRECT_URI ?? `${window.location.origin}/line-callback`;

export default function RegisterPage() {
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [acceptedTerms, setAcceptedTerms] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [errors, setErrors] = useState<{ firstName?: string; lastName?: string; email?: string; password?: string; terms?: string }>({});
  const [serverError, setServerError] = useState("");
  const register = useRegister();
  const token = useAuthStore((s) => s.token);
  const navigate = useNavigate();

  if (token) {
    navigate("/me/trips", { replace: true });
    return null;
  }

  function validate() {
    const e: typeof errors = {};
    if (!firstName.trim()) e.firstName = "First name is required.";
    if (!lastName.trim()) e.lastName = "Last name is required.";
    if (!email.trim()) e.email = "Email is required.";
    else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) e.email = "Enter a valid email.";
    if (!password || password.length < 8) e.password = "Password must be at least 8 characters.";
    if (!acceptedTerms) e.terms = "Please accept the Terms and Privacy Policy to continue.";
    return e;
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setServerError("");
    const v = validate();
    if (Object.keys(v).length) { setErrors(v); return; }
    setErrors({});
    try {
      await register.mutateAsync({ email: email.trim(), password, firstName: firstName.trim(), lastName: lastName.trim() });
      navigate("/me/onboarding/intent", { replace: true });
    } catch (err: unknown) {
      // BUG-110: show specific BE error (400 "Email already exists", validation errors, etc.)
      const detail = (err as { response?: { data?: { detail?: string } } })?.response?.data?.detail;
      setServerError(detail ?? "Registration failed. This email may already be in use.");
    }
  }

  function handleLine() {
    const params = new URLSearchParams({
      response_type: "code",
      client_id: LINE_CLIENT_ID ?? "",
      redirect_uri: LINE_REDIRECT_URI,
      state: crypto.randomUUID(),
      scope: "profile openid email",
    });
    window.location.href = `https://access.line.me/oauth2/v2.1/authorize?${params}`;
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-bg px-4">
      <div className="w-full max-w-[420px]">
        {/* Logo */}
        <div className="flex justify-center mb-8">
          <Link to="/listings">
            <SiamoLogo className="h-11" />
          </Link>
        </div>

        <div className="bg-bg-card rounded-xl shadow-pop p-8">
          <h1 className="text-2xl font-semibold text-fg mb-1">Create an account</h1>
          <p className="text-sm text-fg-muted mb-6">Find a place to rent or list your property — one account for both.</p>

          <form onSubmit={handleSubmit} noValidate className="space-y-4">
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label htmlFor="firstName" className="text-sm font-medium text-fg">First name</Label>
                <Input
                  id="firstName"
                  type="text"
                  placeholder="Alex"
                  value={firstName}
                  onChange={(e) => { setFirstName(e.target.value); setErrors((p) => ({ ...p, firstName: undefined })); }}
                  className={errors.firstName ? "border-destructive" : ""}
                />
                {errors.firstName && <p className="text-xs text-destructive">{errors.firstName}</p>}
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="lastName" className="text-sm font-medium text-fg">Last name</Label>
                <Input
                  id="lastName"
                  type="text"
                  placeholder="Tanaka"
                  value={lastName}
                  onChange={(e) => { setLastName(e.target.value); setErrors((p) => ({ ...p, lastName: undefined })); }}
                  className={errors.lastName ? "border-destructive" : ""}
                />
                {errors.lastName && <p className="text-xs text-destructive">{errors.lastName}</p>}
              </div>
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="email" className="text-sm font-medium text-fg">Email</Label>
              <Input
                id="email"
                type="email"
                placeholder="you@example.com"
                value={email}
                onChange={(e) => { setEmail(e.target.value); setErrors((p) => ({ ...p, email: undefined })); setServerError(""); }}
                className={errors.email ? "border-destructive" : ""}
              />
              {errors.email && <p className="text-xs text-destructive">{errors.email}</p>}
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="password" className="text-sm font-medium text-fg">Password</Label>
              <div className="relative">
                <Input
                  id="password"
                  type={showPassword ? "text" : "password"}
                  placeholder="At least 8 characters"
                  value={password}
                  onChange={(e) => { setPassword(e.target.value); setErrors((p) => ({ ...p, password: undefined })); }}
                  className={errors.password ? "border-destructive pr-10" : "pr-10"}
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
              {errors.password
                ? <p className="text-xs text-destructive">{errors.password}</p>
                : <PasswordHints password={password} />}
            </div>

            <div className="space-y-1.5 pt-1">
              <label className="flex items-start gap-2 cursor-pointer select-none">
                <input
                  id="terms"
                  type="checkbox"
                  checked={acceptedTerms}
                  onChange={(e) => { setAcceptedTerms(e.target.checked); setErrors((p) => ({ ...p, terms: undefined })); }}
                  className="mt-0.5 h-4 w-4 shrink-0 rounded border-border accent-brand"
                />
                <span className="text-xs text-fg-muted leading-relaxed">
                  I agree to the{" "}
                  <a href="/terms" target="_blank" rel="noopener" className="text-brand hover:underline">Terms of Service</a>
                  {" "}and{" "}
                  <a href="/privacy" target="_blank" rel="noopener" className="text-brand hover:underline">Privacy Policy</a>.
                </span>
              </label>
              {errors.terms && <p className="text-xs text-destructive">{errors.terms}</p>}
            </div>

            {serverError && <p className="text-sm text-destructive">{serverError}</p>}

            <Button
              className="w-full bg-brand hover:bg-[rgb(var(--color-primary-hover))] text-white font-medium"
              type="submit"
              disabled={register.isPending || !acceptedTerms}
            >
              {register.isPending ? "Creating account…" : "Create account"}
            </Button>
          </form>

          {LINE_CLIENT_ID && (
            <>
              <div className="relative my-5">
                <div className="absolute inset-0 flex items-center">
                  <span className="w-full border-t border-border" />
                </div>
                <div className="relative flex justify-center text-xs">
                  <span className="bg-bg-card px-2 text-fg-muted">or</span>
                </div>
              </div>
              <Button variant="outline" className="w-full" onClick={handleLine}>
                <span className="mr-2 text-[#06C755] font-bold">L</span>
                Continue with LINE
              </Button>
            </>
          )}

          <p className="text-center text-sm text-fg-muted mt-6">
            Already have an account?{" "}
            <Link to="/login" className="text-brand hover:underline font-medium">
              Sign in
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}
