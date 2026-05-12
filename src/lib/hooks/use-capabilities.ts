import { useQuery, useQueryClient } from "@tanstack/react-query";
import { meApi } from "../api/me.api";
import { useAuthStore } from "../stores/auth.store";

export const CAPS_KEY = ["capabilities"] as const;

export function useCapabilities() {
  const token = useAuthStore((s) => s.token);
  return useQuery({
    queryKey: CAPS_KEY,
    queryFn: meApi.getCapabilities,
    enabled: !!token,
    staleTime: 30_000,
    refetchInterval: 30_000,
  });
}

export function useInvalidateCapabilities() {
  const qc = useQueryClient();
  return () => qc.invalidateQueries({ queryKey: CAPS_KEY });
}
