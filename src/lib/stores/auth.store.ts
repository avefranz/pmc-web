import { create } from "zustand";
import { persist } from "zustand/middleware";
import type { UserDto } from "../types";

interface AuthState {
  token: string | null;
  user: UserDto | null;
  setToken: (token: string) => void;
  setUser: (user: UserDto) => void;
  clearAuth: () => void;
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set) => ({
      token: null,
      user: null,
      setToken: (token) => set({ token }),
      setUser: (user) => set({ user }),
      clearAuth: () => set({ token: null, user: null }),
    }),
    {
      name: "pmc_auth",
      partialize: (state) => ({ token: state.token }),
    }
  )
);
