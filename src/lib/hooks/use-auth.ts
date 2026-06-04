import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { authApi } from "../api/auth.api";
import { useAuthStore } from "../stores/auth.store";

export const useMe = () => {
  const token = useAuthStore((s) => s.token);
  return useQuery({
    queryKey: ["me"],
    queryFn: authApi.me,
    enabled: !!token,
    staleTime: 5 * 60 * 1000,
  });
};

export const useLogin = () => {
  const setToken = useAuthStore((s) => s.setToken);
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ email, password }: { email: string; password: string }) =>
      authApi.login(email, password),
    onSuccess: async (data) => {
      setToken(data.token);
      qc.invalidateQueries({ queryKey: ["me"] });
      qc.invalidateQueries({ queryKey: ["capabilities"] });
    },
  });
};

export const useRegister = () => {
  const setToken = useAuthStore((s) => s.setToken);
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ email, password, firstName, lastName }: { email: string; password: string; firstName?: string; lastName?: string }) =>
      authApi.register(email, password, firstName, lastName),
    onSuccess: async (data) => {
      setToken(data.token);
      qc.invalidateQueries({ queryKey: ["me"] });
      qc.invalidateQueries({ queryKey: ["capabilities"] });
    },
  });
};

export const useChangePassword = () => {
  return useMutation({
    mutationFn: ({ currentPassword, newPassword }: { currentPassword: string; newPassword: string }) =>
      authApi.changePassword(currentPassword, newPassword),
  });
};

export const useLineLogin = () => {
  const setToken = useAuthStore((s) => s.setToken);
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ code, redirectUri }: { code: string; redirectUri: string }) =>
      authApi.lineLogin(code, redirectUri),
    onSuccess: async (data) => {
      setToken(data.token);
      qc.invalidateQueries({ queryKey: ["me"] });
      qc.invalidateQueries({ queryKey: ["capabilities"] });
    },
  });
};
