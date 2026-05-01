import { LogOut, User } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { useAuthStore } from "@/lib/stores/auth.store";

export default function ProfilePage() {
  const { user, clearAuth } = useAuthStore();

  function handleLogout() {
    clearAuth();
    localStorage.removeItem("pmc_token");
    window.location.replace("/login");
  }

  return (
    <div className="p-4 pb-6">
      <h1 className="text-xl font-bold mb-4">Profile</h1>

      <Card className="mb-4">
        <CardContent className="p-4 flex items-center gap-4">
          <div className="w-14 h-14 rounded-full bg-primary flex items-center justify-center text-white text-xl font-bold">
            {(user?.firstName?.[0] ?? user?.email?.[0] ?? "U").toUpperCase()}
          </div>
          <div>
            <p className="font-semibold">
              {user?.firstName && user?.lastName
                ? `${user.firstName} ${user.lastName}`
                : user?.lineName ?? "User"}
            </p>
            <p className="text-sm text-muted-foreground">{user?.email}</p>
            <p className="text-xs text-muted-foreground mt-1">{user?.roles.join(", ")}</p>
          </div>
        </CardContent>
      </Card>

      <Button variant="destructive" className="w-full" onClick={handleLogout}>
        <LogOut className="h-4 w-4 mr-2" />
        Sign out
      </Button>
    </div>
  );
}
