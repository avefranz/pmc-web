import { useEffect, useRef } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { useLineLogin } from "@/lib/hooks/use-auth";

const LINE_REDIRECT_URI = import.meta.env.VITE_LINE_REDIRECT_URI ?? `${window.location.origin}/line-callback`;

export default function LineCallbackPage() {
  const [params] = useSearchParams();
  const navigate = useNavigate();
  const lineLogin = useLineLogin();
  const called = useRef(false);

  useEffect(() => {
    if (called.current) return;
    called.current = true;

    const code = params.get("code");
    if (!code) {
      navigate("/login?error=line_no_code");
      return;
    }

    lineLogin.mutate(
      { code, redirectUri: LINE_REDIRECT_URI },
      {
        onSuccess: () => navigate("/role-router"),
        onError: () => navigate("/login?error=line_failed"),
      }
    );
  }, []);

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-900 to-slate-800">
      <div className="text-center text-white">
        <div className="w-8 h-8 border-2 border-white border-t-transparent rounded-full animate-spin mx-auto mb-4" />
        <p className="text-sm opacity-70">Signing in with LINE...</p>
      </div>
    </div>
  );
}
