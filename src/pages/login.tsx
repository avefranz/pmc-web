import { useState } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useLogin } from "@/lib/hooks/use-auth";
import { useAuthStore } from "@/lib/stores/auth.store";
import { SiamoLogo } from "@/components/layout/siamo-logo";

const LINE_CLIENT_ID = import.meta.env.VITE_LINE_CLIENT_ID;
const LINE_REDIRECT_URI = import.meta.env.VITE_LINE_REDIRECT_URI ?? `${window.location.origin}/line-callback`;

export default function LoginPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [errors, setErrors] = useState<{ email?: string; password?: string }>({});
  const [serverError, setServerError] = useState("");
  const login = useLogin();
  const token = useAuthStore((s) => s.token);
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const redirectTo = searchParams.get("redirect") ?? "/me/trips";

  if (token) {
    navigate(redirectTo, { replace: true });
    return null;
  }

  function validate() {
    const e: typeof errors = {};
    if (!email.trim()) e.email = "Email is required.";
    else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) e.email = "Enter a valid email.";
    if (!password) e.password = "Password is required.";
    return e;
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setServerError("");
    const v = validate();
    if (Object.keys(v).length) { setErrors(v); return; }
    setErrors({});
    try {
      await login.mutateAsync({ email: email.trim(), password });
      navigate(redirectTo, { replace: true });
    } catch (err: unknown) {
      // BUG-110: show the specific error detail from BE (401 "Invalid email or password.", etc.)
      const detail = (err as { response?: { data?: { detail?: string } } })?.response?.data?.detail;
      setServerError(detail ?? "Invalid email or password.");
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
          <h1 className="text-2xl font-semibold text-fg mb-1">Welcome back</h1>
          <p className="text-sm text-fg-muted mb-6">Sign in to your account</p>

          <form onSubmit={handleSubmit} noValidate className="space-y-4">
            <div className="space-y-1.5">
              <Label htmlFor="email" className="text-sm font-medium text-fg">Email</Label>
              <Input
                id="email"
                name="email"
                type="email"
                autoComplete="email"
                placeholder="you@example.com"
                value={email}
                onChange={(e) => { setEmail(e.target.value); setErrors((p) => ({ ...p, email: undefined })); setServerError(""); }}
                className={errors.email ? "border-destructive" : ""}
              />
              {errors.email && <p className="text-xs text-destructive">{errors.email}</p>}
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="password" className="text-sm font-medium text-fg">Password</Label>
              <Input
                id="password"
                name="password"
                type="password"
                autoComplete="current-password"
                placeholder="••••••••"
                value={password}
                onChange={(e) => { setPassword(e.target.value); setErrors((p) => ({ ...p, password: undefined })); setServerError(""); }}
                className={errors.password ? "border-destructive" : ""}
              />
              {errors.password && <p className="text-xs text-destructive">{errors.password}</p>}
            </div>

            {serverError && <p className="text-sm text-destructive">{serverError}</p>}

            <Button
              className="w-full bg-brand hover:bg-[rgb(var(--color-primary-hover))] text-white font-medium"
              type="submit"
              disabled={login.isPending}
            >
              {login.isPending ? "Signing in…" : "Sign in"}
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
            Don't have an account?{" "}
            <Link to="/register" className="text-brand hover:underline font-medium">
              Register
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}
