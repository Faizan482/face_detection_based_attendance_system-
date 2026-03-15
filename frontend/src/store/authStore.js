import { create } from 'zustand';
import { persist } from 'zustand/middleware';

const useAuthStore = create(
  persist(
    (set) => ({
      token: null,
      user: null,
      loading: false,

      // Login action
      login: (token, user) => set({ token, user }),

      // Logout action
      logout: () => set({ token: null, user: null }),

      // Set loading state (optional)
      setLoading: (loading) => set({ loading }),
    }),
    {
      name: 'auth-storage', // unique name for localStorage
      getStorage: () => localStorage, // (default) use localStorage
    }
  )
);

export default useAuthStore;