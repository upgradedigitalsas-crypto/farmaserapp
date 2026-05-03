import { create } from 'zustand'
import { persist } from 'zustand/middleware'

// === FASE 3.0: DICCIONARIO DE EQUIPOS ===
// Define qué correos pertenecen a qué gerente. 
// Nota: Incluimos el correo del propio gerente en su lista para que puedan reportar sus propias visitas.
export const TEAM_MAPPING: Record<string, string[]> = {
  'lcontreras.farmaser@gmail.com': [ // Equipo Leidys
    'gcastillo.farmaser@gmail.com',
    'fbenitez.farmaser@gmail.com',
    'yponce.farmaser@gmail.com',
    'kescobar.farmaser@gmail.com',
    'vnorena.farmaser@gmail.com',
    'lgarcia.farmaser@gmail.com',
    'jcardona.farmaser@gmail.com',
    'lmartinez.farmaser@gmail.com',
    'jlopez.farmaser@gmail.com',
    'ttorres.farmaser@gmail.com',
    'lcontreras.farmaser@gmail.com' 
  ],
  'langulo.farmaser@gmail.com': [ // Equipo Luis Carlos
    'langulo.farmaser@gmail.com',
    'drodriguez.farmaser@gmail.com',
    'yozuna.farmaser@gmail.com',
    'sorejarena.farmaser@gmail.com',
    'aardila.farmaser@gmail.com'
  ],
  'ypelaez.farmaser@gmail.com': [ // Equipo Yuliana
    'ypelaez.farmaser@gmail.com',
    'agomez.farmaser@gmail.com',
    'marboleda.farmaser@gmail.com'
  ]
};

// Ampliamos los roles
export type UserRole = 'admin' | 'manager' | 'visitador';

interface User {
  id: string;
  email: string;
  name: string;
  role: UserRole; // Ahora soporta la jerarquía de 3 niveles
}

interface AuthState {
  user: User | null;
  selectedRep: string; 
  setUser: (user: User | null) => void;
  setSelectedRep: (rep: string) => void;
  logout: () => void;
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set) => ({
      user: null,
      selectedRep: 'Todos', // Valor inicial por defecto
      
      setUser: (user) => {
        if (user) {
          const email = user.email.toLowerCase().trim();
          let calculatedRole: UserRole = 'visitador'; // Por defecto es visitador
          
          // Lógica de Inteligencia de Roles
          if (email === 'entrenamientofarmaser@gmail.com') {
            calculatedRole = 'admin';
          } else if (Object.keys(TEAM_MAPPING).includes(email)) {
            calculatedRole = 'manager';
          }

          // Guardamos al usuario con su rol real calculado
          set({ user: { ...user, role: calculatedRole } });
        } else {
          set({ user: null });
        }
      },

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