import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";
import type { User } from "@/types";
import api from "@/lib/axios";
import tokenManager from "@/lib/tokenManager";
import { initEcho, destroyEcho } from "@/lib/echo";

interface AuthState {
  user: User | null;
  token: string | null;
  isLoading: boolean;
  _hydrated: boolean;

  login: (email: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
  setUser: (user: User) => void;
  setHydrated: (v: boolean) => void;
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set) => ({
      user: null,
      token: null,
      isLoading: false,
      _hydrated: false,

      setHydrated: (v) => set({ _hydrated: v }),

      login: async (email, password) => {
        set({ isLoading: true });
        try {
          const res = await api.post("/auth/login", { email, password });
          const { token, user } = res.data;

          // URUTAN PENTING:
          // 1. Set token ke memory manager DULU (sync, langsung tersedia)
          // 2. Set ke store (Zustand persist akan tulis ke localStorage async)
          // 3. Baru navigate — axios interceptor sudah bisa baca token
          tokenManager.set(token);
          set({ token, user, isLoading: false });
          initEcho(token);
        } catch (error) {
          set({ isLoading: false });
          throw error;
        }
      },

      logout: async () => {
        try {
          await api.post("/auth/logout");
        } finally {
          tokenManager.clear();
          destroyEcho();
          set({ user: null, token: null });
        }
      },

      setUser: (user) => set({ user }),
    }),
    {
      name: "smartpos_auth",
      storage: createJSONStorage(() => localStorage),
      partialize: (state) => ({
        token: state.token,
        user: state.user,
      }),
      onRehydrateStorage: () => (state) => {
        // Saat app reload: restore token dari localStorage ke memory manager
        // Ini yang memastikan refresh halaman tetap terautentikasi
        if (state?.token) {
          tokenManager.set(state.token);
        }
        state?.setHydrated(true);
      },
    },
  ),
);

// Stable selectors
export const selectIsAuthenticated = (s: AuthState) => !!s.token && !!s.user;
export const selectUser = (s: AuthState) => s.user;
export const selectToken = (s: AuthState) => s.token;
export const selectHydrated = (s: AuthState) => s._hydrated;
export const selectIsOwner = (s: AuthState) => s.user?.role === "owner";
export const selectIsManager = (s: AuthState) => s.user?.role === "manager";
export const selectCanManage = (s: AuthState) =>
  ["owner", "manager"].includes(s.user?.role ?? "");
