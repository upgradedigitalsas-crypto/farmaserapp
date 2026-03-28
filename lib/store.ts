import { create } from 'zustand'

interface User {
  uid: string
  email: string
  displayName: string
  role: 'admin' | 'visitador'
}

interface AuthStore {
  user: User | null
  setUser: (user: User | null) => void
  logout: () => void
}

export const useAuthStore = create<AuthStore>((set) => ({
  user: null,
  setUser: (user) => set({ user }),
  logout: () => set({ user: null }),
}))
