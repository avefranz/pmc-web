import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { authApi } from "../api/auth.api";
import { useAuthStore } from "../stores/auth.store";

export const useMe = () =>
  useQuery({
    queryKey: ["me"],
    queryFn: authApi.me,
    enabled: !!localStorage.getItem("pmc_token"),
    staleTime: 5 * 60 * 1000,
  });

export const useLogin = () => {
  const { setToken } = useAuthStore();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ email, password }: { email: string; password: string }) =>
      authApi.login(email, password),
    onSuccess: async (data) => {
      setToken(data.token);
      localStorage.setItem("pmc_token", data.token);
      qc.invalidateQueries({ queryKey: ["me"] });
      qc.invalidateQueries({ queryKey: ["capabilities"] });
    },
  });
};

export const useRegister = () => {
  const { setToken } = useAuthStore();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ email, password, firstName }: { email: string; password: string; firstName?: string }) =>
      authApi.register(email, password, firstName),
    onSuccess: async (data) => {
      setToken(data.token);
      localStorage.setItem("pmc_token", data.token);
      qc.invalidateQueries({ queryKey: ["me"] });
      qc.invalidateQueries({ queryKey: ["capabilities"] });
    },
  });
};

export const useLineLogin = () => {
  const { setToken } = useAuthStore();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ code, redirectUri }: { code: string; redirectUri: string }) =>
      authApi.lineLogin(code, redirectUri),
    onSuccess: async (data) => {
      setToken(data.token);
      localStorage.setItem("pmc_token", data.token);
      qc.invalidateQueries({ queryKey: ["me"] });
      qc.invalidateQueries({ queryKey: ["capabilities"] });
    },
  });
};
