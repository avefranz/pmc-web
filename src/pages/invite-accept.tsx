import { useState } from "react";
import { useParams, useNavigate, useSearchParams } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { useAcceptInvite } from "@/lib/hooks/use-invites";
import { useAuthStore } from "@/lib/stores/auth.store";
import { authApi } from "@/lib/api/auth.api";
import { useQueryClient } from "@tanstack/react-query";

export default function InviteAcceptPage() {
  // Support both /invite/:token (path) and /invite?token=xxx (query) formats
  const { token: tokenParam } = useParams<{ token: string }>();
  const [searchParams] = useSearchParams();
  const token = tokenParam ?? searchParams.get("token") ?? undefined;
  const navigate = useNavigate();
  const accept = useAcceptInvite();
  const { user, setUser } = useAuthStore();
  const qc = useQueryClient();
  const [done, setDone] = useState(false);
  const [error, setError] = useState("");

  const inviteRedirect = encodeURIComponent(`/invite?token=${token}`);

  async function handleAccept() {
    if (!token) return;
    try {
      await accept.mutateAsync(token);
      // Refresh user profile so new role is picked up
      const freshUser = await authApi.me();
      setUser(freshUser);
      qc.setQueryData(["me"], freshUser);
      setDone(true);
      // Give the user a moment to read the success message, then route to correct portal
      setTimeout(() => navigate("/role-router", { replace: true }), 1800);
    } catch {
      setError("This invite link is invalid or has expired.");
    }
  }

  if (!user) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-900 to-slate-800 p-4">
        <Card className="w-full max-w-sm">
          <CardHeader>
            <CardTitle>You've been invited</CardTitle>
            <CardDescription>
              Create an account or sign in to accept this invitation.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            <Button
              className="w-full"
              onClick={() => navigate(`/register?redirect=${inviteRedirect}`)}
            >
              Create account
            </Button>
            <div className="relative">
              <div className="absolute inset-0 flex items-center">
                <Separator />
              </div>
              <div className="relative flex justify-center text-xs uppercase">
                <span className="bg-background px-2 text-muted-foreground">or</span>
              </div>
            </div>
            <Button
              variant="outline"
              className="w-full"
              onClick={() => navigate(`/login?redirect=${inviteRedirect}`)}
            >
              Sign in to existing account
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-900 to-slate-800 p-4">
      <Card className="w-full max-w-sm">
        <CardHeader>
          <CardTitle>Accept invitation</CardTitle>
          <CardDescription>
            You've been invited to access a property on PMC.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          {done ? (
            <div className="text-center py-2">
              <p className="text-green-600 font-medium mb-1">Invitation accepted!</p>
              <p className="text-sm text-muted-foreground">Redirecting to your portal…</p>
            </div>
          ) : (
            <>
              {error && <p className="text-destructive text-sm">{error}</p>}
              <Button
                className="w-full"
                onClick={handleAccept}
                disabled={accept.isPending}
              >
                {accept.isPending ? "Accepting…" : "Accept invitation"}
              </Button>
            </>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
