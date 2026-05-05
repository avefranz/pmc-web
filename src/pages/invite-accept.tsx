import { useState } from "react";
import { useParams, useNavigate, useSearchParams } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { useAcceptInvite } from "@/lib/hooks/use-invites";
import { useAuthStore } from "@/lib/stores/auth.store";
import { useQueryClient } from "@tanstack/react-query";

export default function InviteAcceptPage() {
  const { token: tokenParam } = useParams<{ token: string }>();
  const [searchParams] = useSearchParams();
  const inviteToken = tokenParam ?? searchParams.get("token") ?? undefined;
  const navigate = useNavigate();
  const accept = useAcceptInvite();
  const token = useAuthStore((s) => s.token);
  const qc = useQueryClient();
  const [done, setDone] = useState(false);
  const [error, setError] = useState("");

  const inviteRedirect = encodeURIComponent(`/invite?token=${inviteToken}`);

  async function handleAccept() {
    if (!inviteToken) return;
    try {
      await accept.mutateAsync(inviteToken);
      qc.invalidateQueries({ queryKey: ["me"] });
      qc.invalidateQueries({ queryKey: ["capabilities"] });
      setDone(true);
      setTimeout(() => navigate("/me/trips", { replace: true }), 1800);
    } catch {
      setError("This invite link is invalid or has expired.");
    }
  }

  if (!token) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-bg px-4">
        <Card className="w-full max-w-sm shadow-pop">
          <CardHeader>
            <CardTitle>You've been invited</CardTitle>
            <CardDescription>
              Create an account or sign in to accept this invitation.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            <Button
              className="w-full bg-brand hover:bg-[var(--color-primary-hover)] text-white"
              onClick={() => navigate(`/register?redirect=${inviteRedirect}`)}
            >
              Create account
            </Button>
            <div className="relative">
              <div className="absolute inset-0 flex items-center">
                <Separator />
              </div>
              <div className="relative flex justify-center text-xs">
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
    <div className="min-h-screen flex items-center justify-center bg-bg px-4">
      <Card className="w-full max-w-sm shadow-pop">
        <CardHeader>
          <CardTitle>Accept invitation</CardTitle>
          <CardDescription>
            You've been invited to access a property on Siamo.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          {done ? (
            <div className="text-center py-2">
              <p className="text-success font-medium mb-1">Invitation accepted!</p>
              <p className="text-sm text-fg-muted">Redirecting…</p>
            </div>
          ) : (
            <>
              {error && <p className="text-destructive text-sm">{error}</p>}
              <Button
                className="w-full bg-brand hover:bg-[var(--color-primary-hover)] text-white"
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
