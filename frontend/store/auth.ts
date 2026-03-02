import { create } from 'zustand';
import { persist } from 'zustand/middleware';

export type User = { id: string; email: string; name: string | null };

type AuthState = {
  accessToken: string | null;
  user: User | null;
  hydrated: boolean;
  setAuth: (user: User, accessToken: string) => void;
  logout: () => void;
  setHydrated: () => void;
};

export const useAuthStore = create<AuthState>()(
  persist(
    (set) => ({
      accessToken: null,
      user: null,
      hydrated: false,
      setHydrated: () => set({ hydrated: true }),
      setAuth: (user, accessToken) => {
        if (typeof window !== 'undefined') localStorage.setItem('accessToken', accessToken);
        set({ user, accessToken });
      },
      logout: () => {
        if (typeof window !== 'undefined') localStorage.removeItem('accessToken');
        set({ user: null, accessToken: null });
      },
    }),
    {
      name: 'auth',
      onRehydrateStorage: () => (state) => {
        state?.setHydrated();
      },
    },
  ),
);
