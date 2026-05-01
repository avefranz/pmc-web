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
  const { setToken, setUser } = useAuthStore();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ email, password }: { email: string; password: string }) =>
      authApi.login(email, password),
    onSuccess: async (data) => {
      setToken(data.token);
      localStorage.setItem("pmc_token", data.token);
      const user = await authApi.me();
      setUser(user);
      qc.setQueryData(["me"], user);
    },
  });
};

export const useRegister = () => {
  const { setToken, setUser } = useAuthStore();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ email, password }: { email: string; password: string }) =>
      authApi.register(email, password),
    onSuccess: async (data) => {
      setToken(data.token);
      localStorage.setItem("pmc_token", data.token);
      const user = await authApi.me();
      setUser(user);
      qc.setQueryData(["me"], user);
    },
  });
};

export const useLineLogin = () => {
  const { setToken, setUser } = useAuthStore();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ code, redirectUri }: { code: string; redirectUri: string }) =>
      authApi.lineLogin(code, redirectUri),
    onSuccess: async (data) => {
      setToken(data.token);
      localStorage.setItem("pmc_token", data.token);
      const user = await authApi.me();
      setUser(user);
      qc.setQueryData(["me"], user);
    },
  });
};
