import { useNavigate } from "react-router-dom";
import { ShieldOff } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useAuthStore } from "@/lib/stores/auth.store";

export default function NoAccessPage() {
  const { user, clearAuth } = useAuthStore();

  function handleLogout() {
    clearAuth();
    localStorage.removeItem("pmc_token");
    window.location.replace("/login");
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-900 to-slate-800 p-4">
      <div className="text-center text-white max-w-sm">
        <div className="w-16 h-16 rounded-full bg-white/10 flex items-center justify-center mx-auto mb-6">
          <ShieldOff className="h-8 w-8 text-white/70" />
        </div>
        <h1 className="text-2xl font-bold mb-2">No access</h1>
        <p className="text-white/60 text-sm mb-2">
          Your account <span className="text-white/80">{user?.email}</span> has no role assigned.
        </p>
        <p className="text-white/50 text-sm mb-8">
          Contact your property manager to get an invite link.
        </p>
        <Button variant="outline" className="text-white border-white/30 hover:bg-white/10" onClick={handleLogout}>
          Sign out
        </Button>
      </div>
    </div>
  );
}
