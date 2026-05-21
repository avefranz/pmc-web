import { useQuery } from "@tanstack/react-query";
import { platformApi } from "@/lib/api/platform.api";

// Platform config — effectively static for the session. Treat like references.
export const useSupportContact = () =>
  useQuery({
    queryKey: ["platform", "support-contact"],
    queryFn: platformApi.getSupportContact,
    staleTime: Infinity,
    gcTime: Infinity,
  });
