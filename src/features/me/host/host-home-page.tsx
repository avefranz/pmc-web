import { Navigate } from "react-router-dom";
import { useCapabilities } from "@/lib/hooks/use-capabilities";
import { BecomeHostPage } from "@/features/onboarding/become-host-page";
import { Skeleton } from "@/components/ui/skeleton";

export function HostHomePage() {
  const { data: caps, isLoading } = useCapabilities();

  if (isLoading) {
    return (
      <div className="space-y-4 py-8">
        <Skeleton className="h-12 w-2/3 mx-auto" />
        <Skeleton className="h-6 w-1/2 mx-auto" />
        <Skeleton className="h-10 w-48 mx-auto" />
      </div>
    );
  }

  if (!caps?.isLandlord && !caps?.isManager) {
    return <BecomeHostPage />;
  }

  return <Navigate to="/me/host/properties" replace />;
}
