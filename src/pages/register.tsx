import { useState } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useRegister } from "@/lib/hooks/use-auth";
import { cn } from "@/lib/utils/cn";

interface RegisterErrors {
  email?: string;
  password?: string;
  confirm?: string;
}

interface PasswordRule {
  label: string;
  test: (pw: string) => boolean;
}

const PASSWORD_RULES: PasswordRule[] = [
  { label: "At least 8 characters",      test: (pw) => pw.length >= 8 },
  { label: "One uppercase letter (A–Z)", test: (pw) => /[A-Z]/.test(pw) },
  { label: "One lowercase letter (a–z)", test: (pw) => /[a-z]/.test(pw) },
  { label: "One number (0–9)",           test: (pw) => /[0-9]/.test(pw) },
];

function PasswordStrength({ password }: { password: string }) {
  if (!password) return null;
  return (
    <ul className="mt-2 space-y-1">
      {PASSWORD_RULES.map((rule) => {
        const ok = rule.test(password);
        return (
          <li key={rule.label} className={cn("flex items-center gap-1.5 text-xs", ok ? "text-green-600" : "text-muted-foreground")}>
            <span className={cn("flex-shrink-0 w-3.5 h-3.5 rounded-full border flex items-center justify-center text-[9px] font-bold", ok ? "bg-green-600 border-green-600 text-white" : "border-muted-foreground/40")}>
              {ok ? "✓" : ""}
            </span>
            {rule.label}
          </li>
        );
      })}
    </ul>
  );
}

function validateRegisterForm(email: string, password: string, confirm: string): RegisterErrors {
  const errors: RegisterErrors = {};

  if (!email.trim()) {
    errors.email = "Email is required.";
  } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) {
    errors.email = "Please provide a valid email address.";
  }

  if (!password) {
    errors.password = "Password is required.";
  } else {
    const failing = PASSWORD_RULES.filter((r) => !r.test(password));
    if (failing.length > 0) {
      errors.password = failing[0].label + ".";
    }
  }

  if (!confirm) {
    errors.confirm = "Please confirm your password.";
  } else if (confirm !== password) {
    errors.confirm = "Passwords do not match.";
  }

  return errors;
}

export default function RegisterPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [errors, setErrors] = useState<RegisterErrors>({});
  const [serverError, setServerError] = useState("");
  const [passwordFocused, setPasswordFocused] = useState(false);
  const register = useRegister();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const redirectTo = searchParams.get("redirect") ?? "/role-router";

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setServerError("");

    const validationErrors = validateRegisterForm(email, password, confirm);
    if (Object.keys(validationErrors).length > 0) {
      setErrors(validationErrors);
      return;
    }
    setErrors({});

    try {
      await register.mutateAsync({ email: email.trim(), password });
      navigate(redirectTo, { replace: true });
    } catch {
      setServerError("Registration failed. This email may already be in use.");
    }
  }

  const allRulesPassed = PASSWORD_RULES.every((r) => r.test(password));

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-900 to-slate-800 p-4">
      <div className="w-full max-w-sm">
        <div className="flex items-center justify-center mb-8">
          <div className="w-10 h-10 rounded-xl bg-blue-500 flex items-center justify-center mr-3">
            <span className="text-white font-bold text-lg">P</span>
          </div>
          <span className="text-white font-bold text-xl">PMC</span>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Create account</CardTitle>
            <CardDescription>Join the PMC platform</CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} noValidate className="space-y-4">
              {/* Email */}
              <div className="space-y-1">
                <Label htmlFor="email">Email</Label>
                <Input
                  id="email"
                  type="email"
                  placeholder="you@example.com"
                  value={email}
                  onChange={(e) => {
                    setEmail(e.target.value);
                    if (errors.email) setErrors((p) => ({ ...p, email: undefined }));
                    if (serverError) setServerError("");
                  }}
                  className={errors.email ? "border-destructive focus-visible:ring-destructive" : ""}
                />
                {errors.email && <p className="text-xs text-destructive">{errors.email}</p>}
              </div>

              {/* Password */}
              <div className="space-y-1">
                <Label htmlFor="password">Password</Label>
                <Input
                  id="password"
                  type="password"
                  placeholder="Min. 8 characters"
                  value={password}
                  onFocus={() => setPasswordFocused(true)}
                  onChange={(e) => {
                    setPassword(e.target.value);
                    if (errors.password) setErrors((p) => ({ ...p, password: undefined }));
                  }}
                  className={errors.password ? "border-destructive focus-visible:ring-destructive" : ""}
                />
                {errors.password && !passwordFocused && (
                  <p className="text-xs text-destructive">{errors.password}</p>
                )}
                {/* Show requirements while focused or while password is non-empty and incomplete */}
                {(passwordFocused || (password && !allRulesPassed)) && (
                  <PasswordStrength password={password} />
                )}
              </div>

              {/* Confirm password */}
              <div className="space-y-1">
                <Label htmlFor="confirm">Confirm password</Label>
                <Input
                  id="confirm"
                  type="password"
                  placeholder="Repeat password"
                  value={confirm}
                  onChange={(e) => {
                    setConfirm(e.target.value);
                    if (errors.confirm) setErrors((p) => ({ ...p, confirm: undefined }));
                  }}
                  className={errors.confirm ? "border-destructive focus-visible:ring-destructive" : ""}
                />
                {errors.confirm && <p className="text-xs text-destructive">{errors.confirm}</p>}
              </div>

              {serverError && <p className="text-sm text-destructive">{serverError}</p>}

              <Button className="w-full" type="submit" disabled={register.isPending}>
                {register.isPending ? "Creating..." : "Create account"}
              </Button>
            </form>

            <p className="text-center text-sm text-muted-foreground mt-4">
              Already have an account?{" "}
              <Link to="/login" className="text-primary hover:underline">
                Sign in
              </Link>
            </p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
