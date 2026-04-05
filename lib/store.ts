import { create } from 'zustand'
import { persist } from 'zustand/middleware'

interface User {
  id: string;
  email: string;
  name: string;
  role: 'admin' | 'visitor';
}

interface AuthState {
  user: User | null;
  // NUEVO: Memoria para el visitador seleccionado por el Admin
  selectedRep: string; 
  setUser: (user: User | null) => void;
  // NUEVO: Función para cambiar el visitador desde cualquier página
  setSelectedRep: (rep: string) => void;
  logout: () => void;
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set) => ({
      user: null,
      // Valor inicial por defecto
      selectedRep: 'Todos',
      setUser: (user) => set({ user }),
      // Acción para actualizar la memoria global
      setSelectedRep: (rep) => set({ selectedRep: rep }),
      logout: () => {
        // Al salir, limpiamos todo
        set({ user: null, selectedRep: 'Todos' });
        localStorage.removeItem('auth-storage');
      },
    }),
    {
      name: 'auth-storage',
    }
  )
)

export const visitStatusLabel = (status?: string) => {
  if (!status) return 'Desconocido';
  const labels: Record<string, string> = { planeada: 'Planeada', completada: 'Completada', cancelada: 'Cancelada' };
  return labels[status.toLowerCase()] || status;
};

export const visitStatusClass = (status?: string) => {
  if (!status) return 'bg-gray-100 text-gray-800';
  const classes: Record<string, string> = { 
    planeada: 'bg-blue-100 text-blue-800', 
    completada: 'bg-green-100 text-green-800', 
    cancelada: 'bg-red-100 text-red-800' 
  };
  return classes[status.toLowerCase()] || 'bg-gray-100 text-gray-800';
};